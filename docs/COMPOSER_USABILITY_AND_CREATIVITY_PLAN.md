# Architecture & Implementation Plan: Usability & Creativity Enhancements

| Field | Specification |
| --- | --- |
| **Document Name** | Easy Composer Usability & Creativity Enhancement Plan |
| **Project Name** | Easy Composer (`taigi-composer`) |
| **Platform Target** | Dedicated iPad (iPadOS / WebKit Mobile Safari) & Modern Web |
| **Target Scope** | 1. **Usability & Ergonomics**: Measure Beat Budget Visualizer, Inline Lyric Distribute Tool, Tactile Quick-Pad (≥44px touch targets), and 100% Strict English UI Localization.<br>2. **Musical Creativity**: Chord Progression Presets, Melodic Motif Variations (Inversion, Retrograde, Sequence Shift, Folk Embellishment), Pentatonic Scale Filter, Accompaniment Styles (Ballad Arpeggios, Folk Pluck, Waltz), and Offline Melody Sparks. |
| **Language Policy** | **100% English UI text across all buttons, dialogs, menus, tooltips, and prompts. Song titles, lyrics, Han-Lo, and Pe̍h-ōe-jī (POJ) remain preserved in their authentic native language.** |
| **Backend Dependency** | **Zero Backend API Dependencies (100% Client-Side SPA / PWA execution).** |
| **Status** | Approved Architectural Plan |

---

## 1. Executive Summary & Philosophy

Easy Composer is designed as a physical-feeling, direct-on-sheet music score creation tool for numbered musical notation (簡譜 / Jianpu). Following the successful foundation of the Real-Sheet Canvas and continuous engraving engine, this plan addresses the two most critical drivers of user satisfaction and artistic productivity:

1. **Frictionless Usability & Rhythm Intuition**:
   - Eliminating the metric calculation burden by providing visual, real-time **Measure Beat Budget** feedback (`[●●●○] 3/4 beats`).
   - Removing tedious syllable-by-syllable lyric typing with a smart **Inline Lyric Distribute Tool** (pasting a line of text automatically parses and assigns Han-Lo or POJ syllables across consecutive notes).
   - Optimizing for iPad touch ergonomics with an accessible **Tactile Quick Touch Pad** featuring full Apple HIG ≥44×44px hit areas.
   - Standardizing every interface element to **100% English UI**.

2. **Inspiring Musical Creativity & Songwriting Assistance**:
   - Unlocking harmonic flow with a **Chord Progression Preset Library** (Pop Ballad, Taiwanese Folk Minor, 50s Doo-Wop, Pachelbel Canon, Blues/Folk cadences) that populates measure chords in one tap.
   - Breaking writer's block with **Melodic Motif Transformations** (**Inversion**, **Retrograde**, **Scale-Degree Sequence Shift**, and **Folk Grace-Note Embellishments**).
   - Guaranteeing harmonious melodies with a **Pentatonic & Folk Mode Filter** (`1 2 3 5 6` / `6 1 2 3 5`), eliminating "wrong notes" for novice composers.
   - Energizing playback with multiple **Accompaniment Styles** (**Ballad Arpeggios**, **Folk Guitar Plucking**, and **Waltz 3/4 Patterns**).
   - Providing an offline, client-side **Melody Spark Generator** for instant phrase inspiration.

---

## 2. User Review Required

> [!IMPORTANT]
> - **Strictly Sheet-Centric Architecture**: All composition, editing, playback, and creative features must strictly be built directly around the realistic sheet score canvas (WYSIWYG on-paper experience; no detached DAW windowing or fragmented card deck chrome).
> - **Pure Client-Side Execution**: All melodic variation and chord generation algorithms run 100% locally in the browser with zero backend API or network dependency, maintaining full offline PWA support on iPad.
> - **Strict 100% English UI Policy**: UI labels, dialogs, and tooltips will be standardized to English. Songs themselves (lyrics, titles, Han-Lo, POJ) remain preserved in their authentic native language.
> - **Full Backward Compatibility**: No breaking changes to existing songs, presets, or IndexedDB storage formats.

---

## 3. System Architecture

```mermaid
graph TD
    subgraph UI & Score Workspace
        RSC[RealSheetCanvas] --> BeatBudget[Measure Beat Budget Visualizer]
        RSC --> LyricSpreader[Inline Lyric Distribute Tool]
        FSH[FloatingScoreHud] --> QuickPad[Tactile Touch Quick-Pad >=44px]
        FSH --> CreatDrawer[Creativity Studio Drawer]
    end

    subgraph Creativity Engine (lib/creativityEngine.ts)
        CreatDrawer --> ChProg[Chord Progression Presets]
        CreatDrawer --> MotifVar[Motif Variations: Inversion / Retrograde / Shift]
        CreatDrawer --> PentaMode[Pentatonic & Folk Mode Filter]
        CreatDrawer --> MelGen[Algorithmic Melody Spark Generator]
    end

    subgraph Audio & Rhythm Engines
        AudioEng[lib/audioEngine.ts] --> AccompStyles[Accompaniment: Arpeggio / Folk Pluck / Waltz]
        TaigiUtils[lib/taigiUtils.ts] --> BeatHelper[Rhythm Budget & Syllable Tokenizer]
    end
```

