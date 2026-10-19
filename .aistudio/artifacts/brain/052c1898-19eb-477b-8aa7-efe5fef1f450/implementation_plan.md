# Full-Application Architectural Audit & Deep Structural Refactoring Plan

This blueprint delivers a comprehensive architectural code review of the Taiwanese Numbered Notation (Jianpu) Composition Studio and defines a deep structural refactoring strategy to decompose monolithic view and library modules into cohesive, high-performance subsystems.

### User Review & Critical Decisions

> [!IMPORTANT]
> The scope and refactoring posture below reflect your confirmed choices from Phase 1. No application source code has been modified yet; once you approve this plan, we will execute the structural refactoring in staged, test-verified steps.

- **Confirmed Decision 1 — Comprehensive Audit & Actionable Refactoring Blueprint First**: Deliver a full-system architectural audit diagnosing coupling, state bottlenecks, and maintainability risks before executing code changes.
- **Confirmed Decision 2 — Prioritize Component Architecture & Large-Module Decomposition**: Focus primary engineering effort on breaking up the multi-thousand-line UI components and utility libraries into focused domain boundaries.
- **Confirmed Decision 3 — Deep Structural Refactoring Across Components & Core Libraries**: Execute a clean, domain-driven modularization across both the presentation layer and the underlying audio, music theory, and score-mutation engines while keeping 100% of the existing automated test suite green.

---

### 1. Overview & Core Concept

- **What It Does**:
  Transforms the studio from a tightly coupled set of oversized single-module controllers into a layered, modular architecture where score engraving, inline cell editing, floating studio drawers, pure score mutations, Taigi linguistic utilities, and Web Audio synthesis operate in isolated, independently testable modules.
- **Executive Code Review Findings (Current Architectural Bottlenecks)**:
  1. **Severe Monolithic Concentration ("God Modules")**:
     - **Score Canvas Monolith (~5,600 lines)**: Combines SVG/DOM system engraving, multi-verse lyric cell rendering, pointer/keyboard event ownership, playback auto-scroll, inline chord/section popovers, the Bilingual Lyric Spreader modal, A-B loop range selection, and HUD drawer state in a single component scope.
     - **Web Audio Synthesis & Scheduler Engine (~4,360 lines)**: Mixes the lookahead clock scheduler, repeat/volta sequence expansion, 4 accompaniment pattern generators, 18 procedural instrument voice graphs, periodic vocal formants, and tab-interruption recovery inside one class.
     - **Music Theory & Taigi Linguistic Utility Monolith (~2,900 lines)**: Couples pitch/MIDI frequency math, chord voicing, POJ/Tâi-lô tone diacritic tables, syllable tokenization, beat-budget rhythm validation, and system line-wrapping in a single catch-all utility module.
     - **Composer Controller (~2,540 lines) & Floating Score HUD (~2,460 lines)**: Pass over 45 props across 3 component layers and re-implement score mutation callbacks that overlap with the dedicated score-editing operations library.
  2. **Triplicated Score Mutation Logic**:
     - Note insertion, deletion, duration scaling, rest padding, and measure manipulation are implemented in three separate places: inside the Composer Controller, inside the Score Canvas, and inside the pure Score Edit Operations module. This creates subtle behavioral drift in cursor restoration and undo history coalescing.
  3. **Prop-Drilling & Ad-Hoc Window Event Synchronization**:
     - Over 40 persisted studio settings rely on manual `window.dispatchEvent` triggers (`SETTINGS_RESET_EVENT`, `SHEET_ZOOM_EVENT`, `VIRTUAL_KEYBOARD_EVENT`, `TACTILE_QUICK_PAD_EVENT`) paired with repetitive `useState` + `useEffect` boilerplate across components instead of a unified external-store hook pattern.
  4. **Canvas Re-Render Blast Radius**:
     - Because system rows, measure cells, inline popovers, and the Lyric Spreader modal live inside the same monolithic render function, cursor movement (`[measureIdx, noteIdx]`) or drawer toggles re-evaluate the entire score tree rather than isolating updates to the active measure and active cell.
- **Target Audience / Persona**:
  Composers, arrangers, music educators, and developers maintaining and extending the Taigi & multilingual numbered-notation DAW on desktop, iPadOS Safari, and mobile browsers.
