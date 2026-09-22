import type {
  Song,
  Measure,
  NumberedNotationNote,
  PitchNumber,
  NoteDuration,
  KeySignature,
  TimeSignature,
  SheetOrientation,
  SongLanguage,
  VerseDisplayOption,
  BarlineType,
  ArticulationType,
  InstrumentType,
  GraceNote,
  LyricSyllable,
} from '../types/song.ts';
import { PRESET_SONGS } from './presets.ts';
import { isSongModifiedFromPreset } from './indexedDb.ts';
import { sanitizeSong } from './songParser.ts';
import { normalizeSongDurations } from './taigiUtils.ts';

export interface ShareUrlResult {
  url: string;
  isPreset: boolean;
  payloadSize: number;
  format?: 'preset' | 'delta' | 'compact' | 'legacy';
}

export type ParsedSongUrlResult =
  | { type: 'preset'; song: Song; isPreset: true }
  | { type: 'song'; song: Song; isPreset: false };

/**
 * Compact V2 Song schema for ultra-dense, low-overhead score URLs.
 * Replaces repetitive object keys with fixed-order tuples and bitmasks,
 * achieving a 60-80% size reduction over standard JSON.
 */
export interface CompactSongV2 {
  _c: 2;
  t: string;
  s?: string;
  c?: string;
  l?: string;
  nt?: string;
  cat?: string;
  k: KeySignature;
  ts: TimeSignature;
  b: number;
  n?: number;
  o?: SheetOrientation;
  d?: string;
  fn?: string;
  lang?: SongLanguage;
  vc?: number;
  vdo?: VerseDisplayOption;
  vs?: Record<string, unknown>;
  m: unknown[][];
}

/**
 * Preset Delta schema for scores based on or forked from library presets.
 * Only serializes changes relative to the baseline preset, achieving
 * a 90-98% size reduction (typically 50 - 200 bytes total).
 */
export interface PresetDeltaPayload {
  _d: 1;
  base: string;
  t?: string;
  s?: string;
  c?: string;
  l?: string;
  nt?: string;
  cat?: string;
  k?: KeySignature;
  ts?: TimeSignature;
  bpm?: number;
  npl?: number;
  desc?: string;
  fn?: string;
  o?: SheetOrientation;
  lang?: SongLanguage;
  vc?: number;
  vdo?: VerseDisplayOption;
  vs?: Record<string, unknown>;
  diff?: Record<number, unknown[]>;
  m?: unknown[][];
}

function cleanVal(val: unknown): unknown {
  if (Array.isArray(val)) {
    return val.map(cleanVal);
  }
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v === '' || v === null || v === undefined || v === false) continue;
      if (k === 'octave' && v === 0) continue;
      if (k === 'lyric') {
        const l = v as Record<string, unknown>;
        if (!l.poj && !l.hanlo && !l.hanji && !l.custom && !l.tl && !l.text && !l.phonetic) continue;
      }
      if (typeof v === 'object') {
        const cleanedChild = cleanVal(v);
        if (k !== 'measures' && k !== 'notes' && Array.isArray(cleanedChild) && cleanedChild.length === 0) continue;
        if (!Array.isArray(cleanedChild) && cleanedChild && typeof cleanedChild === 'object' && Object.keys(cleanedChild).length === 0) continue;
        out[k] = cleanedChild;
      } else {
        out[k] = v;
      }
    }
    return out;
  }
  return val;
}

/**
 * Strips empty strings, default zeros, and empty lyric shells from song objects
 * to minimize the compressed JSON payload size before encoding into the URL.
 */
export function cleanSongForUrl(song: Song): Record<string, unknown> {
  const normalized = normalizeSongDurations(song);
  return cleanVal(normalized) as Record<string, unknown>;
}

/**
 * Encodes a note into a high-density tuple:
 * [pitch, duration, hanlo, poj, octave, accidental, flags, extra]
 * flags bitmask: 1=dot, 2=doubleDot, 4=tieToNext, 8=slurToNext, 16=triplet
 */
