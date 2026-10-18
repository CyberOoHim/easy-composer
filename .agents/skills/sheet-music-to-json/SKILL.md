---
name: "sheet-music-to-json"
description: >
  Converts musical scores and notations from user-provided sheet music images
  (PNG, JPG, WEBP) and PDF documents, AI Agent web search results (online 簡譜,
  lyrics, chords), Text-based Numbered Notation (.txt, .md), and Standard MIDI
  files (.mid, .midi) into standardized, production-ready Song JSON (strictly
  containing title, measures, and lyrics) qualified for direct import into the
  Taigi Composer / Karaoke application.
---

# Sheet Music & Score to JSON Conversion Skill

This skill enables agents and automated workflows to take musical scores from diverse input sources—whether from **user-provided visual scores (images, PDFs)**, **autonomous AI agent web searches (online 簡譜, lyrics, chords)**, **text-based numbered notation**, or **standard MIDI files**—and convert them into 100% compliant Song JSON for instant playback, rehearsal, karaoke stage rendering, and interactive editing in the Taigi Composer app.

> [!IMPORTANT]
> **Mandatory Output JSON Requirements**:
> Every generated or converted Song JSON **MUST** strictly contain:
> 1. **`id`**: URL-safe unique song slug string (`^[a-zA-Z0-9_-]+$`, e.g. `"bang-chhun-hong"`).
> 2. **`title`**: Non-empty song title string (e.g. `"望春風"`).
> 3. **`measures`**: Non-empty chronological array of measure objects with unique `id`s (`"m1"`, `"m2"`...).
> 4. **`notes`**: Notes within each measure with unique `id`s (`"n1_1"`, `"n1_2"`...), valid pitch degrees (`1–7`, `0`, or `'empty'`), and valid durations.
> 5. **`lyrics`**: Aligned lyrics for all vocal melody notes, including both `hanlo` (漢字/漢羅) and `poj` (白話字 with tone marks) in each note's `lyric` object (or multi-verse `lyricsByVerse`).
> 6. **Complete Transcription**: Transcribe the complete piece chronologically from beginning to end without omitting measures.
>
> Any output JSON lacking id, title, measures, or lyrics is incomplete and strictly invalid.

---

## 1. Quick Start

### Supported Input Modalities

1. **User-Provided Visual Sheet Music (Scanned Images & Multi-Page PDFs)**:
   - Formats: `.png`, `.jpg`, `.jpeg`, `.webp`, `.bmp`, `.pdf`
   - **Direct Agent Multimodal Inspection**: The Agent inspects user-uploaded scores or score photos directly using `view_file` and transcribes systems, measures, Numbered Notation pitch numbers, durations, ties/slurs, chords, and bilingual lyrics into Song JSON. Zero external API keys are required.

2. **AI Agent Web Search & Autonomous Research (`search_web`)**:
   - When the user requests a song by name (e.g. *"Create a sheet for 望春風 / 雨夜花"* or *"Find the notation for ...*") without providing a local score file:
   - **Targeted Queries**: The Agent searches for public-domain Numbered Notation (`"<Song Title> 簡譜"`, `"<Song Title> 歌譜"`, `"<Song Title> 旋律"`), official key signatures, meter, and authentic Taiwanese lyrics (`"<Song Title> 台語 歌詞 白話字"`).
   - **Synthesis & Verification**: The Agent synthesizes the retrieved melody, chords, structure, and authentic Han-lo + POJ tone marks into compliant Song JSON.

3. **Text-Based Numbered Notation with Lyrics (`.txt`, `.md`, `--text`, `stdin`)**:
   - **Canonical App Text Format**: Deterministic, offline, zero-cost parser (`convert-sheet.mjs`).
   - **Freeform / Markdown Notation**: Direct Agent parsing and alignment.

4. **Standard MIDI Files (`.mid`, `.midi`)**:
   - Deterministic offline extraction of note pitches, scale degrees (1–7), note durations, rests, tempo, time signature, markers, and embedded lyrics via `convert-sheet.mjs`.
   - Direct Agent lyric enrichment: The Agent directly adds authentic Taiwanese Pe̍h-ōe-jī (POJ) tone diacritics to lyrics without external API calls.

