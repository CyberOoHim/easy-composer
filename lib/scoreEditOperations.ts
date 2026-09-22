import type {
  Song,
  Measure,
  NumberedNotationNote,
  PitchNumber,
  NoteDuration,
  BarlineType,
  ArticulationType,
  LyricSyllable,
} from '../types/song.ts';
import {
  cloneMeasuresWithFreshIds,
  renumberSongMeasures,
  generateAbId,
} from './abOperations.ts';
import {
  getExpectedMeasureBeats,
  halveNoteDuration,
  doubleNoteDuration,
  getMeasureBeatBudget,
  fillMeasureDeficitWithRests,
  getNoteVerseSyllable,
} from './taigiUtils.ts';

// ============================================================================
// MEASURE (BAR) OPERATIONS - SINGLE & BATCH
// ============================================================================

/**
 * Add a measure before or after targetMeasureIndex.
 */
export function addMeasureAt(
  song: Song,
  targetMeasureIndex: number,
  position: 'before' | 'after' = 'after'
): { song: Song; newMeasureIndex: number } {
  const defaultBeats = getExpectedMeasureBeats(song.timeSignature || '4/4');
  const freshMeasure: Measure = {
    id: generateAbId('measure'),
    measureNumber: targetMeasureIndex + 1,
    chord: song.measures[targetMeasureIndex]?.chord || 'C',
    notes: [
      {
        id: generateAbId('note'),
        pitch: 0,
        octave: 0,
        duration: defaultBeats,
        lyric: {},
      },
    ],
  };

  const currentMeasures = [...song.measures];
  const insertIndex =
    position === 'before'
      ? Math.max(0, targetMeasureIndex)
      : Math.min(currentMeasures.length, targetMeasureIndex + 1);

  currentMeasures.splice(insertIndex, 0, freshMeasure);
  const renumbered = renumberSongMeasures(currentMeasures);

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newMeasureIndex: insertIndex,
  };
}

/**
 * Duplicate measure at targetMeasureIndex and insert immediately after.
 */
export function duplicateMeasureAt(
  song: Song,
  targetMeasureIndex: number
): { song: Song; newMeasureIndex: number } {
  const target = song.measures[targetMeasureIndex];
  if (!target) return { song, newMeasureIndex: targetMeasureIndex };

  const [cloned] = cloneMeasuresWithFreshIds([target]);
  const currentMeasures = [...song.measures];
  const insertIndex = targetMeasureIndex + 1;
  currentMeasures.splice(insertIndex, 0, cloned);
  const renumbered = renumberSongMeasures(currentMeasures);

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newMeasureIndex: insertIndex,
  };
}

/**
 * Delete measure at targetMeasureIndex.
 * Leaves at least 1 measure matching time signature if song would be empty.
 */
export function deleteMeasureAt(
  song: Song,
  targetMeasureIndex: number
): { song: Song; newMeasureIndex: number } {
  if (song.measures.length <= 1) {
    // Reset the single measure to rest
    const defaultBeats = getExpectedMeasureBeats(song.timeSignature || '4/4');
    const resetMeasure: Measure = {
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
    };
    return {
      song: {
        ...song,
        measures: [resetMeasure],
        updatedAt: Date.now(),
      },
      newMeasureIndex: 0,
    };
  }

  const currentMeasures = song.measures.filter((_, idx) => idx !== targetMeasureIndex);
  const renumbered = renumberSongMeasures(currentMeasures);
  const newIndex = Math.min(renumbered.length - 1, Math.max(0, targetMeasureIndex));

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newMeasureIndex: newIndex,
  };
}

/**
 * Move / swap measure with its left or right neighbor.
 */
export function moveMeasure(
  song: Song,
  targetMeasureIndex: number,
  direction: 'left' | 'right'
): { song: Song; newMeasureIndex: number } {
  const destIndex = direction === 'left' ? targetMeasureIndex - 1 : targetMeasureIndex + 1;
  if (destIndex < 0 || destIndex >= song.measures.length) {
    return { song, newMeasureIndex: targetMeasureIndex };
  }

  const currentMeasures = [...song.measures];
  const [moved] = currentMeasures.splice(targetMeasureIndex, 1);
  currentMeasures.splice(destIndex, 0, moved);
  const renumbered = renumberSongMeasures(currentMeasures);

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newMeasureIndex: destIndex,
  };
}

