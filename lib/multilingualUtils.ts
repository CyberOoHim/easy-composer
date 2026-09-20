import type { SongLanguage, LyricSyllable, VerseDisplayOption } from '../types/song.ts';
import { splitTaigiLyricSyllables, isPunctuationOrSpacer } from './taigiUtils.ts';

export interface LanguageConfig {
  id: SongLanguage;
  name: string;
  nativeName: string;
  badge: string;
  isDefault: boolean;
  primaryFieldLabel: string;
  secondaryFieldLabel: string;
  primaryPlaceholder: string;
  secondaryPlaceholder: string;
  supportsDualDisplay: boolean;
  sampleLyrics: string;
  sampleDualLyrics?: { primary: string; secondary: string };
}

export const LANGUAGE_CONFIGS: Record<SongLanguage, LanguageConfig> = {
  taigi: {
    id: 'taigi',
    name: 'Taiwanese Hokkien',
    nativeName: '台語 (Tâi-gí)',
    badge: '台語',
    isDefault: true,
    primaryFieldLabel: 'Hàn-lô (漢羅)',
    secondaryFieldLabel: 'Romanization (POJ / 白話字)',
    primaryPlaceholder: '漢羅 (e.g. 望春風)',
    secondaryPlaceholder: 'Roman (e.g. Bāng chhun-hong)',
    supportsDualDisplay: true,
    sampleLyrics: '獨夜無伴守燈下 清風對面吹 十七八歲未出嫁 見著少年家',
    sampleDualLyrics: {
      primary: '獨夜無伴守燈下 清風對面吹',
      secondary: 'To̍k-iā bô-phōaⁿ siú teng-ē, chheng-hong tùi bīn chhoe',
    },
  },
  mandarin: {
    id: 'mandarin',
    name: 'Mandarin Chinese',
    nativeName: '華語 / 國語',
    badge: '華語',
    isDefault: false,
    primaryFieldLabel: 'Hanzi (漢字)',
    secondaryFieldLabel: 'Pinyin (漢語拼音)',
    primaryPlaceholder: '漢字 (e.g. 月亮代表我的心)',
    secondaryPlaceholder: 'Pinyin (e.g. yuè liàng dài biǎo)',
    supportsDualDisplay: true,
    sampleLyrics: '你問我愛你有多深 我愛你有幾分 我的情也真 我的愛也真 月亮代表我的心',
    sampleDualLyrics: {
      primary: '你問我愛你有多深 我愛你有幾分',
      secondary: 'nǐ wèn wǒ ài nǐ yǒu duō shēn, wǒ ài nǐ yǒu jǐ fēn',
    },
  },
  english: {
    id: 'english',
    name: 'English',
    nativeName: 'English',
    badge: 'EN',
    isDefault: false,
    primaryFieldLabel: 'Lyrics / Word',
    secondaryFieldLabel: 'Pronunciation / Alt',
    primaryPlaceholder: 'Lyrics (e.g. A-ma-zing grace)',
    secondaryPlaceholder: 'IPA / Translation (optional)',
    supportsDualDisplay: false,
    sampleLyrics: 'A-ma-zing grace, how sweet the sound, that saved a wretch like me!',
    sampleDualLyrics: {
      primary: 'A-ma-zing grace, how sweet the sound',
      secondary: 'How sweet the sound',
    },
  },
  japanese: {
    id: 'japanese',
    name: 'Japanese',
    nativeName: '日本語',
    badge: '日本語',
    isDefault: false,
    primaryFieldLabel: 'Kanji / Kana (歌詞)',
    secondaryFieldLabel: 'Furigana / Romaji (ふりがな)',
    primaryPlaceholder: '歌詞 (e.g. さくら さくら 桜)',
    secondaryPlaceholder: 'ふりがな (e.g. sakura)',
    supportsDualDisplay: true,
    sampleLyrics: 'さくら さくら 野山も里も 見わたす限り かすみか雲か 朝日ににほう',
    sampleDualLyrics: {
      primary: 'さくら さくら 野山も里も',
      secondary: 'sakura sakura noyama mo sato mo',
    },
  },
  multilingual: {
    id: 'multilingual',
    name: 'Multilingual',
    nativeName: '多語言 (Multilingual)',
    badge: 'Multi',
    isDefault: false,
    primaryFieldLabel: 'Primary Text',
    secondaryFieldLabel: 'Phonetic / Translation',
    primaryPlaceholder: 'Primary lyric line',
    secondaryPlaceholder: 'Phonetic or secondary translation',
    supportsDualDisplay: true,
    sampleLyrics: 'Music transcends all languages and borders.',
  },
};

