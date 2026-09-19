import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert';
import { PRESET_SONGS, createFreshSong } from '../lib/presets.ts';
import {
  isSongModifiedFromPreset,
  saveSongToDB,
  getSongFromDB,
  getAllSongsFromDB,
  getCustomSongsFromDB,
  getModifiedPresetsFromDB,
  getModifiedPresetIds,
  resetPresetToFactory,
  resetAllPresetsToFactory,
  deleteSongFromDB,
  validateSongRecord,
  saveActiveSongToDB,
  getActiveSongFromDB,
  migrateLocalStorageToDB,
  pickBootstrapSong,
  songIdExists,
  resetDBInstanceForTests,
  isStoredPresetOverride,
} from '../lib/indexedDb.ts';
import {
  getStoredAutosaveInterval,
  setStoredAutosaveInterval,
} from '../lib/storage.ts';
import { sanitizeSong } from '../lib/songParser.ts';
import { normalizeSongDurations } from '../lib/taigiUtils.ts';

// Minimal in-memory mock for IndexedDB
class MockIDBRequest {
  result: any = null;
  error: any = null;
  onsuccess: any = null;
  onerror: any = null;

  triggerSuccess(val: any) {
    this.result = val;
    if (this.onsuccess) this.onsuccess({ target: this });
  }

  triggerError(err: any) {
    this.error = err;
    if (this.onerror) this.onerror({ target: this });
  }
}

class MockIDBTransaction {
  stores: Map<string, MockIDBObjectStore>;
  ownerDb: MockIDBDatabase | null;
  oncomplete: any = null;
  onerror: any = null;
  onabort: any = null;
  error: any = null;
  aborted = false;
  private pendingOps = 0;

  constructor(stores: Map<string, MockIDBObjectStore>, ownerDb: MockIDBDatabase | null = null) {
    this.stores = stores;
    this.ownerDb = ownerDb;
    // If no operations are performed, complete on next tick
    setTimeout(() => {
      if (this.pendingOps === 0 && !this.aborted && this.oncomplete) {
        this.oncomplete({ target: this });
      }
    }, 0);
  }

  objectStore(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new MockIDBObjectStore(this));
    }
    const store = this.stores.get(name)!;
    store.activeTx = this;
    return store;
  }

  startOp() {
    this.pendingOps++;
  }

  endOp() {
    this.pendingOps--;
    if (this.pendingOps <= 0 && !this.aborted) {
      setTimeout(() => {
        if (!this.aborted && this.oncomplete) this.oncomplete({ target: this });
      }, 0);
    }
  }

  abort() {
    this.aborted = true;
    this.error = this.error || new Error('Transaction aborted');
    if (this.onabort) this.onabort({ target: this });
  }
}

class MockIDBObjectStore {
  data = new Map<string, any>();
  activeTx: MockIDBTransaction | null = null;

  constructor(tx?: MockIDBTransaction) {
    if (tx) this.activeTx = tx;
  }

  get(key: string) {
    const tx = this.activeTx;
    if (tx) tx.startOp();
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.triggerSuccess(this.data.get(key));
      if (tx) tx.endOp();
    }, 0);
    return req;
  }

  put(val: any) {
    const key = val.id || val.key;
    const tx = this.activeTx;
    if (tx) tx.startOp();
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.triggerSuccess(key);
      if (tx?.ownerDb?.abortAfterSuccess) {
        tx.ownerDb.abortAfterSuccess = false;
        tx.abort();
        return;
      }
      this.data.set(key, JSON.parse(JSON.stringify(val)));
      if (tx) tx.endOp();
    }, 0);
    return req;
  }

  getAll() {
    const tx = this.activeTx;
    if (tx) tx.startOp();
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.triggerSuccess(Array.from(this.data.values()));
      if (tx) tx.endOp();
    }, 0);
    return req;
  }

  delete(key: string) {
    this.data.delete(key);
    const tx = this.activeTx;
    if (tx) tx.startOp();
    const req = new MockIDBRequest();
    setTimeout(() => {
      req.triggerSuccess(undefined);
      if (tx) tx.endOp();
    }, 0);
    return req;
  }

  createIndex() {}
}

class MockIDBDatabase {
  stores = new Map<string, MockIDBObjectStore>();
  abortAfterSuccess = false;
  objectStoreNames = {
    contains: (name: string) => this.stores.has(name),
  };

  createObjectStore(name: string, _opts: any) {
    const s = new MockIDBObjectStore();
    this.stores.set(name, s);
    return s;
  }

