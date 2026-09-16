import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { autoWrapSongMeasures } from '../lib/taigiUtils.ts';
import type { Song, Measure, NumberedNotationNote } from '../types/song.ts';

function makeMockMeasure(
  id: string,
  measureNumber: number,
  notesCount = 4,
  overrides: Partial<Measure> = {}
): Measure {
  const notes: NumberedNotationNote[] = [];
  for (let i = 0; i < notesCount; i++) {
    notes.push({
      id: `n-${id}-${i}`,
      pitch: 1,
      octave: 0,
      duration: 1,
      lyric: {},
    });
  }
  return {
    id,
    measureNumber,
    notes,
    isLineBreak: false,
    ...overrides,
  };
}

function makeMockSong(measures: Measure[], notesPerLine = 4): Song {
  return {
    id: 'test-song-1',
    title: 'Wrap Test Song',
    composer: 'Tester',
    key: 'C',
    timeSignature: '4/4',
    bpm: 100,
    notesPerLine,
    measures,
    updatedAt: 1000,
  };
}

describe('autoWrapSongMeasures', () => {
  it('does not modify single-measure songs', () => {
    const song = makeMockSong([makeMockMeasure('m1', 1)]);
    const wrapped = autoWrapSongMeasures(song);
    assert.equal(wrapped.measures.length, 1);
    assert.equal(wrapped.measures[0].isLineBreak, false);
  });

  it('correctly sets line breaks for an 8-measure standard song with notesPerLine = 4', () => {
    const measures = Array.from({ length: 8 }, (_, i) => makeMockMeasure(`m${i + 1}`, i + 1));
    const song = makeMockSong(measures, 4);
    const wrapped = autoWrapSongMeasures(song);

    // Measure 4 (index 3) should have isLineBreak = true
    assert.equal(wrapped.measures[3].isLineBreak, true);
    // Measure 8 (index 7, last measure) should have isLineBreak = false
    assert.equal(wrapped.measures[7].isLineBreak, false);
    // Other measures should not have line breaks
    assert.equal(wrapped.measures[0].isLineBreak, false);
    assert.equal(wrapped.measures[1].isLineBreak, false);
    assert.equal(wrapped.measures[2].isLineBreak, false);
    assert.equal(wrapped.measures[4].isLineBreak, false);
    assert.equal(wrapped.measures[5].isLineBreak, false);
    assert.equal(wrapped.measures[6].isLineBreak, false);
  });

  it('wraps early for high-density measures to prevent overflowing paper margins', () => {
    // 4 dense measures with 12 notes each
    const denseMeasures = [
      makeMockMeasure('m1', 1, 12),
      makeMockMeasure('m2', 2, 12),
      makeMockMeasure('m3', 3, 12),
      makeMockMeasure('m4', 4, 12),
    ];
    const song = makeMockSong(denseMeasures, 4);
    const wrapped = autoWrapSongMeasures(song);

    // Because density exceeds the line budget, it wraps before reaching 4 measures
    const breakIndices = wrapped.measures
      .map((m, idx) => (m.isLineBreak ? idx : -1))
      .filter(idx => idx !== -1);

    assert.ok(breakIndices.length > 0);
    // Line breaks should occur at index < 3 to protect margins
    assert.ok(breakIndices[0] < 3);
  });

  it('breaks before a major section transition when line already has measures', () => {
    const measures = [
      makeMockMeasure('m1', 1),
      makeMockMeasure('m2', 2),
      makeMockMeasure('m3', 3, 4, { section: 'Chorus' }),
      makeMockMeasure('m4', 4),
    ];
    const song = makeMockSong(measures, 4);
    const wrapped = autoWrapSongMeasures(song);

    // Should break at measure 2 (index 1) so Chorus starts cleanly on new line
    assert.equal(wrapped.measures[1].isLineBreak, true);
    assert.equal(wrapped.measures[2].isLineBreak, false);
  });

  it('respects repeat/end barlines to create clean cadence wraps', () => {
    const measures = [
      makeMockMeasure('m1', 1),
      makeMockMeasure('m2', 2, 4, { barlineType: 'repeat_end' }),
      makeMockMeasure('m3', 3),
      makeMockMeasure('m4', 4),
    ];
    const song = makeMockSong(measures, 4);
    const wrapped = autoWrapSongMeasures(song);

    // Measure 2 (index 1) has repeat_end, should trigger system break
    assert.equal(wrapped.measures[1].isLineBreak, true);
  });
});
