# UI Refactoring & Viewport-Maximized Editorial Studio Plan

This plan refactors the entire user interface of the Taiwanese Numbered Notation (Jianpu) Composition Studio to maximize vertical and horizontal space for notes and lyrics at all times, eliminate redundant stacked toolbars, streamline the composition workflow with a single-row bottom dock and on-demand drawers, and elevate the visual design into a **Refined Editorial Studio** aesthetic.

### User Review & Critical Decisions

> [!IMPORTANT]
> The architectural and design choices below directly incorporate your confirmed preferences from Phase 1. No source code has been modified yet; once you approve this plan, we will implement and verify the complete UI refactoring.

- **Confirmed Decision 1 — Single Slim Top Bar + Interactive On-Sheet Header**: Collapse the four currently stacked top toolbars (Master Header, Song Metadata Card, Section Navigation Rail,Score Studio Deck, and Sheet Top Action Bar) into **one ultra-slim 44px Master Studio Bar** at the top of the screen, while making all musical metadata (Title, Subtitle, Credits, Key `1=C`, Meter `4/4`, Tempo `♩=88`, Lyric Display Mode, and Section Jumps) directly interactive on the sheet header and compact header popovers.
- **Confirmed Decision 2 — Single-Row Bottom Dock with On-Demand Drawers Only**: Refactor the bottom Floating Score HUD into a sleek, non-wrapping **single-row bottom dock** (`≤ 52px` height) and **stop auto-opening the Contextual Edit Deck on every measure or note click**. All advanced panels (`Edit Suite`, `Piano`, `Quick-Pad`, `Chords`, `Ornaments`, `Creativity`, and `A-B Loop`) open strictly when explicitly toggled and dismiss cleanly on `Esc` or outside click.
- **Confirmed Decision 3 — Refined Editorial Studio Aesthetic**: Pair a warm, high-contrast archival manuscript paper canvas (`#FCFAF6` in Light Parchment mode; `#13161F` in Dark Stage mode) with crisp, understated dark studio chrome, tabular numerals (`tabular-nums`), unboxed editorial metadata with `·` separators, and zero visual clutter.

---

### 1. Overview & Core Concept

- **What It Does**:
  Reclaims **over 180px–240px of vertical viewport height** previously consumed by four redundant top bars and auto-popping bottom decks so the musical score (numbered notation digits, rhythm beams, chords, and multi-verse Hàn-lô / POJ lyrics) commands **85%+ of the screen** at all times on both desktop and iPad/mobile viewports.
- **Target Audience / Persona**:
  Songwriters, choir directors, music educators, and performers reading or editing numbered musical notation and bilingual lyrics who need maximum score legibility, zero unexpected layout shifts when clicking notes, and effortless 1-tap access to playback and editing tools.
- **Key Value**:
  - **Maximized Score Viewport**: Eliminates toolbar stacking above the sheet paper so the engraved score starts immediately below the 44px top bar.
  - **Zero Surprise Popups on Note/Bar Click**: Clicking a note or measure selects it and plays its audio preview without popping open a giant editing deck that covers the bottom systems of the sheet.
  - **Streamlined Single-Row Workflows**: Every everyday action (Play/Pause, Undo/Redo, Note vs. Lyric mode, Pitch `1–7`/`0`/`-`, Duration, and Drawer toggles) lives in a clean, scannable single-row bottom dock.

---

