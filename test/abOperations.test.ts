import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clampAbRange,
  cloneMeasuresWithFreshIds,
  renumberSongMeasures,
  copyMeasures,
  createScoreClipboard,
  pasteMeasures,
  deleteMeasures,
  duplicateMeasures,
  transposeMeasures,
  clearMeasuresLyrics,
  smartFindSectionRange,
  smartFindSystemRange,
  smartFindRepeatRange,
} from '../lib/abOperations.ts';
import type { Song, Measure, NumberedNotationNote } from '../types/song.ts';

function createMockSong(measureCount: number = 8): Song {
  const measures: Measure[] = [];
  for (let i = 0; i < measureCount; i++) {
    const notes: NumberedNotationNote[] = [
      {
        id: `note-${i}-0`,
        pitch: ((i % 7) + 1) as any,
        octave: 0,
        duration: 2,
        lyric: { hanlo: `詞${i}`, poj: `si${i}` },
        lyricsByVerse: { 1: { hanlo: `詞${i}`, poj: `si${i}` } },
      },
      {
        id: `note-${i}-1`,
        pitch: (((i + 2) % 7) + 1) as any,
        octave: 0,
        duration: 2,
        lyric: { hanlo: `音${i}`, poj: `im${i}` },
        lyricsByVerse: { 1: { hanlo: `音${i}`, poj: `im${i}` } },
      },
    ];

    measures.push({
      id: `measure-${i}`,
      measureNumber: i + 1,
      chord: i % 2 === 0 ? 'C' : 'G',
      section: i === 0 ? 'Intro' : i === 4 ? 'Chorus' : undefined,
      barlineType: i === 2 ? 'repeat_start' : i === 5 ? 'repeat_end' : 'single',
      notes,
    });
  }

  return {
    id: 'test-song-ab',
    title: 'Test Song for A-B Suite',
    key: 'C',
    timeSignature: '4/4',
    bpm: 90,
    measures,
    notesPerLine: 4,
  };
}

