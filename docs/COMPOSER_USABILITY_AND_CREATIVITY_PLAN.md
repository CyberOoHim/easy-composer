# Architecture & Multi-Turn Implementation Roadmap
## Easy Composer: Usability & Creativity Enhancements

| Field | Specification |
| --- | --- |
| **Document Name** | Easy Composer Usability & Creativity Enhancement Plan |
| **Project Name** | Easy Composer (`taigi-composer`) |
| **Platform Target** | Dedicated iPad (iPadOS / WebKit Mobile Safari) & Modern Web |
| **Target Scope** | 1. **Usability & Ergonomics**: Measure Beat Budget Visualizer, Inline Lyric Distribute Tool, Tactile Quick-Pad (≥44px touch targets), and 100% Strict English UI Localization.<br>2. **Musical Creativity**: Chord Progression Presets, Melodic Motif Variations (Inversion, Retrograde, Sequence Shift, Folk Embellishment), Pentatonic Scale Filter, Accompaniment Styles (Ballad Arpeggios, Folk Pluck, Waltz), and Offline Melody Sparks. |
| **Language Policy** | **100% English UI text across all buttons, dialogs, menus, tooltips, and prompts. Song titles, lyrics, Han-Lo, and Pe̍h-ōe-jī (POJ) remain preserved in their authentic native language.** |
| **Backend Dependency** | **Zero Backend API Dependencies (100% Client-Side SPA / PWA execution).** |
| **Status** | **Refined for Modular Multi-Turn Execution** |

---

## 1. Multi-Turn Module Selection & Progress Dashboard

You can select any module by its ID to implement it in a focused turn, or proceed sequentially from Module 1 to Module 7. Each module is self-contained with explicit verification gates.

### Status Legend
- `[ ] Pending`: Not yet started
- `[🔄] In Progress`: Active module in current turn
- `[✓] Completed`: Implemented, tested, and verified

### Module Execution Matrix

| Status | ID | Module Name | Scope Summary | Core Target Files | Dependencies | Turn Trigger Command |
| :---: | :---: | :--- | :--- | :--- | :--- | :--- |
| `[ ]` | **MOD-1** | **Strict English UI Standardization** | Purge remaining Chinese UI strings from headers, controls, modals, and canvas labels; maintain song data intact. | `components/composer/*`, `components/*` | None | `Implement Module 1 (MOD-1)` |
| `[✓]` | **MOD-2** | **Creative Composition Engine** | Pure TypeScript module: chord progression presets, motif transforms (invert, retrograde, shift), pentatonic filter, melody sparks + unit tests. | `lib/creativityEngine.ts`, `test/creativityEngine.test.ts` | None | `Implement Module 2 (MOD-2)` |
| `[✓]` | **MOD-3** | **Measure Beat Budget & Lyric Spreader** | Rhythm budget math, remaining beat calculation, auto-fill deficit with rests, multi-verse continuous lyric distributor + unit tests. | `lib/taigiUtils.ts`, `test/rhythmAndLyricDistribute.test.ts` | None | `Implement Module 3 (MOD-3)` |
| `[ ]` | **MOD-4** | **Accompaniment Arpeggio & Styles** | Web Audio accompaniment grooves (`block`, `arpeggio`, `folk`, `waltz`), eco-mode oscillator budget, preview handlers + unit tests. | `lib/audioEngine.ts`, `test/accompanimentStyles.test.ts` | None | `Implement Module 4 (MOD-4)` |
| `[✓]` | **MOD-5** | **Measure Beat Budget Bar & Visual Caret** | On-score beat indicator (`● ● ● ○`), one-tap `[Pad Rest]`, and quick "Distribute Lyrics" action on active note/syllable. | `components/composer/RealSheetCanvas.tsx` | MOD-3 | `Implement Module 5 (MOD-5)` |
| `[ ]` | **MOD-6** | **Tactile Quick-Pad & Creativity Drawer** | iPad-ergonomic thumb pad (≥44px buttons), collapsible Creativity Studio drawer (chords, motif variations, pentatonic guide). | `components/composer/FloatingScoreHud.tsx` | MOD-2, MOD-4 | `Implement Module 6 (MOD-6)` |
| `[ ]` | **MOD-7** | **End-to-End Integration & Regression** | End-to-end user flows, iPad touch/orientation regression, audio loop stability, full test suite pass. | Workspace & test suite | MOD-1 to MOD-6 | `Implement Module 7 (MOD-7)` |

---

## 2. Architectural Principles & Invariants

