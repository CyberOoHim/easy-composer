import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPunctuationOrSpacer,
  isVerseBreakNote,
  groupSongIntoVerses,
  getPunctuationDisplayChar,
  COMMON_PUNCTUATIONS,
} from '../lib/taigiUtils.ts';
import type { Song, NumberedNotationNote } from '../types/song.ts';

describe('Enhanced Delimiter List & Zero-Beat Empty Note Conversion', () => {
  it('contains newline (↵) and space (␣) at the beginning of the enhanced delimiter list', () => {
    assert.equal(COMMON_PUNCTUATIONS[0].label, '↵', 'First delimiter must be newline break ↵');
    assert.equal(COMMON_PUNCTUATIONS[1].label, '␣', 'Second delimiter must be space spacer ␣');
    const values = COMMON_PUNCTUATIONS.map(p => p.value);
    assert.ok(values.includes('，'));
    assert.ok(values.includes('。'));
    assert.ok(values.includes('！'));
    assert.ok(values.includes('？'));
    assert.ok(values.includes('、'));
    assert.ok(values.includes('；'));
    assert.ok(values.includes('：'));
    assert.ok(values.includes('—'));
    assert.ok(values.includes('…'));
  });

  it('identifies all enhanced delimiters as punctuation/spacers', () => {
    COMMON_PUNCTUATIONS.forEach(delim => {
      assert.ok(isPunctuationOrSpacer(delim.value), `Expected "${delim.value}" to be recognized as punctuation or spacer`);
      assert.ok(isPunctuationOrSpacer(delim.label), `Expected "${delim.label}" to be recognized as punctuation or spacer`);
    });
    assert.ok(isPunctuationOrSpacer('\n'));
    assert.ok(isPunctuationOrSpacer(' '));
  });

  it('splits lines / verses at any enhanced delimiter (↵, ␣, ，, 。, ！, ？, 、, ；, ：, —, …)', () => {
    const songWithDelims: Song = {
      id: 'delim-split-test',
      title: 'Delimiter Split Song',
      key: 'C',
      timeSignature: '4/4',
      bpm: 90,
      measures: [
        {
          id: 'm1',
          measureNumber: 1,
          notes: [
            { id: 'n1', pitch: 1, octave: 0, duration: 1, lyric: { poj: 'Chit', hanlo: '這' } },
            { id: 'n2', pitch: 2, octave: 0, duration: 1, lyric: { poj: 'tiâu', hanlo: '條' } },
            { id: 'n3', pitch: 3, octave: 0, duration: 1, lyric: { poj: 'koa', hanlo: '歌' } },
            // Enhanced delimiter: comma
            { id: 'n4', pitch: 'empty', octave: 0, duration: 0, lyric: { poj: '，', hanlo: '，' } },
          ],
        },
        {
          id: 'm2',
          measureNumber: 2,
          notes: [
            { id: 'n5', pitch: 5, octave: 0, duration: 1, lyric: { poj: 'chin', hanlo: '真' } },
            { id: 'n6', pitch: 6, octave: 0, duration: 1, lyric: { poj: 'hó', hanlo: '好' } },
            { id: 'n7', pitch: 5, octave: 0, duration: 2, lyric: { poj: 'thiaⁿ', hanlo: '聽' } },
            // Enhanced delimiter: space spacer
            { id: 'n8', pitch: 'empty', octave: 0, duration: 0, lyric: { poj: '␣', hanlo: '␣' } },
          ],
        },
        {
          id: 'm3',
          measureNumber: 3,
          notes: [
            { id: 'n9', pitch: 3, octave: 0, duration: 1, lyric: { poj: 'Lán', hanlo: '咱' } },
            { id: 'n10', pitch: 2, octave: 0, duration: 1, lyric: { poj: 'lâi', hanlo: '來' } },
            { id: 'n11', pitch: 1, octave: 0, duration: 2, lyric: { poj: 'chhiùⁿ', hanlo: '唱' } },
            // Enhanced delimiter: newline break
            { id: 'n12', pitch: 'empty', octave: 0, duration: 0, lyric: { poj: '↵', hanlo: '↵' } },
          ],
        },
      ],
    };

    const verses = groupSongIntoVerses(songWithDelims);
    assert.equal(verses.length, 3, 'Should split into 3 verses/lines at each enhanced delimiter');
    assert.equal(verses[0].notes.length, 4);
    assert.equal(verses[1].notes.length, 4);
    assert.equal(verses[2].notes.length, 4);
  });

  it('correctly maps display characters for newlines and spaces', () => {
    assert.equal(getPunctuationDisplayChar('\n'), '↵');
    assert.equal(getPunctuationDisplayChar('↵'), '↵');
    assert.equal(getPunctuationDisplayChar(' '), '␣');
    assert.equal(getPunctuationDisplayChar('␣'), '␣');
    assert.equal(getPunctuationDisplayChar('，'), '，');
    assert.equal(getPunctuationDisplayChar('。'), '。');
  });
});