export const LANGUAGE_OPTIONS: { id: SongLanguage; label: string; isDefault?: boolean }[] = [
  { id: 'taigi', label: '🇹🇼 台語 (Taigi / Taiwanese)', isDefault: true },
  { id: 'mandarin', label: '🇨🇳/🇹🇼 華語 (Mandarin Chinese)' },
  { id: 'english', label: '🇬🇧 English' },
  { id: 'japanese', label: '🇯🇵 日本語 (Japanese)' },
  { id: 'multilingual', label: '🌐 Multilingual (多語言)' },
];

/**
 * Universal Syllable Token for alignment and import
 */
export interface MultilingualLyricToken {
  text: string;           // Main text e.g. "A-", "望", "桜"
  phonetic?: string;      // Reading e.g. "wàng", "sa", "Bāng"
  translation?: string;
  isHyphenated?: boolean; // Hyphenated syllable continuation
  isWordEnd?: boolean;    // End of a word
  isPunctuation?: boolean;
}

/**
 * Tokenize English lyrics into syllables by hyphens and whitespace
 * e.g. "A-ma-zing grace, how sweet the sound"
 * -> [{ text: "A-", isHyphenated: true, isWordEnd: false }, { text: "ma-", ... }, { text: "zing", ... }, { text: "grace," ... }]
 */
export function splitEnglishLyricSyllables(text: string): MultilingualLyricToken[] {
  if (!text || !text.trim()) return [];
  const rawWords = text.trim().split(/\s+/).filter(Boolean);
  const tokens: MultilingualLyricToken[] = [];

  for (const word of rawWords) {
    if (word.includes('-') && !word.startsWith('-') && !word.endsWith('--')) {
      const parts = word.split('-');
      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        if (!part) continue;
        const isLastPart = i === parts.length - 1;
        tokens.push({
          text: isLastPart ? part : `${part}-`,
          isHyphenated: !isLastPart,
          isWordEnd: isLastPart,
          isPunctuation: isPunctuationOrSpacer(part),
        });
      }
    } else {
      tokens.push({
        text: word,
        isHyphenated: false,
        isWordEnd: true,
        isPunctuation: isPunctuationOrSpacer(word),
      });
    }
  }

  return tokens;
}

/**
 * Tokenize Mandarin lyrics:
 * Handles either paired syntax: "月(yuè) 亮(liàng)" or "月[yuè] 亮[liàng]"
 * or standalone Chinese characters / Hanzi.
 */
export function splitMandarinLyricSyllables(text: string): MultilingualLyricToken[] {
  if (!text || !text.trim()) return [];
  const tokens: MultilingualLyricToken[] = [];

  // Match bracketed pairs e.g. "月(yuè)", "月[yuè]", or single CJK character, or words
  const pairedRegex = /([\u4e00-\u9fa5\u3400-\u4dbf])\s*[\(\[]([^\)\]]+)[\)\]]/g;
  let hasPaired = false;

  // Quick check if input contains paired notations
  if (pairedRegex.test(text)) {
    hasPaired = true;
    pairedRegex.lastIndex = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pairedRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const interstitial = text.slice(lastIndex, match.index).trim();
        if (interstitial) {
          for (const char of interstitial) {
            if (/\s/.test(char)) continue;
            tokens.push({
              text: char,
              isPunctuation: isPunctuationOrSpacer(char),
            });
          }
        }
      }
      tokens.push({
        text: match[1],
        phonetic: match[2].trim(),
        isPunctuation: false,
      });
      lastIndex = pairedRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      const remainder = text.slice(lastIndex).trim();
      for (const char of remainder) {
        if (/\s/.test(char)) continue;
        tokens.push({
          text: char,
          isPunctuation: isPunctuationOrSpacer(char),
        });
      }
    }
    return tokens;
  }

  // Otherwise split by CJK characters, preserving Latin/Pinyin words as single tokens
  let currentLatin = '';
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const code = char.charCodeAt(0);
    const isCJK =
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x20000 && code <= 0x2a6df);

    if (isCJK) {
      if (currentLatin.trim()) {
        tokens.push({
          text: currentLatin.trim(),
          isPunctuation: isPunctuationOrSpacer(currentLatin.trim()),
        });
        currentLatin = '';
      }
      tokens.push({
        text: char,
        isPunctuation: false,
      });
    } else if (/\s/.test(char)) {
      if (currentLatin.trim()) {
        tokens.push({
          text: currentLatin.trim(),
          isPunctuation: isPunctuationOrSpacer(currentLatin.trim()),
        });
        currentLatin = '';
      }
    } else if (isPunctuationOrSpacer(char)) {
      if (currentLatin.trim()) {
        tokens.push({
          text: currentLatin.trim(),
          isPunctuation: isPunctuationOrSpacer(currentLatin.trim()),
        });
        currentLatin = '';
      }
      tokens.push({
        text: char,
        isPunctuation: true,
      });
    } else {
      currentLatin += char;
    }
  }

  if (currentLatin.trim()) {
    tokens.push({
      text: currentLatin.trim(),
      isPunctuation: isPunctuationOrSpacer(currentLatin.trim()),
    });
  }

  return tokens;
}