export function encodeCompactNote(n: NumberedNotationNote): unknown[] {
  let flags = 0;
  if (n.isDotted) flags |= 1;
  if (n.isDoubleDotted) flags |= 2;
  if (n.tieToNext || n.isTied) flags |= 4;
  if (n.slurToNext) flags |= 8;
  if (n.isTriplet) flags |= 16;

  const hanlo = n.lyric?.hanlo || n.lyric?.hanji || n.lyric?.text || '';
  const poj = n.lyric?.poj || n.lyric?.tl || n.lyric?.phonetic || '';
  const octave = n.octave || 0;
  const acc = n.accidental || '';

  let extra: Record<string, unknown> | null = null;
  const getExtra = (): Record<string, unknown> => {
    if (!extra) extra = {};
    return extra;
  };

  if (n.articulation && n.articulation !== 'none') getExtra().art = n.articulation;
  if (n.annotation) getExtra().ann = n.annotation;
  if (n.instrument) getExtra().inst = n.instrument;
  if (n.preGraceNotes && n.preGraceNotes.length) getExtra().pre = n.preGraceNotes;
  if (n.postGraceNotes && n.postGraceNotes.length) getExtra().post = n.postGraceNotes;
  if (n.lyricsByVerse && Object.keys(n.lyricsByVerse).length) {
    const vObj: Record<string, unknown> = {};
    for (const [vNum, syl] of Object.entries(n.lyricsByVerse)) {
      if (vNum === '1') continue; // Verse 1 is already primary at index 2 & 3
      const h = syl.hanlo || syl.hanji || syl.text || '';
      const p = syl.poj || syl.tl || syl.phonetic || '';
      if (h || p) {
        vObj[vNum] = p ? [h, p] : h;
      }
    }
    if (Object.keys(vObj).length > 0) {
      getExtra().v = vObj;
    }
  }
  if (n.lyric?.isHyphenated) getExtra().hyp = 1;
  if (n.lyric?.isWordEnd) getExtra().we = 1;
  if (n.lyric?.translation) getExtra().tr = n.lyric.translation;
  if (n.lyric?.text && n.lyric.text !== hanlo) getExtra().text = n.lyric.text;
  if (n.lyric?.phonetic && n.lyric.phonetic !== poj) getExtra().phon = n.lyric.phonetic;

  const pitchVal = n.pitch === 'empty' ? 'e' : n.pitch;
  const arr: unknown[] = [pitchVal, n.duration, hanlo, poj, octave, acc, flags];
  if (extra) arr.push(extra);

  while (arr.length > 2) {
    const last = arr[arr.length - 1];
    if (last === '' || last === 0 || last === null || last === undefined) {
      arr.pop();
    } else {
      break;
    }
  }
  return arr;
}

/**
 * Reconstructs a full NumberedNotationNote from a compact tuple.
 */
export function decodeCompactNote(arr: unknown[], mIdx: number, nIdx: number): NumberedNotationNote {
  const pRaw = arr[0];
  const pitch: PitchNumber =
    pRaw === 'e' || pRaw === 'empty'
      ? 'empty'
      : typeof pRaw === 'number'
      ? (pRaw as PitchNumber)
      : 0;
  const duration = (typeof arr[1] === 'number' ? arr[1] : 1) as NoteDuration;
  const hanlo = typeof arr[2] === 'string' ? arr[2] : '';
  const poj = typeof arr[3] === 'string' ? arr[3] : '';
  const octave = typeof arr[4] === 'number' ? arr[4] : 0;
  const acc = arr[5] === '#' || arr[5] === 'b' ? arr[5] : '';
  const flags = typeof arr[6] === 'number' ? arr[6] : 0;
  const extra = (arr[7] && typeof arr[7] === 'object' ? arr[7] : {}) as Record<string, unknown>;

  const isDotted = Boolean(flags & 1);
  const isDoubleDotted = Boolean(flags & 2);
  const tieToNext = Boolean(flags & 4);
  const slurToNext = Boolean(flags & 8);
  const isTriplet = Boolean(flags & 16);

  const text = typeof extra.text === 'string' ? extra.text : hanlo;
  const phonetic = typeof extra.phon === 'string' ? extra.phon : poj;

  const note: NumberedNotationNote = {
    id: `n-${mIdx + 1}-${nIdx + 1}`,
    pitch,
    duration,
    octave,
    lyric: {
      hanlo,
      poj,
      hanji: hanlo,
      tl: poj,
      text,
      phonetic,
    },
  };

  if (acc) note.accidental = acc;
  if (isDotted) note.isDotted = true;
  if (isDoubleDotted) note.isDoubleDotted = true;
  if (tieToNext) {
    note.tieToNext = true;
    note.isTied = true;
  }
  if (slurToNext) note.slurToNext = true;
  if (isTriplet) note.isTriplet = true;

  if (extra.art && typeof extra.art === 'string') note.articulation = extra.art as ArticulationType;
  if (extra.ann && typeof extra.ann === 'string') note.annotation = String(extra.ann);
  if (extra.inst && typeof extra.inst === 'string') note.instrument = extra.inst as InstrumentType;
  if (Array.isArray(extra.pre) && extra.pre.length) note.preGraceNotes = extra.pre as GraceNote[];
  if (Array.isArray(extra.post) && extra.post.length) note.postGraceNotes = extra.post as GraceNote[];
  if (extra.v && typeof extra.v === 'object') {
    const lbv: Record<number, LyricSyllable> = {};
    if (hanlo || poj) {
      lbv[1] = {
        hanlo,
        poj,
        hanji: hanlo,
        tl: poj,
        text: hanlo,
        phonetic: poj,
      };
    }
    for (const [vKey, vVal] of Object.entries(extra.v as Record<string, unknown>)) {
      const vNum = parseInt(vKey, 10);
      if (isNaN(vNum)) continue;
      let h = '';
      let p = '';
      if (Array.isArray(vVal)) {
        h = String(vVal[0] || '');
        p = String(vVal[1] || '');
      } else if (typeof vVal === 'string') {
        h = vVal;
      }
      lbv[vNum] = {
        hanlo: h,
        poj: p,
        hanji: h,
        tl: p,
        text: h,
        phonetic: p,
      };
    }
    note.lyricsByVerse = lbv;
  } else if (extra.lbv && typeof extra.lbv === 'object') {
    note.lyricsByVerse = extra.lbv as Record<number, LyricSyllable>;
  }
  if (extra.hyp) note.lyric.isHyphenated = true;
  if (extra.we) note.lyric.isWordEnd = true;
  if (extra.tr) note.lyric.translation = String(extra.tr);

  return note;
}

