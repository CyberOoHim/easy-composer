# Measure Boundary & Barline Overflow Fix Plan

This plan eliminates note and lyric overflow across measure boundaries (barlines) across all sheet wrap modes (`No Wrap`, `Auto Wrap`, and `Auto Fix`) by aligning intrinsic DOM column widths, incorporating Note and Lyric Zoom multipliers into engraving width budgets, and replacing rigid fixed measure widths with content-adaptive minimum widths.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following architectural decisions were confirmed with your preferences and govern the fix across all sheet layout modes:

- **Confirmed Decision 1 (No Wrap Measure Expansion)**: Measures in **No Wrap** mode will dynamically expand to fit all notes, sustain dashes, POJ/Hàn-lô syllables, and multi-verse prefixes (`1.`, `2.`) so content never crosses the right barline into the next measure or outside the system.
- **Confirmed Decision 2 (Zoom-Aware Width & Line Wrapping)**: Engraving width calculations and system line-wrapping budgets in **Auto Wrap** and **Auto Fix** modes will dynamically scale with active **Note Zoom** and **Lyric Zoom** multipliers so zoomed lyrics and notes stay cleanly inside their measure boundaries.

---

## 1. Overview & Core Concept

- **What It Does**: Guarantees that every measure's right barline acts as a true visual and layout boundary containing all of its musical pitches, sustain dashes (`-`), and bilingual POJ / Hàn-lô lyrics without spilling into adjacent measures.
- **Root Causes Identified from Inspection**:
  1. **Rigid Fixed Measure Width in `No Wrap` Mode**: Measure containers currently set a hard `width: getNaturalMeasureWidth(engravedM)` while the barline is positioned with `absolute right-0`. Whenever the inner flex row of notes or zoomed lyrics exceeds that estimated number (such as 8 eighth-notes in Bar 7 and Bar 11, or 4 notes with sustained dash and multi-verse prefix in Bar 14 of *伊是咱的寶貝*), the inner flex row spills past `right: 0` directly across the barline.
  2. **Unaccounted Default Lyric Zoom (`1.2x`) & User Zoom**: CSS applies `zoom: var(--lyric-zoom)` (which defaults to `1.2x` at `100%` lyric zoom) to every lyric cell and `zoom: var(--note-zoom)` to every note cell, yet the engraver's width calculator computes raw unzoomed pixel estimates.
  3. **Mismatched Flex Basis & Verse Prefix Offset**: First-in-system measures with multiple verses include a `1.` / `2.` verse number prefix column and POJ word-end margins (`mr-1 sm:mr-1.5`) + right barline clearance that were not included in the measure's width budget, and `flex-basis: auto` on note vs. lyric cells caused column drift between the pitch row and lyric rows.
- **Key Value**: Clean, publication-grade numbered musical notation where every syllable and pitch sits centered in its column with generous breathing room before the barline.

---

## 2. User Experience & Visual Design

- **Key User Flows**:
  1. **Viewing Dense 8-Note Measures (e.g., Bars 7, 9, 11 of *伊是咱的寶貝*)**: All 8 pitches (`6 7 1 6 7 1 3 4`) and all 8 bilingual syllables (`Hō͘ i chi̍t phìⁿ seng tióng ê thó͘` / `予 伊 一 片 生 長 的 土`) remain strictly inside Bar 11's right barline before Bar 12 (`12 Bb7`) begins.
  2. **Viewing Measures with Sustain Dashes & Punctuation (e.g., Bar 14 `5 3 2 1-` / `lán khiā chò hóe,`)**: The trailing sustain dash `1-` and trailing syllable with comma `hóe, / 伙，` have dedicated right-side barline clearance and never touch or cross the right barline.
  3. **Adjusting Note Zoom & Lyric Zoom**: Increasing Lyric Zoom or Note Zoom automatically expands measure minimum widths in `No Wrap` mode and re-budgets system line breaks in `Auto Wrap` mode so no collision or barline overflow occurs.
- **Visual Identity & Spatial Math**:
  - *Aesthetic Direction*: High-contrast studio dark (`#13161F` sheet surface) and warm editorial parchment (`#FCFAF6`) with crisp hairline barlines (`1px` single, `1.5px + 3.5px` final/repeat).
  - *Column & Barline Spacing Math*:
    - Inner measure horizontal padding includes dedicated right barline clearance (`pl-1.5 pr-2.5 sm:pl-2 sm:pr-3`) so the final note/lyric column is separated from the right barline glyph by at least `8px–12px`.
    - First-in-system measures with multiple verses reserve exact synchronized width for the `1.` / `2.` verse index column across the obbligato row, pitch row, and verse rows.
    - Synchronized note-and-lyric column flex proportions (`flex-basis: 0px` with unified zoom-adjusted `minWidth` per note index) keep each note digit vertically locked above its corresponding POJ and Hàn-lô syllable.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Intrinsic `w-fit` / `minWidth` Expansion vs. Fixed `width` in No Wrap Mode**
  - *Chosen Approach*: Use `width: 'auto'` (`w-fit`) paired with a zoom-aware `minWidth: getNaturalMeasureWidth(engravedM)` and `flex: '0 0 auto'` on measure containers in `No Wrap` mode.
  - *Why*: Even if a font renders wider on a specific OS/browser or the user types an extra-long syllable, CSS flexbox will naturally expand the measure box so the `right-0` barline always moves outward with the content, making barline overflow physically impossible.
  - *Alternatives Considered*: Keeping a fixed pixel `width` and only increasing the multiplier—rejected because any unexpectedly wide glyph or high zoom level could still breach a static pixel cap.
