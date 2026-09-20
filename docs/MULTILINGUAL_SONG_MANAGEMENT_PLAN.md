# Multilingual Song Management Plan
## Supporting English, Mandarin, Japanese, and Taiwanese Songs

| Field | Specification |
| --- | --- |
| **Document Name** | Multilingual Song Management Plan |
| **Project Name** | Easy Composer (`taigi-composer` / Numbered Musical Notation Studio) |
| **Target Languages** | **English (en)**, **Mandarin (zh)**, **Japanese (ja)**, and **Taiwanese Hokkien (nan/taigi)** |
| **Platform Target** | Responsive Web & Dedicated iPad (iPadOS / WebKit Mobile Safari) PWA |
| **Core Architecture** | Pure Client-Side SPA / Zero Backend Server Dependency / 100% Offline-capable |
| **Backward Compatibility** | 100% Compatible with existing `.taigi.json` files, `LyricSyllable` schema, and user saves |
| **Status** | **Ready for Multi-Turn Execution** |

---

## 1. Executive Summary & Problem Statement

### 1.1 Background
Easy Composer was originally designed for Taiwanese Hokkien (Taigi / 台語) songs with a dual-tier lyric system (Hàn-lô 漢羅 for Chinese characters and Pe̍h-ōe-jī 白話字 / Tâi-lô 臺羅 for Romanized pronunciation). 

However, numbered musical notation (簡譜 / Jianpu / 数字譜) is the dominant notation system across East Asia and global folk music traditions. Extending the system to natively manage **English**, **Mandarin**, and **Japanese** songs expands the platform's utility from a regional archive into an international folk and pop composition workbench.

### 1.2 Linguistic & Notation Challenges

| Language | Primary Text Representation | Phonetic / Auxiliary Layer | Syllabic Alignment Rules |
| :--- | :--- | :--- | :--- |
| **English** | Latin words & hyphenated syllables (`A-`, `ma-`, `zing`) | Optional IPA pronunciation or translation | Multi-syllabic words require intra-word hyphens (`-`) and inter-word spacing (` `). Single-line display is standard. |
| **Mandarin (國語/華語)** | Chinese Hanzi (Traditional 繁體 & Simplified 簡體) | Hanyu Pinyin with tone diacritics (`wàng chūn fēng`) or Zhuyin (注音符號) | Monosyllabic (1 Hanzi = 1 note). Dual-line rendering (Hanzi + Pinyin/Zhuyin) or Hanzi-only. |
| **Japanese (日本語)** | Mixed Kanji, Hiragana, Katakana (`桜`, `さくら`, `花`) | Furigana (Ruby kana) and Hepburn Romaji (`sakura`) | Mora-based alignment (1 mora = 1 note). Small kana (`ゃ`, `ゅ`, `ょ`, `っ`) bind to the preceding mora. Furigana ruby rendered above Kanji. |
| **Taiwanese (台語)** | Hàn-lô (漢羅合用) | POJ / Tâi-lô Romanization with tone diacritics | Monosyllabic (1 syllable = 1 note). Dual-line rendering with tone sandhi markers. |

---

## 2. Universal Data Model & Schema Evolution

To support all four languages without breaking any existing song, the `Song` and `LyricSyllable` interfaces in `types/song.ts` will evolve with backward-compatible fields:

### 2.1 Song-Level Metadata
```typescript
export type SongLanguage = 'taigi' | 'mandarin' | 'english' | 'japanese' | 'multilingual';

export interface Song {
  id: string;
  title: string;
  subtitle?: string;
  composer?: string;
  lyricist?: string;
  notator?: string;
  catalogNumber?: string;
  key: KeySignature;
  timeSignature: TimeSignature;
  bpm: number;
  measures: Measure[];
  
  // NEW: Multilingual Language Specification
  language?: SongLanguage;           // 'taigi' | 'mandarin' | 'english' | 'japanese' | 'multilingual'
  languageOptions?: {
    romanizationType?: 'poj' | 'tailo' | 'pinyin' | 'zhuyin' | 'romaji' | 'ipa';
    showRubyFurigana?: boolean;      // For Japanese: render furigana above kanji
    autoHyphenateEnglish?: boolean;  // For English: auto-detect syllable breaks
  };
  
  // Existing layout and verse configurations
  notesPerLine?: number;
  orientation?: SheetOrientation;
  verseCount?: number;
  verseDisplayOption?: VerseDisplayOption;
  // ...
}
```

