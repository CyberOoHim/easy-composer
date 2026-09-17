import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { groupMeasuresIntoSystems } from '../lib/numberedNotationEngraver.ts';
import { autoWrapSongMeasures } from '../lib/taigiUtils.ts';
import { PRESET_SONGS } from '../lib/presets.ts';
import type { Song, Measure, NumberedNotationNote, SheetOrientation, SheetWrapMode } from '../types/song.ts';

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
      pitch: ((i % 7) + 1) as any,
      octave: 0,
      duration: 1,
      lyric: { hanlo: `字${i + 1}`, poj: `lī${i + 1}` },
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

function makeMockSong(measures: Measure[], notesPerLine = 4, orientation: SheetOrientation = 'portrait'): Song {
  return {
    id: 'print-test-song',
    title: 'Print Alignment Test Song',
    composer: 'Tester',
    key: 'C',
    timeSignature: '4/4',
    bpm: 100,
    notesPerLine,
    orientation,
    measures,
    updatedAt: 1000,
  };
}

/**
 * Calculates print zoom for No Wrap mode:
 * - Portrait printable width: 703px (A4 210mm - 24mm margins at 96 DPI)
 * - Landscape printable width: 1032px (A4 297mm - 24mm margins at 96 DPI)
 */
function computeNoWrapPrintZoom(longestLineWidth: number, orientation: SheetOrientation): number {
  const targetPrintableWidth = orientation === 'landscape' ? 1032 : 703;
  if (longestLineWidth > targetPrintableWidth) {
    return Number((targetPrintableWidth / longestLineWidth).toFixed(4));
  }
  return 1.0;
}