---

## 3. Detailed Component Specifications

### 3.1 Component 1: Creative Composition Engine (`lib/creativityEngine.ts`) [NEW]

A pure TypeScript, zero-dependency module handling harmonic theory and melodic transformations:

#### 1. Chord Progression Presets
```typescript
export interface ChordProgressionPreset {
  id: string;
  name: string;
  category: 'pop' | 'folk' | 'ballad' | 'classical';
  degrees: string[]; // e.g. ['I', 'V', 'vi', 'IV']
  description: string;
}

export const CHORD_PROGRESSION_PRESETS: ChordProgressionPreset[] = [
  {
    id: 'pop_ballad',
    name: 'Pop Ballad (I - V - vi - IV)',
    category: 'pop',
    degrees: ['I', 'V', 'vi', 'IV'],
    description: 'The iconic emotional progression used in countless hit songs.',
  },
  {
    id: 'taiwanese_folk_minor',
    name: 'Taiwanese Folk Minor (vi - ii - V - vi)',
    category: 'folk',
    degrees: ['vi', 'ii', 'V', 'vi'],
    description: 'Soulful, nostalgic minor cadence characteristic of Taiwanese folk melodies.',
  },
  {
    id: 'doo_wop',
    name: 'Classic 50s Doo-Wop (I - vi - IV - V)',
    category: 'ballad',
    degrees: ['I', 'vi', 'IV', 'V'],
    description: 'Timeless romantic chord sequence with smooth voice leading.',
  },
  {
    id: 'canon',
    name: 'Pachelbel Canon (I - V - vi - iii - IV - I - IV - V)',
    category: 'classical',
    degrees: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    description: 'Majestic classical sequence offering rich melodic variety.',
  },
  {
    id: 'pentatonic_blues',
    name: 'Folk Cadence (I - IV - I - V)',
    category: 'folk',
    degrees: ['I', 'IV', 'I', 'V'],
    description: 'Clean, open harmony ideal for pentatonic folk singing.',
  },
  {
    id: 'royal_road',
    name: 'Royal Road (IV - V - iii - vi)',
    category: 'pop',
    degrees: ['IV', 'V', 'iii', 'vi'],
    description: 'Modern lyrical progression with forward momentum.',
  },
];
```

#### 2. Degree-to-Chord Calculation
- `getDiatonicChordForDegree(key: KeySignature, degree: string): string`: Computes the exact chord name (e.g. key `G`, degree `vi` → `Em`; key `F`, degree `IV` → `Bb`).
- `applyChordProgression(song: Song, progressionId: string, startMeasureIdx: number): Song`: Maps the progression across consecutive measures.

#### 3. Melodic Motif Variations
- **`invertMotif(notes: NumberedNotationNote[], key: KeySignature): NumberedNotationNote[]`**:
  Calculates the pivot pitch from the first note and reflects subsequent scale degrees upside down (rising steps become falling steps).
- **`retrogradeMotif(notes: NumberedNotationNote[]): NumberedNotationNote[]`**:
  Reverses the sequence of pitches while preserving the rhythmic durations and metric structure.
- **`sequenceShiftMotif(notes: NumberedNotationNote[], stepDelta: number): NumberedNotationNote[]`**:
  Shifts scale degrees by `+1` or `-1` diatonic step (wrapping appropriately within octave boundaries), enabling call-and-response sequences.
- **`embellishWithFolkOrnaments(notes: NumberedNotationNote[]): NumberedNotationNote[]`**:
  Detects long held notes (duration ≥ 1 beat) and adorns them with authentic Taiwanese pentatonic grace notes (前倚音 / 後倚音) and smooth melisma slurs.

#### 4. Pentatonic & Folk Scale Modes
- Major Pentatonic: `{ 1: true, 2: true, 3: true, 5: true, 6: true }` (Scale degrees: Gong, Shang, Jiao, Zhi, Yu).
- Minor Pentatonic: `{ 6: true, 1: true, 2: true, 3: true, 5: true }` (La-based pentatonic).
- Filter helper: `isPitchInScale(pitch: PitchNumber, mode: 'pentatonic_major' | 'pentatonic_minor' | 'all'): boolean`.

