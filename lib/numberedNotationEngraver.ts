import type { Measure, NumberedNotationNote, TimeSignature, PitchNumber, NoteDuration, BarlineType, SheetWrapMode, SheetOrientation } from '../types/song.ts';
import { measureHasNoWrapSplitTrigger } from './taigiUtils.ts';

/**
 * Calculated engraving data for a single numbered notation note on a printed sheet.
 */
export interface EngravedNote {
  note: NumberedNotationNote;
  noteIndex: number;
  measureIndex: number;
  startBeat: number;
  durationBeats: number;
  beatIndex: number; // which beat group (0, 1, 2, 3...)
  beamCount: number; // 0 for quarter or longer, 1 for 8th note, 2 for 16th note, 3 for 32nd
  isDotted: boolean;
  dashCount: number; // number of '-' sustain dashes to render after the pitch (e.g. 1 for half note, 3 for whole note)
  octaveDotsAbove: number;
  octaveDotsBelow: number;
  accidentalSymbol: string; // '♯', '♭', or ''
  isRest: boolean;
  isEmpty: boolean;
  pitchDisplay: string;
  requiredWidth?: number; // Minimum content width in px to display without text collision
  // Continuous beam flags within its beat group
  beam1: {
    hasBeam: boolean;
    connectsToPrev: boolean;
    connectsToNext: boolean;
    isSubGroupStart: boolean;
    isSubGroupEnd: boolean;
  };
  beam2: {
    hasBeam: boolean;
    connectsToPrev: boolean;
    connectsToNext: boolean;
    isSubGroupStart: boolean;
    isSubGroupEnd: boolean;
  };
}

/**
 * Calculated engraving data for a full measure on the sheet.
 */
export interface EngravedMeasure {
  measure: Measure;
  measureIndex: number;
  measureNumber: number;
  notes: EngravedNote[];
  obbligatoNotes?: EngravedNote[];
  obbligatoText?: string;
  totalBeats: number;
  expectedBeats: number;
  isFull: boolean;
  isUnder: boolean;
  isOver: boolean;
  chordText: string;
  sectionText: string;
  barlineType: BarlineType;
  voltaEnding?: number[];
  isPrelude: boolean;
  isLineBreak: boolean;
  requiredWidth?: number; // Minimum width in px for this measure so notes & lyrics never collide
  noteWidths?: number[];  // Minimum width for each individual note column
}

/**
 * Calculated engraving data for a full system (staff line) on the sheet.
 */
export interface EngravedSystem {
  systemIndex: number;
  measures: EngravedMeasure[];
  startMeasureNumber: number;
  endMeasureNumber: number;
  totalRequiredWidth: number;
}

/**
 * Parse time signature into beats per measure and beat unit duration.
 */
export function parseTimeSignature(timeSig: TimeSignature): {
  beatsPerMeasure: number;
  beatUnit: number;
  groupingBeatLength: number;
} {
  switch (timeSig) {
    case '2/4':
      return { beatsPerMeasure: 2, beatUnit: 4, groupingBeatLength: 1.0 };
    case '3/4':
      return { beatsPerMeasure: 3, beatUnit: 4, groupingBeatLength: 1.0 };
    case '6/8':
      return { beatsPerMeasure: 2, beatUnit: 8, groupingBeatLength: 1.5 };
    case '4/4':
    default:
      return { beatsPerMeasure: 4, beatUnit: 4, groupingBeatLength: 1.0 };
  }
}

/**
 * Determine how many underline beams a note receives based on duration.
 */
export function getBeamCountForDuration(duration: NoteDuration): number {
  if (duration <= 0.125) return 3; // 32nd note
  if (duration <= 0.25 || (duration > 0.25 && duration <= 0.375)) return 2; // 16th note or dotted 16th
  if (duration <= 0.5 || (duration > 0.5 && duration <= 0.75)) return 1; // 8th note or dotted 8th
  return 0; // Quarter note or longer
}