/**
 * Encodes a Measure into a compact tuple:
 * [notes, chord, section, timeSignature, barlineType, isLineBreak, obbligatoText, isPrelude, voltaEnding]
 */
export function encodeCompactMeasure(m: Measure, songTs: TimeSignature): unknown[] {
  const notes = m.notes.map(encodeCompactNote);
  const chord = m.chord || '';
  const section = m.section || '';
  const arr: unknown[] = [notes, chord, section];
  if (m.timeSignature && m.timeSignature !== songTs) arr.push(m.timeSignature);
  else arr.push('');
  if (m.barlineType && m.barlineType !== 'single') arr.push(m.barlineType);
  else arr.push('');
  if (m.isLineBreak) arr.push(1);
  else arr.push(0);
  if (m.obbligatoText) arr.push(m.obbligatoText);
  else arr.push('');
  if (m.isPrelude) arr.push(1);
  else arr.push(0);
  if (m.voltaEnding && m.voltaEnding.length) arr.push(m.voltaEnding);

  while (arr.length > 1) {
    const last = arr[arr.length - 1];
    if (last === '' || last === 0 || last === null || last === undefined) {
      arr.pop();
    } else {
      break;
    }
  }
  return arr;
}

/**
 * Reconstructs a full Measure from a compact tuple.
 */
export function decodeCompactMeasure(arr: unknown[], mIdx: number, songTs: TimeSignature): Measure {
  const notesRaw = Array.isArray(arr[0]) ? (arr[0] as unknown[]) : [];
  const notes = notesRaw.map((n, nIdx) =>
    Array.isArray(n) ? decodeCompactNote(n, mIdx, nIdx) : (n as NumberedNotationNote)
  );
  const chord = typeof arr[1] === 'string' ? arr[1] : '';
  const section = typeof arr[2] === 'string' ? arr[2] : '';
  const timeSignature = typeof arr[3] === 'string' && arr[3] ? (arr[3] as TimeSignature) : undefined;
  const barlineType = typeof arr[4] === 'string' && arr[4] ? (arr[4] as BarlineType) : undefined;
  const isLineBreak = Boolean(arr[5]);
  const obbligatoText = typeof arr[6] === 'string' && arr[6] ? arr[6] : undefined;
  const isPrelude = Boolean(arr[7]);
  const voltaEnding = Array.isArray(arr[8]) ? (arr[8] as number[]) : undefined;

  const measure: Measure = {
    id: `m-${mIdx + 1}`,
    measureNumber: mIdx + 1,
    notes,
  };
  if (chord) measure.chord = chord;
  if (section) measure.section = section;
  if (timeSignature) measure.timeSignature = timeSignature;
  if (barlineType) measure.barlineType = barlineType;
  if (isLineBreak) measure.isLineBreak = true;
  if (obbligatoText) measure.obbligatoText = obbligatoText;
  if (isPrelude) measure.isPrelude = true;
  if (voltaEnding) measure.voltaEnding = voltaEnding;

  return measure;
}

/**
 * Encodes an entire song into Compact V2 structure.
 */
export function encodeCompactSong(song: Song): CompactSongV2 {
  const normalized = normalizeSongDurations(song);
  const songTs = normalized.timeSignature || '4/4';
  const compactMeasures = normalized.measures.map(m => encodeCompactMeasure(m, songTs));

  const compact: CompactSongV2 = {
    _c: 2,
    t: normalized.title,
    k: normalized.key,
    ts: songTs,
    b: normalized.bpm,
    m: compactMeasures,
  };

  if (normalized.subtitle) compact.s = normalized.subtitle;
  if (normalized.composer) compact.c = normalized.composer;
  if (normalized.lyricist) compact.l = normalized.lyricist;
  if (normalized.notator) compact.nt = normalized.notator;
  if (normalized.catalogNumber) compact.cat = normalized.catalogNumber;
  if (normalized.notesPerLine) compact.n = normalized.notesPerLine;
  if (normalized.orientation && normalized.orientation !== 'portrait') compact.o = normalized.orientation;
  if (normalized.description) compact.d = normalized.description;
  if (normalized.footnote) compact.fn = normalized.footnote;
  if (normalized.language && normalized.language !== 'taigi') compact.lang = normalized.language;
  if (normalized.verseCount && normalized.verseCount > 1) compact.vc = normalized.verseCount;
  if (normalized.verseDisplayOption) compact.vdo = normalized.verseDisplayOption;
  if (normalized.verseSettings && Object.keys(normalized.verseSettings).length) compact.vs = normalized.verseSettings;

  return compact;
}

/**
 * Reconstructs a full Song from a Compact V2 payload.
 */