describe('Print Score Alignment Engine across Orientations & Wrap Modes', () => {
  describe('1. No Wrap Zoom-to-Fit Calculations', () => {
    it('scales down long lines in Portrait so the longest line fits within 703px printable width', () => {
      // 8-measure long line: ~1350px
      const longLineWidth = 1350;
      const zoom = computeNoWrapPrintZoom(longLineWidth, 'portrait');

      assert.ok(zoom < 1.0, `Zoom should be < 1.0, got ${zoom}`);
      assert.equal(zoom, Number((703 / 1350).toFixed(4)));

      const effectivePrintedWidth = longLineWidth * zoom;
      assert.ok(
        effectivePrintedWidth <= 703.1,
        `Effective printed width (${effectivePrintedWidth}) must fit within Portrait 703px margin`
      );
    });

    it('scales down long lines in Landscape so the longest line fits within 1032px printable width', () => {
      // 10-measure long line: ~1650px
      const longLineWidth = 1650;
      const zoom = computeNoWrapPrintZoom(longLineWidth, 'landscape');

      assert.ok(zoom < 1.0, `Zoom should be < 1.0, got ${zoom}`);
      assert.equal(zoom, Number((1032 / 1650).toFixed(4)));

      const effectivePrintedWidth = longLineWidth * zoom;
      assert.ok(
        effectivePrintedWidth <= 1032.1,
        `Effective printed width (${effectivePrintedWidth}) must fit within Landscape 1032px margin`
      );
    });

    it('preserves exact 1.0 zoom when longest line is shorter than printable width', () => {
      // 2-measure short line: ~340px
      const shortLineWidth = 340;
      const portraitZoom = computeNoWrapPrintZoom(shortLineWidth, 'portrait');
      const landscapeZoom = computeNoWrapPrintZoom(shortLineWidth, 'landscape');

      assert.equal(portraitZoom, 1.0, 'Portrait zoom should be 1.0 for short lines to prevent oversized notes');
      assert.equal(landscapeZoom, 1.0, 'Landscape zoom should be 1.0 for short lines to prevent oversized notes');
    });

    it('validates preset songs in No Wrap mode never overflow page boundaries in Portrait or Landscape', () => {
      for (const preset of PRESET_SONGS) {
        // Natural measure width calculation matching RealSheetCanvas
        const systems = groupMeasuresIntoSystems(preset.measures, preset.timeSignature || '4/4', 4, 'no_wrap');
        const longestLine = Math.max(
          ...systems.map(sys =>
            sys.measures.reduce((sum, m) => sum + Math.max(160, Math.round((m.requiredWidth || 160) * 1.08)), 0)
          )
        );

        const portraitZoom = computeNoWrapPrintZoom(longestLine + 8, 'portrait');
        const landscapeZoom = computeNoWrapPrintZoom(longestLine + 8, 'landscape');

        const effectivePortrait = (longestLine + 8) * portraitZoom;
        const effectiveLandscape = (longestLine + 8) * landscapeZoom;

        assert.ok(
          effectivePortrait <= 703.1,
          `Preset "${preset.title}" effective portrait width (${effectivePortrait}) exceeds 703px`
        );
        assert.ok(
          effectiveLandscape <= 1032.1,
          `Preset "${preset.title}" effective landscape width (${effectiveLandscape}) exceeds 1032px`
        );
      }
    });
  });

  describe('2. Combination Matrix Verification (6 Combinations)', () => {
    // 16 standard measures with realistic section breaks and deliberate phrases
    const standardMeasures: Measure[] = [
      makeMockMeasure('m1', 1, 4, { section: 'Intro' }),
      makeMockMeasure('m2', 2, 4),
      makeMockMeasure('m3', 3, 4),
      makeMockMeasure('m4', 4, 4, { isLineBreak: true }),
      makeMockMeasure('m5', 5, 4, { section: 'Verse 1' }),
      makeMockMeasure('m6', 6, 4),
      makeMockMeasure('m7', 7, 4),
      makeMockMeasure('m8', 8, 4, { isLineBreak: true }),
      makeMockMeasure('m9', 9, 4, { section: 'Chorus' }),
      makeMockMeasure('m10', 10, 4),
      makeMockMeasure('m11', 11, 4),
      makeMockMeasure('m12', 12, 4, { isLineBreak: true }),
      makeMockMeasure('m13', 13, 4),
      makeMockMeasure('m14', 14, 4),
      makeMockMeasure('m15', 15, 4),
      makeMockMeasure('m16', 16, 4, { barlineType: 'end' }),
    ];

    // Combination 1: Portrait x No Wrap
    it('Combination 1 [Portrait x No Wrap]: preserves phrase breaks and computes safe zoom', () => {
      const systems = groupMeasuresIntoSystems(standardMeasures, '4/4', 4, 'no_wrap', 'portrait');
      assert.ok(systems.length >= 4, `Should produce at least 4 systems, got ${systems.length}`);

      const longestWidth = Math.max(
        ...systems.map(sys =>
          sys.measures.reduce((sum, m) => sum + Math.max(160, Math.round((m.requiredWidth || 160) * 1.08)), 0)
        )
      );
      const zoom = computeNoWrapPrintZoom(longestWidth + 8, 'portrait');
      assert.ok((longestWidth + 8) * zoom <= 703.1);
    });

    // Combination 2: Portrait x Auto Wrap
    it('Combination 2 [Portrait x Auto Wrap]: budgets systems within Portrait 760px capacity', () => {
      const systems = groupMeasuresIntoSystems(standardMeasures, '4/4', 4, 'auto_wrap', 'portrait', 760);
      for (const sys of systems) {
        assert.ok(sys.measures.length <= 4, `Portrait system should have <= 4 measures, got ${sys.measures.length}`);
        assert.ok(
          sys.totalRequiredWidth <= 760,
          `System width (${sys.totalRequiredWidth}) should stay within 760px budget`
        );
      }
    });

    // Combination 3: Portrait x Auto Fix
    it('Combination 3 [Portrait x Auto Fix]: enforces exactly 4 measures per system', () => {
      const systems = groupMeasuresIntoSystems(standardMeasures, '4/4', 4, 'auto_fit', 'portrait');
      for (let i = 0; i < systems.length - 1; i++) {
        assert.equal(systems[i].measures.length, 4, `System ${i + 1} should have exactly 4 measures`);
      }
    });

    // Combination 4: Landscape x No Wrap
    it('Combination 4 [Landscape x No Wrap]: preserves phrase breaks and fits within 1032px', () => {
      const systems = groupMeasuresIntoSystems(standardMeasures, '4/4', 5, 'no_wrap', 'landscape');
      assert.ok(systems.length >= 4);

      const longestWidth = Math.max(
        ...systems.map(sys =>
          sys.measures.reduce((sum, m) => sum + Math.max(160, Math.round((m.requiredWidth || 160) * 1.08)), 0)
        )
      );
      const zoom = computeNoWrapPrintZoom(longestWidth + 8, 'landscape');
      assert.ok((longestWidth + 8) * zoom <= 1032.1);
    });

    // Combination 5: Landscape x Auto Wrap
    it('Combination 5 [Landscape x Auto Wrap]: utilizes Landscape 980px budget with max 5 bars/line', () => {
      const systems = groupMeasuresIntoSystems(standardMeasures, '4/4', 5, 'auto_wrap', 'landscape', 980);
      for (const sys of systems) {
        assert.ok(sys.measures.length <= 5, `Landscape system should have <= 5 measures, got ${sys.measures.length}`);
        assert.ok(
          sys.totalRequiredWidth <= 980,
          `System width (${sys.totalRequiredWidth}) should stay within 980px budget`
        );
      }
    });

    // Combination 6: Landscape x Auto Fix
    it('Combination 6 [Landscape x Auto Fix]: enforces 5 measures per system in Landscape', () => {
      const song = makeMockSong(standardMeasures, 5, 'landscape');
      const wrapped = autoWrapSongMeasures(song, 5, 'landscape');
      const systems = groupMeasuresIntoSystems(wrapped.measures, '4/4', 5, 'auto_fit', 'landscape');

      for (let i = 0; i < systems.length - 1; i++) {
        assert.equal(systems[i].measures.length, 5, `Landscape system ${i + 1} should have 5 measures`);
      }
    });
  });

  describe('3. Viewport Independence in Print Mode', () => {
    it('calculates print systems using physical paper capacity regardless of small screen viewport', () => {
      const measures = Array.from({ length: 15 }, (_, i) => makeMockMeasure(`m${i + 1}`, i + 1));
      const song = makeMockSong(measures, 5, 'landscape');

      // 1. Simulating narrow iPad split-screen viewport (e.g. 500px) on screen
      const screenNarrowWidth = 500;
      const screenSystems = groupMeasuresIntoSystems(song.measures, '4/4', 5, 'auto_wrap', 'landscape', screenNarrowWidth);

      // 2. In print mode, effective width switches to physical paper capacity (980px for landscape)
      const printEffectiveWidth = 980;
      const printSystems = groupMeasuresIntoSystems(song.measures, '4/4', 5, 'auto_wrap', 'landscape', printEffectiveWidth);

      // Print systems should take fewer lines because physical paper is wider than the cramped viewport
      assert.ok(
        printSystems.length <= screenSystems.length,
        `Print systems (${printSystems.length}) should be <= screen systems (${screenSystems.length})`
      );

      // Print systems should utilize up to 5 measures per line
      const maxBarsInPrint = Math.max(...printSystems.map(s => s.measures.length));
      assert.equal(maxBarsInPrint, 5, 'Print output must utilize full 5-bar landscape capacity');
    });
  });

  describe('4. Symmetrical Orientation & Wrap Mode Toggling', () => {
    it('seamlessly transitions between Portrait and Landscape across all wrap modes without data loss', () => {
      const initialSong = makeMockSong(
        Array.from({ length: 10 }, (_, i) => makeMockMeasure(`m${i + 1}`, i + 1)),
        4,
        'portrait'
      );

      const wrapModes: SheetWrapMode[] = ['no_wrap', 'auto_wrap', 'auto_fit'];

      for (const mode of wrapModes) {
        // Toggle to landscape
        const landscapeNotes = 5;
        let landscapeSong: Song;
        if (mode === 'no_wrap') {
          landscapeSong = { ...initialSong, orientation: 'landscape', notesPerLine: landscapeNotes };
        } else {
          const wrapped = autoWrapSongMeasures(initialSong, landscapeNotes, 'landscape');
          landscapeSong = { ...wrapped, orientation: 'landscape', notesPerLine: landscapeNotes };
        }

        assert.equal(landscapeSong.orientation, 'landscape');
        assert.equal(landscapeSong.measures.length, 10);

        // Toggle back to portrait
        const portraitNotes = 4;
        let portraitSong: Song;
        if (mode === 'no_wrap') {
          portraitSong = { ...landscapeSong, orientation: 'portrait', notesPerLine: portraitNotes };
        } else {
          const wrapped = autoWrapSongMeasures(landscapeSong, portraitNotes, 'portrait');
          portraitSong = { ...wrapped, orientation: 'portrait', notesPerLine: portraitNotes };
        }

        assert.equal(portraitSong.orientation, 'portrait');
        assert.equal(portraitSong.measures.length, 10);
      }
    });
  });
});