1. **Strictly Sheet-Centric Architecture**: All composition, editing, playback, and creative features are anchored directly to the virtual score paper (WYSIWYG numbered musical notation). No detached floating windows or fragmented cards.
2. **Pure Client-Side Execution**: All creative algorithms, motif inversions, and accompaniment synthesizers execute 100% locally in the browser with zero network or backend API dependencies, ensuring complete offline PWA reliability on iPad.
3. **Strict 100% English UI Policy**: All buttons, dialogs, labels, and tooltips are strictly in English. Song titles, lyrics, Han-Lo, and Pe̍h-ōe-jī (POJ) remain preserved in their authentic native language.
4. **Zero Breaking Changes**: Fully backward-compatible with existing songs, presets, JSON schemas, and IndexedDB storage.
5. **Apple HIG Touch Target Compliance**: All touch buttons in the new tactile ribbon and canvas HUD strictly maintain $\ge 44 \times 44\text{px}$ hit areas.

---

## 3. Detailed Module Specifications

---

### Module 1: Strict English UI Standardization (`MOD-1`)
- **Status**: `[ ] Pending`
- **Objective**: Eliminate all remaining untranslated Chinese UI text from the user interface while preserving Taiwanese Han-Lo and POJ in song content.
- **Touchpoint Files**:
  - `components/composer/FloatingScoreHud.tsx`
  - `components/composer/RealSheetCanvas.tsx`
  - `components/composer/SongMetadataHeader.tsx`
  - `components/HeaderBar.tsx`
  - `components/UiZoomControl.tsx`
  - `components/ScoreZoomControls.tsx`
  - `components/PwaManager.tsx`
  - `components/MetronomePlaybackControl.tsx`
  - `components/ChordPlaybackControl.tsx`
  - `components/QuickLyricAlignerModal.tsx`
  - `components/LyricSearchModal.tsx`
- **Detailed TODO List**:
  - [ ] Replace `Replace (覆蓋)` $\rightarrow$ `Replace` in `FloatingScoreHud.tsx`
  - [ ] Replace `Prog Replace (遞進覆蓋)` $\rightarrow$ `Prog Replace` in `FloatingScoreHud.tsx`
  - [ ] Replace `Prog Insert (遞進插入)` $\rightarrow$ `Prog Insert` in `FloatingScoreHud.tsx`
  - [ ] Replace `(前倚音)` $\rightarrow$ `(Pre-Grace)` and `(後倚音)` $\rightarrow$ `(Post-Grace)` in `FloatingScoreHud.tsx`
  - [ ] Replace `(快捷鍵指南)` $\rightarrow$ `(Keyboard Shortcuts)` in `FloatingScoreHud.tsx`
  - [ ] Replace `Obbligato (和音)` $\rightarrow$ `Obbligato (Counter-Melody)` in `RealSheetCanvas.tsx`
  - [ ] Replace remaining Chinese confirm dialogs and prompt messages in `HeaderBar.tsx` and `SongMetadataHeader.tsx`
  - [ ] Standardize tooltips in `UiZoomControl.tsx`, `ScoreZoomControls.tsx`, `MetronomePlaybackControl.tsx`, and `ChordPlaybackControl.tsx`
  - [ ] Ensure offline banners in `PwaManager.tsx` and search placeholders in `LyricSearchModal.tsx` are in English
- **Verification Gate**:
  - `npm run typecheck` passes with zero errors.
  - Full text search confirms no untranslated Chinese UI strings in `components/`.

---

### Module 2: Creative Composition Engine (`MOD-2`)
- **Status**: `[✓] Completed`
- **Objective**: Provide a pure TypeScript, zero-dependency engine for chord progressions, melodic motif variations, pentatonic scale filtering, and offline melody sparks.
- **Touchpoint Files**:
  - `lib/creativityEngine.ts` (NEW)
  - `test/creativityEngine.test.ts` (NEW)
