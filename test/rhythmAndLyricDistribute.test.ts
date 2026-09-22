import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getMeasureBeatBudget,
  fillMeasureDeficitWithRests,
  distributeLyricsAcrossNotes,
  applyLyricTokensToSong,
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

  it('correctly handles 2/4 meter (March time: 2 beats expected)', () => {
    const fullMeasure = createTestMeasure('m-24-full', 1, [1, 1], '2/4');
    const budgetFull = getMeasureBeatBudget(fullMeasure, '2/4');
    assert.equal(budgetFull.currentBeats, 2);
    assert.equal(budgetFull.expectedBeats, 2);
    assert.equal(budgetFull.isFull, true);
    assert.equal(budgetFull.isDeficit, false);
    assert.deepEqual(budgetFull.beatIndicators, ['filled', 'filled']);

    const deficitMeasure = createTestMeasure('m-24-def', 2, [0.5], '2/4');
    const budgetDef = getMeasureBeatBudget(deficitMeasure, '2/4');
    assert.equal(budgetDef.currentBeats, 0.5);
    assert.equal(budgetDef.expectedBeats, 2);
    assert.equal(budgetDef.remainingBeats, 1.5);
    assert.equal(budgetDef.isDeficit, true);
    assert.deepEqual(budgetDef.beatIndicators, ['partial', 'empty']);
  });

  it('accurately calculates beat budget with tied notes and dotted notes', () => {
    const tiedNotes: NumberedNotationNote[] = [
      {
        id: 'n-tied-1',
        pitch: 5,
        octave: 0,
        duration: 1.5,
        isDotted: true,
        tieToNext: true,
        lyric: {},
      },
      {
        id: 'n-tied-2',
        pitch: 5,
        octave: 0,
        duration: 0.5,
        isTied: true,
        lyric: {},
      },
      {
        id: 'n-tied-3',
        pitch: 3,
        octave: 0,
        duration: 2,
        lyric: {},
      },
    ];

    const measure: Measure = {
      id: 'm-tied',
      measureNumber: 1,
      notes: tiedNotes,
    };

    const budget = getMeasureBeatBudget(measure, '4/4');
    // 1.5 + 0.5 + 2 = 4 beats total
    assert.equal(budget.currentBeats, 4);
    assert.equal(budget.expectedBeats, 4);
    assert.equal(budget.remainingBeats, 0);
    assert.equal(budget.isFull, true);
    assert.deepEqual(budget.beatIndicators, ['filled', 'filled', 'filled', 'filled']);
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

  it('distributes lyrics to verse 2 in lyricsByVerse without overwriting verse 1', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
      createTestMeasure('m2', 2, [1, 1]),
    ]);

    // First assign verse 1
    const v1Song = distributeLyricsAcrossNotes('春風 吹來', song, 0, 0, 1, 'hanlo');
    // Then assign verse 2
    const v2Song = distributeLyricsAcrossNotes('秋月 明圓', v1Song, 0, 0, 2, 'hanlo');

    // Verse 1 preserved
    assert.equal(v2Song.measures[0].notes[0].lyricsByVerse?.[1]?.hanlo, '春');
    assert.equal(v2Song.measures[0].notes[1].lyricsByVerse?.[1]?.hanlo, '風');
    assert.equal(v2Song.measures[1].notes[0].lyricsByVerse?.[1]?.hanlo, '吹');
    assert.equal(v2Song.measures[1].notes[1].lyricsByVerse?.[1]?.hanlo, '來');

    // Verse 2 populated
    assert.equal(v2Song.measures[0].notes[0].lyricsByVerse?.[2]?.hanlo, '秋');
    assert.equal(v2Song.measures[0].notes[1].lyricsByVerse?.[2]?.hanlo, '月');
    assert.equal(v2Song.measures[1].notes[0].lyricsByVerse?.[2]?.hanlo, '明');
    assert.equal(v2Song.measures[1].notes[1].lyricsByVerse?.[2]?.hanlo, '圓');
  });

  it('handles double-hyphenated enclitics and POJ tone marks gracefully', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
    ]);

    const updated = distributeLyricsAcrossNotes('khì--ah', song, 0, 0, 1, 'roman');
    assert.equal(updated.measures[0].notes[0].lyric.poj, 'khì--');
    assert.equal(updated.measures[0].notes[1].lyric.poj, 'ah');
  });
});