/**
 * Determine how many sustain dashes '-' follow the note digit in standard numbered notation.
 * In standard numbered notation:
 * - Quarter note (1 beat): "1" (0 dashes)
 * - Half note (2 beats): "1 -" (1 dash)
 * - Dotted half note (3 beats): "1 - -" (2 dashes)
 * - Whole note (4 beats): "1 - - -" (3 dashes)
 */
export function getDashCountForDuration(duration: NoteDuration, isDotted?: boolean): number {
  if (duration >= 3.75) return 3;
  if (duration >= 2.75) return 2;
  if (duration >= 1.75 && !isDotted) return 1;
  return 0;
}

/**
 * Formats accidental character into crisp musical glyph.
 */
export function formatAccidentalGlyph(accidental?: string): string {
  if (accidental === '#') return '♯';
  if (accidental === 'b') return '♭';
  return '';
}

/**
 * Engrave a single measure into full layout metrics with continuous beam analysis.
 */
export function engraveMeasure(
  measure: Measure,
  measureIndex: number,
  timeSignature: TimeSignature,
  allMeasures?: Measure[]
): EngravedMeasure {
  const { beatsPerMeasure, groupingBeatLength } = parseTimeSignature(timeSignature);
  const expectedBeats = beatsPerMeasure * (timeSignature === '6/8' ? 1.5 : 1.0);

  let currentBeat = 0;
  const rawEngravedNotes: Array<Omit<EngravedNote, 'beam1' | 'beam2'>> = [];

  for (let nIdx = 0; nIdx < measure.notes.length; nIdx++) {
    const note = measure.notes[nIdx];
    const duration = Number(note.duration) || 0;
    const isZeroTime = duration === 0;

    const startBeat = currentBeat;
    const durationBeats = duration;
    const beatIndex = Math.floor(startBeat / groupingBeatLength);
    const beamCount = isZeroTime ? 0 : getBeamCountForDuration(duration);
    const dashCount = isZeroTime ? 0 : getDashCountForDuration(duration, note.isDotted);

    const isRest = note.pitch === 0;
    const isEmpty = note.pitch === 'empty';

    let pitchDisplay = '';
    if (isRest) {
      pitchDisplay = '0';
    } else if (isEmpty) {
      pitchDisplay = '';
    } else {
      pitchDisplay = String(note.pitch);
    }

    const octaveDotsAbove = !isEmpty && note.octave > 0 ? Math.min(note.octave, 3) : 0;
    const octaveDotsBelow = !isEmpty && note.octave < 0 ? Math.min(Math.abs(note.octave), 3) : 0;
    const accidentalSymbol = !isEmpty ? formatAccidentalGlyph(note.accidental) : '';

    rawEngravedNotes.push({
      note,
      noteIndex: nIdx,
      measureIndex,
      startBeat,
      durationBeats,
      beatIndex,
      beamCount,
      isDotted: Boolean(note.isDotted),
      dashCount,
      octaveDotsAbove,
      octaveDotsBelow,
      accidentalSymbol,
      isRest,
      isEmpty,
      pitchDisplay,
    });

    currentBeat += duration;
  }

  // Calculate continuous beam connectivity for level 1 (8th notes) and level 2 (16th notes)
  const engravedNotes: EngravedNote[] = rawEngravedNotes.map((raw, idx) => {
    const prevRaw = idx > 0 ? rawEngravedNotes[idx - 1] : null;
    const nextRaw = idx < rawEngravedNotes.length - 1 ? rawEngravedNotes[idx + 1] : null;

    // Connect beam 1 if adjacent note in the SAME beat group also has beamCount >= 1
    const prevCanConnectBeam1 = Boolean(
      prevRaw &&
      prevRaw.beatIndex === raw.beatIndex &&
      prevRaw.beamCount >= 1 &&
      raw.beamCount >= 1
    );

    const nextCanConnectBeam1 = Boolean(
      nextRaw &&
      nextRaw.beatIndex === raw.beatIndex &&
      nextRaw.beamCount >= 1 &&
      raw.beamCount >= 1
    );

    // Connect beam 2 if adjacent note in the SAME beat group also has beamCount >= 2
    const prevCanConnectBeam2 = Boolean(
      prevRaw &&
      prevRaw.beatIndex === raw.beatIndex &&
      prevRaw.beamCount >= 2 &&
      raw.beamCount >= 2
    );

    const nextCanConnectBeam2 = Boolean(
      nextRaw &&
      nextRaw.beatIndex === raw.beatIndex &&
      nextRaw.beamCount >= 2 &&
      raw.beamCount >= 2
    );

    return {
      ...raw,
      beam1: {
        hasBeam: raw.beamCount >= 1,
        connectsToPrev: prevCanConnectBeam1,
        connectsToNext: nextCanConnectBeam1,
        isSubGroupStart: !prevCanConnectBeam1 && nextCanConnectBeam1,
        isSubGroupEnd: prevCanConnectBeam1 && !nextCanConnectBeam1,
      },
      beam2: {
        hasBeam: raw.beamCount >= 2,
        connectsToPrev: prevCanConnectBeam2,
        connectsToNext: nextCanConnectBeam2,
        isSubGroupStart: !prevCanConnectBeam2 && nextCanConnectBeam2,
        isSubGroupEnd: prevCanConnectBeam2 && !nextCanConnectBeam2,
      },
    };
  });

  let engravedObbligatoNotes: EngravedNote[] | undefined;
  if (measure.obbligato && measure.obbligato.length > 0) {
    let obBeat = 0;
    const rawOb: Array<Omit<EngravedNote, 'beam1' | 'beam2'>> = [];
    for (let oIdx = 0; oIdx < measure.obbligato.length; oIdx++) {
      const oNote = measure.obbligato[oIdx];
      const dur = Number(oNote.duration) || 0;
      const beamCount = getBeamCountForDuration(dur);
      const dashCount = getDashCountForDuration(dur, oNote.isDotted);
      const isRest = oNote.pitch === 0;
      const isEmpty = oNote.pitch === 'empty';
      const pitchDisplay = isRest ? '0' : isEmpty ? '' : String(oNote.pitch);
      rawOb.push({
        note: oNote,
        noteIndex: oIdx,
        measureIndex,
        startBeat: obBeat,
        durationBeats: dur,
        beatIndex: Math.floor(obBeat / groupingBeatLength),
        beamCount,
        isDotted: Boolean(oNote.isDotted),
        dashCount,
        octaveDotsAbove: !isEmpty && oNote.octave > 0 ? Math.min(oNote.octave, 3) : 0,
        octaveDotsBelow: !isEmpty && oNote.octave < 0 ? Math.min(Math.abs(oNote.octave), 3) : 0,
        accidentalSymbol: !isEmpty ? formatAccidentalGlyph(oNote.accidental) : '',
        isRest,
        isEmpty,
        pitchDisplay,
      });
      obBeat += dur;
    }
    engravedObbligatoNotes = rawOb.map((raw, idx) => {
      const prev = idx > 0 ? rawOb[idx - 1] : null;
      const next = idx < rawOb.length - 1 ? rawOb[idx + 1] : null;
      const prevC1 = Boolean(prev && prev.beatIndex === raw.beatIndex && prev.beamCount >= 1 && raw.beamCount >= 1);
      const nextC1 = Boolean(next && next.beatIndex === raw.beatIndex && next.beamCount >= 1 && raw.beamCount >= 1);
      const prevC2 = Boolean(prev && prev.beatIndex === raw.beatIndex && prev.beamCount >= 2 && raw.beamCount >= 2);
      const nextC2 = Boolean(next && next.beatIndex === raw.beatIndex && next.beamCount >= 2 && raw.beamCount >= 2);
      return {
        ...raw,
        beam1: {
          hasBeam: raw.beamCount >= 1,
          connectsToPrev: prevC1,
          connectsToNext: nextC1,
          isSubGroupStart: !prevC1 && nextC1,
          isSubGroupEnd: prevC1 && !nextC1,
        },
        beam2: {
          hasBeam: raw.beamCount >= 2,
          connectsToPrev: prevC2,
          connectsToNext: nextC2,
          isSubGroupStart: !prevC2 && nextC2,
          isSubGroupEnd: prevC2 && !nextC2,
        },
      };
    });
  }

  const totalBeats = Math.round(currentBeat * 1000) / 1000;
  const isFull = Math.abs(totalBeats - expectedBeats) < 0.01;
  const isUnder = totalBeats < expectedBeats - 0.01;
  const isOver = totalBeats > expectedBeats + 0.01;

  const chordText = measure.chord || (measure.chords && measure.chords.length > 0 ? measure.chords.join(' ') : '');
  const prevMeasure = (allMeasures && measureIndex > 0) ? allMeasures[measureIndex - 1] : undefined;
  const isSectionStart = Boolean(measure.section && (!prevMeasure || prevMeasure.section !== measure.section));
  const sectionText = isSectionStart ? (measure.section || '') : '';
  const barlineType = measure.barlineType || 'single';

  // Compute collision-free required width for each note and the whole measure
  const noteWidths: number[] = [];
  engravedNotes.forEach((engNote) => {
    const reqW = calculateNoteRequiredWidth(engNote.note, { dashCount: engNote.dashCount });
    engNote.requiredWidth = reqW;
    noteWidths.push(reqW);
  });

  const requiredWidth = calculateMeasureRequiredWidth(measure, engravedNotes, chordText, sectionText);

  return {
    measure,
    measureIndex,
    measureNumber: measure.measureNumber || measureIndex + 1,
    notes: engravedNotes,
    obbligatoNotes: engravedObbligatoNotes,
    obbligatoText: measure.obbligatoText,
    totalBeats,
    expectedBeats,
    isFull,
    isUnder,
    isOver,
    chordText,
    sectionText,
    barlineType,
    voltaEnding: measure.voltaEnding,
    isPrelude: Boolean(measure.isPrelude || /intro|prelude|interlude/i.test(measure.section || '')),
    isLineBreak: Boolean(measure.isLineBreak),
    requiredWidth,
    noteWidths,
  };
}