- **Key Value**:
  Dramatically smaller, single-responsibility modules (<500 lines per unit), zero duplicated score-mutation logic, eliminated prop-drilling chains, faster canvas interaction frames on mobile/iPad viewports, and full backward compatibility with all existing tests and persisted user libraries.

---

### 2. User Experience & Visual Design

- **Key User Flows Preserved & Hardened**:
  1. **Zero-Regression WYSIWYG Score Editing**: Clicking or tapping any pitch cell, sustain dash, chord badge, section marker, or multi-verse lyric syllable immediately activates the target with deterministic focus rings and zero layout shift (`CLS = 0`).
  2. **Unified Bottom Studio Deck & HUD Drawers**: Switching between the Contextual Edit Deck (`Bar`, `Note`, `Lyric vN`), Tactile Quick Pad, Piano Bed, Ornaments Drawer, Chords & Accompaniment Drawer, and Creativity Motif Studio operates with instant (<150ms) transitions and preserved input focus.
  3. **Seamless Playback & Auto-Scroll Tracking**: Full-score playback, A-B section looping, and cursor-start playback highlight the active note and smoothly scroll systems into the vertical safe zone without re-rendering inactive measures.
  4. **Bilingual Lyric Alignment & Spreading**: Opening the inline Lyric Spreader or full Quick Lyric Aligner distributes Hàn-lô and POJ syllables across singable notes while automatically skipping rests and tied notes.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: Precision DAW Master Console paired with publication-grade physical manuscript paper.
  - *Color Palette & Mood*:
    - **60% Dominant Neutral Canvas**: Crisp manuscript parchment (`#FCFAF6`) in daylight mode and deep studio slate (`#0C0E14` / `#141820`) in dark mode.
    - **30% Structural Surfaces**: Hairline barlines, measure headers, and single-elevation dock panels (`border-zinc-200 dark:border-zinc-800`).
    - **10% High-Intent Accent Budget**: Warm amber (`amber-500`) for active note/measure selection and primary CTAs; emerald (`emerald-500`) for active lyric typing and POJ subfields; rose (`rose-500`) strictly for beat-budget deficits and destructive actions.
  - *Typography & Hierarchy*: Italicized serif typography for POJ romanization, high-legibility CJK sans/serif for Hàn-lô characters, and strict `font-mono tabular-nums` for all bar numbers, BPM readouts, beat budgets, and note coordinates.
  - *Component Styling & Layout*: Full desktop viewport presence (`max-w-[1600px]`), minimum `44px × 44px` touch targets across all bottom thumb-zone controls, and strict print-media isolation (`print:hidden` on all studio chrome).
- **Interactive Feedback & Motion**:
  - Compositor-only transitions (`transform`, `opacity`) settling within 150ms.
  - Strictly bounded sticky chrome height on mobile/tablet viewports so the score paper remains the undisputed visual anchor.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Consolidate All Score Mutations into a Single Pure Command Layer**
  - *Chosen Approach*: Route every note, measure, lyric, chord, and A-B range edit from both the Composer Controller and the Score Canvas through the pure Score Edit Operations domain layer, returning `{ song, cursor, undoCursor, notice }`.
  - *Why*: Eliminates ~1,400 lines of duplicated array-splicing logic across view components, guarantees identical cursor movement and undo-coalescing behavior whether triggered by keyboard shortcut, HUD button, or Contextual Edit Deck, and makes 100% of editing behavior unit-testable without DOM mounting.
  - *Alternatives Considered*: Keeping separate inline handlers inside the Score Canvas and Composer Controller was rejected because it has already caused divergence between keyboard shortcuts and toolbar actions.
- **Decision 2: Decompose the Monolithic Score Canvas into Focused Sub-Components & Custom Hooks**
  - *Chosen Approach*: Split the 5,600-line Score Canvas into modular presentation units:
    1. **System & Measure Sheet View**: Memoized `SheetSystemRow`, `SheetMeasureCell`, `SheetNoteColumn`, and `SheetLyricCell` components so cursor changes only re-render the affected measure.
    2. **Inline Score Popovers**: Dedicated, self-contained components for the Chord Picker Popover, Section Badge Popover, and Bilingual Lyric Spreader Modal.
    3. **Canvas Interaction Hooks**: Dedicated hooks for score keyboard navigation (`useScoreKeyboardController`), playback scroll synchronization (`usePlaybackAutoScroll`), and zoom/pan gesture handling (`useSheetStageZoom`).
  - *Why*: Reduces each component to a clear, maintainable size (<450 lines), prevents inline modal state from re-rendering the entire engraved score, and isolates complex WebKit touch/focus workarounds.
  - *Alternatives Considered*: Leaving all rendering inside one file with internal render helpers was rejected because shared closure state still forces full-tree re-evaluation on every keystroke.
