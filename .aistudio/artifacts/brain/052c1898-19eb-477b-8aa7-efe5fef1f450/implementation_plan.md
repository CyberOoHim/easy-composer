# Lyric Selection Stability & Contextual Edit Deck Consolidation

This plan resolves the half-transparent rendering and click-drift bugs on the inline floating lyric buttons (`TYPING` and `Spread`) by removing the overlapping inline popover from the sheet canvas, locking selected lyric cell dimensions to prevent mid-tap layout shifts, and promoting `Type / Kbd` and `Spread Lyrics` to primary thumb-zone controls in the bottom Contextual Edit Deck.

## User Review & Critical Decisions

> [!IMPORTANT]
> Both design decisions below were confirmed during interactive clarification and govern the scope of this fix.

- **Confirmed Decision 1 — Remove Inline Floating Pill & Use Bottom Contextual Edit Deck Only**: Eliminate the inline `TYPING` / `Spread` floating pill attached to selected lyrics on the score canvas and consolidate those actions into the bottom Contextual Edit Deck (`Lyric` tab) and HUD ribbon.
- **Confirmed Decision 2 — Lock Lyric Cell Width on Selection & Isolate Touch Events**: Maintain identical flex geometry between unselected `<span>` and selected `<input>` states, and isolate pointer/touch events so taps never shift cell widths or fall through to adjacent measures.

---

## 1. Overview & Core Concept

- **What It Does**:
  Provides rock-solid, drift-free lyric selection and editing across desktop, iPadOS Safari, and mobile browsers by eliminating stacking-context collisions on the sheet canvas and centralizing lyric input actions in the bottom studio deck.
- **Root Cause Diagnosis (Why It Happened)**:
  1. **CSS Stacking Context Bleed-Through ("Half-Transparent" Appearance)**:
     Every measure container uses CSS layout containment (`contain: layout`), which establishes an independent stacking context per measure without elevating the active system row's `z-index`. When selecting a lyric in the bottom verse of a system row (e.g., Bar 11, Verse 2), the inline floating pill (`top-full mt-1.5`) overflowed downward into the next system row (Bar 13). Because Bar 13 is painted later in DOM order inside its own stacking context, Bar 13's chord/measure header (`13 B`) and top border painted **on top of** Bar 11's floating buttons—making the buttons appear semi-transparent and visually occluded.
  2. **CSS `zoom` + `transform: scale()` Hit-Box Skew ("Drifted to Other Lyric Location")**:
     The sheet stage uses `transform: scale(...)` while individual lyric cells apply non-standard CSS `zoom: var(--lyric-zoom, 1)` (default `1.2`). Rendering an `absolute` child outside the bounds of a `zoom`-scaled container inside a `contain: layout` measure causes mobile/WebKit hit-testing (`elementFromPoint`) to miscalculate touch coordinates or hit the overlapping measure below (Bar 13), shifting the active selection to another measure or lyric when clicked.
  3. **Selection Width Clamping & Input Blur Viewport Jump**:
     Selecting a lyric dynamically applied a restrictive `maxWidth` only while `isSelectedLyric` was true, shifting flex sibling positions horizontally mid-tap. In addition, tapping action buttons without suppressing `mousedown` / `pointerdown` default focus transfer caused mobile browsers to blur the active `<input>` first, shifting the viewport as the software keyboard began dismissing before `click` resolved.
- **Target Audience / Persona**:
  Composers, arrangers, and lyricists editing multi-verse Taiwanese Hokkien (Hàn-lô & POJ) and multilingual numbered-notation scores on touchscreens (iPad / mobile) and desktop browsers.