export function decodeCompactSong(compact: CompactSongV2): Song {
  const songTs = (compact.ts || '4/4') as TimeSignature;
  const measures = (compact.m || []).map((cm, idx) =>
    Array.isArray(cm) ? decodeCompactMeasure(cm, idx, songTs) : (cm as Measure)
  );

  const song: Song = {
    id: `song-${Date.now()}`,
    title: compact.t || 'Untitled Score',
    key: (compact.k || 'C') as KeySignature,
    timeSignature: songTs,
    bpm: typeof compact.b === 'number' ? compact.b : 80,
    measures,
  };

  if (compact.s) song.subtitle = compact.s;
  if (compact.c) song.composer = compact.c;
  if (compact.l) song.lyricist = compact.l;
  if (compact.nt) song.notator = compact.nt;
  if (compact.cat) song.catalogNumber = compact.cat;
  if (compact.n) song.notesPerLine = compact.n;
  if (compact.o) song.orientation = compact.o as SheetOrientation;
  if (compact.d) song.description = compact.d;
  if (compact.fn) song.footnote = compact.fn;
  if (compact.lang) song.language = compact.lang as SongLanguage;
  if (compact.vc) song.verseCount = compact.vc;
  if (compact.vdo) song.verseDisplayOption = compact.vdo as VerseDisplayOption;
  if (compact.vs) song.verseSettings = compact.vs as any;

  const sanitized = sanitizeSong(song);
  if (!sanitized) {
    throw new Error('Failed to sanitize compact song structure');
  }
  return normalizeSongDurations(sanitized);
}

/**
 * Finds the closest library preset that a song might be based on.
 */
export function findBasePresetForSong(song: Song): Song | null {
  if (song.originalPresetId) {
    const found = PRESET_SONGS.find(p => p.id === song.originalPresetId);
    if (found) return found;
  }
  const byId = PRESET_SONGS.find(p => p.id === song.id);
  if (byId) return byId;

  const normTitle = (song.title || '').trim().toLowerCase();
  if (normTitle) {
    const byTitle = PRESET_SONGS.find(p => (p.title || '').trim().toLowerCase() === normTitle);
    if (byTitle) return byTitle;
  }
  return null;
}

/**
 * Creates a delta payload containing only modified fields and measures
 * against a baseline preset.
 */
export function createPresetDelta(song: Song, basePreset: Song): PresetDeltaPayload | null {
  const normalized = normalizeSongDurations(song);
  const normalizedBase = normalizeSongDurations(basePreset);

  const delta: PresetDeltaPayload = {
    _d: 1,
    base: basePreset.id,
  };

  if (normalized.title !== normalizedBase.title) delta.t = normalized.title;
  if (normalized.subtitle !== normalizedBase.subtitle) delta.s = normalized.subtitle;
  if (normalized.composer !== normalizedBase.composer) delta.c = normalized.composer;
  if (normalized.lyricist !== normalizedBase.lyricist) delta.l = normalized.lyricist;
  if (normalized.notator !== normalizedBase.notator) delta.nt = normalized.notator;
  if (normalized.catalogNumber !== normalizedBase.catalogNumber) delta.cat = normalized.catalogNumber;
  if (normalized.key !== normalizedBase.key) delta.k = normalized.key;
  if (normalized.timeSignature !== normalizedBase.timeSignature) delta.ts = normalized.timeSignature;
  if (normalized.bpm !== normalizedBase.bpm) delta.bpm = normalized.bpm;
  if (normalized.notesPerLine !== normalizedBase.notesPerLine) delta.npl = normalized.notesPerLine;
  if (normalized.description !== normalizedBase.description) delta.desc = normalized.description;
  if (normalized.footnote !== normalizedBase.footnote) delta.fn = normalized.footnote;
  if (normalized.orientation !== normalizedBase.orientation) delta.o = normalized.orientation;
  if (normalized.language !== normalizedBase.language) delta.lang = normalized.language;
  if (normalized.verseCount !== normalizedBase.verseCount) delta.vc = normalized.verseCount;
  if (normalized.verseDisplayOption !== normalizedBase.verseDisplayOption) delta.vdo = normalized.verseDisplayOption;
  if (JSON.stringify(normalized.verseSettings) !== JSON.stringify(normalizedBase.verseSettings)) {
    delta.vs = normalized.verseSettings;
  }

  const songTs = normalized.timeSignature || '4/4';
  if (normalized.measures.length === normalizedBase.measures.length) {
    const diff: Record<number, unknown[]> = {};
    for (let i = 0; i < normalized.measures.length; i++) {
      const smClean = cleanVal(normalized.measures[i]);
      const bmClean = cleanVal(normalizedBase.measures[i]);
      if (JSON.stringify(smClean) !== JSON.stringify(bmClean)) {
        diff[i] = encodeCompactMeasure(normalized.measures[i], songTs);
      }
    }
    const diffCount = Object.keys(diff).length;
    if (diffCount > 0) {
      if (diffCount <= Math.ceil(normalized.measures.length * 0.75)) {
        delta.diff = diff;
      } else {
        delta.m = normalized.measures.map(m => encodeCompactMeasure(m, songTs));
      }
    }
  } else {
    delta.m = normalized.measures.map(m => encodeCompactMeasure(m, songTs));
  }

  return delta;
}

/**
 * Reconstructs a full Song from a Preset Delta against its baseline preset.
 */
