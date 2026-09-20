import type { Song, Measure, NumberedNotationNote } from '../types/song.ts';
import { getNoteVerseSyllable } from './taigiUtils.ts';

export type LyricScriptMode = 'hanlo' | 'poj' | 'both';

export interface LyricExportOptions {
  scriptMode?: LyricScriptMode; // 'hanlo' | 'poj' | 'both' (default 'hanlo')
  includeHeader?: boolean;      // Include Title, Subtitle, Composer, Lyricist (default true)
  includeSections?: boolean;    // Include [Verse], [Chorus] structural markers (default true)
  verseSelection?: 'all' | number; // 'all' (default) or specific verse index 1..5
}

export interface SongLyricExportSummary {
  totalVerses: number;
  totalSyllables: number;
  totalLines: number;
  hasLyrics: boolean;
  availableVerses: number[];
}

/**
 * Checks if a character is a Han (CJK Ideograph) character
 */
function isHanChar(char: string): boolean {
  if (!char) return false;
  const code = char.codePointAt(0) || 0;
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0x20000 && code <= 0x2a6df) ||
    (code >= 0xf900 && code <= 0xfaff)
  );
}

/**
 * Checks if a string consists entirely of punctuation, dashes, or spacing symbols
 */
function isPunctuationOnly(str: string): boolean {
  if (!str) return false;
  const trimmed = str.trim();
  if (!trimmed) return true;
  return /^[，。！？、；：""''「」『』(),.!?;:\s—…\n\r↵\-]+$/.test(trimmed);
}

/**
 * Clean syllable string removing control characters or line break symbols
 */
function cleanSyllable(raw?: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\r\n↵]+/g, '')
    .trim();
}

/**
 * Append a Hanlo syllable token to an existing line with proper spacing.
 * Han characters naturally concatenate without spaces.
 * Romanized tokens or Hanlo words (e.g., '阮' + 'ê') receive a space if neither has hyphens.
 */
function appendHanloToken(currentLine: string, token: string): string {
  const clean = cleanSyllable(token);
  if (!clean || clean === '—') return currentLine;
  if (!currentLine) return clean;

  const lastChar = currentLine.slice(-1);
  const firstChar = clean.charAt(0);

  // If token is or starts with punctuation, attach directly to the previous token
  if (/^[，。！？、；：""''「」『』(),.!?;:]/.test(firstChar)) {
    return `${currentLine.trimEnd()}${clean}`;
  }

  // If joined with hyphens
  if (currentLine.endsWith('-') || currentLine.endsWith('--') || clean.startsWith('-') || clean.startsWith('--')) {
    return `${currentLine}${clean}`;
  }

  // If both are Han characters, concatenate directly without space
  if (isHanChar(lastChar) && isHanChar(firstChar)) {
    return `${currentLine}${clean}`;
  }

  // Mixed Han and Roman or Roman and Roman: add space
  return `${currentLine} ${clean}`;
}

/**
 * Append a POJ (Romanization) syllable token to an existing line with proper hyphenation and spacing.
 */
function appendPojToken(currentLine: string, token: string): string {
  const clean = cleanSyllable(token);
  if (!clean || clean === '—') return currentLine;
  if (!currentLine) return clean;

  const firstChar = clean.charAt(0);

  // If token is or starts with punctuation, attach directly to previous word
  if (/^[，。！？、；：""''「」『』(),.!?;:]/.test(firstChar)) {
    return `${currentLine.trimEnd()}${clean}`;
  }

  // If hyphenated compound word
  if (currentLine.endsWith('-') || currentLine.endsWith('--') || currentLine.endsWith('~') || clean.startsWith('-') || clean.startsWith('--')) {
    return `${currentLine}${clean}`;
  }

  // Standard Roman word separation
  return `${currentLine} ${clean}`;
}

/**
 * Identify all verse indices (1..5) present in the song.
 */
export function getSongAvailableVerses(song: Song): number[] {
  const verses = new Set<number>([1]);
  if (typeof song.verseCount === 'number' && song.verseCount > 1) {
    for (let i = 1; i <= Math.min(song.verseCount, 5); i++) {
      verses.add(i);
    }
  }

  for (const m of song.measures) {
    for (const n of m.notes) {
      if (n.lyricsByVerse) {
        for (const k of Object.keys(n.lyricsByVerse)) {
          const vNum = parseInt(k, 10);
          if (!isNaN(vNum) && vNum >= 1 && vNum <= 5) {
            const syl = n.lyricsByVerse[vNum];
            if ((syl.hanlo && syl.hanlo.trim()) || (syl.poj && syl.poj.trim())) {
              verses.add(vNum);
            }
          }
        }
      }
    }
  }

  return Array.from(verses).sort((a, b) => a - b);
}

export interface ExtractedVerseLine {
  hanlo: string;
  poj: string;
  section?: string;
  measureNumber: number;
}

/**
 * Extract structured lines for a specific verse index.
 */
