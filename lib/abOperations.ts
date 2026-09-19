import type { Song, Measure, NumberedNotationNote, AbRange, ScoreClipboard } from '../types/song.ts';
import { groupMeasuresIntoSystems } from './numberedNotationEngraver.ts';
import { sequenceShiftMotif } from './creativityEngine.ts';
import { getExpectedMeasureBeats } from './taigiUtils.ts';

export function generateAbId(prefix: string): string {
  const randomPart = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).substring(2, 10);
  return `${prefix}-ab-${Date.now()}-${randomPart}`;
}

/**
 * Normalizes and clamps an A-B measure range within song boundaries.
 */
export function clampAbRange(song: Song, range: AbRange): AbRange {
  const totalMeasures = song.measures.length;
  if (totalMeasures === 0) {
    return { startMeasureIndex: 0, endMeasureIndex: 0 };
  }
  const minIdx = Math.min(range.startMeasureIndex, range.endMeasureIndex);
  const maxIdx = Math.max(range.startMeasureIndex, range.endMeasureIndex);

  const start = Math.max(0, Math.min(totalMeasures - 1, minIdx));
  const end = Math.max(start, Math.min(totalMeasures - 1, maxIdx));

  return {
    startMeasureIndex: start,
    endMeasureIndex: end,
  };
}

/**
 * Deep clones an array of measures with brand-new unique IDs for measures and notes.
 */
export function cloneMeasuresWithFreshIds(measures: Measure[]): Measure[] {
  return measures.map(m => {
    const freshMeasureId = generateAbId('measure');
    const clonedNotes: NumberedNotationNote[] = (m.notes || []).map(n => ({
      ...n,
      id: generateAbId('note'),
      lyric: n.lyric ? { ...n.lyric } : {},
      lyricsByVerse: n.lyricsByVerse
        ? Object.fromEntries(
            Object.entries(n.lyricsByVerse).map(([k, v]) => [k, { ...v }])
          )
        : undefined,
      preGraceNotes: n.preGraceNotes ? n.preGraceNotes.map(g => ({ ...g, id: generateAbId('grace') })) : undefined,
      postGraceNotes: n.postGraceNotes ? n.postGraceNotes.map(g => ({ ...g, id: generateAbId('grace') })) : undefined,
    }));

    const clonedObbligato: NumberedNotationNote[] | undefined = m.obbligato
      ? m.obbligato.map(o => ({
          ...o,
          id: generateAbId('obbligato'),
          lyric: o.lyric ? { ...o.lyric } : {},
          lyricsByVerse: o.lyricsByVerse
            ? Object.fromEntries(
                Object.entries(o.lyricsByVerse).map(([k, v]) => [k, { ...v }])
              )
            : undefined,
          preGraceNotes: o.preGraceNotes ? o.preGraceNotes.map(g => ({ ...g, id: generateAbId('grace') })) : undefined,
          postGraceNotes: o.postGraceNotes ? o.postGraceNotes.map(g => ({ ...g, id: generateAbId('grace') })) : undefined,
        }))
      : undefined;

    return {
      ...m,
      id: freshMeasureId,
      notes: clonedNotes,
      obbligato: clonedObbligato,
      chords: m.chords ? [...m.chords] : undefined,
      voltaEnding: m.voltaEnding ? [...m.voltaEnding] : undefined,
    };
  });
}

/**
 * Renumbers an array of measures sequentially from 1 to N.
 */
export function renumberSongMeasures(measures: Measure[]): Measure[] {
  return measures.map((m, idx) => {
    const targetNum = idx + 1;
    return m.measureNumber === targetNum ? m : { ...m, measureNumber: targetNum };
  });
}

/**
 * Copies the measures within the given A-B range into deep-cloned measures.
 */
export function copyMeasures(song: Song, range: AbRange): Measure[] {
  const clamped = clampAbRange(song, range);
  const slice = song.measures.slice(clamped.startMeasureIndex, clamped.endMeasureIndex + 1);
  return cloneMeasuresWithFreshIds(slice);
}