### CLI Usage Examples
```bash
# 1. Text-based numbered notation with lyrics (canonical format):
node .agents/skills/sheet-music-to-json/scripts/convert-sheet.mjs score.txt -o my_song.taigi.json

# Piped text from standard input:
cat score.txt | node .agents/skills/sheet-music-to-json/scripts/convert-sheet.mjs - -o my_song.taigi.json

# Direct command-line text string:
node .agents/skills/sheet-music-to-json/scripts/convert-sheet.mjs --text "Title: 望春風\nKey: F\n[Measure 1]\nNumbered Notation: 5 6 1 2\n漢羅: 獨 夜 無 伴"

# 2. Standard MIDI file conversion:
node .agents/skills/sheet-music-to-json/scripts/convert-sheet.mjs track.mid --auto-fix-rhythm -o song.taigi.json

# 3. Sanitize and balance draft Song JSON (e.g. created by Agent transcription):
node .agents/skills/sheet-music-to-json/scripts/convert-sheet.mjs draft.json --auto-fix-rhythm -o final.taigi.json

# 4. Validate output against the app schema and import test:
node .agents/skills/sheet-music-to-json/scripts/validate-song-json.mjs ./final.taigi.json
```

---

## 2. Input Formats & Grammar

### A. User-Provided Visual Scores (Images & Multi-Page PDFs)
When the user uploads or points to score files in the workspace:
1. **Multimodal Inspection**: Use `view_file` to read the image (`.png`, `.jpg`, `.webp`) or `.pdf`.
2. **Decode Score Elements**:
   - Title, subtitle, composer (曲), lyricist (詞), notator (制譜/記譜).
   - Key signature (`1 = F` $\rightarrow$ `"F"`), time signature (`4/4`, `3/4`, `2/4`, `6/8`), tempo BPM.
   - Systems, measures, barline types, repeats (`|:`, `:|`), volta brackets (`[1]`, `[2]`).
   - Melodic notes: pitch (`1–7`, `0`), octave (`-2..2`), duration, ties, slurs, grace notes.
   - Lyrics: align each syllable to its note in traditional `hanlo` and authentic `poj` with tone marks.
3. **Emit Song JSON**: Format directly conforming to the schema and validate using `validate-song-json.mjs`.

### B. AI Agent Web Search & Retrieval (Online 簡譜, Chords, and Lyrics)
When the user requests a song by name without providing an image (e.g. *"Transcribe 望春風"* or *"Find the score for 雨夜花"*):
1. **Targeted Web Searches (`search_web`)**:
   - Query for Numbered Notation: `"<Song Title> 簡譜"`, `"<Song Title> 歌譜"`, `"<Song Title> 數字譜"`
   - Query for Key & Meter: `"<Song Title> 簡譜 調號 拍號"` (e.g. 1=F 4/4)
   - Query for Taiwanese Hokkien Lyrics & POJ: `"<Song Title> 台語 歌詞 白話字"` or `"<Song Title> 漢羅 羅馬字"`
   - Query for Chords & Intro/Outro: `"<Song Title> 吉他譜 和弦"` or `"<Song Title> 前奏 簡譜"`
2. **Melody & Lyric Synthesis**:
   - Transcribe scale degree pitches (`1` to `7`), rests (`0`), and durations into measures.
   - Align lyrics: syllable-by-syllable into `{ "hanlo": "...", "poj": "..." }`.
   - Never approximate or omit measures—synthesize the complete arrangement from introduction (Prelude) to final cadence.
3. **Validation**: Always run `validate-song-json.mjs` on the generated song JSON.

### C. Text-Based Numbered Notation Format (Recommended for Manual Editing)
This human-readable text format can be edited in any text editor and parses deterministically without requiring an API key:

```text
Title: 望春風
Subtitle: Bāng Chhun-hong
Composer: 鄧雨賢
Lyricist: 李臨秋
Key: F
Time: 4/4
BPM: 80

[Measure 1] (Verse 1) Chord: F
Numbered Notation: 5_ 6_ 1 2_ 3_
羅馬字: To̍k iā bô phōaⁿ siú
漢羅: 獨 夜 無 伴 守

[Measure 2] Chord: F
Numbered Notation: 3- 2_ 1_
羅馬字: teng — ē
漢羅: 燈 — 下
```

**Notation Syntax**:
- `1` to `7`: Scale degrees (Do, Re, Mi, Fa, Sol, La, Ti).
- `0`: Rest (休止符).
- `.` or `'` suffix: Octave up (e.g. `1.` or `1'` = high Do).
- `,` suffix: Octave down (e.g. `5,` = low Sol).
- `_` suffix: 8th note (half beat).
- `__` suffix: 16th note (quarter beat).
- `-` suffix: Sustained beat extender (`1-` = 2 beats, `1--` = 3 beats, `1---` = 4 beats).
- `*` or `d` suffix: Dotted note (+50% duration, e.g. `5_*` = dotted 8th note).

### D. Standard MIDI Files (.mid)
The parser extracts:
- Track events, tempos (Set Tempo meta events), and time signatures.
- Channel 0..15 note events; computes scale degree relative to the song's key.
- Converts gap intervals between notes into explicit rest notes (`pitch: 0`).
- Captures track lyrics (meta 0x05) and markers (meta 0x06) and pairs them with notes.
- Use `--auto-fix-rhythm` to automatically pad any incomplete measure with rest notes.

---

## 3. The Target Song JSON Schema

### Mandatory Output Requirements

Every generated or converted Song JSON **MUST** contain the following components:

| Mandatory Field | Location in JSON | Type | Description & Enforcement |
| :--- | :--- | :--- | :--- |
| **`id`** | Root `data.id` | `string` (slug) | **Song Slug**: Must match `^[a-zA-Z0-9_-]+$` (e.g. `"bang-chhun-hong"`). Required by build validators. |
| **`title`** | Root `data.title` | `string` (non-empty) | **Song Title**: Must be present as a descriptive string (e.g. `"望春風"`). Output missing `title` will fail validation. |
| **`measures`** | Root `data.measures` | `Measure[]` (non-empty) | **Chronological Measures**: Array of measures. Each measure MUST have a unique `id` (e.g. `"m1"`, `"m2"`). |
| **`notes`** | `data.measures[].notes` | `Note[]` (non-empty) | **Melody Notes**: Each note MUST have a unique `id` across the song (e.g. `"n1_1"`), valid `pitch` (0–7 or `'empty'`), and valid `duration`. |
| **`lyrics`** | `data.measures[].notes[].lyric` | `LyricSyllable` | **Aligned Lyrics**: Sung notes must contain transcribed lyrics with both `hanlo` (漢字/漢羅) and `poj` (白話字 with tone marks) or multi-verse `lyricsByVerse`. Songs without lyrics cannot be performed in Karaoke mode. |
| **Complete Score** | Chronological | Entire song | **No Truncation**: Transcribe all measures from start to finish. Never use placeholder comments like `// ... remaining measures`. |

---

The application requires a JSON file adhering to the `Song` interface (`types/song.ts`):

```typescript
export interface Song {
  id: string;               // Unique song id (e.g. "song-1718000000000")
  title: string;            // Song title (e.g. "望春風")
  subtitle?: string;        // Subtitle (e.g. "Bāng Chhun-hong")
  composer?: string;        // Composer (e.g. "鄧雨賢")
  lyricist?: string;        // Lyricist (e.g. "李臨秋")
  notator?: string;         // Notator / Transcriber (e.g. "林清月")
  catalogNumber?: string;   // Catalog ID (e.g. "T-001")
  footnote?: string;        // Footnote notes
  orientation?: 'portrait' | 'landscape'; // Page layout orientation
  verseCount?: number;      // Number of verses (1..5)
  verseDisplayOption?: 'stacked' | 'tabs' | 'side_by_side';
  verseSettings?: Record<number, { label?: string; hanloColor?: string; pojColor?: string }>;
  key: KeySignature;        // 'C' | 'Db' | 'D' | 'Eb' | 'E' | 'F' | 'F#' | 'G' | 'Ab' | 'A' | 'Bb' | 'B'
  timeSignature: TimeSignature; // '4/4' | '3/4' | '2/4' | '6/8'
  bpm: number;              // Tempo (default: 80)
  notesPerLine?: number;    // Measures per row (default: 4 for portrait, 5 for landscape)
  description?: string;     // Notes, history, provenance
  measures: Measure[];      // Chronological array of measures
}
```