export function decodePresetDelta(delta: PresetDeltaPayload): Song {
  const basePreset = PRESET_SONGS.find(p => p.id === delta.base);
  if (!basePreset) {
    throw new Error(`Base preset "${delta.base}" not found for delta reconstruction`);
  }

  const song: Song = JSON.parse(JSON.stringify(basePreset));
  song.id = `song-delta-${Date.now()}`;
  song.originalPresetId = delta.base;

  if (typeof delta.t === 'string') song.title = delta.t;
  if (typeof delta.s === 'string') song.subtitle = delta.s;
  if (typeof delta.c === 'string') song.composer = delta.c;
  if (typeof delta.l === 'string') song.lyricist = delta.l;
  if (typeof delta.nt === 'string') song.notator = delta.nt;
  if (typeof delta.cat === 'string') song.catalogNumber = delta.cat;
  if (typeof delta.k === 'string') song.key = delta.k as KeySignature;
  if (typeof delta.ts === 'string') song.timeSignature = delta.ts as TimeSignature;
  if (typeof delta.bpm === 'number') song.bpm = delta.bpm;
  if (typeof delta.npl === 'number') song.notesPerLine = delta.npl;
  if (typeof delta.desc === 'string') song.description = delta.desc;
  if (typeof delta.fn === 'string') song.footnote = delta.fn;
  if (typeof delta.o === 'string') song.orientation = delta.o as SheetOrientation;
  if (typeof delta.lang === 'string') song.language = delta.lang as SongLanguage;
  if (typeof delta.vc === 'number') song.verseCount = delta.vc;
  if (typeof delta.vdo === 'string') song.verseDisplayOption = delta.vdo as VerseDisplayOption;
  if (delta.vs && typeof delta.vs === 'object') song.verseSettings = delta.vs as any;

  if (delta.diff && typeof delta.diff === 'object') {
    for (const [key, compactMeas] of Object.entries(delta.diff)) {
      const idx = parseInt(key, 10);
      if (!isNaN(idx) && idx >= 0 && Array.isArray(compactMeas)) {
        song.measures[idx] = decodeCompactMeasure(compactMeas, idx, song.timeSignature);
      }
    }
  } else if (Array.isArray(delta.m)) {
    song.measures = delta.m.map((cm, idx) =>
      Array.isArray(cm) ? decodeCompactMeasure(cm, idx, song.timeSignature) : (cm as Measure)
    );
  }

  const sanitized = sanitizeSong(song);
  if (!sanitized) {
    throw new Error('Failed to sanitize reconstructed delta song');
  }
  return normalizeSongDurations(sanitized);
}

/**
 * Universal binary Uint8Array to URL-safe Base64URL string (RFC 4648 §5).
 * Safe for URL hash fragments without requiring percent-encoding.
 * Compatible with all browsers including iOS/iPadOS Safari WebKit.
 */
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  // In browser environments, always use native btoa. This completely avoids browser
  // Buffer polyfill quirks (e.g. throwing "Unknown encoding: base64url").
  if (typeof window !== 'undefined' && typeof btoa === 'function') {
    let binary = '';
    const len = bytes.length;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  // In Node.js or server-side runtimes, use native Buffer with standard 'base64'
  if (typeof Buffer !== 'undefined') {
    try {
      const b64 = Buffer.from(bytes).toString('base64');
      return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    } catch {
      // Fallback to btoa
    }
  }

  // Universal fallback
  let binary = '';
  const len = bytes.length;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = typeof btoa === 'function' ? btoa(binary) : '';
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Universal Base64URL string to Uint8Array.
 */
export function base64UrlToUint8Array(base64url: string): Uint8Array {
  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4 !== 0) {
    base64 += '=';
  }

  // In browser environments, always use native atob
  if (typeof window !== 'undefined' && typeof atob === 'function') {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // In Node.js, use Buffer
  if (typeof Buffer !== 'undefined') {
    try {
      return new Uint8Array(Buffer.from(base64, 'base64'));
    } catch {
      // Fallback
    }
  }

  // Universal fallback
  if (typeof atob === 'function') {
    const binary = atob(base64);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  return new Uint8Array(0);
}

// Maximum supported sizes to protect against memory explosion, zip bombs, or CPU pegging
const MAX_URL_PAYLOAD_CHARS = 300_000;      // 300KB maximum base64 URL payload string
const MAX_DECOMPRESSED_BYTES = 5 * 1024 * 1024; // 5MB maximum decompressed JSON text
const MAX_COMPRESSED_BYTES = 2 * 1024 * 1024;   // 2MB maximum compressed binary stream

function withTimeout<T>(promise: Promise<T>, ms: number, errorMsg: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(errorMsg)), ms);
    promise.then(
      res => {
        clearTimeout(timer);
        resolve(res);
      },
      err => {
        clearTimeout(timer);
        reject(err);
      }
    );
  });
}