/**
 * Set barline type of target measure.
 */
export function setMeasureBarline(
  song: Song,
  targetMeasureIndex: number,
  barlineType: BarlineType
): Song {
  return {
    ...song,
    measures: song.measures.map((m, idx) =>
      idx === targetMeasureIndex ? { ...m, barlineType } : m
    ),
    updatedAt: Date.now(),
  };
}

/**
 * Clear lyrics in target measure (or all verses if verseRow is undefined).
 */
export function clearMeasureLyrics(
  song: Song,
  targetMeasureIndex: number,
  verseRow?: number
): Song {
  return {
    ...song,
    measures: song.measures.map((m, mIdx) => {
      if (mIdx !== targetMeasureIndex) return m;
      return {
        ...m,
        notes: m.notes.map(n => {
          if (verseRow === undefined) {
            return {
              ...n,
              lyric: {},
              lyricsByVerse: undefined,
            };
          }
          if (verseRow === 1) {
            return {
              ...n,
              lyric: {},
              lyricsByVerse: n.lyricsByVerse
                ? Object.fromEntries(
                    Object.entries(n.lyricsByVerse).filter(([k]) => Number(k) !== 1)
                  )
                : undefined,
            };
          }
          return {
            ...n,
            lyricsByVerse: n.lyricsByVerse
              ? Object.fromEntries(
                  Object.entries(n.lyricsByVerse).filter(([k]) => Number(k) !== verseRow)
                )
              : undefined,
          };
        }),
      };
    }),
    updatedAt: Date.now(),
  };
}

/**
 * Reset notes in target measure to a clean rest note.
 */
export function clearMeasureNotes(
  song: Song,
  targetMeasureIndex: number
): Song {
  const defaultBeats = getExpectedMeasureBeats(song.timeSignature || '4/4');
  return {
    ...song,
    measures: song.measures.map((m, mIdx) => {
      if (mIdx !== targetMeasureIndex) return m;
      return {
        ...m,
        notes: [
          {
            id: generateAbId('note'),
            pitch: 0,
            octave: 0,
            duration: defaultBeats,
            lyric: {},
          },
        ],
      };
    }),
    updatedAt: Date.now(),
  };
}

/**
 * Split measure into two measures at noteIdx.
 * First measure keeps notes[0..noteIdx], new measure gets notes[noteIdx+1..end].
 */
export function splitMeasureAtNote(
  song: Song,
  targetMeasureIndex: number,
  noteIndex: number
): { song: Song; newMeasureIndex: number } {
  const target = song.measures[targetMeasureIndex];
  if (!target || target.notes.length <= 1 || noteIndex >= target.notes.length - 1) {
    return { song, newMeasureIndex: targetMeasureIndex };
  }

  const firstNotes = target.notes.slice(0, noteIndex + 1);
  const secondNotes = target.notes.slice(noteIndex + 1);

  const firstMeasure: Measure = {
    ...target,
    notes: firstNotes,
  };

  const secondMeasure: Measure = {
    id: generateAbId('measure'),
    measureNumber: target.measureNumber + 1,
    chord: target.chord,
    notes: secondNotes,
  };

  const currentMeasures = [...song.measures];
  currentMeasures.splice(targetMeasureIndex, 1, firstMeasure, secondMeasure);
  const renumbered = renumberSongMeasures(currentMeasures);

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newMeasureIndex: targetMeasureIndex + 1,
  };
}

/**
 * Merge measure with the next measure.
 */
export function mergeMeasureWithNext(
  song: Song,
  targetMeasureIndex: number
): { song: Song; newMeasureIndex: number } {
  if (targetMeasureIndex >= song.measures.length - 1) {
    return { song, newMeasureIndex: targetMeasureIndex };
  }

  const first = song.measures[targetMeasureIndex];
  const second = song.measures[targetMeasureIndex + 1];

  const mergedMeasure: Measure = {
    ...first,
    notes: [...first.notes, ...second.notes],
    barlineType: second.barlineType || first.barlineType,
  };

  const currentMeasures = [...song.measures];
  currentMeasures.splice(targetMeasureIndex, 2, mergedMeasure);
  const renumbered = renumberSongMeasures(currentMeasures);

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newMeasureIndex: targetMeasureIndex,
  };
}

// BATCH MEASURE OPERATIONS

/**
 * Delete a range of measures [startIdx, endIdx].
 */
