import type {
  KeySignature,
  NumberedNotationNote,
  PitchNumber,
  Song,
  TimeSignature,
  NoteDuration,
  GraceNote,
} from '../types/song.ts';
import { getExpectedMeasureBeats, KEY_SEMITONES, getChordRootName } from './taigiUtils.ts';
import { getDiatonicCandidateChords } from './chordArranger.ts';

export interface ChordProgressionPreset {
  id: string;
  name: string;
  category: 'ballad' | 'folk' | 'classical' | 'pop';
  degrees: string[];
  description: string;
}

export const CHORD_PROGRESSION_PRESETS: ChordProgressionPreset[] = [
  {
    id: 'pop_ballad',
    name: 'Pop Ballad (I - V - vi - IV)',
    category: 'ballad',
    degrees: ['I', 'V', 'vi', 'IV'],
    description: 'The iconic 4-chord emotional progression heard across contemporary Asian ballads.',
  },
  {
    id: 'taiwanese_folk_minor',
    name: 'Taiwanese Folk Minor (vi - ii - V - vi)',
    category: 'folk',
    degrees: ['vi', 'ii', 'V', 'vi'],
    description: 'Melancholic Yu-mode folk foundation characteristic of Taiwanese classics.',
  },
  {
    id: 'doo_wop',
    name: '50s Doo-Wop (I - vi - IV - V)',
    category: 'pop',
    degrees: ['I', 'vi', 'IV', 'V'],
    description: 'Classic nostalgic progression with harmonic movement through subdominant & dominant.',
  },
  {
    id: 'pachelbel_canon',
    name: 'Canon Sequence (I - V - vi - iii - IV - I - IV - V)',
    category: 'classical',
    degrees: ['I', 'V', 'vi', 'iii', 'IV', 'I', 'IV', 'V'],
    description: 'Pachelbel descending bass sequence adapted widely in Taiwanese campus folk.',
  },
  {
    id: 'folk_cadence',
    name: 'Folk Cadence (I - IV - I - V)',
    category: 'folk',
    degrees: ['I', 'IV', 'I', 'V'],
    description: 'Traditional pentatonic and pastoral structure with strong tonal grounding.',
  },
  {
    id: 'royal_road',
    name: 'Royal Road (IV - V - iii - vi)',
    category: 'pop',
    degrees: ['IV', 'V', 'iii', 'vi'],
    description: 'Royal Road progression: widely praised emotive harmonic driver in modern East Asian melodies.',
  },
];

/**
 * Resolves the appropriate diatonic chord name for a key and roman numeral degree.
 */
export function getDiatonicChordForDegree(key: KeySignature, degree: string): string {
  const candidates = getDiatonicCandidateChords(key);
  const normalizedDegree = degree.trim();
  const match = candidates.find(c => c.degree.toLowerCase() === normalizedDegree.toLowerCase());
  if (match) return match.chord;

  // Fallbacks if not found directly
  switch (normalizedDegree.toUpperCase()) {
    case 'I':
      return candidates.find(c => c.degree === 'I')?.chord || 'C';
    case 'II':
    case 'IIM':
      return candidates.find(c => c.degree === 'ii')?.chord || 'Dm';
    case 'III':
    case 'IIIM':
      return candidates.find(c => c.degree === 'iii')?.chord || 'Em';
    case 'IV':
      return candidates.find(c => c.degree === 'IV')?.chord || 'F';
    case 'V':
      return candidates.find(c => c.degree === 'V')?.chord || 'G';
    case 'VI':
    case 'VIM':
      return candidates.find(c => c.degree === 'vi')?.chord || 'Am';
    case 'VII':
    case 'VIIDIM': {
      // Leading-tone dim is omitted from getDiatonicCandidateChords so auto-accompaniment scoring stays I–vi.
      const base = KEY_SEMITONES[key] ?? 0;
      return `${getChordRootName(key, base + 11)}dim`;
    }
    default:
      return candidates[0]?.chord || 'C';
  }
}

/**
 * Applies a selected chord progression preset sequentially to measures starting from startMeasureIdx.
 */