async function tryCompressWithStream(
  uncompressedBytes: Uint8Array,
  format: 'deflate-raw' | 'gzip' | 'deflate'
): Promise<Uint8Array> {
  // Method 1: Modern Blob stream pipeThrough (standard in Safari 16.4+, Chrome, Firefox, Node 18+)
  if (typeof Blob !== 'undefined' && typeof Response !== 'undefined') {
    try {
      const blob = new Blob([uncompressedBytes as unknown as BlobPart]);
      if (typeof blob.stream === 'function') {
        const cs = new CompressionStream(format);
        const stream = blob.stream().pipeThrough(cs);
        const buffer = await new Response(stream).arrayBuffer();
        return new Uint8Array(buffer);
      }
    } catch (pipeErr) {
      // If format is unsupported (e.g. 'deflate-raw' in Safari), rethrow so fallback format is tried
      if (pipeErr instanceof TypeError && format === 'deflate-raw') {
        throw pipeErr;
      }
      // Otherwise fall through to manual writer/reader
    }
  }

  // Method 2: Manual stream writer/reader fallback with resource release guards
  const cs = new CompressionStream(format);
  const writer = cs.writable.getWriter();
  const writePromise = writer
    .write(uncompressedBytes as unknown as BufferSource)
    .then(() => writer.close())
    .catch(() => {});

  const reader = cs.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.byteLength;
        if (totalLength > MAX_COMPRESSED_BYTES) {
          await reader.cancel('Compressed size exceeds safety threshold');
          throw new Error('Compressed song payload exceeds maximum size limit (2MB)');
        }
      }
    }
    await writePromise;
  } catch (streamErr) {
    try {
      await reader.cancel();
    } catch {
      // ignore secondary cancel error
    }
    throw streamErr;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

/**
 * Compresses an arbitrary string using native CompressionStream('deflate-raw')
 * with graceful fallback to 'gzip', 'deflate', or uncompressed UTF-8 bytes.
 */
export async function compressString(text: string): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  const uncompressedBytes = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'undefined') {
    return { bytes: uncompressedBytes, compressed: false };
  }

  // 1. Primary: deflate-raw (most compact for base64url payloads)
  try {
    const bytes = await withTimeout(
      tryCompressWithStream(uncompressedBytes, 'deflate-raw'),
      500,
      'CompressionStream (deflate-raw) timed out'
    );
    return { bytes, compressed: true };
  } catch {
    // 2. Secondary fallback: gzip (universal in Safari 16.4+, Chrome, Firefox)
    try {
      const bytes = await withTimeout(
        tryCompressWithStream(uncompressedBytes, 'gzip'),
        500,
        'CompressionStream (gzip) timed out'
      );
      return { bytes, compressed: true };
    } catch {
      // 3. Tertiary fallback: standard deflate (zlib format)
      try {
        const bytes = await withTimeout(
          tryCompressWithStream(uncompressedBytes, 'deflate'),
          500,
          'CompressionStream (deflate) timed out'
        );
        return { bytes, compressed: true };
      } catch (err) {
        console.warn('[compressString] All compression formats failed, falling back to raw bytes:', err);
        return { bytes: uncompressedBytes, compressed: false };
      }
    }
  }
}

async function tryDecompressWithStream(
  bytes: Uint8Array,
  format: 'deflate-raw' | 'gzip' | 'deflate'
): Promise<string> {
  // Method 1: Modern Blob stream pipeThrough
  if (typeof Blob !== 'undefined' && typeof Response !== 'undefined') {
    try {
      const blob = new Blob([bytes as unknown as BlobPart]);
      if (typeof blob.stream === 'function') {
        const ds = new DecompressionStream(format);
        const stream = blob.stream().pipeThrough(ds);
        return await new Response(stream).text();
      }
    } catch (pipeErr) {
      if (pipeErr instanceof TypeError && format === 'deflate-raw') {
        throw pipeErr;
      }
    }
  }

  // Method 2: Manual stream writer/reader fallback with memory & zip-bomb protection
  const ds = new DecompressionStream(format);
  const writer = ds.writable.getWriter();
  const writePromise = writer
    .write(bytes as unknown as BufferSource)
    .then(() => writer.close())
    .catch(() => {});

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        totalLength += value.byteLength;
        if (totalLength > MAX_DECOMPRESSED_BYTES) {
          await reader.cancel('Decompressed size exceeds safety threshold');
          throw new Error('Decompressed song payload exceeds maximum size limit (5MB)');
        }
      }
    }
    await writePromise;
  } catch (streamErr) {
    try {
      await reader.cancel();
    } catch {
      // ignore secondary cancel error
    }
    throw streamErr;
  } finally {
    try {
      reader.releaseLock();
    } catch {
      // ignore
    }
  }

  const combined = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(combined);
}

/**
 * Decompresses Uint8Array bytes using DecompressionStream('deflate-raw'),
 * with fallbacks to 'gzip', 'deflate', and raw UTF-8 text decoding.
 */
export async function decompressBytes(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    // 1. Try deflate-raw
    try {
      return await withTimeout(
        tryDecompressWithStream(bytes, 'deflate-raw'),
        500,
        'DecompressionStream (deflate-raw) timed out'
      );
    } catch {
      // 2. Try gzip
      try {
        return await withTimeout(
          tryDecompressWithStream(bytes, 'gzip'),
          500,
          'DecompressionStream (gzip) timed out'
        );
      } catch {
        // 3. Try standard deflate
        try {
          return await withTimeout(
            tryDecompressWithStream(bytes, 'deflate'),
            500,
            'DecompressionStream (deflate) timed out'
          );
        } catch {
          // Fall through to plain text
        }
      }
    }
  }

  // 4. Fallback: treat as raw UTF-8 string
  return new TextDecoder().decode(bytes);
}