export function batchDeleteMeasures(
  song: Song,
  startIdx: number,
  endIdx: number
): { song: Song; newMeasureIndex: number } {
  const minIdx = Math.max(0, Math.min(startIdx, endIdx));
  const maxIdx = Math.min(song.measures.length - 1, Math.max(startIdx, endIdx));

  const remaining = song.measures.filter((_, idx) => idx < minIdx || idx > maxIdx);

  if (remaining.length === 0) {
    const defaultBeats = getExpectedMeasureBeats(song.timeSignature || '4/4');
    const resetMeasure: Measure = {
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
    };
    return {
      song: {
        ...song,
        measures: [resetMeasure],
        updatedAt: Date.now(),
      },
      newMeasureIndex: 0,
    };
  }

  const renumbered = renumberSongMeasures(remaining);
  const newIndex = Math.min(renumbered.length - 1, Math.max(0, minIdx));

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newMeasureIndex: newIndex,
  };
}

/**
 * Duplicate a range of measures [startIdx, endIdx] and insert after endIdx.
 */
export function batchDuplicateMeasures(
  song: Song,
  startIdx: number,
  endIdx: number
): { song: Song; newStartIdx: number; newEndIdx: number } {
  const minIdx = Math.max(0, Math.min(startIdx, endIdx));
  const maxIdx = Math.min(song.measures.length - 1, Math.max(startIdx, endIdx));

  const slice = song.measures.slice(minIdx, maxIdx + 1);
  const cloned = cloneMeasuresWithFreshIds(slice);

  const currentMeasures = [...song.measures];
  currentMeasures.splice(maxIdx + 1, 0, ...cloned);
  const renumbered = renumberSongMeasures(currentMeasures);

  const newStart = maxIdx + 1;
  const newEnd = newStart + cloned.length - 1;

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newStartIdx: newStart,
    newEndIdx: newEnd,
  };
}

/**
 * Move a range of measures [startIdx, endIdx] left or right in the song.
 */
export function batchShiftMeasures(
  song: Song,
  startIdx: number,
  endIdx: number,
  direction: 'left' | 'right'
): { song: Song; newStartIdx: number; newEndIdx: number } {
  const minIdx = Math.max(0, Math.min(startIdx, endIdx));
  const maxIdx = Math.min(song.measures.length - 1, Math.max(startIdx, endIdx));

  if (direction === 'left' && minIdx === 0) {
    return { song, newStartIdx: minIdx, newEndIdx: maxIdx };
  }
  if (direction === 'right' && maxIdx >= song.measures.length - 1) {
    return { song, newStartIdx: minIdx, newEndIdx: maxIdx };
  }

  const currentMeasures = [...song.measures];
  const rangeLength = maxIdx - minIdx + 1;
  const extracted = currentMeasures.splice(minIdx, rangeLength);

  const insertIndex = direction === 'left' ? minIdx - 1 : minIdx + 1;
  currentMeasures.splice(insertIndex, 0, ...extracted);
  const renumbered = renumberSongMeasures(currentMeasures);

  return {
    song: {
      ...song,
      measures: renumbered,
      updatedAt: Date.now(),
    },
    newStartIdx: insertIndex,
    newEndIdx: insertIndex + rangeLength - 1,
  };
}

/**
 * Clear lyrics in a range of measures [startIdx, endIdx].
 */
export function batchClearLyrics(
  song: Song,
  startIdx: number,
  endIdx: number,
  verseRow?: number
): Song {
  const minIdx = Math.max(0, Math.min(startIdx, endIdx));
  const maxIdx = Math.min(song.measures.length - 1, Math.max(startIdx, endIdx));

  let updated = song;
  for (let i = minIdx; i <= maxIdx; i++) {
    updated = clearMeasureLyrics(updated, i, verseRow);
  }
  return updated;
}

/**
 * Pad rest deficits across a range of measures.
 */
export function batchPadRests(
  song: Song,
  startIdx: number,
  endIdx: number
): Song {
  const minIdx = Math.max(0, Math.min(startIdx, endIdx));
  const maxIdx = Math.min(song.measures.length - 1, Math.max(startIdx, endIdx));

  return {
    ...song,
    measures: song.measures.map((m, idx) => {
      if (idx < minIdx || idx > maxIdx) return m;
      const report = getMeasureBeatBudget(m, song.timeSignature || '4/4');
      if (report.isDeficit) {
        return fillMeasureDeficitWithRests(m, song.timeSignature || '4/4');
      }
      return m;
    }),
    updatedAt: Date.now(),
  };
}

