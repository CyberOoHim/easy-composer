import type {
  ArticulationType,
  BarlineType,
  InstrumentType,
  LyricSyllable,
  NumberedNotationNote,
  KeySignature,
  Measure,
  NoteDuration,
  PitchNumber,
  Song,
  SongLanguage,
  SongLanguageOptions,
  TimeSignature,
  GraceNote,
  VerseDisplayOption,
} from '../types/song.ts';
import { isPunctuationOrSpacer, normalizeSongDurations } from './taigiUtils.ts';

const VALID_LANGUAGES = new Set<SongLanguage>([
  'taigi', 'mandarin', 'english', 'japanese', 'multilingual',
]);

const VALID_ARTICULATIONS = new Set<ArticulationType>([
  'staccato', 'tenuto', 'accent', 'fermata', 'portamento_up', 'portamento_down',
]);
const VALID_INSTRUMENTS = new Set<InstrumentType>([
  'piano', 'flute', 'whistle', 'guitar', 'synth', 'bell', 'cello',
  'guitar_acoustic', 'accordion', 'harmonica', 'epiano_fm', 'saxophone', 'guitar_electric',
  'kalimba', 'music_box', 'music-box',
]);
const VALID_BARLINES = new Set<BarlineType>([
  'single', 'double', 'end', 'repeat_start', 'repeat_end',
]);
const VALID_VERSE_DISPLAY = new Set<VerseDisplayOption>([
  'hanlo', 'poj', 'both_poj_top', 'both_hanlo_top', 'both',
]);

/**
 * Export song to JSON string
 */
export function exportSongToJson(song: Song): string {
  return JSON.stringify(normalizeSongDurations(song), null, 2);
}

/**
 * Clean incoming JSON string, stripping UTF-8 BOM and markdown code blocks
 */