/**
 * Creates a ScoreClipboard payload containing the copied measures.
 */
export function createScoreClipboard(song: Song, range: AbRange): ScoreClipboard {
  const measures = copyMeasures(song, range);
  return {
    type: 'measures',
    measures,
    sourceTimeSignature: song.timeSignature || '4/4',
    copiedAt: Date.now(),
  };
}

/**
 * Pastes clipboard measures into the song.
 * Mode:
 * - 'insert_after': Inserts after targetMeasureIndex
 * - 'insert_before': Inserts before targetMeasureIndex
 * - 'replace': Replaces measures in rangeToReplace with clipboard measures
 */
export function pasteMeasures(
  song: Song,
  targetMeasureIndex: number,
  measuresToPaste: Measure[],
  mode: 'insert_after' | 'insert_before' | 'replace' = 'insert_after',
  rangeToReplace?: AbRange
): { song: Song; pastedCount: number; newCursor: [number, number]; newAbRange?: AbRange } {
  if (!measuresToPaste || measuresToPaste.length === 0) {
    return { song, pastedCount: 0, newCursor: [targetMeasureIndex, 0] };
  }

  const freshMeasures = cloneMeasuresWithFreshIds(measuresToPaste);
  const currentMeasures = [...song.measures];

  let nextMeasures: Measure[];
  let newStartIdx = 0;

  if (mode === 'replace' && rangeToReplace) {
    const clampedReplace = clampAbRange(song, rangeToReplace);
    newStartIdx = clampedReplace.startMeasureIndex;
    nextMeasures = [
      ...currentMeasures.slice(0, clampedReplace.startMeasureIndex),
      ...freshMeasures,
      ...currentMeasures.slice(clampedReplace.endMeasureIndex + 1),
    ];
  } else if (mode === 'insert_before') {
    const insertIdx = Math.max(0, Math.min(currentMeasures.length, targetMeasureIndex));
    newStartIdx = insertIdx;
    nextMeasures = [
      ...currentMeasures.slice(0, insertIdx),
      ...freshMeasures,
      ...currentMeasures.slice(insertIdx),
    ];
  } else {
    // default 'insert_after'
    const insertIdx = Math.max(0, Math.min(currentMeasures.length - 1, targetMeasureIndex)) + 1;
    newStartIdx = insertIdx;
    nextMeasures = [
      ...currentMeasures.slice(0, insertIdx),
      ...freshMeasures,
      ...currentMeasures.slice(insertIdx),
    ];
  }

  const renumbered = renumberSongMeasures(nextMeasures);
  const newEndIdx = newStartIdx + freshMeasures.length - 1;

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    pastedCount: freshMeasures.length,
    newCursor: [newStartIdx, 0],
    newAbRange: {
      startMeasureIndex: newStartIdx,
      endMeasureIndex: newEndIdx,
    },
  };
}

/**
 * Deletes all measures in the given A-B range.
 * If all measures would be deleted, resets to a single clean rest measure.
 */
export function deleteMeasures(
  song: Song,
  range: AbRange
): { song: Song; deletedCount: number; newCursor: [number, number] } {
  const clamped = clampAbRange(song, range);
  const countToDelete = clamped.endMeasureIndex - clamped.startMeasureIndex + 1;

  let nextMeasures = [
    ...song.measures.slice(0, clamped.startMeasureIndex),
    ...song.measures.slice(clamped.endMeasureIndex + 1),
  ];

  if (nextMeasures.length === 0) {
    // Guard: always leave at least 1 measure matching the song time signature
    const defaultBeats = getExpectedMeasureBeats(song.timeSignature || '4/4');
    nextMeasures = [
      {
        id: generateAbId('measure'),
        measureNumber: 1,
        chord: 'C',
        notes: [
          {
            id: generateAbId('note'),
            pitch: 0,
            octave: 0,
            duration: defaultBeats,
            lyric: {},
          },
        ],
      },
    ];
  }

  const renumbered = renumberSongMeasures(nextMeasures);
  const targetCursorMeasure = Math.max(
    0,
    Math.min(renumbered.length - 1, clamped.startMeasureIndex)
  );

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    deletedCount: countToDelete,
    newCursor: [targetCursorMeasure, 0],
  };
}