- **Decision 2: Zoom-Scaled Engraving Metrics for Auto Wrap & Auto Fix**
  - *Chosen Approach*: Pass the active `noteZoom` and `lyricZoom` scale factors into the engraver's width calculation (`calculateNoteRequiredWidth`, `calculateMeasureRequiredWidth`, and `groupMeasuresIntoSystems`), and apply `min-w-fit` safety on note/lyric cells.
  - *Why*: Ensures `Auto Wrap` wraps lines earlier when lyrics or notes are zoomed up, and ensures `Auto Fix` allocates proportional flex space to dense measures relative to sparse measures on the same line.

---

## 4. Technical Architecture & Data Strategy *(Technical Reference)*

### Architecture & Layout Pipeline Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                        Score Zoom State Store                            │
│        noteZoom (0.7x–2.0x)  ·  lyricZoom (0.7x–1.8x × 1.2 base)         │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                   Numbered Notation Engraver Engine                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 1. calculateNoteRequiredWidth(note, { dashCount, noteZoom, ... })  │  │
│  │    - Pitch width: digit + accidentals + dots + dashes × noteZoom   │  │
│  │    - Lyric width: max(POJ + word-gap, Hàn-lô) × effectiveLyricZoom │  │
│  │    - Unified Column Width = max(scaledPitchWidth, scaledLyricWidth)│  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
│                                   ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 2. calculateMeasureRequiredWidth(measure, notes, ...)              │  │
│  │    - Sums unified note column widths                               │  │
│  │    - Adds multi-verse prefix width (1. / 2.) when applicable       │  │
│  │    - Adds header metadata floor (measure #, chord, section badge)  │  │
│  │    - Adds left/right barline clearance padding                     │  │
│  └────────────────────────────────┬───────────────────────────────────┘  │
│                                   ▼                                      │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ 3. groupMeasuresIntoSystems(measures, ..., zoomOptions)            │  │
│  │    - No Wrap: groups by phrase/delimiter, measures expand freely   │  │
│  │    - Auto Wrap: breaks lines before exceeding effective line width │  │
│  │    - Auto Fix: proportional measure flex weights by requiredWidth  │  │
│  └────────────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────┬─────────────────────────────────────┘
                                     │
                                     ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                      RealSheetCanvas Measure DOM                         │
│  ┌────────────────────────────────────────────────────────────────────┐  │
│  │ Measure Box (relative, pr-2.5 sm:pr-3 clearance before barline)    │  │
│  │  • No Wrap:   flex: 0 0 auto, width: auto, minWidth: naturalWidth  │  │
│  │  • Auto Wrap: flex: <requiredWidth> 1 <requiredWidth>px            │  │
│  │  • Auto Fix:  flex: <requiredWidth> 1 0% (proportional share)      │  │
│  │  ┌──────────────────────────────────────────────────────────────┐  │  │
│  │  │ Pitch Row:  [1. Spacer] [NoteCol 1] [NoteCol 2] ... [Note N] │  │  │
│  │  │ Verse 1:    [1. Label ] [LyricCol 1][LyricCol 2]... [Lyric N]│  │  │
│  │  │ Verse 2:    [2. Label ] [LyricCol 1][LyricCol 2]... [Lyric N]│  │  │
│  │  └──────────────────────────────────────────────────────────────┘  │  │
│  │                                                   │ Right Barline │  │
│  └───────────────────────────────────────────────────┴───────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
```

### Data Model & Layout Math Details

1. **Unified Note & Lyric Column Width (`calculateNoteRequiredWidth`)**:
   - Account for realistic typography metrics:
     - **Pitch layer**: Base digit (`20px–24px`), sustain dashes (`14px` per dash with `ml-0.5 tracking-wider`), accidentals (`8px`), dots (`6px`), grace notes (`10px` each), scaled by `noteZoom`.
     - **Lyric layer**: POJ character width (`8.2px` per character in italic serif + `6px` word-end boundary margin when not hyphen-connected) and Hàn-lô character width (`15px` per CJK character, `8px` for punctuation), scaled by `effectiveLyricZoom = lyricZoom * 1.2`.
     - **Cell padding**: Include horizontal cell padding and inter-column breathing margin (`+6px`) so adjacent syllables never touch.
2. **Complete Measure Width (`calculateMeasureRequiredWidth`)**:
   - Sum of all `noteWidths` in the measure.
   - Add multi-verse numbering column width (`24px * effectiveLyricZoom`) when the song has multiple verses.
   - Ensure the measure width is also at least as wide as its top header bar (measure number + chord symbol + beat budget dots + section badge) so short 1-note measures with long section badges (`過門 B (BRIDGE)` or `副歌 (CHORUS)`) never cramp.
   - Add horizontal measure padding and right-barline safety clearance (`32px`).
3. **DOM Containment & Synchronized Column Alignment (`RealSheetCanvas`)**:
   - In `No Wrap` mode, replace the rigid `width: ${getNaturalMeasureWidth(engravedM)}px` with `width: 'auto'` and `minWidth: ${getNaturalMeasureWidth(engravedM)}px` so the measure container always wraps around its widest child row.
   - In `Auto Fix` mode, weight each measure's flex grow factor by `engravedM.requiredWidth` (instead of uniform `flex: 1`) so an 8-note measure (like Bar 11) paired on the same line with a 1-note measure (like Bar 12) receives proportional horizontal width rather than splitting 50/50.
   - Add right-edge barline padding (`pr-2.5 sm:pr-3`) on the measure container so the last note and last lyric syllable always stop cleanly to the left of the barline.
   - Synchronize the unzoomed layout width of each note cell and lyric cell using unified column flex weights and compensated `minWidth` (`engNote.requiredWidth / zoomFactor`) so CSS `zoom` on child cells produces identical rendered column widths across the pitch row and all verse rows.
