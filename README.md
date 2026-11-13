# Shake-a-Memory Christmas Letter 🎄

A cozy retro Christmas letter for yourself and friends. A Christmas gift from me to you <3

Pop a cheeky photo of yourself, your pet, or a loved one into a pixel-art snowglobe, give it a shake, and save it as an animated GIF to share as a Christmas letter with your friends and family.

**Live:** https://christmas-letter-lemon.vercel.app

## How it works

```mermaid
flowchart LR
    A[Globe screen] -->|Upload pic or selfie| B[Cut out in your browser<br/>and pixelated]
    B --> C[You, standing in the globe<br/>next to the tree]
    C -->|Shake me!| D[Snow swirls + music box plays]
    D -->|Send as letter| E[Airmail letter<br/>with your message]
    E -->|Save GIF| F[Animated GIF to share]
    E -->|Make another| A
```

1. **Globe screen.** Pick a cosy window scene, add a photo, and shake the globe by dragging it, tapping **Shake me!**, pressing Space, or shaking your phone. Snow swirls and settles while a music-box carol winds down with it.
2. **Letter screen.** The globe lands on a pixel airmail letter next to a handwritten "Merry Christmas & a Happy New Year!" and "Love, [name]". Edit the message, then save the letter as a looping GIF.

## Status

The app is being built in phases (see `SPEC.md`).

| Phase | What | Status |
| --- | --- | --- |
| 0 | Asset pass: sprites, backgrounds, palette, generated pixel art | ✅ Done |
| 1 | Responsive globe screen, background picker, About | ✅ Done |
| 2 | Snow and shaking (drag, button, keyboard, device motion) | Next |
| 3 | Music box (public-domain carols) | Planned |
| 4 | Photo upload, in-browser background removal, pixelation | Planned |
| 5 | Letter screen with editable message | Planned |
| 6 | Save GIF and share | Planned |
| 7 | Polish, accessibility and performance pass | Planned |

## Privacy

> **Your photos stay on your device.**
> This app runs entirely in your browser. Your photo is never uploaded, stored, or sent to me, to any AI service, or to any third party.
> This uses @imgly/background-removal, which is an in-browser background removal, meaning that your images remain secure within your own devices: refreshing or closing the page clears it.
> The web app only remembers your sound, song and background choices and your last message, in your own browser.
> GIFs you save go only where you choose to share them.

The site only loads its own static files. There's no backend, no accounts and no analytics, and the background-removal model will be self-hosted rather than loaded from a CDN.

## Tech stack

| Concern | Choice |
| --- | --- |
| Build | [Vite](https://vite.dev) + TypeScript, no framework |
| Rendering | Canvas 2D at native art resolution, scaled by whole numbers with `image-rendering: pixelated` |
| Background removal | `@imgly/background-removal`, lazy-loaded and run in the browser (Phase 4) |
| Audio | Web Audio API, synthesised music-box tones (Phase 3) |
| GIF export | `gifenc` (Phase 6) |
| Font | Pixelta and Pixelta Rounded by Blankids, falling back to Pixelify Sans |
| Tests | Vitest (layout logic) and Playwright (viewport smoke tests) |
| Hosting | Vercel, deployed as a prebuilt build from a local machine |

### Pixel-perfect scaling

All art is drawn at its real pixel size: the globe is a 96×120 frame, and the backgrounds are 384×216 (desktop), 384×240 (laptop) and 216×384 (mobile). The layout picks the background that best fits the screen's shape and scales it to cover the screen by a whole number of **device** pixels. The globe uses the same scale where it fits, so its pixels match the scene's, and it stands on the windowsill. Every art pixel stays a crisp square on any phone, tablet or monitor.

## Running it locally

Needs Node 22 or newer. Vercel builds use Node 24.

```bash
npm install
npm run dev          # http://localhost:5173
npm test             # unit tests
npm run test:e2e     # Playwright viewport tests (first run: npx playwright install chromium)
npm run lint         # TypeScript + Prettier
```

### Fonts

Pixelta is a licensed font, so its files are **not** in this repo. Without them the app falls back to [Pixelify Sans](https://fonts.google.com/specimen/Pixelify+Sans) (SIL Open Font License) and still works.

If you hold a Pixelta licence:

1. Put `Pixelta-Regular.ttf` and `Pixelta-Rounded.ttf` in `fonts-local/` (git-ignored).
2. Run `npm run font` to write the `.woff2` files to `public/fonts/` (also git-ignored).

### Assets

Source art lives in `design/source/`. The scripts that rebuild `public/assets/` are:

```bash
npm run assets   # crop and alpha-clean the owner sprites, downscale backgrounds, draw generated pixel art
```

`design/preview.html` shows every asset at 4×. Open it through the dev server at http://localhost:5173/design/preview.html.

## Deploying

The fonts can't go into git, so the site is built locally and the finished output is uploaded to Vercel:

```bash
npm run deploy        # checks + tests, then a preview deployment
npm run deploy:prod   # checks + tests, then production
```

The Vercel project is deliberately **not** connected to GitHub. Builds on Vercel's servers wouldn't have the fonts.

## Project structure

```
design/        source art, the layout sketch and the asset preview page
public/assets/ processed pixel art served by the app
scripts/       asset pipeline (normalise, draw, fonts)
src/
  assets/manifest.ts   every asset's size and anchor point
  palette.ts           shared colour palette
  render/              integer scaling + globe drawing
  screens/             globe screen (letter screen to come)
  ui/                  handwritten greeting effect
  state.ts             saved preferences (never photos)
tests/         Vitest unit tests and Playwright e2e tests
```

## Credits

Made by Loveaction Alyssa. Font: Pixelta by Blankids. Carols are in the public domain. Background removal by IMG.LY.

If you use and enjoy this, feel free to tag me on my socials!

## Licence

Not yet chosen. `@imgly/background-removal` is AGPL-3.0, so once it's added (Phase 4) the app's source must stay public under a compatible licence. The Pixelta fonts are licensed separately and aren't covered by this repo's licence.