/**
 * Computes the minimum width (in px) needed for a note cell so that its pitch notation
 * and all verse lyrics (POJ Romanization and Hanlo) have sufficient spacing with zero collision.
 */
export function calculateNoteRequiredWidth(
  note: NumberedNotationNote,
  raw?: { dashCount?: number }
): number {
  const dashCount = raw?.dashCount ?? getDashCountForDuration(Number(note.duration) || 0, note.isDotted);
  const graceCount = (note.preGraceNotes?.length || 0) + (note.postGraceNotes?.length || 0);
  const hasAccidental = Boolean(note.accidental);
  const isDotted = Boolean(note.isDotted);
  const isTriplet = Boolean(note.isTriplet);

  // Pitch element widths (compact baseline)
  let pitchWidth = 15 + dashCount * 8 + graceCount * 8;
  if (hasAccidental) pitchWidth += 6;
  if (isDotted) pitchWidth += 5;
  if (isTriplet) pitchWidth += 5;

  // Syllable text width across all verse layers
  let maxLyricWidth = 0;

  const checkLyric = (hanlo?: string, poj?: string) => {
    const h = (hanlo || '').trim();
    const p = (poj || '').trim();
    if (!h && !p) return;

    let hWidth = 0;
    if (h) {
      for (const ch of h) {
        if (/[，。、！？,.!?…]/.test(ch)) {
          hWidth += 6;
        } else {
          hWidth += 12;
        }
      }
    }

    let pWidth = 0;
    if (p) {
      pWidth = p.length * 7.0;
      // Snug word boundary margin if not continuing with hyphen to next syllable
      if (!p.endsWith('-') && !p.endsWith('--')) {
        pWidth += 2;
      }
    }

    const w = Math.max(hWidth, pWidth);
    if (w > maxLyricWidth) maxLyricWidth = w;
  };

  // Check direct lyric
  checkLyric(note.lyric?.hanlo || note.lyric?.hanji, note.lyric?.poj || note.lyric?.tl);
  if (note.lyric?.custom) {
    checkLyric(note.lyric.custom, undefined);
  }

  // Check all stacked verses
  if (note.lyricsByVerse) {
    for (const vKey of Object.keys(note.lyricsByVerse)) {
      const v = note.lyricsByVerse[Number(vKey)];
      if (v) {
        checkLyric(v.hanlo || v.hanji || v.custom, v.poj || v.tl);
      }
    }
  }

  return Math.max(16, Math.round(Math.max(pitchWidth, maxLyricWidth + 2)));
}