export function extractVerseLines(song: Song, verseIndex: number): ExtractedVerseLine[] {
  const lines: ExtractedVerseLine[] = [];
  let currentHanlo = '';
  let currentPoj = '';
  let currentSection = '';
  let currentStartMeasure = 1;

  const flushLine = () => {
    const trimmedH = currentHanlo.trim();
    const trimmedP = currentPoj.trim();
    if (trimmedH || trimmedP) {
      lines.push({
        hanlo: trimmedH,
        poj: trimmedP,
        section: currentSection || undefined,
        measureNumber: currentStartMeasure,
      });
      currentHanlo = '';
      currentPoj = '';
    }
  };

  for (const m of song.measures) {
    // If measure defines a new musical section (e.g. Verse, Chorus, Bridge, etc.)
    const mSection = m.section?.trim();
    if (mSection && mSection.toLowerCase() !== 'prelude' && mSection !== currentSection) {
      flushLine();
      currentSection = mSection;
      currentStartMeasure = m.measureNumber;
    }

    let hadLyricInMeasure = false;

    for (const n of m.notes) {
      const syl = getNoteVerseSyllable(n, verseIndex);
      const rawH = syl.hanlo ?? syl.hanji ?? syl.custom ?? '';
      const rawP = syl.poj ?? syl.tl ?? '';

      // Check if note contains an explicit line break
      const hasBreakInLyric = /[\r\n↵]/.test(rawH) || /[\r\n↵]/.test(rawP);

      const cleanH = cleanSyllable(rawH);
      const cleanP = cleanSyllable(rawP);

      if (cleanH || cleanP) {
        if (!currentHanlo && !currentPoj) {
          currentStartMeasure = m.measureNumber;
        }
        currentHanlo = appendHanloToken(currentHanlo, cleanH);
        currentPoj = appendPojToken(currentPoj, cleanP);
        hadLyricInMeasure = true;
      }

      if (hasBreakInLyric) {
        flushLine();
      }
    }

    // If measure marks line break, flush any accumulated line
    if (m.isLineBreak) {
      flushLine();
    }
  }

  // Flush any remaining line
  flushLine();

  return lines;
}

/**
 * Analyze a song's lyrics statistics.
 */
export function getSongLyricsSummary(song: Song): SongLyricExportSummary {
  const availableVerses = getSongAvailableVerses(song);
  let totalSyllables = 0;
  let totalLines = 0;

  for (const v of availableVerses) {
    const lines = extractVerseLines(song, v);
    totalLines += lines.length;
    for (const line of lines) {
      if (line.hanlo) {
        // Count syllables in Hanlo: Han characters + space-delimited words
        const tokens = line.hanlo.split(/\s+/).filter(Boolean);
        for (const t of tokens) {
          let hanCount = 0;
          for (let i = 0; i < t.length; i++) {
            if (isHanChar(t[i])) hanCount++;
          }
          totalSyllables += Math.max(1, hanCount);
        }
      } else if (line.poj) {
        const pTokens = line.poj.split(/[\s-]+/).filter(t => t && !isPunctuationOnly(t));
        totalSyllables += pTokens.length;
      }
    }
  }

  return {
    totalVerses: availableVerses.length,
    totalSyllables,
    totalLines,
    hasLyrics: totalSyllables > 0,
    availableVerses,
  };
}

/**
 * Export song lyrics to clean, formatted text format.
 */
export function exportSongLyrics(song: Song, options: LyricExportOptions = {}): string {
  const {
    scriptMode = 'hanlo',
    includeHeader = true,
    includeSections = true,
    verseSelection = 'all',
  } = options;

  const output: string[] = [];

  // 1. Optional Song Header
  if (includeHeader) {
    if (song.title) {
      output.push(song.title);
    }
    if (song.subtitle) {
      output.push(song.subtitle);
    }
    const metaRow: string[] = [];
    if (song.lyricist) metaRow.push(`Lyricist: ${song.lyricist}`);
    if (song.composer) metaRow.push(`Composer: ${song.composer}`);
    if (song.notator) metaRow.push(`Notator: ${song.notator}`);
    if (metaRow.length > 0) {
      output.push(metaRow.join('  |  '));
    }
    output.push(`Key: 1=${song.key}  |  ${song.timeSignature}  |  ${song.bpm} BPM`);
    output.push(''); // Blank separator line
  }

  const availableVerses = getSongAvailableVerses(song);
  const versesToExport =
    verseSelection === 'all'
      ? availableVerses
      : availableVerses.filter(v => v === verseSelection);

  if (versesToExport.length === 0) {
    versesToExport.push(1);
  }

  const isMultiVerse = versesToExport.length > 1;

  for (let idx = 0; idx < versesToExport.length; idx++) {
    const vIndex = versesToExport[idx];
    const lines = extractVerseLines(song, vIndex);

    if (lines.length === 0) continue;

    // Add Verse header if exporting multiple verses
    if (isMultiVerse) {
      output.push(`[Verse ${vIndex}]`);
    }

    let lastSection = '';

    for (let lIdx = 0; lIdx < lines.length; lIdx++) {
      const line = lines[lIdx];

      // Add section marker if section changed
      if (includeSections && line.section && line.section !== lastSection) {
        if (!isMultiVerse || line.section.toLowerCase() !== `verse ${vIndex}`.toLowerCase()) {
          if (output.length > 0 && output[output.length - 1] !== '') {
            output.push('');
          }
          output.push(`[${line.section}]`);
        }
        lastSection = line.section;
      }

      if (scriptMode === 'hanlo') {
        const text = line.hanlo || line.poj;
        if (text) output.push(text);
      } else if (scriptMode === 'poj') {
        const text = line.poj || line.hanlo;
        if (text) output.push(text);
      } else {
        // Dual mode: paired Hanlo + POJ
        if (line.hanlo && line.poj && line.hanlo !== line.poj) {
          output.push(line.hanlo);
          output.push(line.poj);
          // Add rhythmic breathing space between dual couplets
          if (lIdx < lines.length - 1) {
            output.push('');
          }
        } else {
          output.push(line.hanlo || line.poj);
        }
      }
    }

    // Blank separator line between verses
    if (idx < versesToExport.length - 1) {
      output.push('');
    }
  }

  if (output.length === 0 || (includeHeader && output.length <= 3)) {
    output.push('(No lyrics in this score)');
  }

  return output.join('\n').trim() + '\n';
}