### Measure Structure
```typescript
export interface Measure {
  id: string;               // e.g. "m-1-abc"
  measureNumber: number;    // 1-based sequential index (1, 2, 3...)
  chord?: string;           // Primary harmonic chord (e.g. "F", "C7", "Am", "Dm", "Bb")
  chords?: string[];        // Multiple chords array within measure
  timeSignature?: string;   // Measure-level time signature change
  section?: string;         // Section tag (e.g. "前奏", "主歌 1-A", "副歌 A", "尾奏")
  barlineType?: 'single' | 'double' | 'end' | 'repeat_start' | 'repeat_end';
  voltaEnding?: number[];   // Volta repeat bracket endings e.g. [1] or [2] or [1, 2]
  isLineBreak?: boolean;    // Line/system break flag
  isPrelude?: boolean;      // True if instrumental prelude/interlude
  obbligatoText?: string;   // Quick text representation of counter-melody e.g. "0 56 53 21 6 5"
  notes: NumberedNotationNote[];      // Notes in this measure
}
```

### Numbered Notation Note Structure
```typescript
export interface NumberedNotationNote {
  id: string;               // Unique note id (e.g. "n-1-1")
  pitch: PitchNumber;       // 1-7 (scale degrees), 0 (rest), or 'empty' (spacer/pause)
  octave: number;           // -2 (double low), -1 (low), 0 (middle), 1 (high), 2 (double high)
  accidental?: '' | '#' | 'b';
  duration: number;         // In beats: 4 (whole), 2 (half), 1 (quarter), 0.5 (8th), 0.25 (16th)
  isDotted?: boolean;       // Display dot (+50% duration)
  isDoubleDotted?: boolean; // Display double dot (+75% duration)
  isTied?: boolean;         // Legacy tie indicator
  tieToNext?: boolean;      // Sustained tie to next note of identical pitch
  slurToNext?: boolean;     // Legato slur to next note across differing pitches
  isTriplet?: boolean;      // Note belongs to triplet grouping
  preGraceNotes?: GraceNote[];  // Pre-grace acciaccatura notes e.g. [{ pitch: 5, octave: 0 }]
  postGraceNotes?: GraceNote[]; // Post-grace notes
  instrument?: 'piano' | 'flute' | 'whistle' | 'guitar' | 'synth' | 'bell' | 'cello';
  articulation?: 'none' | 'staccato' | 'tenuto' | 'accent' | 'fermata' | 'portamento_up' | 'portamento_down';
  annotation?: string;      // Direction (e.g. "rit.", "合唱", "V")
  lyric: {
    hanlo?: string;         // Traditional Hanji or mixed Han-lo (e.g. "獨", "阮ê")
    poj?: string;           // Pe̍h-ōe-jī with tone marks (e.g. "To̍k", "gún ê")
    hanji?: string;
    tl?: string;
    custom?: string;
  };
  lyricsByVerse?: Record<number, {
    hanlo?: string;
    poj?: string;
    hanji?: string;
    tl?: string;
    custom?: string;
  }>;
}
```

---

## 4. Transcription Rules for Numbered Notation & Taiwanese Hokkien Music

### A. Numbered Notation (簡譜) Mapping
- `1` = Do, `2` = Re, `3` = Mi, `4` = Fa, `5` = Sol, `6` = La, `7` = Ti.
- `0` = Rest (休止符). Rests do not have lyrics (`lyric: {}`).
- `octave: 0` = Middle octave (numbers with no dots).
- `octave: 1` = High octave ($\dot{1}, \dot{5}$ - dot above).
- `octave: -1` = Low octave ($\d{5}, \d{6}$ - dot below).

