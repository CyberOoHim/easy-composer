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
  resetAllSettingsToDefault,
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
    store[STORAGE_KEYS.POWER_SAVE_MODE] = 'true';

    resetAllSettingsToDefault();

    assert.strictEqual(getStoredSheetWrapMode(), 'no_wrap');
    assert.strictEqual(getStoredSheetOrientation(), 'portrait');
    assert.strictEqual(getStoredQuickAlignTarget(), 'roman');
    assert.strictEqual(getStoredMidiInstrument(), 'piano');
    assert.strictEqual(getStoredPianoDeckMode(), 'step');
    assert.strictEqual(getStoredExportFormat(), 'json');
    assert.strictEqual(store[STORAGE_KEYS.POWER_SAVE_MODE], 'false');
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
});