export function applyChordProgression(
  song: Song,
  progressionId: string,
  startMeasureIdx: number = 0
): Song {
  const preset = CHORD_PROGRESSION_PRESETS.find(p => p.id === progressionId);
  if (!preset || !song.measures || song.measures.length === 0) return song;

  const key = song.key || 'C';
  const chords = preset.degrees.map(deg => getDiatonicChordForDegree(key, deg));

  const newMeasures = song.measures.map((m, idx) => {
    if (idx < startMeasureIdx) return m;
    const chordIdx = (idx - startMeasureIdx) % chords.length;
    return {
      ...m,
      chord: chords[chordIdx],
      chords: [chords[chordIdx]],
    };
  });

  return {
    ...song,
    measures: newMeasures,
  };
}

/**
 * Inverts a melodic motif diatonically across the axis of the first audible pitch.
 * Preserves note durations, rests, ties, and lyric alignment.
 */
export function invertMotif(
  notes: NumberedNotationNote[],
  _key?: KeySignature
): NumberedNotationNote[] {
  if (!notes || notes.length === 0) return [];

  // Find the first non-rest pitch to serve as inversion axis
  const firstAudible = notes.find(n => typeof n.pitch === 'number' && n.pitch >= 1 && n.pitch <= 7);
  if (!firstAudible || typeof firstAudible.pitch !== 'number') {
    return notes.map(n => ({ ...n }));
  }

  const axisPitch = firstAudible.pitch as number; // 1..7
  const axisOctave = firstAudible.octave || 0;
  const axisTotalDegree = axisOctave * 7 + (axisPitch - 1);

  return notes.map(n => {
    if (typeof n.pitch !== 'number' || n.pitch < 1 || n.pitch > 7) {
      return { ...n };
    }

    const currentTotalDegree = (n.octave || 0) * 7 + (n.pitch - 1);
    const invertedTotalDegree = 2 * axisTotalDegree - currentTotalDegree;

    // Convert back to octave and 1-7 pitch
    const newOctave = Math.floor(invertedTotalDegree / 7);
    const newPitch = ((((invertedTotalDegree % 7) + 7) % 7) + 1) as PitchNumber;

    return {
      ...n,
      pitch: newPitch,
      octave: Math.max(-2, Math.min(2, newOctave)),
    };
  });
}

/**
 * Reverses the pitch sequence of a motif while preserving note durations, rests, and lyric flow.
 */
export function retrogradeMotif(notes: NumberedNotationNote[]): NumberedNotationNote[] {
  if (!notes || notes.length <= 1) return notes.map(n => ({ ...n }));

  // Collect audible pitch + octave pairs in reverse order
  const audiblePitches: { pitch: PitchNumber; octave: number; accidental?: '' | '#' | 'b' }[] = [];
  for (const n of notes) {
    if (typeof n.pitch === 'number' && n.pitch >= 1 && n.pitch <= 7) {
      audiblePitches.push({ pitch: n.pitch, octave: n.octave || 0, accidental: n.accidental });
    }
  }
  audiblePitches.reverse();

  let pitchIdx = 0;
  return notes.map(n => {
    if (typeof n.pitch === 'number' && n.pitch >= 1 && n.pitch <= 7 && pitchIdx < audiblePitches.length) {
      const reversed = audiblePitches[pitchIdx++];
      return {
        ...n,
        pitch: reversed.pitch,
        octave: reversed.octave,
        accidental: reversed.accidental,
      };
    }
    return { ...n };
  });
}

/**
 * Shifts scale degrees up or down by stepDelta diatonic steps with octave wrapping.
 */
export function sequenceShiftMotif(
  notes: NumberedNotationNote[],
  stepDelta: number
): NumberedNotationNote[] {
  if (!notes || notes.length === 0 || stepDelta === 0) return notes.map(n => ({ ...n }));

  return notes.map(n => {
    if (typeof n.pitch !== 'number' || n.pitch < 1 || n.pitch > 7) {
      return { ...n };
    }

    const currentTotalDegree = (n.octave || 0) * 7 + (n.pitch - 1);
    const shiftedTotalDegree = currentTotalDegree + stepDelta;

    const newOctave = Math.floor(shiftedTotalDegree / 7);
    const newPitch = ((((shiftedTotalDegree % 7) + 7) % 7) + 1) as PitchNumber;

    return {
      ...n,
      pitch: newPitch,
      octave: Math.max(-2, Math.min(2, newOctave)),
    };
  });
}

/**
 * Attaches authentic Taiwanese style pre-grace notes to melody notes without modifying measure beat durations.
 */
