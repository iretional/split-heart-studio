# Split Heart Studio

An independent, browser-based keymap viewer for the 60-key **Split Heart** ZMK keyboard. It uses the official ZMK Studio RPC TypeScript client, not a custom firmware protocol.

## Requirements

- Split Heart left / central keyboard flashed with firmware that enables `CONFIG_ZMK_STUDIO=y` and `studio-rpc-usb-uart`.
- Chrome or Edge with Web Serial support, running on `localhost` or HTTPS.
- Node.js 20+ for local development.

## Start

```sh
npm install
npm run dev
```

Open the local URL printed by Vite, plug in the **left half** over USB, and click **Connect USB**. Choose the Studio serial port. If the keyboard is locked, hold the right thumb Enter (system layer) and press **P** to run Studio Unlock, then click **Refresh from keyboard**.

The app reads the **live device-reported physical layout, layers, and behaviors**. It does not hardcode the 60-key positions. View key positions, select layers, inspect a key's behavior and parameters, and disconnect.

## Scope / safety

**Milestone 1: read-only.** This version does not issue any keymap write, save, discard, reset, or firmware update requests. It does not change firmware. Live keymap editing will be added only after hardware read/geometry behavior is verified.

Do not connect the official ZMK Studio and this app to the same serial port simultaneously. Browser connection requires a user gesture.

## Related source

- [Split Heart ZMK firmware](https://github.com/iretional/zmk-config)
- [Official ZMK Studio](https://github.com/zmkfirmware/zmk-studio)
- [Official RPC TS client](https://github.com/zmkfirmware/zmk-studio-ts-client)

**This project is not the official ZMK Studio application.**