/**
 * Computes the minimum required width (in px) for a measure to display without text collisions.
 */
export function calculateMeasureRequiredWidth(
  measure: Measure,
  engravedNotes: EngravedNote[],
  chordText: string,
  sectionText: string
): number {
  let baseWidth = 24; // Barlines, measure number, default margins
  if (chordText && chordText.length > 2) {
    baseWidth += (chordText.length - 2) * 7;
  }
  if (sectionText) {
    baseWidth += Math.max(24, sectionText.length * 7);
  }
  if (measure.voltaEnding && measure.voltaEnding.length > 0) {
    baseWidth += 20;
  }
  if (measure.isPrelude) {
    baseWidth += 14;
  }

  let notesWidth = 0;
  if (engravedNotes && engravedNotes.length > 0) {
    notesWidth = engravedNotes.reduce((sum, n) => sum + (n.requiredWidth || 24), 0);
  } else {
    notesWidth = 50;
  }

  if (measure.obbligato && measure.obbligato.length > 0) {
    const obWidth = measure.obbligato.length * 22;
    notesWidth = Math.max(notesWidth, obWidth);
  }

  return Math.max(75, Math.round(baseWidth + notesWidth));
}

/**
 * Checks if a measure contains any non-empty lyrics (across standard lyrics, custom lyrics, or stacked verses).
 */