describe('A-B Operations Suite (abOperations)', () => {
  describe('Range Normalization and Clamping', () => {
    it('clamps range to within song bounds and sorts start/end', () => {
      const song = createMockSong(6);
      const clamped1 = clampAbRange(song, { startMeasureIndex: 4, endMeasureIndex: 1 });
      assert.deepEqual(clamped1, { startMeasureIndex: 1, endMeasureIndex: 4 });

      const clamped2 = clampAbRange(song, { startMeasureIndex: -5, endMeasureIndex: 100 });
      assert.deepEqual(clamped2, { startMeasureIndex: 0, endMeasureIndex: 5 });
    });
  });

  describe('Copy and Clipboard Generation', () => {
    it('deep clones measures with fresh IDs', () => {
      const song = createMockSong(6);
      const copied = copyMeasures(song, { startMeasureIndex: 1, endMeasureIndex: 3 });

      assert.equal(copied.length, 3);
      assert.notEqual(copied[0].id, song.measures[1].id);
      assert.notEqual(copied[0].notes[0].id, song.measures[1].notes[0].id);
      assert.equal(copied[0].notes[0].pitch, song.measures[1].notes[0].pitch);
      assert.equal(copied[0].notes[0].lyric.hanlo, song.measures[1].notes[0].lyric.hanlo);

      // Verify mutating copied note doesn't alter original
      copied[0].notes[0].pitch = 7 as any;
      assert.notEqual(copied[0].notes[0].pitch, song.measures[1].notes[0].pitch);
    });

    it('creates ScoreClipboard payload', () => {
      const song = createMockSong(4);
      const clip = createScoreClipboard(song, { startMeasureIndex: 0, endMeasureIndex: 1 });
      assert.equal(clip.type, 'measures');
      assert.equal(clip.measures.length, 2);
      assert.equal(clip.sourceTimeSignature, '4/4');
      assert.ok(clip.copiedAt > 0);
    });
  });

  describe('Paste Measures (Insert & Replace)', () => {
    it('pastes measures after target measure with fresh IDs and renumbers', () => {
      const song = createMockSong(4);
      const copied = copyMeasures(song, { startMeasureIndex: 0, endMeasureIndex: 1 }); // 2 bars

      const result = pasteMeasures(song, 1, copied, 'insert_after');
      assert.equal(result.pastedCount, 2);
      assert.equal(result.song.measures.length, 6);
      assert.deepEqual(
        result.song.measures.map(m => m.measureNumber),
        [1, 2, 3, 4, 5, 6]
      );
      assert.deepEqual(result.newCursor, [2, 0]);
      assert.deepEqual(result.newAbRange, { startMeasureIndex: 2, endMeasureIndex: 3 });
    });

    it('pastes measures replacing a selected range', () => {
      const song = createMockSong(6);
      const copied = copyMeasures(song, { startMeasureIndex: 0, endMeasureIndex: 0 }); // 1 bar

      // Replace measures 2 to 4 (3 bars) with 1 bar
      const result = pasteMeasures(song, 2, copied, 'replace', { startMeasureIndex: 2, endMeasureIndex: 4 });
      assert.equal(result.pastedCount, 1);
      assert.equal(result.song.measures.length, 4); // 6 - 3 + 1 = 4
      assert.deepEqual(
        result.song.measures.map(m => m.measureNumber),
        [1, 2, 3, 4]
      );
    });
  });

  describe('Delete Measures', () => {
    it('deletes selected measure range and renumbers remaining', () => {
      const song = createMockSong(6);
      const result = deleteMeasures(song, { startMeasureIndex: 1, endMeasureIndex: 3 });
      assert.equal(result.deletedCount, 3);
      assert.equal(result.song.measures.length, 3);
      assert.deepEqual(
        result.song.measures.map(m => m.measureNumber),
        [1, 2, 3]
      );
      assert.deepEqual(result.newCursor, [1, 0]);
    });

    it('leaves at least 1 rest measure if entire song is deleted', () => {
      const song = createMockSong(4);
      const result = deleteMeasures(song, { startMeasureIndex: 0, endMeasureIndex: 3 });
      assert.equal(result.song.measures.length, 1);
      assert.equal(result.song.measures[0].measureNumber, 1);
      assert.equal(result.song.measures[0].notes[0].pitch, 0); // Rest
    });
  });

  describe('Duplicate Measures', () => {
    it('clones A-B section and inserts directly after Point B', () => {
      const song = createMockSong(4);
      const result = duplicateMeasures(song, { startMeasureIndex: 1, endMeasureIndex: 2 }); // 2 bars
      assert.equal(result.duplicatedCount, 2);
      assert.equal(result.song.measures.length, 6);
      assert.deepEqual(result.newAbRange, { startMeasureIndex: 3, endMeasureIndex: 4 });
      assert.deepEqual(
        result.song.measures.map(m => m.measureNumber),
        [1, 2, 3, 4, 5, 6]
      );
    });
  });

  describe('Transpose Measures', () => {
    it('shifts pitches up by diatonic steps within A-B range only', () => {
      const song = createMockSong(4);
      const initialPitch0 = song.measures[0].notes[0].pitch;
      const initialPitch1 = song.measures[1].notes[0].pitch;

      const transposed = transposeMeasures(song, { startMeasureIndex: 1, endMeasureIndex: 2 }, 1);
      // Measure 0 unchanged
      assert.equal(transposed.measures[0].notes[0].pitch, initialPitch0);
      // Measure 1 pitch shifted up by 1 diatonic degree
      const expectedShifted = ((((Number(initialPitch1) - 1 + 1) % 7) + 7) % 7) + 1;
      assert.equal(transposed.measures[1].notes[0].pitch, expectedShifted);
    });
  });

  describe('Clear Lyrics in Measures', () => {
    it('clears lyrics in A-B measures while preserving melody notes', () => {
      const song = createMockSong(4);
      assert.ok(song.measures[1].notes[0].lyric.hanlo);

      const cleared = clearMeasuresLyrics(song, { startMeasureIndex: 1, endMeasureIndex: 2 });
      assert.deepEqual(cleared.measures[1].notes[0].lyric, {});
      assert.equal(cleared.measures[1].notes[0].lyricsByVerse, undefined);
      // Pitches and durations remain intact
      assert.equal(cleared.measures[1].notes[0].pitch, song.measures[1].notes[0].pitch);
      assert.equal(cleared.measures[1].notes[0].duration, song.measures[1].notes[0].duration);
      // Other measures still have lyrics
      assert.ok(cleared.measures[0].notes[0].lyric.hanlo);
    });
  });

  describe('Smart Range Detection', () => {
    it('smartFindSectionRange detects musical section boundaries', () => {
      const song = createMockSong(8); // Measure 0 is 'Intro', Measure 4 is 'Chorus'
      const introRange = smartFindSectionRange(song, 2);
      assert.deepEqual(introRange, { startMeasureIndex: 0, endMeasureIndex: 3 });

      const chorusRange = smartFindSectionRange(song, 5);
      assert.deepEqual(chorusRange, { startMeasureIndex: 4, endMeasureIndex: 7 });
    });

    it('smartFindSystemRange detects staff line boundaries', () => {
      const song = createMockSong(8); // Measure 0 is 'Intro', Measure 4 is 'Chorus', Measure 5 has 'repeat_end'
      const sys1 = smartFindSystemRange(song, 2);
      assert.deepEqual(sys1, { startMeasureIndex: 0, endMeasureIndex: 3 });

      // Measure 5 has repeat_end, so measures 4..5 form a system, and 6..7 form the next system
      const sys2 = smartFindSystemRange(song, 6);
      assert.deepEqual(sys2, { startMeasureIndex: 6, endMeasureIndex: 7 });
    });

    it('smartFindRepeatRange detects repeat start and end barlines', () => {
      const song = createMockSong(8); // Measure 2 is 'repeat_start', Measure 5 is 'repeat_end'
      const repeatRange = smartFindRepeatRange(song, 3);
      assert.ok(repeatRange);
      assert.equal(repeatRange.startMeasureIndex, 2);
      assert.equal(repeatRange.endMeasureIndex, 5);
    });
  });
});