/**
 * Encode a song into either a preset ID reference or a compressed base64url payload.
 * Fully guarded against unexpected failures with multi-tier fallbacks.
 */
export async function encodeSongToUrlPayload(
  song: Song
): Promise<{ type: 'preset'; id: string } | { type: 'song'; payload: string; format?: 'delta' | 'compact' | 'legacy' }> {
  try {
    const isFactoryPreset = PRESET_SONGS.some(p => p.id === song.id);
    if (isFactoryPreset && !isSongModifiedFromPreset(song)) {
      return { type: 'preset', id: song.id };
    }

    // Check if song can be encoded as a Preset Delta
    const basePreset = findBasePresetForSong(song);
    let deltaBase64: string | null = null;
    let deltaBytesLen = Infinity;

    if (basePreset) {
      if (!isSongModifiedFromPreset(song)) {
        return { type: 'preset', id: basePreset.id };
      }
      try {
        const delta = createPresetDelta(song, basePreset);
        if (delta) {
          const deltaJson = JSON.stringify(delta);
          const { bytes } = await compressString(deltaJson);
          deltaBase64 = uint8ArrayToBase64Url(bytes);
          deltaBytesLen = bytes.length;
        }
      } catch (deltaErr) {
        console.warn('[encodeSongToUrlPayload] Preset delta encoding failed, falling back to compact format:', deltaErr);
      }
    }

    // Try V2 Compact encoding
    let compactBase64: string | null = null;
    let compactBytesLen = Infinity;
    try {
      const compactSong = encodeCompactSong(song);
      const compactJson = JSON.stringify(compactSong);
      const { bytes } = await compressString(compactJson);
      compactBase64 = uint8ArrayToBase64Url(bytes);
      compactBytesLen = bytes.length;
    } catch (compactErr) {
      console.warn('[encodeSongToUrlPayload] Compact V2 encoding failed:', compactErr);
    }

    // Pick smallest format between delta and compact
    if (deltaBase64 && deltaBytesLen <= compactBytesLen) {
      return { type: 'song', payload: deltaBase64, format: 'delta' };
    }

    if (compactBase64) {
      return { type: 'song', payload: compactBase64, format: 'compact' };
    }

    // Fallback: cleaned JSON
    let cleaned: Record<string, unknown>;
    try {
      cleaned = cleanSongForUrl(song);
    } catch {
      cleaned = normalizeSongDurations(song) as unknown as Record<string, unknown>;
    }
    const jsonStr = JSON.stringify(cleaned);
    const { bytes } = await compressString(jsonStr);
    return { type: 'song', payload: uint8ArrayToBase64Url(bytes), format: 'legacy' };
  } catch (err) {
    console.error('[encodeSongToUrlPayload] Unexpected error encoding song to URL, falling back to raw JSON:', err);
    const rawBytes = new TextEncoder().encode(JSON.stringify(normalizeSongDurations(song)));
    return { type: 'song', payload: uint8ArrayToBase64Url(rawBytes), format: 'legacy' };
  }
}

/**
 * Decode a base64url payload back into a validated and normalized Song.
 */
export async function decodeSongFromUrlPayload(payload: string): Promise<Song> {
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new Error('Empty song URL payload');
  }

  if (trimmed.length > MAX_URL_PAYLOAD_CHARS) {
    throw new Error(`Song URL payload exceeds maximum safe length (${MAX_URL_PAYLOAD_CHARS} chars)`);
  }

  let text: string;
  try {
    const bytes = base64UrlToUint8Array(trimmed);
    text = await decompressBytes(bytes);
  } catch {
    // If base64 decoding fails, try URL decode component in case it was encoded as plain JSON
    try {
      text = decodeURIComponent(trimmed);
    } catch {
      text = trimmed;
    }
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (parseErr) {
    try {
      parsed = JSON.parse(decodeURIComponent(trimmed));
    } catch {
      throw new Error(`Failed to parse song JSON from URL payload: ${(parseErr as Error).message}`);
    }
  }

  if (parsed && typeof parsed === 'object') {
    const obj = parsed as Record<string, unknown>;
    // Check if Preset Delta format (_d: 1)
    if (obj._d === 1 && typeof obj.base === 'string') {
      return decodePresetDelta(obj as unknown as PresetDeltaPayload);
    }
    // Check if Compact V2 format (_c: 2)
    if (obj._c === 2 && Array.isArray(obj.m)) {
      return decodeCompactSong(obj as unknown as CompactSongV2);
    }
    // Legacy format
    if (!obj.id || typeof obj.id !== 'string' || !obj.id.trim()) {
      obj.id = `song-${Date.now()}`;
    }
  }

  const sanitized = sanitizeSong(parsed);
  if (!sanitized) {
    throw new Error('Invalid song data structure in URL payload: missing title or measures');
  }

  return normalizeSongDurations(sanitized);
}

