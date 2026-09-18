# Architecture & Multi-Turn Implementation Roadmap
## Easy Composer: App Health & Data Integrity

| Field | Specification |
| --- | --- |
| **Document Name** | Easy Composer App Health & Integrity Plan |
| **Project Name** | Easy Composer (`taigi-composer`) |
| **Platform Target** | Dedicated iPad (iPadOS / WebKit Mobile Safari) & Modern Web |
| **Target Scope** | Persistence truth (IndexedDB / localStorage / import), shared song sanitizer, single editor keyboard owner, playback meter alignment, creativity/MIDI fidelity, and CI/PWA operational health. |
| **Language Policy** | **100% English UI text across all buttons, dialogs, menus, tooltips, and prompts. Song titles, lyrics, Han-Lo, and Pe̍h-ōe-jī (POJ) remain preserved in their authentic native language.** |
| **Backend Dependency** | **Zero Backend API Dependencies (100% Client-Side SPA / PWA execution).** |
| **Status** | **Completed — All modules INT-1 through INT-6 complete** |
| **Baseline (2026-09-18)** | `tsc --noEmit` clean. `npm test` / `bun run test` **263/263 pass** across all modules INT-1 through INT-6. Clean ESLint with zero warnings. |

---

## 1. Multi-Turn Module Selection & Progress Dashboard

You can select any module by its ID to implement it in a focused turn, or proceed sequentially from Module 1 to Module 6. Each module is self-contained with explicit verification gates.

Turns 5 and 6 may run in parallel with 3 or 4. Do **not** start INT-2 until INT-1 has a single sanitizer call site in mind, or INT-2 will fight INT-1’s load path.

### Status Legend
- `[ ] Pending`: Not yet started
- `[🔄] In Progress`: Active module in current turn
- `[✓] Completed`: Implemented, tested, and verified

### Module Execution Matrix

| Status | ID | Module Name | Scope Summary | Core Target Files | Dependencies | Turn Trigger Command |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| `[✓]` | **INT-1** | **Persistence Truth** | IDB commit-only saves; do not store unmodified presets; honor discard; save-error UI; newest-of-IDB-vs-localStorage bootstrap; same-id import confirm. | `lib/indexedDb.ts`, `app/page.tsx`, `components/ImportExportModal.tsx`, `components/NewSongModal.tsx`, `test/indexedDb.test.ts` | None | `Implement Module INT-1` |
| `[✓]` | **INT-2** | **Shared Song Sanitizer** | One `sanitizeSong` on every load path; require lyric objects; reject empty measures; JSON/text parser tests including dotted-half round-trip. | `lib/songParser.ts`, `lib/indexedDb.ts`, `lib/storage.ts`, `app/page.tsx`, `test/songParser.test.ts` | INT-1 | `Implement Module INT-2` |
| `[✓]` | **INT-3** | **Editor Input Ownership** | Single score keydown owner; note click must land on the tapped cell; remove measure-13 hyphen hacks; lyric aligner verse + dual-field apply. | `components/ComposerEditor.tsx`, `components/composer/RealSheetCanvas.tsx`, `components/QuickLyricAlignerModal.tsx` | None | `Implement Module INT-3` |
| `[✓]` | **INT-4** | **Playback Meter & Wake Lock** | Drive beats from `getExpectedMeasureBeats`; pad incomplete bars; pass `isDownbeat` correctly; release wake lock; rest duration in chord arranger. | `lib/audioEngine.ts`, `lib/wakeLock.ts`, `lib/chordArranger.ts`, `app/page.tsx`, `test/audioEngine.test.ts` | None | `Implement Module INT-4` |
| `[✓]` | **INT-5** | **Creativity & MIDI Fidelity** | Melody spark must not wipe lyrics; folk grace degree-7 neighbor; diatonic VII from key; MIDI `m7`/slash bass; drop unused import. | `lib/creativityEngine.ts`, `lib/midiExport.ts`, `components/composer/RealSheetCanvas.tsx`, `test/creativityEngine.test.ts` | None | `Implement Module INT-5` |
| `[✓]` | **INT-6** | **CI & PWA Health** | Run tests in CI; Node engine vs strip-types; global-error backup key; SW cache cap/version; unused manifest shortcuts. | `.github/workflows/deploy.yml`, `package.json`, `app/global-error.tsx`, `public/sw.js`, `public/manifest.webmanifest` | None | `Implement Module INT-6` |