### B. Duration Conversions (Quarter Note = 1 Beat)
- `5 - - -` $\rightarrow$ `duration: 4` (Whole note)
- `5 - -` $\rightarrow$ `duration: 3` (Dotted half note)
- `5 -` $\rightarrow$ `duration: 2` (Half note)
- `5·` $\rightarrow$ `duration: 1.5`, `isDotted: true` (Dotted quarter note)
- `5` $\rightarrow$ `duration: 1` (Quarter note)
- `5̲·` $\rightarrow$ `duration: 0.75`, `isDotted: true` (Dotted 8th note)
- `5̲` $\rightarrow$ `duration: 0.5` (8th note, 1 underline)
- `5̳` $\rightarrow$ `duration: 0.25` (16th note, 2 underlines)
- `5̲̳̲` $\rightarrow$ `duration: 0.125` (32nd note, 3 underlines)

### C. Rhythm Balancing (Crucial)
For every measure, sum all sounding note durations:
$$\sum \text{duration} = \text{Expected Beats per Measure}$$
- In `4/4`: 4 beats per measure.
- In `3/4`: 3 beats per measure.
- In `2/4`: 2 beats per measure.
- In `6/8`: 3 beats per measure.

Use `--auto-fix-rhythm` to automatically insert padding rests into any measure that falls short of the expected beats.

### D. Ties vs. Slurs & Melisma
- **Tie (`"tieToNext": true`)**: Connects two consecutive notes of the **same pitch and octave** (延音線). The pitch sustains across both notes. The second note gets empty lyric: `{ "hanlo": "", "poj": "" }`.
- **Slur (`"slurToNext": true`)**: Connects notes across **different pitches** for vocal phrasing (圓滑線 / 一字多音 melisma). Only the first note holds the syllable; subsequent notes under the slur get `{ "hanlo": "", "poj": "" }`.

### E. Lyrics Extraction (Taigi / Taiwanese Hokkien) - Mandatory
- **Lyrics are strictly mandatory in the output JSON**: Every vocal score must have complete lyrics transcribed and aligned with melody notes.
- Transcribe **both** `hanlo` (漢字/漢羅) and `poj` (白話字/Pe̍h-ōe-jī).
- Provide accurate `poj` (白話字) with official tone diacritics using authentic Taiwanese Hokkien linguistic knowledge, without calling external APIs.
- For notes that continue a sustained syllable under a tie or slur, set `lyric: { hanlo: "", "poj": "" }`.
- For multi-verse songs, use `lyricsByVerse`:
  ```json
  "lyricsByVerse": {
    "1": { "hanlo": "獨", "poj": "To̍k" },
    "2": { "hanlo": "想", "poj": "Siūⁿ" }
  }
  ```
- An output JSON lacking lyrics will fail validation checks.

### F. Verse & Phrase Segmentation for Karaoke Readability (Short While Meaningful)

In Karaoke Mode, lyrics are projected in prominent stage typography one active phrase at a time, accompanied by a preview of the upcoming next phrase and real-time bouncing ball tracking.

To deliver an optimal singing and reading experience, **the skill must split verses into short while meaningful musical phrases**:

1. **Target Phrase Length**:
   - **Ideal syllable count**: **4 to 8 sung syllables** per verse (e.g. 5-character 五言 or 7-character 七言 poetic lines in Taiwanese Hokkien songs).
   - **Ideal measure span**: **2 to 4 measures** per phrase.
   - **Anti-Pattern**: NEVER lump an entire multi-sentence stanza (8–16 measures or 15+ syllables) into a single continuous verse.

2. **Natural Phrasing Boundaries**:
   - Split at **syntactic and poetic clauses** (e.g. "獨夜無伴守燈下" is 1 verse; "清風對面吹" is the next verse).
   - Split at **melodic cadences, punctuation marks (，, 。)**, and **breath/rest points**.

3. **Encoding Phrase Breaks in Song JSON**:
   - **Newline on Concluding Syllable**: Append `\n` to the last syllable's `hanlo` and `poj` (e.g. `hanlo: "下\n", poj: "ē\n"`).
   - **Measure Line Break**: Set `"isLineBreak": true` on the measure that concludes the phrase.
   - **Informative Section Headers**: Subdivide sections into distinct phrase labels (e.g. `"section": "主歌 1-A"`, `"section": "主歌 1-B"`).