- **Decision 3: Modularize the Web Audio Engine & Taigi Utility Libraries by Domain**
  - *Chosen Approach*:
    - Partition the Web Audio Engine into dedicated internal modules: **Voice Synthesizer** (procedural oscillator/filter graphs & periodic waves), **Accompaniment Pattern Generator** (block, arpeggio, folk, waltz), **Playback Scheduler & Clock** (lookahead queue & repeat/volta timeline builder), and **Audio Facade** (preserving the exact public `AudioEngine` API).
    - Partition the Taigi & Music Theory utility library into focused domain modules: **Pitch & Chord Math**, **Taigi & Multilingual Lyric Tokenizer**, **Rhythm & Beat Budget Analyzer**, and **Measure Layout & Auto-Wrap Engine**, re-exported cleanly through the existing barrel interface so zero external imports break.
  - *Why*: Separates signal-processing code from musical timeline math and linguistic text parsing while maintaining 100% API compatibility with existing tests.
  - *Alternatives Considered*: Changing the public signatures of `AudioEngine` or utility functions was rejected to avoid unnecessary churn in the 24 existing test suites.
- **Decision 4: Replace Ad-Hoc Window Events with a Unified Reactive Preferences Store**
  - *Chosen Approach*: Introduce a lightweight `useStudioPreference` hook backed by `React.useSyncExternalStore` over the LocalStorage Registry, replacing manual `window.addEventListener` / `dispatchEvent` plumbing across the Header, HUD, and Canvas.
  - *Why*: Ensures SSR hydration safety, eliminates stale listener leaks, and automatically synchronizes settings resets and cross-component toggles.
  - *Alternatives Considered*: Adding a heavy third-party state library (Redux/Zustand) was rejected because `useSyncExternalStore` is built into React 19 and requires zero extra bundle dependencies.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                        Application Shell & Persistence                       │
│  ┌─────────────────────────┐  ┌──────────────────────┐  ┌─────────────────┐  │
│  │ Song History & Undo/Redo│  │ IndexedDB + Local    │  │ URL Score Share │  │
│  │ Controller              │  │ Crash-Draft Sync     │  │ Codec & QR      │  │
│  └────────────┬────────────┘  └──────────┬───────────┘  └────────┬────────┘  │
└───────────────┼──────────────────────────┼───────────────────────┼───────────┘
                │                          ▼                       │
┌───────────────┴──────────────────────────────────────────────────┴───────────┐
│                     Reactive Studio Preferences Store                        │
│        (useSyncExternalStore: Theme, Zoom, Input Mode, Audio & HUD)          │
└───────────────┬──────────────────────────────────────────────────┬───────────┘
                ▼                                                  ▼