// ============================================================================
// NOTE OPERATIONS - SINGLE & BATCH
// ============================================================================

/**
 * Insert note before or after nIdx in mIdx.
 */
export function insertNoteAt(
  song: Song,
  mIdx: number,
  nIdx: number,
  position: 'before' | 'after' = 'after',
  pitch: PitchNumber = 1,
  duration: NoteDuration = 1
): { song: Song; newCoord: [number, number] } {
  const targetM = song.measures[mIdx];
  if (!targetM) return { song, newCoord: [mIdx, nIdx] };

  const freshNote: NumberedNotationNote = {
    id: generateAbId('note'),
    pitch,
    octave: 0,
    duration,
    lyric: {},
  };

  const insertIdx = position === 'before' ? Math.max(0, nIdx) : nIdx + 1;
  const newNotes = [...targetM.notes];
  newNotes.splice(insertIdx, 0, freshNote);

  return {
    song: {
      ...song,
      measures: song.measures.map((m, idx) =>
        idx === mIdx ? { ...m, notes: newNotes } : m
      ),
      updatedAt: Date.now(),
    },
    newCoord: [mIdx, insertIdx],
  };
}

/**
 * Delete note at [mIdx, nIdx].
 * If measure becomes empty, preserves a single rest note.
 */
export function deleteNoteAt(
  song: Song,
  mIdx: number,
  nIdx: number
): { song: Song; newCoord: [number, number] } {
  const targetM = song.measures[mIdx];
  if (!targetM) return { song, newCoord: [mIdx, nIdx] };

  if (targetM.notes.length <= 1) {
    // Reset to rest note
    const defaultBeats = getExpectedMeasureBeats(song.timeSignature || '4/4');
    const resetNote: NumberedNotationNote = {
      id: generateAbId('note'),
      pitch: 0,
      octave: 0,
      duration: defaultBeats,
      lyric: {},
    };
    return {
      song: {
        ...song,
        measures: song.measures.map((m, idx) =>
          idx === mIdx ? { ...m, notes: [resetNote] } : m
        ),
        updatedAt: Date.now(),
      },
      newCoord: [mIdx, 0],
    };
  }

  const newNotes = targetM.notes.filter((_, idx) => idx !== nIdx);
  const nextNoteIdx = Math.min(newNotes.length - 1, Math.max(0, nIdx));

  return {
    song: {
      ...song,
      measures: song.measures.map((m, idx) =>
        idx === mIdx ? { ...m, notes: newNotes } : m
      ),
      updatedAt: Date.now(),
    },
    newCoord: [mIdx, nextNoteIdx],
  };
}

/**
 * Duplicate note at [mIdx, nIdx] and insert immediately after.
 */
export function duplicateNoteAt(
  song: Song,
  mIdx: number,
  nIdx: number
): { song: Song; newCoord: [number, number] } {
  const targetNote = song.measures[mIdx]?.notes[nIdx];
  if (!targetNote) return { song, newCoord: [mIdx, nIdx] };

  const clonedNote: NumberedNotationNote = {
    ...targetNote,
    id: generateAbId('note'),
    lyric: targetNote.lyric ? { ...targetNote.lyric } : {},
    lyricsByVerse: targetNote.lyricsByVerse
      ? Object.fromEntries(
          Object.entries(targetNote.lyricsByVerse).map(([k, v]) => [k, { ...v }])
        )
      : undefined,
  };

  const currentNotes = [...song.measures[mIdx].notes];
  currentNotes.splice(nIdx + 1, 0, clonedNote);

  return {
    song: {
      ...song,
      measures: song.measures.map((m, idx) =>
        idx === mIdx ? { ...m, notes: currentNotes } : m
      ),
      updatedAt: Date.now(),
    },
    newCoord: [mIdx, nIdx + 1],
  };
}

/**
 * Move note left or right (swap within measure, or cross measure boundary).
 */
