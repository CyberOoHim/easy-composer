import type {
  KeySignature,
  PitchNumber,
  InstrumentType,
  Measure,
  Song,
  TimeSignature,
} from '@/types/song';

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

export const FLAT_KEY_NAMES = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db']);
export const ROOT_NAME_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'] as const;
export const ROOT_NAME_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;

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
  flute: { en: 'Flute', zh: 'Flute / 長笛' },
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
  kalimba: { en: 'Kalimba', zh: 'Kalimba / 卡林巴琴' },
  music_box: { en: 'Music Box', zh: 'Music Box / 音樂盒' },
  'music-box': { en: 'Music Box', zh: 'Music Box / 音樂盒' },
  choir_aahs: { en: 'Choir Aahs', zh: 'Choir (Aahs) / 人聲合唱' },
  voice_oohs: { en: 'Vocal Oohs / Solfège Guide', zh: 'Voice (Oohs) / 唱名導唱' },
};

export interface InstrumentOption {
  value: InstrumentType;
  labelZh: string;
  labelEn: string;
  shortLabelEn?: string;
  category: 'standard' | 'folk' | 'pop' | 'vocal';
  badge?: string;
}

export const CATEGORIZED_INSTRUMENT_OPTIONS: {
  category: 'standard' | 'folk' | 'pop' | 'vocal';
  labelEn: string;
  labelZh: string;
  options: InstrumentOption[];
}[] = [
  {
    category: 'standard',
    labelEn: 'Standard',
    labelZh: '經典與古典',
    options: [
      { value: 'piano', labelZh: '鋼琴 (Piano)', labelEn: 'Piano', shortLabelEn: 'Piano', category: 'standard' },
      { value: 'flute', labelZh: '長笛 / 竹笛 (Flute)', labelEn: 'Flute', shortLabelEn: 'Flute', category: 'standard', badge: 'SoundFont' },
      { value: 'music_box', labelZh: '音樂盒 (Music Box)', labelEn: 'Music Box', shortLabelEn: 'Music Box', category: 'standard', badge: 'SoundFont' },
      { value: 'cello', labelZh: '大提琴 (Cello)', labelEn: 'Cello', shortLabelEn: 'Cello', category: 'standard' },
      { value: 'whistle', labelZh: '哨笛 (Whistle)', labelEn: 'Whistle', shortLabelEn: 'Whistle', category: 'standard' },
      { value: 'bell', labelZh: '鐘琴 (Glockenspiel)', labelEn: 'Glockenspiel', shortLabelEn: 'Bell', category: 'standard' },
      { value: 'synth', labelZh: '合成器 (80s Synth)', labelEn: '80s Synth', shortLabelEn: 'Synth', category: 'standard' },
    ],
  },
  {
    category: 'folk',
    labelEn: 'Folk',
    labelZh: '民謠與老歌',
    options: [
      { value: 'guitar_acoustic', labelZh: '民謠吉他 (Acoustic Guitar)', labelEn: 'Acoustic Guitar', shortLabelEn: 'Acoustic Gtr', category: 'folk', badge: 'SoundFont' },
      { value: 'kalimba', labelZh: '卡林巴琴 (Kalimba)', labelEn: 'Kalimba', shortLabelEn: 'Kalimba', category: 'folk', badge: 'SoundFont' },
      { value: 'accordion', labelZh: '手風琴 (Accordion)', labelEn: 'Accordion', shortLabelEn: 'Accordion', category: 'folk', badge: 'SoundFont' },
      { value: 'harmonica', labelZh: '口琴 (Harmonica)', labelEn: 'Harmonica', shortLabelEn: 'Harmonica', category: 'folk', badge: 'SoundFont' },
      { value: 'guitar', labelZh: '古典吉他 (Classic Guitar)', labelEn: 'Classic Guitar', shortLabelEn: 'Classic Gtr', category: 'folk' },
    ],
  },
  {
    category: 'pop',
    labelEn: 'Pop',
    labelZh: '當代流行',
    options: [
      { value: 'epiano_fm', labelZh: '流行電鋼琴 (FM E-Piano)', labelEn: 'FM E-Piano', shortLabelEn: 'FM E-Piano', category: 'pop', badge: 'FM Synth' },
      { value: 'guitar_electric', labelZh: '電吉他 (Clean E-Guitar)', labelEn: 'Clean E-Guitar', shortLabelEn: 'E-Guitar', category: 'pop', badge: 'SoundFont' },
      { value: 'saxophone', labelZh: '薩克斯風 (Saxophone)', labelEn: 'Saxophone', shortLabelEn: 'Saxophone', category: 'pop', badge: 'SoundFont' },
    ],
  },
  {
    category: 'vocal',
    labelEn: 'Vocal & Solfège',
    labelZh: '人聲與導唱',
    options: [
      { value: 'choir_aahs', labelZh: '人聲合唱 (Choir Aahs "啊")', labelEn: 'Choir Aahs', shortLabelEn: 'Choir Aahs', category: 'vocal', badge: 'SoundFont' },
      { value: 'voice_oohs', labelZh: '人聲哼唱 / 導唱 (Vocal Oohs "嗚")', labelEn: 'Vocal Oohs / Solfège', shortLabelEn: 'Vocal Oohs', category: 'vocal', badge: 'SoundFont' },
    ],
  },
];

export const INSTRUMENT_OPTIONS: InstrumentOption[] = CATEGORIZED_INSTRUMENT_OPTIONS.flatMap(g => g.options);

export function getInstrumentCategory(inst: InstrumentType): 'standard' | 'folk' | 'pop' | 'vocal' {
  for (const group of CATEGORIZED_INSTRUMENT_OPTIONS) {
    if (group.options.some(opt => opt.value === inst)) {
      return group.category;
    }
  }
  return 'standard';
}

/**
 * Extract all chords from a measure, supporting both measure.chords array and measure.chord string
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
 * 1. Checks if the measure directly specifies chords.
 * 2. Harmonic continuity: looks backward to preceding measures.
 * 3. Looks forward to subsequent measures.
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

  // 2. Look backward for currently active harmony
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

  // 3. Look forward in case chords begin on a subsequent measure
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