/**
 * Duplicates the A-B section and inserts it immediately after Point B.
 */
export function duplicateMeasures(
  song: Song,
  range: AbRange
): { song: Song; duplicatedCount: number; newCursor: [number, number]; newAbRange: AbRange } {
  const clamped = clampAbRange(song, range);
  const copied = copyMeasures(song, clamped);

  const result = pasteMeasures(song, clamped.endMeasureIndex, copied, 'insert_after');
  return {
    song: result.song,
    duplicatedCount: result.pastedCount,
    newCursor: result.newCursor,
    newAbRange: result.newAbRange || {
      startMeasureIndex: clamped.endMeasureIndex + 1,
      endMeasureIndex: clamped.endMeasureIndex + copied.length,
    },
  };
}

/**
 * Transposes all notes in the A-B section by stepDelta diatonic scale degrees.
 */
export function transposeMeasures(song: Song, range: AbRange, stepDelta: number): Song {
  if (stepDelta === 0) return song;
  const clamped = clampAbRange(song, range);

  const newMeasures = song.measures.map((m, mIdx) => {
    if (mIdx < clamped.startMeasureIndex || mIdx > clamped.endMeasureIndex) {
      return m;
    }
    const shiftedNotes = sequenceShiftMotif(m.notes, stepDelta);
    const shiftedObbligato = m.obbligato ? sequenceShiftMotif(m.obbligato, stepDelta) : undefined;
    return {
      ...m,
      notes: shiftedNotes,
      obbligato: shiftedObbligato,
    };
  });

  return {
    ...song,
    measures: newMeasures,
    updatedAt: Date.now(),
  };
}

/**
 * Strips all lyric syllables from notes in the A-B range while leaving pitch and rhythm intact.
 */
export function clearMeasuresLyrics(song: Song, range: AbRange): Song {
  const clamped = clampAbRange(song, range);

  const newMeasures = song.measures.map((m, mIdx) => {
    if (mIdx < clamped.startMeasureIndex || mIdx > clamped.endMeasureIndex) {
      return m;
    }
    const clearedNotes = m.notes.map(n => ({
      ...n,
      lyric: {},
      lyricsByVerse: undefined,
    }));
    const clearedObbligato = m.obbligato?.map(o => ({
      ...o,
      lyric: {},
      lyricsByVerse: undefined,
    }));
    return {
      ...m,
      notes: clearedNotes,
      obbligato: clearedObbligato,
    };
  });

  return {
    ...song,
    measures: newMeasures,
    updatedAt: Date.now(),
  };
}

/**
 * Smartly finds the musical section boundaries (Intro, Verse, Chorus, etc.)
 * that enclose the target measure.
 */
export function smartFindSectionRange(song: Song, measureIndex: number): AbRange {
  const total = song.measures.length;
  if (total === 0) return { startMeasureIndex: 0, endMeasureIndex: 0 };
  const target = Math.max(0, Math.min(total - 1, measureIndex));

  // Find all section boundaries, grouping consecutive measures that share the same section name
  const sectionStarts: { index: number; name?: string }[] = [
    { index: 0, name: song.measures[0]?.section?.trim() }
  ];
  song.measures.forEach((m, idx) => {
    if (idx > 0 && m.section && m.section.trim()) {
      const trimmed = m.section.trim();
      const last = sectionStarts[sectionStarts.length - 1];
      if (!last || last.name !== trimmed) {
        sectionStarts.push({ index: idx, name: trimmed });
      }
    }
  });

  const startIndices = sectionStarts.map(s => s.index);

  // If no explicit sections and more than 4 measures, chunk every notesPerLine or 4
  if (startIndices.length === 1 && !song.measures[0]?.section?.trim() && total > 4) {
    const chunkSize = song.notesPerLine || 4;
    startIndices.length = 0;
    for (let i = 0; i < total; i += chunkSize) {
      startIndices.push(i);
    }
  }

  // Find the start index for target measure
  let start = 0;
  let end = total - 1;

  for (let i = 0; i < startIndices.length; i++) {
    const curStart = startIndices[i];
    const nextStart = startIndices[i + 1] !== undefined ? startIndices[i + 1] : total;
    if (target >= curStart && target < nextStart) {
      start = curStart;
      end = nextStart - 1;
      break;
    }
  }

  return {
    startMeasureIndex: start,
    endMeasureIndex: end,
  };
}