- **Detailed TODO List**:
  - [✓] **Chord Progression Presets**: Define `CHORD_PROGRESSION_PRESETS` (Pop Ballad `I-V-vi-IV`, Taiwanese Folk Minor `vi-ii-V-vi`, 50s Doo-Wop `I-vi-IV-V`, Pachelbel Canon `I-V-vi-iii-IV-I-IV-V`, Folk Cadence `I-IV-I-V`, Royal Road `IV-V-iii-vi`).
  - [✓] **Diatonic Degree Resolver**: Implement `getDiatonicChordForDegree(key, degree)` and `applyChordProgression(song, progressionId, startMeasureIdx)`.
  - [✓] **Motif Inversion**: Implement `invertMotif(notes, key)` (reflects scale degrees diatonically across the initial note's pitch while preserving metric durations, rests, and lyric text).
  - [✓] **Motif Retrograde**: Implement `retrogradeMotif(notes)` (reverses sequence of pitches while preserving metric note durations and maintaining syllable word order).
  - [✓] **Scale-Degree Sequence Shift**: Implement `sequenceShiftMotif(notes, stepDelta)` (steps degrees by `+1` or `-1` with proper octave wrapping `7 (+1) -> 1 (octave+1)`).
  - [✓] **Folk Grace Embellishments**: Implement `embellishWithFolkOrnaments(notes)` (attaches Taiwanese style pre-grace notes without expanding measure beat duration).
  - [✓] **Pentatonic Mode Filter**: Implement `isPitchInScale(pitch, mode)` supporting Gong-based (`1 2 3 5 6`) and Yu-based (`6 1 2 3 5`) pentatonic scales.
  - [✓] **Algorithmic Melody Spark**: Implement `generateMelodySpark(chord, key, timeSignature, style)` generating an offline 1-2 measure motif.
  - [✓] **Unit Tests**: Add thorough unit tests in `test/creativityEngine.test.ts` testing each transformation, edge cases (rests, octave transitions), and metric consistency.
- **Verification Gate**:
  - `npm run test` executes `test/creativityEngine.test.ts` and passes with 100% success (8/8 tests pass).
  - `npm run typecheck` passes.

---

### Module 3: Measure Beat Budget & Smart Lyric Spreader (`MOD-3`)
- **Status**: `[✓] Completed`
- **Objective**: Implement robust rhythm calculation utilities to compute real-time measure budgets and multi-verse continuous lyric distribution.
- **Touchpoint Files**:
  - `lib/taigiUtils.ts`
  - `test/rhythmAndLyricDistribute.test.ts` (NEW)
- **Detailed TODO List**:
  - [✓] **Measure Beat Budget Helper**: Implement `getMeasureBeatBudget(measure, timeSignature)` returning `currentBeats`, `expectedBeats`, `remainingBeats`, `isFull`, `isDeficit`, `isOverbeat`, `beatProgressPercent`, and `beatIndicators: ('filled' | 'partial' | 'empty')[]`.
  - [✓] **Auto-Fill Deficit with Rests**: Implement `fillMeasureDeficitWithRests(measure, timeSignature)` to calculate and append the minimal rest notes needed to complete the bar.
  - [✓] **Smart Inline Lyric Distribute**: Implement `distributeLyricsAcrossNotes(rawText, song, startMeasureIdx, startNoteIdx, verseIndex, field)` to tokenize text into syllables (handling Han-Lo characters, punctuation, and POJ hyphens) and distribute them across subsequent notes.
  - [✓] **Unit Tests**: Create `test/rhythmAndLyricDistribute.test.ts` covering beat budget across 4/4, 3/4, 2/4, and 6/8 meters, edge cases with tied notes, and multi-measure lyric distribution (13/13 tests pass).
- **Verification Gate**:
  - `npm run test` passes for `test/rhythmAndLyricDistribute.test.ts`.
  - `npm run typecheck` passes.

---

### Module 4: Accompaniment Arpeggio & Stylistic Grooves (`MOD-4`)
- **Status**: `[ ] Pending`
- **Objective**: Extend the Web Audio engine with selectable chord accompaniment grooves without increasing battery drain on iPad.
- **Touchpoint Files**:
  - `lib/audioEngine.ts`
  - `test/accompanimentStyles.test.ts` (NEW)
- **Detailed TODO List**:
  - [ ] **Extend Accompaniment Types**: Add `AccompanimentStyle = 'block' | 'arpeggio' | 'folk' | 'waltz'` to `AudioEngineOptions`.
  - [ ] **Arpeggio Pattern Generator**: In `playChordBeat`, cascade chord triad frequencies (Root on beat 1, 5th on beat 2, Octave on beat 3, 10th/3rd on beat 4) with voice-leading bounds.
  - [ ] **Folk Pluck Pattern**: Implement alternating bass root on beats 1 and 3 with syncopated chord plucks on beats 2 and 4.
  - [ ] **Waltz 3/4 Pattern**: In 3/4 time, synthesize a deep bass root on beat 1 followed by crisp chord hits on beats 2 and 3.
  - [ ] **Eco-Mode Optimization**: Ensure iPad battery-saving mode limits simultaneous chord oscillators to $\le 2$.
  - [ ] **Unit Tests**: Create `test/accompanimentStyles.test.ts` to verify scheduling timestamps, pattern beat divisions, and fallback safety when chords are empty.
- **Verification Gate**:
  - `npm run test` passes.
  - `npm run typecheck` passes.

---

### Module 5: Measure Beat Budget Bar & Visual Caret (`MOD-5`)
- **Status**: `[✓] Completed`
- **Objective**: Render visual beat indicators directly above the active measure on the virtual score paper with quick action buttons.
- **Touchpoint Files**:
  - `components/composer/RealSheetCanvas.tsx`
  - `components/composer/FloatingScoreHud.tsx`
  - `components/QuickLyricAlignerModal.tsx`
- **Detailed TODO List**:
  - [✓] **Beat Budget Header**: In `RealSheetCanvas.tsx`, render a non-intrusive beat budget indicator directly above the active measure: `● ● ● ○` (3 / 4 beats).
  - [✓] **Color Status Coding**: Use soft neutral styling: green for complete bar, amber for deficit, red badge for overbeat.
  - [✓] **Quick Action `[Pad Rest]`**: One-tap button next to the deficit indicator to auto-insert rests filling the remaining bar duration.
  - [✓] **Visual Caret & Empty Measure Indicator**: Implemented responsive visual caret indicating insert vs. replace mode (left vertical insertion bar in `progressive_insert` mode, underline caret in `replace` mode), plus pulsing insertion prompt for empty measures.
  - [✓] **Inline Distribute Lyric Popover**: Clicking on an active note's lyric field displays a subtle `[Spread]` button that opens an inline text box to paste and spread lyrics across consecutive notes.
  - [✓] **Floating HUD & Modal Integration**: Added "Spread Lyrics" button to `FloatingScoreHud.tsx` and updated `QuickLyricAlignerModal.tsx` with scope selection, dual Han-Lo/POJ inputs, and interactive token editing.
  - [✓] **Touch Optimization**: Ensure all clickable chips on the canvas meet iPad touch target sizes.
- **Verification Gate**:
  - `npm run build` succeeds.
  - Manual canvas interaction confirms beat indicator updates live on note entry without layout shifts.

---

### Module 6: Tactile Quick-Pad & Creativity Studio Drawer (`MOD-6`)
- **Status**: `[ ] Pending`
- **Objective**: Build the iPad-ergonomic thumb quick-pad and the comprehensive Creativity Studio drawer into the floating HUD.
- **Touchpoint Files**:
  - `components/composer/FloatingScoreHud.tsx`
- **Detailed TODO List**:
  - [ ] **Tactile Quick-Pad**: Implement a collapsible bottom ribbon with $\ge 44 \times 44\text{px}$ touch targets:
    - Pitch digits: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `0 (Rest)`, `- (Dash)`
    - Octave shift: `+8va` and `-8vb`
    - Duration adjustments: `x2 (Double)`, `/2 (Halve)`, `• (Dot)`
    - Step controls: Backspace, Prev Note, Next Note
  - [ ] **Creativity Studio Drawer**: Add an active drawer tab `activeDrawer === 'creativity'`:
    - **Chord Progression Presets**: Visual grid of presets (`Pop Ballad`, `Taiwanese Folk Minor`, etc.) with one-tap apply.
    - **Motif Tools**: Buttons for `Invert Motif`, `Retrograde (Reverse)`, `Sequence +1`, `Sequence -1`, `Folk Ornaments`.
    - **Pentatonic Mode Toggle**: Switch to highlight or guide pentatonic notes on the quick-pad and virtual keyboard.
    - **Offline Melody Spark Button**: Instant 1-measure motif suggestion for the current measure's chord.
    - **Accompaniment Style Switcher**: Segmented toggle for `Block`, `Arpeggio`, `Folk`, `Waltz`.
- **Verification Gate**:
  - `npm run build` succeeds.
  - HUD drawer opens smoothly and all controls dispatch actions cleanly to state.

---

### Module 7: End-to-End Integration & Regression (`MOD-7`)
- **Status**: `[ ] Pending`
- **Objective**: Perform end-to-end verification across the entire composition workflow, verify iPad responsive layouts, and run full test suites.
- **Touchpoint Files**:
  - Full application workspace
- **Detailed TODO List**:
  - [ ] Run full test suite: `npm run test` (all unit tests green).
  - [ ] Run type checker: `npm run typecheck` (zero TypeScript errors).
  - [ ] Run linter: `npm run lint` (clean code style).
  - [ ] Verify complete song creation flow:
    1. Create a new 4/4 song.
    2. Use Creativity Studio to apply "Taiwanese Folk Minor" progression.
    3. Enter melody via Tactile Quick-Pad observing live Measure Beat Budget.
    4. Apply `[Pad Rest]` on incomplete measures.
    5. Invert or shift a motif and preview.
    6. Paste Han-Lo lyrics using "Distribute Lyrics" and verify alignment.
    7. Play back with "Arpeggio Ballad" and "Folk Pluck" accompaniment styles.
  - [ ] Verify PWA offline playback and storage persistence.
- **Verification Gate**:
  - Full build pass (`npm run build`).
  - Production readiness verified.

---

## 4. How to Select & Execute Modules

To execute any module, simply provide the module command in your next turn:

```text
Implement Module 1 (MOD-1)
```
or
```text
Implement Module 2 (MOD-2)
```

During each turn:
1. The assistant marks the module as `[🔄] In Progress`.
2. The code edits and automated tests for that module are executed.
3. The automated test suite is run to verify zero regressions.
4. The module status is updated to `[✓] Completed`, and the next ready module is suggested.