/**
 * Tokenize Japanese lyrics:
 * Handles ruby syntax e.g. "桜[さくら]" or "咲[さ]く",
 * and splits Hiragana/Katakana moras (binding small kana: ゃ, ゅ, ょ, ゎ, ぁ, ぃ, ぅ, ぇ, ぉ, っ to previous character).
 */
export function splitJapaneseLyricSyllables(text: string): MultilingualLyricToken[] {
  if (!text || !text.trim()) return [];
  const tokens: MultilingualLyricToken[] = [];

  // Check for ruby brackets: Kanji[Furigana] or Kanji(Furigana)
  const rubyRegex = /([\u4e00-\u9fa5\u3400-\u4dbf]+)\s*[\(\[]([^\)\]]+)[\)\]]/g;
  if (rubyRegex.test(text)) {
    rubyRegex.lastIndex = 0;
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = rubyRegex.exec(text)) !== null) {
      if (match.index > lastIndex) {
        const interstitial = text.slice(lastIndex, match.index);
        tokens.push(...splitJapaneseKanaMoras(interstitial));
      }
      tokens.push({
        text: match[1],
        phonetic: match[2].trim(),
        isPunctuation: false,
      });
      lastIndex = rubyRegex.lastIndex;
    }

    if (lastIndex < text.length) {
      tokens.push(...splitJapaneseKanaMoras(text.slice(lastIndex)));
    }
    return tokens;
  }

  return splitJapaneseKanaMoras(text);
}

const JAPANESE_SMALL_KANA = new Set(['ゃ', 'ゅ', 'ょ', 'ゎ', 'ぁ', 'ぃ', 'ぅ', 'ぇ', 'ぉ', 'っ', 'ャ', 'ュ', 'ョ', 'ヮ', 'ァ', 'ィ', 'ゥ', 'ェ', 'ォ', 'ッ', 'ー']);

function splitJapaneseKanaMoras(text: string): MultilingualLyricToken[] {
  const tokens: MultilingualLyricToken[] = [];
  let currentLatin = '';

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = i + 1 < text.length ? text[i + 1] : '';

    if (/\s/.test(char)) {
      if (currentLatin.trim()) {
        tokens.push({ text: currentLatin.trim(), isPunctuation: false });
        currentLatin = '';
      }
      continue;
    }

    if (isPunctuationOrSpacer(char)) {
      if (currentLatin.trim()) {
        tokens.push({ text: currentLatin.trim(), isPunctuation: false });
        currentLatin = '';
      }
      tokens.push({ text: char, isPunctuation: true });
      continue;
    }

    // Japanese Hiragana: 3040-309F, Katakana: 30A0-30FF, CJK Kanji: 4E00-9FFF
    const code = char.charCodeAt(0);
    const isKanaOrKanji =
      (code >= 0x3040 && code <= 0x309f) ||
      (code >= 0x30a0 && code <= 0x30ff) ||
      (code >= 0x4e00 && code <= 0x9fff);

    if (isKanaOrKanji) {
      if (currentLatin.trim()) {
        tokens.push({ text: currentLatin.trim(), isPunctuation: false });
        currentLatin = '';
      }

      // Check if next character is small kana (e.g. し + ょ = しょ, き + ゃ = きゃ, っ)
      if (nextChar && JAPANESE_SMALL_KANA.has(nextChar)) {
        tokens.push({
          text: char + nextChar,
          isPunctuation: false,
        });
        i++; // skip combined small kana
      } else {
        tokens.push({
          text: char,
          isPunctuation: false,
        });
      }
    } else {
      currentLatin += char;
    }
  }

  if (currentLatin.trim()) {
    tokens.push({ text: currentLatin.trim(), isPunctuation: false });
  }

  return tokens;
}

