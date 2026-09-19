'use client';

import type { Song } from '../types/song.ts';
import { PRESET_SONGS } from './presets.ts';
import { sanitizeSong } from './songParser.ts';
import { normalizeSongDurations } from './taigiUtils.ts';

export const DB_NAME = 'taigi_composer_db';
export const DB_VERSION = 1;

export const STORES = {
  SONGS: 'songs',
  META: 'meta',
} as const;

export const META_KEYS = {
  ACTIVE_SONG_ID: 'active_song_id',
  LAST_ACTIVE_SONG: 'last_active_song',
  LOCALSTORAGE_MIGRATED: 'localstorage_migrated',
} as const;

export interface StoredSongRecord extends Song {
  updatedAt: number;
  isPresetModified?: boolean;
  originalPresetId?: string;
}

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase> | null = null;

/** Test-only: drop the cached connection so specs can install a fresh mock. */
export function resetDBInstanceForTests(): void {
  dbInstance = null;
  dbPromise = null;
}

/**
 * Check whether IndexedDB is supported in the current environment
 */
export function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined';
}

/**
 * Open and initialize the IndexedDB database instance
 */
export function initDB(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment'));
  }

  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // 1. Store: 'songs' (all user-created songs & modified preset overrides)
      if (!db.objectStoreNames.contains(STORES.SONGS)) {
        const songStore = db.createObjectStore(STORES.SONGS, { keyPath: 'id' });
        songStore.createIndex('updatedAt', 'updatedAt', { unique: false });
        songStore.createIndex('isPresetModified', 'isPresetModified', { unique: false });
        songStore.createIndex('originalPresetId', 'originalPresetId', { unique: false });
      }

      // 2. Store: 'meta' (key-value metadata: active_song_id, last_active_song, etc.)
      if (!db.objectStoreNames.contains(STORES.META)) {
        db.createObjectStore(STORES.META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // Clear cached instance if database connection unexpectedly closes
      dbInstance.onclose = () => {
        dbInstance = null;
        dbPromise = null;
      };
      resolve(dbInstance);
    };

    request.onerror = () => {
      dbPromise = null;
      console.error('[IndexedDB] Failed to open database:', request.error);
      reject(request.error || new Error('Failed to open database'));
    };
  });

  return dbPromise;
}

function optionalText(value: string | undefined): string {
  return value ?? '';
}

function stableJson(value: unknown): string {
  return JSON.stringify(value ?? null);
}

/**
 * Helper to determine whether a given song differs from its original factory preset.
 * Metadata fields that used to be ignored (notator, catalog, verses, orientation)
 * must count as modifications so those edits are persisted as overrides.
 */
export function isSongModifiedFromPreset(song: Song | null | undefined): boolean {
  if (!song) return false;
  const preset = PRESET_SONGS.find(p => p.id === song.id);
  if (!preset) return false;

  try {
    if (
      song.title !== preset.title ||
      optionalText(song.subtitle) !== optionalText(preset.subtitle) ||
      optionalText(song.composer) !== optionalText(preset.composer) ||
      optionalText(song.lyricist) !== optionalText(preset.lyricist) ||
      optionalText(song.notator) !== optionalText(preset.notator) ||
      optionalText(song.catalogNumber) !== optionalText(preset.catalogNumber) ||
      optionalText(song.description) !== optionalText(preset.description) ||
      optionalText(song.footnote) !== optionalText(preset.footnote) ||
      song.key !== preset.key ||
      song.timeSignature !== preset.timeSignature ||
      song.bpm !== preset.bpm ||
      song.notesPerLine !== preset.notesPerLine ||
      song.orientation !== preset.orientation ||
      song.verseCount !== preset.verseCount ||
      song.verseDisplayOption !== preset.verseDisplayOption ||
      stableJson(song.verseSettings) !== stableJson(preset.verseSettings)
    ) {
      return true;
    }

    const songMeasures = normalizeSongDurations(song).measures;
    const presetMeasures = normalizeSongDurations(preset).measures;
    return JSON.stringify(songMeasures) !== JSON.stringify(presetMeasures);
  } catch {
    return true;
  }
}

export function isFactoryPresetId(id: string): boolean {
  return PRESET_SONGS.some(p => p.id === id);
}

/**
 * Factory presets are code, not user data. An unmodified preset snapshot
 * must resolve back to PRESET_SONGS so app updates are not shadowed.
 */
