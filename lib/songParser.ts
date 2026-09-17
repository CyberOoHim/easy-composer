import type { NumberedNotationNote, KeySignature, Measure, NoteDuration, PitchNumber, Song, TimeSignature, SheetOrientation, GraceNote, VerseDisplayOption, VerseSettings } from '../types/song.ts';
import { isPunctuationOrSpacer, normalizeSongDurations } from './taigiUtils.ts';

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

/**
 * Sanitize a note from arbitrary incoming JSON to guarantee all runtime fields exist
 */
function sanitizeImportedNote(n: unknown, fallbackId: string): NumberedNotationNote {
  const noteObj = (n && typeof n === 'object') ? (n as Record<string, unknown>) : {};

  // Pitch
  let pitch: PitchNumber = 1;
  if (noteObj.pitch === 'empty' || noteObj.pitch === '_' || noteObj.pitch === '') {
    pitch = 'empty';
  } else if (noteObj.pitch === 0 || noteObj.pitch === '0') {
    pitch = 0;
  } else {
    const num = parseInt(String(noteObj.pitch), 10);
    if (!isNaN(num) && num >= 1 && num <= 7) {
      pitch = num as PitchNumber;
    } else if (num === 0) {
      pitch = 0;
    }
  }

  // Duration
  let duration: NoteDuration = 1;
  if (typeof noteObj.duration === 'number' && !isNaN(noteObj.duration) && noteObj.duration >= 0) {
    duration = noteObj.duration as NoteDuration;
  } else if (typeof noteObj.duration === 'string') {
    const parsed = parseFloat(noteObj.duration);
    if (!isNaN(parsed) && parsed >= 0) duration = parsed as NoteDuration;
  }
  if (pitch === 'empty') duration = 0 as NoteDuration;

  // Octave
  let octave = 0;
  if (typeof noteObj.octave === 'number' && !isNaN(noteObj.octave)) {
    octave = Math.max(-2, Math.min(2, noteObj.octave));
  } else if (typeof noteObj.octave === 'string') {
    const parsed = parseInt(noteObj.octave, 10);
    if (!isNaN(parsed)) octave = Math.max(-2, Math.min(2, parsed));
  }

  // Accidental
  let accidental: '' | '#' | 'b' = '';
  if (noteObj.accidental === '#' || noteObj.accidental === 'b') {
    accidental = noteObj.accidental;
  }

  // Lyric object (MUST never be null or undefined to prevent rendering crashes)
  const rawLyric = (noteObj.lyric && typeof noteObj.lyric === 'object') ? (noteObj.lyric as Record<string, unknown>) : {};
  const hanlo = String(rawLyric.hanlo || rawLyric.hanji || rawLyric.custom || '');
  const poj = String(rawLyric.poj || rawLyric.tl || '');
  const lyric = {
    hanlo,
    poj,
    hanji: hanlo,
    custom: hanlo,
  };

  // Multi-verse lyrics
  let lyricsByVerse: { [verseIndex: number]: { hanlo: string; poj: string; hanji: string; custom: string } } | undefined;
  if (noteObj.lyricsByVerse && typeof noteObj.lyricsByVerse === 'object') {
    lyricsByVerse = {};
    for (const [k, v] of Object.entries(noteObj.lyricsByVerse as Record<string, unknown>)) {
      const vNum = parseInt(k, 10);
      if (!isNaN(vNum) && v && typeof v === 'object') {
        const vObj = v as Record<string, unknown>;
        const vHanlo = String(vObj.hanlo || vObj.hanji || vObj.custom || '');
        const vPoj = String(vObj.poj || vObj.tl || '');
        lyricsByVerse[vNum] = {
          hanlo: vHanlo,
          poj: vPoj,
          hanji: vHanlo,
          custom: vHanlo,
        };
      }
    }
  }

  return {
    id: typeof noteObj.id === 'string' && noteObj.id.trim() ? noteObj.id : fallbackId,
    pitch,
    octave,
    accidental,
    duration,
    isDotted: Boolean(noteObj.isDotted || duration === 1.5 || duration === 0.75 || duration === 3),
    isDoubleDotted: Boolean(noteObj.isDoubleDotted || duration === 1.75 || duration === 3.5),
    isTied: Boolean(noteObj.isTied),
    tieToNext: Boolean(noteObj.tieToNext || noteObj.isTied),
    slurToNext: Boolean(noteObj.slurToNext),
    isTriplet: Boolean(noteObj.isTriplet || duration === 0.333 || duration === 0.667),
    preGraceNotes: Array.isArray(noteObj.preGraceNotes) && noteObj.preGraceNotes.length > 0 ? (noteObj.preGraceNotes as GraceNote[]) : undefined,
    postGraceNotes: Array.isArray(noteObj.postGraceNotes) && noteObj.postGraceNotes.length > 0 ? (noteObj.postGraceNotes as GraceNote[]) : undefined,
    articulation: typeof noteObj.articulation === 'string' && noteObj.articulation !== 'none' ? (noteObj.articulation as NumberedNotationNote['articulation']) : undefined,
    instrument: typeof noteObj.instrument === 'string' ? (noteObj.instrument as NumberedNotationNote['instrument']) : undefined,
    annotation: typeof noteObj.annotation === 'string' ? noteObj.annotation : undefined,
    lyric,
    lyricsByVerse: lyricsByVerse && Object.keys(lyricsByVerse).length > 0 ? lyricsByVerse : undefined,
  };
}