/**
 * Universal tokenizer supporting all 4 languages with Taigi as standard default
 */
export function splitMultilingualLyrics(
  text: string,
  language: SongLanguage = 'taigi'
): MultilingualLyricToken[] {
  if (!text || !text.trim()) return [];

  switch (language) {
    case 'english':
      return splitEnglishLyricSyllables(text);
    case 'mandarin':
      return splitMandarinLyricSyllables(text);
    case 'japanese':
      return splitJapaneseLyricSyllables(text);
    case 'taigi':
    default: {
      const taigiStrings = splitTaigiLyricSyllables(text);
      return taigiStrings.map(s => ({
        text: s,
        isHyphenated: s.endsWith('-'),
        isPunctuation: isPunctuationOrSpacer(s),
      }));
    }
  }
}

/**
 * Strips tone diacritics and marks from Pinyin and Romanization for fuzzy search
 * e.g. "wàng" -> "wang", "tiānmìmì" -> "tianmimi", "chheng-hong" -> "chheng hong"
 */
export function stripToneDiacritics(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove combining diacritical marks
    .replace(/[ⁿ]/g, '')
    .replace(/[-_]/g, ' ')
    .trim();
}

/**
 * Lightweight Hiragana / Katakana / Romaji equivalence map for Japanese fuzzy search
 */
const KANA_TO_ROMAJI_MAP: Record<string, string> = {
  'あ': 'a', 'い': 'i', 'う': 'u', 'え': 'e', 'お': 'o',
  'か': 'ka', 'き': 'ki', 'く': 'ku', 'け': 'ke', 'こ': 'ko',
  'さ': 'sa', 'し': 'shi', 'す': 'su', 'せ': 'se', 'そ': 'so',
  'た': 'ta', 'ち': 'chi', 'つ': 'tsu', 'て': 'te', 'と': 'to',
  'な': 'na', 'に': 'ni', 'ぬ': 'nu', 'ね': 'ne', 'の': 'no',
  'は': 'ha', 'ひ': 'hi', 'ふ': 'fu', 'へ': 'he', 'ほ': 'ho',
  'ま': 'ma', 'み': 'mi', 'む': 'mu', 'め': 'me', 'も': 'mo',
  'や': 'ya', 'ゆ': 'yu', 'よ': 'yo',
  'ら': 'ra', 'り': 'ri', 'る': 'ru', 'れ': 're', 'ろ': 'ro',
  'わ': 'wa', 'を': 'o', 'ん': 'n',
  'が': 'ga', 'ぎ': 'gi', 'ぐ': 'gu', 'げ': 'ge', 'ご': 'go',
  'ざ': 'za', 'じ': 'ji', 'ず': 'zu', 'ぜ': 'ze', 'ぞ': 'zo',
  'だ': 'da', 'ぢ': 'ji', 'づ': 'zu', 'で': 'de', 'ど': 'do',
  'ば': 'ba', 'び': 'bi', 'ぶ': 'bu', 'べ': 'be', 'ぼ': 'bo',
  'ぱ': 'pa', 'ぴ': 'pi', 'ぷ': 'pu', 'ぺ': 'pe', 'ぽ': 'po',
  // Common Katakana matches
  'ア': 'a', 'イ': 'i', 'ウ': 'u', 'エ': 'e', 'オ': 'o',
  'カ': 'ka', 'キ': 'ki', 'ク': 'ku', 'ケ': 'ke', 'コ': 'ko',
  'サ': 'sa', 'シ': 'shi', 'ス': 'su', 'セ': 'se', 'ソ': 'so',
  'タ': 'ta', 'チ': 'chi', 'ツ': 'tsu', 'テ': 'te', 'ト': 'to',
  'ナ': 'na', 'ニ': 'ni', 'ヌ': 'nu', 'ネ': 'ne', 'ノ': 'no',
  'ハ': 'ha', 'ヒ': 'hi', 'フ': 'fu', 'ヘ': 'he', 'ホ': 'ho',
  'マ': 'ma', 'ミ': 'mi', 'ム': 'mu', 'メ': 'me', 'モ': 'mo',
  'ヤ': 'ya', 'ユ': 'yu', 'ヨ': 'yo',
  'ラ': 'ra', 'リ': 'ri', 'ル': 'ru', 'レ': 're', 'ロ': 'ro',
  'ワ': 'wa', 'ヲ': 'o', 'ン': 'n',
};

