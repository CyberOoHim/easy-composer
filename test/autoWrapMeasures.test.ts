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
    it('Mode 1 (no_wrap): respects manual breaks AND guards sheet boundary to prevent overflowing sheet', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      // 8 standard measures without manual line breaks
      const rawMeasures: Measure[] = Array.from({ length: 8 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4)
      );

      // In Portrait (750px max content width): 8 measures (~160px each) cannot fit on one line
      const portraitSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'no_wrap', 'portrait');
      assert.ok(portraitSystems.length > 1, 'no_wrap must wrap across multiple systems when exceeding portrait sheet boundary');
      for (const sys of portraitSystems) {
        const totalW = sys.measures.reduce((acc, m) => acc + (m.requiredWidth || 140), 0);
        // Each system width must stay within sheet bounds
        assert.ok(totalW <= 750 * 1.25, `System width ${totalW}px should not overflow sheet boundary`);
      }

      // In Landscape (1050px max content width): can hold more measures per system
      const landscapeSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'no_wrap', 'landscape');
      assert.ok(landscapeSystems[0].measures.length >= portraitSystems[0].measures.length,
        'Landscape should accommodate more measures in first system than Portrait');
    });

    it('Mode 2 (auto_fit): targets 4 measures in Portrait and 5 in Landscape, breaking early for dense measures', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      const standardMeasures: Measure[] = Array.from({ length: 10 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4)
      );

      // Portrait auto_fit defaults to 4 measures per line
      const pSystems = groupMeasuresIntoSystems(standardMeasures, '4/4', 4, 'auto_fit', 'portrait');
      assert.equal(pSystems[0].measures.length, 4);

      // Landscape auto_fit defaults to 5 measures per line
      const lSystems = groupMeasuresIntoSystems(standardMeasures, '4/4', 4, 'auto_fit', 'landscape');
      assert.equal(lSystems[0].measures.length, 5);

      // High density measures trigger density safeguard to prevent syllable collisions
      const denseMeasures: Measure[] = [
        makeMockMeasure('d1', 1, 16), // 16 notes (very dense)
        makeMockMeasure('d2', 2, 16),
        makeMockMeasure('d3', 3, 16),
        makeMockMeasure('d4', 4, 16),
      ];
      const denseSystems = groupMeasuresIntoSystems(denseMeasures, '4/4', 4, 'auto_fit', 'portrait');
      // Should break before cramming all 4 ultra-dense measures on one portrait line
      assert.ok(denseSystems.length > 1, 'Dense measures must break early to prevent text collision');
      assert.ok(denseSystems[0].measures.length < 4, 'First system should have fewer than 4 measures for ultra-dense notes');
    });

    it('Mode 3 (auto_wrap): dynamically budgets line width for Portrait (750px) vs Landscape (1050px)', async () => {
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');
      const rawMeasures: Measure[] = Array.from({ length: 12 }, (_, i) =>
        makeMockMeasure(`m${i + 1}`, i + 1, 4)
      );

      const pSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'auto_wrap', 'portrait');
      const lSystems = groupMeasuresIntoSystems(rawMeasures, '4/4', 4, 'auto_wrap', 'landscape');

      // Landscape should require fewer systems because each line has a 1050px budget instead of 750px
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
      assert.ok(longWidth >= 80, `Long syllable should have >= 80px required width, got ${longWidth}`);

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
      assert.ok(mvWidth >= 60, `Multi-verse note should have >= 60px required width, got ${mvWidth}`);
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
    });
  });
});

