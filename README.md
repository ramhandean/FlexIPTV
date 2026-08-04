# FlexIPTV (Modern Stream Player & Custom Proxy)

A modern, high-performance web-based IPTV player built with **React 19**, **TypeScript**, **Vite 8**, and **Tailwind CSS v4**. It features built-in playback support for both **HLS (`.m3u8`)** via `hls.js` and **MPEG-DASH (`.mpd`)** via `dash.js` (including ClearKey DRM support), as well as a specialized Vite dev proxy plugin to solve CORS and custom HTTP stream header requirements (such as `Referer`, `Origin`, and `User-Agent`).

---

## 🌟 Key Features

- 📺 **Dual Protocol Streaming Support**:
  - **HLS (`.m3u8`)**: Smooth streaming with live stream segment recovery using `hls.js`.
  - **MPEG-DASH (`.mpd`)**: Full adaptive bitrate streaming with DRM support (`ClearKey` key-value parsing) via `dashjs`.
- ⚡ **Built-in CORS & Header Stream Proxy**:
  - Vite dev server middleware (`streamProxyPlugin`) intercepts `/api/proxy` requests.
  - Supports configurable HTTP headers (`Referer`, `Origin`, `User-Agent`) for domain-restricted media endpoints and CORS-sensitive HLS/DASH streams.
  - Handles HTTP 3xx redirects seamlessly by re-proxing redirect locations.
  - Dynamically rewrites M3U8 manifest segment URIs and injects `<BaseURL>` tags into DASH manifests for relative segment loading.
- 📋 **Flexible Playlist Management**:
  - Multi-playlist management (Add via M3U URL or paste raw M3U text).
  - Combined playlist mode (`ALL_COMBINED`) to aggregate channels from all playlists.
  - Full support for `#EXTINF`, `#EXTGRP`, `#EXTVLCOPT`, `#KODIPROP`, `#EXTHTTP`, and pipe parameters (`url|user-agent=...|referer=...`).
- 🎨 **Modern & Interactive UI**:
  - Dark mode aesthetic built with Tailwind CSS v4 and Lucide React icons.
  - Sidebar layout with channel search, group filtering, and favorites.
  - Theater/Full-channel view, aspect ratio toggles (Contain, Cover, 16:9, 4:3), picture-in-picture (PiP), and volume control with persistent state (`localStorage`).
- 🛡️ **Network & DNS Resilience**:
  - Forces `ipv4first` DNS resolution in Node.js dev server to prevent IPv6 timeout issues on regional CDN endpoints.

---

## 🛠️ Tech Stack

- **Frontend**: React 19, TypeScript, Vite 8, Tailwind CSS v4, Lucide React
- **Video Engines**: `hls.js` (^1.6.16), `dashjs` (^5.2.0)
- **Linter & Tooling**: Oxlint (`oxlint`), TypeScript Compiler (`tsc`)
- **Proxy Server**: Custom Vite Plugin Middleware (`streamProxyPlugin` in `vite.config.ts`)

---

## 🚀 Quick Start

### Prerequisites
- **Node.js**: v18+ (Recommended v20+ or v25+)
- **npm** or **bun** / **pnpm**

### Installation

```bash
# Clone repository
git clone https://github.com/ramhandean/FlexIPTV.git
cd FlexIPTV

# Install dependencies
npm install
```

### Running Locally

```bash
# Start Vite development server
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

```bash
npm run build
```

---

## 📂 Project Structure

```
iptv-player/
├── public/                 # Static assets
├── src/
│   ├── components/         # React Components
│   │   ├── Header.tsx         # Top navigation & modal toggles
│   │   ├── Player.tsx         # Video player component (hls.js & dash.js)
│   │   ├── Sidebar.tsx        # Playlist channels drawer & search
│   │   ├── PlaylistModal.tsx  # Add / manage playlists modal
│   │   ├── SettingsModal.tsx  # Proxy & player settings modal
│   │   └── ErrorBoundary.tsx  # React error boundary
│   ├── types/
│   │   └── iptv.ts            # TypeScript interface definitions
│   ├── utils/
│   │   └── m3uParser.ts       # M3U/M3U8 parser & sample streams
│   ├── App.tsx             # Main layout & state manager
│   ├── main.tsx            # App entry point
│   └── index.css           # Global Tailwind CSS imports
├── vite.config.ts          # Vite configuration & custom CORS Stream Proxy plugin
├── package.json            # Project dependencies & scripts
└── README.md
```

---

## ⚙️ How the Stream Proxy Works

Due to browser CORS policies and domain-restricted media streams, live HLS/DASH streams often fail to play directly in a web browser. 

The application includes an internal proxy plugin in `vite.config.ts`:

1. **Proxy Endpoint**: `/api/proxy?url=<ENCODED_STREAM_URL>&referer=<OPTIONAL_REFERER>&userAgent=<OPTIONAL_UA>`
2. **Domain Matching**: Checks target domain against a registry of known broadcast headers and applies appropriate `Referer`, `Origin`, and `User-Agent` headers.
3. **Manifest Rewriting**:
   - **M3U8**: Rewrites playlist URIs inside `.m3u8` files to pass segment requests back through `/api/proxy`.
   - **MPD**: Prepends `<BaseURL>` into DASH XML manifests so segment requests use the proxy origin.

---

## 📜 License & Disclaimer

This software is for personal educational and demonstration purposes. Users are responsible for ensuring they have legal rights to stream any M3U playlists loaded into the player.