- **Key Value**:
  Zero visual overlap with musical notation or measure headers below the active line, and 100% deterministic tap accuracy when selecting syllables, summoning the on-screen keyboard, or spreading lyrics.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Selecting a Lyric Syllable**: Tapping any lyric syllable highlights the cell in place with a crisp amber focus ring without changing the cell's width or shifting neighboring syllables. The bottom Contextual Edit Deck automatically switches to the `Lyric (vN)` tab.
  2. **Summoning or Dismissing the On-Screen Keyboard**: The user can either double-tap the lyric cell directly or tap the primary `Type / Kbd` (`Typing Active`) button at the leading edge of the bottom Contextual Edit Deck.
  3. **Spreading Lyrics**: Tapping `Spread Lyrics` or `Bar Lyrics` in the bottom Contextual Edit Deck opens the Bilingual Lyric Spreader modal immediately—even while the software keyboard is open—without losing or drifting the selected note/measure cursor.
- **Visual Identity & Theme**:
  - *Aesthetic Direction*: High-precision DAW Studio Console paired with publication-grade physical manuscript paper.
  - *Color Palette & Mood*: Deep studio slate (`#141820`) and warm parchment (`#FCFAF6`) surfaces, high-contrast amber (`amber-500`) focus indicators for active note/Han-lô targets, and emerald (`emerald-500`) active state for live typing and POJ subfields.
  - *Typography & Hierarchy*: Crisp serif italics for POJ romanization, bold sans/serif for Hàn-lô characters, and tabular monospace numerals (`tabular-nums`) for bar and note coordinates.
  - *Component Styling & Layout*: All primary action buttons in the bottom Contextual Edit Deck maintain a minimum `44px × 44px` touch hitbox in the natural bottom thumb zone, keeping the score canvas clean and unobstructed.
- **Interactive Feedback & Motion**:
  - Instant (<150ms) focus ring transitions on selected lyric cells.
  - Zero layout shift (`CLS = 0`) when toggling between static lyric display and inline `<input>` editing.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Removing the Inline Canvas Floating Pill in Favor of the Bottom Contextual Edit Deck**
  - *Chosen Approach*: Remove the `absolute top-full` floating pill from the lyric cell DOM and elevate `Type / Kbd`, `Spread Lyrics`, and `Bar Lyrics` to the primary leading slots of the `Lyric (vN)` tab in the bottom Contextual Edit Deck.
  - *Why*: An inline floating popover inside a dense multi-verse musical score inevitably covers either the notes above or the measure headers/chords of the system below, and suffers from CSS `zoom` + `contain: layout` hit-target bugs on WebKit. The bottom Contextual Edit Deck is already persistent in the bottom thumb zone and immune to canvas zoom transforms.
  - *Alternatives Considered*: Rendering the pill via a React Portal at `document.body` with dynamic bounding-box tracking was considered, but it still obscures adjacent score measures and adds unnecessary visual clutter when the bottom deck is already visible.
- **Decision 2: Locking Lyric Cell Flex Geometry Across Selected and Unselected States**
  - *Chosen Approach*: Remove conditional `maxWidth` clamping on `isSelectedLyric` and keep identical `flex` and `minWidth` rules regardless of selection state, while isolating pointer/click propagation on the cell and its inner `<input>` elements.
  - *Why*: Ensures neighboring notes and syllables in the same measure never shift horizontally when a user taps a lyric to edit it.
  - *Alternatives Considered*: Allowing the selected input to auto-expand on focus was rejected because expanding a single note's lyric cell shifts all other notes in the measure out of vertical alignment with their musical pitches.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