---

## 2. Architectural Principles & Invariants

1. **Never report a save as durable until IndexedDB `transaction.oncomplete`.** `IDBRequest.onsuccess` is not a commit.
2. **Factory presets are code, not user data.** Unmodified presets must not live in the `songs` object store. After an app update, factory scores must win over stale IDB snapshots.
3. **Discard means discard.** “Create Blank Song” must not persist dirty work when the user declined save.
4. **Every load path sanitizes.** Import, IndexedDB, localStorage, and cross-tab `storage` events share one sanitizer. A stored note without `lyric` must not reach the renderer.
5. **One keyboard owner for the score.** Duplicate `window.keydown` listeners must not fight over the same keystroke.
6. **Playback meter matches written duration.** Metronome, chords, and melody use quarter-note beats (`getExpectedMeasureBeats`), not the time-signature numerator.
7. **Zero breaking changes for valid existing songs.** Corrupt records may be rejected or repaired; valid JSON / IndexedDB songs must round-trip.
8. **Strict 100% English UI Policy** for any new dialogs, errors, and confirmations introduced by this plan.

---

## 3. Current Health Snapshot (what is already sound)

Do **not** “fix” these as part of this plan:

- Strict TypeScript (`ignoreBuildErrors: false`); typecheck is clean.
- Route error UI (`app/error.tsx`) and global error UI (`app/global-error.tsx`) with JSON backup download.
- Song history reducer (undo/redo, coalesce, dirty `contentRevision`) with unit tests.
- JSON import already forces a `lyric` object via `sanitizeImportedNote`.
- Motif invert / retrograde / sequence-shift preserve durations and lyrics.
- Lyrics render as React text (no XSS). The only `dangerouslySetInnerHTML` is a bounded `@page { size: portrait\|landscape }` print style.
- Dual localStorage + IndexedDB crash-recovery **exists**; this plan makes it truthful rather than replacing it.

---

## 4. Detailed Module Specifications

---

### Module 1: Persistence Truth (`INT-1`)
- **Status**: `[✓] Completed`
- **Objective**: Make save/load/import/new-song honor user intent and only mark data durable after IndexedDB commits. This is the only module that can silently lose or overwrite songs.
- **Touchpoint Files**:
  - `lib/indexedDb.ts`
  - `app/page.tsx`
  - `components/ImportExportModal.tsx`
  - `components/NewSongModal.tsx`
  - `components/HeaderBar.tsx`
  - `lib/storage.ts`
  - `test/indexedDb.test.ts`
- **Findings to close**:

  | Severity | Location | Effect |
  | --- | --- | --- |
  | Bug | `lib/indexedDb.ts` ~181, 331, 371 | Promise resolves on `request.onsuccess` / blind `setTimeout(resolve)`, not `tx.oncomplete`. Quota abort looks like success. |
  | Bug | `saveActiveSongToDB` + `app/page.tsx` ~513 | Selecting a factory preset `put`s it into `songs`. After an app update, old snapshots hide new factory scores. |
  | Bug | `app/page.tsx` ~387–393 | `if (saveCurrentFirst \|\| isDirty)` — “Create Blank Song” still saves. |
  | Bug | `app/page.tsx` ~288–290 | Main Save/autosave failure is `console.error` only. |
  | Bug | `app/page.tsx` ~169–175 + ~415–421 | Bootstrap prefers any IDB song over a newer localStorage draft; `pagehide` IDB flush is fire-and-forget. |
  | Bug | `ImportExportModal.tsx` ~332–338 then `handleSelectSong` | Same-id import is written, then dirty in-memory song is flushed over it. |

