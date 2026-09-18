import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMeasureBeatBudget,
  fillMeasureDeficitWithRests,
  distributeLyricsAcrossNotes,
  calculateMeasureBeats,
} from '../lib/taigiUtils.ts';
import type { Song, Measure, NumberedNotationNote } from '../types/song.ts';

function createTestMeasure(id: string, measureNumber: number, noteDurations: number[], timeSignature?: any): Measure {
  const notes: NumberedNotationNote[] = noteDurations.map((d, i) => ({
    id: `n-${id}-${i}`,
    pitch: 1,
    octave: 0,
    duration: d,
    lyric: {},
  }));
  return {
    id,
    measureNumber,
    notes,
    timeSignature,
  };
}

function createTestSong(measures: Measure[], timeSignature: any = '4/4'): Song {
  return {
    id: 'test-song',
    title: 'Test Song',
    key: 'C',
    timeSignature,
    bpm: 80,
    measures,
  };
}

describe('Measure Beat Budget (MOD-3)', () => {
  it('correctly reports full measure in 4/4 time', () => {
    const measure = createTestMeasure('m1', 1, [1, 1, 1, 1]);
    const budget = getMeasureBeatBudget(measure, '4/4');

    assert.equal(budget.currentBeats, 4);
    assert.equal(budget.expectedBeats, 4);
    assert.equal(budget.remainingBeats, 0);
    assert.equal(budget.isFull, true);
    assert.equal(budget.isDeficit, false);
    assert.equal(budget.isOverbeat, false);
    assert.equal(budget.beatProgressPercent, 100);
    assert.deepEqual(budget.beatIndicators, ['filled', 'filled', 'filled', 'filled']);
  });

  it('correctly reports deficit measure in 4/4 time with partial beat indicator', () => {
    const measure = createTestMeasure('m2', 2, [1, 1, 0.5]); // 2.5 beats
    const budget = getMeasureBeatBudget(measure, '4/4');

    assert.equal(budget.currentBeats, 2.5);
    assert.equal(budget.expectedBeats, 4);
    assert.equal(budget.remainingBeats, 1.5);
    assert.equal(budget.isFull, false);
    assert.equal(budget.isDeficit, true);
    assert.equal(budget.isOverbeat, false);
    assert.equal(budget.beatProgressPercent, 63); // round(2.5/4 * 100)
    assert.deepEqual(budget.beatIndicators, ['filled', 'filled', 'partial', 'empty']);
  });

  it('correctly reports overbeat measure in 3/4 time', () => {
    const measure = createTestMeasure('m3', 3, [1, 1, 1, 1]); // 4 beats in 3/4
    const budget = getMeasureBeatBudget(measure, '3/4');

    assert.equal(budget.currentBeats, 4);
    assert.equal(budget.expectedBeats, 3);
    assert.equal(budget.remainingBeats, -1);
    assert.equal(budget.isFull, false);
    assert.equal(budget.isDeficit, false);
    assert.equal(budget.isOverbeat, true);
    assert.equal(budget.beatIndicators.length, 3);
  });

  it('handles 6/8 meter (3 quarter-note beats expected)', () => {
    const measure = createTestMeasure('m4', 4, [0.5, 0.5, 0.5, 0.5, 0.5, 0.5]); // 3 beats
    const budget = getMeasureBeatBudget(measure, '6/8');

    assert.equal(budget.currentBeats, 3);
    assert.equal(budget.expectedBeats, 3);
    assert.equal(budget.isFull, true);
  });
});

describe('Auto-Fill Deficit with Rests (MOD-3)', () => {
  it('appends minimal rest notes to fill deficit in incomplete measure', () => {
    const measure = createTestMeasure('m-def', 1, [1, 1, 0.5]); // 2.5 beats, deficit 1.5
    const filled = fillMeasureDeficitWithRests(measure, '4/4');

    const totalBeats = calculateMeasureBeats(filled.notes);
    assert.equal(totalBeats, 4);
    const addedRests = filled.notes.filter(n => n.pitch === 0);
    assert.ok(addedRests.length >= 1);
    assert.equal(addedRests.reduce((sum, r) => sum + r.duration, 0), 1.5);
  });

  it('leaves already full measure untouched', () => {
    const measure = createTestMeasure('m-full', 1, [2, 2]); // 4 beats
    const filled = fillMeasureDeficitWithRests(measure, '4/4');

    assert.equal(filled.notes.length, 2);
    assert.equal(calculateMeasureBeats(filled.notes), 4);
  });
});

describe('Smart Lyric Distribute Across Notes (MOD-3)', () => {
  it('distributes syllables starting from measure 0, note 0 across measures', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
      createTestMeasure('m2', 2, [1, 1]),
    ]);

    const updated = distributeLyricsAcrossNotes('To̍k-iā bô-phōaⁿ', song, 0, 0, 1, 'roman');
    assert.equal(updated.measures[0].notes[0].lyric.poj, 'To̍k-');
    assert.equal(updated.measures[0].notes[1].lyric.poj, 'iā');
    assert.equal(updated.measures[1].notes[0].lyric.poj, 'bô-');
    assert.equal(updated.measures[1].notes[1].lyric.poj, 'phōaⁿ');
  });

  it('distributes syllables starting from arbitrary cursor position (m1, n1)', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
      createTestMeasure('m2', 2, [1, 1]),
    ]);

    const updated = distributeLyricsAcrossNotes('阮 故 鄉', song, 0, 1, 1, 'hanlo');
    // m0 n0 is untouched
    assert.equal(updated.measures[0].notes[0].lyric.hanlo, undefined);
    assert.equal(updated.measures[0].notes[1].lyric.hanlo, '阮');
    assert.equal(updated.measures[1].notes[0].lyric.hanlo, '故');
    assert.equal(updated.measures[1].notes[1].lyric.hanlo, '鄉');
  });

  it('auto-detects CJK characters into hanlo field and Latin into roman field', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
    ]);

    const updatedHanlo = distributeLyricsAcrossNotes('春風', song, 0, 0, 1, 'auto');
    assert.equal(updatedHanlo.measures[0].notes[0].lyric.hanlo, '春');
    assert.equal(updatedHanlo.measures[0].notes[1].lyric.hanlo, '風');

    const updatedRoman = distributeLyricsAcrossNotes('chhun hong', song, 0, 0, 1, 'auto');
    assert.equal(updatedRoman.measures[0].notes[0].lyric.poj, 'chhun');
    assert.equal(updatedRoman.measures[0].notes[1].lyric.poj, 'hong');
  });
});