- **Architecture & Component Diagram**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         Score Studio Workspace                          │
│                                                                         │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │                Physical Sheet Paper Stage (Scaled)                │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ System Row -> Measure Container                             │  │  │
│  │  │  ├─ Top Header: Bar #, Volta, Chord, Beat Budget, Section   │  │  │
│  │  │  ├─ Notation Row: Pitches, Beams, Octaves, Caret            │  │  │
│  │  │  └─ Multi-Verse Lyric Rows (v1..v5)                         │  │  │
│  │  │      └─ Lyric Cell (Locked Flex Width, No Inline Popover)   │  │  │
│  │  │          ├─ Unselected: <span> (POJ / Hàn-lô)               │  │  │
│  │  │          └─ Selected:   <input> (Isolated Click/Pointer)    │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └─────────────────────────────────┬─────────────────────────────────┘  │
│                                    │ Selection & Focus State            │
│                                    ▼                                    │
│  ┌───────────────────────────────────────────────────────────────────┐  │
│  │             Bottom Floating Score HUD & Contextual Deck           │  │
│  │                                                                   │  │
│  │  ┌─────────────────────────────────────────────────────────────┐  │  │
│  │  │ Contextual Edit Deck (Synced Target: Bar | Note | Lyric vN) │  │  │
│  │  │  └─ Lyric (vN) Primary Actions (Leading Thumb-Zone Slots):  │  │  │
│  │  │      1. [Type / Kbd] (Focuses active lyric input, no blur)   │  │  │
│  │  │      2. [Spread Lyrics] (Opens Spreader at cursor, no blur) │  │  │
│  │  │      3. [Bar Lyrics] (Opens Spreader for current bar)       │  │  │
│  │  │      4. [Shift ⇦ / ⇨] · [Push ⇨⇨ / Pull ⇦⇦] · [Punctuation] │  │  │
│  │  └─────────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

- **Data Model & State**:
  - `activeField` (`'pitch' | 'lyric'`), `activeVerseRow` (`1..5`), and `activeLyricSubfield` (`'hanlo' | 'poj'`) track the exact lyric input target.
  - `contextualEditTarget` (`'measure' | 'note' | 'syllable'`) in the bottom deck stays bi-directionally synchronized with `activeField` so switching to `Lyric (vN)` in the bottom deck also activates the lyric cell on the sheet canvas.
  - `isSoftKeyboardExplicitlyActive` and `isVirtualKeyboardEnabled` govern whether the inline `<input>` uses `inputMode="text"` and receives focus.
- **Interactive Component & State Mapping**:
  1. **Clean Lyric Cell Rendering & Width Lock**:
     - Remove the inline floating `div` containing the `Typing` and `Spread` buttons from the selected lyric cell.
     - Remove `maxWidth: isSelectedLyric ? ... : undefined` from the lyric cell style object so its flex box width remains identical before and after selection.
     - Add `onClick={e => e.stopPropagation()}` and `onDoubleClick={e => e.stopPropagation()}` on the inline lyric `<input>` elements so taps inside a focused input never re-trigger parent cell/measure handlers.
     - Bind `activeNoteElementRef` to the selected lyric cell when `activeField === 'lyric'` so keyboard navigation and auto-scroll keep the active lyric row in the safe viewport zone.
  2. **Contextual Edit Deck Ergonomics & Focus Preservation**:
     - Reorder the single-mode `syllable` (`Lyric (vN)`) toolbar in the Contextual Edit Deck so `Type / Kbd`, `Spread Lyrics`, and `Bar Lyrics` appear first on the left—immediately visible on compact/iPad screens without horizontal scrolling.
     - Add `onMouseDown={e => e.preventDefault()}` and `onPointerDown={e => e.preventDefault()}` to action buttons (`Type / Kbd`, `Spread Lyrics`, `Bar Lyrics`, syllable shift/push/pull, and punctuation buttons) so tapping them while typing on a mobile software keyboard does not blur the input and shift the viewport prior to click execution.
     - Synchronize tab switching in the Contextual Edit Deck (`onChangeEditTarget`) with `activeField` (`'lyric'` when selecting `syllable`, `'pitch'` when selecting `note` or `measure`) so the score cursor highlight always matches the active deck tab.
  3. **Automated Regression Tests**:
     - Add unit/integration assertions verifying that the inline floating pill is absent from the lyric cell markup, that selected lyric cells do not apply dynamic `maxWidth` clamping, and that the Contextual Edit Deck exposes `Type / Kbd` and `Spread Lyrics` with focus-preserving pointer handlers.