export function moveNote(
  song: Song,
  mIdx: number,
  nIdx: number,
  direction: 'left' | 'right'
): { song: Song; newCoord: [number, number] } {
  const targetM = song.measures[mIdx];
  if (!targetM) return { song, newCoord: [mIdx, nIdx] };

  if (direction === 'left') {
    if (nIdx > 0) {
      // Swap with previous note in same measure
      const notes = [...targetM.notes];
      const temp = notes[nIdx - 1];
      notes[nIdx - 1] = notes[nIdx];
      notes[nIdx] = temp;
      return {
        song: {
          ...song,
          measures: song.measures.map((m, idx) => (idx === mIdx ? { ...m, notes } : m)),
          updatedAt: Date.now(),
        },
        newCoord: [mIdx, nIdx - 1],
      };
    } else if (mIdx > 0) {
      // Move to end of previous measure
      const prevM = song.measures[mIdx - 1];
      const movedNote = targetM.notes[0];
      const nextNotesCurrent = targetM.notes.slice(1);
      const nextNotesPrev = [...prevM.notes, movedNote];

      return {
        song: {
          ...song,
          measures: song.measures.map((m, idx) => {
            if (idx === mIdx - 1) return { ...m, notes: nextNotesPrev };
            if (idx === mIdx) return { ...m, notes: nextNotesCurrent };
            return m;
          }),
          updatedAt: Date.now(),
        },
        newCoord: [mIdx - 1, nextNotesPrev.length - 1],
      };
    }
  } else {
    // direction === 'right'
    if (nIdx < targetM.notes.length - 1) {
      // Swap with next note in same measure
      const notes = [...targetM.notes];
      const temp = notes[nIdx + 1];
      notes[nIdx + 1] = notes[nIdx];
      notes[nIdx] = temp;
      return {
        song: {
          ...song,
          measures: song.measures.map((m, idx) => (idx === mIdx ? { ...m, notes } : m)),
          updatedAt: Date.now(),
        },
        newCoord: [mIdx, nIdx + 1],
      };
    } else if (mIdx < song.measures.length - 1) {
      // Move to beginning of next measure
      const nextM = song.measures[mIdx + 1];
      const movedNote = targetM.notes[nIdx];
      const nextNotesCurrent = targetM.notes.slice(0, nIdx);
      const nextNotesNext = [movedNote, ...nextM.notes];

      return {
        song: {
          ...song,
          measures: song.measures.map((m, idx) => {
            if (idx === mIdx) return { ...m, notes: nextNotesCurrent };
            if (idx === mIdx + 1) return { ...m, notes: nextNotesNext };
            return m;
          }),
          updatedAt: Date.now(),
        },
        newCoord: [mIdx + 1, 0],
      };
    }
  }

  return { song, newCoord: [mIdx, nIdx] };
}

/**
 * Transpose pitch of note at [mIdx, nIdx].
 * Step delta: +1, -1 step; octave delta: +7, -7 or direct octave adjust.
 */
export function transposeNote(
  song: Song,
  mIdx: number,
  nIdx: number,
  stepDelta: number
): Song {
  const note = song.measures[mIdx]?.notes[nIdx];
  if (!note || typeof note.pitch !== 'number' || note.pitch === 0) return song;

  let newPitch: PitchNumber = note.pitch;
  let newOctave = note.octave;

  if (Math.abs(stepDelta) === 7) {
    // Octave shift
    newOctave = Math.max(-2, Math.min(2, newOctave + (stepDelta > 0 ? 1 : -1)));
  } else {
    // Diatonic step shift
    const rawPitch = note.pitch + stepDelta;
    if (rawPitch > 7) {
      newPitch = (rawPitch - 7) as PitchNumber;
      newOctave = Math.min(2, newOctave + 1);
    } else if (rawPitch < 1) {
      newPitch = (rawPitch + 7) as PitchNumber;
      newOctave = Math.max(-2, newOctave - 1);
    } else {
      newPitch = rawPitch as PitchNumber;
    }
  }

  return {
    ...song,
    measures: song.measures.map((m, idx) => {
      if (idx !== mIdx) return m;
      return {
        ...m,
        notes: m.notes.map((n, i) =>
          i === nIdx ? { ...n, pitch: newPitch, octave: newOctave } : n
        ),
      };
    }),
    updatedAt: Date.now(),
  };
}

/**
 * Scale duration of note at [mIdx, nIdx] (halve ÷2 or double ×2).
 */
