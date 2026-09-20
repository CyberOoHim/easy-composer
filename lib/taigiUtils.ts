import type {
  ArticulationType,
  GraceNote,
  InstrumentType,
  NumberedNotationNote,
  KeySignature,
  Measure,
  NoteDuration,
  PitchNumber,
  Song,
  TimeSignature,
  VerseItem,
  VerseNoteRef,
  LyricSyllable,
  VerseDisplayOption,
  SheetOrientation,
} from '../types/song.ts';

// Semitones relative to C4 (MIDI note 60)
export const KEY_SEMITONES: Record<string, number> = {
  'C': 0,
  'C#': 1,
  'Db': 1,
  'D': 2,
  'D#': 3,
  'Eb': 3,
  'E': 4,
  'F': 5,
  'F#': 6,
  'Gb': 6,
  'G': 7,
  'G#': 8,
  'Ab': 8,
  'A': 9,
  'A#': 10,
  'Bb': 10,
  'B': 11,
};

const FLAT_KEY_NAMES = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db']);
const ROOT_NAME_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
const ROOT_NAME_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

/**
 * Spell a pitch-class as a chord root using the key's accidental preference.
 * Flat keys (F, Bb, Eb, Ab, Db) use flats; all others use sharps.
 */
export function getChordRootName(key: KeySignature, semitone: number): string {
  const names = FLAT_KEY_NAMES.has(key) ? ROOT_NAME_FLATS : ROOT_NAME_SHARPS;
  return names[((semitone % 12) + 12) % 12];
}

// Major scale scale degree intervals from root 1 (in semitones)
// 1 = 0, 2 = 2, 3 = 4, 4 = 5, 5 = 7, 6 = 9, 7 = 11
export const SCALE_DEGREE_SEMITONES: Record<string, number> = {
  0: -100, // Rest
  'empty': -100, // Empty notation / spacer / punctuation slot
  1: 0,
  2: 2,
  3: 4,
  4: 5,
  5: 7,
  6: 9,
  7: 11,
};

/**
 * Calculate frequency in Hz for a given Key, Pitch number (1-7), Octave offset, and Accidental.
 */
export function getPitchFrequency(
  key: KeySignature,
  pitch: PitchNumber,
  octave: number = 0,
  accidental: '' | '#' | 'b' = '',
  transposeSemitones: number = 0
): number {
  if (pitch === 0 || pitch === 'empty' || !pitch) return 0; // Rest or empty space


  // Base C4 = 261.63 Hz, MIDI 60
  const baseKeyOffset = KEY_SEMITONES[key] || 0;
  const degreeOffset = SCALE_DEGREE_SEMITONES[pitch] || 0;
  let accidentalOffset = 0;
  if (accidental === '#') accidentalOffset = 1;
  if (accidental === 'b') accidentalOffset = -1;

  const totalSemitonesFromC4 =
    baseKeyOffset + degreeOffset + octave * 12 + accidentalOffset + transposeSemitones;
  const midiNote = 60 + totalSemitonesFromC4;

  // A4 = 440Hz = MIDI 69
  return 440 * Math.pow(2, (midiNote - 69) / 12);
}

/**
 * Chord note frequencies for accompaniment synthesis.
 * Voiced with a solid bass foundation in octave 2 (MIDI 36-47)
 * and warm harmony voices in octave 3 (MIDI 48-63) to prevent colliding with the melody.
 */