function cleanJsonString(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.charCodeAt(0) === 0xfeff) {
    cleaned = cleaned.slice(1).trim();
  }
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\r?\n?([\s\S]*?)\r?\n?```$/i, '$1').trim();
  }
  return cleaned;
}

/**
 * Normalize key signature string to standard key (handles 1=F, Key: F, enharmonics)
 */
export function normalizeKeySignature(raw: unknown): KeySignature {
  if (typeof raw !== 'string') return 'C';
  const clean = raw.trim().replace(/^1\s*=\s*/i, '').replace(/^Key:\s*/i, '').trim();
  const valid: Record<string, KeySignature> = {
    'C': 'C', 'Db': 'Db', 'C#': 'Db', 'D': 'D', 'Eb': 'Eb', 'D#': 'Eb',
    'E': 'E', 'F': 'F', 'F#': 'F#', 'Gb': 'F#', 'G': 'G', 'Ab': 'Ab',
    'G#': 'Ab', 'A': 'A', 'Bb': 'Bb', 'A#': 'Bb', 'B': 'B'
  };
  return valid[clean] || 'C';
}

/**
 * Normalize time signature to supported meters
 */
export function normalizeTimeSignature(raw: unknown): TimeSignature {
  if (typeof raw !== 'string') return '4/4';
  const clean = raw.trim().replace(/拍$/, '').trim();
  if (clean === '3/4' || clean === '2/4' || clean === '6/8') return clean;
  return '4/4';
}

function sanitizeLyric(raw: unknown): LyricSyllable {
  if (typeof raw === 'string') {
    return { poj: '', hanlo: raw, text: raw };
  }
  const rawLyric = (raw && typeof raw === 'object') ? (raw as Record<string, unknown>) : {};
  const hanlo = String(rawLyric.hanlo || rawLyric.hanji || rawLyric.custom || rawLyric.text || '');
  const poj = String(rawLyric.poj || rawLyric.tl || rawLyric.phonetic || '');
  const text = typeof rawLyric.text === 'string' ? rawLyric.text : (hanlo || '');
  const phonetic = typeof rawLyric.phonetic === 'string' ? rawLyric.phonetic : (poj || '');
  
  // Spread first so existing key order is preserved
  const res: LyricSyllable = { ...(rawLyric as LyricSyllable), hanlo, poj, text, phonetic };
  if (typeof rawLyric.translation === 'string') res.translation = rawLyric.translation;
  if (typeof rawLyric.isHyphenated === 'boolean') res.isHyphenated = rawLyric.isHyphenated;
  if (typeof rawLyric.isWordEnd === 'boolean') res.isWordEnd = rawLyric.isWordEnd;
  return res;
}

function sanitizeGraceNotes(raw: unknown): GraceNote[] | undefined {
  if (!Array.isArray(raw) || raw.length === 0) return undefined;
  const out: GraceNote[] = [];
  for (const g of raw) {
    if (!g || typeof g !== 'object') continue;
    const go = g as Record<string, unknown>;
    const pitchNum = parseInt(String(go.pitch), 10);
    if (pitchNum < 1 || pitchNum > 7) continue;
    let octave = 0;
    if (typeof go.octave === 'number' && !Number.isNaN(go.octave)) {
      octave = Math.max(-2, Math.min(2, go.octave));
    } else if (typeof go.octave === 'string') {
      const parsed = parseInt(go.octave, 10);
      if (!Number.isNaN(parsed)) octave = Math.max(-2, Math.min(2, parsed));
    }
    const grace: GraceNote = {
      pitch: pitchNum as 1 | 2 | 3 | 4 | 5 | 6 | 7,
      octave,
    };
    if (typeof go.id === 'string' && go.id.trim()) grace.id = go.id;
    if (go.accidental === '#' || go.accidental === 'b' || go.accidental === '') {
      grace.accidental = go.accidental;
    }
    out.push(grace);
    if (out.length >= 3) break;
  }
  return out.length > 0 ? out : undefined;
}

/**
 * Sanitize a note from arbitrary incoming JSON to guarantee all runtime fields exist.
 * Optional display flags are copied only when present (or inferred from duration)
 * so loading an unmodified factory snapshot does not invent false-y fields.
 */
function sanitizeNote(n: unknown, fallbackId: string): NumberedNotationNote {
  const noteObj = (n && typeof n === 'object') ? (n as Record<string, unknown>) : {};

  let pitch: PitchNumber = 1;
  if (noteObj.pitch === 'empty' || noteObj.pitch === '_' || noteObj.pitch === '') {
    pitch = 'empty';
  } else if (noteObj.pitch === 0 || noteObj.pitch === '0') {
    pitch = 0;
  } else {
    const num = parseInt(String(noteObj.pitch), 10);
    if (!Number.isNaN(num) && num >= 1 && num <= 7) {
      pitch = num as PitchNumber;
    } else if (num === 0) {
      pitch = 0;
    }
  }

  let duration: NoteDuration = 1;
  if (typeof noteObj.duration === 'number' && !Number.isNaN(noteObj.duration) && noteObj.duration >= 0) {
    duration = noteObj.duration as NoteDuration;
  } else if (typeof noteObj.duration === 'string') {
    const parsed = parseFloat(noteObj.duration);
    if (!Number.isNaN(parsed) && parsed >= 0) duration = parsed as NoteDuration;
  }
  if (pitch === 'empty') duration = 0 as NoteDuration;

  let octave = 0;
  if (typeof noteObj.octave === 'number' && !Number.isNaN(noteObj.octave)) {
    octave = Math.max(-2, Math.min(2, noteObj.octave));
  } else if (typeof noteObj.octave === 'string') {
    const parsed = parseInt(noteObj.octave, 10);
    if (!Number.isNaN(parsed)) octave = Math.max(-2, Math.min(2, parsed));
  }

  // Spread first so factory key order is preserved; overlay required fields only.
  const note: NumberedNotationNote = {
    ...(n && typeof n === 'object' ? (n as NumberedNotationNote) : {}),
    id: typeof noteObj.id === 'string' && noteObj.id.trim() ? noteObj.id : fallbackId,
    pitch,
    octave,
    duration,
    lyric: sanitizeLyric(noteObj.lyric),
  };

  if (noteObj.accidental === '#' || noteObj.accidental === 'b' || noteObj.accidental === '') {
    note.accidental = noteObj.accidental;
  } else if (noteObj.accidental != null && noteObj.accidental !== '') {
    delete (note as { accidental?: unknown }).accidental;
  }

  // Do not infer isDotted from duration: a 3-beat note is a dotted half
  // (`--` / `-.`), not a single-dot quarter, and factory snapshots must
  // round-trip without invented display flags.
  if (noteObj.isTied && typeof noteObj.tieToNext !== 'boolean') {
    note.tieToNext = true;
  }

  if (Array.isArray(noteObj.preGraceNotes)) {
    const preGrace = sanitizeGraceNotes(noteObj.preGraceNotes);
    if (preGrace) note.preGraceNotes = preGrace;
    else delete note.preGraceNotes;
  }
  if (Array.isArray(noteObj.postGraceNotes)) {
    const postGrace = sanitizeGraceNotes(noteObj.postGraceNotes);
    if (postGrace) note.postGraceNotes = postGrace;
    else delete note.postGraceNotes;
  }

  if (typeof noteObj.articulation === 'string') {
    if (VALID_ARTICULATIONS.has(noteObj.articulation as ArticulationType)) {
      note.articulation = noteObj.articulation as ArticulationType;
    } else if (noteObj.articulation === 'none') {
      delete note.articulation;
    }
  }
  if (typeof noteObj.instrument === 'string' && !VALID_INSTRUMENTS.has(noteObj.instrument as InstrumentType)) {
    delete note.instrument;
  }
  if (typeof noteObj.annotation !== 'string' && 'annotation' in note && noteObj.annotation != null) {
    delete note.annotation;
  }

  if (noteObj.lyricsByVerse && typeof noteObj.lyricsByVerse === 'object') {
    const lyricsByVerse: { [verseIndex: number]: LyricSyllable } = {};
    for (const [k, v] of Object.entries(noteObj.lyricsByVerse as Record<string, unknown>)) {
      const vNum = parseInt(k, 10);
      if (Number.isNaN(vNum)) continue;
      lyricsByVerse[vNum] = sanitizeLyric(v);
    }
    if (Object.keys(lyricsByVerse).length > 0) note.lyricsByVerse = lyricsByVerse;
    else delete note.lyricsByVerse;
  }

  return note;
}

function lyricHasBreak(note: NumberedNotationNote): boolean {
  const h = note.lyric?.hanlo || note.lyric?.hanji || note.lyric?.custom || '';
  const p = note.lyric?.poj || note.lyric?.tl || '';
  return /[\n\r↵]/.test(h) || /[\n\r↵]/.test(p);
}

function sanitizeMeasure(m: unknown, idx: number): Measure {
  const mo = (m && typeof m === 'object') ? (m as Record<string, unknown>) : {};
  const rawNotes = Array.isArray(mo.notes) ? mo.notes : [];
  const notes = rawNotes.map((n, nIdx) => sanitizeNote(n, `m-${idx + 1}-n-${nIdx + 1}`));
  const hasNoteBreak = notes.some(lyricHasBreak);

  const measure: Measure = {
    ...(m && typeof m === 'object' ? (m as Measure) : {}),
    id: typeof mo.id === 'string' && mo.id.trim() ? mo.id : `m-${idx + 1}`,
    measureNumber: typeof mo.measureNumber === 'number' && Number.isFinite(mo.measureNumber) ? mo.measureNumber : idx + 1,
    notes,
  };

  if (Array.isArray(mo.chords)) measure.chords = mo.chords.map(c => String(c));
  if (typeof mo.timeSignature === 'string') measure.timeSignature = normalizeTimeSignature(mo.timeSignature);

  if (Array.isArray(mo.obbligato)) {
    measure.obbligato = mo.obbligato.map((n, nIdx) => sanitizeNote(n, `m-${idx + 1}-ob-${nIdx + 1}`));
  }

  const barlineRaw = mo.barlineType || mo.barline;
  if (typeof barlineRaw === 'string' && VALID_BARLINES.has(barlineRaw as BarlineType)) {
    measure.barlineType = barlineRaw as BarlineType;
  } else if (barlineRaw != null && typeof barlineRaw === 'string') {
    delete measure.barlineType;
  }

  if (typeof mo.isLineBreak !== 'boolean' && hasNoteBreak) {
    measure.isLineBreak = true;
  }

  if (Array.isArray(mo.voltaEnding)) {
    const volta = mo.voltaEnding.map(Number).filter(v => !Number.isNaN(v));
    if (volta.length > 0) measure.voltaEnding = volta;
    else delete measure.voltaEnding;
  }

  return measure;
}

/**
 * Normalize arbitrary JSON into a Song, or return null if it cannot be repaired.
 * Never mutates the caller’s object; always returns a fresh copy.
 */
export function sanitizeSong(raw: unknown): Song | null {
  if (!raw || typeof raw !== 'object') return null;
  const parsed = raw as Record<string, unknown>;
  const id = typeof parsed.id === 'string' ? parsed.id.trim() : '';
  if (!id) return null;
  if (!Array.isArray(parsed.measures) || parsed.measures.length === 0) return null;

  const title = typeof parsed.title === 'string' && parsed.title.trim()
    ? parsed.title.trim()
    : 'Untitled Song';

  const rawBpm = typeof parsed.bpm === 'string' ? parseInt(parsed.bpm, 10) : Number(parsed.bpm);
  const bpm = Number.isFinite(rawBpm) && rawBpm > 0 ? rawBpm : 80;

  let language: SongLanguage = 'taigi';
  if (typeof parsed.language === 'string' && VALID_LANGUAGES.has(parsed.language as SongLanguage)) {
    language = parsed.language as SongLanguage;
  }

  const song: Song = {
    ...(parsed as unknown as Song),
    id,
    title,
    key: normalizeKeySignature(parsed.key),
    timeSignature: normalizeTimeSignature(parsed.timeSignature),
    bpm,
    language,
    measures: parsed.measures.map((m, idx) => sanitizeMeasure(m, idx)),
  };

  if (parsed.languageOptions && typeof parsed.languageOptions === 'object') {
    song.languageOptions = { ...(parsed.languageOptions as SongLanguageOptions) };
  }

  if (parsed.orientation != null && parsed.orientation !== 'landscape' && parsed.orientation !== 'portrait') {
    delete song.orientation;
  }
  if (typeof parsed.verseDisplayOption === 'string' && !VALID_VERSE_DISPLAY.has(parsed.verseDisplayOption as VerseDisplayOption)) {
    delete song.verseDisplayOption;
  }
  if (typeof parsed.updatedAt === 'number' && !Number.isFinite(parsed.updatedAt)) {
    delete song.updatedAt;
  }

  return song;
}

/**
 * Import song from JSON string with 100% preservation of all schema fields
 */
export function importSongFromJson(jsonString: string): Song {
  const cleaned = cleanJsonString(jsonString);
  const parsed = JSON.parse(cleaned);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Invalid song format: missing title or measures.');
  }

  const raw = parsed as Record<string, unknown>;
  const withId = {
    ...raw,
    id: typeof raw.id === 'string' && raw.id.trim() ? raw.id : `song-${Date.now()}`,
  };

  const song = sanitizeSong(withId);
  if (!song) {
    throw new Error('Invalid song format: missing title or measures.');
  }
  return normalizeSongDurations(song);
}

/**
 * Format a single Numbered Notation note into readable notation string
 * e.g., 5 with octave 1 = 5+, octave -1 = 5,, duration 0.5 = 5_, duration 2 = 5-
 */
export function formatNoteToNumberedNotationString(note: NumberedNotationNote): string {
  if (note.pitch === 'empty' || (typeof note.duration === 'number' && note.duration <= 0)) {
    if (note.annotation) return `[${note.annotation}]`;
    const hanlo = note.lyric?.hanlo || note.lyric?.hanji || note.lyric?.custom || '';
    if (hanlo === '\n' || hanlo === '↵') return '↵';
    if (hanlo && isPunctuationOrSpacer(hanlo)) return hanlo;
    return '_';
  }

  let p = `${note.pitch}`;
  if (note.accidental) p = `${note.accidental}${p}`;

  // Pre-grace notes
  if (note.preGraceNotes && note.preGraceNotes.length > 0) {
    const preStr = note.preGraceNotes.map(g => `${g.accidental || ''}${g.pitch}${g.octave > 0 ? '+'.repeat(g.octave) : g.octave < 0 ? ','.repeat(Math.abs(g.octave)) : ''}`).join('');
    p = `(${preStr})${p}`;
  }

  // Octave representation (+ for higher octaves, , for lower octaves)
  if (note.octave > 0) p = `${p}${'+'.repeat(note.octave)}`;
  if (note.octave < 0) p = `${p}${','.repeat(Math.abs(note.octave))}`;

  // Post-grace notes
  if (note.postGraceNotes && note.postGraceNotes.length > 0) {
    const postStr = note.postGraceNotes.map(g => `${g.accidental || ''}${g.pitch}${g.octave > 0 ? '+'.repeat(g.octave) : g.octave < 0 ? ','.repeat(Math.abs(g.octave)) : ''}`).join('');
    p = `${p}(${postStr})`;
  }

  // Duration representation. Encode longer values (including dotted half = 3)
  // before the generic single-dot suffix so `duration: 3, isDotted: true`
  // round-trips as 3 beats (`5--` / `5-.`) rather than a dotted quarter (`5.`).
  if (note.duration === 0.75 || (note.duration === 0.5 && note.isDotted && !note.isDoubleDotted)) p = `${p}_.`;
  else if (note.duration === 0.5) p = `${p}_`;
  else if (note.duration === 0.375) p = `${p}__.`;
  else if (note.duration === 0.25) p = `${p}__`;
  else if (note.duration === 0.125) p = `${p}___`;
  else if (note.duration === 0.333 || (note.isTriplet && note.duration <= 0.34)) p = `${p}/3`;
  else if (note.duration === 0.667 || (note.isTriplet && note.duration > 0.6)) p = `${p}*2/3`;
  else if (note.duration === 4) p = `${p}---`;
  else if (note.duration === 3.5 || (note.duration === 2 && note.isDoubleDotted)) p = `${p}-..`;
  else if (note.duration === 3) p = `${p}--`;
  else if (note.duration === 2 && note.isDotted) p = `${p}-.`;
  else if (note.duration === 2) p = `${p}-`;
  else if (note.duration === 1.75 || note.isDoubleDotted) p = `${p}..`;
  else if (note.duration === 1.5 || note.isDotted) p = `${p}.`;

  if (note.tieToNext) p = `${p}~`;
  if (note.slurToNext) p = `${p}^`;

  return p;
}

/**
 * Export song to Human-Readable Text Format
 */
export function exportSongToText(song: Song): string {
  const lines: string[] = [
    `# Taigi Numbered Notation Score Format`,
    `Title: ${song.title}`,
    song.subtitle ? `Subtitle: ${song.subtitle}` : '',
    song.composer ? `Composer: ${song.composer}` : '',
    song.lyricist ? `Lyricist: ${song.lyricist}` : '',
    song.notator ? `Notator: ${song.notator}` : '',
    song.catalogNumber ? `Catalog: ${song.catalogNumber}` : '',
    `Key: ${song.key}`,
    `Time: ${song.timeSignature}`,
    `BPM: ${song.bpm}`,
    song.orientation ? `Orientation: ${song.orientation}` : '',
    typeof song.notesPerLine === 'number' ? `NotesPerLine: ${song.notesPerLine}` : '',
    typeof song.verseCount === 'number' ? `VerseCount: ${song.verseCount}` : '',
    song.footnote ? `Footnote: ${song.footnote}` : '',
    song.description ? `Description: ${song.description}` : '',
    ``,
  ].filter(Boolean);

  const hasMultiVerses = (song.verseCount && song.verseCount > 1) || song.measures.some(m => m.notes.some(n => n.lyricsByVerse && Object.keys(n.lyricsByVerse).length > 0));

  song.measures.forEach((m, idx) => {
    const metaParts = [`[Measure ${idx + 1}]`];
    if (m.section) metaParts.push(`(${m.section})`);
    else if (m.isPrelude) metaParts.push(`(Prelude)`);

    if (m.chord) metaParts.push(`Chord: ${m.chord}`);
    else if (m.chords && m.chords.length > 0) metaParts.push(`Chord: ${m.chords.join(' ')}`);

    if (m.timeSignature) metaParts.push(`Time: ${m.timeSignature}`);
    if (m.barlineType && m.barlineType !== 'single') metaParts.push(`Barline: ${m.barlineType}`);
    if (m.voltaEnding && m.voltaEnding.length > 0) metaParts.push(`Volta: ${m.voltaEnding.join(',')}`);
    const hasNoteBreak = m.notes.some(n => {
      const h = n.lyric?.hanlo || n.lyric?.hanji || n.lyric?.custom || '';
      const p = n.lyric?.poj || n.lyric?.tl || '';
      return /[\n\r↵]/.test(h) || /[\n\r↵]/.test(p);
    });
    if (m.isLineBreak || hasNoteBreak) metaParts.push(`[Break]`);

    lines.push(metaParts.join(' '));

    const cleanToken = (s: string) => s.replace(/[\r\n↵]+/g, '').trim();
    const numberedNotationTokens = m.notes.map(n => formatNoteToNumberedNotationString(n));
    const romanTokens = m.notes.map(n => cleanToken(n.lyric?.poj || n.lyric?.tl || '') || '—');
    const hanloTokens = m.notes.map(n => cleanToken(n.lyric?.hanlo || n.lyric?.hanji || n.lyric?.custom || '') || '—');

    lines.push(`Numbered Notation:  ${numberedNotationTokens.join('  ')}`);
    lines.push(`POJ:                ${romanTokens.join('  ')}`);
    lines.push(`Hanlo:              ${hanloTokens.join('  ')}`);

    if (hasMultiVerses) {
      const vIndices = [2, 3, 4, 5];
      for (const v of vIndices) {
        const hasVerseLyrics = m.notes.some(n => n.lyricsByVerse?.[v] && (n.lyricsByVerse[v].poj || n.lyricsByVerse[v].hanlo));
        if (hasVerseLyrics) {
          const vRomanTokens = m.notes.map(n => cleanToken(n.lyricsByVerse?.[v]?.poj || n.lyricsByVerse?.[v]?.tl || '') || '—');
          const vHanloTokens = m.notes.map(n => cleanToken(n.lyricsByVerse?.[v]?.hanlo || n.lyricsByVerse?.[v]?.hanji || n.lyricsByVerse?.[v]?.custom || '') || '—');
          lines.push(`POJ ${v}:              ${vRomanTokens.join('  ')}`);
          lines.push(`Hanlo ${v}:            ${vHanloTokens.join('  ')}`);
        }
      }
    }

    if (m.obbligatoText) {
      lines.push(`Obbligato:  ${m.obbligatoText}`);
    } else if (m.obbligato && m.obbligato.length > 0) {
      const obTokens = m.obbligato.map(n => formatNoteToNumberedNotationString(n));
      lines.push(`Obbligato:  ${obTokens.join('  ')}`);
    }

    lines.push(``);
  });

  return lines.join('\n');
}

