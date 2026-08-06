# AGENTS.md

## Cursor Cloud specific instructions

This repository contains **two independent products** that share the git root:

1. **Mobile wedding invitation** (repo root: `index.html`, `app.js`, `config.js`, `style.css`, `images/`, `audio/`).
   - Pure static site, no build step and no Node dependencies.
   - Serve it with any static server, e.g. `python3 -m http.server 8080` from the repo root, then open `http://localhost:8080/index.html`.
   - Guestbook + RSVP use the Firebase project already configured in `config.js`; with network access they persist/share across browsers. If Firebase is unreachable, the code falls back to `localStorage` (demo mode) automatically — see `SETUP.md`.

2. **CatchRail** (`catchrail/`): Express + WebSocket Node app (mock KTX/SRT cancellation watcher + booking simulation).
   - Run from `catchrail/`: `npm start` (or `npm run dev` for `node --watch` hot reload). Serves both the API/WebSocket and the static UI on `http://localhost:3847` (override with `PORT`).
   - All train/seat data is in-memory mock data (`server/trains.js`, `server/watchStore.js`); there is no database. State resets on restart.
   - Core flow to smoke-test: register a watch (`POST /api/watches`), then the background timer periodically releases mock cancellations and (when `autoBook` is on) auto-books a seat; updates are pushed over the `/ws` WebSocket.

### Lint / test / build
- There is **no lint config, no test suite, and no build step** in either product. "Running the app" is the only verification available.