export function scaleNoteDuration(
  song: Song,
  mIdx: number,
  nIdx: number,
  factor: 0.5 | 2
): Song {
  const note = song.measures[mIdx]?.notes[nIdx];
  if (!note) return song;

  const modifiedNote = factor === 0.5 ? halveNoteDuration(note) : doubleNoteDuration(note);

  return {
    ...song,
    measures: song.measures.map((m, idx) => {
      if (idx !== mIdx) return m;
      return {
        ...m,
        notes: m.notes.map((n, i) => (i === nIdx ? modifiedNote : n)),
      };
    }),
    updatedAt: Date.now(),
  };
}

/**
 * Toggle phrasing or articulation on note at [mIdx, nIdx].
 */
export function toggleNoteModifier(
  song: Song,
  mIdx: number,
  nIdx: number,
  modifier: 'slur' | 'tie' | 'fermata' | 'staccato' | 'accent' | 'tenuto' | 'dotted' | 'triplet'
): Song {
  const note = song.measures[mIdx]?.notes[nIdx];
  if (!note) return song;

  return {
    ...song,
    measures: song.measures.map((m, idx) => {
      if (idx !== mIdx) return m;
      return {
        ...m,
        notes: m.notes.map((n, i) => {
          if (i !== nIdx) return n;
          switch (modifier) {
            case 'slur':
              return { ...n, slurToNext: !n.slurToNext, isTied: false, tieToNext: false };
            case 'tie':
              return { ...n, tieToNext: !n.tieToNext, isTied: !n.tieToNext, slurToNext: false };
            case 'dotted':
              return { ...n, isDotted: !n.isDotted };
            case 'triplet':
              return { ...n, isTriplet: !n.isTriplet };
            case 'fermata':
              return { ...n, articulation: n.articulation === 'fermata' ? 'none' : 'fermata' };
            case 'staccato':
              return { ...n, articulation: n.articulation === 'staccato' ? 'none' : 'staccato' };
            case 'accent':
              return { ...n, articulation: n.articulation === 'accent' ? 'none' : 'accent' };
            case 'tenuto':
              return { ...n, articulation: n.articulation === 'tenuto' ? 'none' : 'tenuto' };
            default:
              return n;
          }
        }),
      };
    }),
    updatedAt: Date.now(),
  };
}

// BATCH NOTE OPERATIONS

/**
 * Delete a range of notes [startNoteIdx, endNoteIdx] in measure mIdx.
 */
export function batchDeleteNotes(
  song: Song,
  mIdx: number,
  startNoteIdx: number,
  endNoteIdx: number
): { song: Song; newCoord: [number, number] } {
  const targetM = song.measures[mIdx];
  if (!targetM) return { song, newCoord: [mIdx, startNoteIdx] };

  const minN = Math.max(0, Math.min(startNoteIdx, endNoteIdx));
  const maxN = Math.min(targetM.notes.length - 1, Math.max(startNoteIdx, endNoteIdx));

  const remaining = targetM.notes.filter((_, idx) => idx < minN || idx > maxN);

  if (remaining.length === 0) {
    const defaultBeats = getExpectedMeasureBeats(song.timeSignature || '4/4');
    const resetNote: NumberedNotationNote = {
      id: generateAbId('note'),
      pitch: 0,
      octave: 0,
      duration: defaultBeats,
      lyric: {},
    };
    return {
      song: {
        ...song,
        measures: song.measures.map((m, idx) => (idx === mIdx ? { ...m, notes: [resetNote] } : m)),
        updatedAt: Date.now(),
      },
      newCoord: [mIdx, 0],
    };
  }

  const newNIdx = Math.min(remaining.length - 1, Math.max(0, minN));

  return {
    song: {
      ...song,
      measures: song.measures.map((m, idx) => (idx === mIdx ? { ...m, notes: remaining } : m)),
      updatedAt: Date.now(),
    },
    newCoord: [mIdx, newNIdx],
  };
}

/**
 * Transpose pitch of all notes in range [startNoteIdx, endNoteIdx] in measure mIdx.
 */
export function batchTransposeNotes(
  song: Song,
  mIdx: number,
  startNoteIdx: number,
  endNoteIdx: number,
  stepDelta: number
): Song {
  const targetM = song.measures[mIdx];
  if (!targetM) return song;

  const minN = Math.max(0, Math.min(startNoteIdx, endNoteIdx));
  const maxN = Math.min(targetM.notes.length - 1, Math.max(startNoteIdx, endNoteIdx));

  let currentSong = song;
  for (let i = minN; i <= maxN; i++) {
    currentSong = transposeNote(currentSong, mIdx, i, stepDelta);
  }
  return currentSong;
}

