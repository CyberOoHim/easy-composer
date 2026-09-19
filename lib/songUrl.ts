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

  return cleanVal(normalized) as Record<string, unknown>;
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
): Promise<{ type: 'preset'; id: string } | { type: 'song'; payload: string }> {
  try {
    const isFactoryPreset = PRESET_SONGS.some(p => p.id === song.id);
    if (isFactoryPreset && !isSongModifiedFromPreset(song)) {
      return { type: 'preset', id: song.id };
    }

    let cleaned: Record<string, unknown>;
    try {
      cleaned = cleanSongForUrl(song);
    } catch (cleanErr) {
      console.warn('[encodeSongToUrlPayload] cleanSongForUrl failed, using normalized song:', cleanErr);
      cleaned = normalizeSongDurations(song) as unknown as Record<string, unknown>;
    }

    const jsonStr = JSON.stringify(cleaned);
    const { bytes } = await compressString(jsonStr);
    const base64url = uint8ArrayToBase64Url(bytes);

    return { type: 'song', payload: base64url };
  } catch (err) {
    console.error('[encodeSongToUrlPayload] Unexpected error encoding song to URL, falling back to raw JSON:', err);
    const rawBytes = new TextEncoder().encode(JSON.stringify(normalizeSongDurations(song)));
    const fallbackBase64 = uint8ArrayToBase64Url(rawBytes);
    return { type: 'song', payload: fallbackBase64 };
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
