# SoundCloud Resume Player

A Chrome (Manifest V3) extension that remembers where you stopped on SoundCloud and resumes the same track at the same position the next time you open the page — no more starting from `0:00`.

## Features

- **Automatic progress saving.** While you listen, the extension throttles writes to `chrome.storage.local` and flushes immediately on important events (pause, seek, metadata loaded).
- **Pre-seek on first play.** When you reload SoundCloud, the saved position is applied synchronously inside the patched `HTMLAudioElement.play()` call, so playback starts at the saved time without flashing `0:00`.
- **Same-track guard.** By default, resume only fires when the current track URL matches the saved one — you won't get teleported into a random song.
- **Optional autoplay.** Choose whether resume should also start playback or just position the playhead.
- **Internationalized UI.** English and Vietnamese locales ship out of the box (`_locales/en`, `_locales/vi`); Chrome picks the right one from your browser language.
- **Minimal permissions.** Only `storage` and host access to `*://*.soundcloud.com/*`. No analytics, no remote calls.

## Install

### From source (developer mode)

1. `npm install`
2. `npm run build` — produces a fully-packaged extension in `dist/`.
3. Open `chrome://extensions`, enable **Developer mode**, click **Load unpacked**, and select the `dist/` folder.
4. Open [soundcloud.com](https://soundcloud.com), play any track for a few seconds, reload — playback resumes where you left off.

The build script (`scripts/assert-extension-build.mjs`) verifies that `content.js` and `inject.js` contain no top-level ES module syntax, since they run as classic scripts.

## Settings (popup)

Click the toolbar icon to open the popup:

| Setting | Default | Description |
| --- | --- | --- |
| **Save progress** | on | Persist playback position to `chrome.storage.local`. |
| **Resume same track only** | on | Skip resume when the current track differs from the saved one. |
| **Autoplay after resume** | off | Call `audio.play()` after seeking. When off, the playhead is positioned but playback does not auto-start. |
| **Force old track** *(advanced)* | off | Reserved for forcing navigation to the saved track. Locked in this version to avoid surprise track jumps. |
| **Debug logs** *(advanced)* | off | Emit verbose `console.debug` traces from the content script. |

The popup also shows the most recent saved track URL, position (`m:ss` or `h:mm:ss`), and timestamp.

## How it works

The extension is split into four runtime surfaces:

```
┌─────────────────────────┐  CustomEvent   ┌─────────────────────────┐
│ inject.js (MAIN world)  │ ─────────────▶ │ content.js (ISOLATED)   │
│ patches HTMLAudioElement│                │ coordinator + storage   │
└─────────────────────────┘ ◀───────────── └─────────────────────────┘
        ▲                    chrome.runtime          │
        │                                            ▼
        │                                  ┌─────────────────────────┐
        │ chrome.tabs.sendMessage          │ background.js (SW)      │
        └────────────────────────────────▶ │ relays seek + frame ID  │
                                           └─────────────────────────┘
                                                     ▲
                                                     │
                                           ┌─────────────────────────┐
                                           │ popup.html (React)      │
                                           │ reads/writes settings   │
                                           └─────────────────────────┘
```

- **`src/inject/index.ts`** — runs in the page's MAIN world at `document_start`, monkey-patches `HTMLAudioElement.prototype.play`. Captures the active audio element, emits `timeupdate` / `pause` / `seeked` / `loadedmetadata` progress, and applies the saved position synchronously inside `play()` (or as soon as `loadedmetadata` fires).
- **`src/content/index.ts`** — runs in the isolated world. Bridges `CustomEvent`s from inject to `chrome.runtime`, hosts the `topCoordinator`, and dispatches incoming seek commands back into the page.
- **`src/content/topCoordinator.ts`** — single-frame state machine that reconciles saved progress with the current track, decides whether to resume, throttles writes (5 s) with a serialized `saveQueue` so concurrent important events (e.g., pause + seeked) cannot race.
- **`src/background/index.ts`** — service worker. Tracks which frame holds the active `<audio>` per tab, relays `audioProgress` from the audio frame to the top frame, and relays `requestSeek` from the top frame back to the audio frame.
- **`src/popup/Popup.tsx`** — React 19 popup that reads/writes settings via `chrome.storage.sync` and surfaces the latest saved progress.

### Track URL normalization

`src/shared/track.ts` reads `a.playbackSoundBadge__titleLink` from the now-playing badge and normalizes it through `URL`. Non-track paths (`/`, `/discover`, `/stream`, `/sets/*`, …) are rejected so we never save progress against a feed page.

### Resume decision

`src/shared/resume.ts` is a pure function that returns one of: `match`, `same-track-disabled`, `missing-progress`, `missing-current-track`, or `track-mismatch`. It is the single source of truth for whether to seek, and it is exercised by both the pre-resume hint (in the content script) and the coordinator's settle step.

## Project layout

```
src/
├── background/      service worker + per-tab relay state
├── content/         isolated-world content script + storage + coordinator
├── inject/          MAIN-world audio patch
├── popup/           React popup UI
├── shared/          pure modules: messages, progress, resume, settings, time, track
├── index.css        popup styles (Tailwind v4)
└── main.tsx         popup entrypoint
public/
├── manifest.json    MV3 manifest (uses __MSG_*__ for i18n)
├── _locales/{en,vi}/messages.json
└── icons/           rasterized PNGs (16/48/128)
scripts/
├── assert-extension-build.mjs   guards classic-script output
└── rasterize-icons.mjs          generates PNG icons from SVG via sharp
tests/                vitest specs mirroring src/ layout
```

## Development

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server for the popup (not the full extension). |
| `npm run build` | Type-check, build popup + background, then build `content.js` and `inject.js` as IIFE classic scripts, then run the build assertion. |
| `npm run lint` | ESLint (typescript-eslint + react-hooks). |
| `npm test` | Run the Vitest suite once (jsdom). |
| `npm run test:watch` | Vitest in watch mode. |

### Tech stack

- TypeScript (~6.0), React 19, Zustand 5
- Vite 8 with three build modes: default (popup + background ESM), `content`, `inject` (both IIFE)
- Tailwind CSS v4 for the popup
- Vitest + Testing Library + jsdom

### Iterating with the unpacked extension

1. `npm run build`
2. Reload the extension at `chrome://extensions` (or click the refresh icon on its card).
3. Reload any open SoundCloud tabs — content scripts only inject on fresh navigations.

Enable **Debug logs** in the popup's Advanced section to see coordinator decisions in DevTools.

## Permissions and privacy

The extension declares:

- `storage` — `chrome.storage.sync` for the five settings, `chrome.storage.local` for the latest saved progress (`{ trackUrl, position, updatedAt }`).
- `host_permissions: *://*.soundcloud.com/*` — required to run content/inject scripts on SoundCloud.

There is no telemetry, no remote endpoint, and no third-party script. All data stays on your device (sync settings ride Chrome's normal sync if you're signed in).

## Limitations

- Resume restores **position only**, not the queue. Reloading the page does not re-add the track to the play queue — Chrome's media session is unchanged.
- The pre-seek requires `play()` to be called once. SoundCloud does not load audio metadata until the first user interaction, so the saved position is applied at the moment you press play (not at page load).
- Playlist URLs (`/sets/*`) are intentionally ignored.

## Browser support

Chrome / Chromium-based browsers with Manifest V3 support (Chrome 116+, Edge, Brave, Arc). Firefox is not currently targeted because the inject script relies on Chromium's MV3 `world: "MAIN"` content-script field.

## License

[MIT](./LICENSE)