### 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Immediate Score Immersion (Top-of-Viewport Presence)**:
     - Upon opening the app, the user sees the **44px Master Studio Bar** at the top and the **Engraved Manuscript Sheet** immediately beneath it—no intermediate metadata cards, duplicate undo/redo bars, or redundant canvas action strips pushing the music down.
  2. **Direct On-Sheet Header Editing & Quick Section Jump**:
     - Clicking the song title, subtitle, lyricist/composer credits, Key (`1 = C`), Time Signature (`4/4`), or Tempo (`♩ = 88`) directly on the manuscript header opens a crisp inline popover or modal to adjust key (with optional auto-transpose), meter (with smart re-bar), or tap tempo.
     - A compact **Section Pill / Jump Menu** integrated into the top bar and sheet header lets users jump to any song section (`Intro`, `Verse`, `Chorus`) or set an A-B loop without permanently occupying a full horizontal rail when not needed (or rendering as a subtle, ultra-slim inline breadcrumb inside the sheet header).
  3. **Calm, Predictable Note & Lyric Selection**:
     - Clicking any note digit selects it in **Notes Mode** with a crisp amber focus ring and plays its tone preview.
     - Clicking any lyric syllable selects it in **Lyrics Mode** with an emerald/amber highlight for immediate typing or syllable navigation (`←` / `→` / `Tab`), without triggering unrequested drawers.
  4. **Single-Row Bottom Dock & Mutually Exclusive On-Demand Drawers**:
     - The bottom dock stays on a **single compact row** containing:
       - **Left Zone**: Play/Stop From Cursor (`Space`), Undo / Redo, and Mode Switcher (`Notes` | `Lyrics` + active Verse pill).
       - **Center Zone (Context-Aware)**:
         - *In Notes Mode*: Streamlined Pitch buttons (`1–7`, `0`, `-`), Octave (`8vb` / `8va`), Duration (`1`, `1/2`, `1/4`, `2`, `• Dot`), and Accidentals (`♯` / `♭`), plus `+ Note` / `+ Bar`.
         - *In Lyrics Mode*: Active Verse selector (`v1..v5`, `+`), Lyric Display Format switcher (`POJ / Hàn`, `Hàn / POJ`, `Hàn-lô`, `POJ`), `← Prev` / `Next →` note steppers, and `Spread Lyrics` / `Align Lyrics`.
       - **Right Zone (On-Demand Studio Drawers & View Controls)**: Mutually exclusive drawer triggers (`Piano`, `Quick-Pad`, `Edit Suite`, `Chords`, `Ornaments`, `Creativity`, `A-B`) and a compact View/Page cluster (`Zoom -/100%/+`, `Wrap Mode`, `Portrait/Landscape`, `Light/Dark Paper`, `Print`).
- **Visual Identity & Theme (Refined Editorial Studio)**:
  - *Aesthetic Direction*: Warm publication-grade sheet music engraving framed by quiet, precision-engineered dark studio chrome.
  - *Color Palette & 60-30-10 Distribution*:
    - **60% Dominant Score Canvas**: Warm ivory manuscript paper (`#FCFAF6` with `#18181B` ink in Light mode) or deep midnight manuscript (`#13161F` with `#F4F4F5` ink in Dark Stage mode), surrounded by a quiet studio desk backdrop (`#EDE8DF` light / `#0A0C10` dark).
    - **30% Structural Chrome**: Crisp slate/zinc glassmorphic bars (`bg-zinc-900/95 text-zinc-100 border-zinc-800` or clean daylight surface) with `1px` hairline dividers (`border-zinc-200/80 dark:border-zinc-800/90`).
    - **10% High-Intent Accent Budget**: Warm Amber (`#F59E0B`) reserved strictly for active cursor selection, primary transport state, and active drawer indicators; Teal/Emerald (`#0F766E` / `#10B981`) for italicized POJ romanization and lyric focus; Rose (`#E11D48`) strictly for rhythm beat-budget warnings and delete actions.
  - *Typography & Hierarchy*:
    - **Sheet Title & Credits**: Editorial serif (`Playfair Display` / `Noto Serif TC` / system serif) with balanced letter-spacing and unboxed metadata separated by `·`.
    - **POJ Romanization**: High-contrast italicized serif for clear visual distinction from Hàn-lô characters.
    - **Musical Digits, Bar Numbers & Telemetry**: Strict `font-mono tabular-nums` so pitch numbers, beat counts, and BPM values align with zero horizontal jitter.
