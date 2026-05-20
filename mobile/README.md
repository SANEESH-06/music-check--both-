# EchoWave Mobile

React Native + Expo mobile app for EchoWave.

## Setup

```bash
cd mobile
npm install
```

## Run

```bash
# Start Expo dev server
npm start

# Android emulator
npm run android

# iOS simulator (Mac only)
npm run ios
```

## Connect to backend

- **Android emulator**: `10.0.2.2:5000` is already set in `lib/api.js`
- **Physical device**: Edit `mobile/lib/api.js` and replace `10.0.2.2` with your machine's local IP address (e.g. `192.168.1.x`)

Make sure the backend is running: `npm run dev:backend` from the root.

## Features

- Login / Register
- Browse all tracks, liked, wishlist, playlists, queue
- Charts row + Recommended + Trending grids
- Full-screen Now Playing modal with progress bar
- Play / Pause / Skip / Shuffle / Repeat
- Like, Wishlist, Add to Playlist, Add to Queue
- Settings (offline mode, compact rows)
- Admin: Scrape tracks, Upload new track