export function convertKanaToRomaji(kana: string): string {
  if (!kana) return '';
  let out = '';
  for (let i = 0; i < kana.length; i++) {
    const char = kana[i];
    out += KANA_TO_ROMAJI_MAP[char] || char;
  }
  return out;
}

/**
 * Cross-script search matcher supporting:
 * - Taigi (POJ diacritic stripping + Hanlo)
 * - Mandarin (Tone-insensitive Pinyin + Hanzi)
 * - English (Case-insensitive + punctuation stripped)
 * - Japanese (Kana <-> Romaji equivalence + Kanji)
 */
export function matchesLyricSearch(
  textToSearch: string,
  query: string,
  language: SongLanguage = 'taigi'
): boolean {
  if (!textToSearch || !query) return false;
  const cleanQ = query.trim().toLowerCase();
  const cleanText = textToSearch.toLowerCase();

  // 1. Direct substring match
  if (cleanText.includes(cleanQ)) return true;

  // 2. Diacritic-stripped match (for Taigi POJ, French/English accents, Mandarin Pinyin)
  const strippedText = stripToneDiacritics(cleanText);
  const strippedQ = stripToneDiacritics(cleanQ);
  if (strippedText.includes(strippedQ)) return true;

  // 3. Japanese cross-script Romaji <-> Kana match
  if (language === 'japanese' || /[\u3040-\u30ff]/.test(textToSearch) || /^[a-z]+$/i.test(query)) {
    const romajiText = convertKanaToRomaji(textToSearch).toLowerCase();
    if (romajiText.includes(cleanQ) || romajiText.includes(strippedQ)) return true;
  }

  return false;
}

/**
 * Normalized lyric extraction for rendering notes across languages
 */
export function getNormalizedLyricDisplay(
  lyric: LyricSyllable | undefined,
  language: SongLanguage = 'taigi'
): { primary: string; secondary: string; isHyphenated: boolean } {
  if (!lyric) return { primary: '', secondary: '', isHyphenated: false };

  const rawPrimary = lyric.text || lyric.hanlo || lyric.hanji || lyric.custom || '';
  const rawSecondary = lyric.phonetic || lyric.poj || lyric.tl || '';
  const isHyphenated = Boolean(lyric.isHyphenated || rawPrimary.endsWith('-') || rawSecondary.endsWith('-'));

  if (language === 'english') {
    // English primary is the word/syllable; secondary is blank unless explicitly provided
    return {
      primary: rawPrimary || rawSecondary,
      secondary: rawPrimary && rawSecondary && rawPrimary !== rawSecondary ? rawSecondary : '',
      isHyphenated,
    };
  }

  if (language === 'mandarin') {
    // Mandarin: primary is Hanzi, secondary is Pinyin
    return {
      primary: rawPrimary,
      secondary: rawSecondary,
      isHyphenated: false,
    };
  }

  if (language === 'japanese') {
    // Japanese: primary is Kanji/Kana, secondary is Furigana
    return {
      primary: rawPrimary,
      secondary: rawSecondary,
      isHyphenated: false,
    };
  }

  // Default: Taigi
  return {
    primary: rawPrimary,
    secondary: rawSecondary,
    isHyphenated,
  };
}