/**
 * Generate a complete, shareable Easy Composer URL for the given song.
 * Uses client-side hash fragments (#song=... or #preset=...) to guarantee static
 * host compatibility and immunity to HTTP 414/431 URI length restrictions.
 */
export async function createShareableSongUrl(
  song: Song,
  customOrigin?: string
): Promise<ShareUrlResult> {
  const encoded = await encodeSongToUrlPayload(song);

  let base = customOrigin;
  if (!base && typeof window !== 'undefined') {
    base = `${window.location.origin}${window.location.pathname}`;
  }
  if (!base) {
    base = 'https://cyberpraise.github.io/easy-composer/';
  }

  // Ensure trailing slash or clean path without existing hash or search params
  let cleanBase = base.split('#')[0].split('?')[0];
  if (!cleanBase.endsWith('/') && !/\.[a-zA-Z0-9]+$/.test(cleanBase)) {
    cleanBase += '/';
  }

  if (encoded.type === 'preset') {
    const url = `${cleanBase}#preset=${encodeURIComponent(encoded.id)}`;
    return {
      url,
      isPreset: true,
      payloadSize: url.length,
      format: 'preset',
    };
  }

  const url = `${cleanBase}#song=${encoded.payload}`;
  return {
    url,
    isPreset: false,
    payloadSize: encoded.payload.length,
    format: encoded.format || 'compact',
  };
}

/**
 * Extracts preset or song payload from URL hash or query params.
 * Hash is prioritized (#preset= / #song= / #data=), falling back to search params.
 */
export function extractSongParamsFromUrl(
  urlOrLocation?: string | Location
): { presetId?: string; songPayload?: string } | null {
  let hashStr = '';
  let searchStr = '';

  if (typeof urlOrLocation === 'object' && urlOrLocation !== null && 'hash' in urlOrLocation) {
    hashStr = urlOrLocation.hash || '';
    searchStr = urlOrLocation.search || '';
  } else if (typeof urlOrLocation === 'string') {
    try {
      const parsedUrl = new URL(urlOrLocation, 'http://localhost');
      hashStr = parsedUrl.hash || '';
      searchStr = parsedUrl.search || '';
    } catch {
      // Fallback manual split
      const hashSplit = urlOrLocation.split('#');
      if (hashSplit.length > 1) hashStr = `#${hashSplit[1]}`;
      const searchSplit = hashSplit[0].split('?');
      if (searchSplit.length > 1) searchStr = `?${searchSplit[1]}`;
    }
  } else if (typeof window !== 'undefined') {
    hashStr = window.location.hash || '';
    searchStr = window.location.search || '';
  }

  // 1. Check Hash params first (standard)
  if (hashStr && hashStr.length > 1) {
    const cleanHash = hashStr.startsWith('#') ? hashStr.slice(1) : hashStr;
    const hashParams = new URLSearchParams(cleanHash);
    const presetId = hashParams.get('preset');
    if (presetId) return { presetId };
    const songPayload = hashParams.get('song') || hashParams.get('data');
    if (songPayload) return { songPayload };
  }

  // 2. Fallback to Search params (?preset= / ?song=)
  if (searchStr && searchStr.length > 1) {
    const searchParams = new URLSearchParams(searchStr);
    const presetId = searchParams.get('preset');
    if (presetId) return { presetId };
    const songPayload = searchParams.get('song') || searchParams.get('data');
    if (songPayload) return { songPayload };
  }

  return null;
}

/**
 * Parses and returns a Song if the current URL or provided string contains a shared score.
 */
export async function parseSongFromUrl(
  urlOrLocation?: string | Location
): Promise<ParsedSongUrlResult | null> {
  const extracted = extractSongParamsFromUrl(urlOrLocation);
  if (!extracted) return null;

  if (extracted.presetId) {
    const matchingPreset = PRESET_SONGS.find(p => p.id === extracted.presetId);
    if (matchingPreset) {
      return {
        type: 'preset',
        song: matchingPreset,
        isPreset: true,
      };
    }
  }

  if (extracted.songPayload) {
    try {
      const song = await decodeSongFromUrlPayload(extracted.songPayload);
      return {
        type: 'song',
        song,
        isPreset: false,
      };
    } catch (err) {
      console.error('[parseSongFromUrl] Failed to decode shared song from URL:', err);
      throw err;
    }
  }

  return null;
}

/**
 * Copies text to the system clipboard with multi-tier fallback for iPadOS Safari
 * and restricted iframe/focus contexts.
 */
export async function copySongUrlToClipboard(text: string): Promise<boolean> {
  if (typeof window === 'undefined') return false;

  // Modern Clipboard API
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[copySongUrlToClipboard] navigator.clipboard failed, attempting textarea fallback:', err);
  }

  // Fallback for Mobile WebKit / Safari
  try {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.top = '0';
    textArea.style.left = '-9999px';
    textArea.style.fontSize = '16px'; // Prevent Mobile Safari auto-zoom
    textArea.setAttribute('readonly', '');
    document.body.appendChild(textArea);
    textArea.select();
    textArea.setSelectionRange(0, text.length);
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    return successful;
  } catch (fallbackErr) {
    console.error('[copySongUrlToClipboard] Fallback execCommand failed:', fallbackErr);
    return false;
  }
}
