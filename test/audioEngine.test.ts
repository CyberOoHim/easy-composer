import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AudioEngine } from '../lib/audioEngine.ts';
import {
  getStoredChordEnabled,
  setStoredChordEnabled,
  getStoredEnableChords,
  setStoredEnableChords,
  CHORD_SETTINGS_EVENT,
} from '../lib/storage.ts';

describe('AudioEngine Health, Integrity & Mute Prevention', () => {
  const store: Record<string, string> = {};
  let lastDispatchedEvent: Event | null = null;

  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => { store[key] = String(val); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { Object.keys(store).forEach(k => delete store[k]); },
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    lastDispatchedEvent = null;
    (globalThis as any).window = {
      localStorage: mockLocalStorage,
      dispatchEvent: (e: Event) => {
        lastDispatchedEvent = e;
        return true;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).document = {
      hidden: false,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).localStorage = mockLocalStorage;
    (globalThis as any).CustomEvent = class CustomEvent extends Event {
      detail: any;
      constructor(type: string, params?: { detail?: any }) {
        super(type);
        this.detail = params?.detail;
      }
    };
  });

  it('configures IDLE_SUSPEND_DELAY_MS to 30000ms for responsive playing without premature muting', () => {
    assert.strictEqual(
      AudioEngine.IDLE_SUSPEND_DELAY_MS,
      30000,
      'Idle suspend delay must be 30 seconds to prevent killing audio between note taps'
    );
  });

  it('keeps chord options synchronized and setStoredEnableChords dispatches CHORD_SETTINGS_EVENT', () => {
    setStoredEnableChords(false);
    assert.strictEqual(getStoredEnableChords(), false);
    assert.strictEqual(getStoredChordEnabled(), false);
    assert.ok(lastDispatchedEvent, 'Event should be dispatched');
    assert.strictEqual(lastDispatchedEvent.type, CHORD_SETTINGS_EVENT);

    setStoredChordEnabled(true);
    assert.strictEqual(getStoredEnableChords(), true);
    assert.strictEqual(getStoredChordEnabled(), true);
  });

  it('initializes AudioEngine with safe default options', () => {
    const engine = new AudioEngine();
    const opts = engine.getOptions();

    assert.strictEqual(opts.instrument, 'piano');
    assert.strictEqual(opts.chordEnabled, true);
    assert.strictEqual(opts.metronomeEnabled, true);
    assert.ok(opts.metronomeVolume > 0, 'Metronome volume should be audible by default');
    assert.strictEqual(opts.ecoMode, false);
  });

  it('updates options cleanly via setOptions without muting unintended channels', () => {
    const engine = new AudioEngine();
    engine.setOptions({ chordEnabled: false, metronomeVolume: 0.6 });

    const updated = engine.getOptions();
    assert.strictEqual(updated.chordEnabled, false);
    assert.strictEqual(updated.metronomeVolume, 0.6);
    assert.strictEqual(updated.metronomeEnabled, true); // preserved
    assert.strictEqual(updated.instrument, 'piano'); // preserved
  });

  it('preserves metronome state across ecoMode toggle', () => {
    const engine = new AudioEngine();
    engine.setOptions({ metronomeEnabled: true, ecoMode: true });

    const opts = engine.getOptions();
    assert.strictEqual(opts.ecoMode, true);
    assert.strictEqual(opts.metronomeEnabled, true, 'Metronome must stay enabled when ecoMode is active');
  });

  it('allows previewing chord even if chord accompaniment is toggled off', () => {
    const engine = new AudioEngine();
    engine.setOptions({ chordEnabled: false });

    // previewChord should execute without crashing or early-return muting
    assert.doesNotThrow(() => {
      engine.previewChord('C');
    });
  });

  it('allows metronome click audition even when metronomeEnabled is false if force is true', () => {
    const engine = new AudioEngine();
    engine.setOptions({ metronomeEnabled: false });

    // previewMetronome should not throw
    assert.doesNotThrow(() => {
      engine.previewMetronome(true);
    });

    // playMetronomeTick should not throw
    assert.doesNotThrow(() => {
      engine.playMetronomeTick(true);
    });
  });
});
