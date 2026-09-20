import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_SONGS } from '../lib/presets.ts';
import {
  exportSongLyrics,
  getSongLyricsSummary,
  getSongAvailableVerses,
  extractVerseLines,
} from '../lib/lyricExport.ts';
import type { Song } from '../types/song.ts';

describe('Lyrics Export Utility', () => {
  const bch = PRESET_SONGS.find(s => s.id === 'bang-chhun-hong')!;

  it('detects available verses and lyrics summary accurately', () => {
    const verses = getSongAvailableVerses(bch);
    assert.ok(verses.includes(1));
    assert.ok(verses.includes(2));

    const summary = getSongLyricsSummary(bch);
    assert.equal(summary.hasLyrics, true);
    assert.ok(summary.totalVerses >= 2);
    assert.ok(summary.totalSyllables > 30);
    assert.ok(summary.totalLines > 0);
  });

  it('exports pure Hanlo lyrics with header and sections', () => {
    const output = exportSongLyrics(bch, {
      scriptMode: 'hanlo',
      includeHeader: true,
      includeSections: true,
      verseSelection: 1,
    });

    assert.ok(output.includes('望春風'));
    assert.ok(output.includes('李臨秋 曲'));
    assert.ok(output.includes('Key: 1=E'));
    assert.ok(output.includes('獨夜無伴守燈下，'));
    assert.ok(output.includes('清風對面吹'));
    assert.ok(output.includes('見著少年家'));
  });

  it('exports pure POJ lyrics with preserved hyphens and punctuation', () => {
    const output = exportSongLyrics(bch, {
      scriptMode: 'poj',
      includeHeader: false,
      verseSelection: 1,
    });

    // Header excluded
    assert.ok(!output.includes('Key: 1=E'));
    // POJ words with proper spacing and punctuation
    assert.ok(output.includes('To̍k') || output.includes('to̍k'));
    assert.ok(output.includes('teng-ē,') || output.includes('ē,'));
    assert.ok(output.includes('chhoe'));
  });

  it('exports Dual (Bilingual) interlinear lyrics with paired lines', () => {
    const output = exportSongLyrics(bch, {
      scriptMode: 'both',
      includeHeader: false,
      verseSelection: 1,
    });

    const lines = output.split('\n').map(l => l.trim()).filter(Boolean);
    // Find where the first lyric line starts
    const hanloIdx = lines.findIndex(l => l.includes('獨夜無伴守燈下'));
    assert.ok(hanloIdx >= 0, 'Hanlo line should be found');
    const pojLine = lines[hanloIdx + 1];
    assert.ok(pojLine, 'POJ line should follow Hanlo line');
    assert.ok(pojLine.includes('To̍k') || pojLine.includes('teng-ē'));
  });

  it('exports all verses sequentially when verseSelection is all', () => {
    const output = exportSongLyrics(bch, {
      scriptMode: 'hanlo',
      includeHeader: false,
      verseSelection: 'all',
    });

    assert.ok(output.includes('[Verse 1]'));
    assert.ok(output.includes('[Verse 2]'));
    assert.ok(output.includes('獨夜無伴守燈下，'));
    assert.ok(output.includes('做恁婿') || output.includes('恁婿'));
  });

  it('handles empty songs or songs without lyrics gracefully', () => {
    const emptySong: Song = {
      id: 'empty-test',
      title: 'Instrumental Only',
      key: 'C',
      timeSignature: '4/4',
      bpm: 100,
      measures: [
        {
          id: 'm1',
          measureNumber: 1,
          notes: [
            { id: 'n1', pitch: 1, octave: 0, duration: 4, lyric: { poj: '', hanlo: '' } },
          ],
        },
      ],
    };

    const summary = getSongLyricsSummary(emptySong);
    assert.equal(summary.hasLyrics, false);
    assert.equal(summary.totalSyllables, 0);

    const output = exportSongLyrics(emptySong, { includeHeader: true });
    assert.ok(output.includes('Instrumental Only'));
    assert.ok(output.includes('No lyrics'));
  });

  it('toggles section tags and song header based on options', () => {
    const withSections = exportSongLyrics(bch, {
      scriptMode: 'hanlo',
      includeHeader: false,
      includeSections: true,
      verseSelection: 1,
    });
    // System 1 or Verse or Bridge
    assert.ok(withSections.includes('[') && withSections.includes(']'));

    const withoutSections = exportSongLyrics(bch, {
      scriptMode: 'hanlo',
      includeHeader: false,
      includeSections: false,
      verseSelection: 1,
    });
    assert.ok(!withoutSections.includes('[Verse 1]'));
  });
});