  transaction(names: string | string[], _mode: string) {
    const storeNames = Array.isArray(names) ? names : [names];
    for (const name of storeNames) {
      if (!this.stores.has(name)) {
        this.stores.set(name, new MockIDBObjectStore());
      }
    }
    return new MockIDBTransaction(this.stores, this);
  }
}

describe('Preset Modification Detection', () => {
  it('identifies an untouched preset as not modified', () => {
    const preset = PRESET_SONGS[0];
    assert.strictEqual(isSongModifiedFromPreset(preset), false);
  });

  it('detects note pitch modification on preset', () => {
    const modified = JSON.parse(JSON.stringify(PRESET_SONGS[0]));
    modified.measures[0].notes[0].pitch = 1;
    assert.strictEqual(isSongModifiedFromPreset(modified), true);
  });

  it('detects lyric modification on preset', () => {
    const modified = JSON.parse(JSON.stringify(PRESET_SONGS[0]));
    modified.measures[0].notes[0].lyric.hanlo = '風';
    assert.strictEqual(isSongModifiedFromPreset(modified), true);
  });

  it('detects tempo (bpm) modification on preset', () => {
    const modified = JSON.parse(JSON.stringify(PRESET_SONGS[0]));
    modified.bpm = 120;
    assert.strictEqual(isSongModifiedFromPreset(modified), true);
  });

  it('returns false for newly created custom song', () => {
    const fresh = createFreshSong('My Song');
    assert.strictEqual(isSongModifiedFromPreset(fresh), false);
  });

  it('detects notator, catalog, footnote, orientation, and verse metadata edits', () => {
    const base = JSON.parse(JSON.stringify(PRESET_SONGS[0]));
    assert.strictEqual(isSongModifiedFromPreset({ ...base, notator: 'Edited Notator' }), true);
    assert.strictEqual(isSongModifiedFromPreset({ ...base, catalogNumber: 'EDIT-001' }), true);
    assert.strictEqual(isSongModifiedFromPreset({ ...base, footnote: 'Edited footnote' }), true);
    assert.strictEqual(isSongModifiedFromPreset({ ...base, orientation: 'landscape' }), true);
    assert.strictEqual(isSongModifiedFromPreset({ ...base, verseCount: 5 }), true);
    assert.strictEqual(isSongModifiedFromPreset({ ...base, verseDisplayOption: 'poj' }), true);
    assert.strictEqual(
      isSongModifiedFromPreset({ ...base, verseSettings: { 1: { displayOption: 'hanlo' } } }),
      true,
    );
  });

  it('does not treat a legacy unmodified snapshot as an override after factory code changes', () => {
    const stale = { ...PRESET_SONGS[0], title: 'Stale factory snapshot', isPresetModified: false };
    assert.strictEqual(isStoredPresetOverride(stale), false);
    const realOverride = { ...PRESET_SONGS[0], title: 'User edit', isPresetModified: true };
    assert.strictEqual(isStoredPresetOverride(realOverride), true);
  });

  it('keeps all factory presets as unmodified even after sanitizeSong and normalizeSongDurations', () => {
    for (const preset of PRESET_SONGS) {
      assert.strictEqual(isSongModifiedFromPreset(preset), false, `${preset.id} factory should not be modified`);
      const sanitized = sanitizeSong(JSON.parse(JSON.stringify(preset)));
      assert(sanitized !== null, `${preset.id} sanitized should not be null`);
      assert.strictEqual(isSongModifiedFromPreset(sanitized), false, `${preset.id} sanitized should not be modified`);
      const normalized = normalizeSongDurations(JSON.parse(JSON.stringify(preset)));
      assert.strictEqual(isSongModifiedFromPreset(normalized), false, `${preset.id} normalized should not be modified`);
    }
  });
});

describe('Bootstrap song selection', () => {
  it('prefers a newer localStorage draft over IndexedDB', () => {
    const idb = { ...createFreshSong('IDB Copy'), updatedAt: 100 };
    const local = { ...createFreshSong('Local Draft'), id: idb.id, updatedAt: 200 };
    const picked = pickBootstrapSong(idb, local);
    assert.strictEqual(picked.fromLocalDraft, true);
    assert.strictEqual(picked.song.title, 'Local Draft');
  });

  it('does not let an unmodified preset localStorage snapshot shadow factory code', () => {
    const factory = PRESET_SONGS[0];
    const stale = JSON.parse(JSON.stringify(factory));
    stale.updatedAt = Date.now();
    const picked = pickBootstrapSong(factory, stale);
    assert.strictEqual(picked.fromLocalDraft, false);
    assert.strictEqual(picked.song.title, factory.title);
    assert.strictEqual(isSongModifiedFromPreset(picked.song), false);
  });
});