### G. Reference JSON Output Template

```json
{
  "id": "bang-chhun-hong",
  "title": "望春風",
  "subtitle": "Bāng Chhun-hong",
  "composer": "鄧雨賢",
  "lyricist": "李臨秋",
  "key": "F",
  "timeSignature": "4/4",
  "bpm": 88,
  "notesPerLine": 4,
  "orientation": "portrait",
  "verseCount": 2,
  "measures": [
    {
      "id": "m1",
      "measureNumber": 1,
      "chord": "F",
      "section": "Prelude",
      "isPrelude": true,
      "notes": [
        { "id": "n1_1", "pitch": 5, "octave": 0, "duration": 1.5, "isDotted": true, "slurToNext": true, "lyric": { "hanlo": "", "poj": "" } },
        { "id": "n1_2", "pitch": 5, "octave": 0, "duration": 0.25, "lyric": { "hanlo": "", "poj": "" } },
        { "id": "n1_3", "pitch": 6, "octave": 0, "duration": 0.25, "lyric": { "hanlo": "", "poj": "" } },
        { "id": "n1_4", "pitch": 5, "octave": 0, "duration": 1, "slurToNext": true, "lyric": { "hanlo": "", "poj": "" } },
        { "id": "n1_5", "pitch": 3, "octave": 0, "duration": 1, "lyric": { "hanlo": "", "poj": "" } }
      ]
    },
    {
      "id": "m2",
      "measureNumber": 2,
      "chord": "F",
      "section": "Verse 1",
      "isLineBreak": true,
      "notes": [
        {
          "id": "n2_1",
          "pitch": 5,
          "octave": -1,
          "duration": 1.5,
          "isDotted": true,
          "lyric": { "hanlo": "獨", "poj": "To̍k" },
          "lyricsByVerse": {
            "1": { "hanlo": "獨", "poj": "To̍k" },
            "2": { "hanlo": "想", "poj": "Siūⁿ" }
          }
        },
        {
          "id": "n2_2",
          "pitch": 5,
          "octave": -1,
          "duration": 0.25,
          "lyric": { "hanlo": "夜", "poj": "iā" },
          "lyricsByVerse": {
            "1": { "hanlo": "夜", "poj": "iā" },
            "2": { "hanlo": "欲", "poj": "beh" }
          }
        },
        {
          "id": "n2_3",
          "pitch": 6,
          "octave": -1,
          "duration": 0.25,
          "lyric": { "hanlo": "無", "poj": "bô" },
          "lyricsByVerse": {
            "1": { "hanlo": "無", "poj": "bô" },
            "2": { "hanlo": "郎", "poj": "lông" }
          }
        },
        {
          "id": "n2_4",
          "pitch": 1,
          "octave": 0,
          "duration": 2,
          "lyric": { "hanlo": "伴\n", "poj": "phōaⁿ\n" },
          "lyricsByVerse": {
            "1": { "hanlo": "伴\n", "poj": "phōaⁿ\n" },
            "2": { "hanlo": "君\n", "poj": "kun\n" }
          }
        }
      ]
    }
  ]
}
```

---

## 5. Workflows: From Music Source to In-App Playback

### Workflow A: User-Provided Visual Scores (Images & PDF)
1. **Step 1 - Inspect**: Call `view_file` on the score image (`.png`, `.jpg`, `.webp`) or `.pdf`.
2. **Step 2 - Transcribe**: Decode key, meter, measures, pitch numbers, durations, ties/slurs, and bilingual lyrics (Hanlo + POJ tone marks), structuring karaoke phrases.
3. **Step 3 - Output & Sanitize**: Write compliant Song JSON, ensuring `id`, `title`, `measures`, `notes`, and `lyrics` are all present. Balance rhythm if needed:
   ```bash
   node .agents/skills/sheet-music-to-json/scripts/convert-sheet.mjs draft.json --auto-fix-rhythm -o my-song.taigi.json
   ```