describe('Apply lyric tokens without flattening (INT-3)', () => {
  it('writes both POJ and Hàn-lô from dual tokens', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
    ]);

    const updated = applyLyricTokensToSong(song, [
      { poj: 'Bāng', hanlo: '望' },
      { poj: 'chhun', hanlo: '春' },
    ]);

    assert.equal(updated.measures[0].notes[0].lyric.poj, 'Bāng');
    assert.equal(updated.measures[0].notes[0].lyric.hanlo, '望');
    assert.equal(updated.measures[0].notes[1].lyric.poj, 'chhun');
    assert.equal(updated.measures[0].notes[1].lyric.hanlo, '春');
  });

  it('does not flatten dual tokens to hanlo || poj', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1]),
    ]);

    const updated = applyLyricTokensToSong(song, [{ poj: 'hong', hanlo: '' }]);
    assert.equal(updated.measures[0].notes[0].lyric.poj, 'hong');
    assert.equal(updated.measures[0].notes[0].lyric.hanlo, '');
  });

  it('writes verse 2 without rewriting verse 1', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
    ]);
    const withVerse1 = applyLyricTokensToSong(song, [
      { hanlo: '春' },
      { hanlo: '風' },
    ], { verseIndex: 1 });
    const withVerse2 = applyLyricTokensToSong(withVerse1, [
      { hanlo: '秋' },
      { hanlo: '月' },
    ], { verseIndex: 2 });

    assert.equal(withVerse2.measures[0].notes[0].lyric.hanlo, '春');
    assert.equal(withVerse2.measures[0].notes[1].lyric.hanlo, '風');
    assert.equal(withVerse2.measures[0].notes[0].lyricsByVerse?.[1]?.hanlo, '春');
    assert.equal(withVerse2.measures[0].notes[1].lyricsByVerse?.[1]?.hanlo, '風');
    assert.equal(withVerse2.measures[0].notes[0].lyricsByVerse?.[2]?.hanlo, '秋');
    assert.equal(withVerse2.measures[0].notes[1].lyricsByVerse?.[2]?.hanlo, '月');
  });

  it('honors start coordinate so earlier notes stay untouched', () => {
    const song = createTestSong([
      createTestMeasure('m1', 1, [1, 1]),
      createTestMeasure('m2', 2, [1]),
    ]);
    const updated = applyLyricTokensToSong(
      song,
      [{ poj: 'hong' }],
      { startMeasureIdx: 0, startNoteIdx: 1 }
    );

    assert.equal(updated.measures[0].notes[0].lyric.poj, undefined);
    assert.equal(updated.measures[0].notes[1].lyric.poj, 'hong');
    assert.equal(updated.measures[1].notes[0].lyric.poj, undefined);
  });
});

describe('Multilingual Two-Line Input & Auto-Detection', () => {
  it('detects script types correctly', async () => {
    const { detectScriptType } = await import('../lib/multilingualUtils.ts');
    assert.equal(detectScriptType('獨夜無伴守燈下'), 'hanlo');
    assert.equal(detectScriptType('To̍k-iā bô-phōaⁿ siú teng-ē'), 'roman');
    assert.equal(detectScriptType('Amazing grace how sweet'), 'roman');
  });

  it('separates two-line input into Hanlo and POJ and auto-swaps if inverted', async () => {
    const { separateDualLineLyrics } = await import('../lib/multilingualUtils.ts');
    // Normal order: line 1 Hanlo, line 2 POJ
    const res1 = separateDualLineLyrics('獨夜無伴守燈下\nTo̍k-iā bô-phōaⁿ siú teng-ē');
    assert.equal(res1.hanloText, '獨夜無伴守燈下');
    assert.equal(res1.romanText, 'To̍k-iā bô-phōaⁿ siú teng-ē');
    assert.equal(res1.detectedLang, 'taigi');
    assert.equal(res1.swapped, false);

    // Inverted order: line 1 POJ, line 2 Hanlo
    const res2 = separateDualLineLyrics('To̍k-iā bô-phōaⁿ siú teng-ē\n獨夜無伴守燈下');
    assert.equal(res2.hanloText, '獨夜無伴守燈下');
    assert.equal(res2.romanText, 'To̍k-iā bô-phōaⁿ siú teng-ē');
    assert.equal(res2.swapped, true);
  });

  it('pairs bilingual syllables accurately into LyricSyllable tokens', async () => {
    const { parseAndPairBilingualLyrics } = await import('../lib/multilingualUtils.ts');
    const tokens = parseAndPairBilingualLyrics('獨夜無伴', 'To̍k-iā bô-phōaⁿ', 'taigi');
    assert.equal(tokens.length, 4);
    assert.equal(tokens[0].hanlo, '獨');
    assert.equal(tokens[0].poj, 'To̍k');
    assert.equal(tokens[1].hanlo, '夜');
    assert.equal(tokens[1].poj, 'iā');
  });
});