/**
 * Scale duration of all notes in range [startNoteIdx, endNoteIdx] in measure mIdx.
 */
export function batchScaleNoteDurations(
  song: Song,
  mIdx: number,
  startNoteIdx: number,
  endNoteIdx: number,
  factor: 0.5 | 2
): Song {
  const targetM = song.measures[mIdx];
  if (!targetM) return song;

  const minN = Math.max(0, Math.min(startNoteIdx, endNoteIdx));
  const maxN = Math.min(targetM.notes.length - 1, Math.max(startNoteIdx, endNoteIdx));

  let currentSong = song;
  for (let i = minN; i <= maxN; i++) {
    currentSong = scaleNoteDuration(currentSong, mIdx, i, factor);
  }
  return currentSong;
}

// ============================================================================
// CHAR / SYLLABLE (LYRIC) OPERATIONS - SINGLE & BATCH
// ============================================================================

interface NoteLocation {
  mIdx: number;
  nIdx: number;
  note: NumberedNotationNote;
}

/**
 * Flatten all notes across all measures into a linear addressable array.
 */
export function flattenAllSongNotes(song: Song): NoteLocation[] {
  const locs: NoteLocation[] = [];
  song.measures.forEach((m, mIdx) => {
    m.notes.forEach((note, nIdx) => {
      locs.push({ mIdx, nIdx, note });
    });
  });
  return locs;
}

/**
 * Shift current syllable left or right by 1 note across the entire score.
 */
export function shiftSyllable(
  song: Song,
  mIdx: number,
  nIdx: number,
  direction: 'left' | 'right',
  verseRow: number = 1
): { song: Song; newCoord: [number, number] } {
  const allNotes = flattenAllSongNotes(song);
  const currentLinearIdx = allNotes.findIndex(
    loc => loc.mIdx === mIdx && loc.nIdx === nIdx
  );
  if (currentLinearIdx === -1) return { song, newCoord: [mIdx, nIdx] };

  const targetLinearIdx = direction === 'left' ? currentLinearIdx - 1 : currentLinearIdx + 1;
  if (targetLinearIdx < 0 || targetLinearIdx >= allNotes.length) {
    return { song, newCoord: [mIdx, nIdx] };
  }

  const currentLoc = allNotes[currentLinearIdx];
  const targetLoc = allNotes[targetLinearIdx];

  const currentSyl = getNoteVerseSyllable(currentLoc.note, verseRow);
  const targetSyl = getNoteVerseSyllable(targetLoc.note, verseRow);

  const updatedSong = updateNoteLyricAt(
    updateNoteLyricAt(song, currentLoc.mIdx, currentLoc.nIdx, targetSyl, verseRow),
    targetLoc.mIdx,
    targetLoc.nIdx,
    currentSyl,
    verseRow
  );

  return {
    song: updatedSong,
    newCoord: [targetLoc.mIdx, targetLoc.nIdx],
  };
}

/**
 * Push all syllables from [mIdx, nIdx] forward by 1 note in the score.
 * Frees up current note's lyric slot for inserting a new word/syllable!
 */
export function pushSubsequentLyrics(
  song: Song,
  mIdx: number,
  nIdx: number,
  verseRow: number = 1
): Song {
  const allNotes = flattenAllSongNotes(song);
  const startLinearIdx = allNotes.findIndex(
    loc => loc.mIdx === mIdx && loc.nIdx === nIdx
  );
  if (startLinearIdx === -1) return song;

  let currentSong = song;
  // Shift backwards from end down to start
  for (let i = allNotes.length - 1; i >= startLinearIdx; i--) {
    const fromLoc = allNotes[i];
    const toLoc = allNotes[i + 1];
    const syl = getNoteVerseSyllable(fromLoc.note, verseRow);

    if (toLoc) {
      currentSong = updateNoteLyricAt(currentSong, toLoc.mIdx, toLoc.nIdx, syl, verseRow);
    }
  }
  // Clear original start slot
  currentSong = updateNoteLyricAt(currentSong, mIdx, nIdx, {}, verseRow);
  return currentSong;
}

