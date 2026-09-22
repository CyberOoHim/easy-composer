import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  STORAGE_KEYS,
  getStoredSheetWrapMode,
  setStoredSheetWrapMode,
  getStoredSheetOrientation,
  setStoredSheetOrientation,
  getStoredQuickAlignTarget,
  setStoredQuickAlignTarget,
  getStoredMidiInstrument,
  setStoredMidiInstrument,
  getStoredPwaDismissed,
  setStoredPwaDismissed,
  getStoredPianoDeckMode,
  setStoredPianoDeckMode,
  getStoredExportFormat,
  setStoredExportFormat,
  saveSongToCustomLibraryWithResult,
  deleteSongFromCustomLibraryWithResult,
  getStoredCustomLibrary,
  getStoredCurrentSong,
  getStoredCurrentSongOrNull,
  resetAllSettingsToDefault,
  getStoredLyricZoom,
  setStoredLyricZoom,
  getStoredNoteZoom,
  setStoredNoteZoom,
  getStoredUiZoom,
  setStoredUiZoom,
  getStoredVirtualKeyboardEnabled,
  setStoredVirtualKeyboardEnabled,
} from '../lib/storage.ts';

describe('Local Storage UI Selections Management', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    (globalThis as any).window = {
      localStorage: mockLocalStorage,
      dispatchEvent: () => true,
    };
    (globalThis as any).localStorage = mockLocalStorage;
    (globalThis as any).document = {
      documentElement: {
        style: {
          fontSize: '100%',
          setProperty: () => {},
        },
        setAttribute: () => {},
        classList: {
          remove: () => {},
          add: () => {},
        },
      },
    };
    (globalThis as any).Event = class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    };
    (globalThis as any).CustomEvent = class {
      type: string;
      detail: any;
      constructor(type: string, opts?: any) {
        this.type = type;
        this.detail = opts?.detail;
      }
    };
  });

  it('manages sheetWrapMode with persistence and defaults', () => {
    assert.strictEqual(getStoredSheetWrapMode(), 'no_wrap');
    setStoredSheetWrapMode('auto_wrap');
    assert.strictEqual(getStoredSheetWrapMode(), 'auto_wrap');
    assert.strictEqual(store[STORAGE_KEYS.REAL_SHEET_WRAP_MODE], 'auto_wrap');
    setStoredSheetWrapMode('auto_fit');
    assert.strictEqual(getStoredSheetWrapMode(), 'auto_fit');
  });

  it('manages sheetOrientation with persistence and defaults', () => {
    assert.strictEqual(getStoredSheetOrientation(), 'portrait');
    setStoredSheetOrientation('landscape');
    assert.strictEqual(getStoredSheetOrientation(), 'landscape');
    assert.strictEqual(store[STORAGE_KEYS.REAL_SHEET_ORIENTATION], 'landscape');
    setStoredSheetOrientation('portrait');
    assert.strictEqual(getStoredSheetOrientation(), 'portrait');
  });

  it('manages quickAlignTarget with persistence and defaults', () => {
    assert.strictEqual(getStoredQuickAlignTarget(), 'roman');
    setStoredQuickAlignTarget('hanlo');
    assert.strictEqual(getStoredQuickAlignTarget(), 'hanlo');
    assert.strictEqual(store[STORAGE_KEYS.QUICK_ALIGN_TARGET], 'hanlo');
    setStoredQuickAlignTarget('dual');
    assert.strictEqual(getStoredQuickAlignTarget(), 'dual');
  });

  it('manages midiInstrument with persistence and defaults', () => {
    assert.strictEqual(getStoredMidiInstrument(), 'piano');
    setStoredMidiInstrument('flute');
    assert.strictEqual(getStoredMidiInstrument(), 'flute');
    assert.strictEqual(store[STORAGE_KEYS.MIDI_INSTRUMENT], 'flute');
  });

  it('manages pwaDismissed with persistence and defaults', () => {
    assert.strictEqual(getStoredPwaDismissed(), false);
    setStoredPwaDismissed(true);
    assert.strictEqual(getStoredPwaDismissed(), true);
    assert.strictEqual(store[STORAGE_KEYS.PWA_PROMPT_DISMISSED], 'true');
  });

  it('manages virtualKeyboardEnabled with persistence and default false', () => {
    assert.strictEqual(getStoredVirtualKeyboardEnabled(), false);
    setStoredVirtualKeyboardEnabled(true);
    assert.strictEqual(getStoredVirtualKeyboardEnabled(), true);
    assert.strictEqual(store[STORAGE_KEYS.VIRTUAL_KEYBOARD_ENABLED], 'true');
    setStoredVirtualKeyboardEnabled(false);
    assert.strictEqual(getStoredVirtualKeyboardEnabled(), false);
  });

  it('manages pianoDeckMode correctly', () => {
    assert.strictEqual(getStoredPianoDeckMode(), 'step');
    setStoredPianoDeckMode('transcribe');
    assert.strictEqual(getStoredPianoDeckMode(), 'transcribe');
    assert.strictEqual(store[STORAGE_KEYS.PIANO_DECK_MODE], 'transcribe');
  });

  it('resets all UI selections in resetAllSettingsToDefault', () => {
    setStoredSheetWrapMode('auto_wrap');
    setStoredSheetOrientation('landscape');
    setStoredQuickAlignTarget('dual');
    setStoredMidiInstrument('synth');
    setStoredPianoDeckMode('transcribe');
    setStoredExportFormat('midi');
    setStoredNoteZoom(1.45);
    setStoredLyricZoom(1.85);
    setStoredUiZoom(1.25);
    store[STORAGE_KEYS.POWER_SAVE_MODE] = 'true';

    resetAllSettingsToDefault();

    assert.strictEqual(getStoredSheetWrapMode(), 'no_wrap');
    assert.strictEqual(getStoredSheetOrientation(), 'portrait');
    assert.strictEqual(getStoredQuickAlignTarget(), 'roman');
    assert.strictEqual(getStoredMidiInstrument(), 'piano');
    assert.strictEqual(getStoredPianoDeckMode(), 'step');
    assert.strictEqual(getStoredExportFormat(), 'json');
    assert.strictEqual(getStoredNoteZoom(), 1.0);
    assert.strictEqual(getStoredLyricZoom(), 1.0);
    assert.strictEqual(getStoredUiZoom(), 1.0);
    assert.strictEqual(store[STORAGE_KEYS.POWER_SAVE_MODE], 'false');
  });

  it('manages note, lyric, and ui zoom persistence with 5% increments and 100% defaults', () => {
    // Defaults
    assert.strictEqual(getStoredNoteZoom(), 1.0);
    assert.strictEqual(getStoredLyricZoom(), 1.0);
    assert.strictEqual(getStoredUiZoom(), 1.0);

    // 5% step changes
    setStoredNoteZoom(1.05);
    assert.strictEqual(getStoredNoteZoom(), 1.05);

    setStoredLyricZoom(1.05);
    assert.strictEqual(getStoredLyricZoom(), 1.05);

    setStoredUiZoom(1.15);
    assert.strictEqual(getStoredUiZoom(), 1.15);

    // Clamping boundaries
    setStoredNoteZoom(2.5);
    assert.strictEqual(getStoredNoteZoom(), 2.0);

    setStoredLyricZoom(2.5);
    assert.strictEqual(getStoredLyricZoom(), 1.8);

    setStoredUiZoom(1.8);
    assert.strictEqual(getStoredUiZoom(), 1.5);
  });

  it('handles save and delete from custom library with result', () => {
    const dummySong = {
      id: 'custom-song-abc',
      title: 'Custom Song',
      measures: [{ id: 'm1', notes: [] }],
    } as any;

    const saveRes = saveSongToCustomLibraryWithResult(dummySong);
    assert.strictEqual(saveRes.success, true);
    assert.ok(saveRes.library.some(s => s.id === 'custom-song-abc'));

    const delRes = deleteSongFromCustomLibraryWithResult('custom-song-abc');
    assert.strictEqual(delRes.success, true);
    assert.strictEqual(delRes.library.some(s => s.id === 'custom-song-abc'), false);
    assert.strictEqual(getStoredCustomLibrary().some(s => s.id === 'custom-song-abc'), false);
  });

  it('repairs a current-song payload whose notes lack lyric objects', () => {
    store[STORAGE_KEYS.CURRENT_SONG] = JSON.stringify({
      id: 'draft-1',
      title: 'Crash Draft',
      key: 'C',
      timeSignature: '4/4',
      bpm: 80,
      measures: [{ id: 'm1', notes: [{ id: 'n1', pitch: 3, octave: 0, duration: 1 }] }],
    });
    const song = getStoredCurrentSong();
    assert.equal(song.id, 'draft-1');
    assert.ok(song.measures[0].notes[0].lyric);
    assert.equal(song.measures[0].notes[0].lyric.hanlo, '');
    assert.equal(song.measures[0].notes[0].lyric.poj, '');
    assert.equal(typeof song.measures[0].notes[0].lyric.hanlo, 'string');
  });

  it('drops corrupt custom-library entries that have no measures', () => {
    store[STORAGE_KEYS.CUSTOM_LIBRARY] = JSON.stringify([
      { id: 'bad', title: 'Broken' },
      {
        id: 'good',
        title: 'Kept',
        key: 'C',
        timeSignature: '4/4',
        bpm: 80,
        measures: [{ id: 'm1', notes: [{ id: 'n1', pitch: 1, octave: 0, duration: 1, lyric: { poj: 'a', hanlo: 'a' } }] }],
      },
    ]);
    const library = getStoredCustomLibrary();
    assert.equal(library.length, 1);
    assert.equal(library[0].id, 'good');
    assert.ok(library[0].measures[0].notes[0].lyric);
  });

  it('returns null for an unreadable current-song payload', () => {
    store[STORAGE_KEYS.CURRENT_SONG] = '{not-json';
    assert.equal(getStoredCurrentSongOrNull(), null);
  });
});