┌──────────────────────────────────────┐  ┌────────────────────────────────────┐
│     Presentation & Canvas Layer      │  │   Pure Domain & Audio Engines      │
│                                      │  │                                    │
│  ┌────────────────────────────────┐  │  │  ┌──────────────────────────────┐  │
│  │ Master Transport Header        │  │  │  │ Unified Score Command Layer  │  │
│  │  ├─ Transport & Tempo Controls │  │  │  │  ├─ Note & Rhythm Mutations  │  │
│  │  ├─ SoundFont & Instrument Menu│  │  │  │  ├─ Measure & Barline Ops    │  │
│  │  └─ Score Actions & Save Menu  │  │  │  │  ├─ Lyric Shift/Spread Ops   │  │
│  └────────────────────────────────┘  │  │  │  └─ A-B Range & Clipboard    │  │
│                                      │  │  └──────────────┬───────────────┘  │
│  ┌────────────────────────────────┐  │  │                 ▼                  │
│  │ Modular WYSIWYG Score Canvas   │◄─┼──┤  ┌──────────────────────────────┐  │
│  │  ├─ Song Metadata Header       │  │  │  │ Music, Engraving & Taigi Lib │  │
│  │  ├─ Section Navigation Rail    │  │  │  │  ├─ Jianpu System Engraver   │  │
│  │  ├─ Memoized System & Bar Rows │  │  │  │  ├─ Pitch, Key & Chord Math  │  │
│  │  │   ├─ Pitch & Beam Column    │  │  │  │  ├─ Taigi POJ/Hàn-lô Parser  │  │
│  │  │   └─ Locked-Width Lyric Cell│  │  │  │  └─ Beat Budget & Auto-Wrap  │  │
│  │  └─ Isolated Score Overlays    │  │  │  └──────────────┬───────────────┘  │
│  │      ├─ Chord & Section Popover│  │  │                 ▼                  │
│  │      └─ Bilingual Lyric Spread │  │  │  ┌──────────────────────────────┐  │
│  └────────────────────────────────┘  │  │  │ Modular Web Audio Subsystem  │  │
│                                      │  │  │  ├─ Lookahead Beat Scheduler │  │
│  ┌────────────────────────────────┐  │  │  │  ├─ Procedural Voice Graphs  │  │
│  │ Bottom Studio Control Deck     │  │  │  │  ├─ Accompaniment Arranger   │  │
│  │  ├─ Contextual Edit Deck       │  │  │  │  └─ Sampled SoundFont Engine │  │
│  │  └─ Floating Score HUD Drawers │  │  │  └──────────────────────────────┘  │
│  │      (QuickPad | Piano |       │  │  │                                    │
│  │       Ornaments | Chords |     │  │  │                                    │
│  │       Creativity Motif Studio) │  │  │                                    │
│  └────────────────────────────────┘  │  └────────────────────────────────────┘
└──────────────────────────────────────┘
```

- **Data Model & State**:
  - **Immutable Score State (`Song`)**: Managed through `useSongHistory` with deterministic `[measureIndex, noteIndex]` cursor snapshots for undo/redo and coalesced rapid typing.
  - **Selection & Input Target State**: Encapsulated in a dedicated selection controller (`selectedMeasureIndex`, `selectedNoteIndex`, `activeField: 'pitch' | 'lyric'`, `activeVerseRow: 1..5`, `activeLyricSubfield: 'hanlo' | 'poj'`, `editTarget: 'measure' | 'note' | 'syllable'`).
  - **Reactive Studio Preferences**: Central key-value schema in the storage layer subscribed via `useSyncExternalStore` so any component reading theme, zoom, note-input mode, accompaniment style, or virtual keyboard state updates atomically without prop drilling.
- **Interactive Component & State Mapping**:
  1. **Phase A — Domain Library Modularization (Zero Breaking API Changes)**:
     - Extract pitch/chord frequency math, Taigi POJ/Hàn-lô syllable tokenization, rhythm beat-budget analysis, and measure auto-wrapping into focused sub-modules while keeping all existing exports intact for backwards compatibility.
     - Consolidate all note, measure, and lyric mutation handlers into the unified Score Command Layer so UI components no longer perform manual measure/note array cloning.
  2. **Phase B — Web Audio Engine Decomposition**:
     - Extract procedural instrument voice synthesis graphs, periodic vocal formants, and accompaniment pattern builders into dedicated audio modules consumed by the `AudioEngine` coordinator class.
     - Ensure strict WebKit/iPadOS `AudioNode` lifecycle cleanup and deterministic timer cancellation on stop/pause/unmount.
  3. **Phase C — Score Canvas & HUD Component Decomposition**:
     - Extract `ChordPickerPopover`, `SectionBadgePopover`, and `InlineLyricSpreaderModal` out of the Score Canvas into dedicated overlay components.
     - Extract memoized `EngravedSystemRow`, `EngravedMeasureCard`, and `NoteAndLyricColumn` components so cursor changes and playback ticks only re-render the affected measure.
     - Decompose the Floating Score HUD into modular drawer panels (`TactileQuickPadPanel`, `OrnamentsDrawerPanel`, `ChordsAndBackingDrawerPanel`, `CreativityMotifDrawerPanel`) and unify prop interfaces with the Contextual Edit Deck.
  4. **Phase D — Verification & Regression Suite**:
     - Run the full automated test suite (`npm test`), TypeScript typechecker (`npm run typecheck`), linter (`npm run lint`), and production build (`npm run build`) to guarantee zero regressions across all 24 test specifications.