/**
 * Pull all syllables after [mIdx, nIdx] backward by 1 note in the score.
 * Removes current syllable and fills gap with next lyrics.
 */
export function pullSubsequentLyrics(
  song: Song,
  mIdx: number,
  nIdx: number,
  verseRow: number = 1
): Song {
  const allNotes = flattenAllSongNotes(song);
  const startLinearIdx = allNotes.findIndex(
    loc => loc.mIdx === mIdx && loc.nIdx === nIdx
  );
  if (startLinearIdx === -1) return song;

  let currentSong = song;
  for (let i = startLinearIdx; i < allNotes.length; i++) {
    const toLoc = allNotes[i];
    const fromLoc = allNotes[i + 1];
    const syl = fromLoc ? getNoteVerseSyllable(fromLoc.note, verseRow) : {};
    currentSong = updateNoteLyricAt(currentSong, toLoc.mIdx, toLoc.nIdx, syl, verseRow);
  }
  return currentSong;
}

/**
 * Clear syllable at [mIdx, nIdx].
 */
export function clearSyllableAt(
  song: Song,
  mIdx: number,
  nIdx: number,
  verseRow: number = 1
): Song {
  return updateNoteLyricAt(song, mIdx, nIdx, {}, verseRow);
}

/**
 * Insert a connector, hyphen, spacer, or punctuation to syllable at [mIdx, nIdx].
 */
export function appendToSyllable(
  song: Song,
  mIdx: number,
  nIdx: number,
  symbol: string,
  verseRow: number = 1
): Song {
  const note = song.measures[mIdx]?.notes[nIdx];
  if (!note) return song;

  const syl = getNoteVerseSyllable(note, verseRow);
  const curHanlo = syl.hanlo || syl.hanji || syl.custom || '';
  const curPoj = syl.poj || syl.tl || '';

  const newSyl: LyricSyllable = {
    ...syl,
    hanlo: symbol === '-' ? curHanlo : `${curHanlo}${symbol}`,
    poj: `${curPoj}${symbol}`,
  };

  return updateNoteLyricAt(song, mIdx, nIdx, newSyl, verseRow);
}

/**
 * Batch shift lyrics within a measure range [startMIdx, endMIdx] left or right.
 */
export function batchShiftLyricsRange(
  song: Song,
  startMIdx: number,
  endMIdx: number,
  direction: 'left' | 'right',
  verseRow: number = 1
): Song {
  const minM = Math.max(0, Math.min(startMIdx, endMIdx));
  const maxM = Math.min(song.measures.length - 1, Math.max(startMIdx, endMIdx));

  // Extract notes in range
  const locs: NoteLocation[] = [];
  for (let m = minM; m <= maxM; m++) {
    song.measures[m].notes.forEach((note, nIdx) => {
      locs.push({ mIdx: m, nIdx, note });
    });
  }

  if (locs.length <= 1) return song;

  const lyrics = locs.map(l => getNoteVerseSyllable(l.note, verseRow));
  let shiftedLyrics: LyricSyllable[];

  if (direction === 'left') {
    shiftedLyrics = [...lyrics.slice(1), {}];
  } else {
    shiftedLyrics = [{}, ...lyrics.slice(0, lyrics.length - 1)];
  }

  let currentSong = song;
  locs.forEach((loc, idx) => {
    currentSong = updateNoteLyricAt(currentSong, loc.mIdx, loc.nIdx, shiftedLyrics[idx], verseRow);
  });

  return currentSong;
}

/**
 * Helper to update a note's lyric on verseRow.
 */
function updateNoteLyricAt(
  song: Song,
  mIdx: number,
  nIdx: number,
  newSyl: LyricSyllable,
  verseRow: number
): Song {
  return {
    ...song,
    measures: song.measures.map((m, m_i) => {
      if (m_i !== mIdx) return m;
      return {
        ...m,
        notes: m.notes.map((n, n_i) => {
          if (n_i !== nIdx) return n;
          if (verseRow === 1) {
            return {
              ...n,
              lyric: newSyl,
              lyricsByVerse: n.lyricsByVerse
                ? { ...n.lyricsByVerse, 1: newSyl }
                : undefined,
            };
          }
          return {
            ...n,
            lyricsByVerse: {
              ...(n.lyricsByVerse || {}),
              [verseRow]: newSyl,
            },
          };
        }),
      };
    }),
    updatedAt: Date.now(),
  };
}
