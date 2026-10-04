const { app, BrowserWindow, Menu, session, shell } = require('electron');
const { URL } = require('node:url');

const WHATSAPP_URL = 'https://web.whatsapp.com';
const WHATSAPP_ORIGIN = 'https://web.whatsapp.com';
const SESSION_PARTITION = 'persist:whatsapp-linux';
const LINUX_CHROMIUM_USER_AGENT = `Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${process.versions.chrome} Safari/537.36`;

function hasWhatsAppOrigin(value) {
  try {
    return new URL(value).origin === WHATSAPP_ORIGIN;
  } catch {
    return false;
  }
}

function configureMediaPermissions(ses) {
  // Electron requires both handlers for complete permission checks.
  // Grant media and notifications only to the official WhatsApp Web origin.
  ses.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    const origin = details?.requestingUrl || requestingOrigin || webContents?.getURL();
    return hasWhatsAppOrigin(origin) && (permission === 'media' || permission === 'notifications');
  });

  ses.setPermissionRequestHandler((webContents, permission, callback, details) => {
    const origin = details?.requestingUrl || webContents?.getURL();
    if (!hasWhatsAppOrigin(origin)) {
      callback(false);
      return;
    }

    if (permission === 'notifications') {
      callback(true);
      return;
    }

    if (permission !== 'media') {
      callback(false);
      return;
    }

    const mediaTypes = details?.mediaTypes || [];
    const onlyCameraOrMicrophone = mediaTypes.every(
      (type) => type === 'audio' || type === 'video'
    );
    callback(hasWhatsAppOrigin(origin) && onlyCameraOrMicrophone);
  });
}

function createWindow() {
  const ses = session.fromPartition(SESSION_PARTITION);
  configureMediaPermissions(ses);

  const window = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 560,
    show: false,
    frame: false,
    resizable: true,
    backgroundColor: '#0b141a',
    webPreferences: {
      partition: SESSION_PARTITION,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
  });

  window.setMenu(null);
  window.setMenuBarVisibility(false);
  window.webContents.setUserAgent(LINUX_CHROMIUM_USER_AGENT);
  window.once('ready-to-show', () => window.show());

  window.webContents.setWindowOpenHandler(({ url }) => {
    if (hasWhatsAppOrigin(url)) return { action: 'allow' };
    if (url.startsWith('https://') || url.startsWith('http://')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  window.webContents.on('will-navigate', (event, url) => {
    if (!hasWhatsAppOrigin(url)) {
      event.preventDefault();
      if (url.startsWith('https://') || url.startsWith('http://')) {
        shell.openExternal(url);
      }
    }
  });

  window.webContents.on('before-input-event', (event, input) => {
    if (
      input.type === 'keyDown' &&
      input.control && input.shift && input.key.toLowerCase() === 'q'
    ) {
      event.preventDefault();
      window.close();
    }
    if (input.type === 'keyDown' && input.key === 'F11') {
      event.preventDefault();
      window.setFullScreen(!window.isFullScreen());
    }
  });

  if (process.argv.includes('--smoke-test')) {
    window.webContents.once('did-finish-load', async () => {
      try {
        const capabilities = await window.webContents.executeJavaScript(`(async () => {
          const result = {
            pageOrigin: location.origin,
            pageTitle: document.title,
            userAgent: navigator.userAgent,
            platform: navigator.platform,
            peerConnection: typeof RTCPeerConnection,
            getUserMedia: typeof navigator.mediaDevices?.getUserMedia,
            notifications: await Notification.requestPermission()
          };
          try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach((track) => track.stop());
            result.audioCapture = 'granted';
          } catch (error) {
            result.audioCapture = error.name;
          }
          return JSON.stringify(result);
        })()`);
        console.log(`WHATSAPP_SMOKE_TEST ${capabilities}`);
      } catch (error) {
        console.error('WHATSAPP_SMOKE_TEST_ERROR', error.message);
      }
      setTimeout(() => app.quit(), 1000);
    });
  }

  window.loadURL(WHATSAPP_URL);
  return window;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  Menu.setApplicationMenu(null);

  app.whenReady().then(() => {
    createWindow();
    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on('window-all-closed', () => app.quit());
}