### 2.2 Generalized Syllable Interface (`LyricSyllable`)
```typescript
export interface LyricSyllable {
  // --- Universal Multilingual Properties ---
  text?: string;            // Primary lyric text: e.g. "A-", "望", "桜", "さ"
  phonetic?: string;        // Reading / Romanization: e.g. "wàng", "sa-ku-ra", "aɪ"
  translation?: string;     // Optional secondary translation line (e.g. English meaning)
  isHyphenated?: boolean;   // True if part of a multi-syllable word (appends '-' in English)
  isWordEnd?: boolean;      // True if ends an English word (adds word spacing)

  // --- Backward-Compatible Taiwanese Fields (Preserved) ---
  poj?: string;             // 白話字 (POJ)
  hanlo?: string;           // 漢羅 (Hàn-lô)
  hanji?: string;           // @deprecated legacy
  custom?: string;          // @deprecated legacy
  tl?: string;              // @deprecated legacy
}
```

### 2.3 Normalized Syllable Accessor Helper
A unified helper `getNormalizedSyllable(syllable: LyricSyllable, lang: SongLanguage)` ensures consistent fallbacks:
- If `lang === 'english'`: Primary text is `syllable.text || syllable.hanlo || ''`; phonetic is omitted by default to avoid clutter.
- If `lang === 'mandarin'`: Primary is `syllable.hanlo || syllable.text || ''`; phonetic is `syllable.phonetic || syllable.poj || ''` (Pinyin).
- If `lang === 'japanese'`: Primary is `syllable.text || syllable.hanlo || ''`; phonetic is Furigana/Kana.
- If `lang === 'taigi'`: Standard `hanlo` + `poj` extraction.

---

## 3. Language-Specific Sheet Display & Typography Rules

### 3.1 English Songs
- **Single-Line Default**: English songs rarely need a duplicate phonetic line above or below the notes. The lyric strip displays single-tier clean serif/sans typography.
- **Hyphen & Word Boundary Rendering**:
  - Connected syllables within the same word render with an elegant connecting hyphen (e.g., `A - ma - zing`).
  - Word breaks render with generous visual whitespace between note columns.
- **Melisma (Vocal Slur) Extension**:
  - When a single syllable spans multiple notes (e.g. "gra——ce"), a continuous horizontal extender line (`___`) connects the notes under the slur.

### 3.2 Mandarin Songs
- **Dual Display (Hanzi + Pinyin)**:
  - Upper sub-line: Pinyin with tone marks (`ā`, `á`, `ǎ`, `à`) in a compact font.
  - Lower main line: Hanzi in a bold CJK font.
- **Hanzi-Only Mode**: Clean single-line Chinese display for standard adult/choir sheet music.
- **Zhuyin Support**: Optional ruby or bracketed notation for educational and children's music.

### 3.3 Japanese Songs
- **Ruby Furigana Layout**:
  - For notes bearing Kanji (e.g. `花`, `愛`), the Furigana mora (`はな`, `あい`) is rendered directly above the Kanji or above the pitch number, following classic Japanese Enka and Pop score conventions.
- **Romaji Display Mode**:
  - For international performers, Hepburn Romaji (e.g. `sakura`, `hana`) can replace or augment Kana.
- **Sokuon & Youon Handling**:
  - Contracted sounds (`きゃ`, `きゅ`, `きょ`) and double consonants (`っ`) are bound to their respective note durations without splitting unnatural empty rests.

---

## 4. Smart Lyric Distribution & Alignment Across Languages

The Quick Lyric Aligner modal and inline distributor will feature a language selector:

### 4.1 Tokenization Engines
1. **English Tokenizer**:
   - Parses hyphens (`-`) or spaces as syllable boundaries:
     `"A-ma-zing grace, how sweet the sound"` $\rightarrow$ `["A-", "ma-", "zing", "grace,", "how", "sweet", "the", "sound"]`
   - Preserves commas and sentence punctuation attached to word ends.
2. **Mandarin Tokenizer**:
   - Splits by Chinese characters while preserving dual Pinyin tuples:
     `"月亮代表我的心"` $\rightarrow$ `["月", "亮", "代", "表", "我", "的", "心"]`
     Or paired syntax: `"月(yuè) 亮(liàng) 代(dài) 表(biǎo)"`
3. **Japanese Tokenizer**:
   - Parses Furigana ruby brackets:
     `"桜[さくら] 咲く[さく] 街[まち]で"` $\rightarrow$ extracts Kanji + Furigana moras aligned to melody notes.

---