- **Detailed TODO List**:
  - [✓] Resolve IDB write promises **only** on `tx.oncomplete`; reject on `onerror` / `onabort`. Remove production `setTimeout(() => resolve())` fallbacks (`saveSongToDB`, `saveActiveSongToDB`, `deleteSongFromDB`, `resetAllPresetsToFactory`). Keep mock-only fallbacks in `test/indexedDb.test.ts` if the in-memory mock still needs them.
  - [✓] Do **not** store unmodified presets in the `songs` store. Persist `active_song_id` (and optional last-active snapshot) in `meta`. Persist a song body only if it is custom **or** `isSongModifiedFromPreset(song)` is true. When loading a preset, prefer factory `PRESET_SONGS` unless a **modified** override exists.
  - [✓] Expand `isSongModifiedFromPreset` to include `notator`, `catalogNumber`, `footnote`, `orientation`, `verseCount`, `verseDisplayOption`, and `verseSettings` (today those edits can be stored as “not modified”).
  - [✓] Honor `saveCurrentFirst`: dirty + “Create Blank Song” (`onConfirm(false)`) must not write the old song. Optionally add an explicit “Discard unsaved changes” confirmation when `isDirty`.
  - [✓] Surface save/autosave failure in the header using the same pattern as `ImportExportModal`’s `saveError`. Do not set `savedRevision` unless the IDB write actually committed.
  - [✓] Bootstrap: pick the newer of IDB vs localStorage by `updatedAt`. If `pagehide` cannot await IDB, localStorage remains the crash-recovery source of truth for unsaved drafts.
  - [✓] Import: if the incoming `id` already exists in IDB or the custom library, confirm overwrite **or** mint a new id. Flush the dirty current song **after** that decision, never before. Do not treat an imported preset-id JSON as a factory preset override without confirmation.
- **Verification Gate**:
  - `npm run typecheck` passes.
  - `npm test` passes; `test/indexedDb.test.ts` covers: commit-only resolve (abort after `onsuccess` must reject), unmodified preset is not listed as a modified override, migration still loads legacy custom songs.
  - Manual: edit a preset, reload, confirm factory vs override behavior; click “Create Blank Song” on a dirty score and confirm the old song is not in the library; import a JSON that reuses the current id and confirm the prompt.

---

### Module 2: Shared Song Sanitizer (`INT-2`)
- **Status**: `[✓] Completed`
- **Objective**: One sanitizer on every load path so corrupt stored notes cannot crash the sheet or karaoke timeline.
- **Touchpoint Files**:
  - `lib/songParser.ts`
  - `lib/indexedDb.ts`
  - `lib/storage.ts`
  - `app/page.tsx`
  - `test/songParser.test.ts` (new)
- **Findings to close**:

  | Severity | Location | Effect |
  | --- | --- | --- |
  | Bug | `validateSongRecord` vs `importSongFromJson` | Import sanitizes; IDB/localStorage/cross-tab do not. Missing `lyric` throws in `karaokeSequencer.ts` ~89 and sheet lyric inputs. |
  | Bug | `importSongFromJson` | Empty `measures` array is allowed; IDB then refuses to load the song. |
  | Bug | `lib/songParser.ts` ~257–260 + ~132 | Dotted half (`duration: 3`, `isDotted: true`) exports as `5.` and re-imports as 1.5 beats. |
  | Suggestion | `getStoredCustomLibrary` | `as Song[]` with no validation. |
  | Suggestion | `app/page.tsx` ~447–451 | Cross-tab load trusts `JSON.parse` and only reacts when `id` changes. |