#### 5. Offline Algorithmic Melody Spark
- `generateMelodySpark(chord: string, key: KeySignature, timeSignature: TimeSignature, style: 'folk' | 'ballad' | 'march'): NumberedNotationNote[]`:
  Places chord tones on downbeats and passing pentatonic tones on weak beats, generating a musically coherent 1-measure or 2-measure phrase with zero latency and zero network dependencies.

---

### 3.2 Component 2: Accompaniment Arpeggio & Styles (`lib/audioEngine.ts`) [MODIFY]

Enhance the Web Audio synthesis engine with selectable accompaniment grooves:
- Extend `AudioEngineOptions`:
  ```typescript
  export type AccompanimentStyle = 'block' | 'arpeggio' | 'folk' | 'waltz';
  ```
- **`block`**: Classic sustained triad chords on downbeats with gentle decay.
- **`arpeggio`**: Cascades triad frequencies across the measure (Root on beat 1, 5th on beat 2, Octave on beat 3, 10th/3rd on beat 4), creating a lush piano backing track.
- **`folk`**: Alternates deep bass root on beats 1 and 3 with light syncopated harmonic plucks on beats 2 and 4.
- **`waltz`**: In 3/4 meter, plays a deep bass root on beat 1 followed by crisp chord hits on beats 2 and 3.

---

### 3.3 Component 3: Measure Beat Budget & Lyric Spreader (`lib/taigiUtils.ts`) [MODIFY]

#### 1. Measure Beat Budget Calculation
```typescript
export interface MeasureBeatBudget {
  currentBeats: number;
  expectedBeats: number;
  remainingBeats: number;
  isFull: boolean;
  isDeficit: boolean;
  isOverbeat: boolean;
  beatProgressPercent: number;
  beatIndicators: ('filled' | 'empty' | 'partial')[];
}

export function getMeasureBeatBudget(measure: Measure, timeSignature: TimeSignature = '4/4'): MeasureBeatBudget {
  const expected = getExpectedBeatsPerMeasure(timeSignature);
  let current = 0;
  for (const n of measure.notes) {
    if (!isNonNotationItem(n) && n.duration > 0 && n.pitch !== 'empty') {
      current += n.duration;
    }
  }
  const remaining = Math.max(0, expected - current);
  // Beat-by-beat indicator array for visual UI
  const indicators: ('filled' | 'empty' | 'partial')[] = [];
  for (let i = 0; i < expected; i++) {
    if (current >= i + 1) indicators.push('filled');
    else if (current > i) indicators.push('partial');
    else indicators.push('empty');
  }
  return {
    currentBeats: Math.round(current * 1000) / 1000,
    expectedBeats: expected,
    remainingBeats: Math.round(remaining * 1000) / 1000,
    isFull: Math.abs(current - expected) < 0.001,
    isDeficit: current < expected - 0.001,
    isOverbeat: current > expected + 0.001,
    beatProgressPercent: Math.min(100, Math.round((current / expected) * 100)),
    beatIndicators: indicators,
  };
}
```

#### 2. Smart Inline Lyric Distribute Tool
```typescript
export function distributeLyricsAcrossNotes(
  rawText: string,
  song: Song,
  startMeasureIdx: number,
  startNoteIdx: number,
  verseIndex: number,
  field: 'hanlo' | 'poj' = 'hanlo'
): Song {
  // Tokenize text into words/syllables:
  // For Han-lo: character-by-character while grouping punctuation and hyphens
  // For POJ: whitespace and hyphen tokenization
  const tokens = tokenizeLyricText(rawText, field);
  // Iterate through notes starting at [startMeasureIdx, startNoteIdx],
  // applying each token to consecutive pitched/rest notes (skipping empty spacers).
  ...
}
```

---

### 3.4 Component 4: Creativity Studio & Tactile Touch Pad (`components/composer/FloatingScoreHud.tsx`) [MODIFY]

#### 1. Creativity Studio Drawer (`activeDrawer === 'creativity'`)
- Dedicated, sleek drawer accessible directly from the floating HUD:
  - **Chord Progressions**: Grid of one-tap progression presets with preview tags.
  - **Motif Tools**: Quick buttons for `Invert`, `Reverse (Retrograde)`, `Sequence +1`, `Sequence -1`, and `Folk Grace Notes`.
  - **Scale Filter**: Toggle button for `Pentatonic Guide (1 2 3 5 6)`.
  - **Melody Spark**: One-tap button to populate the current measure with an algorithmic motif based on its chord.
  - **Accompaniment Style Selector**: Toggle between `Block`, `Arpeggio`, `Folk Pluck`, and `Waltz`.