export function measureHasLyrics(measure: Measure): boolean {
  if (!measure.notes || measure.notes.length === 0) return false;
  return measure.notes.some(note => {
    const h = (note.lyric?.hanlo || note.lyric?.hanji || note.lyric?.custom || '').trim();
    const p = (note.lyric?.poj || note.lyric?.tl || '').trim();
    if (h !== '' || p !== '') return true;

    if (note.lyricsByVerse) {
      for (const vKey of Object.keys(note.lyricsByVerse)) {
        const v = note.lyricsByVerse[Number(vKey)];
        if (v) {
          const vH = (v.hanlo || v.hanji || v.custom || '').trim();
          const vP = (v.poj || v.tl || '').trim();
          if (vH !== '' || vP !== '') return true;
        }
      }
    }
    return false;
  });
}

/**
 * Checks if a measure has a section badge (e.g. Intro, Verse 1, Chorus, [A]).
 */
export function measureHasBadge(measure: Measure): boolean {
  return Boolean(measure.section && measure.section.trim());
}

/**
 * Determines whether a measure is considered an empty measure:
 * - Has no section badge
 * - Has no lyrics on any note
 * - Has no notes OR all notes are rests (0) / blank ('empty') / untuned
 * - Is not an instrumental prelude
 */
export function isMeasureEmpty(measure: Measure): boolean {
  // If it has a section badge, it's not an empty measure (it's a measure with badge)
  if (measureHasBadge(measure)) return false;

  // If it has lyrics, it's not an empty measure (it's a measure with lyrics)
  if (measureHasLyrics(measure)) return false;

  // If marked as prelude with melodic notes, it's an instrumental prelude
  if (measure.isPrelude) return false;

  // If it has no notes, it is empty
  if (!measure.notes || measure.notes.length === 0) return true;

  // If all notes are rests (0), blank ('empty'), or untuned
  const allRestsOrBlank = measure.notes.every(
    n => n.pitch === 0 || n.pitch === 'empty' || n.pitch === undefined
  );
  if (allRestsOrBlank) return true;

  // Check if it has any pitched notes (1-7)
  const hasPitchedNotes = measure.notes.some(
    n => typeof n.pitch === 'number' && n.pitch >= 1 && n.pitch <= 7
  );
  if (!hasPitchedNotes) return true;

  // If it has default placeholder notes (e.g. from Add Measure: 1 2 3 5 with empty lyrics and no custom obbligato/ending)
  const isDefaultPlaceholder =
    measure.notes.length === 4 &&
    measure.notes[0]?.pitch === 1 &&
    measure.notes[1]?.pitch === 2 &&
    measure.notes[2]?.pitch === 3 &&
    measure.notes[3]?.pitch === 5 &&
    (!measure.obbligato || measure.obbligato.length === 0) &&
    (!measure.voltaEnding || measure.voltaEnding.length === 0);

  if (isDefaultPlaceholder) return true;

  return false;
}

