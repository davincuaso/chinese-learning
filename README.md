# 汉字学习 — HSK Vocabulary App

A self-contained Chinese language learning app for HSK 1–6 vocabulary with SM-2 spaced repetition, animated stroke order, neural TTS audio, and a GitHub-style progress heatmap. Everything runs locally — no account, no cloud, no fees.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Clone or download the project](#2-clone-or-download-the-project)
3. [Install Node.js dependencies](#3-install-nodejs-dependencies)
4. [Set up Python and edge-tts (recommended audio)](#4-set-up-python-and-edge-tts-recommended-audio)
5. [Configure optional services](#5-configure-optional-services)
6. [Seed the vocabulary database](#6-seed-the-vocabulary-database)
7. [Run the app](#7-run-the-app)
8. [First launch — TTS setup wizard](#8-first-launch--tts-setup-wizard)
9. [Keyboard shortcuts](#9-keyboard-shortcuts)
10. [Updating vocabulary data (CC-CEDICT)](#10-updating-vocabulary-data-cc-cedict)
11. [Troubleshooting](#11-troubleshooting)
12. [Architecture reference](#12-architecture-reference)
13. [API reference](#13-api-reference)
14. [Tech stack](#14-tech-stack)

---

## 1. Prerequisites

Before starting, make sure the following are installed on your machine.

### Node.js (required)

The backend uses `node:sqlite`, which requires **Node.js 22 or later**.

- **Check your version:** `node --version`
- **Install or upgrade:** https://nodejs.org/en/download (choose the LTS or Current release ≥ 22)

### Python 3 (required for edge-tts audio)

Edge-tts is a Python library. Python 3.8 or later is required.

- **Check your version:** `python3 --version`
- **Install:** https://www.python.org/downloads/

### npm (comes with Node.js)

- **Check:** `npm --version` — you need npm 7 or later.

### Git (optional, for cloning)

- **Install:** https://git-scm.com/downloads

---

## 2. Clone or download the project

**Option A — Git clone:**

```bash
git clone <repository-url> chinese-learning
cd chinese-learning
```

**Option B — Download ZIP:**

1. Download and unzip the project folder
2. Open a terminal and `cd` into the unzipped folder:
   ```bash
   cd chinese-learning
   ```

All subsequent commands assume your working directory is the project root (`chinese-learning/`).

---

## 3. Install Node.js dependencies

The project has three `package.json` files: one at the root (for the `npm run dev` convenience script), one in `server/`, and one in `client/`. Install all three.

```bash
# From the project root
npm install

# Server dependencies (Express, dotenv, etc.)
cd server && npm install && cd ..

# Client dependencies (React, Vite, Tailwind, Framer Motion, etc.)
cd client && npm install && cd ..
```

Expected output: no errors. Warnings about funding or audit advisories are safe to ignore.

> **Note for macOS/Linux:** if you see `EACCES` permission errors, do **not** use `sudo npm install`. Instead, fix your npm permissions: https://docs.npmjs.com/resolving-eacces-permissions-errors-when-installing-packages-globally

---

## 4. Set up Python and edge-tts (recommended audio)

Edge-tts gives you **free Azure Neural quality** Chinese pronunciation (XiaoxiaoNeural, YunxiNeural, and others) with no API key, no account, and no usage limits. It is strongly recommended over the browser fallback.

### Install edge-tts

```bash
# macOS / Linux
pip3 install edge-tts

# Windows (Command Prompt or PowerShell)
pip install edge-tts
```

### Verify the installation

```bash
python3 -m edge_tts --version
# Expected output: edge-tts 7.x.x
```

If you see `command not found` or a `ModuleNotFoundError`, see [Troubleshooting](#11-troubleshooting) below.

### What it does

When the server starts, it automatically:

1. Detects that edge-tts is installed
2. Begins pre-generating MP3 audio for all 147 HSK 1 words in the background
3. Caches every generated file in `server/audio_cache/` using a SHA-256 hash as the filename — the same word is never synthesized twice

Audio files are served directly to the browser as standard `audio/mpeg` streams. The frontend never calls any external API.

---

## 5. Configure optional services

### Azure Cognitive Services (fallback, optional)

Only needed if edge-tts is not installed. The Azure F0 free tier gives 500,000 characters per month with no credit card required — just a Microsoft account.

1. Create a free Azure account: https://azure.microsoft.com/free/cognitive-services/
2. Create a Speech resource (choose the **F0 free tier**)
3. Copy your key and region
4. Create the file `server/.env` (copy from the example):

```bash
cp server/.env.example server/.env
```

5. Open `server/.env` and fill in your values:

```env
AZURE_SPEECH_KEY=your_key_here
AZURE_SPEECH_REGION=eastus
```

The server reads this file on startup. If edge-tts is also installed, Azure is never used (edge-tts takes priority).

### Pixabay images (optional)

Cards can display a contextual photo fetched from Pixabay. The free tier allows 20,000 requests per month with no attribution required.

1. Sign up at https://pixabay.com/accounts/register/
2. Go to https://pixabay.com/api/docs/ and copy your API key
3. In the running app, go to **Settings → Contextual images** and paste your key

No restart is required — the key is stored in the browser's localStorage.

---

## 6. Seed the vocabulary database

The seed script populates the SQLite database with all 966 HSK 1–6 cards. It reads from the included `server/data/cedict_parsed.json` (downloaded CC-CEDICT dictionary) and the built-in HSK word lists.

```bash
cd server
npm run seed
```

Expected output:

```
Loading CC-CEDICT data...
Loaded 121113 CEDICT entries
HSK 1: inserted 147/147 cards
HSK 2: inserted 161/162 cards
HSK 3: inserted 239/239 cards
HSK 4: inserted 170/170 cards
HSK 5: inserted 123/123 cards
HSK 6: inserted 126/126 cards

Seed complete!
New cards inserted this run: 966
Total cards in database: 966
```

> **Already done?** If you downloaded this project and `server/data/chinese_learning.db` already exists, you can skip this step. Re-running seed is safe — it uses `INSERT OR IGNORE` so no duplicate cards are created.

### Refresh dictionary data (optional)

The included `cedict_parsed.json` was downloaded from [mdbg.net](https://www.mdbg.net/chinese/dictionary?page=cc-cedict). To fetch the latest version (~4 MB):

```bash
cd server
npm run download-cedict
```

Then re-run `npm run seed` to update card definitions with any new entries.

---

## 7. Run the app

From the project root, run both the backend API and the frontend dev server in one command:

```bash
# From the project root
npm run dev
```

This starts:

| Process | URL | Description |
|---------|-----|-------------|
| API server | http://localhost:3001 | Express backend, SQLite database, TTS engine |
| Frontend | http://localhost:5173 | React/Vite dev server with hot reload |

Open **http://localhost:5173** in your browser.

> **To run them separately** (e.g. in two terminal windows):
> ```bash
> # Terminal 1 — backend
> cd server && npm run dev
>
> # Terminal 2 — frontend
> cd client && npm run dev
> ```

### Production build (optional)

To build and serve the frontend as static files:

```bash
cd client && npm run build
# Output: client/dist/
```

You can then serve `client/dist/` with any static file server (nginx, `serve`, etc.) alongside the running backend.

---

## 8. First launch — TTS setup wizard

The first time you open the app, it checks whether edge-tts is reachable via the backend API.

- **If edge-tts is detected:** no prompt appears. The app uses it silently and pre-warms HSK 1 audio in the background. You'll see log output in the server terminal.
- **If edge-tts is not detected:** a setup modal appears with three options:

### Option A — edge-tts (recommended)

Shows the install command for your operating system with a **Test Voice** button. Once you install edge-tts, restart the server (`Ctrl+C` then `npm run dev` again) and the modal will not appear on next launch.

### Option B — Azure free tier

Enter your `AZURE_SPEECH_KEY` and `AZURE_SPEECH_REGION`. Click **Verify & save** to confirm the credentials work. The app saves them to the browser and sends them to the server for that session.

> For a permanent Azure setup, add the keys to `server/.env` and restart the server.

### Option C — Browser voices

Uses the browser's built-in Web Speech API. Quality depends on which Chinese voices are installed in your operating system:

| OS | How to install Chinese voices |
|----|-------------------------------|
| Windows | Settings → Time & Language → Language & region → Add a language → Chinese (Simplified, China) → check "Text-to-speech" |
| macOS | System Settings → Accessibility → Spoken Content → System Voice → Manage Voices → add 普通话 (Meijia) |
| Android | Settings → General Management → Language → Text-to-speech output → install Chinese language data |
| Linux | Install `espeak-ng` with Mandarin: `sudo apt install espeak-ng` |

A dismissible yellow banner appears during study sessions as a reminder to upgrade to edge-tts. You can re-open the wizard at any time from the banner.

---

## 9. Keyboard shortcuts

| Key | Action |
|-----|--------|
| `Space` | Flip card (reveal answer) |
| `1` | Rate: Again (reset, review tomorrow) |
| `2` | Rate: Hard (1-day interval) |
| `3` | Rate: Good (~6-day interval) |
| `4` | Rate: Easy (~10-day interval, boosted ease) |

---

## 10. Updating vocabulary data (CC-CEDICT)

CC-CEDICT is an open, community-maintained Chinese–English dictionary licensed CC BY-SA 3.0. To pull the latest entries:

```bash
# From the server/ directory
npm run download-cedict
```

This downloads and parses the latest `cedict_1_0_ts_utf-8_mdbg.txt.gz` from mdbg.net into `server/data/cedict_parsed.json`, then re-seed:

```bash
npm run seed
```

Existing progress is not affected — the seed script only inserts new cards (`INSERT OR IGNORE`).

---

## 11. Troubleshooting

### `edge-tts` not found after installing

The `edge_tts` module installs into the Python version that `pip3` resolves to. The server calls `python3 -c 'import edge_tts'` to detect it. If these resolve to different Python installations:

```bash
# Check which python3 the server will call
which python3

# Ensure edge-tts is installed under that exact interpreter
/path/to/python3 -m pip install edge-tts

# Verify
/path/to/python3 -m edge_tts --version
```

On macOS with multiple Python versions (Homebrew + system), explicitly use the full path or set up a virtual environment.

### `node:sqlite` not available

This requires Node.js 22 or later. Check: `node --version`. If you are on an older version, upgrade from https://nodejs.org.

### Port already in use

If port 3001 or 5173 is taken:

```bash
# Change the API port
PORT=3002 npm run dev   # then update client/vite.config.js proxy target to match
```

Or kill the process using the port:

```bash
# macOS / Linux
lsof -ti :3001 | xargs kill

# Windows
netstat -ano | findstr :3001
taskkill /PID <PID> /F
```

### Database is empty after seeding

`npm run seed` now reports both "new cards inserted this run" and "total cards in database".

- If **new cards is 0** but **total cards is 966**, this is healthy: your DB is already seeded.
- If **total cards is 0**, run a full reset:

```bash
cd server
npm run seed:reset
```

The SQLite file is created at `server/data/chinese_learning.db`.

### Cards show `[汉字]` as the definition

The CC-CEDICT data is missing for that word. Re-run the download and seed:

```bash
cd server
npm run download-cedict && npm run seed
```

### Audio plays but no Chinese voice is heard (Web Speech mode)

Your OS does not have a Mandarin voice installed. Follow the instructions in [Option C above](#option-c--browser-voices) for your platform. After installing, restart your browser.

### `CORS` errors in the browser console

The server only allows `http://localhost:5173`. If you changed the client port, update the `cors` origin in `server/src/index.js`:

```js
app.use(cors({ origin: 'http://localhost:YOUR_PORT' }));
```

### Audio cache grows too large

Cached MP3s live in `server/audio_cache/`. Clear them from the Settings page (**Settings → Audio & pronunciation → Clear cache**) or via the API:

```bash
curl -X DELETE http://localhost:3001/api/tts/cache
```

---

## 12. Architecture reference

```
chinese-learning/
├── package.json              ← root: runs both servers via concurrently
│
├── server/
│   ├── .env                  ← Azure keys (create from .env.example)
│   ├── audio_cache/          ← SHA-256-keyed MP3 files (auto-created)
│   ├── data/
│   │   ├── chinese_learning.db      ← SQLite database
│   │   └── cedict_parsed.json       ← parsed CC-CEDICT (~121k entries)
│   └── src/
│       ├── index.js          ← Express app, startup, TTS prewarm
│       ├── db/database.js    ← node:sqlite schema + connection
│       ├── services/
│       │   ├── sm2.js        ← SM-2 spaced repetition algorithm
│       │   └── tts.js        ← edge-tts / Azure / webspeech engine
│       ├── routes/
│       │   ├── decks.js      ← GET /api/decks
│       │   ├── cards.js      ← GET /api/cards, /session/due, /session/new
│       │   ├── reviews.js    ← POST /api/reviews, GET /api/reviews/stats
│       │   ├── sessions.js   ← POST/GET /api/sessions
│       │   └── tts.js        ← POST /api/tts/synthesize, GET /api/tts/engine
│       └── seed/
│           ├── seed.js              ← populates DB from CC-CEDICT + HSK lists
│           ├── download-cedict.js   ← downloads + parses mdbg.net dictionary
│           └── hsk-words.js         ← embedded HSK 1–6 word lists
│
└── client/
    ├── index.html            ← HanziWriter CDN script tag, PWA manifest link
    ├── public/
    │   ├── manifest.json     ← PWA manifest
    │   └── sw.js             ← service worker (offline cache)
    └── src/
        ├── App.jsx           ← routes, TTS engine detection, wizard trigger
        ├── store/useStore.js ← Zustand (theme, TTS prefs, session state)
        ├── lib/
        │   ├── api.js        ← typed fetch wrapper for all /api/* endpoints
        │   └── tones.js      ← pinyin → tone number + SVG path data
        ├── hooks/
        │   ├── useTTS.js     ← play / playSequence / stop + loading state
        │   └── usePixabay.js ← Pixabay image fetch with in-memory cache
        ├── components/
        │   ├── Layout.jsx            ← top nav + mobile bottom nav
        │   ├── TtsSetupWizard.jsx    ← first-launch TTS modal (3 tabs)
        │   ├── WebSpeechBanner.jsx   ← banner shown when on Level 3 fallback
        │   └── Card/
        │       ├── StudyCard.jsx     ← full card: front/back, audio, ratings
        │       ├── HanziWriter.jsx   ← HanziWriter.js wrapper + quiz mode
        │       ├── ToneDiagram.jsx   ← SVG tone curves (normal + compact)
        │       └── HskBadge.jsx      ← colored HSK level pill
        └── pages/
            ├── HomePage.jsx    ← deck selector, today's stats, CTA
            ├── StudyPage.jsx   ← session runner with progress bar
            ├── BrowsePage.jsx  ← paginated vocabulary browser + detail modal
            ├── StatsPage.jsx   ← activity heatmap, retention, streak
            └── SettingsPage.jsx ← TTS config, voice picker, cache, Pixabay
```

---

## 13. API reference

All endpoints are served at `http://localhost:3001`.

### Decks

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/decks` | All 6 HSK decks with card counts and due counts |
| GET | `/api/decks/:level` | Single deck info (level 1–6) |

### Cards

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cards` | Paginated card list. Query: `hsk_level`, `search`, `limit`, `offset` |
| GET | `/api/cards/:id` | Single card with full detail |
| GET | `/api/cards/session/due` | Cards due for review today. Query: `levels` (comma-separated), `limit` |
| GET | `/api/cards/session/new` | Unseen new cards. Query: `levels`, `limit` |

### Reviews (SM-2)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/reviews` | Submit rating. Body: `{ card_id, rating }` where rating is `0`=Again, `1`=Hard, `2`=Good, `3`=Easy |
| GET | `/api/reviews/stats` | Overall stats: total cards, studied, due, retention rate, streak |

### Sessions

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/sessions` | Log a completed session. Body: `{ cards_reviewed, cards_correct, new_cards_introduced, duration_seconds }` |
| GET | `/api/sessions` | Session history. Query: `days` (default 365) |
| GET | `/api/sessions/today` | Today's cumulative session stats |

### TTS audio

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/tts/engine` | Active engine name + available voices |
| GET | `/api/tts/voices` | Voice list for the active engine |
| POST | `/api/tts/synthesize` | Generate or retrieve cached audio. Body: `{ text, voice?, speed?: "normal"\|"slow" }`. Returns `audio/mpeg` or `{ engine: "webspeech" }` |
| GET | `/api/tts/cache` | List all cached audio entries with timestamps |
| DELETE | `/api/tts/cache` | Clear all cached MP3 files |

---

## 14. Tech stack

All tools are free and open-source. No paid services are required to run the core app.

| Layer | Technology | License |
|-------|-----------|---------|
| Frontend framework | React 18 + Vite | MIT |
| Styling | TailwindCSS 3 | MIT |
| Animations | Framer Motion | MIT |
| State management | Zustand | MIT |
| Routing | React Router 6 | MIT |
| Stroke animations | HanziWriter.js 3.5 (CDN) | MIT |
| Primary TTS | edge-tts (Python) — Azure Neural voices, free | GPL-3.0 |
| Fallback TTS | Azure Cognitive Services F0 (free tier, 500k chars/month) | — |
| Last-resort TTS | Web Speech API (browser built-in) | — |
| Backend | Node.js 22+ + Express 4 | MIT |
| Database | SQLite via `node:sqlite` (Node built-in) | — |
| Dictionary data | CC-CEDICT via mdbg.net | CC BY-SA 3.0 |
| Optional images | Pixabay API (free tier, 20k req/month) | — |