- **Detailed TODO List**:
  - [✓] Extract a shared `sanitizeSong(raw: unknown): Song | null` from `importSongFromJson` + `validateSongRecord`. Do not mutate the caller’s object in place; return a normalized copy.
  - [✓] Required fields: non-empty `id`, non-empty `title`, non-empty `measures`, valid `key` / `timeSignature` / `bpm`. Every note has `id`, pitch, duration, and a `lyric` object (`hanlo` + `poj`, with `tl`/`hanji`/`custom` aliases migrated).
  - [✓] Call it from: JSON import, text import (after parse), `getSongFromDB` / `getAllSongsFromDB` / `getActiveSongFromDB`, `getStoredCurrentSong`, `getStoredCustomLibrary`, and the cross-tab `storage` handler.
  - [✓] Reject empty measures on import (align JSON import with IDB’s non-empty `measures` gate).
  - [✓] Fix text duration encoding so dotted half (`3` beats) round-trips (do not treat `duration === 3` as a single-dot quarter/half encoding).
  - [✓] Add `test/songParser.test.ts`: UTF-8 BOM, markdown ` ```json ` fence, empty measures rejected, missing `lyric` repaired, dotted-half text round-trip, unknown key → `C`, missing title rejected or titled `Untitled Song` consistently.
- **Verification Gate**:
  - `npm run test` executes `test/songParser.test.ts` and the existing IDB/storage suites with 100% success.
  - `npm run typecheck` passes.
  - Loading a hand-crafted localStorage payload with `lyric: undefined` no longer throws.

---

### Module 3: Editor Input Ownership (`INT-3`)
- **Status**: `[✓] Completed`
- **Objective**: One keydown owner for the score; clicking a note selects that note; lyric aligner respects verse scope and dual fields.
- **Touchpoint Files**:
  - `components/ComposerEditor.tsx`
  - `components/composer/RealSheetCanvas.tsx`
  - `components/composer/FloatingScoreHud.tsx` (shortcut tooltips only if keys change)
  - `components/QuickLyricAlignerModal.tsx`
- **Findings to close**:

  | Severity | Location | Effect |
  | --- | --- | --- |
  | Bug | Dual `window.keydown` (`ComposerEditor.tsx` ~2093, `RealSheetCanvas.tsx` ~1768) | Last write wins. Progressive-replace is undone; `-` is octave-down not dash; Backspace becomes empty spacer not rest. |
  | Bug | `RealSheetCanvas.tsx` ~730 + `ComposerEditor.tsx` ~2049 | `handleNoteClick` also calls `onSelectMeasure`, which jumps to the first pitched note in the **new** measure. |
  | Bug | `RealSheetCanvas.tsx` ~3223 | Measure-13 hyphen layout hacks apply to **every** song. |
  | Bug | `QuickLyricAlignerModal.tsx` ~253–385 | `alignScope === 'verse'` is UI-only; dual mode flattens tokens to one field. |

- **Detailed TODO List**:
  - [✓] Keep **one** score keydown handler (RealSheetCanvas, which already knows `noteInputMode`). ComposerEditor must return early on `e.defaultPrevented` **or** drop duplicate pitch / octave / delete / dash handling. Global Ctrl/Cmd+F and transport keys may remain on the page/editor.
  - [✓] Align HUD tooltips with the surviving keymap (`-` = dash vs octave).
  - [✓] Stop calling `onSelectMeasure` from `handleNoteClick`. Measure-empty-area clicks stay on `onSelectMeasure`; note/lyric cell clicks only call `onSelectNote`.
  - [✓] Remove 望春風-specific hyphen special cases keyed on `measureNumber === 13`. Drive hyphen joining from lyric text only.
  - [✓] Implement `alignScope === 'verse'` in `handleApply`. Dual mode must write both POJ and Hàn-lô without flattening to `hanlo \|\| poj`.
- **Verification Gate**:
  - `npm run typecheck` passes.
  - Manual: type 1–7 in progressive-replace — cursor advances; `-` inserts a dash, not octave down; click a note in another bar and land on **that** cell; aligner “this verse” does not rewrite other verses.
  - Do not regress `test/tactileQuickPad.test.ts` exclusive ribbon hiding.

---

### Module 4: Playback Meter & Wake Lock (`INT-4`)
- **Status**: `[✓] Completed`
- **Objective**: Metronome, chords, and melody share one beat clock; wake lock is released when playback ends.
- **Touchpoint Files**:
  - `lib/audioEngine.ts`
  - `lib/wakeLock.ts`
  - `lib/chordArranger.ts`
  - `lib/karaokeSequencer.ts` (if beat numerator is used there)
  - `app/page.tsx`
  - `components/ComposerEditor.tsx` (sheet play wake-lock request)
  - `test/audioEngine.test.ts` / `test/accompanimentStyles.test.ts` / `test/chordArranger.test.ts`
- **Findings to close**:

  | Severity | Location | Effect |
  | --- | --- | --- |
  | Bug | `lib/audioEngine.ts` ~2807–2875 (also `playMeasure` ~2174) | `beatsPerBar = parseInt(numerator)`. `getExpectedMeasureBeats('6/8') === 3`, so 6/8 clicks six times and overruns the next bar. |
  | Bug | Same loop | Incomplete 4/4 bar still schedules 4 clicks; extra click lands on the next downbeat. `playMeasure` pads with `Math.max`; full `play()` does not. |
  | Bug | `playChordBeat(..., ev.isChordChange, ...)` ~2916 / ~2262 | 4th parameter is `isDownbeat`. Mid-bar chord changes play as downbeats (folk/waltz/arpeggio bass on the wrong beat). |
  | Bug | `app/page.tsx` ~464–476 vs `lib/wakeLock.ts` | Wake lock requested on header play; never released on pause/stop/end. Tab-show reacquires while idle. Sheet play never requests a lock. |
  | Bug | `lib/chordArranger.ts` ~151–154 | `!note.pitch` treats rest `0` as skip **without** advancing `currentBeat`. |

- **Detailed TODO List**:
  - [✓] Drive `beatsPerBar` / expected measure length from `getExpectedMeasureBeats(measure.timeSignature \|\| song.timeSignature)` in `play`, `playMeasure`, `playSystem`, `playVerse`, and `playCountIn`.
  - [✓] Advance the bar by `max(writtenBeats, expectedBeats)` so incomplete bars pad with silence instead of overlapping the next measure. Align `play()` with `playMeasure`.
  - [✓] Pass `isDownbeat` (`b === 0`) as the 4th argument of `playChordBeat`. Keep `isChordChange` as a separate flag if groove code needs it; do not overload the downbeat argument.
  - [✓] Call `wakeLockManager.release()` on pause, stop, and `notifyEnded`. Request the lock from sheet play as well as the header transport (skip when eco mode is on, matching `requestForPlayback`).
  - [✓] In `extractTimedNotes`, treat `pitch === 0` as a rest that still advances `currentBeat`. Only skip true non-notation / `'empty'` / zero-duration items without time.
- **Verification Gate**:
  - New unit tests: 6/8 schedules 3 quarter-beats; a 3-beat bar in 4/4 does not schedule a 4th click into the next bar; folk/waltz mid-bar chord change is not treated as a downbeat; rest `pitch: 0` advances beat weight.
  - `npm test` and `npm run typecheck` pass.
  - Manual: play a 6/8 score; pause from the header and confirm the screen can sleep (wake lock released).

---

### Module 5: Creativity & MIDI Fidelity (`INT-5`)
- **Status**: `[✓] Completed`
- **Objective**: Creative tools and MIDI export must not destroy lyrics or emit the wrong chord quality.
- **Touchpoint Files**:
  - `lib/creativityEngine.ts`
  - `lib/midiExport.ts`
  - `components/composer/RealSheetCanvas.tsx` (`handleApplyMotifTool`)
  - `test/creativityEngine.test.ts`
- **Findings to close**:

  | Severity | Location | Effect |
  | --- | --- | --- |
  | Bug | `generateMelodySpark` ~326–334 + `RealSheetCanvas.tsx` ~1528 | Spark replaces the bar with `lyric: {}` — lyrics gone. Invert/retrograde/shift keep lyrics. |
  | Bug | `embellishWithFolkOrnaments` ~247 | Degree 7 → 1 at the **same** octave (a seventh down). Upper neighbor of 7 is 1 at octave+1. |
  | Bug | `getDiatonicChordForDegree` ~93–95 | Fallback `VII` is always `'Bdim'` in every key. |
  | Bug | `lib/midiExport.ts` ~127–130 | `quality.includes('m')` matches `m7` before the 7th branch; slash bass ignored. Live playback uses `getChordNotes`. |
  | Nit | `lib/creativityEngine.ts` | Unused `normalizeSongDurations` / `Measure` imports. |

- **Detailed TODO List**:
  - [✓] Melody spark: map generated pitches onto existing notes by duration **or** show a confirm “Replace this measure (lyrics will be cleared)”. Prefer preserving `id` + `lyric` / `lyricsByVerse` when durations match.
  - [✓] Folk grace: degree 1 lower neighbor = 7 at octave−1; degree 7 upper neighbor = 1 at octave+1. Clamp resulting octave to `[-2, 2]`.
  - [✓] Resolve diatonic VII from `getDiatonicCandidateChords(key)`; do not hardcode `Bdim`.
  - [✓] MIDI: parse `m7` / `maj7` / slash bass in the same order as `getChordNotes`. Block-chord export may remain block (no groove requirement in this module).
  - [✓] Wire `normalizeSongDurations` after spark, or drop the unused import.
- **Verification Gate**:
  - `test/creativityEngine.test.ts` covers spark lyric preservation (or documented confirm path), degree-7 grace octave, and VII in a non-C key.
  - MIDI chord helper test: `Am7` includes the minor 7th; `C/E` includes bass E.
  - `npm test` and `npm run typecheck` pass.

---

### Module 6: CI & PWA Health (`INT-6`)
- **Status**: `[✓] Completed`
- **Objective**: Regressions cannot ship unnoticed; crash recovery and service-worker cache stay truthful.
- **Touchpoint Files**:
  - `.github/workflows/deploy.yml`
  - `package.json`
  - `next.config.ts` (only if changing `eslint.ignoreDuringBuilds`)
  - `app/global-error.tsx`
  - `public/sw.js`
  - `public/manifest.webmanifest` / `public/manifest.json`
- **Findings to close**:

  | Severity | Location | Effect |
  | --- | --- | --- |
  | High | `.github/workflows/deploy.yml` | CI runs lint + typecheck + Pages export; **never runs tests**. |
  | Medium | `package.json` `engines.node >=20` vs `node --test --experimental-strip-types` | Tests need Node ≥ 22.6. |
  | Medium | `app/global-error.tsx` ~21 | Reads non-existent `taigi_composer_last_active_song`. Last-active lives in IndexedDB meta. |
  | Medium | `public/sw.js` | Stale-while-revalidate caches every `/_next/static` hash forever; `CACHE_NAME` is frozen at `v3`. |
  | Low | `manifest.webmanifest` shortcuts `?mode=karaoke` / `?mode=editor` | Nothing in the app reads `mode`. |

- **Detailed TODO List**:
  - [✓] Add `bun run test` (or `npm test`) to the CI build job **before** the static export.
  - [✓] Pin `engines.node` to `>=22.6.0` **or** change the test runner so Node 20 works. Do not leave the engine range lying.
  - [✓] `global-error.tsx`: read only `taigi_composer_current_song` (`STORAGE_KEYS.CURRENT_SONG`). IndexedDB may be unavailable in a root crash. Keep `error.tsx` as the IDB-first backup path.
  - [✓] Service worker: bump `CACHE_NAME` when shipping cache-policy changes; cap cache entries (delete oldest when over limit); keep navigation **network-first**. Do not swallow `cache.addAll` failure silently without logging.
  - [✓] Manifest shortcuts: implement `?mode=` in `app/page.tsx` **or** remove the unused shortcuts. Do not leave dead PWA entries.
  - [✓] Optional: stop `bun install --frozen-lockfile \|\| bun install` from masking lockfile drift (prefer fail-on-mismatch in CI).
- **Verification Gate**:
  - CI log shows the test suite (207+ tests) before deploy.
  - PWA update toast still appears after a `CACHE_NAME` bump.
  - Global error “Download Score Backup” downloads `taigi_composer_current_song` when present.

---

## 5. Out of Scope (explicitly not this plan)

- New composition features, accompaniment styles, or HUD chrome (covered by `docs/COMPOSER_USABILITY_AND_CREATIVITY_PLAN.md`, MOD-1–MOD-7, already marked complete).
- MIDI **import**.
- Replacing IndexedDB with another storage backend.
- Adding a backend or auth.
- Broad ESLint/Next major-version upgrade (`eslint-config-next` 16 vs `next` 15) unless it blocks INT-6.
- React component tests for the full editor (INT-3 is behavior-fix first; full RTL coverage is a follow-up).

---

## 6. Suggested Execution Order

| Order | ID | Why this order |
| :---: | :---: | :--- |
| 1 | **INT-1** | Only module that can silently lose or overwrite user songs. |
| 2 | **INT-2** | Needs INT-1’s load path settled so both share one sanitizer. |
| 3 | **INT-3** | Independent of persistence; highest daily editing pain. |
| 4 | **INT-4** | Independent of editor keys; 6/8 and incomplete bars sound wrong today. |
| 5 | **INT-5** | Isolated; spark lyric wipe is real but opt-in. |
| 6 | **INT-6** | Ops; can run in parallel with INT-3/INT-4/INT-5. |

**Parallelism:** INT-5 and INT-6 may run alongside INT-3 or INT-4. INT-2 must follow INT-1.

---

## 7. Verification Commands (every turn)

```bash
npm run typecheck
npm test
```

After UI-facing turns (INT-1, INT-3, INT-4), also exercise the changed flow on desktop and a narrow/mobile viewport: save/reload, note click, and play/pause.

After INT-6, confirm the GitHub Actions log includes the test step.