/**
 * Import song from JSON string with 100% preservation of all schema fields
 */
export function importSongFromJson(jsonString: string): Song {
  const cleaned = cleanJsonString(jsonString);
  const parsed = JSON.parse(cleaned);
  if (!parsed.title || !parsed.measures || !Array.isArray(parsed.measures)) {
    throw new Error('Invalid song format: missing title or measures.');
  }

  const rawBpm = typeof parsed.bpm === 'string' ? parseInt(parsed.bpm, 10) : Number(parsed.bpm);
  const bpm = !isNaN(rawBpm) && rawBpm > 0 ? rawBpm : 80;

  const song: Song = {
    id: typeof parsed.id === 'string' && parsed.id.trim() ? parsed.id : `song-${Date.now()}`,
    title: typeof parsed.title === 'string' ? parsed.title : 'Untitled Song',
    subtitle: typeof parsed.subtitle === 'string' ? parsed.subtitle : '',
    composer: typeof parsed.composer === 'string' ? parsed.composer : '',
    lyricist: typeof parsed.lyricist === 'string' ? parsed.lyricist : '',
    notator: typeof parsed.notator === 'string' ? parsed.notator : undefined,
    catalogNumber: typeof parsed.catalogNumber === 'string' ? parsed.catalogNumber : undefined,
    footnote: typeof parsed.footnote === 'string' ? parsed.footnote : undefined,
    key: normalizeKeySignature(parsed.key),
    timeSignature: normalizeTimeSignature(parsed.timeSignature),
    bpm,
    measures: (parsed.measures || []).map((m: Record<string, unknown>, idx: number) => {
      const rawNotes = Array.isArray(m?.notes) ? m.notes : [];
      const notes = rawNotes.map((n: unknown, nIdx: number) =>
        sanitizeImportedNote(n, `m-${idx + 1}-n-${nIdx + 1}-${Date.now()}`)
      );
      const rawObbligato = Array.isArray(m?.obbligato) ? m.obbligato : undefined;
      const obbligato = rawObbligato ? rawObbligato.map((n: unknown, nIdx: number) =>
        sanitizeImportedNote(n, `m-${idx + 1}-ob-${nIdx + 1}-${Date.now()}`)
      ) : undefined;

      const hasNoteBreak = notes.some(n => {
        const h = n.lyric?.hanlo || n.lyric?.hanji || n.lyric?.custom || '';
        const p = n.lyric?.poj || n.lyric?.tl || '';
        return /[\n\r↵]/.test(h) || /[\n\r↵]/.test(p);
      });

      return {
        id: typeof m?.id === 'string' ? m.id : `m-${idx + 1}-${Date.now()}`,
        measureNumber: typeof m?.measureNumber === 'number' ? m.measureNumber : idx + 1,
        chord: typeof m?.chord === 'string' ? m.chord : undefined,
        chords: Array.isArray(m?.chords) ? m.chords.map(c => String(c)) : undefined,
        timeSignature: typeof m?.timeSignature === 'string' ? normalizeTimeSignature(m.timeSignature) : undefined,
        section: typeof m?.section === 'string' ? m.section : undefined,
        notes,
        obbligato,
        obbligatoText: typeof m?.obbligatoText === 'string' ? m.obbligatoText : undefined,
        barlineType: (m?.barlineType || m?.barline) as Measure['barlineType'],
        isLineBreak: Boolean(m?.isLineBreak || (m?.isLineBreak !== false && hasNoteBreak)),
        voltaEnding: Array.isArray(m?.voltaEnding) ? m.voltaEnding.map(Number).filter(v => !isNaN(v)) : undefined,
        isPrelude: typeof m?.isPrelude === 'boolean' ? m.isPrelude : undefined,
      };
    }),
    notesPerLine: typeof parsed.notesPerLine === 'number' ? parsed.notesPerLine : (parsed.orientation === 'landscape' ? 5 : 4),
    orientation: (parsed.orientation === 'landscape' ? 'landscape' : 'portrait') as SheetOrientation,
    description: typeof parsed.description === 'string' ? parsed.description : '',
    verseCount: typeof parsed.verseCount === 'number' ? parsed.verseCount : undefined,
    verseDisplayOption: parsed.verseDisplayOption as VerseDisplayOption | undefined,
    verseSettings: parsed.verseSettings && typeof parsed.verseSettings === 'object' ? (parsed.verseSettings as { [verseIndex: number]: VerseSettings }) : undefined,
    isPresetModified: typeof parsed.isPresetModified === 'boolean' ? parsed.isPresetModified : undefined,
    originalPresetId: typeof parsed.originalPresetId === 'string' ? parsed.originalPresetId : undefined,
    updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : undefined,
  };
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

  // Duration representation
  if (note.duration === 0.5) p = `${p}_`;
  else if (note.duration === 0.25) p = `${p}__`;
  else if (note.duration === 0.125) p = `${p}___`;
  else if (note.duration === 0.333 || (note.isTriplet && note.duration <= 0.34)) p = `${p}/3`;
  else if (note.duration === 0.667 || (note.isTriplet && note.duration > 0.6)) p = `${p}*2/3`;
  else if (note.duration === 1.75 || note.isDoubleDotted) p = `${p}..`;
  else if (note.duration === 1.5 || note.isDotted) p = `${p}.`;
  else if (note.duration === 2) p = `${p}-`;
  else if (note.duration === 3) p = `${p}--`;
  else if (note.duration === 4) p = `${p}---`;

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
    else if (m.isPrelude) metaParts.push(`(前奏)`);

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
    lines.push(`羅馬字:  ${romanTokens.join('  ')}`);
    lines.push(`漢羅:    ${hanloTokens.join('  ')}`);

    if (hasMultiVerses) {
      const vIndices = [2, 3, 4, 5];
      for (const v of vIndices) {
        const hasVerseLyrics = m.notes.some(n => n.lyricsByVerse?.[v] && (n.lyricsByVerse[v].poj || n.lyricsByVerse[v].hanlo));
        if (hasVerseLyrics) {
          const vRomanTokens = m.notes.map(n => cleanToken(n.lyricsByVerse?.[v]?.poj || n.lyricsByVerse?.[v]?.tl || '') || '—');
          const vHanloTokens = m.notes.map(n => cleanToken(n.lyricsByVerse?.[v]?.hanlo || n.lyricsByVerse?.[v]?.hanji || n.lyricsByVerse?.[v]?.custom || '') || '—');
          lines.push(`羅馬字 ${v}:  ${vRomanTokens.join('  ')}`);
          lines.push(`漢羅 ${v}:    ${vHanloTokens.join('  ')}`);
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
        const vRomanMatch = line.match(/^(羅馬字|Roman|POJ|TL)\s*([2-5])?:/i);
        const vHanloMatch = line.match(/^(漢羅|Hanlo|Hanji|Custom)\s*([2-5])?:/i);

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

  return normalizeSongDurations(song);
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

