import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { autoWrapSongMeasures } from '../lib/taigiUtils.ts';
import type { Song, Measure, NumberedNotationNote, SheetOrientation } from '../types/song.ts';

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

  it('only presents sectionText on the first measure of a section, avoiding duplicates', async () => {
    const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
    const rawMeasures: Measure[] = [
      makeMockMeasure('m1', 1, 4, { section: 'Prelude' }),
      makeMockMeasure('m2', 2, 4, { section: 'Prelude' }),
      makeMockMeasure('m3', 3, 4, { section: 'Prelude' }),
      makeMockMeasure('m4', 4, 4, { section: 'Prelude' }),
      makeMockMeasure('m5', 5, 4, { section: 'Verse' }),
    ];
    const systems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'no_wrap');
    const allEngraved = systems.flatMap(s => s.measures);

    // Measure 1 (index 0) should have sectionText = 'Prelude'
    assert.equal(allEngraved[0].sectionText, 'Prelude');
    // Measures 2, 3, 4 should have sectionText = ''
    assert.equal(allEngraved[1].sectionText, '');
    assert.equal(allEngraved[2].sectionText, '');
    assert.equal(allEngraved[3].sectionText, '');
    // Measure 5 (index 4) starts Verse, so it should have sectionText = 'Verse'
    assert.equal(allEngraved[4].sectionText, 'Verse');
  });

  it('ensures preset 望春風 only starts section at measure 1 and measure 5', async () => {
    const { PRESET_SONGS } = await import('../lib/presets.ts');
    const bch = PRESET_SONGS[0];
    assert.equal(bch.measures[0].section, 'Prelude');
    assert.equal(bch.measures[1].section, undefined);
    assert.equal(bch.measures[2].section, undefined);
    assert.equal(bch.measures[3].section, undefined);
    assert.equal(bch.measures[4].section, 'Verse');
  });

  describe('3-Mode Measure Arrangement in Portrait & Landscape', () => {
    it('Mode 1 (no_wrap): lines spread completely and only wrap at delimiters and manual breaks for both portrait and landscape', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      // 8 standard measures without manual line breaks or delimiters
      const rawMeasures: Measure[] = Array.from({ length: 8 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4, { isLineBreak: false })
      );

      // In no_wrap, measures without breaks or delimiters stay on a single line (extending the sheet)
      const portraitSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'no_wrap', 'portrait');
      assert.equal(portraitSystems.length, 1, 'no_wrap should not arbitrarily break without delimiters in portrait');
      assert.equal(portraitSystems[0].measures.length, 8, 'All 8 measures should be on one line');

      const landscapeSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'no_wrap', 'landscape');
      assert.equal(landscapeSystems.length, 1, 'no_wrap should not arbitrarily break without delimiters in landscape');
      assert.equal(landscapeSystems[0].measures.length, 8, 'All 8 measures should be on one line');

      // Now add explicit break on measure 4: should cleanly wrap into 2 systems (4 and 4)
      const breakMeasures = Array.from({ length: 8 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4, { isLineBreak: i === 3 })
      );
      const brokenSystems = groupMeasuresIntoSystems(breakMeasures, '4/4', 4, 'no_wrap', 'portrait');
      assert.equal(brokenSystems.length, 2, 'no_wrap should wrap at explicit break');
      assert.equal(brokenSystems[0].measures.length, 4);
      assert.equal(brokenSystems[1].measures.length, 4);
    });

    it('Mode 2 (auto_fit): strictly follows the dropdown setting in Portrait (4) and Landscape (5)', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      const standardMeasures: Measure[] = Array.from({ length: 10 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4)
      );

      // Portrait auto_fit defaults to 4 measures per line
      const pSystems = groupMeasuresIntoSystems(standardMeasures, '4/4', 4, 'auto_fit', 'portrait');
      assert.equal(pSystems[0].measures.length, 4);
      assert.equal(pSystems[1].measures.length, 4);
      assert.equal(pSystems[2].measures.length, 2); // remaining

      // Landscape auto_fit defaults to 5 measures per line
      const lSystems = groupMeasuresIntoSystems(standardMeasures, '4/4', 5, 'auto_fit', 'landscape');
      assert.equal(lSystems[0].measures.length, 5);
      assert.equal(lSystems[1].measures.length, 5);

      // Auto Fix strictly follows the dropdown setting even with dense measures
      const denseMeasures: Measure[] = [
        makeMockMeasure('d1', 1, 16), // 16 notes (very dense)
        makeMockMeasure('d2', 2, 16),
        makeMockMeasure('d3', 3, 16),
        makeMockMeasure('d4', 4, 16),
      ];
      const denseFixSystems = groupMeasuresIntoSystems(denseMeasures, '4/4', 4, 'auto_fit', 'portrait');
      assert.equal(denseFixSystems[0].measures.length, 4, 'auto_fit strictly keeps 4 measures per line as requested by user');

      // Whereas auto_wrap dynamically breaks early for dense measures to prevent collision
      const denseWrapSystems = groupMeasuresIntoSystems(denseMeasures, '4/4', 4, 'auto_wrap', 'portrait');
      assert.ok(denseWrapSystems.length > 1, 'auto_wrap breaks early to prevent collision');
    });

    it('Mode 3 (auto_wrap): dynamically budgets line width for Portrait (800px) vs Landscape (1160px)', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      const rawMeasures: Measure[] = Array.from({ length: 12 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4)
      );

      const pSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'auto_wrap', 'portrait');
      const lSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 5, 'auto_wrap', 'landscape');

      // Landscape should require fewer systems because each line has a 1160px budget instead of 800px
      assert.ok(lSystems.length <= pSystems.length, 'Landscape requires fewer or equal systems than portrait');
      assert.ok(lSystems[0].measures.length >= pSystems[0].measures.length, 'Landscape first line should pack more measures');
    });

    it('allocates sufficient requiredWidth for long POJ syllables and multi-verse lyrics to prevent collision', async () => {
      const { calculateNoteRequiredWidth } = await import('../lib/numberedNotationEngraver.ts');
      // Note with short syllable
      const shortNote: NumberedNotationNote = {
        id: 'n1',
        pitch: 1,
        octave: 0,
        duration: 1,
        lyric: { hanlo: '你', poj: 'lí' },
      };
      const shortWidth = calculateNoteRequiredWidth(shortNote);

      // Note with long POJ syllable (e.g. chháichheng)
      const longNote: NumberedNotationNote = {
        id: 'n2',
        pitch: 1,
        octave: 0,
        duration: 1,
        lyric: { hanlo: '採茶', poj: 'chháichheng' },
      };
      const longWidth = calculateNoteRequiredWidth(longNote);

      assert.ok(longWidth > shortWidth, 'Long POJ syllable must have significantly larger required width');
      assert.ok(longWidth >= 75, `Long syllable should have >= 75px required width, got ${longWidth}`);

      // Note with 3 stacked verses
      const multiVerseNote: NumberedNotationNote = {
        id: 'n3',
        pitch: 1,
        octave: 0,
        duration: 1,
        lyric: { hanlo: '一', poj: 'chit' },
        lyricsByVerse: {
          1: { hanlo: '一', poj: 'chit' },
          2: { hanlo: '重重', poj: 'têng-têng' },
          3: { hanlo: '穿過', poj: 'chhoan-kòe' },
        },
      };
      const mvWidth = calculateNoteRequiredWidth(multiVerseNote);
      assert.ok(mvWidth >= 55, `Multi-verse note should have >= 55px required width, got ${mvWidth}`);
    });

    it('autoWrapSongMeasures adapts wrapping density based on orientation', () => {
      const denseMeasures = Array.from({ length: 12 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 8)
      );
      const song = makeMockSong(denseMeasures, 4);

      const wrappedPortrait = autoWrapSongMeasures(song, undefined, 'portrait');
      const wrappedLandscape = autoWrapSongMeasures(song, undefined, 'landscape');

      const portraitBreaks = wrappedPortrait.measures.filter(m => m.isLineBreak).length;
      const landscapeBreaks = wrappedLandscape.measures.filter(m => m.isLineBreak).length;

      // Portrait should have more line breaks than Landscape because Landscape has ~40% wider lines
      assert.ok(portraitBreaks >= landscapeBreaks, 'Portrait should have more or equal line breaks than Landscape');
      assert.equal(wrappedLandscape.orientation, 'landscape');
      assert.equal(wrappedLandscape.notesPerLine, 5);
    });

    it('toggles a standard 28-measure song (like 望春風) from 4 bars/line to 5 bars/line in Landscape', () => {
      // Simulating a preset song with breaks at 4, 8, 12, 16, 20, 24
      const measures = Array.from({ length: 28 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4, { isLineBreak: (i + 1) % 4 === 0 })
      );
      const song = makeMockSong(measures, 4);

      const rewrapped = autoWrapSongMeasures(song, undefined, 'landscape');
      assert.equal(rewrapped.orientation, 'landscape');
      assert.equal(rewrapped.notesPerLine, 5);

      // Measure 5 should have isLineBreak = true, Measure 4 should be false
      assert.equal(rewrapped.measures[3].isLineBreak, false, 'Measure 4 break should be cleared for landscape');
      assert.equal(rewrapped.measures[4].isLineBreak, true, 'Measure 5 should be the new line break in landscape');
      assert.equal(rewrapped.measures[9].isLineBreak, true, 'Measure 10 should be the line break in landscape');
    });

    it('groupMeasuresIntoSystems strictly follows target measures (5 or 4) in Landscape for auto_fit even with legacy breaks', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      const measuresWith4BarBreaks = Array.from({ length: 20 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4, { isLineBreak: (i + 1) % 4 === 0 })
      );

      const systems5 = groupMeasuresIntoSystems(measuresWith4BarBreaks, '4/4', 5, 'auto_fit', 'landscape');
      // When target is 5 in landscape auto_fit, systems should pack 5 measures
      assert.equal(systems5[0].measures.length, 5, 'First system should have 5 measures in landscape auto_fit');
      assert.equal(systems5[1].measures.length, 5, 'Second system should have 5 measures in landscape auto_fit');
      assert.equal(systems5.length, 4, '20 measures at 5 per line should produce exactly 4 systems');

      const systems4 = groupMeasuresIntoSystems(measuresWith4BarBreaks, '4/4', 4, 'auto_fit', 'landscape');
      // When target is 4 in landscape auto_fit, systems should strictly pack 4 measures, honoring user choice
      assert.equal(systems4[0].measures.length, 4, 'First system should have 4 measures in landscape auto_fit when target is 4');
      assert.equal(systems4.length, 5, '20 measures at 4 per line should produce exactly 5 systems');
    });

    it('groupMeasuresIntoSystems in no_wrap spreads completely and wraps only at delimiters and break/new line for portrait and landscape', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      
      // 10 measures without manual breaks or delimiters
      const continuousMeasures = Array.from({ length: 10 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4, { isLineBreak: false })
      );

      // In no_wrap, continuous measures without delimiters stay on 1 system (sheet extends to the right)
      const systemsPortrait = groupMeasuresIntoSystems(continuousMeasures, '4/4', 4, 'no_wrap', 'portrait');
      assert.equal(systemsPortrait.length, 1, 'In no_wrap portrait, measures without delimiters should remain on a single line');
      assert.equal(systemsPortrait[0].measures.length, 10, 'All 10 measures should be in the single system');
      assert.ok(systemsPortrait[0].totalRequiredWidth > 750, 'Total width extends and accumulates on single line');

      const systemsLandscape = groupMeasuresIntoSystems(continuousMeasures, '4/4', 4, 'no_wrap', 'landscape');
      assert.equal(systemsLandscape.length, 1, 'In no_wrap landscape, measures without delimiters should remain on a single line');
      assert.equal(systemsLandscape[0].measures.length, 10, 'All 10 measures should be in the single system');

      // Now test delimiters: double barline, repeat_end, section header, and manual line breaks
      const delimitedMeasures = [
        makeMockMeasure('m1', 1, 4, { isLineBreak: false }),
        makeMockMeasure('m2', 2, 4, { isLineBreak: false, barlineType: 'double' }), // Delimiter: double barline
        makeMockMeasure('m3', 3, 4, { isLineBreak: false }),
        makeMockMeasure('m4', 4, 4, { isLineBreak: true }), // Delimiter: manual line break
        makeMockMeasure('m5', 5, 4, { isLineBreak: false, section: 'Chorus' }), // Delimiter: section header
        makeMockMeasure('m6', 6, 4, { isLineBreak: false, barlineType: 'repeat_end' }), // Delimiter: repeat end
        makeMockMeasure('m7', 7, 4, { isLineBreak: false }),
      ];

      const delimitedSystems = groupMeasuresIntoSystems(delimitedMeasures, '4/4', 4, 'no_wrap', 'portrait');
      // Should wrap after m2 (double barline), after m4 (isLineBreak), after m6 (repeat_end)
      // Line 1: m1, m2 (ends at double barline)
      // Line 2: m3, m4 (ends at isLineBreak)
      // Line 3: m5, m6 (starts with section Chorus, ends at repeat_end)
      // Line 4: m7
      assert.equal(delimitedSystems.length, 4, 'Should produce 4 systems separated by delimiters in portrait');
      assert.deepEqual(
        delimitedSystems.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2], [3, 4], [5, 6], [7]],
        'Systems should be split precisely at delimiter barlines, section starts, and line breaks in portrait'
      );

      const delimitedSystemsLandscape = groupMeasuresIntoSystems(delimitedMeasures, '4/4', 5, 'no_wrap', 'landscape');
      assert.equal(delimitedSystemsLandscape.length, 4, 'Should produce 4 systems separated by delimiters in landscape');
      assert.deepEqual(
        delimitedSystemsLandscape.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2], [3, 4], [5, 6], [7]],
        'Systems should be split precisely at delimiter barlines, section starts, and line breaks in landscape'
      );
    });

    it('splits systems in no_wrap mode at delimiters (，, 。, ,, .) and newline verse breaks (↵, \\n, \\r), excluding whitespace spacers (␣, \' \')', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');

      // Helper to make a measure with a specific final note
      const makeMeasureWithLastNote = (
        id: string,
        measureNumber: number,
        lyric: { hanlo?: string; poj?: string }
      ): Measure => ({
        id,
        measureNumber,
        isLineBreak: false,
        notes: [
          { id: `n-${id}-1`, pitch: 1, octave: 0, duration: 1, lyric: { hanlo: '歌', poj: 'koa' } },
          { id: `n-${id}-2`, pitch: 2, octave: 0, duration: 1, lyric: { hanlo: '聲', poj: 'siaⁿ' } },
          { id: `n-${id}-3`, pitch: 3, octave: 0, duration: 1, lyric: { hanlo: '響', poj: 'hiáng' } },
          { id: `n-${id}-4`, pitch: 'empty', octave: 0, duration: 0, lyric },
        ],
      });

      // 6 measures:
      // m1: has delimiter comma '，' -> should split after m1
      // m2: has whitespace spacer '␣' -> must NOT split after m2
      // m3: has newline verse break '↵' -> should split after m3
      // m4: has delimiter period '。' -> should split after m4
      // m5: has whitespace spacer ' ' -> must NOT split after m5
      // m6: regular notes
      const measures: Measure[] = [
        makeMeasureWithLastNote('m1', 1, { hanlo: '，', poj: '，' }),
        makeMeasureWithLastNote('m2', 2, { hanlo: '␣', poj: '␣' }),
        makeMeasureWithLastNote('m3', 3, { hanlo: '↵', poj: '↵' }),
        makeMeasureWithLastNote('m4', 4, { hanlo: '。', poj: '。' }),
        makeMeasureWithLastNote('m5', 5, { hanlo: ' ', poj: ' ' }),
        makeMeasureWithLastNote('m6', 6, { hanlo: '好', poj: 'hó' }),
      ];

      const systems = groupMeasuresIntoSystems(measures, '4/4', 4, 'no_wrap', 'portrait');

      // Expected systems:
      // System 1: [1] (splits after m1 because of '，')
      // System 2: [2, 3] (m2 had '␣' so m3 stays on line; splits after m3 because of '↵')
      // System 3: [4] (splits after m4 because of '。')
      // System 4: [5, 6] (m5 had ' ' so m6 stays on line)
      assert.equal(systems.length, 4, 'Should split into exactly 4 systems');
      assert.deepEqual(
        systems.map(s => s.measures.map(m => m.measureNumber)),
        [[1], [2, 3], [4], [5, 6]],
        'Delimiters and newlines must split lines, while whitespace spacers must be excluded from splitting'
      );

      const systemsLandscape = groupMeasuresIntoSystems(measures, '4/4', 5, 'no_wrap', 'landscape');
      assert.equal(systemsLandscape.length, 4, 'Landscape should split into exactly 4 systems');
      assert.deepEqual(
        systemsLandscape.map(s => s.measures.map(m => m.measureNumber)),
        [[1], [2, 3], [4], [5, 6]],
        'Delimiters and newlines must split lines in landscape identically to portrait'
      );

      // Also verify halfwidth delimiters (comma and period) and \n / \r
      const halfwidthMeasures: Measure[] = [
        makeMeasureWithLastNote('h1', 1, { hanlo: ',', poj: ',' }),
        makeMeasureWithLastNote('h2', 2, { hanlo: '\n', poj: '\n' }),
        makeMeasureWithLastNote('h3', 3, { hanlo: '.', poj: '.' }),
        makeMeasureWithLastNote('h4', 4, { hanlo: '\r', poj: '\r' }),
        makeMeasureWithLastNote('h5', 5, { hanlo: '完', poj: 'oân' }),
      ];

      const halfwidthSystems = groupMeasuresIntoSystems(halfwidthMeasures, '4/4', 4, 'no_wrap', 'portrait');
      assert.equal(halfwidthSystems.length, 5, 'Each delimiter and newline should create a new line');
      assert.deepEqual(
        halfwidthSystems.map(s => s.measures.map(m => m.measureNumber)),
        [[1], [2], [3], [4], [5]],
        'Halfwidth delimiters and \\n, \\r must trigger line splits'
      );

      const halfwidthSystemsLandscape = groupMeasuresIntoSystems(halfwidthMeasures, '4/4', 5, 'no_wrap', 'landscape');
      assert.equal(halfwidthSystemsLandscape.length, 5, 'Landscape each delimiter and newline should create a new line');
      assert.deepEqual(
        halfwidthSystemsLandscape.map(s => s.measures.map(m => m.measureNumber)),
        [[1], [2], [3], [4], [5]],
        'Halfwidth delimiters and \\n, \\r must trigger line splits in landscape'
      );

      // Also verify exclamation marks and question marks (fullwidth and halfwidth)
      const punctMeasures: Measure[] = [
        makeMeasureWithLastNote('p1', 1, { hanlo: '歌！', poj: 'koa!' }),
        makeMeasureWithLastNote('p2', 2, { hanlo: '聲？', poj: 'siaⁿ?' }),
        makeMeasureWithLastNote('p3', 3, { hanlo: '響', poj: 'hiáng' }),
      ];
      const punctPortrait = groupMeasuresIntoSystems(punctMeasures, '4/4', 4, 'no_wrap', 'portrait');
      const punctLandscape = groupMeasuresIntoSystems(punctMeasures, '4/4', 5, 'no_wrap', 'landscape');
      assert.deepEqual(punctPortrait.map(s => s.measures.map(m => m.measureNumber)), [[1], [2], [3]]);
      assert.deepEqual(punctLandscape.map(s => s.measures.map(m => m.measureNumber)), [[1], [2], [3]]);
    });


    it('groups consecutive empty measures as the same line, ending before a measure with badge or with lyrics in no_wrap mode', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');

      // Helper to make an empty measure (rests or empty notes, no lyrics, no badge)
      const makeEmptyMeasure = (id: string, measureNumber: number): Measure => ({
        id,
        measureNumber,
        isLineBreak: false,
        notes: [
          { id: `n-${id}-1`, pitch: 0, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-2`, pitch: 0, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-3`, pitch: 0, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-4`, pitch: 0, octave: 0, duration: 1, lyric: {} },
        ],
      });

      // Helper to make a measure with lyrics
      const makeMeasureWithLyrics = (id: string, measureNumber: number, word: string): Measure => ({
        id,
        measureNumber,
        isLineBreak: false,
        notes: [
          { id: `n-${id}-1`, pitch: 1, octave: 0, duration: 1, lyric: { hanlo: word } },
          { id: `n-${id}-2`, pitch: 2, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-3`, pitch: 3, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-4`, pitch: 5, octave: 0, duration: 1, lyric: {} },
        ],
      });

      // Helper to make a measure with a section badge
      const makeMeasureWithBadge = (id: string, measureNumber: number, section: string): Measure => ({
        id,
        measureNumber,
        isLineBreak: false,
        section,
        notes: [
          { id: `n-${id}-1`, pitch: 0, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-2`, pitch: 0, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-3`, pitch: 0, octave: 0, duration: 1, lyric: {} },
          { id: `n-${id}-4`, pitch: 0, octave: 0, duration: 1, lyric: {} },
        ],
      });

      // Sequence 1: 3 empty measures (m1, m2, m3), then m4 with lyrics, then m5 with lyrics
      const seq1 = [
        makeEmptyMeasure('m1', 1),
        makeEmptyMeasure('m2', 2),
        makeEmptyMeasure('m3', 3),
        makeMeasureWithLyrics('m4', 4, 'Goân-iā'),
        makeMeasureWithLyrics('m5', 5, 'chhiu-hong'),
      ];

      const systems1 = groupMeasuresIntoSystems(seq1, '4/4', 4, 'no_wrap', 'portrait');
      assert.equal(systems1.length, 2, 'Should group consecutive empty measures on line 1 and end before measure with lyrics');
      assert.deepEqual(
        systems1.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2, 3], [4, 5]],
        'Line 1 should contain consecutive empty measures 1-3, Line 2 should start at measure 4 with lyrics'
      );

      // Sequence 2: 4 empty measures (m1-m4), then m5 with a section badge [Chorus]
      const seq2 = [
        makeEmptyMeasure('m1', 1),
        makeEmptyMeasure('m2', 2),
        makeEmptyMeasure('m3', 3),
        makeEmptyMeasure('m4', 4),
        makeMeasureWithBadge('m5', 5, 'Chorus'),
        makeEmptyMeasure('m6', 6),
      ];

      const systems2 = groupMeasuresIntoSystems(seq2, '4/4', 4, 'no_wrap', 'portrait');
      assert.deepEqual(
        systems2.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2, 3, 4], [5, 6]],
        'Line 1 should contain consecutive empty measures 1-4, Line 2 should start before measure 5 with badge'
      );

      // Sequence 3: Content measures (m1-m2 with lyrics), then consecutive empty measures (m3-m5), then m6 with badge
      const seq3 = [
        makeMeasureWithLyrics('m1', 1, 'Taigi'),
        makeMeasureWithLyrics('m2', 2, 'Koa'),
        makeEmptyMeasure('m3', 3),
        makeEmptyMeasure('m4', 4),
        makeEmptyMeasure('m5', 5),
        makeMeasureWithBadge('m6', 6, 'Outro'),
      ];

      const systems1Landscape = groupMeasuresIntoSystems(seq1, '4/4', 5, 'no_wrap', 'landscape');
      assert.deepEqual(
        systems1Landscape.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2, 3], [4, 5]],
        'Landscape should group consecutive empty measures on line 1 and end before measure with lyrics'
      );

      const systems2Landscape = groupMeasuresIntoSystems(seq2, '4/4', 5, 'no_wrap', 'landscape');
      assert.deepEqual(
        systems2Landscape.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2, 3, 4], [5, 6]],
        'Landscape should group consecutive empty measures on line 1 and start before badge'
      );

      const systems3 = groupMeasuresIntoSystems(seq3, '4/4', 4, 'no_wrap', 'portrait');
      assert.deepEqual(
        systems3.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2], [3, 4, 5], [6]],
        'Should produce 3 lines: content line (1-2), consecutive empty line (3-5), and section badge line (6)'
      );

      const systems3Landscape = groupMeasuresIntoSystems(seq3, '4/4', 5, 'no_wrap', 'landscape');
      assert.deepEqual(
        systems3Landscape.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2], [3, 4, 5], [6]],
        'Landscape should produce 3 lines identical to portrait'
      );
    });

    it('preserves no_wrap layout across orientation toggles without autoWrap injection', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');

      // Create a song with 8 continuous measures where only measure 4 has a delimiter
      const songMeasures: Measure[] = Array.from({ length: 8 }, (_, i) => ({
        id: `m-${i + 1}`,
        measureNumber: i + 1,
        isLineBreak: false,
        notes: [
          {
            id: `n-${i + 1}-1`,
            pitch: 1,
            octave: 0,
            duration: 1,
            lyric: i === 3 ? { hanlo: '歌，', poj: 'koa,' } : { hanlo: '歌', poj: 'koa' },
          },
        ],
      }));

      // In no_wrap, portrait and landscape both produce exactly 2 systems: [1..4] and [5..8]
      const systemsPortrait = groupMeasuresIntoSystems(songMeasures, '4/4', 4, 'no_wrap', 'portrait');
      const systemsLandscape = groupMeasuresIntoSystems(songMeasures, '4/4', 5, 'no_wrap', 'landscape');

      assert.deepEqual(systemsPortrait.map(s => s.measures.map(m => m.measureNumber)), [[1, 2, 3, 4], [5, 6, 7, 8]]);
      assert.deepEqual(systemsLandscape.map(s => s.measures.map(m => m.measureNumber)), [[1, 2, 3, 4], [5, 6, 7, 8]]);

      // Verify that toggling orientation without autoWrap preserves the exact measure structure
      const orientationToggled = {
        title: 'Test',
        measures: songMeasures,
        orientation: 'landscape' as SheetOrientation,
        notesPerLine: 5,
      };

      const systemsAfterToggle = groupMeasuresIntoSystems(
        orientationToggled.measures,
        '4/4',
        orientationToggled.notesPerLine,
        'no_wrap',
        orientationToggled.orientation
      );

      assert.deepEqual(
        systemsAfterToggle.map(s => s.measures.map(m => m.measureNumber)),
        [[1, 2, 3, 4], [5, 6, 7, 8]],
        'Toggling orientation in no_wrap mode must preserve delimiter line breaks without injecting 5-bar wraps'
      );
    });

    it('Mode 3 (auto_wrap): strictly enforces capacity and keeps landscape measures inside sheet boundaries', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      const { PRESET_SONGS } = await import('../lib/presets.ts');
      const bch = PRESET_SONGS[0];

      // 1. In Landscape auto_wrap with standard iPad content width (~880px):
      // No system should exceed 5 measures, and totalRequiredWidth of each system should stay within the line budget
      const ipadSystems = groupMeasuresIntoSystems(bch.measures, '4/4', 5, 'auto_wrap', 'landscape', 880);
      for (const sys of ipadSystems) {
        assert.ok(
          sys.measures.length <= 5,
          `System should have at most 5 measures in landscape auto_wrap, got ${sys.measures.length}`
        );
        assert.ok(
          sys.totalRequiredWidth <= 900,
          `System totalRequiredWidth (${sys.totalRequiredWidth}) should comfortably fit in landscape canvas`
        );
      }

      // Ensure no line has 6 measures (which previously caused measure 14 and 20 overflow)
      const maxMeasuresInAnySystem = Math.max(...ipadSystems.map(s => s.measures.length));
      assert.ok(maxMeasuresInAnySystem <= 5, 'Landscape auto_wrap must never pack 6 measures into a system');

      // 2. In Landscape auto_wrap with default width (no maxLineWidth provided)
      const defaultLandscapeSystems = groupMeasuresIntoSystems(bch.measures, '4/4', 5, 'auto_wrap', 'landscape');
      for (const sys of defaultLandscapeSystems) {
        assert.ok(
          sys.measures.length <= 5,
          `Default landscape auto_wrap system should not exceed 5 measures, got ${sys.measures.length}`
        );
      }

      // 3. In Portrait auto_wrap: no system should exceed 4 measures
      const portraitSystems = groupMeasuresIntoSystems(bch.measures, '4/4', 4, 'auto_wrap', 'portrait', 760);
      for (const sys of portraitSystems) {
        assert.ok(
          sys.measures.length <= 4,
          `Portrait auto_wrap system should not exceed 4 measures, got ${sys.measures.length}`
        );
      }
    });
  });
});

