import type { Song } from '../types/song.ts';

export const PRESET_SONGS: Song[] = [
  {
    id: 'bang-chhun-hong',
    title: '望春風',
    subtitle: '(根據韓寶儀閩南語演唱音頻記譜)',
    catalogNumber: 'LPDC—JCR1341',
    lyricist: '鄧雨賢 詞',
    composer: '李臨秋 曲',
    notator: '嶺南印象 制譜',
    key: 'E',
    timeSignature: '4/4',
    bpm: 88,
    notesPerLine: 4,
    description: '經典臺灣歌謠《望春風》，E調 (4/4拍)，標準紙本簡譜排版，包含前奏、第4小節上方副旋律襯音 (Obbligato)、疊行多段歌詞 (1.3. / 2.) 與第 1.2. 及第 3. 反覆跳越結尾 (Volta Repeat Endings)。',
    footnote: '本曲譜使用JP-Word簡譜編輯軟件製作  JPW簡譜軟件交流群：332718458\n歡迎光臨嶺南印象製譜園地：http://www.qupu123.com/space/336279   QQ：54334643\n本人所記曲譜只發布在“中國曲譜網”本人個人園地上，轉載本人所記曲譜時凡抹去和篡改本人記製譜信息者均為盜版',
    measures: [
      // ======================================================================
      // SYSTEM 1: PRELUDE & OBBLIGATO COUNTERPOINT (Measures 1 - 4)
      // ======================================================================
      {
        id: 'bch_m1',
        measureNumber: 1,
        chord: 'E',
        section: 'Prelude',
        isPrelude: true,
        notes: [
          { id: 'bch_n1_1', pitch: 5, octave: 0, duration: 1.5, isDotted: true, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n1_2', pitch: 5, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n1_3', pitch: 6, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n1_4', pitch: 5, octave: 0, duration: 1.0, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n1_5', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'bch_m2',
        measureNumber: 2,
        chord: 'C#m',
        isPrelude: true,
        notes: [
          { id: 'bch_n2_1', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n2_2', pitch: 2, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n2_3', pitch: 1, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n2_4', pitch: 6, octave: -1, duration: 2.0, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'bch_m3',
        measureNumber: 3,
        chord: 'A',
        isPrelude: true,
        notes: [
          { id: 'bch_n3_1', pitch: 5, octave: 0, duration: 1.5, isDotted: true, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n3_2', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n3_3', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n3_4', pitch: 2, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n3_5', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n3_6', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'bch_m4',
        measureNumber: 4,
        chord: 'E',
        isPrelude: true,
        isLineBreak: true,
        obbligatoText: '0 56 53 21 6̣ 5̣',
        obbligato: [
          { id: 'bch_ob_1', pitch: 0, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_2', pitch: 5, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_3', pitch: 6, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_4', pitch: 5, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_5', pitch: 3, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_6', pitch: 2, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_7', pitch: 1, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_8', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_ob_9', pitch: 5, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
        ],
        notes: [
          { id: 'bch_n4_1', pitch: 1, octave: 0, duration: 4.0, lyric: { poj: '', hanlo: '' } },
        ],
      },

      // ======================================================================
      // SYSTEM 2: THEME ENTRY & STAGGERED VERSES (Measures 5 - 8)
      // ======================================================================
      {
        id: 'bch_m5',
        measureNumber: 5,
        chord: 'E',
        section: 'Verse',
        notes: [
          {
            id: 'bch_n5_1',
            pitch: 5,
            octave: -1,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'To̍k', hanlo: '獨' },
            lyricsByVerse: { 1: { hanlo: '獨', poj: 'To̍k' }, 2: { hanlo: '想', poj: 'Siūⁿ' } },
          },
          {
            id: 'bch_n5_2',
            pitch: 5,
            octave: -1,
            duration: 0.25,
            lyric: { poj: 'iā', hanlo: '夜' },
            lyricsByVerse: { 1: { hanlo: '夜', poj: 'iā' }, 2: { hanlo: '要', poj: 'iàu' } },
          },
          {
            id: 'bch_n5_3',
            pitch: 6,
            octave: -1,
            duration: 0.25,
            lyric: { poj: 'bû', hanlo: '無' },
            lyricsByVerse: { 1: { hanlo: '無', poj: 'bû' }, 2: { hanlo: '郎', poj: 'lông' } },
          },
          {
            id: 'bch_n5_4',
            pitch: 1,
            octave: 0,
            duration: 2.0,
            lyric: { poj: 'phōaⁿ', hanlo: '伴' },
            lyricsByVerse: { 1: { hanlo: '伴', poj: 'phōaⁿ' }, 2: { hanlo: '君', poj: 'kun' } },
          },
        ],
      },
      {
        id: 'bch_m6',
        measureNumber: 6,
        chord: 'B',
        isLineBreak: true,
        notes: [
          {
            id: 'bch_n6_1',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'siú', hanlo: '守' },
            lyricsByVerse: { 1: { hanlo: '守', poj: 'siú' }, 2: { hanlo: '做', poj: 'chò' } },
          },
          { id: 'bch_n6_2', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          {
            id: 'bch_n6_3',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'teng', hanlo: '燈' },
            lyricsByVerse: { 1: { hanlo: '燈', poj: 'teng' }, 2: { hanlo: '恁', poj: 'lín' } },
          },
          { id: 'bch_n6_4', pitch: 1, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          {
            id: 'bch_n6_5',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'ē,', hanlo: '下，' },
            lyricsByVerse: { 1: { hanlo: '下，', poj: 'ē,' }, 2: { hanlo: '婿，', poj: 'sài,' } },
          },
          { id: 'bch_n6_6', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n6_7', pitch: 2, octave: 0, duration: 1.0, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'bch_m7',
        measureNumber: 7,
        chord: 'A',
        notes: [
          {
            id: 'bch_n7_1',
            pitch: 5,
            octave: -1,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'chheng', hanlo: '清' },
            lyricsByVerse: { 1: { hanlo: '清', poj: 'chheng' }, 2: { hanlo: '意', poj: 'ì' } },
          },
          {
            id: 'bch_n7_2',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'hong', hanlo: '風' },
            lyricsByVerse: { 1: { hanlo: '風', poj: 'hong' }, 2: { hanlo: '愛', poj: 'ài' } },
          },
          {
            id: 'bch_n7_3',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'tùi', hanlo: '對' },
            lyricsByVerse: { 1: { hanlo: '對', poj: 'tùi' }, 2: { hanlo: '在', poj: 'chāi' } },
          },
          {
            id: 'bch_n7_4',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'bīn', hanlo: '面' },
            lyricsByVerse: { 1: { hanlo: '面', poj: 'bīn' }, 2: { hanlo: '心', poj: 'sim' } },
          },
          {
            id: 'bch_n7_5',
            pitch: 1,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'chhoe', hanlo: '吹' },
            lyricsByVerse: { 1: { hanlo: '吹', poj: 'chhoe' }, 2: { hanlo: '內', poj: 'lāi' } },
          },
        ],
      },
      {
        id: 'bch_m8',
        measureNumber: 8,
        chord: 'B',
        isLineBreak: true,
        notes: [
          { id: 'bch_n8_1', pitch: 2, octave: 0, duration: 4.0, lyric: { poj: '', hanlo: '' } },
        ],
      },

      // ======================================================================
      // SYSTEM 3: BRIDGE & CLIMAX (Measures 9 - 12)
      // ======================================================================
      {
        id: 'bch_m9',
        measureNumber: 9,
        chord: 'C#m',
        section: 'Bridge',
        notes: [
          {
            id: 'bch_n9_1',
            pitch: 3,
            octave: 0,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'cha̍p', hanlo: '十' },
            lyricsByVerse: { 1: { hanlo: '十', poj: 'cha̍p' }, 2: { hanlo: '等', poj: 'tán' } },
          },
          {
            id: 'bch_n9_2',
            pitch: 5,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'chhit', hanlo: '七' },
            lyricsByVerse: { 1: { hanlo: '七', poj: 'chhit' }, 2: { hanlo: '待', poj: 'thāi' } },
          },
          {
            id: 'bch_n9_3',
            pitch: 5,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'peh', hanlo: '八' },
            lyricsByVerse: { 1: { hanlo: '八', poj: 'peh' }, 2: { hanlo: 'hô', poj: 'hô' } },
          },
          {
            id: 'bch_n9_4',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'hòe', hanlo: '歲' },
            lyricsByVerse: { 1: { hanlo: '歲', poj: 'hòe' }, 2: { hanlo: 'sî', poj: 'sî' } },
          },
          {
            id: 'bch_n9_5',
            pitch: 5,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'bē', hanlo: '未' },
            lyricsByVerse: { 1: { hanlo: '未', poj: 'bē' }, 2: { hanlo: 'kun', poj: 'kun' } },
          },
        ],
      },
      {
        id: 'bch_m10',
        measureNumber: 10,
        chord: 'G#m',
        isLineBreak: true,
        notes: [
          {
            id: 'bch_n10_1',
            pitch: 1,
            octave: 1,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'chhut', hanlo: '出' },
            lyricsByVerse: { 1: { hanlo: '出', poj: 'chhut' }, 2: { hanlo: 'lâi', poj: 'lâi' } },
          },
          {
            id: 'bch_n10_2',
            pitch: 2,
            octave: 1,
            duration: 0.5,
            lyric: { poj: 'kè,', hanlo: '嫁，' },
            lyricsByVerse: { 1: { hanlo: '嫁，', poj: 'kè,' }, 2: { hanlo: 'chhái,', poj: 'chhái,' } },
          },
          { id: 'bch_n10_3', pitch: 2, octave: 1, duration: 2.0, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'bch_m11',
        measureNumber: 11,
        chord: 'A',
        notes: [
          {
            id: 'bch_n11_1',
            pitch: 5,
            octave: 0,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'kìⁿ', hanlo: '見' },
            lyricsByVerse: { 1: { hanlo: '見', poj: 'kìⁿ' }, 2: { hanlo: 'chheng', poj: '青' } },
          },
          {
            id: 'bch_n11_2',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'tio̍h', hanlo: '著' },
            lyricsByVerse: { 1: { hanlo: '著', poj: 'tio̍h' }, 2: { hanlo: 'chhun', poj: 'chhun' } },
          },
          {
            id: 'bch_n11_3',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'siàu', hanlo: '少' },
            lyricsByVerse: { 1: { hanlo: '少', poj: 'siàu' }, 2: { hanlo: 'hoe', poj: 'hoe' } },
          },
          {
            id: 'bch_n11_4',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'liân', hanlo: '年' },
            lyricsByVerse: { 1: { hanlo: '年', poj: 'liân' }, 2: { hanlo: 'tng', poj: 'tng' } },
          },
          { id: 'bch_n11_5', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          {
            id: 'bch_n11_6',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'ke', hanlo: '家' },
            lyricsByVerse: { 1: { hanlo: '家', poj: 'ke' }, 2: { hanlo: '開', poj: 'khui' } },
          },
        ],
      },
      {
        id: 'bch_m12',
        measureNumber: 12,
        chord: 'E',
        isLineBreak: true,
        notes: [
          { id: 'bch_n12_1', pitch: 1, octave: 0, duration: 4.0, lyric: { poj: '', hanlo: '' } },
        ],
      },

      // ======================================================================
      // SYSTEM 4: DEVELOPMENT (Measures 13 - 17)
      // ======================================================================
      {
        id: 'bch_m13',
        measureNumber: 13,
        chord: 'B',
        notes: [
          {
            id: 'bch_n13_1',
            pitch: 2,
            octave: 0,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'kó-', hanlo: '果' },
            lyricsByVerse: { 1: { hanlo: '果', poj: 'kó-' }, 2: { hanlo: '聽', poj: 'thiaⁿ-' } },
          },
          {
            id: 'bch_n13_2',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'jiân', hanlo: '然' },
            lyricsByVerse: { 1: { hanlo: '然', poj: 'jiân' }, 2: { hanlo: 'kìⁿ', poj: '見' } },
          },
          {
            id: 'bch_n13_3',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'phiau-', hanlo: '標' },
            lyricsByVerse: { 1: { hanlo: '標', poj: 'phiau-' }, 2: { hanlo: '外', poj: 'gōa-' } },
          },
          {
            id: 'bch_n13_4',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'tì', hanlo: '緻' },
            lyricsByVerse: { 1: { hanlo: '緻', poj: 'tì' }, 2: { hanlo: '面', poj: 'bīn' } },
          },
          {
            id: 'bch_n13_5',
            pitch: 1,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'bīn-', hanlo: '面' },
            lyricsByVerse: { 1: { hanlo: '面', poj: 'bīn-' }, 2: { hanlo: '有', poj: 'ū' } },
          },
        ],
      },
      {
        id: 'bch_m14',
        measureNumber: 14,
        chord: 'E',
        isLineBreak: true,
        notes: [
          {
            id: 'bch_n14_1',
            pitch: 6,
            octave: -1,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'bah', hanlo: '肉' },
            lyricsByVerse: { 1: { hanlo: '肉', poj: 'bah' }, 2: { hanlo: 'lâng', poj: '人' } },
          },
          {
            id: 'bch_n14_2',
            pitch: 5,
            octave: -1,
            duration: 0.5,
            lyric: { poj: 'pe̍h,', hanlo: '白，' },
            lyricsByVerse: { 1: { hanlo: '白，', poj: 'pe̍h,' }, 2: { hanlo: 'lâi,', poj: 'lâi,' } },
          },
          { id: 'bch_n14_3', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n14_4', pitch: 1, octave: 0, duration: 1.5, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'bch_m15',
        measureNumber: 15,
        chord: 'A',
        notes: [
          {
            id: 'bch_n15_1',
            pitch: 6,
            octave: -1,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'siáⁿ', hanlo: '誰' },
            lyricsByVerse: { 1: { hanlo: '誰', poj: 'siáⁿ' }, 2: { hanlo: 'khui', poj: '開' } },
          },
          {
            id: 'bch_n15_2',
            pitch: 1,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'ke', hanlo: '家' },
            lyricsByVerse: { 1: { hanlo: '家', poj: 'ke' }, 2: { hanlo: 'mn̂g', poj: '門' } },
          },
          {
            id: 'bch_n15_3',
            pitch: 2,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'lâng', hanlo: '人' },
            lyricsByVerse: { 1: { hanlo: '人', poj: 'lâng' }, 2: { hanlo: 'kah', poj: 'kah' } },
          },
          {
            id: 'bch_n15_4',
            pitch: 3,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'chú', hanlo: '子' },
            lyricsByVerse: { 1: { hanlo: '子', poj: 'chú' }, 2: { hanlo: 'khòaⁿ', poj: '看' } },
          },
        ],
      },
      {
        id: 'bch_m16',
        measureNumber: 16,
        chord: 'B',
        notes: [
          {
            id: 'bch_n16_1',
            pitch: 5,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'tē', hanlo: '弟' },
            lyricsByVerse: { 1: { hanlo: '弟', poj: 'tē' }, 2: { hanlo: '覓', poj: 'bāi' } },
          },
          {
            id: 'bch_n16_2',
            pitch: 5,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'siūⁿ', hanlo: '想' },
            lyricsByVerse: { 1: { hanlo: '想', poj: 'siūⁿ' }, 2: { hanlo: 'goe̍h', poj: 'goe̍h' } },
          },
          {
            id: 'bch_n16_3',
            pitch: 5,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'beh', hanlo: '要' },
            lyricsByVerse: { 1: { hanlo: '要', poj: 'beh' }, 2: { hanlo: 'niû', poj: '娘' } },
          },
          {
            id: 'bch_n16_4',
            pitch: 5,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'mn̄g', hanlo: '問' },
            lyricsByVerse: { 1: { hanlo: '問', poj: 'mn̄g' }, 2: { hanlo: 'chhiò', poj: '笑' } },
          },
        ],
      },
      {
        id: 'bch_m17',
        measureNumber: 17,
        chord: 'E',
        isLineBreak: true,
        notes: [
          {
            id: 'bch_n17_1',
            pitch: 5,
            octave: -1,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'i,', hanlo: '伊，' },
            lyricsByVerse: { 1: { hanlo: '伊，', poj: 'i,' }, 2: { hanlo: '阮，', poj: 'gún,' } },
          },
          { id: 'bch_n17_2', pitch: 5, octave: -1, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n17_3', pitch: 6, octave: -1, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n17_4', pitch: 5, octave: -1, duration: 1.0, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'bch_n17_5', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: '', hanlo: '' } },
        ],
      },

      // ======================================================================
      // SYSTEM 5: VOLTA ENDINGS (1. 2. vs 3.) (Measures 18 - 22)
      // ======================================================================
      {
        id: 'bch_m18',
        measureNumber: 18,
        chord: 'C#m',
        voltaEnding: [1, 2],
        notes: [
          {
            id: 'bch_n18_1',
            pitch: 3,
            octave: 0,
            duration: 1.0,
            lyric: { poj: 'kiaⁿ', hanlo: '驚' },
            lyricsByVerse: { 1: { hanlo: '驚', poj: 'kiaⁿ' }, 2: { hanlo: 'gong', poj: '憨' } },
          },
          {
            id: 'bch_n18_2',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'pháiⁿ', hanlo: '歹' },
            lyricsByVerse: { 1: { hanlo: '歹', poj: 'pháiⁿ' }, 2: { hanlo: 'tōa', poj: 'tōa' } },
          },
          { id: 'bch_n18_3', pitch: 1, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          {
            id: 'bch_n18_4',
            pitch: 6,
            octave: -1,
            duration: 2.0,
            lyric: { poj: 'sè', hanlo: '勢' },
            lyricsByVerse: { 1: { hanlo: '勢', poj: 'sè' }, 2: { hanlo: 'tai', poj: 'tai' } },
          },
        ],
      },
      {
        id: 'bch_m19',
        measureNumber: 19,
        chord: 'A',
        voltaEnding: [1, 2],
        notes: [
          {
            id: 'bch_n19_1',
            pitch: 5,
            octave: 0,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'sim', hanlo: '心' },
            lyricsByVerse: { 1: { hanlo: '心', poj: 'sim' }, 2: { hanlo: 'hō͘', poj: '予' } },
          },
          {
            id: 'bch_n19_2',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'lāi', hanlo: '內' },
            lyricsByVerse: { 1: { hanlo: '內', poj: 'lāi' }, 2: { hanlo: 'hong', poj: '風' } },
          },
          {
            id: 'bch_n19_3',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'tôaⁿ', hanlo: '彈' },
            lyricsByVerse: { 1: { hanlo: '彈', poj: 'tôaⁿ' }, 2: { hanlo: 'phiàn', poj: '騙' } },
          },
          {
            id: 'bch_n19_4',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'pî', hanlo: '琵' },
            lyricsByVerse: { 1: { hanlo: '琵', poj: 'pî' }, 2: { hanlo: 'put', poj: '不' } },
          },
          { id: 'bch_n19_5', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          {
            id: 'bch_n19_6',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'pê', hanlo: '琶' },
            lyricsByVerse: { 1: { hanlo: '琶', poj: 'pê' }, 2: { hanlo: 'ti', poj: 'ti' } },
          },
        ],
      },
      {
        id: 'bch_m20',
        measureNumber: 20,
        chord: 'E',
        voltaEnding: [1, 2],
        barlineType: 'repeat_end',
        isLineBreak: true,
        notes: [
          { id: 'bch_n20_1', pitch: 1, octave: 0, duration: 4.0, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'bch_m21',
        measureNumber: 21,
        chord: 'A',
        voltaEnding: [3],
        notes: [
          {
            id: 'bch_n21_1',
            pitch: 5,
            octave: 0,
            duration: 1.5,
            isDotted: true,
            lyric: { poj: 'sim', hanlo: '心' },
            lyricsByVerse: { 1: { hanlo: '心', poj: 'sim' } },
          },
          {
            id: 'bch_n21_2',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'lāi', hanlo: '內' },
            lyricsByVerse: { 1: { hanlo: '內', poj: 'lāi' } },
          },
          {
            id: 'bch_n21_3',
            pitch: 3,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'tôaⁿ', hanlo: '彈' },
            lyricsByVerse: { 1: { hanlo: '彈', poj: 'tôaⁿ' } },
          },
          {
            id: 'bch_n21_4',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            slurToNext: true,
            lyric: { poj: 'pî', hanlo: '琵' },
            lyricsByVerse: { 1: { hanlo: '琵', poj: 'pî' } },
          },
          { id: 'bch_n21_5', pitch: 3, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          {
            id: 'bch_n21_6',
            pitch: 2,
            octave: 0,
            duration: 0.5,
            lyric: { poj: 'pê', hanlo: '琶' },
            lyricsByVerse: { 1: { hanlo: '琶', poj: 'pê' } },
          },
        ],
      },
      {
        id: 'bch_m22',
        measureNumber: 22,
        chord: 'E',
        voltaEnding: [3],
        barlineType: 'end',
        isLineBreak: true,
        notes: [
          { id: 'bch_n22_1', pitch: 1, octave: 0, duration: 4.0, lyric: { poj: '', hanlo: '' } },
        ],
      },
    ],
  },
  {
    id: 'u-ia-hoe',
    title: '雨夜花 (Ú-iā-hoe)',
    subtitle: '周添旺 詞 / 鄧雨賢 曲 (信望愛白話字 POJ 對齊·全四段)',
    composer: '鄧雨賢 (Tēng Ú-hiân)',
    lyricist: '周添旺 (Chiu Thiam-ōng)',
    key: 'Bb',
    timeSignature: '4/4',
    bpm: 72,
    notesPerLine: 2,
    description: '經典臺灣歌謠《雨夜花》，降B調 (4/4拍)，完整收錄白話字 (POJ) 與漢羅字字對齊之全四段（共32小節）。時值倍增且適時換行，短句好讀好唱。',
    measures: [
      // ======================================================================
      // VERSE 1 (Measures 1 - 8)
      // ======================================================================
      {
        id: 'u_m1',
        measureNumber: 1,
        chord: 'Bb',
        section: 'Verse 1',
        notes: [
          { id: 'u_v1_n1', pitch: 5, octave: -1, duration: 0.5, slurToNext: true, lyric: { poj: 'Ú', hanlo: '雨' } },
          { id: 'u_v1_n2', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n3', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'iā', hanlo: '夜' } },
          { id: 'u_v1_n4', pitch: 3, octave: 0, duration: 2.0, lyric: { poj: 'hoe', hanlo: '花' } },
        ],
      },
      {
        id: 'u_m2',
        measureNumber: 2,
        chord: 'Gm',
        isLineBreak: true,
        notes: [
          { id: 'u_v1_n5', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'ú', hanlo: '雨' } },
          { id: 'u_v1_n6', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n7', pitch: 1, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'iā', hanlo: '夜' } },
          { id: 'u_v1_n8', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n9', pitch: 5, octave: -1, duration: 2.0, lyric: { poj: 'hoe,', hanlo: '花，' } },
        ],
      },
      {
        id: 'u_m3',
        measureNumber: 3,
        chord: 'Eb',
        notes: [
          { id: 'u_v1_n10', pitch: 1, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'siū', hanlo: '受' } },
          { id: 'u_v1_n11', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n12', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'hong', hanlo: '風' } },
          { id: 'u_v1_n13', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'hō͘', hanlo: '雨' } },
          { id: 'u_v1_n14', pitch: 1, octave: 1, duration: 0.5, slurToNext: true, annotation: '過門', lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n15', pitch: 2, octave: 1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'u_m4',
        measureNumber: 4,
        chord: 'F7',
        isLineBreak: true,
        notes: [
          { id: 'u_v1_n16', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'chhoe', hanlo: '吹' } },
          { id: 'u_v1_n17', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'lo̍h', hanlo: '落' } },
          { id: 'u_v1_n18', pitch: 2, octave: 0, duration: 2.0, lyric: { poj: 'tē.', hanlo: '地。' } },
        ],
      },
      {
        id: 'u_m5',
        measureNumber: 5,
        chord: 'Bb',
        notes: [
          { id: 'u_v1_n19', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'Bô', hanlo: '無' } },
          { id: 'u_v1_n20', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'lâng', hanlo: '人' } },
          { id: 'u_v1_n21', pitch: 5, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'khòaⁿ', hanlo: '看' } },
          { id: 'u_v1_n22', pitch: 3, octave: 0, duration: 0.25, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n23', pitch: 5, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n24', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'kìⁿ', hanlo: '見' } },
        ],
      },
      {
        id: 'u_m6',
        measureNumber: 6,
        chord: 'Cm',
        isLineBreak: true,
        notes: [
          { id: 'u_v1_n25', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'mî', hanlo: '暝' } },
          { id: 'u_v1_n26', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n27', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'ji̍t', hanlo: '日' } },
          { id: 'u_v1_n28', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v1_n29', pitch: 1, octave: 0, duration: 1.0, lyric: { poj: 'oàn', hanlo: '怨' } },
          { id: 'u_v1_n30', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'chhè,', hanlo: '嗟，' } },
        ],
      },
      {
        id: 'u_m7',
        measureNumber: 7,
        chord: 'Gm',
        notes: [
          { id: 'u_v1_n31', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'Hoe', hanlo: '花' } },
          { id: 'u_v1_n32', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'siā', hanlo: '謝' } },
          { id: 'u_v1_n33', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'lo̍h', hanlo: '落' } },
          { id: 'u_v1_n34', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'thô͘', hanlo: '土' } },
        ],
      },
      {
        id: 'u_m8',
        measureNumber: 8,
        chord: 'Bb',
        barlineType: 'double',
        isLineBreak: true,
        notes: [
          { id: 'u_v1_n35', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'put', hanlo: '不' } },
          { id: 'u_v1_n36', pitch: 2, octave: 0, duration: 1.0, lyric: { poj: 'chài', hanlo: '再' } },
          { id: 'u_v1_n37', pitch: 1, octave: 0, duration: 2.0, lyric: { poj: 'hôe.', hanlo: '回。' } },
        ],
      },

      // ======================================================================
      // VERSE 2 (Measures 9 - 16)
      // ======================================================================
      {
        id: 'u_m9',
        measureNumber: 9,
        chord: 'Bb',
        section: 'Verse 2',
        notes: [
          { id: 'u_v2_n1', pitch: 5, octave: -1, duration: 0.5, slurToNext: true, lyric: { poj: 'Hoe', hanlo: '花' } },
          { id: 'u_v2_n2', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n3', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'lo̍h', hanlo: '落' } },
          { id: 'u_v2_n4', pitch: 3, octave: 0, duration: 2.0, lyric: { poj: 'thô͘', hanlo: '土' } },
        ],
      },
      {
        id: 'u_m10',
        measureNumber: 10,
        chord: 'Gm',
        isLineBreak: true,
        notes: [
          { id: 'u_v2_n5', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'hoe', hanlo: '花' } },
          { id: 'u_v2_n6', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n7', pitch: 1, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'lo̍h', hanlo: '落' } },
          { id: 'u_v2_n8', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n9', pitch: 5, octave: -1, duration: 2.0, lyric: { poj: 'thô͘,', hanlo: '土，' } },
        ],
      },
      {
        id: 'u_m11',
        measureNumber: 11,
        chord: 'Eb',
        notes: [
          { id: 'u_v2_n10', pitch: 1, octave: 0, duration: 0.5, lyric: { poj: 'ū', hanlo: '有' } },
          { id: 'u_v2_n11', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: 'siáⁿ', hanlo: '啥' } },
          { id: 'u_v2_n12', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'lâng', hanlo: '人' } },
          { id: 'u_v2_n13', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'thang', hanlo: 'thang' } },
          { id: 'u_v2_n14', pitch: 1, octave: 1, duration: 0.5, slurToNext: true, annotation: '過門', lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n15', pitch: 2, octave: 1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'u_m12',
        measureNumber: 12,
        chord: 'F7',
        isLineBreak: true,
        notes: [
          { id: 'u_v2_n16', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'khòaⁿ', hanlo: '看' } },
          { id: 'u_v2_n17', pitch: 3, octave: 0, duration: 1.0, slurToNext: true, lyric: { poj: 'kò͘', hanlo: '顧' } },
          { id: 'u_v2_n18', pitch: 2, octave: 0, duration: 2.0, lyric: { poj: '?', hanlo: '？' } },
        ],
      },
      {
        id: 'u_m13',
        measureNumber: 13,
        chord: 'Bb',
        notes: [
          { id: 'u_v2_n19', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'Bô', hanlo: '無' } },
          { id: 'u_v2_n20', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'chêng', hanlo: '情' } },
          { id: 'u_v2_n21', pitch: 5, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'hong', hanlo: '風' } },
          { id: 'u_v2_n22', pitch: 3, octave: 0, duration: 0.25, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n23', pitch: 5, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n24', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'hō͘', hanlo: '雨' } },
        ],
      },
      {
        id: 'u_m14',
        measureNumber: 14,
        chord: 'Cm',
        isLineBreak: true,
        notes: [
          { id: 'u_v2_n25', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'gō͘', hanlo: '誤' } },
          { id: 'u_v2_n26', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n27', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'goán', hanlo: '阮' } },
          { id: 'u_v2_n28', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v2_n29', pitch: 1, octave: 0, duration: 1.0, lyric: { poj: 'chiân', hanlo: '前' } },
          { id: 'u_v2_n30', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'tô͘,', hanlo: '途，' } },
        ],
      },
      {
        id: 'u_m15',
        measureNumber: 15,
        chord: 'Gm',
        notes: [
          { id: 'u_v2_n31', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'hoe', hanlo: '花' } },
          { id: 'u_v2_n32', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'lúi', hanlo: '蕊' } },
          { id: 'u_v2_n33', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'tiau', hanlo: '凋' } },
          { id: 'u_v2_n34', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'lo̍h', hanlo: '落' } },
        ],
      },
      {
        id: 'u_m16',
        measureNumber: 16,
        chord: 'Bb',
        barlineType: 'double',
        isLineBreak: true,
        notes: [
          { id: 'u_v2_n35', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'beh', hanlo: 'beh' } },
          { id: 'u_v2_n36', pitch: 2, octave: 0, duration: 1.0, lyric: { poj: 'jû', hanlo: '如' } },
          { id: 'u_v2_n37', pitch: 1, octave: 0, duration: 2.0, lyric: { poj: 'hô?', hanlo: '何？' } },
        ],
      },

      // ======================================================================
      // VERSE 3 (Measures 17 - 24)
      // ======================================================================
      {
        id: 'u_m17',
        measureNumber: 17,
        chord: 'Bb',
        section: 'Verse 3',
        notes: [
          { id: 'u_v3_n1', pitch: 5, octave: -1, duration: 0.5, slurToNext: true, lyric: { poj: 'Ú', hanlo: '雨' } },
          { id: 'u_v3_n2', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n3', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'bô', hanlo: '無' } },
          { id: 'u_v3_n4', pitch: 3, octave: 0, duration: 2.0, lyric: { poj: 'chêng', hanlo: '情' } },
        ],
      },
      {
        id: 'u_m18',
        measureNumber: 18,
        chord: 'Gm',
        isLineBreak: true,
        notes: [
          { id: 'u_v3_n5', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'ú', hanlo: '雨' } },
          { id: 'u_v3_n6', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n7', pitch: 1, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'bô', hanlo: '無' } },
          { id: 'u_v3_n8', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n9', pitch: 5, octave: -1, duration: 2.0, lyric: { poj: 'chêng,', hanlo: '情，' } },
        ],
      },
      {
        id: 'u_m19',
        measureNumber: 19,
        chord: 'Eb',
        notes: [
          { id: 'u_v3_n10', pitch: 1, octave: 0, duration: 0.5, lyric: { poj: 'bô', hanlo: '無' } },
          { id: 'u_v3_n11', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: 'siūⁿ', hanlo: '想' } },
          { id: 'u_v3_n12', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'gún', hanlo: '阮' } },
          { id: 'u_v3_n13', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'ê', hanlo: 'ê' } },
          { id: 'u_v3_n14', pitch: 1, octave: 1, duration: 0.5, slurToNext: true, annotation: '過門', lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n15', pitch: 2, octave: 1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'u_m20',
        measureNumber: 20,
        chord: 'F7',
        isLineBreak: true,
        notes: [
          { id: 'u_v3_n16', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'chiân', hanlo: '前' } },
          { id: 'u_v3_n17', pitch: 3, octave: 0, duration: 1.0, slurToNext: true, lyric: { poj: 'tô͘', hanlo: '途' } },
          { id: 'u_v3_n18', pitch: 2, octave: 0, duration: 2.0, lyric: { poj: '.', hanlo: '。' } },
        ],
      },
      {
        id: 'u_m21',
        measureNumber: 21,
        chord: 'Bb',
        notes: [
          { id: 'u_v3_n19', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'Pēng', hanlo: '並' } },
          { id: 'u_v3_n20', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'bô', hanlo: '無' } },
          { id: 'u_v3_n21', pitch: 5, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'khòaⁿ', hanlo: '看' } },
          { id: 'u_v3_n22', pitch: 3, octave: 0, duration: 0.25, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n23', pitch: 5, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n24', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'hō͘', hanlo: '護' } },
        ],
      },
      {
        id: 'u_m22',
        measureNumber: 22,
        chord: 'Cm',
        isLineBreak: true,
        notes: [
          { id: 'u_v3_n25', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'nńg', hanlo: '軟' } },
          { id: 'u_v3_n26', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n27', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'jio̍k', hanlo: '弱' } },
          { id: 'u_v3_n28', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v3_n29', pitch: 1, octave: 0, duration: 1.0, lyric: { poj: 'sim', hanlo: '心' } },
          { id: 'u_v3_n30', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'sèng,', hanlo: '性，' } },
        ],
      },
      {
        id: 'u_m23',
        measureNumber: 23,
        chord: 'Gm',
        notes: [
          { id: 'u_v3_n31', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'Hō͘', hanlo: 'Hō͘' } },
          { id: 'u_v3_n32', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'gún', hanlo: '阮' } },
          { id: 'u_v3_n33', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'chiân', hanlo: '前' } },
          { id: 'u_v3_n34', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'tô͘', hanlo: '途' } },
        ],
      },
      {
        id: 'u_m24',
        measureNumber: 24,
        chord: 'Bb',
        barlineType: 'double',
        isLineBreak: true,
        notes: [
          { id: 'u_v3_n35', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'sit', hanlo: '失' } },
          { id: 'u_v3_n36', pitch: 2, octave: 0, duration: 1.0, lyric: { poj: 'kong', hanlo: '光' } },
          { id: 'u_v3_n37', pitch: 1, octave: 0, duration: 2.0, lyric: { poj: 'bêng.', hanlo: '明。' } },
        ],
      },

      // ======================================================================
      // VERSE 4 (Measures 25 - 32)
      // ======================================================================
      {
        id: 'u_m25',
        measureNumber: 25,
        chord: 'Bb',
        section: 'Verse 4',
        notes: [
          { id: 'u_v4_n1', pitch: 5, octave: -1, duration: 0.5, slurToNext: true, lyric: { poj: 'Ú', hanlo: '雨' } },
          { id: 'u_v4_n2', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n3', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'chúi', hanlo: '水' } },
          { id: 'u_v4_n4', pitch: 3, octave: 0, duration: 2.0, lyric: { poj: 'tih', hanlo: '滴' } },
        ],
      },
      {
        id: 'u_m26',
        measureNumber: 26,
        chord: 'Gm',
        isLineBreak: true,
        notes: [
          { id: 'u_v4_n5', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'ú', hanlo: '雨' } },
          { id: 'u_v4_n6', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n7', pitch: 1, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'chúi', hanlo: '水' } },
          { id: 'u_v4_n8', pitch: 6, octave: -1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n9', pitch: 5, octave: -1, duration: 2.0, lyric: { poj: 'tih,', hanlo: '滴，' } },
        ],
      },
      {
        id: 'u_m27',
        measureNumber: 27,
        chord: 'Eb',
        notes: [
          { id: 'u_v4_n10', pitch: 1, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'ín', hanlo: '引' } },
          { id: 'u_v4_n11', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n12', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'gún', hanlo: '阮' } },
          { id: 'u_v4_n13', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'ji̍p', hanlo: '入' } },
          { id: 'u_v4_n14', pitch: 1, octave: 1, duration: 0.5, slurToNext: true, annotation: '過門', lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n15', pitch: 2, octave: 1, duration: 0.5, lyric: { poj: '', hanlo: '' } },
        ],
      },
      {
        id: 'u_m28',
        measureNumber: 28,
        chord: 'F7',
        isLineBreak: true,
        notes: [
          { id: 'u_v4_n16', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'siū', hanlo: '受' } },
          { id: 'u_v4_n17', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'lān', hanlo: '難' } },
          { id: 'u_v4_n18', pitch: 2, octave: 0, duration: 2.0, lyric: { poj: 'tî.', hanlo: '池。' } },
        ],
      },
      {
        id: 'u_m29',
        measureNumber: 29,
        chord: 'Bb',
        notes: [
          { id: 'u_v4_n19', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'Chóaⁿ', hanlo: '怎' } },
          { id: 'u_v4_n20', pitch: 5, octave: 0, duration: 1.0, lyric: { poj: 'iūⁿ', hanlo: '樣' } },
          { id: 'u_v4_n21', pitch: 5, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'hō͘', hanlo: 'hō͘' } },
          { id: 'u_v4_n22', pitch: 3, octave: 0, duration: 0.25, slurToNext: true, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n23', pitch: 5, octave: 0, duration: 0.25, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n24', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'gún', hanlo: '阮' } },
        ],
      },
      {
        id: 'u_m30',
        measureNumber: 30,
        chord: 'Cm',
        isLineBreak: true,
        notes: [
          { id: 'u_v4_n25', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'lī', hanlo: '離' } },
          { id: 'u_v4_n26', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n27', pitch: 3, octave: 0, duration: 0.5, slurToNext: true, lyric: { poj: 'hio̍h', hanlo: '葉' } },
          { id: 'u_v4_n28', pitch: 2, octave: 0, duration: 0.5, lyric: { poj: '', hanlo: '' } },
          { id: 'u_v4_n29', pitch: 1, octave: 0, duration: 1.0, lyric: { poj: 'lī', hanlo: '離' } },
          { id: 'u_v4_n30', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'ki,', hanlo: '枝，' } },
        ],
      },
      {
        id: 'u_m31',
        measureNumber: 31,
        chord: 'Gm',
        notes: [
          { id: 'u_v4_n31', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'Éng', hanlo: '永' } },
          { id: 'u_v4_n32', pitch: 6, octave: -1, duration: 1.0, lyric: { poj: 'oán', hanlo: '遠' } },
          { id: 'u_v4_n33', pitch: 5, octave: -1, duration: 1.0, lyric: { poj: 'bô', hanlo: '無' } },
          { id: 'u_v4_n34', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'lâng', hanlo: '人' } },
        ],
      },
      {
        id: 'u_m32',
        measureNumber: 32,
        chord: 'Bb',
        barlineType: 'end',
        isLineBreak: true,
        notes: [
          { id: 'u_v4_n35', pitch: 3, octave: 0, duration: 1.0, lyric: { poj: 'thang', hanlo: 'thang' } },
          { id: 'u_v4_n36', pitch: 2, octave: 0, duration: 1.0, lyric: { poj: 'khòaⁿ', hanlo: '看' } },
          { id: 'u_v4_n37', pitch: 1, octave: 0, duration: 2.0, lyric: { poj: 'kìⁿ.', hanlo: '見。' } },
        ],
      },
    ],
  },
  {
    "id": "su-ki-hong",
    "title": "四季紅",
    "subtitle": "Sù-kì-hông (7030 / 1=Eb 4/4 ♩=120)",
    "catalogNumber": "7030",
    "lyricist": "李臨秋 (Lí Lîm-chhiu)",
    "composer": "鄧雨賢 (Tēng Ú-hiân)",
    "notator": "數位簡譜採譜排版",
    "key": "Eb",
    "timeSignature": "4/4",
    "bpm": 120,
    "notesPerLine": 4,
    "verseCount": 4,
    "description": "1938年臺灣經典歌謠《四季紅》（李臨秋作詞、鄧雨賢作曲），Eb調 (4/4拍，♩=120)。標準簡譜排版，包含完整前奏（第1-8小節）、四季主歌（春、夏、秋、冬）、第1.3.反覆跳越間奏、第2.跳越 8Bars 間奏與第4.尾奏 (Coda)。",
    "footnote": "音圓點歌號 7030 / 音域 3. ~ 6. / 原作詞 李臨秋・作曲 鄧雨賢",
    "measures": [
      {
        "id": "skh_m1",
        "measureNumber": 1,
        "chord": "Eb",
        "section": "前奏 (Prelude)",
        "isPrelude": true,
        "notes": [
          {
            "id": "skh_n1_1",
            "pitch": 5,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n1_2",
            "pitch": 6,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n1_3",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n1_4",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n1_5",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n1_6",
            "pitch": 1,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n1_7",
            "pitch": 6,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n1_8",
            "pitch": 1,
            "octave": 1,
            "duration": 1,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m2",
        "measureNumber": 2,
        "chord": "Eb",
        "isPrelude": true,
        "notes": [
          {
            "id": "skh_n2_1",
            "pitch": 5,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n2_2",
            "pitch": 6,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n2_3",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n2_4",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n2_5",
            "pitch": 5,
            "octave": 0,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m3",
        "measureNumber": 3,
        "chord": "Eb",
        "isPrelude": true,
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n3_1",
            "pitch": 5,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n3_2",
            "pitch": 6,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n3_3",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n3_4",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n3_5",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n3_6",
            "pitch": 1,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n3_7",
            "pitch": 6,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n3_8",
            "pitch": 1,
            "octave": 1,
            "duration": 1,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m4",
        "measureNumber": 4,
        "chord": "Eb",
        "isPrelude": true,
        "notes": [
          {
            "id": "skh_n4_1",
            "pitch": 5,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n4_2",
            "pitch": 5,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n4_3",
            "pitch": 5,
            "octave": 1,
            "duration": 0.5,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n4_4",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n4_5",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n4_6",
            "pitch": 1,
            "octave": 1,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m5",
        "measureNumber": 5,
        "chord": "Eb",
        "isPrelude": true,
        "notes": [
          {
            "id": "skh_n5_1",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_2",
            "pitch": 1,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_3",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_4",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_5",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_6",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_7",
            "pitch": 5,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_8",
            "pitch": 3,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_9",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n5_10",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m6",
        "measureNumber": 6,
        "chord": "Bb7",
        "isPrelude": true,
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n6_1",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n6_2",
            "pitch": 1,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n6_3",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n6_4",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n6_5",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n6_6",
            "pitch": 5,
            "octave": 0,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m7",
        "measureNumber": 7,
        "chord": "Eb",
        "isPrelude": true,
        "notes": [
          {
            "id": "skh_n7_1",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_2",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_3",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_4",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_5",
            "pitch": 2,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_6",
            "pitch": 5,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_7",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_8",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_9",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_10",
            "pitch": 6,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_11",
            "pitch": 5,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n7_12",
            "pitch": 3,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m8",
        "measureNumber": 8,
        "chord": "Bb7",
        "isPrelude": true,
        "barlineType": "repeat_start",
        "notes": [
          {
            "id": "skh_n8_1",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_2",
            "pitch": 6,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_3",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_4",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_5",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_6",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_7",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_8",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_9",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_10",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_11",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n8_12",
            "pitch": 0,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m9",
        "measureNumber": 9,
        "chord": "Eb",
        "section": "主歌 (Verse)",
        "notes": [
          {
            "id": "skh_n9_1",
            "pitch": 5,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "春",
              "poj": "Chhun"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "春",
                "poj": "Chhun"
              },
              "2": {
                "hanlo": "夏",
                "poj": "Hē"
              },
              "3": {
                "hanlo": "秋",
                "poj": "Chhiu"
              },
              "4": {
                "hanlo": "冬",
                "poj": "Tang"
              }
            }
          },
          {
            "id": "skh_n9_2",
            "pitch": 1,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "天",
              "poj": "thiⁿ"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "天",
                "poj": "thiⁿ"
              },
              "2": {
                "hanlo": "天",
                "poj": "thiⁿ"
              },
              "3": {
                "hanlo": "天",
                "poj": "thiⁿ"
              },
              "4": {
                "hanlo": "天",
                "poj": "thiⁿ"
              }
            }
          },
          {
            "id": "skh_n9_3",
            "pitch": 1,
            "octave": 0,
            "duration": 1.5,
            "isDotted": true,
            "slurToNext": true,
            "lyric": {
              "hanlo": "花",
              "poj": "hoe"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "花",
                "poj": "hoe"
              },
              "2": {
                "hanlo": "風",
                "poj": "hong"
              },
              "3": {
                "hanlo": "月",
                "poj": "goe̍h"
              },
              "4": {
                "hanlo": "風",
                "poj": "hong"
              }
            }
          },
          {
            "id": "skh_n9_4",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m10",
        "measureNumber": 10,
        "chord": "Eb",
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n10_1",
            "pitch": 3,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "slurToNext": true,
            "lyric": {
              "hanlo": "正",
              "poj": "chiàⁿ"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "正",
                "poj": "chiàⁿ"
              },
              "2": {
                "hanlo": "正",
                "poj": "chiàⁿ"
              },
              "3": {
                "hanlo": "照",
                "poj": "chiò"
              },
              "4": {
                "hanlo": "真",
                "poj": "chin"
              }
            }
          },
          {
            "id": "skh_n10_2",
            "pitch": 2,
            "octave": 0,
            "duration": 0.125,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n10_3",
            "pitch": 1,
            "octave": 0,
            "duration": 0.125,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n10_4",
            "pitch": 2,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "清",
              "poj": "chhing"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "清",
                "poj": "chhing"
              },
              "2": {
                "hanlo": "輕",
                "poj": "khin"
              },
              "3": {
                "hanlo": "入",
                "poj": "ji̍p"
              },
              "4": {
                "hanlo": "過",
                "poj": "kòe"
              }
            }
          },
          {
            "id": "skh_n10_5",
            "pitch": 3,
            "octave": 0,
            "duration": 2,
            "lyric": {
              "hanlo": "香，",
              "poj": "phang,"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "香，",
                "poj": "phang,"
              },
              "2": {
                "hanlo": "鬆，",
                "poj": "sang,"
              },
              "3": {
                "hanlo": "窗，",
                "poj": "thang,"
              },
              "4": {
                "hanlo": "勇，",
                "poj": "ióng,"
              }
            }
          }
        ]
      },
      {
        "id": "skh_m11",
        "measureNumber": 11,
        "chord": "Eb",
        "notes": [
          {
            "id": "skh_n11_1",
            "pitch": 5,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "雙",
              "poj": "Siang"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "雙",
                "poj": "Siang"
              },
              "2": {
                "hanlo": "雙",
                "poj": "Siang"
              },
              "3": {
                "hanlo": "雙",
                "poj": "Siang"
              },
              "4": {
                "hanlo": "雙",
                "poj": "Siang"
              }
            }
          },
          {
            "id": "skh_n11_2",
            "pitch": 3,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "人",
              "poj": "lâng"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "人",
                "poj": "lâng"
              },
              "2": {
                "hanlo": "人",
                "poj": "lâng"
              },
              "3": {
                "hanlo": "人",
                "poj": "lâng"
              },
              "4": {
                "hanlo": "人",
                "poj": "lâng"
              }
            }
          },
          {
            "id": "skh_n11_3",
            "pitch": 3,
            "octave": 0,
            "duration": 1.5,
            "isDotted": true,
            "slurToNext": true,
            "lyric": {
              "hanlo": "心",
              "poj": "sim"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "心",
                "poj": "sim"
              },
              "2": {
                "hanlo": "坐",
                "poj": "chē"
              },
              "3": {
                "hanlo": "對",
                "poj": "tuì"
              },
              "4": {
                "hanlo": "相",
                "poj": "sio"
              }
            }
          },
          {
            "id": "skh_n11_4",
            "pitch": 4,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m12",
        "measureNumber": 12,
        "chord": "Eb",
        "notes": [
          {
            "id": "skh_n12_1",
            "pitch": 3,
            "octave": 0,
            "duration": 0.333,
            "isTriplet": true,
            "slurToNext": true,
            "lyric": {
              "hanlo": "頭",
              "poj": "thâu"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "頭",
                "poj": "thâu"
              },
              "2": {
                "hanlo": "船",
                "poj": "chûn"
              },
              "3": {
                "hanlo": "坐",
                "poj": "chō"
              },
              "4": {
                "hanlo": "抱",
                "poj": "phō"
              }
            }
          },
          {
            "id": "skh_n12_2",
            "pitch": 4,
            "octave": 0,
            "duration": 0.333,
            "isTriplet": true,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n12_3",
            "pitch": 3,
            "octave": 0,
            "duration": 0.334,
            "isTriplet": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n12_4",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "slurToNext": true,
            "lyric": {
              "hanlo": "齊",
              "poj": "chê"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "齊",
                "poj": "chê"
              },
              "2": {
                "hanlo": "在",
                "poj": "chāi"
              },
              "3": {
                "hanlo": "想",
                "poj": "siūⁿ"
              },
              "4": {
                "hanlo": "溫",
                "poj": "un"
              }
            }
          },
          {
            "id": "skh_n12_5",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n12_6",
            "pitch": 2,
            "octave": 0,
            "duration": 2,
            "lyric": {
              "hanlo": "震動，",
              "poj": "tín-tāng,"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "震動，",
                "poj": "tín-tāng,"
              },
              "2": {
                "hanlo": "遊江，",
                "poj": "iû-kang,"
              },
              "3": {
                "hanlo": "這冬，",
                "poj": "chit-tang,"
              },
              "4": {
                "hanlo": "暖中，",
                "poj": "loán-tiong,"
              }
            }
          }
        ]
      },
      {
        "id": "skh_m13",
        "measureNumber": 13,
        "chord": "Ab",
        "notes": [
          {
            "id": "skh_n13_1",
            "pitch": 1,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "有",
              "poj": "Ū"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "有",
                "poj": "Ū"
              },
              "2": {
                "hanlo": "有",
                "poj": "Ū"
              },
              "3": {
                "hanlo": "有",
                "poj": "Ū"
              },
              "4": {
                "hanlo": "有",
                "poj": "Ū"
              }
            }
          },
          {
            "id": "skh_n13_2",
            "pitch": 2,
            "octave": 0,
            "duration": 0.25,
            "slurToNext": true,
            "lyric": {
              "hanlo": "話",
              "poj": "uē"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "話",
                "poj": "uē"
              },
              "2": {
                "hanlo": "話",
                "poj": "uē"
              },
              "3": {
                "hanlo": "話",
                "poj": "uē"
              },
              "4": {
                "hanlo": "話",
                "poj": "uē"
              }
            }
          },
          {
            "id": "skh_n13_3",
            "pitch": 3,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n13_4",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "lyric": {
              "hanlo": "想",
              "poj": "siūⁿ"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "想",
                "poj": "siūⁿ"
              },
              "2": {
                "hanlo": "想",
                "poj": "siūⁿ"
              },
              "3": {
                "hanlo": "想",
                "poj": "siūⁿ"
              },
              "4": {
                "hanlo": "想",
                "poj": "siūⁿ"
              }
            }
          },
          {
            "id": "skh_n13_5",
            "pitch": 1,
            "octave": 0,
            "duration": 2,
            "lyric": {
              "hanlo": "要",
              "poj": "beh"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "要",
                "poj": "beh"
              },
              "2": {
                "hanlo": "要",
                "poj": "beh"
              },
              "3": {
                "hanlo": "要",
                "poj": "beh"
              },
              "4": {
                "hanlo": "要",
                "poj": "beh"
              }
            }
          }
        ]
      },
      {
        "id": "skh_m14",
        "measureNumber": 14,
        "chord": "Eb",
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n14_1",
            "pitch": 2,
            "octave": 0,
            "duration": 0.25,
            "slurToNext": true,
            "lyric": {
              "hanlo": "對",
              "poj": "tuì"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "對",
                "poj": "tuì"
              },
              "2": {
                "hanlo": "對",
                "poj": "tuì"
              },
              "3": {
                "hanlo": "對",
                "poj": "tuì"
              },
              "4": {
                "hanlo": "對",
                "poj": "tuì"
              }
            }
          },
          {
            "id": "skh_n14_2",
            "pitch": 1,
            "octave": 0,
            "duration": 0.25,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n14_3",
            "pitch": 7,
            "octave": -1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n14_4",
            "pitch": 6,
            "octave": -1,
            "duration": 1,
            "lyric": {
              "hanlo": "妳",
              "poj": "lí"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "妳",
                "poj": "lí"
              },
              "2": {
                "hanlo": "妳",
                "poj": "lí"
              },
              "3": {
                "hanlo": "妳",
                "poj": "lí"
              },
              "4": {
                "hanlo": "妳",
                "poj": "lí"
              }
            }
          },
          {
            "id": "skh_n14_5",
            "pitch": 5,
            "octave": -1,
            "duration": 2,
            "lyric": {
              "hanlo": "講，",
              "poj": "kóng,"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "講，",
                "poj": "kóng,"
              },
              "2": {
                "hanlo": "講，",
                "poj": "kóng,"
              },
              "3": {
                "hanlo": "講，",
                "poj": "kóng,"
              },
              "4": {
                "hanlo": "講，",
                "poj": "kóng,"
              }
            }
          }
        ]
      },
      {
        "id": "skh_m15",
        "measureNumber": 15,
        "chord": "Fm",
        "notes": [
          {
            "id": "skh_n15_1",
            "pitch": 3,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "不",
              "poj": "M̄-"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "不",
                "poj": "M̄-"
              },
              "2": {
                "hanlo": "不",
                "poj": "M̄-"
              },
              "3": {
                "hanlo": "不",
                "poj": "M̄-"
              },
              "4": {
                "hanlo": "不",
                "poj": "M̄-"
              }
            }
          },
          {
            "id": "skh_n15_2",
            "pitch": 5,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "知",
              "poj": "chai"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "知",
                "poj": "chai"
              },
              "2": {
                "hanlo": "知",
                "poj": "chai"
              },
              "3": {
                "hanlo": "知",
                "poj": "chai"
              },
              "4": {
                "hanlo": "知",
                "poj": "chai"
              }
            }
          },
          {
            "id": "skh_n15_3",
            "pitch": 5,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "通",
              "poj": "thang"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "通",
                "poj": "thang"
              },
              "2": {
                "hanlo": "通",
                "poj": "thang"
              },
              "3": {
                "hanlo": "通",
                "poj": "thang"
              },
              "4": {
                "hanlo": "通",
                "poj": "thang"
              }
            }
          },
          {
            "id": "skh_n15_4",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "lyric": {
              "hanlo": "也",
              "poj": "iā"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "也",
                "poj": "iā"
              },
              "2": {
                "hanlo": "也",
                "poj": "iā"
              },
              "3": {
                "hanlo": "也",
                "poj": "iā"
              },
              "4": {
                "hanlo": "也",
                "poj": "iā"
              }
            }
          },
          {
            "id": "skh_n15_5",
            "pitch": 6,
            "octave": -1,
            "duration": 0.5,
            "lyric": {
              "hanlo": "不",
              "poj": "m̄-"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "不",
                "poj": "m̄-"
              },
              "2": {
                "hanlo": "不",
                "poj": "m̄-"
              },
              "3": {
                "hanlo": "不",
                "poj": "m̄-"
              },
              "4": {
                "hanlo": "不",
                "poj": "m̄-"
              }
            }
          }
        ]
      },
      {
        "id": "skh_m16",
        "measureNumber": 16,
        "chord": "Eb",
        "notes": [
          {
            "id": "skh_n16_1",
            "pitch": 1,
            "octave": 0,
            "duration": 4,
            "lyric": {
              "hanlo": "通。",
              "poj": "thang."
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "通。",
                "poj": "thang."
              },
              "2": {
                "hanlo": "通。",
                "poj": "thang."
              },
              "3": {
                "hanlo": "通。",
                "poj": "thang."
              },
              "4": {
                "hanlo": "通。",
                "poj": "thang."
              }
            }
          }
        ]
      },
      {
        "id": "skh_m17",
        "measureNumber": 17,
        "chord": "Bb7",
        "notes": [
          {
            "id": "skh_n17_1",
            "pitch": 5,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "叨",
              "poj": "Toh"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "叨",
                "poj": "Toh"
              },
              "2": {
                "hanlo": "叨",
                "poj": "Toh"
              },
              "3": {
                "hanlo": "叨",
                "poj": "Toh"
              },
              "4": {
                "hanlo": "叨",
                "poj": "Toh"
              }
            }
          },
          {
            "id": "skh_n17_2",
            "pitch": 2,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "slurToNext": true,
            "lyric": {
              "hanlo": "一",
              "poj": "chi̍t"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "一",
                "poj": "chi̍t"
              },
              "2": {
                "hanlo": "一",
                "poj": "chi̍t"
              },
              "3": {
                "hanlo": "一",
                "poj": "chi̍t"
              },
              "4": {
                "hanlo": "一",
                "poj": "chi̍t"
              }
            }
          },
          {
            "id": "skh_n17_3",
            "pitch": 3,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n17_4",
            "pitch": 5,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "項？",
              "poj": "hāng?"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "項？",
                "poj": "hāng?"
              },
              "2": {
                "hanlo": "項？",
                "poj": "hāng?"
              },
              "3": {
                "hanlo": "項？",
                "poj": "hāng?"
              },
              "4": {
                "hanlo": "項？",
                "poj": "hāng?"
              }
            }
          },
          {
            "id": "skh_n17_5",
            "pitch": 0,
            "octave": 0,
            "duration": 1,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m18",
        "measureNumber": 18,
        "chord": "Eb",
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n18_1",
            "pitch": 5,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "lyric": {
              "hanlo": "敢",
              "poj": "Kám"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "敢",
                "poj": "Kám"
              },
              "2": {
                "hanlo": "敢",
                "poj": "Kám"
              },
              "3": {
                "hanlo": "敢",
                "poj": "Kám"
              },
              "4": {
                "hanlo": "敢",
                "poj": "Kám"
              }
            }
          },
          {
            "id": "skh_n18_2",
            "pitch": 5,
            "octave": 0,
            "duration": 0.25,
            "lyric": {
              "hanlo": "也",
              "poj": "iā"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "也",
                "poj": "iā"
              },
              "2": {
                "hanlo": "也",
                "poj": "iā"
              },
              "3": {
                "hanlo": "也",
                "poj": "iā"
              },
              "4": {
                "hanlo": "也",
                "poj": "iā"
              }
            }
          },
          {
            "id": "skh_n18_3",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "lyric": {
              "hanlo": "有",
              "poj": "ū"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "有",
                "poj": "ū"
              },
              "2": {
                "hanlo": "有",
                "poj": "ū"
              },
              "3": {
                "hanlo": "有",
                "poj": "ū"
              },
              "4": {
                "hanlo": "有",
                "poj": "ū"
              }
            }
          },
          {
            "id": "skh_n18_4",
            "pitch": 3,
            "octave": 0,
            "duration": 0.5,
            "lyric": {
              "hanlo": "別",
              "poj": "pa̍t-"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "別",
                "poj": "pa̍t-"
              },
              "2": {
                "hanlo": "別",
                "poj": "pa̍t-"
              },
              "3": {
                "hanlo": "別",
                "poj": "pa̍t-"
              },
              "4": {
                "hanlo": "別",
                "poj": "pa̍t-"
              }
            }
          },
          {
            "id": "skh_n18_5",
            "pitch": 2,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "項？",
              "poj": "hāng?"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "項？",
                "poj": "hāng?"
              },
              "2": {
                "hanlo": "項？",
                "poj": "hāng?"
              },
              "3": {
                "hanlo": "項？",
                "poj": "hāng?"
              },
              "4": {
                "hanlo": "項？",
                "poj": "hāng?"
              }
            }
          },
          {
            "id": "skh_n18_6",
            "pitch": 0,
            "octave": 0,
            "duration": 1,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m19",
        "measureNumber": 19,
        "chord": "Ab",
        "notes": [
          {
            "id": "skh_n19_1",
            "pitch": 1,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "肉",
              "poj": "Bah"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "肉",
                "poj": "Bah"
              },
              "2": {
                "hanlo": "肉",
                "poj": "Bah"
              },
              "3": {
                "hanlo": "肉",
                "poj": "Bah"
              },
              "4": {
                "hanlo": "肉",
                "poj": "Bah"
              }
            }
          },
          {
            "id": "skh_n19_2",
            "pitch": 6,
            "octave": -1,
            "duration": 0.5,
            "slurToNext": true,
            "lyric": {
              "hanlo": "放",
              "poj": "pàng"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "放",
                "poj": "pàng"
              },
              "2": {
                "hanlo": "放",
                "poj": "pàng"
              },
              "3": {
                "hanlo": "放",
                "poj": "pàng"
              },
              "4": {
                "hanlo": "放",
                "poj": "pàng"
              }
            }
          },
          {
            "id": "skh_n19_3",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n19_4",
            "pitch": 5,
            "octave": -1,
            "duration": 1.5,
            "isDotted": true,
            "lyric": {
              "hanlo": "笑，",
              "poj": "chhiò,"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "笑，",
                "poj": "chhiò,"
              },
              "2": {
                "hanlo": "笑，",
                "poj": "chhiò,"
              },
              "3": {
                "hanlo": "笑，",
                "poj": "chhiò,"
              },
              "4": {
                "hanlo": "笑，",
                "poj": "chhiò,"
              }
            }
          },
          {
            "id": "skh_n19_5",
            "pitch": 6,
            "octave": -1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m20",
        "measureNumber": 20,
        "chord": "Eb",
        "notes": [
          {
            "id": "skh_n20_1",
            "pitch": 5,
            "octave": 0,
            "duration": 1,
            "lyric": {
              "hanlo": "目",
              "poj": "Ba̍k-"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "目",
                "poj": "Ba̍k-"
              },
              "2": {
                "hanlo": "目",
                "poj": "Ba̍k-"
              },
              "3": {
                "hanlo": "目",
                "poj": "Ba̍k-"
              },
              "4": {
                "hanlo": "目",
                "poj": "Ba̍k-"
              }
            }
          },
          {
            "id": "skh_n20_2",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "slurToNext": true,
            "lyric": {
              "hanlo": "睭",
              "poj": "chiu"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "睭",
                "poj": "chiu"
              },
              "2": {
                "hanlo": "睭",
                "poj": "chiu"
              },
              "3": {
                "hanlo": "睭",
                "poj": "chiu"
              },
              "4": {
                "hanlo": "睭",
                "poj": "chiu"
              }
            }
          },
          {
            "id": "skh_n20_3",
            "pitch": 3,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n20_4",
            "pitch": 1,
            "octave": 0,
            "duration": 2,
            "lyric": {
              "hanlo": "降，",
              "poj": "kàng,"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "降，",
                "poj": "kàng,"
              },
              "2": {
                "hanlo": "降，",
                "poj": "kàng,"
              },
              "3": {
                "hanlo": "降，",
                "poj": "kàng,"
              },
              "4": {
                "hanlo": "降，",
                "poj": "kàng,"
              }
            }
          }
        ]
      },
      {
        "id": "skh_m21",
        "measureNumber": 21,
        "chord": "Fm",
        "notes": [
          {
            "id": "skh_n21_1",
            "pitch": 5,
            "octave": -1,
            "duration": 1.5,
            "isDotted": true,
            "lyric": {
              "hanlo": "你",
              "poj": "Lí"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "你",
                "poj": "Lí"
              },
              "2": {
                "hanlo": "你",
                "poj": "Lí"
              },
              "3": {
                "hanlo": "你",
                "poj": "Lí"
              },
              "4": {
                "hanlo": "你",
                "poj": "Lí"
              }
            }
          },
          {
            "id": "skh_n21_2",
            "pitch": 5,
            "octave": -1,
            "duration": 0.5,
            "lyric": {
              "hanlo": "我",
              "poj": "góa"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "我",
                "poj": "góa"
              },
              "2": {
                "hanlo": "我",
                "poj": "góa"
              },
              "3": {
                "hanlo": "我",
                "poj": "góa"
              },
              "4": {
                "hanlo": "我",
                "poj": "góa"
              }
            }
          },
          {
            "id": "skh_n21_3",
            "pitch": 6,
            "octave": -1,
            "duration": 1,
            "lyric": {
              "hanlo": "戀",
              "poj": "loân"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "戀",
                "poj": "loân"
              },
              "2": {
                "hanlo": "戀",
                "poj": "loân"
              },
              "3": {
                "hanlo": "戀",
                "poj": "loân"
              },
              "4": {
                "hanlo": "戀",
                "poj": "loân"
              }
            }
          },
          {
            "id": "skh_n21_4",
            "pitch": 6,
            "octave": -1,
            "duration": 1,
            "lyric": {
              "hanlo": "花",
              "poj": "hoe"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "花",
                "poj": "hoe"
              },
              "2": {
                "hanlo": "花",
                "poj": "hoe"
              },
              "3": {
                "hanlo": "花",
                "poj": "hoe"
              },
              "4": {
                "hanlo": "花",
                "poj": "hoe"
              }
            }
          }
        ]
      },
      {
        "id": "skh_m22",
        "measureNumber": 22,
        "chord": "Bb7",
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n22_1",
            "pitch": 5,
            "octave": 0,
            "duration": 1.5,
            "isDotted": true,
            "lyric": {
              "hanlo": "朱",
              "poj": "chu"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "朱",
                "poj": "chu"
              },
              "2": {
                "hanlo": "朱",
                "poj": "chu"
              },
              "3": {
                "hanlo": "朱",
                "poj": "chu"
              },
              "4": {
                "hanlo": "朱",
                "poj": "chu"
              }
            }
          },
          {
            "id": "skh_n22_2",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n22_3",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "slurToNext": true,
            "lyric": {
              "hanlo": "朱",
              "poj": "chu"
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "朱",
                "poj": "chu"
              },
              "2": {
                "hanlo": "朱",
                "poj": "chu"
              },
              "3": {
                "hanlo": "朱",
                "poj": "chu"
              },
              "4": {
                "hanlo": "朱",
                "poj": "chu"
              }
            }
          },
          {
            "id": "skh_n22_4",
            "pitch": 3,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n22_5",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n22_6",
            "pitch": 3,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m23",
        "measureNumber": 23,
        "chord": "Eb",
        "barlineType": "double",
        "notes": [
          {
            "id": "skh_n23_1",
            "pitch": 5,
            "octave": 0,
            "duration": 4,
            "lyric": {
              "hanlo": "紅。",
              "poj": "hông."
            },
            "lyricsByVerse": {
              "1": {
                "hanlo": "紅。",
                "poj": "hông."
              },
              "2": {
                "hanlo": "紅。",
                "poj": "hông."
              },
              "3": {
                "hanlo": "紅。",
                "poj": "hông."
              },
              "4": {
                "hanlo": "紅。",
                "poj": "hông."
              }
            }
          }
        ]
      },
      {
        "id": "skh_m24",
        "measureNumber": 24,
        "chord": "Eb",
        "voltaEnding": [
          1,
          3
        ],
        "notes": [
          {
            "id": "skh_n24_1",
            "pitch": 5,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n24_2",
            "pitch": 6,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n24_3",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n24_4",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n24_5",
            "pitch": 5,
            "octave": 0,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m25",
        "measureNumber": 25,
        "chord": "Eb",
        "voltaEnding": [
          1,
          3
        ],
        "notes": [
          {
            "id": "skh_n25_1",
            "pitch": 5,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n25_2",
            "pitch": 6,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n25_3",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n25_4",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n25_5",
            "pitch": 5,
            "octave": 0,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m26",
        "measureNumber": 26,
        "chord": "Bb7",
        "voltaEnding": [
          1,
          3
        ],
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n26_1",
            "pitch": 2,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n26_2",
            "pitch": 3,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n26_3",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n26_4",
            "pitch": 3,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n26_5",
            "pitch": 2,
            "octave": 0,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m27",
        "measureNumber": 27,
        "chord": "Bb7",
        "voltaEnding": [
          1,
          3
        ],
        "notes": [
          {
            "id": "skh_n27_1",
            "pitch": 2,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n27_2",
            "pitch": 3,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n27_3",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n27_4",
            "pitch": 3,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n27_5",
            "pitch": 2,
            "octave": 0,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m28",
        "measureNumber": 28,
        "chord": "Eb",
        "voltaEnding": [
          1,
          3
        ],
        "notes": [
          {
            "id": "skh_n28_1",
            "pitch": 2,
            "octave": 0,
            "duration": 0.75,
            "isDotted": true,
            "slurToNext": true,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n28_2",
            "pitch": 5,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n28_3",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n28_4",
            "pitch": 3,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n28_5",
            "pitch": 2,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n28_6",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n28_7",
            "pitch": 6,
            "octave": -1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n28_8",
            "pitch": 5,
            "octave": -1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m29",
        "measureNumber": 29,
        "chord": "Eb",
        "voltaEnding": [
          1,
          3
        ],
        "barlineType": "repeat_end",
        "notes": [
          {
            "id": "skh_n29_1",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n29_2",
            "pitch": 0,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n29_3",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n29_4",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n29_5",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n29_6",
            "pitch": 0,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n29_7",
            "pitch": 0,
            "octave": 0,
            "duration": 1,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m30",
        "measureNumber": 30,
        "chord": "Eb",
        "voltaEnding": [
          2
        ],
        "barlineType": "repeat_end",
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n30_1",
            "pitch": 0,
            "octave": 0,
            "duration": 4,
            "annotation": "8Bars",
            "lyric": {
              "hanlo": "8Bars",
              "poj": "8Bars"
            }
          }
        ]
      },
      {
        "id": "skh_m31",
        "measureNumber": 31,
        "chord": "Eb",
        "section": "Coda",
        "voltaEnding": [
          4
        ],
        "notes": [
          {
            "id": "skh_n31_1",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_2",
            "pitch": 1,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_3",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_4",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_5",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_6",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_7",
            "pitch": 5,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_8",
            "pitch": 3,
            "octave": 0,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_9",
            "pitch": 5,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n31_10",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m32",
        "measureNumber": 32,
        "chord": "Bb7",
        "voltaEnding": [
          4
        ],
        "notes": [
          {
            "id": "skh_n32_1",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n32_2",
            "pitch": 1,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n32_3",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n32_4",
            "pitch": 1,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n32_5",
            "pitch": 6,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n32_6",
            "pitch": 5,
            "octave": 0,
            "duration": 2,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m33",
        "measureNumber": 33,
        "chord": "Eb",
        "voltaEnding": [
          4
        ],
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n33_1",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_2",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_3",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_4",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_5",
            "pitch": 2,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_6",
            "pitch": 5,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_7",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_8",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_9",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_10",
            "pitch": 6,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_11",
            "pitch": 5,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n33_12",
            "pitch": 3,
            "octave": 1,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      },
      {
        "id": "skh_m34",
        "measureNumber": 34,
        "chord": "Eb",
        "voltaEnding": [
          4
        ],
        "barlineType": "end",
        "isLineBreak": true,
        "notes": [
          {
            "id": "skh_n34_1",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_2",
            "pitch": 6,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_3",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_4",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_5",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_6",
            "pitch": 5,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_7",
            "pitch": 3,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_8",
            "pitch": 2,
            "octave": 1,
            "duration": 0.25,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_9",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_10",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_11",
            "pitch": 1,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          },
          {
            "id": "skh_n34_12",
            "pitch": 0,
            "octave": 0,
            "duration": 0.5,
            "lyric": { "hanlo": "", "poj": "" }
          }
        ]
      }
    ]
  },
];

/**
 * Creates a brand-new empty/fresh song template ready for editing.
 */
export function createFreshSong(title = 'Untitled Song'): Song {
  const timestamp = Date.now();
  return {
    id: `song-${timestamp}`,
    title,
    subtitle: '',
    composer: '',
    lyricist: '',
    key: 'C',
    timeSignature: '4/4',
    bpm: 80,
    notesPerLine: 4,
    description: '',
    measures: [
      {
        id: `m-${timestamp}-1`,
        measureNumber: 1,
        chord: 'C',
        section: 'Verse 1',
        notes: [
          { id: `n-${timestamp}-1`, pitch: 1, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
          { id: `n-${timestamp}-2`, pitch: 2, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
          { id: `n-${timestamp}-3`, pitch: 3, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
          { id: `n-${timestamp}-4`, pitch: 5, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
        ],
      },
    ],
  };
}
