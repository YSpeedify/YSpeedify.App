# YSpeedify

[![Expo](https://img.shields.io/badge/Expo-SDK%2054-000020?logo=expo&logoColor=white)](https://expo.dev/)
[![React%20Native](https://img.shields.io/badge/React%20Native-0.81-20232a?logo=react&logoColor=61DAFB)](https://reactnative.dev/)
[![Electron](https://img.shields.io/badge/Electron-Desktop-47848F?logo=electron&logoColor=white)](https://www.electronjs.org/)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Android%20%7C%20iOS%20%7C%20Windows-555555)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

<p align="left">
  <img src="website/public/yspeedify-logo.png" alt="YSpeedify" width="72" height="72" />
</p>

YSpeedify is a modern, dark, tab-first browser experience.

This repo currently contains:

- A React Native + Expo mobile app
- A Windows desktop app built with Electron + TypeScript (in progress)
- A Next.js marketing website

## Repository structure

```text
.
├─ App.tsx                  # Expo mobile app entry
├─ app.json                 # Expo configuration
├─ package.json             # Mobile dependencies and scripts
├─ desktop/                 # Electron desktop app
└─ website/                 # Next.js website
```

## Mobile app (Expo)

Run:

```bash
npm start
```

## Desktop app (Electron)

The desktop app lives in `desktop/` and uses `BrowserView` for proper web rendering.

Run (dev):

```bash
npm install
npm run dev
```

Run those commands from the `desktop/` folder.

## Website (Next.js)

The website lives in `website/`.

Run (dev):

```bash
npm install
npm run dev
```

Run those commands from the `website/` folder.

## Configuration

- **Expo app name / slug**: `app.json`
- **Android package**: `app.json` → `expo.android.package`

## License

MIT
