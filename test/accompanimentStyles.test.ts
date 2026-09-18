import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine, type AccompanimentStyle } from '../lib/audioEngine.ts';
import {
  getStoredAccompanimentStyle,
  setStoredAccompanimentStyle,
  STORAGE_KEYS,
} from '../lib/storage.ts';
import { getChordNotes } from '../lib/taigiUtils.ts';

describe('Accompaniment Styles & Grooves (MOD-4)', () => {
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
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).document = {
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).localStorage = mockLocalStorage;
  });

  it('provides default accompaniment style as "block"', () => {
    const engine = new AudioEngine();
    assert.strictEqual(engine.getAccompanimentStyle(), 'block');
    assert.strictEqual(engine.getOptions().accompanimentStyle, 'block');
  });

  it('updates accompaniment style cleanly via setAccompanimentStyle', () => {
    const engine = new AudioEngine();
    const styles: AccompanimentStyle[] = ['block', 'arpeggio', 'folk', 'waltz'];

    for (const style of styles) {
      engine.setAccompanimentStyle(style);
      assert.strictEqual(engine.getAccompanimentStyle(), style);
      assert.strictEqual(engine.getOptions().accompanimentStyle, style);
    }
  });

  it('persists and restores accompaniment styles in localStorage', () => {
    assert.strictEqual(getStoredAccompanimentStyle(), 'block');

    setStoredAccompanimentStyle('arpeggio');
    assert.strictEqual(getStoredAccompanimentStyle(), 'arpeggio');

    setStoredAccompanimentStyle('folk');
    assert.strictEqual(getStoredAccompanimentStyle(), 'folk');

    setStoredAccompanimentStyle('waltz');
    assert.strictEqual(getStoredAccompanimentStyle(), 'waltz');

    setStoredAccompanimentStyle('block');
    assert.strictEqual(getStoredAccompanimentStyle(), 'block');
  });

  it('supports initial accompanimentStyle via AudioEngine constructor options', () => {
    const engine = new AudioEngine({ accompanimentStyle: 'folk' });
    assert.strictEqual(engine.getAccompanimentStyle(), 'folk');
  });

  it('handles previewChord safely across all styles and edge-case inputs without error', () => {
    const engine = new AudioEngine();

    const testChords = ['C', 'Am', 'G7', 'F', 'Dm', 'N.C.', '', 'UnknownChord123'];
    const styles: AccompanimentStyle[] = ['block', 'arpeggio', 'folk', 'waltz'];

    for (const style of styles) {
      engine.setAccompanimentStyle(style);
      for (const chord of testChords) {
        // Must not throw or crash in node / browser mock environment
        assert.doesNotThrow(() => {
          engine.previewChord(chord, 0.5);
        }, `previewChord("${chord}") should not throw with style "${style}"`);
      }
    }
  });

  it('preserves accompaniment style across ecoMode toggle', () => {
    const engine = new AudioEngine({ accompanimentStyle: 'arpeggio' });
    assert.strictEqual(engine.getAccompanimentStyle(), 'arpeggio');

    engine.setOptions({ ecoMode: true });
    assert.strictEqual(engine.getAccompanimentStyle(), 'arpeggio');
    assert.strictEqual(engine.getOptions().ecoMode, true);

    engine.setOptions({ ecoMode: false });
    assert.strictEqual(engine.getAccompanimentStyle(), 'arpeggio');
    assert.strictEqual(engine.getOptions().ecoMode, false);
  });

  it('verifies chord note generation for accompaniment triad frequencies', () => {
    // C Major: C2 (~65.4Hz), E3/G3
    const cChord = getChordNotes('C');
    assert.ok(cChord.length >= 3, 'C major chord requires at least 3 notes');
    assert.ok(cChord[0] > 60 && cChord[0] < 70, 'Root bass note C should be ~65.4Hz');

    // A Minor: A1/A2, C, E
    const amChord = getChordNotes('Am');
    assert.ok(amChord.length >= 3, 'Am chord requires at least 3 notes');

    // G Dominant 7th: G, B, D, F
    const g7Chord = getChordNotes('G7');
    assert.ok(g7Chord.length >= 4, 'G7 chord requires at least 4 notes');

    // Empty or N.C. chords return empty array safely
    assert.deepStrictEqual(getChordNotes(''), []);
    assert.deepStrictEqual(getChordNotes('N.C.'), []);
  });
});