## 5. Multilingual Search & Fuzzy Matching (`lib/lyricSearch.ts`)

The Lyric Search engine will support cross-script and diacritic-insensitive matching across all four languages:

1. **English**:
   - Case-insensitive, punctuation-stripped search.
   - Stem and prefix matching (e.g. `"amaz"` matches `"Amazing"`).
2. **Mandarin**:
   - Tone-insensitive Pinyin matching: searching `"tianmimi"` or `"tian mi mi"` matches `"甜蜜蜜"`.
   - Traditional $\leftrightarrow$ Simplified Chinese cross-matching.
3. **Japanese**:
   - Script-agnostic search: searching `"sakura"` (Romaji), `"さくら"` (Hiragana), or `"サクラ"` (Katakana) all match `"桜"`.
4. **Taiwanese**:
   - POJ/Tâi-lô tone-insensitive search (`stripDiacritics`).
5. **Search Filter Chips**:
   - UI tabs in `LyricSearchModal`: `[All]`, `[Taiwanese]`, `[English]`, `[Mandarin]`, `[Japanese]`.

---

## 6. Library Management & Preset Expansion

### 6.1 Manifest & Directory Structure
```
/data/sheets/
├── bang-chhun-hong.taigi.json       # Taiwanese Hokkien (望春風)
├── su-ki-hong.taigi.json            # Taiwanese Hokkien (四季紅)
├── u-ia-hoe.taigi.json              # Taiwanese Hokkien (雨夜花)
├── taiwan-the-green.taigi.json      # Taiwanese Hokkien (台灣翠青)
├── amazing-grace.en.json            # English (Amazing Grace)
├── the-moon-represents-my-heart.zh.json # Mandarin (月亮代表我的心)
└── sakura-sakura.ja.json            # Japanese (さくらさくら)
```

### 6.2 Sheet Registry & Filtering
- Update `scripts/generate-sheet-manifest.mjs` to auto-detect language suffix (`.en.json`, `.zh.json`, `.ja.json`, `.taigi.json`).
- Provide interactive language filter chips in the song selector menu and HeaderBar:
  - `All (7)`
  - `Taiwanese (4)`
  - `English (1)`
  - `Mandarin (1)`
  - `Japanese (1)`

---

## 7. Phased Implementation Roadmap (Modular Multi-Turn)

| Module ID | Module Name | Core Objectives | Touchpoint Files |
| :---: | :--- | :--- | :--- |
| **MOD-L1** | **Data Model & Schema Evolution** | Add `SongLanguage` and universal `LyricSyllable` fields; update validator & parser. | `types/song.ts`, `lib/songParser.ts`, `test/songParser.test.ts` |
| **MOD-L2** | **Language-Aware Sheet Renderer** | Adapt `NumberedNotationNoteComponent` for English hyphenation, Japanese Furigana, and Mandarin Pinyin. | `components/NumberedNotationNoteComponent.tsx`, `lib/taigiUtils.ts` |
| **MOD-L3** | **Multilingual Lyric Aligner** | Build English syllable splitter, Japanese mora/ruby parser, and Mandarin Hanzi distributor. | `components/QuickLyricAlignerModal.tsx`, `lib/taigiUtils.ts` |
| **MOD-L4** | **Multilingual Search Engine** | Implement Pinyin tone-free search and Japanese Romaji/Kana/Kanji equivalence matching. | `lib/lyricSearch.ts`, `components/LyricSearchModal.tsx` |
| **MOD-L5** | **Preset Songs & Manifest Generator** | Add premier English, Mandarin, and Japanese presets; update manifest generator with language badges. | `data/sheets/*`, `scripts/generate-sheet-manifest.mjs`, `lib/presets.ts` |
| **MOD-L6** | **Song Management UI & Filters** | Add language selection in New Song modal, Song Metadata header, and preset selector dropdowns. | `components/NewSongModal.tsx`, `components/composer/SongMetadataHeader.tsx`, `components/HeaderBar.tsx` |

---

## 8. Verification & Testing Strategy

1. **Unit Tests**:
   - Schema validation test: ensure existing `.taigi.json` songs pass unchanged.
   - English syllable hyphenation and melisma tests.
   - Mandarin Pinyin diacritic stripper and tone-free search tests.
   - Japanese Kana/Romaji normalization tests.
2. **Visual & Print Integrity**:
   - Verify English score prints cleanly without blank phonetic rows.
   - Verify Japanese scores display legible Furigana above Kanji.
   - Verify responsive mobile/iPad touch interaction across all languages.
