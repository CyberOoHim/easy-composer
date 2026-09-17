import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPunctuationOrSpacer,
  isVerseBreakNote,
  groupSongIntoVerses,
  getPunctuationDisplayChar,
  COMMON_PUNCTUATIONS,
  checkZeroBeatTrigger,
  normalizeNoteDuration,
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

  describe('Strict Zero-Beat Trigger & Clean Reset Rules', () => {
    it('strictly matches only ，, 。, \\n/↵, and space/␣ as zero-beat triggers', () => {
      // Allowed delimiters: comma and period only
      assert.deepEqual(checkZeroBeatTrigger('，'), { isMatch: true, normalized: '，' });
      assert.deepEqual(checkZeroBeatTrigger(','), { isMatch: true, normalized: '，' });
      assert.deepEqual(checkZeroBeatTrigger('。'), { isMatch: true, normalized: '。' });
      assert.deepEqual(checkZeroBeatTrigger('.'), { isMatch: true, normalized: '。' });

      // Allowed newlines
      assert.deepEqual(checkZeroBeatTrigger('\n'), { isMatch: true, normalized: '\n' });
      assert.deepEqual(checkZeroBeatTrigger('\r'), { isMatch: true, normalized: '\n' });
      assert.deepEqual(checkZeroBeatTrigger('↵'), { isMatch: true, normalized: '\n' });

      // Allowed whitespace spacers
      assert.deepEqual(checkZeroBeatTrigger(' '), { isMatch: true, normalized: ' ' });
      assert.deepEqual(checkZeroBeatTrigger('␣'), { isMatch: true, normalized: ' ' });

      // NO OTHER DELIMITERS may trigger zero-beat conversion
      const nonZeroBeatDelimiters = ['！', '？', '、', '；', '：', '—', '…', '「', '」', '!', '?'];
      for (const d of nonZeroBeatDelimiters) {
        assert.equal(checkZeroBeatTrigger(d).isMatch, false, `Delimiter "${d}" must NOT be a zero-beat trigger`);
      }
      assert.equal(checkZeroBeatTrigger('To̍k').isMatch, false);
      assert.equal(checkZeroBeatTrigger('獨').isMatch, false);
    });

    it('cleanly resets pitch dots, ties, accidentals, and octave marks when normalized', () => {
      const complexNote: NumberedNotationNote = {
        id: 'test-complex-note',
        pitch: 5,
        octave: 1, // Octave dot above
        accidental: '#', // Sharp
        duration: 1.75, // Double dotted quarter
        isDotted: true,
        isDoubleDotted: true,
        isTied: true,
        tieToNext: true,
        slurToNext: true,
        preGraceNotes: [{ pitch: 3, octave: 0 }],
        postGraceNotes: [{ pitch: 6, octave: 0 }],
        lyric: {
          poj: '，',
          hanlo: '，',
        },
      };

      const normalized = normalizeNoteDuration(complexNote);

      assert.equal(normalized.pitch, 'empty', 'Pitch must be converted to empty');
      assert.equal(normalized.duration, 0, 'Duration must be converted to 0 beats');
      assert.equal(normalized.isDotted, false, 'isDotted must be reset to false');
      assert.equal(normalized.isDoubleDotted, false, 'isDoubleDotted must be reset to false');
      assert.equal(normalized.isTied, false, 'isTied must be reset to false');
      assert.equal(normalized.tieToNext, false, 'tieToNext must be reset to false');
      assert.equal(normalized.slurToNext, false, 'slurToNext must be reset to false');
      assert.equal(normalized.accidental, '', 'accidental must be reset to empty');
      assert.equal(normalized.octave, 0, 'octave must be reset to 0');
      assert.equal(normalized.preGraceNotes, undefined, 'preGraceNotes must be cleared');
      assert.equal(normalized.postGraceNotes, undefined, 'postGraceNotes must be cleared');
    });

    it('synchronizes POJ and Hàn-lô fields simultaneously on zero-beat conversion', () => {
      const noteWithPojDelim: NumberedNotationNote = {
        id: 'sync-note-1',
        pitch: 3,
        octave: -1,
        duration: 2,
        lyric: {
          poj: '。', // User entered period in POJ field
          hanlo: '舊字',
        },
      };

      const normalized = normalizeNoteDuration(noteWithPojDelim);
      assert.equal(normalized.lyric.poj, '。');
      assert.equal(normalized.lyric.hanlo, '。');
      assert.equal(normalized.lyric.hanji, '。');
      assert.equal(normalized.lyric.custom, '。');
      assert.equal(normalized.pitch, 'empty');
      assert.equal(normalized.duration, 0);
      assert.equal(normalized.octave, 0);
    });
  });
});