export function canonicalizeStoredSong(song: Song | null | undefined): Song | null {
  if (!song) return null;
  const factory = PRESET_SONGS.find(p => p.id === song.id);
  if (factory && !isSongModifiedFromPreset(song)) return factory;
  return song;
}

export function shouldPersistSongBody(song: Song): boolean {
  if (!isFactoryPresetId(song.id)) return true;
  return isSongModifiedFromPreset(song);
}

/**
 * A stored preset row is a user override only when it was saved as modified.
 * Legacy unmodified snapshots (isPresetModified !== true) must not hide factory
 * updates even if they now differ from PRESET_SONGS after an app update.
 */
export function isStoredPresetOverride(song: Song | null | undefined): boolean {
  if (!song || !isFactoryPresetId(song.id)) return false;
  if (song.isPresetModified !== true) return false;
  return isSongModifiedFromPreset(song);
}

export function getSongUpdatedAt(song: Song | null | undefined): number {
  if (!song || typeof song.updatedAt !== 'number' || !Number.isFinite(song.updatedAt)) {
    return 0;
  }
  return song.updatedAt;
}

/**
 * Choose the song to restore on bootstrap.
 * Unmodified factory snapshots in localStorage never beat code presets.
 * Otherwise the newer `updatedAt` wins so a crash draft can outrank a stale IDB row.
 */
export function pickBootstrapSong(
  idbSong: Song | null,
  localSong: Song | null,
): { song: Song; fromLocalDraft: boolean } {
  const canonIdb = canonicalizeStoredSong(idbSong);
  const canonLocal = canonicalizeStoredSong(localSong);
  const localIsUnmodifiedPreset = Boolean(
    localSong && isFactoryPresetId(localSong.id) && !isSongModifiedFromPreset(localSong)
  );

  if (localIsUnmodifiedPreset) {
    return { song: canonIdb ?? canonLocal ?? PRESET_SONGS[0], fromLocalDraft: false };
  }

  if (localSong && (!idbSong || getSongUpdatedAt(localSong) > getSongUpdatedAt(idbSong))) {
    return { song: canonLocal ?? localSong, fromLocalDraft: true };
  }

  return { song: canonIdb ?? canonLocal ?? PRESET_SONGS[0], fromLocalDraft: false };
}

/**
 * Settle a write only after the transaction commits. IDBRequest.onsuccess is not durable.
 */
function requestTransactionComplete(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      fn();
    };
    tx.oncomplete = () => settle(() => resolve());
    tx.onerror = () =>
      settle(() => reject(tx.error || new Error('IndexedDB transaction failed')));
    tx.onabort = () =>
      settle(() => reject(tx.error || new Error('IndexedDB transaction aborted')));
  });
}

/**
 * Validate that a stored record has the minimum required structure of a Song
 * and return a normalized copy (legacy lyric aliases migrated, lyric object guaranteed).
 */
export function validateSongRecord(record: unknown): Song | null {
  return sanitizeSong(record);
}

/**
 * Save a song (newly created or modified preset) into IndexedDB
 */
export async function saveSongToDB(
  song: Song,
  options?: { isPresetModified?: boolean; originalPresetId?: string }
): Promise<void> {
  if (!isIndexedDBSupported()) return;

  const isPreset = isFactoryPresetId(song.id);
  const isModified = options?.isPresetModified ?? (isPreset ? isSongModifiedFromPreset(song) : false);

  // Factory scores live in code. Do not shadow them with unmodified snapshots.
  if (isPreset && !isModified) {
    await deleteSongFromDB(song.id);
    return;
  }

  const db = await initDB();
  const record: StoredSongRecord = {
    ...song,
    updatedAt: Date.now(),
    isPresetModified: isModified,
    originalPresetId: isPreset ? song.id : options?.originalPresetId,
  };

  const tx = db.transaction([STORES.SONGS], 'readwrite');
  const done = requestTransactionComplete(tx);
  tx.objectStore(STORES.SONGS).put(record);
  try {
    await done;
  } catch (err) {
    console.error('[IndexedDB] Failed to save song:', err);
    throw err;
  }
}

/**
 * Retrieve a song by ID from IndexedDB
 */
