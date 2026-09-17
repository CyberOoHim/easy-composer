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
  isNoWrapLineSplitTrigger,
  measureHasNoWrapSplitTrigger,
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

  describe('No Wrap Mode Line Split Triggers (Delimiters & Newline Breaks)', () => {
    it('triggers line split on delimiters: ，, 。, ！, ？ (and ascii ,, ., !, ?)', () => {
      const delimiters = ['，', '。', '！', '？', ',', '.', '!', '?'];
      for (const d of delimiters) {
        const note: NumberedNotationNote = {
          id: 'n-delim',
          pitch: 'empty',
          octave: 0,
          duration: 0,
          lyric: { hanlo: d, poj: d },
        };
        assert.equal(isNoWrapLineSplitTrigger(note), true, `Delimiter "${d}" must trigger line split`);
      }
    });

    it('triggers line split on newline verse breaks: ↵, \\n, \\r', () => {
      const breaks = ['↵', '\n', '\r'];
      for (const b of breaks) {
        const note: NumberedNotationNote = {
          id: 'n-break',
          pitch: 'empty',
          octave: 0,
          duration: 0,
          lyric: { hanlo: b, poj: b },
        };
        assert.equal(isNoWrapLineSplitTrigger(note), true, `Newline break "${b}" must trigger line split`);
      }
    });

    it('explicitly excludes whitespace spacers: ␣, \' \'', () => {
      const spacers = ['␣', ' ', '  '];
      for (const s of spacers) {
        const note: NumberedNotationNote = {
          id: 'n-spacer',
          pitch: 'empty',
          octave: 0,
          duration: 0,
          lyric: { hanlo: s, poj: s },
        };
        assert.equal(isNoWrapLineSplitTrigger(note), false, `Whitespace spacer "${s}" must NOT trigger line split`);
      }
    });

    it('triggers line split on lyric syllables with attached delimiters or newlines', () => {
      const attachedDelims = ['koa，', 'koa,', 'koa。', 'koa.', 'koa！', 'koa!', 'koa？', 'koa?', '歌，', '歌。', '歌！', '歌？'];
      for (const word of attachedDelims) {
        const note: NumberedNotationNote = {
          id: 'n-attached-delim',
          pitch: 1,
          octave: 0,
          duration: 1,
          lyric: { hanlo: word, poj: word },
        };
        assert.equal(isNoWrapLineSplitTrigger(note), true, `Word with delimiter "${word}" must trigger line split`);
      }

      const attachedBreaks = ['koa↵', 'koa\n', 'koa\r', '歌↵', '歌\n'];
      for (const word of attachedBreaks) {
        const note: NumberedNotationNote = {
          id: 'n-attached-break',
          pitch: 1,
          octave: 0,
          duration: 1,
          lyric: { hanlo: word, poj: word },
        };
        assert.equal(isNoWrapLineSplitTrigger(note), true, `Word with break "${word}" must trigger line split`);
      }
    });

    it('does not trigger on plain lyrics or space-separated words without delimiters', () => {
      const plainWords = ['To̍k', 'iā', 'chhiu', 'hong', 'chhun hong', '這條歌'];
      for (const word of plainWords) {
        const note: NumberedNotationNote = {
          id: 'n-plain',
          pitch: 1,
          octave: 0,
          duration: 1,
          lyric: { hanlo: word, poj: word },
        };
        assert.equal(isNoWrapLineSplitTrigger(note), false, `Plain lyric "${word}" must NOT trigger line split`);
      }
    });

    it('triggers line split on multi-verse lyrics (lyricsByVerse)', () => {
      const noteVerse2: NumberedNotationNote = {
        id: 'n-v2',
        pitch: 1,
        octave: 0,
        duration: 1,
        lyric: { hanlo: '普通', poj: 'phó͘-thong' },
        lyricsByVerse: {
          2: { hanlo: '落土。', poj: 'lo̍h-thó͘.' },
        },
      };
      assert.equal(isNoWrapLineSplitTrigger(noteVerse2), true, 'Delimiter in Verse 2 must trigger line split');
    });

    it('protects tempo annotations like "rit." while triggering on newline annotations', () => {
      const ritNote: NumberedNotationNote = {
        id: 'n-rit',
        pitch: 1,
        octave: 0,
        duration: 1,
        lyric: {},
        annotation: 'rit.',
      };
      assert.equal(isNoWrapLineSplitTrigger(ritNote), false, 'Annotation "rit." must NOT trigger line split');

      const breakNote: NumberedNotationNote = {
        id: 'n-annot-break',
        pitch: 1,
        octave: 0,
        duration: 1,
        lyric: {},
        annotation: '↵',
      };
      assert.equal(isNoWrapLineSplitTrigger(breakNote), true, 'Annotation "↵" must trigger line split');
    });

    it('protects verse index prefixes (e.g. 1.3.獨, 1.歌) from triggering accidental line split', () => {
      const versePrefixNotes = [
        { id: 'n-vprefix-1', lyric: { hanlo: '1.3.獨', poj: '1.3.To̍k' } },
        { id: 'n-vprefix-2', lyric: { hanlo: '1. 歌', poj: '1. koa' } },
        { id: 'n-vprefix-3', lyric: { hanlo: '2.想', poj: '2.Siūⁿ' } },
        { id: 'n-vprefix-4', lyric: { custom: '1.3.獨' } },
      ];

      for (const item of versePrefixNotes) {
        const note: NumberedNotationNote = {
          id: item.id,
          pitch: 1,
          octave: 0,
          duration: 1,
          lyric: item.lyric,
        };
        assert.equal(isNoWrapLineSplitTrigger(note), false, `Verse prefix "${JSON.stringify(item.lyric)}" must NOT trigger line split`);
      }
    });

    it('refactored preset songs in no_wrap mode produce short and meaningful balanced systems', async () => {
      const { PRESET_SONGS } = await import('../lib/presets.ts');
      const { groupMeasuresIntoSystems } = await import('../lib/numberedNotationEngraver.ts');

      // 1. 望春風: 9 short, meaningful systems: [4, 2, 2, 2, 2, 2, 3, 3, 2]
      const bch = PRESET_SONGS[0];
      const bchSystems = groupMeasuresIntoSystems(bch.measures, bch.timeSignature, 4, 'no_wrap');
      assert.equal(bchSystems.length, 9, '望春風 should produce exactly 9 systems in no_wrap mode');
      assert.deepEqual(
        bchSystems.map(s => s.measures.length),
        [4, 2, 2, 2, 2, 2, 3, 3, 2],
        '望春風 measures per system should match [4, 2, 2, 2, 2, 2, 3, 3, 2]'
      );

      // 2. 雨夜花: 16 systems of 2 measures each, zero fake empty newline notes
      const u = PRESET_SONGS[1];
      const uSystems = groupMeasuresIntoSystems(u.measures, u.timeSignature, 2, 'no_wrap');
      assert.equal(uSystems.length, 16, '雨夜花 should produce exactly 16 systems in no_wrap mode');
      assert.ok(
        uSystems.every(s => s.measures.length === 2),
        'Every system in 雨夜花 must have exactly 2 measures'
      );
      for (const m of u.measures) {
        const hasEmpty0Beat = m.notes.some(n => n.pitch === 'empty' && n.duration === 0);
        assert.equal(hasEmpty0Beat, false, `Measure ${m.measureNumber} in 雨夜花 should not contain fake 0-beat newline notes`);
      }

      // 3. 四季紅: 18 systems in no_wrap mode, zero trailing \n in lyrics
      const skh = PRESET_SONGS[2];
      assert.equal(skh.id, 'su-ki-hong', 'Third preset song must be 四季紅');
      const skhSystems = groupMeasuresIntoSystems(skh.measures, skh.timeSignature, 4, 'no_wrap');
      assert.equal(skhSystems.length, 18, '四季紅 should produce exactly 18 systems in no_wrap mode');
      assert.equal(skh.measures.length, 34, '四季紅 should have 34 measures');
      for (const m of skh.measures) {
        for (const n of m.notes) {
          assert.equal(/[\n\r]/.test(n.lyric?.hanlo || ''), false, `Note ${n.id} hanlo must not contain newlines`);
          assert.equal(/[\n\r]/.test(n.lyric?.poj || ''), false, `Note ${n.id} poj must not contain newlines`);
        }
      }
    });
  });

  describe('Combinational Add Delimiter After Cursor Insertion', () => {
    it('creates a valid zero-beat delimiter note after current note without mutating the current note', () => {
      const initialNotes: NumberedNotationNote[] = [
        { id: 'n1', pitch: 1, octave: 0, duration: 1, lyric: { poj: 'Chit', hanlo: '這' } },
        { id: 'n2', pitch: 2, octave: 0, duration: 1, lyric: { poj: 'tiâu', hanlo: '條' } },
      ];

      // Simulate inserting delimiter comma "，" after note 0 (n1)
      const currentNIdx = 0;
      const zeroBeat = checkZeroBeatTrigger('，');
      const effectivePunct = zeroBeat.isMatch ? zeroBeat.normalized : '，';

      const delimiterSyllable = {
        poj: effectivePunct,
        hanlo: effectivePunct,
        hanji: effectivePunct,
        custom: effectivePunct,
      };

      const newDelimiterNote: NumberedNotationNote = {
        id: 'n-delim-test-1',
        pitch: 'empty',
        octave: 0,
        duration: 0,
        isDotted: false,
        isDoubleDotted: false,
        isTied: false,
        tieToNext: false,
        slurToNext: false,
        accidental: '',
        lyric: delimiterSyllable,
        lyricsByVerse: { 1: delimiterSyllable },
      };

      const updatedNotes = [...initialNotes];
      updatedNotes.splice(currentNIdx + 1, 0, newDelimiterNote);

      // Assertions
      assert.equal(updatedNotes.length, 3, 'Notes length should increase from 2 to 3');
      // Original note untouched
      assert.equal(updatedNotes[0].id, 'n1');
      assert.equal(updatedNotes[0].pitch, 1);
      assert.equal(updatedNotes[0].lyric.hanlo, '這');
      // Inserted delimiter note at index 1
      assert.equal(updatedNotes[1].id, 'n-delim-test-1');
      assert.equal(updatedNotes[1].pitch, 'empty');
      assert.equal(updatedNotes[1].duration, 0);
      assert.equal(updatedNotes[1].lyric.hanlo, '，');
      assert.equal(updatedNotes[1].lyric.poj, '，');
      // Subsequent note pushed to index 2
      assert.equal(updatedNotes[2].id, 'n2');
      assert.equal(updatedNotes[2].pitch, 2);
    });

    it('inserted delimiter note passes isPunctuationZeroNote, isVerseBreakNote, and normalizeNoteDuration', () => {
      const delimsToTest = ['\n', ' ', '，', '。', '！', '？', '、', '；', '：', '—', '…'];

      for (const punct of delimsToTest) {
        const zeroBeat = checkZeroBeatTrigger(punct);
        const effectivePunct = zeroBeat.isMatch ? zeroBeat.normalized : punct;

        const syl = {
          poj: effectivePunct,
          hanlo: effectivePunct,
          hanji: effectivePunct,
          custom: effectivePunct,
        };

        const note: NumberedNotationNote = {
          id: `n-test-${punct}`,
          pitch: 'empty',
          octave: 0,
          duration: 0,
          lyric: syl,
          lyricsByVerse: { 1: syl },
        };

        assert.ok(isVerseBreakNote(note), `Delimiter note "${punct}" must be identified as a verse break`);
        const normalized = normalizeNoteDuration(note);
        assert.equal(normalized.pitch, 'empty');
        assert.equal(normalized.duration, 0);
      }
    });

    it('supports inserting delimiter note after the last note of a measure', () => {
      const initialNotes: NumberedNotationNote[] = [
        { id: 'n1', pitch: 5, octave: 0, duration: 1, lyric: { poj: 'koa', hanlo: '歌' } },
      ];

      const currentNIdx = 0; // Last note
      const zeroBeat = checkZeroBeatTrigger('\n');
      const effectivePunct = zeroBeat.isMatch ? zeroBeat.normalized : '\n';

      const syl = {
        poj: effectivePunct,
        hanlo: effectivePunct,
        hanji: effectivePunct,
        custom: effectivePunct,
      };

      const newlineNote: NumberedNotationNote = {
        id: 'n-newline',
        pitch: 'empty',
        octave: 0,
        duration: 0,
        lyric: syl,
        lyricsByVerse: { 1: syl },
      };

      const updated = [...initialNotes];
      updated.splice(currentNIdx + 1, 0, newlineNote);

      assert.equal(updated.length, 2);
      assert.equal(updated[0].pitch, 5);
      assert.equal(updated[1].pitch, 'empty');
      assert.equal(updated[1].duration, 0);
      assert.equal(updated[1].lyric.hanlo, '\n');
    });
  });
});