- **Interactive Feedback & Motion**:
  - Instant (`≤ 150ms`) drawer slide/fade transitions using compositor-only properties (`transform`, `opacity`).
  - Aggregate sticky chrome height (Top Bar + Bottom Single-Row Dock) stays strictly under **12%–15% of the viewport height**, leaving the maximum possible vertical safe zone for multi-system score reading and editing.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Eliminate Redundant Top Bars While Preserving All Controls & Test IDs**
  - *Chosen Approach*: Consolidate the Song Selector, New/Import, Play/Pause, Instrument Selector, Save, Undo/Redo, Lyric Search (`⌘K`), Share, and Studio Settings into the single 44px `HeaderBar`. Move `Align Lyrics`, `Auto Chords`, `Find in Score (⌘F)`, `Section Jump`, and `Sheet View/Print` into accessible, non-duplicative slots in the Top Bar, On-Sheet Header, and Bottom Dock while preserving essential DOM IDs for automated test compatibility.
  - *Why*: Previously, four separate horizontal bars stacked above the sheet paper, repeating Undo/Redo, Key/BPM, and Wrap/Orientation/Print controls up to three times each and pushing the first line of music far down the screen.
  - *Alternatives Considered*: Auto-hiding toolbars on scroll was passed over as the primary mechanism because users editing notes near the top of the score still experienced toolbar clutter; permanent consolidation solves the root cause at all scroll positions.
- **Decision 2: Make `ContextualEditDeck` Strictly On-Demand Instead of Auto-Opening on Click**
  - *Chosen Approach*: Remove `setIsContextualEditActive(true)` from measure and note click handlers on the sheet canvas. Instead, clicking a measure or note simply selects it (updating the cursor and bottom dock target readout `Bar #M · Note #N`), while the full `ContextualEditDeck` (with batch range sliders, bar splitting/merging, and syllable shifting) opens only when the user clicks the **Edit Suite** button in the bottom dock (or presses a dedicated shortcut).
  - *Why*: Auto-opening a 180px-tall contextual deck on every click caused severe viewport jumping and obscured the lower half of the score whenever a user clicked a note just to change its pitch or type a lyric.
  - *Alternatives Considered*: Keeping `ContextualEditDeck` always open in a minimized bar still added an unnecessary second row to the bottom HUD.
- **Decision 3: Integrate Compact Paper & Layout Controls Directly into the Sheet Header & Bottom Dock**
  - *Chosen Approach*: Remove the separate floating `#sheet-top-action-bar` above the paper and place the compact **Section Breadcrumb Jumps** and **Page View Controls** (Light/Dark Sheet, Portrait/Landscape, Wrap Mode, Lyric Format, Print) cleanly in the right-hand utility cluster of the on-sheet header (hidden on print via `print:hidden`) and in the bottom dock.
  - *Why*: Eliminates the extra 42px margin bar above the manuscript paper so the top edge of the sheet sits flush beneath the master header bar.

---