export function getChordNotes(chordName: string, transposeSemitones: number = 0): number[] {
  if (!chordName || chordName.trim() === '') return [];

  // Clean and normalize accidentals & parentheses, e.g. "B♭", "(F)", "C#m"
  const cleanName = chordName.trim().replace(/[()]/g, '').replace(/♭/g, 'b').replace(/♯/g, '#');
  if (/^N\.?C\.?$/i.test(cleanName) || cleanName.toLowerCase() === 'none') {
    return [];
  }

  // Support slash chords e.g. "C/E", "G/B"
  const [mainChord, slashBass] = cleanName.split('/');

  const rootMatch = mainChord.trim().match(/^([A-G][#b]?)(.*)$/);
  if (!rootMatch) return [];

  const rootStr = rootMatch[1] as KeySignature;
  const quality = rootMatch[2].toLowerCase();

  const rootSemitone = (KEY_SEMITONES[rootStr] ?? 0) + transposeSemitones;

  // Calculate Bass note:
  let bassSemitone = rootSemitone;
  const trimmedSlashBass = slashBass ? slashBass.trim() : '';
  if (trimmedSlashBass && KEY_SEMITONES[trimmedSlashBass as KeySignature] !== undefined) {
    bassSemitone = (KEY_SEMITONES[trimmedSlashBass as KeySignature] ?? 0) + transposeSemitones;
  }
  // Bass in octave 2 (MIDI 36 to 47)
  const bassMidi = 36 + (((bassSemitone % 12) + 12) % 12);

  // Harmony Triad/Extensions in octave 3 (MIDI 48 to 60)
  const harmonyRootMidi = 48 + (((rootSemitone % 12) + 12) % 12);

  let intervals = [0, 4, 7]; // Major triad

  if (quality.includes('m') && !quality.includes('maj')) {
    if (quality.includes('m7')) {
      intervals = [0, 3, 7, 10];
    } else if (quality.includes('m6')) {
      intervals = [0, 3, 7, 9];
    } else {
      intervals = [0, 3, 7]; // Minor triad
    }
  } else if (quality.includes('dim')) {
    intervals = quality.includes('7') ? [0, 3, 6, 9] : [0, 3, 6];
  } else if (quality.includes('aug')) {
    intervals = [0, 4, 8];
  } else if (quality.includes('sus4')) {
    intervals = [0, 5, 7];
  } else if (quality.includes('sus2')) {
    intervals = [0, 2, 7];
  } else if (quality.includes('add9')) {
    intervals = [0, 4, 7, 14];
  } else if (quality.includes('6')) {
    intervals = [0, 4, 7, 9];
  } else if (quality.includes('7')) {
    if (quality.includes('maj7')) {
      intervals = [0, 4, 7, 11];
    } else {
      intervals = [0, 4, 7, 10]; // Dominant 7th
    }
  }

  // Voice harmony notes so they remain strictly below Middle C (C4 = MIDI 60) or at most E4 (MIDI 64)
  const harmonyMidis = intervals.map(interval => {
    let midi = harmonyRootMidi + interval;
    while (midi > 63) {
      midi -= 12; // Invert down an octave
    }
    return midi;
  });

  const sortedHarmony = Array.from(new Set(harmonyMidis)).sort((a, b) => a - b);
  const allMidis = [bassMidi, ...sortedHarmony];

  return allMidis.map(midiNote => 440 * Math.pow(2, (midiNote - 69) / 12));
}

// Special Taigi (POJ and Tâi-lô / TL) characters and tone diacritics
export const TAIGI_TONE_CHARS = [
  // Tone marks for vowels
  { label: 'á', char: 'á', desc: 'Tone 2 (Rising)' },
  { label: 'à', char: 'à', desc: 'Tone 3 (Low Falling)' },
  { label: 'â', char: 'â', desc: 'Tone 5 (High Rising)' },
  { label: 'ā', char: 'ā', desc: 'Tone 7 (Mid Level)' },
  { label: 'a̍', char: 'a̍', desc: 'Tone 8 (High Checked / vertical dot)' },
  { label: 'a̋', char: 'a̋', desc: 'Tone 9 (High Level)' },
  { label: 'é', char: 'é', desc: 'Tone 2' },
  { label: 'è', char: 'è', desc: 'Tone 3' },
  { label: 'ê', char: 'ê', desc: 'Tone 5 / POJ e-circumflex' },
  { label: 'ē', char: 'ē', desc: 'Tone 7' },
  { label: 'e̍', char: 'e̍', desc: 'Tone 8' },
  { label: 'í', char: 'í', desc: 'Tone 2' },
  { label: 'ì', char: 'ì', desc: 'Tone 3' },
  { label: 'î', char: 'î', desc: 'Tone 5' },
  { label: 'ī', char: 'ī', desc: 'Tone 7' },
  { label: 'i̍', char: 'i̍', desc: 'Tone 8' },
  { label: 'ó', char: 'ó', desc: 'Tone 2' },
  { label: 'ò', char: 'ò', desc: 'Tone 3' },
  { label: 'ô', char: 'ô', desc: 'Tone 5' },
  { label: 'ō', char: 'ō', desc: 'Tone 7' },
  { label: 'o̍', char: 'o̍', desc: 'Tone 8' },
  { label: 'ú', char: 'ú', desc: 'Tone 2' },
  { label: 'ù', char: 'ù', desc: 'Tone 3' },
  { label: 'û', char: 'û', desc: 'Tone 5' },
  { label: 'ū', char: 'ū', desc: 'Tone 7' },
  { label: 'u̍', char: 'u̍', desc: 'Tone 8' },
  { label: 'o͘', char: 'o͘', desc: 'POJ Open O (dot above right)' },
  { label: 'ó͘', char: 'ó͘', desc: 'POJ Open O Tone 2' },
  { label: 'ò͘', char: 'ò͘', desc: 'POJ Open O Tone 3' },
  { label: 'ô͘', char: 'ô͘', desc: 'POJ Open O Tone 5' },
  { label: 'ō͘', char: 'ō͘', desc: 'POJ Open O Tone 7' },
  { label: 'o̍͘', char: 'o̍͘', desc: 'POJ Open O Tone 8' },
  { label: 'ⁿ', char: 'ⁿ', desc: 'POJ Nasal superscript n' },
  { label: 'm̄', char: 'm̄', desc: 'Syllabic m Tone 7' },
  { label: 'ḿ', char: 'ḿ', desc: 'Syllabic m Tone 2' },
  { label: 'ńg', char: 'ńg', desc: 'Syllabic ng Tone 2' },
  { label: 'n̂g', char: 'n̂g', desc: 'Syllabic ng Tone 5' },
  { label: 'n̄g', char: 'n̄g', desc: 'Syllabic ng Tone 7' },
  { label: 'ê', char: 'ê', desc: 'ê (of / possessive)' },
  { label: 'tio̍h', char: 'tio̍h', desc: 'tio̍h (must / should)' },
  { label: 'bô', char: 'bô', desc: 'bô (not / none)' },
  { label: 'hó', char: 'hó', desc: 'hó (good / well)' },
  { label: 'kui', char: 'kui', desc: 'kui (whole / return)' },
];

// Common Punctuation Marks for Numbered Notation sheet lyrics and notations
export const PUNCTUATION_MARKS = [
  { label: '↵ Break', char: '\n', desc: 'Line Break (splits verse, 0 beats)' },
  { label: '␣ Space', char: ' ', desc: 'Space spacer (0 beats, no verse split)' },
  { label: '，', char: '，', desc: 'Comma (0 beats, no verse split)' },
  { label: '。', char: '。', desc: 'Period (0 beats, no verse split)' },
  { label: '、', char: '、', desc: 'Enumeration comma (0 beats, no verse split)' },
  { label: '！', char: '！', desc: 'Exclamation (0 beats, no verse split)' },
  { label: '？', char: '？', desc: 'Question mark (0 beats, no verse split)' },
  { label: '—', char: '—', desc: 'Em Dash (0 beats, no verse split)' },
  { label: '…', char: '…', desc: 'Ellipsis (0 beats, no verse split)' },
  { label: '「', char: '「', desc: 'Left Quote (0 beats, no verse split)' },
  { label: '」', char: '」', desc: 'Right Quote (0 beats, no verse split)' },
  { label: 'V', char: 'V', desc: 'Breath Mark (0 beats, no verse split)' },
];

// Musical & Vocal Performance Annotations
export const ANNOTATION_MARKS = [
  { label: 'rit.', text: 'rit.', desc: 'Ritardando (slowing down)' },
  { label: '(Chorus)', text: '(Chorus)', desc: 'Choir / Chorus' },
  { label: '(Refrain)', text: '(Refrain)', desc: 'Refrain section' },
  { label: '(Verse)', text: '(Verse)', desc: 'Verse section' },
  { label: '(Inst.)', text: '(Inst.)', desc: 'Instrumental passage' },
  { label: '(Solo)', text: '(Solo)', desc: 'Solo voice' },
  { label: '(Male)', text: '(Male)', desc: 'Male voice' },
  { label: '(Female)', text: '(Female)', desc: 'Female voice' },
  { label: '(Spoken)', text: '(Spoken)', desc: 'Spoken / Recitation' },
  { label: '[Interlude]', text: '[Interlude]', desc: 'Interlude section' },
  { label: '[Outro]', text: '[Outro]', desc: 'Outro ending' },
  { label: 'fine', text: 'fine', desc: 'Fine (end)' },
  { label: 'f', text: 'f', desc: 'Forte (loud)' },
  { label: 'p', text: 'p', desc: 'Piano (soft)' },
  { label: 'mp', text: 'mp', desc: 'Mezzo-piano (medium soft)' },
  { label: 'mf', text: 'mf', desc: 'Mezzo-forte (medium loud)' },
];

/**
 * Split text into Taigi syllables based on whether it's Hanji, POJ/TL (hyphens/spaces), or mixed Han-lo.
 * Preserves the semi-hyphen (-) or double hyphen (--) attached to non-final syllables of multi-syllable POJ/TL words.
 * e.g., "獨夜無伴守燈下" -> ["獨", "夜", "無", "伴", "守", "燈", "下"]
 * e.g., "To̍k-iā bô-phōaⁿ siú teng-ē" -> ["To̍k-", "iā", "bô-", "phōaⁿ", "siú", "teng-", "ē"]
 * e.g., "siáu-liân-ke" -> ["siáu-", "liân-", "ke"]
 * e.g., "khì--ah" -> ["khì--", "ah"]
 * e.g., "阮ê故鄉" -> ["阮", "ê", "故", "鄉"]
 */
export function splitTaigiLyricSyllables(text: string): string[] {
  if (!text) return [];

  // Normalize separators: replace full-width punctuation or commas with spaces (keep hyphens and double hyphens)
  const cleaned = text
    .replace(/[，。！？、；：""''（）(),.!?;:]/g, ' ')
    .trim();

  const tokens: string[] = [];
  const rawWords = cleaned.split(/\s+/).filter(Boolean);

  for (const word of rawWords) {
    if (word.includes('--')) {
      const doubleParts = word.split('--').filter(Boolean);
      for (let pIdx = 0; pIdx < doubleParts.length; pIdx++) {
        const isLastDouble = pIdx === doubleParts.length - 1;
        const subWord = doubleParts[pIdx];
        const subTokens = splitHyphenatedWord(subWord);
        if (!isLastDouble && subTokens.length > 0) {
          const lastIdx = subTokens.length - 1;
          if (!subTokens[lastIdx].endsWith('-')) {
            subTokens[lastIdx] += '--';
          }
        }
        tokens.push(...subTokens);
      }
    } else if (word.includes('-')) {
      tokens.push(...splitHyphenatedWord(word));
    } else {
      tokens.push(...splitTokenCharacters(word));
    }
  }

  return tokens;
}

function splitHyphenatedWord(word: string): string[] {
  const parts = word.split('-').filter(Boolean);
  const result: string[] = [];
  for (let i = 0; i < parts.length; i++) {
    const isLast = i === parts.length - 1;
    const chars = splitTokenCharacters(parts[i]);
    if (chars.length > 0) {
      if (!isLast) {
        // Keep semi hyphen on the last syllable of this sub-word (e.g. "To̍k" -> "To̍k-")
        chars[chars.length - 1] += '-';
      }
      result.push(...chars);
    }
  }
  return result;
}

function splitTokenCharacters(token: string): string[] {
  const result: string[] = [];
  let currentLatin = '';

  // Iterate codepoints / characters
  for (let i = 0; i < token.length; i++) {
    const char = token[i];
    const code = char.charCodeAt(0);

    // Hanji character check (CJK Unified Ideographs range)
    const isHan =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df);

    if (isHan) {
      if (currentLatin.trim()) {
        result.push(currentLatin.trim());
        currentLatin = '';
      }
      result.push(char);
    } else {
      // Latin letters, combining diacritics, superscript n (ⁿ), dot above right (͘)
      currentLatin += char;
    }
  }

  if (currentLatin.trim()) {
    result.push(currentLatin.trim());
  }

  return result;
}

/**
 * Format duration into human readable fraction or symbol
 */
export function formatDurationName(duration: number): string {
  switch (duration) {
    case 4:
      return 'Whole Note (4)';
    case 3:
      return 'Dotted Half (3)';
    case 2:
      return 'Half Note (2)';
    case 1.75:
      return 'Double Dotted Quarter (1.75)';
    case 1.5:
      return 'Dotted Quarter (1.5 / 1½)';
    case 1.25:
      return 'Tied Quarter+16th (1.25)';
    case 1:
      return 'Quarter Note (1)';
    case 0.75:
      return 'Dotted Eighth (0.75 / ¾)';
    case 0.5:
      return '8th Note (1/2)';
    case 0.375:
      return 'Dotted 16th (0.375 / ⅜)';
    case 0.25:
      return '16th Note (1/4)';
    case 0.125:
      return '32nd Note (1/8)';
    case 0:
      return '0 beats (Empty)';
    default:
      return `${duration} beats`;
  }
}

export interface DurationChineseInfo {
  name: string;
  fractionLabel: string;
  beatsLabel: string;
  numberedNotationSymbol: string;
  description: string;
  isDotted: boolean;
}

export function getDurationChineseInfo(duration: number): DurationChineseInfo {
  switch (duration) {
    case 0:
      return {
        name: '0 beats (Empty)',
        fractionLabel: '0 beats (Empty / Punctuation)',
        beatsLabel: '0 beats',
        numberedNotationSymbol: '—',
        description: 'Zero duration: pure spacer, punctuation, or line break with no beat value',
        isDotted: false,
      };
    case 1.5:
      return {
        name: 'Dotted Quarter Note',
        fractionLabel: '1½ beats',
        beatsLabel: '1.5 beats',
        numberedNotationSymbol: '5·',
        description: 'Quarter note (1 beat) + dot (0.5 beats) = 1.5 beats',
        isDotted: true,
      };
    case 0.75:
      return {
        name: 'Dotted 8th Note',
        fractionLabel: '¾ beat',
        beatsLabel: '0.75 beats',
        numberedNotationSymbol: '5· (1 underline)',
        description: '8th note (0.5 beats) + dot (0.25 beats) = 0.75 beats',
        isDotted: true,
      };
    case 1:
      return {
        name: 'Quarter Note',
        fractionLabel: '1 beat',
        beatsLabel: '1 beat',
        numberedNotationSymbol: '5',
        description: 'Standard quarter note (1 beat)',
        isDotted: false,
      };
    case 0.5:
      return {
        name: '8th Note',
        fractionLabel: '½ beat',
        beatsLabel: '0.5 beats',
        numberedNotationSymbol: '5 (1 underline)',
        description: 'Half beat (0.5 beats)',
        isDotted: false,
      };
    case 0.25:
      return {
        name: '16th Note',
        fractionLabel: '¼ beat',
        beatsLabel: '0.25 beats',
        numberedNotationSymbol: '5 (2 underlines)',
        description: 'Quarter beat (0.25 beats)',
        isDotted: false,
      };
    case 2:
      return {
        name: 'Half Note',
        fractionLabel: '2 beats',
        beatsLabel: '2 beats',
        numberedNotationSymbol: '5 -',
        description: 'Half note (2 beats, 1 dash to the right)',
        isDotted: false,
      };
    case 3:
      return {
        name: 'Dotted Half Note',
        fractionLabel: '3 beats',
        beatsLabel: '3 beats',
        numberedNotationSymbol: '5 - -',
        description: 'Half note (2 beats) + dot (1 beat) = 3 beats',
        isDotted: true,
      };
    case 4:
      return {
        name: 'Whole Note',
        fractionLabel: '4 beats',
        beatsLabel: '4 beats',
        numberedNotationSymbol: '5 - - -',
        description: 'Whole note (4 beats, 3 dashes to the right)',
        isDotted: false,
      };
    case 0.375:
      return {
        name: 'Dotted 16th Note',
        fractionLabel: '⅜ beat',
        beatsLabel: '0.375 beats',
        numberedNotationSymbol: '5· (2 underlines)',
        description: '16th note (0.25 beats) + dot (0.125 beats) = 0.375 beats',
        isDotted: true,
      };
    case 1.75:
      return {
        name: 'Double Dotted Quarter Note',
        fractionLabel: '1¾ beats',
        beatsLabel: '1.75 beats',
        numberedNotationSymbol: '5··',
        description: 'Quarter note (1 beat) + double dots (0.75 beats) = 1.75 beats',
        isDotted: true,
      };
    case 3.5:
      return {
        name: 'Double Dotted Half Note',
        fractionLabel: '3½ beats',
        beatsLabel: '3.5 beats',
        numberedNotationSymbol: '5 - - ··',
        description: 'Half note (2 beats) + double dots (1.5 beats) = 3.5 beats',
        isDotted: true,
      };
    case 0.125:
      return {
        name: '32nd Note',
        fractionLabel: '⅛ beat',
        beatsLabel: '0.125 beats',
        numberedNotationSymbol: '5 (3 underlines)',
        description: 'Thirty-second note (0.125 beats, 3 underlines)',
        isDotted: false,
      };
    case 0.333:
      return {
        name: '8th Note Triplet',
        fractionLabel: '⅓ beat',
        beatsLabel: '0.333 beats',
        numberedNotationSymbol: '┌ 3 ┐ (⅓ beat)',
        description: 'Triplet 8th note: 3 notes in the space of 1 beat (0.333 beats each)',
        isDotted: false,
      };
    case 0.667:
      return {
        name: 'Quarter Note Triplet',
        fractionLabel: '⅔ beat',
        beatsLabel: '0.667 beats',
        numberedNotationSymbol: '┌ 3 ┐ (⅔ beat)',
        description: 'Triplet quarter note: 3 notes in the space of 2 beats (0.667 beats each)',
        isDotted: false,
      };
    default:
      return {
        name: `Custom Duration (${duration} beats)`,
        fractionLabel: `${duration} beats`,
        beatsLabel: `${duration} beats`,
        numberedNotationSymbol: `${duration} beats`,
        description: `Custom rhythm duration: ${duration} beats`,
        isDotted: duration % 1 !== 0 && duration !== 0.5 && duration !== 0.25,
      };
  }
}

/**
 * Compare two notes to see if they have identical musical pitch (pitch number, octave, accidental).
 */
export function isSamePitch(a: NumberedNotationNote | null | undefined, b: NumberedNotationNote | null | undefined): boolean {
  if (!a || !b) return false;
  if (a.pitch === 'empty' || b.pitch === 'empty') return false;
  if (a.pitch === 0 || b.pitch === 0) return a.pitch === b.pitch;
  return (
    a.pitch === b.pitch &&
    (a.octave || 0) === (b.octave || 0) &&
    (a.accidental || '') === (b.accidental || '')
  );
}

/**
 * Check if a Tie is active from currentNote into nextNote.
 * A Tie (連結音) connects notes of the SAME pitch, combining their sound in playback.
 */
export function isTieActive(currentNote: NumberedNotationNote | null | undefined, nextNote?: NumberedNotationNote | null): boolean {
  if (!currentNote || !nextNote) return false;
  const wantsTie = Boolean(currentNote.tieToNext || currentNote.isTied);
  return wantsTie && isSamePitch(currentNote, nextNote);
}

/**
 * Check if a Slur is active from currentNote into nextNote.
 * A Slur (圓滑音 / 歌唱連線) connects notes across different or arbitrary pitches (legato phrasing / melisma).
 */
export function isSlurActive(currentNote: NumberedNotationNote | null | undefined, nextNote?: NumberedNotationNote | null): boolean {
  if (!currentNote) return false;
  if (currentNote.slurToNext) return true;
  // Backward compatibility: if isTied is set but pitches differ, it's musically a Slur
  if (currentNote.isTied && nextNote && !isSamePitch(currentNote, nextNote)) {
    return true;
  }
  return false;
}

/**
 * Check if a note is a melisma continuation under a slur (following an initial note with lyrics).
 */
export function isMelismaContinuation(note: NumberedNotationNote | null | undefined, prevNote?: NumberedNotationNote | null): boolean {
  if (!note || !prevNote) return false;
  const prevSlurred = isSlurActive(prevNote, note);
  const noteHasOwnLyric = Boolean(
    note.lyric?.hanlo?.trim() ||
    note.lyric?.poj?.trim() ||
    note.lyric?.hanji?.trim() ||
    note.lyric?.custom?.trim()
  );
  return prevSlurred && !noteHasOwnLyric;
}

/**
 * Format grace notes into compact display string e.g. "(3 5)"
 */
export function formatGraceNotes(notes?: GraceNote[]): string {
  if (!notes || notes.length === 0) return '';
  return notes
    .map(g => {
      let p = `${g.accidental || ''}${g.pitch}`;
      if (g.octave > 0) p += '̇'.repeat(g.octave);
      else if (g.octave < 0) p += '̣'.repeat(Math.abs(g.octave));
      return p;
    })
    .join('');
}

/**
 * Check if a note is punctuation, an annotation, a newline, or whitespace/blank spacer.
 * Punctuation, annotations, newlines, and whitespace are NOT treated as musical notation
 * and do not consume beats in a measure.
 */
export function isNonNotationItem(note: NumberedNotationNote | null | undefined): boolean {
  if (!note) return false;

  // 1. Explicit 0 or negative duration
  if (typeof note.duration === 'number' && note.duration <= 0) return true;

  // 2. Explicit 'empty' pitch (blank notation / spacer for punctuation/annotation/newline)
  if (note.pitch === 'empty') return true;

  const isMusicalPitch = typeof note.pitch === 'number' && note.pitch > 0;

  // 3. Note has an annotation and has no active musical pitch (1-7)
  if (note.annotation && !isMusicalPitch) {
    return true;
  }

  // 4. Note contains punctuation, delimiter, space, or newline in lyrics
  // All delimiters, spaces, and newlines strictly maintain a time value of zero
  const rawHanlo = note.lyric?.hanlo ?? note.lyric?.custom ?? note.lyric?.hanji ?? '';
  const rawPoj = note.lyric?.poj ?? note.lyric?.tl ?? '';

  const hasAnyLyric = rawHanlo.length > 0 || rawPoj.length > 0;

  const isPurePunctuationLyric =
    hasAnyLyric &&
    (!rawHanlo || isPunctuationOrSpacer(rawHanlo)) &&
    (!rawPoj || isPunctuationOrSpacer(rawPoj));

  if (isPurePunctuationLyric && !isMusicalPitch) {
    return true;
  }

  return false;
}

/**
 * Check if a note is a zero-time punctuation / delimiter / spacer (not an annotation)
 */
export function isPunctuationZeroNote(note: NumberedNotationNote | null | undefined): boolean {
  if (!note) return false;
  const isZeroTime = isNonNotationItem(note);
  return isZeroTime && !note.annotation;
}

/**
 * Check if a note is a standalone zero-time annotation note (performance/vocal direction)
 */
export function isStandaloneAnnotationNote(note: NumberedNotationNote | null | undefined): boolean {
  if (!note) return false;
  const isZeroTime = isNonNotationItem(note);
  return isZeroTime && Boolean(note.annotation);
}

export const ZERO_BEAT_DELIMITERS = new Set(['，', '。', ',', '.']);
export const ZERO_BEAT_BREAKS = new Set(['\n', '\r', '↵']);
export const ZERO_BEAT_SPACERS = new Set([' ', '␣']);

export interface ZeroBeatConversionResult {
  isMatch: boolean;
  normalized: string;
}

/**
 * Checks if a string is one of the allowed zero-beat triggers:
 * - Delimiters: '，' and '。' (and ascii ',' and '.') - NO OTHER DELIMITERS
 * - Newline: '↵', '\n', '\r'
 * - Whitespace spacer: '␣', ' '
 */
export function checkZeroBeatTrigger(text?: string | null): ZeroBeatConversionResult {
  if (text === undefined || text === null || text === '') {
    return { isMatch: false, normalized: '' };
  }
  if (text === '\n' || text === '\r' || text === '↵') {
    return { isMatch: true, normalized: '\n' };
  }
  if (text === ' ' || text === '␣') {
    return { isMatch: true, normalized: ' ' };
  }
  const trimmed = text.trim();
  if (trimmed === '，' || trimmed === ',') {
    return { isMatch: true, normalized: '，' };
  }
  if (trimmed === '。' || trimmed === '.') {
    return { isMatch: true, normalized: '。' };
  }
  return { isMatch: false, normalized: text };
}

/**
 * Check if a character or string is any punctuation, delimiter, or break for general POJ/Han-lo synchronization
 */
export function isPunctuationDelimiterOrBreak(text?: string | null): boolean {
  if (!text) return false;
  return isPunctuationOrSpacer(text);
}

export const COMMON_PUNCTUATIONS = [
  { label: '↵', value: '\n', title: 'Insert newline / verse break "↵" (0 beats)' },
  { label: '␣', value: ' ', title: 'Insert space / spacer "␣" (0 beats)' },
  { label: '，', value: '，', title: 'Insert delimiter comma "，" (0 beats)' },
  { label: '。', value: '。', title: 'Insert delimiter period "。" (0 beats)' },
  { label: '！', value: '！', title: 'Insert exclamation mark "！"' },
  { label: '？', value: '？', title: 'Insert question mark "？"' },
  { label: '、', value: '、', title: 'Insert enumeration comma "、"' },
  { label: '；', value: '；', title: 'Insert semicolon "；"' },
  { label: '：', value: '：', title: 'Insert colon "："' },
  { label: '—', value: '—', title: 'Insert dash "—"' },
  { label: '…', value: '…', title: 'Insert ellipsis "…"' },
];

export const COMMON_ANNOTATIONS = ['rit.', 'accel.', 'a tempo', 'fine', 'V', 'fermata'];

/**
 * Get clean 1-character display symbol for a zero-time punctuation note or string
 */
export function getPunctuationDisplayChar(noteOrStr: NumberedNotationNote | string | null | undefined): string {
  if (!noteOrStr) return '';
  let raw = '';
  if (typeof noteOrStr === 'string') {
    raw = noteOrStr;
  } else {
    const hanlo = noteOrStr.lyric?.hanlo ?? '';
    const hanji = noteOrStr.lyric?.hanji ?? '';
    const custom = noteOrStr.lyric?.custom ?? '';
    const poj = noteOrStr.lyric?.poj ?? '';
    raw = hanlo || hanji || custom || poj || '';
  }
  if (raw === '\n' || raw === '\r' || raw === '↵') return '↵';
  if (raw === ' ' || raw === '␣') return '␣';
  if (raw.trim()) return raw.trim().slice(-1);
  return '␣';
}

/**
 * Check if a character or string is an enhanced delimiter, punctuation mark, newline, or spacer
 */
export function isPunctuationOrSpacer(str?: string): boolean {
  if (str === undefined || str === null || str === '') return false;
  if (str === ' ' || str === '␣' || str === '\n' || str === '\r' || str === '↵') {
    return true;
  }
  const trimmed = str.trim();
  if (
    trimmed === '—' ||
    trimmed === '…' ||
    trimmed === '...' ||
    trimmed === '--' ||
    trimmed === '-' ||
    trimmed === 'V' ||
    trimmed === '↵' ||
    trimmed === '␣' ||
    trimmed === '\n' ||
    trimmed === '\r'
  ) {
    return true;
  }
  if (!trimmed) return false;
  return /^[，。！？、；：""''（）()「」,.!?;:\s—…\n\r↵\-]+$/.test(trimmed);
}

/**
 * Check if a string contains newline / line break characters (\n, \r, ↵)
 */
export function isNewlineBreak(str?: string): boolean {
  if (!str) return false;
  return /[\n\r↵]/.test(str);
}

/**
 * Checks if a note contains a no-wrap line-split trigger:
 * - Delimiters: '，', '。', '！', '？' (and ascii ',', '.', '!', '?')
 * - Newline verse breaks: '↵', '\n', '\r'
 * - EXCLUDED: Whitespace spacers ('␣', ' ')
 */
export function isNoWrapLineSplitTrigger(note: NumberedNotationNote | null | undefined): boolean {
  if (!note) return false;

  const lyricCandidates: (string | undefined)[] = [
    note.lyric?.hanlo,
    note.lyric?.hanji,
    note.lyric?.custom,
    note.lyric?.poj,
    note.lyric?.tl,
  ];

  if (note.lyricsByVerse) {
    for (const v of Object.values(note.lyricsByVerse)) {
      if (v) {
        lyricCandidates.push(v.hanlo, v.hanji, v.custom, v.poj, v.tl);
      }
    }
  }

  for (const text of lyricCandidates) {
    if (!text) continue;

    // Newline verse breaks: ↵, \n, \r
    if (/[\n\r↵]/.test(text)) {
      return true;
    }

    const trimmed = text.trim();
    // Explicitly exclude whitespace spacers ('␣', ' ')
    if (text === ' ' || text === '␣' || trimmed === '␣' || trimmed === '') {
      continue;
    }

    // Strip leading verse prefixes (e.g. "1.", "2.", "1.3.", "(1).") so verse markers do not trigger line split
    const textWithoutVersePrefix = trimmed.replace(/^\s*(\d+(\.\d+)*|[A-Za-z]|\([0-9A-Za-z]+\))\.\s*/, '');
    if (textWithoutVersePrefix === '') {
      continue;
    }

    // Delimiters: ，, 。, ！, ？ (and ascii , . ! ?)
    if (/[，。！？,!?]|\.(?!\w)/.test(textWithoutVersePrefix)) {
      return true;
    }
  }

  // Check annotation for newline breaks or standalone delimiter characters
  if (note.annotation) {
    const annot = note.annotation.trim();
    if (/[\n\r↵]/.test(annot)) {
      return true;
    }
    if (
      annot === '，' || annot === '。' || annot === '！' || annot === '？' ||
      annot === ',' || annot === '.' || annot === '!' || annot === '?'
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Checks if a measure contains any note with a no-wrap line-split trigger.
 */
export function measureHasNoWrapSplitTrigger(measure: Measure | null | undefined): boolean {
  if (!measure?.notes || measure.notes.length === 0) return false;
  return measure.notes.some(note => isNoWrapLineSplitTrigger(note));
}


/**
 * Check if a note is an explicit verse/line separator.
 * Splits lines / verses at any of the enhanced delimiters (↵, ␣, ，, 。, ！, ？, 、, ；, ：, —, …, \n, \r)
 * or zero-beat punctuation/spacer notes.
 */
export function isVerseBreakNote(note: NumberedNotationNote | null | undefined): boolean {
  if (!note) return false;

  const hanlo = note.lyric?.hanlo || note.lyric?.custom || note.lyric?.hanji;
  const poj = note.lyric?.poj || note.lyric?.tl;
  const annot = note.annotation;

  if (isPunctuationZeroNote(note)) return true;
  if (hanlo && (isNewlineBreak(hanlo) || isPunctuationOrSpacer(hanlo))) return true;
  if (poj && (isNewlineBreak(poj) || isPunctuationOrSpacer(poj))) return true;
  if (annot && (isNewlineBreak(annot) || isPunctuationOrSpacer(annot))) return true;

  return false;
}

/**
 * Check if a note's lyric concludes with sentence or clause punctuation
 * (e.g. ，。！？；：…—~ or trailing . ! ?) indicating a natural phrase boundary.
 */
export function hasPhraseEndingPunctuation(note: NumberedNotationNote | null | undefined): boolean {
  if (!note) return false;
  const hanlo = (note.lyric?.hanlo || note.lyric?.custom || note.lyric?.hanji || '').trim();
  const poj = (note.lyric?.poj || note.lyric?.tl || '').trim();
  const annot = (note.annotation || '').trim();

  return (
    /[，。！？；：…—~]/.test(hanlo) ||
    /[.!?;\n\r↵]$/.test(poj) ||
    /[.!?;\n\r↵]/.test(annot)
  );
}

/**
 * Group song into Verses sectioned short while meaningful for Karaoke mode.
 * Verses are split by:
 * 1. Explicit newlines (\n, \r, ↵) in lyrics or annotations.
 * 2. Measure section tag changes (e.g., 主歌, 副歌, 前奏).
 * 3. Measure line breaks (isLineBreak: true).
 * 4. Semantic clause punctuation (，, 。, ！, ？, ；) after at least 3 sung syllables.
 * 5. Natural breathing pauses (musical rests pitch 0) when a verse has reached 7+ vocal syllables.
 */
export function groupSongIntoVerses(song: Song): VerseItem[] {
  const verses: VerseItem[] = [];
  let currentNotes: VerseNoteRef[] = [];
  let currentSection: string | undefined = undefined;

  const pushCurrentVerse = () => {
    if (currentNotes.length === 0) return;

    const startMNum = currentNotes[0].measureNumber;
    const endMNum = currentNotes[currentNotes.length - 1].measureNumber;

    const verseChordsList: string[] = [];
    currentNotes.forEach(n => {
      const chordsForNote = n.chord ? getMeasureChords({ chord: n.chord }) : [];
      chordsForNote.forEach(c => {
        if (c && !verseChordsList.includes(c)) {
          verseChordsList.push(c);
        }
      });
    });
    const chords = verseChordsList;

    const hanloParts: string[] = [];
    const pojParts: string[] = [];

    currentNotes.forEach(n => {
      const h = n.note.lyric.hanlo || n.note.lyric.custom || n.note.lyric.hanji;
      const p = n.note.lyric.poj || n.note.lyric.tl;
      if (h && !isNewlineBreak(h)) hanloParts.push(h);
      if (p && !isNewlineBreak(p)) pojParts.push(p);
    });

    const verseIndex = verses.length;
    verses.push({
      id: `verse-${verseIndex + 1}-${startMNum}-${endMNum}`,
      verseIndex,
      notes: [...currentNotes],
      startMeasureNumber: startMNum,
      endMeasureNumber: endMNum,
      section: currentSection || currentNotes[0].section,
      chords,
      lyricSummary: {
        poj: pojParts.join(' '),
        hanlo: hanloParts.join(''),
        hanji: hanloParts.join(''),
        custom: hanloParts.join(' '),
      },
    });

    currentNotes = [];
  };

  song.measures.forEach((measure, mIdx) => {
    measure.notes.forEach((note, nIdx) => {
      const isFirstInMeasure = nIdx === 0;
      const isLastInMeasure = nIdx === measure.notes.length - 1;

      // If a measure has a new explicit section tag and we already have notes in the current verse, close the verse
      if (measure.section && isFirstInMeasure && currentNotes.length > 0 && currentSection !== measure.section) {
        pushCurrentVerse();
        currentSection = measure.section;
      } else if (measure.section) {
        currentSection = measure.section;
      }

      const noteRef: VerseNoteRef = {
        note,
        measureIdx: mIdx,
        noteIdx: nIdx,
        measureIndex: mIdx,
        noteIndex: nIdx,
        measureNumber: measure.measureNumber,
        chord: measure.chord,
        section: measure.section || currentSection,
        isFirstInMeasure,
      };

      // Count vocal syllables currently accumulated in the active verse
      const currentVocalCount = currentNotes.filter(
        n =>
          (typeof n.note.pitch === 'number' && n.note.pitch > 0) &&
          Boolean(n.note.lyric.hanlo || n.note.lyric.hanji || n.note.lyric.poj || n.note.lyric.custom)
      ).length;

      // Check if this note acts as an explicit phrase / verse ending separator
      const isSeparator = isVerseBreakNote(note);
      const isPunctBreak = hasPhraseEndingPunctuation(note) && currentVocalCount >= 3;
      const isRestPauseBreak =
        currentVocalCount >= 7 &&
        (note.pitch === 0 || note.pitch === 'empty') &&
        (typeof note.duration === 'number' && note.duration >= 0.5);

      if (isSeparator) {
        // If we have accumulated at least one pitched/lyrical note before this separator, close the verse here
        const hasContent = currentNotes.some(
          n => {
            const h = n.note.lyric.hanlo || n.note.lyric.hanji || n.note.lyric.custom || '';
            const p = n.note.lyric.poj || n.note.lyric.tl || '';
            return (typeof n.note.pitch === 'number' && n.note.pitch > 0) || (h && !isPunctuationOrSpacer(h)) || (p && !isPunctuationOrSpacer(p));
          }
        );

        if (hasContent) {
          // Conclude current verse with this newline separator
          currentNotes.push(noteRef);
          pushCurrentVerse();
        } else if (verses.length > 0 && currentNotes.length === 0) {
          // Consecutive newlines: absorb into the previously closed verse without creating an empty verse
          verses[verses.length - 1].notes.push(noteRef);
        } else {
          // Leading newline before content: keep in currentNotes until content arrives
          currentNotes.push(noteRef);
        }
      } else if (isPunctBreak) {
        // Conclude verse at clause-ending punctuation (e.g. ，, 。)
        currentNotes.push(noteRef);
        pushCurrentVerse();
      } else if (isRestPauseBreak) {
        // Natural breath pause when a 7+ syllable phrase reaches a rest
        currentNotes.push(noteRef);
        pushCurrentVerse();
      } else {
        currentNotes.push(noteRef);

        // If this is the last note of a measure marked with isLineBreak, close the verse
        if (measure.isLineBreak && isLastInMeasure) {
          const hasContent = currentNotes.some(
            n => {
              const h = n.note.lyric.hanlo || n.note.lyric.hanji || n.note.lyric.custom || '';
              return (typeof n.note.pitch === 'number' && n.note.pitch > 0) || (h && !isPunctuationOrSpacer(h));
            }
          );
          if (hasContent) {
            pushCurrentVerse();
          }
        }
      }
    });
  });

  // Push remaining notes
  pushCurrentVerse();

  // If for some reason song has no notes or produced empty verses, provide a fallback single verse
  if (verses.length === 0 && song.measures.length > 0) {
    const allNotes: VerseNoteRef[] = [];
    song.measures.forEach((m, mIdx) => {
      m.notes.forEach((n, nIdx) => {
        allNotes.push({
          note: n,
          measureIdx: mIdx,
          noteIdx: nIdx,
          measureIndex: mIdx,
          noteIndex: nIdx,
          measureNumber: m.measureNumber,
          chord: m.chord,
          section: m.section,
          isFirstInMeasure: nIdx === 0,
        });
      });
    });

    if (allNotes.length > 0) {
      verses.push({
        id: 'verse-1',
        verseIndex: 0,
        notes: allNotes,
        startMeasureNumber: 1,
        endMeasureNumber: song.measures[song.measures.length - 1].measureNumber,
        section: song.measures[0]?.section,
        chords: Array.from(new Set(allNotes.map(n => n.chord).filter(Boolean) as string[])),
        lyricSummary: {
          poj: allNotes.map(n => n.note.lyric.poj || n.note.lyric.tl || '').filter(p => !isNewlineBreak(p)).join(' '),
          hanlo: allNotes.map(n => n.note.lyric.hanlo || n.note.lyric.custom || n.note.lyric.hanji || '').filter(h => !isNewlineBreak(h)).join(''),
          hanji: allNotes.map(n => n.note.lyric.hanlo || n.note.lyric.custom || n.note.lyric.hanji || '').filter(h => !isNewlineBreak(h)).join(''),
          custom: allNotes.map(n => n.note.lyric.hanlo || n.note.lyric.custom || n.note.lyric.hanji || '').filter(c => !isNewlineBreak(c)).join(' '),
        },
      });
    }
  }

  return verses;
}

/**
 * Tokenize verse text into syllables while preserving or recognizing punctuation marks.
 * Consecutive newlines act as a single verse separator.
 */
export function splitVerseTextTokens(text: string): { text: string; isPunct: boolean }[] {
  if (!text) return [];

  const tokens: { text: string; isPunct: boolean }[] = [];
  let currentLatin = '';

  const flushLatin = () => {
    if (currentLatin.trim()) {
      tokens.push({ text: currentLatin.trim(), isPunct: false });
      currentLatin = '';
    }
  };

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const isPunct = isPunctuationOrSpacer(char);

    if (isPunct) {
      flushLatin();
      if (char === '\n' || char === '\r' || char === '↵') {
        const lastTok = tokens[tokens.length - 1];
        if (!lastTok || lastTok.text !== '↵') {
          tokens.push({ text: '↵', isPunct: true });
        }
      } else if (char.trim()) {
        tokens.push({ text: char, isPunct: true });
      }
      continue;
    }

    const code = char.charCodeAt(0);
    const isHan =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df);

    if (isHan) {
      flushLatin();
      tokens.push({ text: char, isPunct: false });
    } else if (char === '-') {
      // Check if next character is also a hyphen (double hyphen enclitic --)
      if (i + 1 < text.length && text[i + 1] === '-') {
        if (currentLatin.trim()) {
          currentLatin += '--';
          flushLatin();
        }
        i++; // skip second hyphen
      } else {
        if (currentLatin.trim()) {
          currentLatin += '-';
          flushLatin();
        }
      }
    } else if (char === ' ') {
      flushLatin();
    } else {
      currentLatin += char;
    }
  }

  flushLatin();
  return tokens;
}

/**
 * Get effective beat duration of a note without double scaling.
 * Returns 0 for non-notation items (punctuation, annotations, blank spaces, newlines).
 */
export function getNoteBeatDuration(note: NumberedNotationNote | null | undefined): number {
  if (!note || isNonNotationItem(note) || note.pitch === 'empty') return 0;
  const dur = typeof note.duration === 'number' ? note.duration : 1;
  if (dur <= 0) return 0;
  // If duration is already a dotted value (1.5, 0.75, 3, 0.375, 1.75), do not scale again
  if (note.isDotted && (dur === 1 || dur === 0.5 || dur === 2 || dur === 0.25 || dur === 4)) {
    return Math.round(dur * 1.5 * 1000) / 1000;
  }
  return dur;
}

/**
 * Normalizes a note so that non-notation items (punctuation, annotations, newlines, empty pitches)
 * strictly have duration: 0 and pitch: 'empty', with no unnecessary time duration activated.
 */
export function normalizeNoteDuration(note: NumberedNotationNote): NumberedNotationNote {
  const rawHanlo = note.lyric?.hanlo ?? note.lyric?.custom ?? note.lyric?.hanji ?? '';
  const rawPoj = note.lyric?.poj ?? note.lyric?.tl ?? '';
  const trigHanlo = checkZeroBeatTrigger(rawHanlo);
  const trigPoj = checkZeroBeatTrigger(rawPoj);
  const zeroBeatTrigger = trigHanlo.isMatch || trigPoj.isMatch;

  if (
    isNonNotationItem(note) ||
    note.pitch === 'empty' ||
    (typeof note.duration === 'number' && note.duration <= 0) ||
    zeroBeatTrigger
  ) {
    const matched = trigHanlo.isMatch ? trigHanlo : trigPoj;
    const syncText = matched.isMatch ? matched.normalized : (rawHanlo || rawPoj);

    return {
      ...note,
      pitch: 'empty',
      duration: 0 as NoteDuration,
      isDotted: false,
      isDoubleDotted: false,
      isTied: false,
      tieToNext: false,
      slurToNext: false,
      accidental: '',
      octave: 0,
      preGraceNotes: undefined,
      postGraceNotes: undefined,
      ...(matched.isMatch
        ? {
            lyric: {
              ...note.lyric,
              poj: syncText,
              hanlo: syncText,
              hanji: syncText,
              custom: syncText,
            },
          }
        : {}),
    };
  }
  return note;
}

/**
 * Normalizes all notes across all measures of a song to ensure zero-duration rules are strictly enforced.
 */
export function normalizeSongDurations(song: Song): Song {
  return {
    ...song,
    measures: (song.measures || []).map(m => ({
      ...m,
      notes: Array.isArray(m?.notes) ? m.notes.map(normalizeNoteDuration) : [],
      ...(Array.isArray(m?.obbligato) ? { obbligato: m.obbligato.map(normalizeNoteDuration) } : {}),
    })),
  };
}

/**
 * Calculate the total beats currently inside a measure's notes
 */
export function calculateMeasureBeats(notes: NumberedNotationNote[]): number {
  if (!notes || notes.length === 0) return 0;
  const total = notes.reduce((sum, n) => sum + getNoteBeatDuration(n), 0);
  return Math.round(total * 1000) / 1000;
}

/**
 * Calculate expected beats per measure according to the time signature (e.g. 4/4 -> 4, 3/4 -> 3, 6/8 -> 3, 2/4 -> 2)
 */
export function getExpectedMeasureBeats(timeSignature: string): number {
  if (!timeSignature) return 4;
  const parts = timeSignature.split('/');
  const num = parseInt(parts[0], 10) || 4;
  const den = parseInt(parts[1], 10) || 4;
  return Math.round(num * (4 / den) * 1000) / 1000;
}

/**
 * Integer quarter-note clicks per bar for metronome / chord grooves.
 * 4/4 → 4, 3/4 → 3, 6/8 → 3 (not 6 eighths).
 */
export function getPlaybackBeatsPerBar(timeSignature: string): number {
  return Math.max(1, Math.round(getExpectedMeasureBeats(timeSignature || '4/4')));
}

/**
 * Written duration of a measure in quarter-note beats (rests count; spacers do not).
 */
export function getWrittenPlaybackBeats(measure: Measure): number {
  let beats = 0;
  for (const note of measure?.notes || []) {
    if (!isNonNotationItem(note) && note.pitch !== 'empty' && note.duration > 0) {
      beats += note.duration;
    }
  }
  return beats;
}

/**
 * Playback length of a bar: written notes, padded up to the time-signature length
 * so an incomplete bar does not overlap the next downbeat.
 */
export function getPaddedMeasureBeats(measure: Measure, fallbackTimeSignature = '4/4'): number {
  const expected = getExpectedMeasureBeats(measure?.timeSignature || fallbackTimeSignature || '4/4');
  return Math.max(getWrittenPlaybackBeats(measure), expected);
}

export interface MeasureRhythmReport {
  currentBeats: number;
  expectedBeats: number;
  beatDiff: number; // positive = over-beat, negative = under-beat
  absDiff: number;
  isFull: boolean;
  isUnder: boolean;
  isOver: boolean;
  percentage: number; // 0 to 100+
}

/**
 * Comprehensive rhythm health check for a measure
 */
export function getMeasureRhythmReport(measure: Measure, fallbackTimeSignature = '4/4'): MeasureRhythmReport {
  const currentBeats = calculateMeasureBeats(measure?.notes || []);
  const timeSig = measure?.timeSignature || fallbackTimeSignature;
  const expectedBeats = getExpectedMeasureBeats(timeSig);
  const rawDiff = currentBeats - expectedBeats;
  const beatDiff = Math.round(rawDiff * 1000) / 1000;
  const absDiff = Math.abs(beatDiff);
  const isFull = absDiff < 0.001;
  const isUnder = beatDiff < -0.001;
  const isOver = beatDiff > 0.001;
  const percentage = expectedBeats > 0 ? Math.min(200, Math.round((currentBeats / expectedBeats) * 100)) : 100;

  return {
    currentBeats,
    expectedBeats,
    beatDiff,
    absDiff,
    isFull,
    isUnder,
    isOver,
    percentage,
  };
}

/**
 * Decompose a deficit in beats into a clean set of standard rest note durations
 * E.g. 1 -> [1], 0.5 -> [0.5], 1.5 -> [1, 0.5] or [1.5], 2 -> [2], 3 -> [2, 1] or [3]
 */
export function getRestDurationsForDeficit(deficit: number): NoteDuration[] {
  let remaining = Math.round(Math.abs(deficit) * 1000) / 1000;
  if (remaining <= 0) return [];

  // Match exact single rest values first
  const exactSupported: NoteDuration[] = [4, 3, 2, 1.5, 1, 0.75, 0.5, 0.375, 0.25, 0.125];
  if (exactSupported.includes(remaining)) {
    return [remaining];
  }

  const results: NoteDuration[] = [];
  const standardBeats = [4, 2, 1, 0.5, 0.25, 0.125];

  while (remaining >= 0.12) {
    let chosen: number | null = null;
    for (const b of standardBeats) {
      if (remaining >= b - 0.001) {
        chosen = b;
        break;
      }
    }
    if (chosen !== null) {
      results.push(chosen);
      remaining = Math.round((remaining - chosen) * 1000) / 1000;
    } else {
      break;
    }
  }

  return results.length > 0 ? results : [1];
}

export interface TaigiToneInfo {
  toneNumber: number;
  superscript: string; // e.g. '¹', '²', '³', '⁴', '⁵', '⁷', '⁸', '⁹'
  contour: string;     // e.g. '55', '51', '21', '32', '24', '33', '4', '55'
  symbol: string;      // e.g. '˥', '˥˩', '˨˩', '˨', '˨˦', '˧', '˦', '˥'
  name: string;        // e.g. 'Tone 1', 'Tone 2', 'Tone 3', etc.
}

/**
 * Extract Taiwanese Hokkien tone number and contour for learning aids.
 * Supports Pe̍h-ōe-jī (POJ), Tâi-lô (TL), and numeric tone notations.
 */
export function extractTaigiTone(syllable: string): TaigiToneInfo | null {
  if (!syllable || !syllable.trim()) return null;
  const s = syllable.trim();

  // If purely punctuation or CJK characters, return null
  if (/^[\p{P}\p{S}\s]+$/u.test(s) || /^[\u4e00-\u9fa5]+$/u.test(s)) return null;

  // 1. Check explicit digit tone (1-9) inside or at end of syllable
  const digitMatch = s.match(/([1-9])/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    return getToneInfoByNumber(num);
  }

  // 2. Decompose unicode (NFD) to check combining diacritics
  const nfd = s.normalize('NFD');

  // Tone 8: vertical line \u030D, or explicit ̍ or vertical dot / bar
  if (nfd.includes('\u030D') || nfd.includes('\u0308') || /\|/.test(s) || /[a-z]+̍/i.test(s)) {
    return getToneInfoByNumber(8);
  }
  // Tone 9: double acute \u030B
  if (nfd.includes('\u030B')) {
    return getToneInfoByNumber(9);
  }
  // Tone 2: acute \u0301 (á, é, í, ó, ú, ḿ, ńg)
  if (nfd.includes('\u0301')) {
    return getToneInfoByNumber(2);
  }
  // Tone 3: grave \u0300 (à, è, ì, ò, ù)
  if (nfd.includes('\u0300')) {
    return getToneInfoByNumber(3);
  }
  // Tone 5: circumflex \u0302 (â, ê, î, ô, û)
  if (nfd.includes('\u0302')) {
    return getToneInfoByNumber(5);
  }
  // Tone 7: macron \u0304 (ā, ē, ī, ō, ū, m̄, n̄g)
  if (nfd.includes('\u0304')) {
    return getToneInfoByNumber(7);
  }

  // 3. No diacritic: check coda (ends with p, t, k, h)
  const cleanAlpha = s.replace(/[^a-zA-Z]/g, '').toLowerCase();
  if (/[ptkh]$/.test(cleanAlpha)) {
    return getToneInfoByNumber(4);
  }

  // If contains English letters, default unchecked tone is Tone 1
  if (/[a-zA-Z]/.test(s)) {
    return getToneInfoByNumber(1);
  }

  return null;
}

function getToneInfoByNumber(num: number): TaigiToneInfo {
  switch (num) {
    case 1:
      return { toneNumber: 1, superscript: '¹', contour: '55', symbol: '˥', name: 'Tone 1' };
    case 2:
      return { toneNumber: 2, superscript: '²', contour: '51', symbol: '˥˩', name: 'Tone 2' };
    case 3:
      return { toneNumber: 3, superscript: '³', contour: '21', symbol: '˨˩', name: 'Tone 3' };
    case 4:
      return { toneNumber: 4, superscript: '⁴', contour: '32', symbol: '˨', name: 'Tone 4' };
    case 5:
      return { toneNumber: 5, superscript: '⁵', contour: '24', symbol: '˨˦', name: 'Tone 5' };
    case 6:
      return { toneNumber: 6, superscript: '⁶', contour: '22', symbol: '˨', name: 'Tone 6' };
    case 7:
      return { toneNumber: 7, superscript: '⁷', contour: '33', symbol: '˧', name: 'Tone 7' };
    case 8:
      return { toneNumber: 8, superscript: '⁸', contour: '4', symbol: '˦', name: 'Tone 8' };
    case 9:
      return { toneNumber: 9, superscript: '⁹', contour: '55', symbol: '˥', name: 'Tone 9' };
    default:
      return { toneNumber: num, superscript: `${num}`, contour: '', symbol: '', name: `Tone ${num}` };
  }
}

export interface DiatonicChordOption {
  chord: string;
  degree: string;
  label: string;
  colorClass: string;
}

/**
 * Generate diatonic chords for any key signature (I, ii, iii, IV, V, vi, vii°, V7)
 */
export function getDiatonicChords(key: KeySignature): DiatonicChordOption[] {
  const base = KEY_SEMITONES[key] ?? 0;
  const root = (offset: number) => getChordRootName(key, base + offset);

  return [
    {
      chord: root(0),
      degree: 'I',
      label: 'Tonic (I)',
      colorClass: 'bg-amber-100 hover:bg-amber-200 dark:bg-amber-950/60 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-300 border-amber-300 dark:border-amber-700',
    },
    {
      chord: `${root(2)}m`,
      degree: 'ii',
      label: 'Supertonic (ii)',
      colorClass: 'bg-blue-100 hover:bg-blue-200 dark:bg-blue-950/60 dark:hover:bg-blue-900/60 text-blue-900 dark:text-blue-300 border-blue-300 dark:border-blue-700',
    },
    {
      chord: `${root(4)}m`,
      degree: 'iii',
      label: 'Mediant (iii)',
      colorClass: 'bg-indigo-100 hover:bg-indigo-200 dark:bg-indigo-950/60 dark:hover:bg-indigo-900/60 text-indigo-900 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700',
    },
    {
      chord: root(5),
      degree: 'IV',
      label: 'Subdominant (IV)',
      colorClass: 'bg-emerald-100 hover:bg-emerald-200 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 text-emerald-900 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700',
    },
    {
      chord: root(7),
      degree: 'V',
      label: 'Dominant (V)',
      colorClass: 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-950/60 dark:hover:bg-orange-900/60 text-orange-900 dark:text-orange-300 border-orange-300 dark:border-orange-700',
    },
    {
      chord: `${root(9)}m`,
      degree: 'vi',
      label: 'Submediant (vi)',
      colorClass: 'bg-purple-100 hover:bg-purple-200 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 text-purple-900 dark:text-purple-300 border-purple-300 dark:border-purple-700',
    },
    {
      chord: `${root(7)}7`,
      degree: 'V7',
      label: 'Dominant 7th (V7)',
      colorClass: 'bg-rose-100 hover:bg-rose-200 dark:bg-rose-950/60 dark:hover:bg-rose-900/60 text-rose-900 dark:text-rose-300 border-rose-300 dark:border-rose-700',
    },
  ];
}

// Instrument labels and options
export const INSTRUMENT_LABELS: Record<InstrumentType, { en: string; zh: string }> = {
  piano: { en: 'Grand Piano', zh: 'Piano' },
  flute: { en: 'Bamboo Flute', zh: 'Flute' },
  whistle: { en: 'Whistle', zh: 'Whistle' },
  guitar: { en: 'Classic Guitar', zh: 'Guitar' },
  synth: { en: '80s Synth', zh: 'Synth' },
  bell: { en: 'Glockenspiel', zh: 'Bell' },
  cello: { en: 'Cello', zh: 'Cello' },
  guitar_acoustic: { en: 'Acoustic Guitar', zh: 'Folk Guitar' },
  accordion: { en: 'Accordion', zh: 'Accordion' },
  harmonica: { en: 'Harmonica', zh: 'Harmonica' },
  epiano_fm: { en: 'FM E-Piano', zh: 'E-Piano' },
  saxophone: { en: 'Saxophone', zh: 'Saxophone' },
  guitar_electric: { en: 'Clean E-Guitar', zh: 'E-Guitar' },
};

export interface InstrumentOption {
  value: InstrumentType;
  labelZh: string;
  labelEn: string;
  category: 'standard' | 'folk' | 'pop';
  badge?: string;
}

export const CATEGORIZED_INSTRUMENT_OPTIONS: {
  category: 'standard' | 'folk' | 'pop';
  labelEn: string;
  labelZh: string;
  options: InstrumentOption[];
}[] = [
  {
    category: 'standard',
    labelEn: 'Standard & Classical',
    labelZh: '經典與古典',
    options: [
      { value: 'piano', labelZh: '鋼琴 (Piano)', labelEn: 'Grand Piano', category: 'standard' },
      { value: 'flute', labelZh: '竹笛 (Flute)', labelEn: 'Bamboo Flute', category: 'standard' },
      { value: 'cello', labelZh: '大提琴 (Cello)', labelEn: 'Cello', category: 'standard' },
      { value: 'whistle', labelZh: '哨笛 (Whistle)', labelEn: 'Whistle', category: 'standard' },
      { value: 'bell', labelZh: '鐘琴 (Glockenspiel)', labelEn: 'Glockenspiel', category: 'standard' },
      { value: 'synth', labelZh: '合成器 (80s Synth)', labelEn: '80s Synth', category: 'standard' },
    ],
  },
  {
    category: 'folk',
    labelEn: 'Folk & Ballad',
    labelZh: '民謠與老歌',
    options: [
      { value: 'guitar_acoustic', labelZh: '民謠吉他 (Acoustic Guitar)', labelEn: 'Acoustic Guitar (Folk)', category: 'folk', badge: 'SoundFont' },
      { value: 'accordion', labelZh: '手風琴 (Accordion)', labelEn: 'Accordion (Musette)', category: 'folk', badge: 'SoundFont' },
      { value: 'harmonica', labelZh: '口琴 (Harmonica)', labelEn: 'Harmonica', category: 'folk', badge: 'SoundFont' },
      { value: 'guitar', labelZh: '古典吉他 (Classic Guitar)', labelEn: 'Classic Guitar', category: 'folk' },
    ],
  },
  {
    category: 'pop',
    labelEn: 'Modern Pop',
    labelZh: '當代流行',
    options: [
      { value: 'epiano_fm', labelZh: '流行電鋼琴 (FM E-Piano)', labelEn: 'FM E-Piano (DX7 Rhodes)', category: 'pop', badge: 'FM Synth' },
      { value: 'guitar_electric', labelZh: '電吉他 (Clean E-Guitar)', labelEn: 'Clean Electric Guitar', category: 'pop', badge: 'SoundFont' },
      { value: 'saxophone', labelZh: '薩克斯風 (Saxophone)', labelEn: 'Saxophone', category: 'pop', badge: 'SoundFont' },
    ],
  },
];

export const INSTRUMENT_OPTIONS: InstrumentOption[] = CATEGORIZED_INSTRUMENT_OPTIONS.flatMap(g => g.options);

export function getInstrumentCategory(inst: InstrumentType): 'standard' | 'folk' | 'pop' {
  for (const group of CATEGORIZED_INSTRUMENT_OPTIONS) {
    if (group.options.some(opt => opt.value === inst)) {
      return group.category;
    }
  }
  return 'standard';
}

/**
 * Extract all chords from a measure, supporting both measure.chords array and measure.chord string
 * (space-, dash-, pipe-, or comma-separated, e.g. "Bb F", "Bb - F", "C | G", "Dm, G7")
 */
export function getMeasureChords(measure?: Partial<Measure> | { chord?: string; chords?: string[] } | null): string[] {
  if (!measure) return [];
  if (Array.isArray(measure.chords) && measure.chords.length > 0) {
    const list = measure.chords.map(c => c.trim()).filter(Boolean);
    if (list.length > 0) return list;
  }
  if (measure.chord && typeof measure.chord === 'string') {
    return measure.chord
      .split(/[\s,\-|]+/)
      .map(c => c.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Format an array of chords for measure.chord string storage and clean display
 */
export function formatMeasureChords(chords: string[]): string {
  return chords.map(c => c.trim()).filter(Boolean).join(' ');
}

/**
 * Resolves the effective chords for a measure within a song:
 * 1. Checks if the measure directly specifies chords (e.g. measure.chords or measure.chord).
 *    If explicitly set to "N.C." / "NC", returns [] (intentional rest / no chord).
 * 2. Harmonic continuity: looks backward to preceding measures to find the currently active chord.
 * 3. Looks forward to subsequent measures (useful if pickup measures didn't define a chord).
 * 4. Falls back to Tonic (I) chord of the song key.
 */
export function getEffectiveMeasureChords(song: Song, measureIndex: number): string[] {
  if (!song || !Array.isArray(song.measures) || measureIndex < 0 || measureIndex >= song.measures.length) {
    return [];
  }

  const targetMeasure = song.measures[measureIndex];
  if (!targetMeasure) return [];

  // 1. Direct chords on target measure
  const directChords = getMeasureChords(targetMeasure);
  if (directChords.length > 0) {
    const isExplicitNoChord = directChords.some(c => {
      const u = c.trim().toUpperCase();
      return u === 'N.C.' || u === 'NC' || u === 'NONE';
    });
    if (isExplicitNoChord) return [];
    return directChords;
  }

  // 2. Look backward for currently active harmony (chords sustain until a new chord appears)
  for (let i = measureIndex - 1; i >= 0; i--) {
    const prevMeasure = song.measures[i];
    if (prevMeasure) {
      const prevChords = getMeasureChords(prevMeasure);
      if (prevChords.length > 0) {
        const isExplicitNoChord = prevChords.some(c => {
          const u = c.trim().toUpperCase();
          return u === 'N.C.' || u === 'NC' || u === 'NONE';
        });
        if (isExplicitNoChord) return [];
        return prevChords;
      }
    }
  }

  // 3. Look forward in case chords begin on a subsequent measure (e.g. after a lead-in/anacrusis)
  for (let i = measureIndex + 1; i < song.measures.length; i++) {
    const nextMeasure = song.measures[i];
    if (nextMeasure) {
      const nextChords = getMeasureChords(nextMeasure);
      if (nextChords.length > 0) {
        const isExplicitNoChord = nextChords.some(c => {
          const u = c.trim().toUpperCase();
          return u === 'N.C.' || u === 'NC' || u === 'NONE';
        });
        if (!isExplicitNoChord) return nextChords;
      }
    }
  }

  // 4. Fallback to Tonic (I) chord of the key signature
  const diatonic = getDiatonicChords(song.key || 'C');
  if (diatonic && diatonic.length > 0 && diatonic[0].chord) {
    return [diatonic[0].chord];
  }

  return [song.key || 'C'];
}

/**
 * Scales a note duration down by half (÷2), preserving dotted relationships and non-notation spacers.
 * e.g., 4 -> 2, 3 -> 1.5 (dotted), 2 -> 1, 1.5 -> 0.75 (dotted), 1 -> 0.5, 0.75 -> 0.375 (dotted), 0.5 -> 0.25, 0.25 -> 0.125
 */
export function halveNoteDuration(note: NumberedNotationNote): NumberedNotationNote {
  if (isNonNotationItem(note) || note.pitch === 'empty' || (typeof note.duration === 'number' && note.duration <= 0)) {
    return note;
  }
  const curDur = typeof note.duration === 'number' ? note.duration : 1;
  let nextDur: NoteDuration = 0.5;
  let isDotted = false;

  if (curDur >= 4) {
    nextDur = 2;
  } else if (curDur >= 3) {
    nextDur = 1.5;
    isDotted = true;
  } else if (curDur >= 2) {
    nextDur = 1;
  } else if (curDur >= 1.75) {
    nextDur = 0.75;
    isDotted = true;
  } else if (curDur >= 1.5) {
    nextDur = 0.75;
    isDotted = true;
  } else if (curDur >= 1) {
    nextDur = 0.5;
  } else if (curDur >= 0.75) {
    nextDur = 0.375;
    isDotted = true;
  } else if (curDur >= 0.5) {
    nextDur = 0.25;
  } else if (curDur >= 0.375) {
    nextDur = 0.125;
  } else if (curDur >= 0.25) {
    nextDur = 0.125;
  } else {
    nextDur = 0.125;
  }

  return {
    ...note,
    duration: nextDur,
    isDotted,
    isDoubleDotted: false,
  };
}

/**
 * Doubles a note duration (×2), preserving dotted relationships and non-notation spacers.
 * e.g., 0.125 -> 0.25, 0.25 -> 0.5, 0.375 -> 0.75 (dotted), 0.5 -> 1, 0.75 -> 1.5 (dotted), 1 -> 2, 1.5 -> 3 (dotted), 2 -> 4
 */
export function doubleNoteDuration(note: NumberedNotationNote): NumberedNotationNote {
  if (isNonNotationItem(note) || note.pitch === 'empty' || (typeof note.duration === 'number' && note.duration <= 0)) {
    return note;
  }
  const curDur = typeof note.duration === 'number' ? note.duration : 1;
  let nextDur: NoteDuration = 1;
  let isDotted = false;

  if (curDur <= 0.125) {
    nextDur = 0.25;
  } else if (curDur <= 0.25) {
    nextDur = 0.5;
  } else if (curDur <= 0.375) {
    nextDur = 0.75;
    isDotted = true;
  } else if (curDur <= 0.5) {
    nextDur = 1;
  } else if (curDur <= 0.75) {
    nextDur = 1.5;
    isDotted = true;
  } else if (curDur <= 1) {
    nextDur = 2;
  } else if (curDur <= 1.5) {
    nextDur = 3;
    isDotted = true;
  } else if (curDur <= 2) {
    nextDur = 4;
  } else {
    nextDur = 4;
  }

  return {
    ...note,
    duration: nextDur,
    isDotted,
    isDoubleDotted: false,
  };
}

/**
 * Sets uniform duration for a note, preserving lyrics, pitches, and zero-beat spacers.
 */
export function setUniformNoteDuration(note: NumberedNotationNote, targetDur: NoteDuration): NumberedNotationNote {
  if (isNonNotationItem(note) || note.pitch === 'empty' || (typeof note.duration === 'number' && note.duration <= 0)) {
    return note;
  }
  const isDotted = targetDur === 1.5 || targetDur === 0.75 || targetDur === 3 || targetDur === 0.375;
  const isDoubleDotted = targetDur === 1.75 || targetDur === 3.5;
  return {
    ...note,
    duration: targetDur,
    isDotted,
    isDoubleDotted,
  };
}

/**
 * Determines whether a measure (or set of measures) should toggle to 0.5 (8th note) or 1.0 (quarter note).
 * If most pitched/rest notes are >= 0.8, toggles to 0.5. Otherwise, toggles to 1.0.
 */
export function determineTargetQuarterEighthDuration(measures: Measure[]): 0.5 | 1.0 {
  let quarterOrHigherCount = 0;
  let eighthOrLowerCount = 0;

  for (const m of measures) {
    for (const n of m.notes) {
      if (isNonNotationItem(n) || n.pitch === 'empty' || (typeof n.duration === 'number' && n.duration <= 0)) continue;
      const dur = typeof n.duration === 'number' ? n.duration : 1;
      if (dur >= 0.8) {
        quarterOrHigherCount++;
      } else {
        eighthOrLowerCount++;
      }
    }
  }

  // If mostly quarter or longer, toggle to eighth note (0.5); else toggle to quarter note (1.0)
  return quarterOrHigherCount >= eighthOrLowerCount ? 0.5 : 1.0;
}

// ---------------------------------------------------------------------------
// Music Sheet Telemetry & Parameter Mutation Utilities (Key, Meter, BPM)
// ---------------------------------------------------------------------------

export const CHROMATIC_KEYS: KeySignature[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'
];

export const STANDARD_TIME_SIGNATURES: {
  value: TimeSignature;
  label: string;
  sublabel: string;
  beatsPerMeasure: number;
}[] = [
  { value: '4/4', label: '4/4', sublabel: 'Common Time (4 beats/measure)', beatsPerMeasure: 4 },
  { value: '3/4', label: '3/4', sublabel: 'Waltz (3 beats/measure)', beatsPerMeasure: 3 },
  { value: '2/4', label: '2/4', sublabel: 'March (2 beats/measure)', beatsPerMeasure: 2 },
  { value: '6/8', label: '6/8', sublabel: 'Compound Duple (3 beats/measure)', beatsPerMeasure: 3 },
];

export const TEMPO_PRESETS = [
  { bpm: 60, label: 'Lento (60 BPM)' },
  { bpm: 72, label: 'Andante (72 BPM)' },
  { bpm: 88, label: 'Andantino (88 BPM)' },
  { bpm: 108, label: 'Moderato (108 BPM)' },
  { bpm: 120, label: 'Allegro (120 BPM)' },
  { bpm: 144, label: 'Vivace (144 BPM)' },
];

/**
 * Transpose a single chord string by given semitones (e.g. "Bb" +2 -> "C", "Gm" +2 -> "Am", "Eb/G" +2 -> "F/A")
 */
export function transposeChordString(chordStr: string, semitones: number, targetKey?: KeySignature): string {
  if (!chordStr || semitones === 0) return chordStr;

  // Use flat naming when target key is conventional flat key
  const useFlats = targetKey ? ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb'].includes(targetKey) : false;
  const noteNames = useFlats
    ? ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    : ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  const transposeSingleRoot = (root: string): string => {
    const currentSemi = KEY_SEMITONES[root];
    if (currentSemi === undefined) return root;
    const newSemi = ((currentSemi + semitones) % 12 + 12) % 12;
    return noteNames[newSemi];
  };

  // Replace all note roots (e.g. "Bb", "Gm", "Eb/G", "Bb F")
  return chordStr.replace(/([A-G][#b]?)/g, match => {
    return transposeSingleRoot(match);
  });
}

/**
 * Transposes song chords across all measures when the key changes.
 */
export function transposeSongChords(song: Song, targetKey: KeySignature): Song {
  const fromKey = song.key || 'C';
  const fromSemi = KEY_SEMITONES[fromKey] ?? 0;
  const toSemi = KEY_SEMITONES[targetKey] ?? 0;
  const semitones = ((toSemi - fromSemi) % 12 + 12) % 12;

  if (semitones === 0) {
    return { ...song, key: targetKey };
  }

  const updatedMeasures = song.measures.map(m => {
    let newChord = m.chord;
    if (m.chord) {
      newChord = transposeChordString(m.chord, semitones, targetKey);
    }
    let newChords = m.chords;
    if (m.chords && Array.isArray(m.chords)) {
      newChords = m.chords.map(c => transposeChordString(c, semitones, targetKey));
    }
    return {
      ...m,
      chord: newChord,
      chords: newChords,
    };
  });

  return {
    ...song,
    key: targetKey,
    measures: updatedMeasures,
  };
}

/**
 * Automatically appends rest notes to fill deficit in an under-beat measure
 */
export function autoFillMeasureRest(measure: Measure, fallbackTimeSig = '4/4'): Measure {
  const report = getMeasureRhythmReport(measure, fallbackTimeSig);
  if (!report.isUnder) return measure;

  const deficit = report.expectedBeats - report.currentBeats;
  const restDurations = getRestDurationsForDeficit(deficit);
  if (restDurations.length === 0) return measure;

  const newNotes = [...measure.notes];
  restDurations.forEach((dur, idx) => {
    newNotes.push({
      id: `${measure.id}-rest-${Date.now()}-${idx}`,
      pitch: 0,
      octave: 0,
      duration: dur,
      lyric: {},
    });
  });

  return {
    ...measure,
    notes: newNotes,
  };
}

/**
 * Automatically fills deficits across all measures in the song.
 */
export function autoFillSongMeasureRests(song: Song): Song {
  const updatedMeasures = song.measures.map(m =>
    autoFillMeasureRest(m, song.timeSignature || '4/4')
  );
  return {
    ...song,
    measures: updatedMeasures,
  };
}

/**
 * Smart re-bars all notes in the song according to the target time signature.
 * Redistributes notes across measures so each measure has targetBeats beats.
 */
export function smartRebarSong(song: Song, targetTimeSignature: TimeSignature): Song {
  const targetBeats = getExpectedMeasureBeats(targetTimeSignature);
  if (targetBeats <= 0) return { ...song, timeSignature: targetTimeSignature };

  const sectionMap = new Map<number, string>();
  const chordMap = new Map<number, string>();
  const allNotes: NumberedNotationNote[] = [];

  song.measures.forEach(m => {
    if (m.section && m.section.trim()) {
      sectionMap.set(allNotes.length, m.section.trim());
    }
    if (m.chord && m.chord.trim()) {
      chordMap.set(allNotes.length, m.chord.trim());
    }
    m.notes.forEach(n => {
      allNotes.push({ ...n });
    });
  });

  const newMeasures: Measure[] = [];
  let currentMeasureNotes: NumberedNotationNote[] = [];
  let currentMeasureBeats = 0;
  let currentMeasureSection: string | undefined = undefined;
  let currentMeasureChord: string | undefined = undefined;

  for (let i = 0; i < allNotes.length; i++) {
    const note = allNotes[i];
    if (sectionMap.has(i)) {
      currentMeasureSection = sectionMap.get(i);
    }
    if (chordMap.has(i)) {
      currentMeasureChord = chordMap.get(i);
    }

    const noteDur =
      isNonNotationItem(note) || note.pitch === 'empty'
        ? 0
        : typeof note.duration === 'number'
        ? note.duration
        : 1;

    if (noteDur <= 0) {
      currentMeasureNotes.push(note);
      continue;
    }

    const remainingBeats = Math.round((targetBeats - currentMeasureBeats) * 1000) / 1000;

    if (noteDur <= remainingBeats + 0.001) {
      currentMeasureNotes.push(note);
      currentMeasureBeats = Math.round((currentMeasureBeats + noteDur) * 1000) / 1000;

      if (Math.abs(currentMeasureBeats - targetBeats) < 0.001) {
        newMeasures.push({
          id: `rebar-m-${Date.now()}-${newMeasures.length + 1}`,
          measureNumber: newMeasures.length + 1,
          section: currentMeasureSection,
          chord: currentMeasureChord || (newMeasures[newMeasures.length - 1]?.chord ?? 'C'),
          notes: currentMeasureNotes,
        });
        currentMeasureNotes = [];
        currentMeasureBeats = 0;
        currentMeasureSection = undefined;
        currentMeasureChord = undefined;
      }
    } else {
      if (remainingBeats > 0.12) {
        const splitDur1 = remainingBeats;
        const splitDur2 = Math.round((noteDur - remainingBeats) * 1000) / 1000;

        const part1: NumberedNotationNote = {
          ...note,
          id: `${note.id}-p1`,
          duration: splitDur1,
          isDotted: splitDur1 === 1.5 || splitDur1 === 0.75 || splitDur1 === 3,
          isDoubleDotted: splitDur1 === 1.75 || splitDur1 === 3.5,
          tieToNext: true,
          slurToNext: false,
        };

        const part2: NumberedNotationNote = {
          ...note,
          id: `${note.id}-p2`,
          duration: splitDur2,
          isDotted: splitDur2 === 1.5 || splitDur2 === 0.75 || splitDur2 === 3,
          isDoubleDotted: splitDur2 === 1.75 || splitDur2 === 3.5,
          lyric: {},
        };

        currentMeasureNotes.push(part1);
        newMeasures.push({
          id: `rebar-m-${Date.now()}-${newMeasures.length + 1}`,
          measureNumber: newMeasures.length + 1,
          section: currentMeasureSection,
          chord: currentMeasureChord || (newMeasures[newMeasures.length - 1]?.chord ?? 'C'),
          notes: currentMeasureNotes,
        });

        currentMeasureNotes = [part2];
        currentMeasureBeats = splitDur2;
        currentMeasureSection = undefined;
        currentMeasureChord = undefined;
      } else {
        if (currentMeasureNotes.length > 0) {
          newMeasures.push({
            id: `rebar-m-${Date.now()}-${newMeasures.length + 1}`,
            measureNumber: newMeasures.length + 1,
            section: currentMeasureSection,
            chord: currentMeasureChord || (newMeasures[newMeasures.length - 1]?.chord ?? 'C'),
            notes: currentMeasureNotes,
          });
        }
        currentMeasureNotes = [note];
        currentMeasureBeats = noteDur;
        currentMeasureSection = undefined;
        currentMeasureChord = undefined;
      }
    }
  }

  if (currentMeasureNotes.length > 0) {
    newMeasures.push({
      id: `rebar-m-${Date.now()}-${newMeasures.length + 1}`,
      measureNumber: newMeasures.length + 1,
      section: currentMeasureSection,
      chord: currentMeasureChord || (newMeasures[newMeasures.length - 1]?.chord ?? 'C'),
      notes: currentMeasureNotes,
    });
  }

  return {
    ...song,
    timeSignature: targetTimeSignature,
    measures: newMeasures.length > 0 ? newMeasures : song.measures,
  };
}

/**
 * Automatically rearranges all measures to strictly match the song's current time signature.
 */
export function autoRearrangeSongMeasures(song: Song): Song {
  return smartRebarSong(song, song.timeSignature || '4/4');
}

/**
 * Automatically wraps measures into balanced, publication-grade systems
 * to guarantee that all measures comfortably fit within the realistic sheet paper.
 * 
 * Takes into account:
 * - Base measures per line target (defaults to song.notesPerLine or 4)
 * - Measure complexity (note counts, 16th/32nd note density, multi-verse lyrics, obbligato)
 * - Section transitions (e.g. Intro, Verse, Chorus)
 * - Ending barlines and volta repeat endings
 */
export function autoWrapSongMeasures(
  song: Song,
  targetMeasuresPerLine?: number,
  orientation?: SheetOrientation
): Song {
  if (!song.measures || song.measures.length <= 1) {
    return song;
  }

  const effectiveOrientation = orientation || song.orientation || 'portrait';
  const defaultTarget = effectiveOrientation === 'landscape' ? 5 : 4;
  const effectiveTarget =
    targetMeasuresPerLine ??
    (effectiveOrientation === 'landscape' && (song.notesPerLine === 4 || !song.notesPerLine)
      ? 5
      : effectiveOrientation === 'portrait' && song.notesPerLine === 5
      ? 4
      : (song.notesPerLine ?? defaultTarget));
  const baseCapacity = Math.max(
    2,
    Math.min(
      effectiveOrientation === 'landscape' ? 8 : 6,
      effectiveTarget
    )
  );
  const newMeasures = song.measures.map(m => ({ ...m }));

  // Helper to compute visual density weight of a measure
  const getMeasureDensity = (m: Measure): number => {
    let weight = 1.0;
    const noteCount = m.notes ? m.notes.length : 0;

    // Dense note passages (e.g. 16th or 32nd runs, 8+ notes)
    if (noteCount >= 12) weight += 1.2;
    else if (noteCount >= 8) weight += 0.8;
    else if (noteCount >= 6) weight += 0.4;
    else if (noteCount <= 2) weight -= 0.2;

    // Syllable text length & multi-verse lyrics
    if (m.notes) {
      let maxVerseCount = 0;
      let hasLongWords = false;
      for (const n of m.notes) {
        if (n.lyricsByVerse) {
          const vKeys = Object.keys(n.lyricsByVerse);
          if (vKeys.length > maxVerseCount) maxVerseCount = vKeys.length;
          for (const vk of vKeys) {
            const v = n.lyricsByVerse[Number(vk)];
            const len = (v?.hanlo?.length || v?.hanji?.length || v?.custom?.length || 0) + (v?.poj?.length || v?.tl?.length || 0);
            if (len > 6) hasLongWords = true;
            if (len > 12) weight += 0.5; // Very long romanized words (e.g. chháichhengchltug)
          }
        }
        const textLen = (n.lyric?.hanlo?.length || 0) + (n.lyric?.poj?.length || 0);
        if (textLen > 6) hasLongWords = true;
        if (textLen > 12) weight += 0.5;
      }
      if (maxVerseCount >= 3) weight += 0.5;
      else if (maxVerseCount >= 2) weight += 0.25;
      if (hasLongWords) weight += 0.3;
    }

    // Obbligato counterpoint layer
    if ((m.obbligato && m.obbligato.length > 0) || (m.obbligatoText && m.obbligatoText.trim().length > 0)) {
      weight += 0.4;
    }

    // Prelude / Interlude parentheses
    if (m.isPrelude) {
      weight += 0.2;
    }

    return weight;
  };

  // Build systems dynamically
  let currentSystemMeasures: number[] = [];
  let currentSystemWeight = 0;
  const maxLineWeight = baseCapacity * (effectiveOrientation === 'landscape' ? 1.4 : 1.15);

  for (let i = 0; i < newMeasures.length; i++) {
    const m = newMeasures[i];
    const mWeight = getMeasureDensity(m);
    const isFirstInLine = currentSystemMeasures.length === 0;

    // Check if measure starts a major section (and we already have at least 2 measures in the line)
    const hasSection = Boolean(m.section && m.section.trim());
    const shouldBreakBeforeSection = !isFirstInLine && hasSection && currentSystemMeasures.length >= 2;

    const wouldExceedCapacity = currentSystemMeasures.length >= baseCapacity;
    const wouldExceedWeight =
      !isFirstInLine && currentSystemWeight + mWeight > maxLineWeight && currentSystemMeasures.length >= 2;

    if (shouldBreakBeforeSection || wouldExceedCapacity || wouldExceedWeight) {
      // Mark line break on previous measure
      const prevIdx = currentSystemMeasures[currentSystemMeasures.length - 1];
      newMeasures[prevIdx].isLineBreak = true;

      // Start new system with current measure
      currentSystemMeasures = [i];
      currentSystemWeight = mWeight;
    } else {
      currentSystemMeasures.push(i);
      currentSystemWeight += mWeight;
    }

    // Check if current measure is the end of a repeat/section barline
    const hasEndBarline = m.barlineType === 'end' || m.barlineType === 'repeat_end';
    if (hasEndBarline && i < newMeasures.length - 1 && currentSystemMeasures.length >= 2) {
      newMeasures[i].isLineBreak = true;
      currentSystemMeasures = [];
      currentSystemWeight = 0;
      continue;
    }

    // Reset line break on current measure if not chosen as system end
    newMeasures[i].isLineBreak = false;
  }

  // Ensure last measure does not have an unnecessary trailing line break
  if (newMeasures.length > 0) {
    newMeasures[newMeasures.length - 1].isLineBreak = false;
  }

  return {
    ...song,
    orientation: effectiveOrientation,
    notesPerLine: effectiveTarget,
    measures: newMeasures,
    updatedAt: Date.now(),
  };
}

/**
 * Calculates how many parallel verses (1 to 5) are active/present in the song.
 */
export function getSongVerseCount(song: Song): number {
  if (typeof song.verseCount === 'number' && song.verseCount >= 1) {
    return Math.min(5, Math.max(1, Math.round(song.verseCount)));
  }

  let maxVerse = 1;
  for (const m of song.measures || []) {
    for (const n of m.notes || []) {
      if (n.lyricsByVerse) {
        for (const k of Object.keys(n.lyricsByVerse)) {
          const vNum = parseInt(k, 10);
          if (!isNaN(vNum) && vNum >= 1 && vNum <= 5) {
            const syl = n.lyricsByVerse[vNum];
            if (syl && (syl.hanlo?.trim() || syl.poj?.trim() || syl.hanji?.trim() || syl.custom?.trim())) {
              if (vNum > maxVerse) maxVerse = vNum;
            }
          }
        }
      }
    }
  }
  return Math.min(5, maxVerse);
}

/**
 * Retrieves the display option for verses: 'hanlo', 'poj', 'both_poj_top' (POJ on top), or 'both_hanlo_top' (Hàn-lô on top).
 * All verses share the same unified setting.
 * Defaults to 'both_poj_top'.
 */
export function getVerseDisplayOption(song: Song, _verseIndex?: number): VerseDisplayOption {
  const globalSetting = song.verseDisplayOption;
  if (globalSetting) {
    if (globalSetting === 'both') return 'both_poj_top';
    return globalSetting;
  }
  const legacySetting = song.verseSettings?.[1]?.displayOption;
  if (legacySetting) {
    if (legacySetting === 'both') return 'both_poj_top';
    return legacySetting;
  }
  return 'both_poj_top';
}

/**
 * Retrieves the LyricSyllable for a specific verse index (1 to 5) from a note.
 */
export function getNoteVerseSyllable(note: NumberedNotationNote, verseIndex: number): LyricSyllable {
  if (verseIndex === 1) {
    return {
      ...(note.lyric || {}),
      ...(note.lyricsByVerse?.[1] || {}),
      hanlo: note.lyricsByVerse?.[1]?.hanlo ?? note.lyric?.hanlo ?? note.lyric?.hanji ?? note.lyric?.custom ?? '',
      poj: note.lyricsByVerse?.[1]?.poj ?? note.lyric?.poj ?? note.lyric?.tl ?? '',
    };
  }
  return note.lyricsByVerse?.[verseIndex] || {};
}

export interface MeasureBeatBudget {
  currentBeats: number;
  expectedBeats: number;
  remainingBeats: number;
  isFull: boolean;
  isDeficit: boolean;
  isOverbeat: boolean;
  beatProgressPercent: number;
  beatIndicators: ('filled' | 'partial' | 'empty')[];
}

/**
 * Real-time rhythm budget calculator for a measure against its time signature.
 */
export function getMeasureBeatBudget(
  measure: Measure,
  fallbackTimeSignature: TimeSignature | string = '4/4'
): MeasureBeatBudget {
  const currentBeats = calculateMeasureBeats(measure?.notes || []);
  const timeSig = measure?.timeSignature || fallbackTimeSignature;
  const expectedBeats = getExpectedMeasureBeats(timeSig);
  const rawDiff = expectedBeats - currentBeats;
  const remainingBeats = Math.round(rawDiff * 1000) / 1000;
  const isFull = Math.abs(remainingBeats) < 0.001;
  const isDeficit = remainingBeats > 0.001;
  const isOverbeat = remainingBeats < -0.001;
  const beatProgressPercent =
    expectedBeats > 0
      ? Math.min(200, Math.max(0, Math.round((currentBeats / expectedBeats) * 100)))
      : 100;

  const numIndicators = Math.max(1, Math.round(expectedBeats));
  const beatIndicators: ('filled' | 'partial' | 'empty')[] = [];
  for (let i = 0; i < numIndicators; i++) {
    if (currentBeats >= i + 1 - 0.001) {
      beatIndicators.push('filled');
    } else if (currentBeats > i + 0.001) {
      beatIndicators.push('partial');
    } else {
      beatIndicators.push('empty');
    }
  }

  return {
    currentBeats,
    expectedBeats,
    remainingBeats,
    isFull,
    isDeficit,
    isOverbeat,
    beatProgressPercent,
    beatIndicators,
  };
}

/**
 * Calculates missing beats in a measure and appends standard rest notes to fill the bar.
 */
export function fillMeasureDeficitWithRests(
  measure: Measure,
  fallbackTimeSignature: TimeSignature | string = '4/4'
): Measure {
  const budget = getMeasureBeatBudget(measure, fallbackTimeSignature);
  if (!budget.isDeficit || budget.remainingBeats <= 0) {
    return measure;
  }

  const restDurations = getRestDurationsForDeficit(budget.remainingBeats);
  const newNotes = [...(measure.notes || [])];

  for (const duration of restDurations) {
    newNotes.push({
      id: `rest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pitch: 0,
      octave: 0,
      duration,
      lyric: {},
    });
  }

  return {
    ...measure,
    notes: newNotes,
  };
}

/**
 * Distributes raw lyric text across subsequent notes starting from a specific measure and note index.
 * Handles Taiwanese Han-lo, Romanization (POJ/TL), hyphens, and multi-verse slots.
 */
export function distributeLyricsAcrossNotes(
  rawText: string,
  song: Song,
  startMeasureIdx: number = 0,
  startNoteIdx: number = 0,
  verseIndex: number = 1,
  field: 'roman' | 'hanlo' | 'auto' = 'auto'
): Song {
  if (!rawText || !rawText.trim()) return song;
  const syllables = splitTaigiLyricSyllables(rawText);
  if (syllables.length === 0) return song;

  // Deep clone measures
  const newMeasures = song.measures.map(m => ({
    ...m,
    notes: m.notes.map(note => ({
      ...note,
      lyric: { ...note.lyric },
      ...(note.lyricsByVerse
        ? {
            lyricsByVerse: Object.fromEntries(
              Object.entries(note.lyricsByVerse).map(([k, v]) => [k, { ...v }])
            ),
          }
        : {}),
    })),
  }));

  let sylIdx = 0;
  let started = false;

  for (let mIdx = 0; mIdx < newMeasures.length; mIdx++) {
    const m = newMeasures[mIdx];
    for (let nIdx = 0; nIdx < m.notes.length; nIdx++) {
      if (!started) {
        if (mIdx === startMeasureIdx && nIdx >= startNoteIdx) {
          started = true;
        } else if (mIdx > startMeasureIdx) {
          started = true;
        } else {
          continue;
        }
      }

      if (sylIdx >= syllables.length) break;

      const note = m.notes[nIdx];
      const isNonNotation = isNonNotationItem(note);
      const syl = syllables[sylIdx];
      const isTokenPunct = isPunctuationOrSpacer(syl);

      // Skip non-notation spacers/rests unless token is punctuation
      if (isNonNotation && !isTokenPunct) {
        continue;
      }

      sylIdx++;

      // Determine whether syllable should go into roman or hanlo
      let targetType: 'roman' | 'hanlo' = 'roman';
      if (field === 'roman') {
        targetType = 'roman';
      } else if (field === 'hanlo') {
        targetType = 'hanlo';
      } else {
        const hasHan = /[\u4e00-\u9fa5\u3400-\u4dbf]/.test(syl);
        targetType = hasHan ? 'hanlo' : 'roman';
      }

      if (verseIndex === 1) {
        if (targetType === 'roman') {
          note.lyric.poj = syl;
        } else {
          note.lyric.hanlo = syl;
        }
      }

      if (!note.lyricsByVerse) {
        note.lyricsByVerse = {};
      }
      if (!note.lyricsByVerse[verseIndex]) {
        note.lyricsByVerse[verseIndex] = {};
      }
      if (targetType === 'roman') {
        note.lyricsByVerse[verseIndex].poj = syl;
      } else {
        note.lyricsByVerse[verseIndex].hanlo = syl;
      }
    }
    if (sylIdx >= syllables.length) break;
  }

  return normalizeSongDurations({
    ...song,
    measures: newMeasures,
  });
}

export interface ApplyLyricTokensOptions {
  startMeasureIdx?: number;
  startNoteIdx?: number;
  verseIndex?: number;
}

/**
 * Writes lyric tokens onto notes without flattening POJ and Hàn-lô into one field.
 * Dual tokens keep both `poj` and `hanlo`. A verseIndex > 1 writes only that
 * lyricsByVerse slot and leaves other verses untouched.
 */
export function applyLyricTokensToSong(
  song: Song,
  tokens: LyricSyllable[],
  options: ApplyLyricTokensOptions = {}
): Song {
  if (!tokens.length) return song;

  const startMeasureIdx = options.startMeasureIdx ?? 0;
  const startNoteIdx = options.startNoteIdx ?? 0;
  const verseIndex = Math.max(1, Math.round(options.verseIndex ?? 1));

  const newMeasures = song.measures.map(m => ({
    ...m,
    notes: m.notes.map(note => ({
      ...note,
      lyric: { ...note.lyric },
      ...(note.lyricsByVerse
        ? {
            lyricsByVerse: Object.fromEntries(
              Object.entries(note.lyricsByVerse).map(([k, v]) => [k, { ...v }])
            ),
          }
        : {}),
    })),
  }));

  let tokIdx = 0;
  let started = false;

  for (let mIdx = 0; mIdx < newMeasures.length; mIdx++) {
    const m = newMeasures[mIdx];
    for (let nIdx = 0; nIdx < m.notes.length; nIdx++) {
      if (!started) {
        if (mIdx === startMeasureIdx && nIdx >= startNoteIdx) {
          started = true;
        } else if (mIdx > startMeasureIdx) {
          started = true;
        } else {
          continue;
        }
      }

      if (tokIdx >= tokens.length) break;

      const note = m.notes[nIdx];
      const tok = tokens[tokIdx];
      const isNonNotation = isNonNotationItem(note);
      const isTokenPunct = isPunctuationOrSpacer(
        tok.hanlo || tok.hanji || tok.custom || tok.poj || tok.tl || ''
      );

      if (isNonNotation && !isTokenPunct) {
        continue;
      }

      tokIdx++;

      const targetHanlo =
        tok.hanlo !== undefined ? tok.hanlo : tok.hanji !== undefined ? tok.hanji : tok.custom;
      const targetPoj = tok.poj !== undefined ? tok.poj : tok.tl;

      const patch: LyricSyllable = {};
      if (targetHanlo !== undefined) patch.hanlo = targetHanlo;
      if (targetPoj !== undefined) patch.poj = targetPoj;

      if (verseIndex === 1) {
        note.lyric = {
          ...note.lyric,
          ...patch,
        };
      }

      if (!note.lyricsByVerse) {
        note.lyricsByVerse = {};
      }
      if (!note.lyricsByVerse[verseIndex]) {
        note.lyricsByVerse[verseIndex] = {};
      }
      note.lyricsByVerse[verseIndex] = {
        ...note.lyricsByVerse[verseIndex],
        ...patch,
      };

      if (isTokenPunct && isNonNotation) {
        note.pitch = 'empty';
        note.duration = 0 as NoteDuration;
      }
    }
    if (tokIdx >= tokens.length) break;
  }

  return normalizeSongDurations({
    ...song,
    measures: newMeasures,
  });
}