/**
 * Smartly finds the printed staff line (system) boundaries that enclose the target measure.
 */
export function smartFindSystemRange(song: Song, measureIndex: number): AbRange {
  const total = song.measures.length;
  if (total === 0) return { startMeasureIndex: 0, endMeasureIndex: 0 };
  const target = Math.max(0, Math.min(total - 1, measureIndex));

  try {
    const systems = groupMeasuresIntoSystems(
      song.measures,
      song.timeSignature || '4/4',
      song.notesPerLine || 4
    );
    for (const sys of systems) {
      const firstM = sys.measures[0];
      const lastM = sys.measures[sys.measures.length - 1];
      if (firstM && lastM && target >= firstM.measureIndex && target <= lastM.measureIndex) {
        return {
          startMeasureIndex: firstM.measureIndex,
          endMeasureIndex: lastM.measureIndex,
        };
      }
    }
  } catch {
    // Fallback if engraving error occurs
  }

  // Fallback to notesPerLine
  const npl = song.notesPerLine || 4;
  const sysStart = Math.floor(target / npl) * npl;
  const sysEnd = Math.min(total - 1, sysStart + npl - 1);
  return {
    startMeasureIndex: sysStart,
    endMeasureIndex: sysEnd,
  };
}

/**
 * Smartly detects repeat bracket boundaries around the target measure (if any).
 */
export function smartFindRepeatRange(song: Song, measureIndex: number): AbRange | null {
  const total = song.measures.length;
  if (total === 0) return null;
  const target = Math.max(0, Math.min(total - 1, measureIndex));

  // Scan backward for repeat_start
  let startIdx = -1;
  for (let i = target; i >= 0; i--) {
    if (song.measures[i]?.barlineType === 'repeat_start') {
      startIdx = i;
      break;
    }
    // If we hit an intervening repeat_end before reaching repeat_start, target is outside that repeat
    if (i < target && song.measures[i]?.barlineType === 'repeat_end') {
      break;
    }
  }

  // Scan forward for repeat_end
  let endIdx = -1;
  for (let i = target; i < total; i++) {
    if (song.measures[i]?.barlineType === 'repeat_end') {
      endIdx = i;
      break;
    }
    // If we hit an intervening repeat_start moving forward, target is outside that repeat
    if (i > target && song.measures[i]?.barlineType === 'repeat_start') {
      break;
    }
  }

  // Both repeat_start and repeat_end found enclosing target
  if (startIdx !== -1 && endIdx !== -1) {
    return {
      startMeasureIndex: startIdx,
      endMeasureIndex: endIdx,
    };
  }

  // Standard notation: repeat_end with no preceding repeat_start implies repeat from measure 0
  if (startIdx === -1 && endIdx !== -1) {
    let hasInterveningEnd = false;
    for (let i = 0; i < target; i++) {
      if (song.measures[i]?.barlineType === 'repeat_end') {
        hasInterveningEnd = true;
        break;
      }
    }
    if (!hasInterveningEnd) {
      return {
        startMeasureIndex: 0,
        endMeasureIndex: endIdx,
      };
    }
  }

  // repeat_start with no subsequent repeat_end repeats through end of song
  if (startIdx !== -1 && endIdx === -1) {
    return {
      startMeasureIndex: startIdx,
      endMeasureIndex: total - 1,
    };
  }

  return null;
}