export async function getSongFromDB(id: string): Promise<Song | null> {
  if (!isIndexedDBSupported()) return null;

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SONGS], 'readonly');
    const store = tx.objectStore(STORES.SONGS);
    const request = store.get(id);

    request.onsuccess = () => {
      const valid = validateSongRecord(request.result);
      resolve(valid);
    };

    request.onerror = () => {
      console.error(`[IndexedDB] Failed to read song "${id}":`, request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieve all songs stored in IndexedDB, sorted by updatedAt descending (newest first)
 */
export async function getAllSongsFromDB(): Promise<Song[]> {
  if (!isIndexedDBSupported()) return [];

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SONGS], 'readonly');
    const store = tx.objectStore(STORES.SONGS);
    const request = store.getAll();

    request.onsuccess = () => {
      const rawRecords = (request.result as unknown[]) || [];
      const records: StoredSongRecord[] = [];
      for (const item of rawRecords) {
        const valid = validateSongRecord(item);
        if (valid) {
          records.push(valid as StoredSongRecord);
        }
      }
      records.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(records);
    };

    request.onerror = () => {
      console.error('[IndexedDB] Failed to get all songs:', request.error);
      reject(request.error);
    };
  });
}

/**
 * Retrieve only custom user songs (not modified preset overrides)
 */
export async function getCustomSongsFromDB(): Promise<Song[]> {
  const all = await getAllSongsFromDB();
  const presetIds = new Set(PRESET_SONGS.map(p => p.id));
  return all.filter(s => !presetIds.has(s.id));
}

/**
 * Retrieve all modified preset songs
 */
export async function getModifiedPresetsFromDB(): Promise<Song[]> {
  const all = await getAllSongsFromDB();
  return all.filter(s => isStoredPresetOverride(s));
}

/**
 * Get set of preset IDs that have user modifications in IndexedDB
 */
export async function getModifiedPresetIds(): Promise<Set<string>> {
  const modifiedPresets = await getModifiedPresetsFromDB();
  return new Set(modifiedPresets.map(p => p.id));
}

/**
 * Delete a song from IndexedDB
 */
export async function deleteSongFromDB(id: string): Promise<void> {
  if (!isIndexedDBSupported()) return;

  const db = await initDB();
  const tx = db.transaction([STORES.SONGS], 'readwrite');
  const done = requestTransactionComplete(tx);
  tx.objectStore(STORES.SONGS).delete(id);
  try {
    await done;
  } catch (err) {
    console.error(`[IndexedDB] Failed to delete song "${id}":`, err);
    throw err;
  }
}

/**
 * Reset a preset song to factory default (removes user modification from IndexedDB)
 */
export async function resetPresetToFactory(presetId: string): Promise<Song | null> {
  const original = PRESET_SONGS.find(p => p.id === presetId);
  if (!original) return null;

  await deleteSongFromDB(presetId);
  return original;
}

/**
 * Reset all preset songs to factory defaults (removes all preset modifications from IndexedDB)
 */
export async function resetAllPresetsToFactory(): Promise<void> {
  if (!isIndexedDBSupported()) return;

  const db = await initDB();
  const tx = db.transaction([STORES.SONGS], 'readwrite');
  const done = requestTransactionComplete(tx);
  const store = tx.objectStore(STORES.SONGS);
  for (const preset of PRESET_SONGS) {
    store.delete(preset.id);
  }
  try {
    await done;
  } catch (err) {
    console.error('[IndexedDB] Failed to reset all presets:', err);
    throw err;
  }
}

/**
 * Save current active song snapshot and ID to meta store atomically
 * in a single multi-store transaction spanning both 'songs' and 'meta'.
 */
export async function saveActiveSongToDB(song: Song): Promise<void> {
  if (!isIndexedDBSupported()) return;

  const db = await initDB();
  const persistBody = shouldPersistSongBody(song);
  const isPreset = isFactoryPresetId(song.id);
  const isModified = isPreset ? isSongModifiedFromPreset(song) : false;
  const record: StoredSongRecord = {
    ...song,
    updatedAt: Date.now(),
    isPresetModified: isModified,
    originalPresetId: isPreset ? song.id : undefined,
  };

  const tx = db.transaction([STORES.SONGS, STORES.META], 'readwrite');
  const done = requestTransactionComplete(tx);
  const songStore = tx.objectStore(STORES.SONGS);
  const metaStore = tx.objectStore(STORES.META);

  if (persistBody) {
    songStore.put(record);
  } else {
    // Drop any legacy unmodified snapshot so factory code wins after updates.
    songStore.delete(song.id);
  }
  metaStore.put({ key: META_KEYS.ACTIVE_SONG_ID, value: song.id });
  metaStore.put({
    key: META_KEYS.LAST_ACTIVE_SONG,
    value: persistBody ? record : { id: song.id },
  });

  try {
    await done;
  } catch (err) {
    console.error('[IndexedDB] Failed to save active song metadata:', err);
    throw err;
  }
}