#### 2. Tactile Touch Quick-Pad (iPad Ergonomics)
- Collapsible, thumb-friendly numeric ribbon anchored at the bottom:
  - Large (≥44×44px hit areas) buttons: `1`, `2`, `3`, `4`, `5`, `6`, `7`, `0 (Rest)`, `- (Dash)`.
  - Octave buttons: `+8va` and `-8vb`.
  - Duration buttons: `x2 (Double)`, `/2 (Halve)`, `• (Dot)`.
  - Fast backspace and next/prev step buttons.

#### 3. Strict English UI Cleanup
- Purge all remaining Chinese terms from `FloatingScoreHud.tsx`:
  - `Replace (覆蓋)` → `Replace`
  - `Prog Replace (遞進覆蓋)` → `Prog Replace`
  - `Prog Insert (遞進插入)` → `Prog Insert`
  - `(前倚音)` → `(Pre-Grace)`
  - `(後倚音)` → `(Post-Grace)`
  - `(快捷鍵指南)` → `(Keyboard Shortcuts)`

---

### 3.5 Component 5: Measure Beat Budget Bar & Visual Caret (`components/composer/RealSheetCanvas.tsx`) [MODIFY]

- **Measure Beat Budget Visualizer**:
  - Renders directly above the active measure on the virtual score paper:
    - Visual dots representing beats: `● ● ● ○` (3 / 4 beats, 1 beat remaining).
    - Quick actions: `[Pad Rest]` (one-tap auto-fill deficit with rest note) and `[Split Evenly]`.
- **Inline "Distribute Lyrics" Action**:
  - Clicking on an active lyric syllable renders a quick "Paste Line" button to paste and distribute an entire lyric line across subsequent measures.
- **English UI Cleanup**:
  - Replace `Obbligato (和音)` with `Obbligato (Counter-Melody)`.

---

### 3.6 Component 6: English UI Standardization across All Dialogs (`components/*`) [MODIFY]

Update all auxiliary components to strictly use English UI text:
- `components/UiZoomControl.tsx`: Replace Chinese tooltips with English.
- `components/ScoreZoomControls.tsx`: Replace Chinese tooltips with English.
- `components/PwaManager.tsx`: Replace offline notices and installation prompts with English.
- `components/MetronomePlaybackControl.tsx`: Replace Chinese tooltips with English.
- `components/ChordPlaybackControl.tsx`: Replace Chinese tooltips with English.
- `components/HeaderBar.tsx`: Replace `window.confirm` dialogs with English.
- `components/composer/SongMetadataHeader.tsx`: Replace `window.confirm` dialogs and notices with English.
- `components/QuickLyricAlignerModal.tsx`: Replace button labels with English.
- `components/LyricSearchModal.tsx`: Replace search placeholders and action buttons with English.

---

## 4. Verification Plan

### Automated Tests
Run full automated test suite and type check:
```bash
npm run typecheck
npm run test
```

#### Test Suite: `test/creativityEngine.test.ts` [NEW]
1. **Chord Progressions**:
   - Diatonic chords match theoretical standards across all 12 key signatures (e.g. C, G, D, A, E, F, Bb, Eb, etc.).
   - Applying `pop_ballad` correctly sets chords on measures.
2. **Motif Variations**:
   - `invertMotif`: Inversion preserves metric duration sum and inverts direction of intervals.
   - `retrogradeMotif`: Notes are reversed accurately while maintaining duration consistency.
   - `sequenceShiftMotif`: Scale degrees step up/down by specified delta without pitch drift.
   - `embellishWithFolkOrnaments`: Adds valid pre-grace notes to sustained notes without altering beat budget.
3. **Measure Beat Budget**:
   - Correctly calculates remaining beats for 4/4, 3/4, 2/4, and 6/8 meters.
4. **Lyric Distribute**:
   - Distributes multiple syllables across measures and skips non-pitched tokens.
5. **Melody Spark**:
   - Generates notes with total duration exactly matching time signature.

### Manual Verification
1. **Touchpad & Usability**:
   - Verify on-screen Quick-Pad touch targets (≥44×44px) respond instantly to taps.
   - Verify Measure Beat Budget bar updates live as notes are entered, showing remaining beats.
   - Paste a sentence of lyrics using "Distribute Lyrics" and verify smooth mapping across notes.
2. **Creativity Studio**:
   - Open Creativity Studio, apply "Taiwanese Folk Minor" to a song, and verify chords populate cleanly.
   - Select a measure, click "Invert Motif", and listen to preview playback.
   - Toggle Accompaniment Style to "Arpeggio Ballad" and verify broken chord synthesis during playback.
   - Activate "Pentatonic Guide" and verify non-pentatonic scale degrees are dimmed or guided.
3. **Language Standards**:
   - Confirm 100% of UI buttons, dialogs, tooltips, and prompts are in English.
   - Confirm original Taiwanese Han-Lo and POJ lyrics remain 100% authentic and preserved.
