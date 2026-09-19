import type { Song } from '../types/song.ts';
import { PRESET_SONGS } from './presets.ts';
import { isSongModifiedFromPreset } from './indexedDb.ts';
import { sanitizeSong } from './songParser.ts';
import { normalizeSongDurations } from './taigiUtils.ts';

export interface ShareUrlResult {
  url: string;
  isPreset: boolean;
  payloadSize: number;
}

export type ParsedSongUrlResult =
  | { type: 'preset'; song: Song; isPreset: true }
  | { type: 'song'; song: Song; isPreset: false };

/**
 * Strips empty strings, default zeros, and empty lyric shells from song objects
 * to minimize the compressed JSON payload size before encoding into the URL.
 */
export function cleanSongForUrl(song: Song): Record<string, unknown> {
  const normalized = normalizeSongDurations(song);

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
          if (!l.poj && !l.hanlo && !l.hanji && !l.custom && !l.tl) continue;
        }
        if (typeof v === 'object') {
          const cleanedChild = cleanVal(v);
          if (k !== 'measures' && Array.isArray(cleanedChild) && cleanedChild.length === 0) continue;
          if (cleanedChild && typeof cleanedChild === 'object' && Object.keys(cleanedChild).length === 0) continue;
          out[k] = cleanedChild;
        } else {
          out[k] = v;
        }
      }
      return out;
    }
    return val;
  }

  return cleanVal(normalized) as Record<string, unknown>;
}

/**
 * Universal binary Uint8Array to URL-safe Base64URL string (RFC 4648 §5).
 * Safe for URL hash fragments without requiring percent-encoding.
 */
export function uint8ArrayToBase64Url(bytes: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(bytes).toString('base64url');
  }
  let binary = '';
  const len = bytes.byteLength;
  const CHUNK_SIZE = 8192;
  for (let i = 0; i < len; i += CHUNK_SIZE) {
    const chunk = bytes.subarray(i, i + CHUNK_SIZE);
    binary += String.fromCharCode.apply(null, chunk as unknown as number[]);
  }
  const base64 = btoa(binary);
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
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(base64, 'base64'));
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

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

async function tryCompress(uncompressedBytes: Uint8Array, format: 'deflate-raw' | 'gzip'): Promise<Uint8Array> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(uncompressedBytes);
      controller.close();
    },
  }).pipeThrough(new CompressionStream(format));

  const bufPromise = new Response(stream).arrayBuffer();
  const buf = await withTimeout(bufPromise, 2500, `CompressionStream (${format}) timed out`);
  return new Uint8Array(buf);
}

/**
 * Compresses an arbitrary string using native CompressionStream('deflate-raw')
 * with graceful fallback to uncompressed UTF-8 bytes if CompressionStream is unavailable.
 */
export async function compressString(text: string): Promise<{ bytes: Uint8Array; compressed: boolean }> {
  const uncompressedBytes = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'undefined') {
    return { bytes: uncompressedBytes, compressed: false };
  }

  try {
    const bytes = await tryCompress(uncompressedBytes, 'deflate-raw');
    return { bytes, compressed: true };
  } catch {
    try {
      const bytes = await tryCompress(uncompressedBytes, 'gzip');
      return { bytes, compressed: true };
    } catch (err) {
      console.warn('[compressString] compression failed, falling back to raw bytes:', err);
      return { bytes: uncompressedBytes, compressed: false };
    }
  }
}

async function tryDecompress(bytes: Uint8Array, format: 'deflate-raw' | 'gzip'): Promise<string> {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  }).pipeThrough(new DecompressionStream(format));

  const bufPromise = new Response(stream).arrayBuffer();
  const buf = await withTimeout(bufPromise, 2500, `DecompressionStream (${format}) timed out`);
  return new TextDecoder().decode(buf);
}

/**
 * Decompresses Uint8Array bytes using DecompressionStream('deflate-raw'),
 * with fallbacks to 'gzip' and raw UTF-8 text decoding.
 */
export async function decompressBytes(bytes: Uint8Array): Promise<string> {
  if (typeof DecompressionStream !== 'undefined') {
    // 1. Try deflate-raw
    try {
      return await tryDecompress(bytes, 'deflate-raw');
    } catch {
      // 2. Try gzip
      try {
        return await tryDecompress(bytes, 'gzip');
      } catch {
        // Fall through to plain text
      }
    }
  }

  // 3. Fallback: treat as raw UTF-8 string
  return new TextDecoder().decode(bytes);
}

/**
 * Encode a song into either a preset ID reference or a compressed base64url payload.
 */
export async function encodeSongToUrlPayload(
  song: Song
): Promise<{ type: 'preset'; id: string } | { type: 'song'; payload: string }> {
  const isFactoryPreset = PRESET_SONGS.some(p => p.id === song.id);
  if (isFactoryPreset && !isSongModifiedFromPreset(song)) {
    return { type: 'preset', id: song.id };
  }

  const cleaned = cleanSongForUrl(song);
  const jsonStr = JSON.stringify(cleaned);
  const { bytes } = await compressString(jsonStr);
  const base64url = uint8ArrayToBase64Url(bytes);

  return { type: 'song', payload: base64url };
}

/**
 * Decode a base64url payload back into a validated and normalized Song.
 */
export async function decodeSongFromUrlPayload(payload: string): Promise<Song> {
  const trimmed = payload.trim();
  if (!trimmed) {
    throw new Error('Empty song URL payload');
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
    };
  }

  const url = `${cleanBase}#song=${encoded.payload}`;
  return {
    url,
    isPreset: false,
    payloadSize: encoded.payload.length,
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