/**
 * Groups measures into systems (staff lines on the sheet).
 * Supports three layout modes:
 * 1. 'no_wrap': No forced fit nor auto wrap; breaks ONLY at manual line breaks (measure.isLineBreak),
 *    delimiters (，, 。, ,, .), newline verse breaks (↵, \n, \r), delimiter barlines, section headers,
 *    or grouping consecutive empty measures into the same line ending before a measure with badge or lyrics.
 *    (Whitespace spacers ␣, ' ' are explicitly excluded from splitting lines).
 * 2. 'auto_fit': Forced fit in sheet with fixed measures per line (default 4) or on manual breaks.
 * 3. 'auto_wrap': Real auto-wrap that dynamically breaks lines based on note and lyric content width,
 *    guaranteeing generous spacing and zero collision between syllables and barlines.
 */
export function groupMeasuresIntoSystems(
  measures: Measure[],
  timeSignature: TimeSignature,
  defaultMeasuresPerSystem = 4,
  wrapMode: SheetWrapMode = 'no_wrap',
  orientation: SheetOrientation = 'portrait',
  maxLineWidth?: number
): EngravedSystem[] {
  const systems: EngravedSystem[] = [];

  let currentSystem: EngravedMeasure[] = [];
  let currentSystemWidth = 0;
  // Content line width budgets: ~760px for Portrait (A4 896px minus padding), ~980px for Landscape (A4 1240px minus padding)
  const MAX_SYSTEM_LINE_WIDTH = maxLineWidth
    ? Math.max(300, maxLineWidth - 10)
    : (orientation === 'landscape' ? 980 : 760);
  const effectiveDefaultMeasures =
    defaultMeasuresPerSystem || (orientation === 'landscape' ? 5 : 4);

  measures.forEach((measure, idx) => {
    const engraved = engraveMeasure(measure, idx, timeSignature, measures);
    const mWidth = engraved.requiredWidth || 100;

    let shouldBreakBefore = false;

    if (wrapMode === 'auto_wrap') {
      if (currentSystem.length > 0) {
        // Break before a major section header if line already has >= 2 measures
        const isMajorSection = Boolean(measure.section && measure.section.trim());
        const sectionBreak = isMajorSection && currentSystem.length >= 2;

        // Break if current system has reached target measures per line (strict capacity limit)
        const reachesCapacity = currentSystem.length >= effectiveDefaultMeasures;

        // Break if adding this measure would exceed the line budget (preventing collision & overflow)
        const exceedsWidth = (currentSystemWidth + mWidth) > MAX_SYSTEM_LINE_WIDTH;

        // In auto_wrap, respect previous measure's line break if line has reached target capacity
        // or line width has reached at least 85% of sheet width budget
        const prevHadBreak = Boolean(
          currentSystem[currentSystem.length - 1].isLineBreak &&
          (currentSystem.length >= effectiveDefaultMeasures || currentSystemWidth >= MAX_SYSTEM_LINE_WIDTH * 0.85)
        );

        if (sectionBreak || reachesCapacity || exceedsWidth || prevHadBreak) {
          shouldBreakBefore = true;
        }
      }
    } else if (wrapMode === 'auto_fit') {
      // 2. Auto Fit (Forced fit / Auto fix): strictly break when line reaches target measures per line
      if (currentSystem.length >= effectiveDefaultMeasures) {
        shouldBreakBefore = true;
      }
    } else {
      // 1. No Wrap: lines spread completely and ONLY wrap at delimiters, breaks, or empty measure transitions.
      // Delimiters & breaks include:
      // - Manual line break on the previous measure (measure.isLineBreak)
      // - Delimiter barlines on previous measure ('end', 'repeat_end', 'double')
      // - Section start delimiter on current measure (measure.section)
      // - Delimiters on previous measure: '，', '。', ',', '.'
      // - Newline verse breaks on previous measure: '↵', '\n', '\r'
      // - Whitespace spacers ('␣', ' ') are explicitly EXCLUDED from triggering line splits
      // - Consecutive empty measures grouped as the same line, ending before a measure with badge or with lyrics
      if (currentSystem.length > 0) {
        const prevEngraved = currentSystem[currentSystem.length - 1];
        const prevMeasure = prevEngraved.measure;
        const prevHadBreak = Boolean(prevEngraved.isLineBreak);
        const prevHadDelimiterBarline =
          prevEngraved.barlineType === 'end' ||
          prevEngraved.barlineType === 'repeat_end' ||
          prevEngraved.barlineType === 'double';
        const isSectionStartDelimiter = Boolean(measure.section && measure.section.trim());
        const prevHadSplitTrigger = measureHasNoWrapSplitTrigger(prevMeasure);

        // Consecutive empty measures grouping:
        // Group consecutive empty measures as the same line, ending before a measure with badge or with lyrics
        const prevIsEmpty = isMeasureEmpty(prevMeasure);
        const currIsEmpty = isMeasureEmpty(measure);
        const currHasBadgeOrLyrics = measureHasBadge(measure) || measureHasLyrics(measure);

        // 1. Line of consecutive empty measures ends before a measure with badge or lyrics:
        const emptyEndingBeforeContent = prevIsEmpty && currHasBadgeOrLyrics;
        // 2. Line of lyrics/sung content ends when transitioning to empty measures:
        const lyricsEndingBeforeEmpty = measureHasLyrics(prevMeasure) && currIsEmpty;

        if (
          prevHadBreak ||
          prevHadDelimiterBarline ||
          isSectionStartDelimiter ||
          prevHadSplitTrigger ||
          emptyEndingBeforeContent ||
          lyricsEndingBeforeEmpty
        ) {
          shouldBreakBefore = true;
        }
      }
    }

    if (shouldBreakBefore && currentSystem.length > 0) {
      systems.push({
        systemIndex: systems.length + 1,
        measures: currentSystem,
        startMeasureNumber: currentSystem[0].measureNumber,
        endMeasureNumber: currentSystem[currentSystem.length - 1].measureNumber,
        totalRequiredWidth: currentSystem.reduce((sum, m) => sum + (m.requiredWidth || 120), 0),
      });
      currentSystem = [];
      currentSystemWidth = 0;
    }

    currentSystem.push(engraved);
    currentSystemWidth += mWidth;

    // In auto_wrap mode: end barlines or repeat ends can naturally conclude a system if line has >= 2 measures
    if (wrapMode === 'auto_wrap') {
      const hasEndBarline = measure.barlineType === 'end' || measure.barlineType === 'repeat_end';
      if (hasEndBarline && idx < measures.length - 1 && currentSystem.length >= 2) {
        systems.push({
          systemIndex: systems.length + 1,
          measures: currentSystem,
          startMeasureNumber: currentSystem[0].measureNumber,
          endMeasureNumber: currentSystem[currentSystem.length - 1].measureNumber,
          totalRequiredWidth: currentSystem.reduce((sum, m) => sum + (m.requiredWidth || 120), 0),
        });
        currentSystem = [];
        currentSystemWidth = 0;
      }
    }
  });

  if (currentSystem.length > 0) {
    systems.push({
      systemIndex: systems.length + 1,
      measures: currentSystem,
      startMeasureNumber: currentSystem[0].measureNumber,
      endMeasureNumber: currentSystem[currentSystem.length - 1].measureNumber,
      totalRequiredWidth: currentSystem.reduce((sum, m) => sum + (m.requiredWidth || 120), 0),
    });
  }

  return systems;
}