4. **Step 4 - Validate**: Run `validate-song-json.mjs`:
   ```bash
   node .agents/skills/sheet-music-to-json/scripts/validate-song-json.mjs ./my-song.taigi.json
   ```

### Workflow B: Autonomous AI Agent Web Search (`search_web`)
When the user requests a song without providing a score file (e.g. *"Create a sheet for 望春風 / 雨夜花"*):
1. **Step 1 - Search**: Use `search_web` to retrieve the Numbered Musical Notation (簡譜), key, meter, tempo, chords, and authentic Taigi lyrics:
   - `search_web(query: "<Song Title> 簡譜")`
   - `search_web(query: "<Song Title> 台語 歌詞 白話字")`
2. **Step 2 - Reconstruct Score Chronologically**:
   - Reconstruct all measures from the intro (Prelude) through all verses, chorus, interludes, and ending.
   - Assign scale degrees (`1` to `7`), rests (`0`), octave dots, and metric durations.
   - Synchronize syllables to note onsets, ensuring both `hanlo` and authentic `poj` tone marks are present.
3. **Step 3 - Write & Validate**:
   - Save the complete JSON to `data/sheets/<song-id>.taigi.json` or output for user import.
   - Validate with `validate-song-json.mjs` and ensure all measures pass rhythm checks.

### Workflow C: Structured Text & Standard MIDI Files (Deterministic Local CLI)
1. **Step 1**: Place your canonical structured text score (`.txt`) or Standard MIDI file (`.mid`) in the workspace.
2. **Step 2**: Run the deterministic conversion script:
   ```bash
   node .agents/skills/sheet-music-to-json/scripts/convert-sheet.mjs ./track.mid --auto-fix-rhythm -o ./my-song.taigi.json
   ```
3. **Step 3**: Verify with the validator:
   ```bash
   node .agents/skills/sheet-music-to-json/scripts/validate-song-json.mjs ./my-song.taigi.json
   ```

### Step 4: Import into the Application
- In the web app, click **"Library / Import"** in the top navigation bar.
- Switch to the **"Import"** tab.
- Click **"Choose File"** and select `my-song.taigi.json` (or paste its content).
- The song is automatically loaded into the **Interactive Score Editor**, **Virtual Piano Keyboard**, **Rehearsal Stage**, and **Karaoke Prompter**.

---

## 6. Directory Structure of this Skill

```text
.agents/skills/sheet-music-to-json/
├── SKILL.md                          # Main skill documentation
├── scripts/
│   ├── convert-sheet.mjs             # CLI converter (Text, MIDI) & JSON sanitizer/rhythm balancer
│   ├── midi-parser.mjs               # Standard MIDI file parser & scale-degree mapper
│   ├── text-parser.mjs               # Structured text score parser & prompt specification
│   └── validate-song-json.mjs        # Schema, rhythm & karaoke readability validator
├── resources/
│   ├── schema.json                   # Formal Song JSON Schema
│   └── taigi-notation-reference.md   # Music theory, notation & multi-format reference
└── examples/
    ├── sample-output.taigi.json      # Complete, verified example of "望春風"
    ├── sample-numbered-notation.txt  # Human-readable structured text score example
    └── sample-prompt.txt             # Agent transcription reference & prompt specification
```

---

## 7. Troubleshooting & FAQ

- **Q: What if the score is in Western 5-line staff notation rather than Numbered Notation?**
  - The Agent transcribes pitch degrees and key signatures into Numbered Notation representation relative to the detected key. For example, in Key F, note F4 maps to pitch `1`, G4 to `2`, A4 to `3`, Bb4 to `4`, C5 to `5`, etc.
- **Q: What if a PDF has multiple songs?**
  - Extract only the relevant page range before converting, or pass individual page images to avoid combining separate songs into one.
- **Q: Rhythm Warning on pickup measures?**
  - Pickup measures (e.g. 1 beat before measure 1) legitimately contain fewer beats. Tag the measure with `section: "Pickup"` or `section: "前奏"` to indicate an intro/pickup measure.
