# Taî-gí Easy Composer (台語簡譜音樂創作室)

A high-performance, mobile-first, and iPad-optimized editor for numbered musical notation (簡譜 / Jianpu) and Taiwanese (Taî-gí) lyric alignment, playback, and score generation.

---

## Features

- **Numbered Notation (簡譜) Engraving**: Real-time rendering with measure auto-wrapping, dots, underlines, slurs, ties, and musical accidentals.
- **Lyric Integration**: Multi-verse support with Taiwanese POJ / Hanzi phonetic tracking and syllable alignment.
- **Tactile Quick-Pad & Virtual Piano**: Low-latency touch input optimized for mobile phones and iPads.
- **Real-Time Sound Synthesis & SoundFonts**: Hybrid Web Audio architecture providing responsive instrument playback and chord accompaniment.
- **Power-Save & Thermal Protection**: Automatic voice polyphony management, background suspension, and iPad CPU/thermal throttling guards.
- **Offline PWA Readiness**: Operates completely offline with local storage and Web Manifest support.

---

## Open Source & Third-Party Licensing

This repository and its original source code are licensed under the **MIT License**.

Third-party soundfonts, audio banks, and dependencies used within this project adhere strictly to permissive open-source licenses as documented below:

### 1. Repository License (MIT)

```text
MIT License

Copyright (c) 2026 Cyber O͘-hîm

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 2. Audio & SoundFont Licensing

- **FluidR3_GM SoundFont Samples**:
  - *License*: **MIT License**
  - *Author*: Frank Wen
  - *Usage*: Sampled acoustic instruments (Acoustic Guitar, Accordion, Harmonica, Saxophone, Clean Electric Guitar).
- **FatBoy SoundFont Banks**:
  - *License*: **CC0 1.0 Universal (Public Domain Dedication)**
  - *Author*: Claudio
  - *Usage*: Supplementary General MIDI instrument waveforms.
- **WebAudioFont Engine Components**:
  - *License*: **MIT License**
  - *Author*: Sergey Surikov
  - *Usage*: Lightweight browser Web Audio sample playback and audio buffer mapping.

---

## Managing Sheet Scores (`/data/sheets/`)

Preset songs and library sheets are stored as individual files under `/data/sheets/`:

- **Taigi Songs (`*.taigi.json`)**: Formatted for Taiwanese Hokkien lyrics with Pe̍h-ōe-jī (POJ) romanization and Hàn-lô text.
- **General Songs (`*.json`)**: Formatted for non-Taigi songs (Mandarin, English, instrumental, etc.) without requiring POJ romanization.

### Adding or Removing Sheets
1. Place or remove `.taigi.json` or `.json` files inside `/data/sheets/`.
2. Optionally specify an `"order": 1` field to set its presentation order in the presets menu.
3. When building or running `npm run dev` / `npm run build`, sheets are automatically reviewed incrementally:
   - Only added, modified, or deleted sheets are checked via `.cache/sheet-review-cache.json`.
   - `lib/sheetManifest.ts` is automatically regenerated and statically bundled.

```bash
# Manually review sheet integrity (incremental)
npm run review:sheets

# Force-review all sheets
npm run review:sheets -- --all

# Regenerate sheet manifest
npm run generate:sheets
```

---

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run unit tests
npm test

# Production build
npm run build
```
