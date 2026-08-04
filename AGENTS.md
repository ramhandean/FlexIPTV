# Developer & AI Agent Guidelines for FlexIPTV

This document provides developer guidelines, architectural conventions, and constraints for AI coding agents and human developers working on the `iptv-player` codebase.

---

## ⛔ Strict Project Rules

1. **Rule `.env` Privacy**:
   - **NEVER** read, output, log, or inspect `.env` or `.env.*` files under any circumstance.
2. **Build Verification**:
   - Always run `npm run build` (`tsc -b && vite build`) to verify TypeScript type safety and build output before finishing any task.
3. **No Superficial Symptom Patches**:
   - Do not swallow errors silently or bypass TypeScript errors with `any` / `@ts-ignore` unless strictly necessary. Fix underlying interface contracts.

---

## 🏗️ Architecture & Component Overview

- **State Persistence**:
  - `localStorage` handles persistence for user playlists (`flex_iptv_playlists_v1`) and player settings (`flex_iptv_settings_v1`).
- **M3U Parser (`src/utils/m3uParser.ts`)**:
  - Parses M3U playlists and extracts channel metadata:
    - `#EXTINF`: Channel name, logo (`tvg-logo`), group (`group-title`), `tvg-id`, `tvg-name`.
    - Directives: `#EXTGRP`, `#EXTVLCOPT`, `#KODIPROP`, `#EXTHTTP`, and pipe parameters (`url|user-agent=...|referer=...|clearkey=...`).
    - DRM DRM Key parsing: Extracts ClearKey `keyId:key` string formats for DASH playback.
- **Player (`src/components/Player.tsx`)**:
  - Automatically switches between **hls.js** for `.m3u8` streams and **dash.js** for `.mpd` manifests.
  - Passes ClearKey protection data (`dashPlayer.setProtectionData`) when DRM keys are detected.
  - Automatically routes streams through `/api/proxy` based on proxy settings.
- **Vite Custom Stream Proxy (`vite.config.ts`)**:
  - Plugin `streamProxyPlugin` serves `/api/proxy`.
  - Injects domain-specific headers (`Referer`, `Origin`, `User-Agent`) required by various TV stream CDNs.
  - Rewrites `.m3u8` chunk lines and injects `<BaseURL>` into `.mpd` files to ensure segment requests remain proxied.

---

## 🛠️ Development Workflows

### Commands

```bash
# Start development server
npm run dev

# Run TypeScript check & Vite build
npm run build

# Run Oxlint linter
npm run lint
```

### Adding New Domain Proxy Rules

When adding support for a new broadcast CDN/domain in `vite.config.ts`:

1. Locate `streamProxyPlugin` in `vite.config.ts`.
2. Add a domain check inside the `try { ... }` block:
   ```ts
   } else if (host.includes('example.com') || fullUrl.includes('example')) {
     defaultReferer = 'https://www.example.com/'
     domainOrigin = 'https://www.example.com'
     defaultUserAgent = 'Custom-User-Agent-String'
   }
   ```
3. Test stream playback to ensure HTTP 200/206 status responses without CORS errors.

---

## 🎨 Code Style & Conventions

- **React 19 & Functional Components**: Use clean functional components with explicit React hook types (`useState`, `useEffect`, `useMemo`, `useRef`).
- **TypeScript Strict Import Rules**: Use type-only imports for TypeScript interfaces/types (`import type { Channel } from ...`).
- **Styling**: Use Tailwind CSS v4 utility classes and Lucide React icons. Keep dark mode styling harmonious (`slate-950`, `slate-900`, `indigo-500`).