/**
 * Retrieve the last active song from IndexedDB with validation
 */
export async function getActiveSongFromDB(): Promise<Song | null> {
  if (!isIndexedDBSupported()) return null;

  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.META, STORES.SONGS], 'readonly');
    const metaStore = tx.objectStore(STORES.META);
    const idReq = metaStore.get(META_KEYS.ACTIVE_SONG_ID);

    const resolveFromSnapshot = () => {
      const snapshotReq = metaStore.get(META_KEYS.LAST_ACTIVE_SONG);
      snapshotReq.onsuccess = () => {
        resolve(canonicalizeStoredSong(validateSongRecord(snapshotReq.result?.value)));
      };
      snapshotReq.onerror = () => resolve(null);
    };

    idReq.onsuccess = () => {
      const activeId = idReq.result?.value as string | undefined;
      if (activeId) {
        const factory = PRESET_SONGS.find(p => p.id === activeId);
        const songStore = tx.objectStore(STORES.SONGS);
        const songReq = songStore.get(activeId);
        songReq.onsuccess = () => {
          const stored = validateSongRecord(songReq.result);
          if (factory) {
            resolve(isStoredPresetOverride(stored) && stored ? stored : factory);
            return;
          }
          if (stored) {
            resolve(stored);
            return;
          }
          resolveFromSnapshot();
        };
        songReq.onerror = () => resolveFromSnapshot();
      } else {
        resolveFromSnapshot();
      }
    };

    idReq.onerror = () => {
      console.error('[IndexedDB] Failed to get active song ID:', idReq.error);
      reject(idReq.error);
    };
  });
}

/**
 * True when the id is a factory preset or already stored in IndexedDB.
 */
export async function songIdExists(id: string): Promise<boolean> {
  if (isFactoryPresetId(id)) return true;
  const stored = await getSongFromDB(id);
  return stored != null;
}

/**
 * Automatically migrate any legacy songs from localStorage into IndexedDB on first load
 */
export async function migrateLocalStorageToDB(): Promise<{ migratedSongs: number }> {
  if (!isIndexedDBSupported() || typeof window === 'undefined') {
    return { migratedSongs: 0 };
  }

  try {
    const db = await initDB();

    // Check if migration has already been executed
    const alreadyMigrated = await new Promise<boolean>((resolve) => {
      const tx = db.transaction([STORES.META], 'readonly');
      const store = tx.objectStore(STORES.META);
      const req = store.get(META_KEYS.LOCALSTORAGE_MIGRATED);
      req.onsuccess = () => resolve(Boolean(req.result?.value));
      req.onerror = () => resolve(false);
    });

    if (alreadyMigrated) {
      return { migratedSongs: 0 };
    }

    let count = 0;

    // 1. Read custom library from localStorage
    const rawLibrary = localStorage.getItem('taigi_composer_custom_library');
    if (rawLibrary) {
      try {
        const parsed = JSON.parse(rawLibrary);
        if (Array.isArray(parsed)) {
          for (const s of parsed) {
            const valid = sanitizeSong(s);
            if (valid) {
              await saveSongToDB(valid);
              count++;
            }
          }
        }
      } catch (err) {
        console.warn('[IndexedDB] Failed to parse custom library during migration:', err);
      }
    }

    // 2. Read current active song from localStorage if present
    const rawCurrent = localStorage.getItem('taigi_composer_current_song');
    if (rawCurrent) {
      try {
        const parsed = sanitizeSong(JSON.parse(rawCurrent));
        if (parsed) {
          await saveSongToDB(parsed);
          await saveActiveSongToDB(parsed);
          count++;
        }
      } catch (err) {
        console.warn('[IndexedDB] Failed to parse current song during migration:', err);
      }
    }

    // 3. Mark migration as complete in meta store
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction([STORES.META], 'readwrite');
      const done = requestTransactionComplete(tx);
      tx.objectStore(STORES.META).put({
        key: META_KEYS.LOCALSTORAGE_MIGRATED,
        value: true,
        timestamp: Date.now(),
      });
      done.then(resolve).catch(reject);
    });

    if (count > 0) {
      console.info(`[IndexedDB] Successfully migrated ${count} song(s) from localStorage.`);
    }

    return { migratedSongs: count };
  } catch (err) {
    console.error('[IndexedDB] Error during localStorage migration:', err);
    return { migratedSongs: 0 };
  }
}