### 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Viewport & Component Hierarchy Diagram**:

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ 1. SLIM MASTER STUDIO BAR (44px Sticky Top — print:hidden)                   │
│  [Brand + Song Picker + New]  │  [Play · Instrument · Metro]  │  [Save · ⌘K  │
│  [Section Jump · Song Specs]  │  [Undo / Redo · Find ⌘F]      │   Share · ⚙] │
├──────────────────────────────────────────────────────────────────────────────┤
│ 2. MAXIMIZED SCORE VIEWPORT (85%+ of Screen Height — Flush Top Margin)       │
│  ┌────────────────────────────────────────────────────────────────────────┐  │
│  │ MANUSCRIPT SHEET HEADER (Interactive In-Place + print:hidden Utilities)│  │
│  │  Catalog ID · [Sections Jump]     SONG TITLE     [Lyric Mode · Align]  │  │
│  │  [1 = C ▾]  [4/4 ▾]  [♩ = 88 ▾]     Subtitle     [Wrap · Orient · 🖨]  │  │
│  ├────────────────────────────────────────────────────────────────────────┤  │
│  │ ENGRAVED SYSTEMS & MEASURES (Full Viewport Safe Zone)                  │  │
│  │  ┌──────────────────┬──────────────────┬──────────────────┬─────────┐  │  │
│  │  │ Bar 1  [C]  ●●●● │ Bar 2  [G7] ●●●● │ Bar 3  [Am] ●●●● │ Bar 4   │  │  │
│  │  │  1   2   3   5   │  6   5   3   2   │  1   -   2   3   │  2  - - │  │  │
│  │  │  Chhun-hong吹來  │  花   開   滿   山 │  心   內   思   慕 │  你     │  │  │
│  │  └──────────────────┴──────────────────┴──────────────────┴─────────┘  │  │
│  └────────────────────────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────────────────────────┤
│ 3. ON-DEMAND DRAWER SLOT (Opens ONLY when explicitly toggled — 0px default)  │
│  [ Piano Bed | Quick-Pad | Edit Suite Deck | Chords | Ornaments | A-B Loop ] │
├──────────────────────────────────────────────────────────────────────────────┤
│ 4. SINGLE-ROW BOTTOM DOCK (48px Fixed Bottom — Ergonomic Thumb & Key Zone)   │
│  [▶ Play] [↶ ↷] [Notes|Lyrics] │ [1..7 0 - | 8va | 1 ½ ¼ • ♯♭] │ [Drawers ▾]│
└──────────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - **Active Selection State**: Clicking a measure or note updates `selectedCoord: [measureIndex, noteIndex]` and `contextualEditTarget: 'measure' | 'note' | 'syllable'`, keeping the target synchronized if the user *already* has the `Edit Suite` drawer open, but **never** forcing `isContextualEditActive = true` automatically on click.
  - **Mutually Exclusive Drawer Controller**: Unifies `activeHudDrawer` (`'none' | 'piano' | 'quickpad' | 'edit' | 'chords' | 'ornaments' | 'creativity' | 'ab'`) so at most **one** bottom drawer is open at any time, preventing stacked multi-drawer collisions that block the score.
  - **Viewport Safe-Zone Auto-Scroll**: Updates `getVerticalSafeZone` / `scrollLineIntoSafeZone` metrics to reflect the slimmer 44px top header and 48px single-row bottom dock, maximizing the visible vertical window during playback and keyboard navigation.
- **Interactive Component & State Mapping**:
  1. **Top Chrome Consolidation**:
     - Streamline `HeaderBar` into a clean, high-density 44px bar with quick access to Song Library, New/Import, Play/Pause, Instrument, Metronome, Save, Undo/Redo, Global Search (`⌘K`), Share, and Studio Settings.
     - Collapse `SongMetadataHeader`, `SectionRail`, and `#score-studio-unified-deck` into a compact, collapsible or inline on-sheet header strip so zero extra card rows sit between `HeaderBar` and the manuscript paper by default, while keeping the Song Settings modal, Key/Time/BPM popovers, Lyric Aligner trigger, In-Song Find (`⌘F`), and Section jumps 1-click accessible.
  2. **On-Sheet Header & Canvas Cleanup**:
     - Merge `#sheet-top-action-bar` controls (Light/Dark sheet toggle, Portrait/Landscape toggle, Wrap mode cycle, Print button, and Section/Lyric mode pills) into a sleek, non-printing studio utility strip integrated at the top of the sheet stage, eliminating wasted vertical margins.
     - Ensure clicking any note or lyric cell focuses it cleanly without opening `ContextualEditDeck`.
  3. **Single-Row Bottom Dock (`FloatingScoreHud`)**:
     - Refactor the main HUD ribbon into a strict single-row horizontal layout (`flex-nowrap overflow-x-auto no-scrollbar`) with logical dividers, clear active indicators, and mutually exclusive drawer toggles (`Edit Suite`, `Piano`, `Quick-Pad`, `Chords`, `Ornaments`, `Creativity`, `A-B`).
     - Ensure `TactileQuickPad`, `ContextualEditDeck`, `AbTouchRibbon`, and `PianoKeyboard` render cleanly in the single on-demand drawer slot above the dock and can be closed with one tap (`×` or `Esc`).