/**
 * Helper to parse a grace note string such as "5", "61", "#4", "5," into GraceNote[]
 */
function parseGraceString(str: string): GraceNote[] {
  const results: GraceNote[] = [];
  const regex = /([#b]?)([1-7])([\+',]*)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(str)) !== null) {
    const accidental = (match[1] === '#' || match[1] === 'b') ? match[1] : '';
    const pitch = parseInt(match[2], 10) as 1 | 2 | 3 | 4 | 5 | 6 | 7;
    const octSigns = match[3] || '';
    const plusCount = (octSigns.match(/[\+']/g) || []).length;
    const commaCount = (octSigns.match(/,/g) || []).length;
    const octave = plusCount > 0 ? Math.min(2, plusCount) : commaCount > 0 ? -Math.min(2, commaCount) : 0;
    results.push({ pitch, octave, accidental: accidental as '' | '#' | 'b' });
  }
  return results;
}

/**
 * Parse text format back into Song
 */
export function importSongFromText(text: string): Song {
  const lines = text.split(/\r?\n/);
  const song: Song = {
    id: `song-${Date.now()}`,
    title: 'Imported Song',
    key: 'C',
    timeSignature: '4/4',
    bpm: 80,
    measures: [],
  };

  let currentMeasure: Partial<Measure> | null = null;
  let measureIndex = 1;
  let pendingRoman: string[] | null = null;
  let pendingHanlo: string[] | null = null;
  const pendingVerses: { [verseIndex: number]: { roman?: string[]; hanlo?: string[] } } = {};

  const applyPendingLyrics = () => {
    if (!currentMeasure?.notes || currentMeasure.notes.length === 0) return;
    if (pendingRoman) {
      pendingRoman.forEach((tok, idx) => {
        if (currentMeasure!.notes![idx]) {
          currentMeasure!.notes![idx].lyric.poj = tok === '—' ? '' : tok;
        }
      });
    }
    if (pendingHanlo) {
      pendingHanlo.forEach((tok, idx) => {
        if (currentMeasure!.notes![idx]) {
          const val = tok === '—' ? '' : tok;
          currentMeasure!.notes![idx].lyric.hanlo = val;
          currentMeasure!.notes![idx].lyric.hanji = val;
          currentMeasure!.notes![idx].lyric.custom = val;
        }
      });
    }
    Object.keys(pendingVerses).forEach(vKey => {
      const v = parseInt(vKey, 10);
      const vData = pendingVerses[v];
      currentMeasure!.notes!.forEach((n, idx) => {
        if (!n.lyricsByVerse) n.lyricsByVerse = {};
        if (!n.lyricsByVerse[v]) n.lyricsByVerse[v] = {};
        if (vData.roman && vData.roman[idx]) {
          const tok = vData.roman[idx];
          n.lyricsByVerse[v].poj = tok === '—' ? '' : tok;
        }
        if (vData.hanlo && vData.hanlo[idx]) {
          const tok = vData.hanlo[idx];
          const val = tok === '—' ? '' : tok;
          n.lyricsByVerse[v].hanlo = val;
          n.lyricsByVerse[v].hanji = val;
          n.lyricsByVerse[v].custom = val;
        }
      });
    });
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.startsWith('#')) continue;

    if (line.startsWith('Title:')) {
      song.title = line.replace('Title:', '').trim();
    } else if (line.startsWith('Subtitle:')) {
      song.subtitle = line.replace('Subtitle:', '').trim();
    } else if (line.startsWith('Composer:')) {
      song.composer = line.replace('Composer:', '').trim();
    } else if (line.startsWith('Lyricist:')) {
      song.lyricist = line.replace('Lyricist:', '').trim();
    } else if (line.startsWith('Notator:')) {
      song.notator = line.replace('Notator:', '').trim();
    } else if (line.startsWith('Catalog:')) {
      song.catalogNumber = line.replace('Catalog:', '').trim();
    } else if (line.startsWith('Footnote:')) {
      song.footnote = line.replace('Footnote:', '').trim();
    } else if (line.startsWith('Orientation:')) {
      const o = line.replace('Orientation:', '').trim();
      if (o === 'landscape' || o === 'portrait') song.orientation = o;
    } else if (line.startsWith('NotesPerLine:')) {
      const n = parseInt(line.replace('NotesPerLine:', '').trim(), 10);
      if (n > 0) song.notesPerLine = n;
    } else if (line.startsWith('VerseCount:')) {
      const v = parseInt(line.replace('VerseCount:', '').trim(), 10);
      if (v > 0) song.verseCount = v;
    } else if (line.startsWith('Description:')) {
      song.description = line.replace('Description:', '').trim();
    } else if (line.startsWith('Key:')) {
      song.key = normalizeKeySignature(line.replace('Key:', '').trim());
    } else if (line.startsWith('Time:') || line.startsWith('TimeSignature:')) {
      song.timeSignature = normalizeTimeSignature(line.replace(/^(Time:|TimeSignature:)/, '').trim());
    } else if (line.startsWith('BPM:')) {
      song.bpm = parseInt(line.replace('BPM:', '').trim(), 10) || 80;
    } else if (line.startsWith('[Measure') || line.startsWith('[Bar') || line.startsWith('[')) {
      if (currentMeasure && currentMeasure.notes && currentMeasure.notes.length > 0) {
        applyPendingLyrics();
        song.measures.push(currentMeasure as Measure);
      }

      pendingRoman = null;
      pendingHanlo = null;
      Object.keys(pendingVerses).forEach(k => delete pendingVerses[Number(k)]);

      const chordMatch = line.match(/Chord:\s*([A-Za-z0-9#b\/\s]+?)(?=(\s+[A-Z][a-z]+:|\s*\[|\s*$))/i);
      const sectionMatch = line.match(/\(([^)]+)\)/);
      const timeMatch = line.match(/Time:\s*([0-9\/]+)/i);
      const barlineMatch = line.match(/Barline:\s*([a-z_]+)/i);
      const voltaMatch = line.match(/Volta:\s*([0-9,\s]+)/i);
      const hasBreak = /\[Break\]/i.test(line) || /Break:\s*true/i.test(line);

      currentMeasure = {
        id: `m-${Date.now()}-${measureIndex}`,
        measureNumber: measureIndex++,
        chord: chordMatch ? chordMatch[1].trim() : undefined,
        section: sectionMatch ? sectionMatch[1].trim() : undefined,
        timeSignature: timeMatch ? normalizeTimeSignature(timeMatch[1]) : undefined,
        barlineType: barlineMatch ? (barlineMatch[1].trim() as Measure['barlineType']) : undefined,
        voltaEnding: voltaMatch ? voltaMatch[1].split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n)) : undefined,
        isLineBreak: hasBreak,
        notes: [],
      };
    } else if (currentMeasure) {
      if (line.startsWith('Numbered Notation:') || line.startsWith('Numbered notation:')) {
        const tokens = line.replace(/^(Numbered Notation:|Numbered notation:)/, '').trim().split(/\s+/).filter(Boolean);
        currentMeasure.notes = tokens.map((tok, nIdx) => parseNumberedNotationToken(tok, `${currentMeasure!.id}-n${nIdx}`));
        applyPendingLyrics();
      } else if (line.startsWith('Obbligato:')) {
        currentMeasure.obbligatoText = line.replace(/^Obbligato:/, '').trim();
      } else {
        const vRomanMatch = line.match(/^(POJ|Roman|TL|羅馬字)\s*([2-5])?:/i);
        const vHanloMatch = line.match(/^(Han-?lo|Hanji|Custom|漢羅)\s*([2-5])?:/i);

        if (vRomanMatch) {
          const verseNum = vRomanMatch[2] ? parseInt(vRomanMatch[2], 10) : 1;
          const tokens = line.replace(vRomanMatch[0], '').trim().split(/\s+/).filter(Boolean);
          if (verseNum === 1) {
            pendingRoman = tokens;
          } else {
            if (!pendingVerses[verseNum]) pendingVerses[verseNum] = {};
            pendingVerses[verseNum].roman = tokens;
          }
          applyPendingLyrics();
        } else if (vHanloMatch) {
          const verseNum = vHanloMatch[2] ? parseInt(vHanloMatch[2], 10) : 1;
          const tokens = line.replace(vHanloMatch[0], '').trim().split(/\s+/).filter(Boolean);
          if (verseNum === 1) {
            pendingHanlo = tokens;
          } else {
            if (!pendingVerses[verseNum]) pendingVerses[verseNum] = {};
            pendingVerses[verseNum].hanlo = tokens;
          }
          applyPendingLyrics();
        }
      }
    }
  }

  if (currentMeasure && currentMeasure.notes && currentMeasure.notes.length > 0) {
    applyPendingLyrics();
    song.measures.push(currentMeasure as Measure);
  }

  if (song.measures.length === 0) {
    throw new Error('No valid measures found in text file.');
  }

  const sanitized = sanitizeSong(song);
  if (!sanitized) {
    throw new Error('No valid measures found in text file.');
  }
  return normalizeSongDurations(sanitized);
}

export function parseNumberedNotationToken(token: string, id: string): NumberedNotationNote {
  let pitch: PitchNumber = 1;
  let octave = 0;
  let accidental: '' | '#' | 'b' = '';
  let duration: NoteDuration = 1;
  let isDotted = false;
  let isDoubleDotted = false;
  let tieToNext = false;
  let slurToNext = false;
  let isTriplet = false;
  let preGraceNotes: GraceNote[] | undefined;
  let postGraceNotes: GraceNote[] | undefined;

  let clean = token.trim();

  // If token is explicitly an annotation [xxx]
  if (clean.startsWith('[') && clean.endsWith(']')) {
    const annot = clean.slice(1, -1).trim();
    return {
      id,
      pitch: 'empty',
      octave: 0,
      accidental: '',
      duration: 0 as NoteDuration,
      isDotted: false,
      isTied: false,
      annotation: annot,
      lyric: { hanji: annot, custom: annot },
    };
  }

  // If token is explicitly a spacer, newline, or punctuation
  if (
    clean === '_' ||
    clean === '↵' ||
    clean === '空' ||
    clean === 'empty' ||
    clean === 'V' ||
    isPunctuationOrSpacer(clean)
  ) {
    return {
      id,
      pitch: 'empty',
      octave: 0,
      accidental: '',
      duration: 0 as NoteDuration,
      isDotted: false,
      isTied: false,
      lyric: clean === '_' ? {} : { hanji: clean, custom: clean },
    };
  }

  // Ties (~) and slurs (^)
  if (clean.includes('~')) {
    tieToNext = true;
    clean = clean.replace(/~/g, '');
  }
  if (clean.includes('^')) {
    slurToNext = true;
    clean = clean.replace(/\^/g, '');
  }

  // Pre-grace notes e.g. (5)1 or (61)2
  const preGraceMatch = clean.match(/^\(([^)]+)\)/);
  if (preGraceMatch) {
    preGraceNotes = parseGraceString(preGraceMatch[1]);
    clean = clean.slice(preGraceMatch[0].length);
  }

  // Post-grace notes e.g. 1(2)
  const postGraceMatch = clean.match(/\(([^)]+)\)$/);
  if (postGraceMatch) {
    postGraceNotes = parseGraceString(postGraceMatch[1]);
    clean = clean.slice(0, -postGraceMatch[0].length);
  }

  // Accidental
  if (clean.startsWith('#')) {
    accidental = '#';
    clean = clean.substring(1);
  } else if (clean.startsWith('b')) {
    accidental = 'b';
    clean = clean.substring(1);
  }

  // Pitch number (0 to 7) or empty '_' / 'x' / '空'
  if (clean.startsWith('_') || clean.startsWith('空') || clean.startsWith('empty')) {
    return {
      id,
      pitch: 'empty',
      octave: 0,
      accidental: '',
      duration: 0 as NoteDuration,
      isDotted: false,
      lyric: {},
    };
  }

  const pitchMatch = clean.match(/^([0-7])/);
  if (pitchMatch) {
    pitch = parseInt(pitchMatch[1], 10) as PitchNumber;
    clean = clean.substring(1);
  }

  // Octave indicators (+ or ' for up, , for down)
  const plusCount = (clean.match(/[\+']/g) || []).length;
  const commaCount = (clean.match(/,/g) || []).length;
  if (plusCount > 0) {
    octave = Math.min(3, plusCount);
  } else if (commaCount > 0) {
    octave = -Math.min(3, commaCount);
  }

  // Duration
  if (clean.includes('___')) duration = 0.125;
  else if (clean.includes('__')) duration = 0.25;
  else if (clean.includes('_')) duration = 0.5;
  else if (clean.includes('---')) duration = 4;
  else if (clean.includes('--')) duration = 3;
  else if (clean.includes('-')) duration = 2;

  // Triplet
  if (clean.includes('/3')) {
    isTriplet = true;
    if (clean.includes('*2/3')) duration = 0.667;
    else duration = 0.333;
  }

  // Dotted / Double dotted
  if (clean.includes('..')) {
    isDoubleDotted = true;
    if (duration === 1) duration = 1.75;
    else if (duration === 2) duration = 3.5;
  } else if (clean.includes('.')) {
    isDotted = true;
    if (duration === 1) duration = 1.5;
    else if (duration === 0.5) duration = 0.75;
    else if (duration === 2) duration = 3;
  }

  return {
    id,
    pitch,
    octave,
    accidental,
    duration,
    isDotted: isDotted || undefined,
    isDoubleDotted: isDoubleDotted || undefined,
    tieToNext: tieToNext || undefined,
    slurToNext: slurToNext || undefined,
    isTriplet: isTriplet || undefined,
    preGraceNotes: preGraceNotes && preGraceNotes.length > 0 ? preGraceNotes : undefined,
    postGraceNotes: postGraceNotes && postGraceNotes.length > 0 ? postGraceNotes : undefined,
    lyric: {},
  };
}

