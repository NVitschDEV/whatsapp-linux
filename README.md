# WhatsApp Web for Linux — standalone Chromium app

This is a Linux desktop application with its **own bundled Chromium engine**. It opens WhatsApp Web inside its frameless app window; it does **not** launch the user's default browser and has no browser tabs, address bar, or menu bar.

## Why this is not Tauri

The Linux Tauri build uses WebKitGTK. The WebKitGTK 2.52.6 runtime tested for the earlier Tauri app reported a macOS user-agent and did not expose `RTCPeerConnection`, even with WebRTC enabled. WhatsApp calls therefore could not run in that embedded webview. This release uses Electron's packaged Chromium instead so the WebRTC APIs and Linux platform identity come from Chromium. This is a stack change from Rust/Tauri to Electron/Chromium.

## Calls and permissions

Microphone, camera, and OS notifications are enabled only for requests originating from the exact official origin `https://web.whatsapp.com`; those permissions are denied to other origins. The app does not request Node.js access from WhatsApp's page. Notification delivery also depends on the Linux desktop's notification service. Calls still depend on WhatsApp enabling the feature for your account and on working Linux camera, microphone, and audio devices.

## Window controls

There is no title/menu bar. Use **Alt+F4** to close, **Alt+F7** to move the window (on window managers that support it), **F11** to toggle full-screen, and **Ctrl+Shift+Q** to quit. The window can be resized from its edges.

## Build the AppImage

On Linux with Node.js 22+ and npm:

```sh
npm install
npm run build
```

The output is `dist/WhatsApp-2.1.0-x86_64.AppImage` on x86_64 Linux.

## Run

```sh
chmod +x WhatsApp-2.1.0-x86_64.AppImage
./WhatsApp-2.1.0-x86_64.AppImage
```

Scan the QR code with WhatsApp on your phone on first launch. Sign-in data is held in the app's persistent Chromium profile, separate from any browser or earlier Tauri profile. This unofficial wrapper is not affiliated with WhatsApp/Meta.

## References

- [WhatsApp Help Center: voice and video calls on WhatsApp Web](https://faq.whatsapp.com/2092488194268012)
- [Electron session permissions](https://www.electronjs.org/docs/latest/api/session)
- [electron-builder AppImage documentation](https://www.electron.build/appimage)