describe('IndexedDB Persistence Operations', () => {
  let mockDb: MockIDBDatabase;

  beforeEach(() => {
    resetDBInstanceForTests();
    mockDb = new MockIDBDatabase();
    mockDb.createObjectStore('songs', {});
    mockDb.createObjectStore('meta', {});

    const mockStorage = new Map<string, string>();
    (globalThis as any).window = {
      indexedDB: {
        open: () => {
          const req = new MockIDBRequest();
          setTimeout(() => {
            req.result = mockDb;
            req.triggerSuccess(mockDb);
          }, 0);
          return req;
        },
      },
      localStorage: {
        getItem: (k: string) => mockStorage.get(k) || null,
        setItem: (k: string, v: string) => mockStorage.set(k, v),
        removeItem: (k: string) => mockStorage.delete(k),
        clear: () => mockStorage.clear(),
      },
    };
    (globalThis as any).localStorage = (globalThis as any).window.localStorage;
  });

  it('saves and retrieves a newly created song', async () => {
    const fresh = createFreshSong('Test Composition');
    await saveSongToDB(fresh);

    const retrieved = await getSongFromDB(fresh.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.title, 'Test Composition');
    assert.strictEqual(retrieved?.measures.length, fresh.measures.length);
  });

  it('saves an edited preset and lists it under modified presets', async () => {
    const editedPreset = JSON.parse(JSON.stringify(PRESET_SONGS[0]));
    editedPreset.measures[0].notes[0].pitch = 3;

    await saveSongToDB(editedPreset);

    const modifiedPresets = await getModifiedPresetsFromDB();
    assert.strictEqual(modifiedPresets.length, 1);
    assert.strictEqual(modifiedPresets[0].id, PRESET_SONGS[0].id);

    const modifiedIds = await getModifiedPresetIds();
    assert.ok(modifiedIds.has(PRESET_SONGS[0].id));
  });

  it('differentiates custom songs from modified presets', async () => {
    const fresh = createFreshSong('Custom 1');
    await saveSongToDB(fresh);

    const customSongs = await getCustomSongsFromDB();
    assert.ok(customSongs.some(s => s.id === fresh.id));
    assert.strictEqual(customSongs.some(s => s.id === PRESET_SONGS[0].id), false);
  });

  it('resets a modified preset to factory default', async () => {
    const editedPreset = JSON.parse(JSON.stringify(PRESET_SONGS[0]));
    editedPreset.title = '雨夜花 (Modified)';
    await saveSongToDB(editedPreset);

    const pristine = await resetPresetToFactory(PRESET_SONGS[0].id);
    assert.ok(pristine);
    assert.strictEqual(pristine?.title, PRESET_SONGS[0].title);

    const modifiedIds = await getModifiedPresetIds();
    assert.strictEqual(modifiedIds.has(PRESET_SONGS[0].id), false);
  });

  it('saves and retrieves active song metadata', async () => {
    const song = createFreshSong('Active Working Song');
    await saveActiveSongToDB(song);

    const active = await getActiveSongFromDB();
    assert.ok(active);
    assert.strictEqual(active?.title, 'Active Working Song');
  });

  it('migrates legacy songs from localStorage into IndexedDB', async () => {
    const legacySong = createFreshSong('Legacy Local Song');
    localStorage.setItem('taigi_composer_custom_library', JSON.stringify([legacySong]));

    const result = await migrateLocalStorageToDB();
    assert.ok(result.migratedSongs >= 1);

    const retrieved = await getSongFromDB(legacySong.id);
    assert.ok(retrieved);
    assert.strictEqual(retrieved?.title, 'Legacy Local Song');
  });

  it('validates song records and rejects corrupt data', () => {
    assert.strictEqual(validateSongRecord(null), null);
    assert.strictEqual(validateSongRecord({}), null);
    assert.strictEqual(validateSongRecord({ id: '' }), null);
    assert.strictEqual(validateSongRecord({ id: 'test', measures: [] }), null);

    const valid = createFreshSong('Valid Song');
    const checked = validateSongRecord(valid);
    assert.ok(checked);
    assert.strictEqual(checked?.id, valid.id);
    assert.notStrictEqual(checked, valid);
  });

  it('repairs missing lyric objects without mutating the stored record', () => {
    const raw = {
      id: 'lyric-gap',
      title: 'Gap',
      key: 'C',
      timeSignature: '4/4',
      bpm: 80,
      measures: [{ id: 'm1', measureNumber: 1, notes: [{ id: 'n1', pitch: 1, octave: 0, duration: 1 }] }],
    };
    const snapshot = JSON.stringify(raw);
    const checked = validateSongRecord(raw);
    assert.ok(checked);
    assert.ok(checked.measures[0].notes[0].lyric);
    assert.strictEqual(checked.measures[0].notes[0].lyric.hanlo, '');
    assert.strictEqual(checked.measures[0].notes[0].lyric.poj, '');
    assert.strictEqual(JSON.stringify(raw), snapshot);
  });

  it('handles corrupt record in getSongFromDB gracefully by returning null', async () => {
    // Put a corrupt object in DB directly
    const tx = mockDb.transaction('songs', 'readwrite');
    tx.objectStore('songs').put({ id: 'corrupt-1', title: 'Broken' });

    const retrieved = await getSongFromDB('corrupt-1');
    assert.strictEqual(retrieved, null);
  });

  it('repairs missing lyric objects when reading a song from IndexedDB', async () => {
    const tx = mockDb.transaction('songs', 'readwrite');
    tx.objectStore('songs').put({
      id: 'lyric-gap-db',
      title: 'Gap DB',
      key: 'C',
      timeSignature: '4/4',
      bpm: 80,
      measures: [{ id: 'm1', measureNumber: 1, notes: [{ id: 'n1', pitch: 1, octave: 0, duration: 1 }] }],
    });

    const retrieved = await getSongFromDB('lyric-gap-db');
    assert.ok(retrieved);
    assert.ok(retrieved.measures[0].notes[0].lyric);
    assert.strictEqual(retrieved.measures[0].notes[0].lyric.hanlo, '');
    assert.strictEqual(retrieved.measures[0].notes[0].lyric.poj, '');
  });

  it('resets all modified presets atomically with resetAllPresetsToFactory', async () => {
    const mod1 = JSON.parse(JSON.stringify(PRESET_SONGS[0]));
    mod1.title = 'Mod 1';
    await saveSongToDB(mod1);

    const mod2 = JSON.parse(JSON.stringify(PRESET_SONGS[1]));
    mod2.title = 'Mod 2';
    await saveSongToDB(mod2);

    let modified = await getModifiedPresetIds();
    assert.strictEqual(modified.size, 2);

    await resetAllPresetsToFactory();

    modified = await getModifiedPresetIds();
    assert.strictEqual(modified.size, 0);
  });

  it('rejects a write when the transaction aborts after request success', async () => {
    mockDb.abortAfterSuccess = true;
    const song = createFreshSong('Abort Test');
    await assert.rejects(() => saveSongToDB(song), /abort/i);
    const retrieved = await getSongFromDB(song.id);
    assert.strictEqual(retrieved, null);
  });

  it('does not store an unmodified factory preset in the songs object store', async () => {
    await saveSongToDB(PRESET_SONGS[0]);
    const retrieved = await getSongFromDB(PRESET_SONGS[0].id);
    assert.strictEqual(retrieved, null);
    const modified = await getModifiedPresetsFromDB();
    assert.strictEqual(modified.some(s => s.id === PRESET_SONGS[0].id), false);
  });

  it('saveActiveSongToDB keeps unmodified presets out of the songs store and still restores factory as active', async () => {
    await saveActiveSongToDB(PRESET_SONGS[0]);
    const retrieved = await getSongFromDB(PRESET_SONGS[0].id);
    assert.strictEqual(retrieved, null);
    const active = await getActiveSongFromDB();
    assert.ok(active);
    assert.strictEqual(active?.id, PRESET_SONGS[0].id);
    assert.strictEqual(active?.title, PRESET_SONGS[0].title);
    assert.strictEqual(isSongModifiedFromPreset(active!), false);
  });

  it('reports factory preset ids as already existing', async () => {
    assert.strictEqual(await songIdExists(PRESET_SONGS[0].id), true);
    assert.strictEqual(await songIdExists('definitely-missing-song-id'), false);
    const fresh = createFreshSong('Exists Check');
    await saveSongToDB(fresh);
    assert.strictEqual(await songIdExists(fresh.id), true);
  });
});

describe('Autosave Interval Storage', () => {
  it('defaults to 0 (manual save)', () => {
    localStorage.clear();
    assert.strictEqual(getStoredAutosaveInterval(), 0);
  });

  it('persists and retrieves configured interval', () => {
    setStoredAutosaveInterval(300000);
    assert.strictEqual(getStoredAutosaveInterval(), 300000);

    setStoredAutosaveInterval(60000);
    assert.strictEqual(getStoredAutosaveInterval(), 60000);
  });
});