export function embellishWithFolkOrnaments(
  notes: NumberedNotationNote[]
): NumberedNotationNote[] {
  if (!notes || notes.length === 0) return [];

  return notes.map(n => {
    // Only embellish melodic notes of sufficient duration (>= 0.5 beat) that don't already have preGraceNotes
    if (
      typeof n.pitch === 'number' &&
      n.pitch >= 1 &&
      n.pitch <= 7 &&
      n.duration >= 0.5 &&
      (!n.preGraceNotes || n.preGraceNotes.length === 0)
    ) {
      // Create a step-wise upper or lower auxiliary grace note
      const gracePitch = (n.pitch === 7 ? 1 : n.pitch === 1 ? 7 : (n.pitch + 1)) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
      let graceOctave = n.octave || 0;
      if (n.pitch === 1 && gracePitch === 7) {
        graceOctave -= 1;
      } else if (n.pitch === 7 && gracePitch === 1) {
        graceOctave += 1;
      }

      const grace: GraceNote = {
        id: `grace-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        pitch: gracePitch,
        octave: Math.max(-2, Math.min(2, graceOctave)),
      };

      return {
        ...n,
        preGraceNotes: [grace],
      };
    }
    return { ...n };
  });
}

/**
 * Checks if a pitch belongs to a specified scale or mode.
 * - 'gong' / 'pentatonic': 1, 2, 3, 5, 6
 * - 'yu': 6, 1, 2, 3, 5
 * - 'major': 1, 2, 3, 4, 5, 6, 7
 */
export function isPitchInScale(
  pitch: PitchNumber,
  mode: 'gong' | 'yu' | 'major' | 'pentatonic' = 'pentatonic'
): boolean {
  if (pitch === 0 || pitch === 'empty') return true; // Rests/spacers allowed

  switch (mode) {
    case 'gong':
    case 'pentatonic':
      return [1, 2, 3, 5, 6].includes(pitch as number);
    case 'yu':
      return [6, 1, 2, 3, 5].includes(pitch as number);
    case 'major':
      return [1, 2, 3, 4, 5, 6, 7].includes(pitch as number);
    default:
      return true;
  }
}

/**
 * Generates an offline 1-measure melodic motif (spark) based on harmonic chord tones and scale style.
 */
export function generateMelodySpark(
  chordName: string,
  key: KeySignature = 'C',
  timeSignature: TimeSignature = '4/4',
  style: 'folk' | 'ballad' | 'pentatonic' = 'pentatonic',
  existingNotes?: NumberedNotationNote[]
): NumberedNotationNote[] {
  const totalBeats = getExpectedMeasureBeats(timeSignature);

  // Determine key candidate to fetch chord tones
  const candidates = getDiatonicCandidateChords(key);
  const cleanChord = chordName.replace(/[()]/g, '').trim();
  const matched = candidates.find(c => c.chord.toLowerCase() === cleanChord.toLowerCase());
  const chordTones: number[] = matched?.chordTones || [1, 3, 5];

  const pentatonicTones = [1, 2, 3, 5, 6];
  const tones = style === 'pentatonic'
    ? pentatonicTones.filter(t => chordTones.includes(t) || [1, 5].includes(t))
    : chordTones;

  const validTones = tones.length > 0 ? tones : [1, 3, 5];

  // Rhythm patterns depending on total beats
  let durations: NoteDuration[] = [];
  if (totalBeats === 4) {
    durations = style === 'folk' ? [1, 0.5, 0.5, 1, 1] : [1, 1, 1, 1];
  } else if (totalBeats === 3) {
    durations = [1, 1, 1];
  } else if (totalBeats === 2) {
    durations = [1, 1];
  } else {
    durations = [1, 1, 1, 1];
  }

  const durationsMatch = Boolean(
    existingNotes &&
    existingNotes.length === durations.length &&
    existingNotes.every((n, i) => n.duration === durations[i])
  );

  const notes: NumberedNotationNote[] = durations.map((dur, i) => {
    const pitch = validTones[i % validTones.length] as PitchNumber;
    if (durationsMatch && existingNotes) {
      const existing = existingNotes[i];
      return {
        ...existing,
        pitch,
        octave: 0,
        accidental: undefined,
        duration: dur,
      };
    }

    return {
      id: `spark-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
      pitch,
      octave: 0,
      duration: dur,
      lyric: {},
    };
  });

  return notes;
}
