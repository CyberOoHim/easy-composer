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
    (globalThis as any).requestAnimationFrame = (cb: any) => setTimeout(cb, 16);
    (globalThis as any).cancelAnimationFrame = (id: any) => clearTimeout(id);
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

  describe('Cross-App Interruption & AudioContext Resurrection', () => {
    let instances: any[] = [];

    class MockAudioContext {
      state: string = 'running';
      currentTime: number = 0.05;
      destination = {};
      closeCalled = false;
      cannotResume = false;
      constructor() {
        instances.push(this);
      }
      createGain() {
        return {
          gain: {
            setValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
          },
          connect: () => {},
          disconnect: () => {},
        };
      }
      createBiquadFilter() {
        return {
          frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {} },
          Q: { setValueAtTime: () => {} },
          gain: { setValueAtTime: () => {} },
          type: 'lowpass',
          connect: () => {},
          disconnect: () => {},
        };
      }
      createBuffer() {
        return {};
      }
      createBufferSource() {
        return {
          buffer: null,
          connect: () => {},
          start: () => {},
          stop: () => {},
        };
      }
      createOscillator() {
        return {
          frequency: {
            setValueAtTime: () => {},
            exponentialRampToValueAtTime: () => {},
            linearRampToValueAtTime: () => {},
          },
          connect: () => {},
          disconnect: () => {},
          start: () => {},
          stop: () => {},
        };
      }
      async resume() {
        if (!this.cannotResume) {
          this.state = 'running';
        }
      }
      async suspend() {
        this.state = 'suspended';
      }
      async close() {
        this.state = 'closed';
        this.closeCalled = true;
      }
    }

    beforeEach(() => {
      instances = [];
      (globalThis as any).window.AudioContext = MockAudioContext;
    });

    it('recovers and recreates AudioContext when interrupted by external app switch and resume cannot transition', async () => {
      const engine = new AudioEngine();
      engine.initContext();

      assert.strictEqual(instances.length, 1);
      const firstCtx = instances[0];
      assert.strictEqual(firstCtx.state, 'running');

      // Simulate iPadOS background app interruption where resume() fails to clear interrupted state
      firstCtx.state = 'interrupted';
      firstCtx.cannotResume = true;

      // Calling ensureContextActive should detect that firstCtx cannot be resumed to 'running',
      // force-recreate a fresh AudioContext, and succeed
      const active = await engine.ensureContextActive();

      assert.strictEqual(active, true, 'AudioEngine must recover to active running state');
      assert.strictEqual(instances.length, 2, 'A fresh AudioContext instance should have been instantiated');
      assert.strictEqual(firstCtx.closeCalled, true, 'The dead zombie context should be closed');
      assert.strictEqual(instances[1].state, 'running', 'New context must be running');
      assert.strictEqual(engine.getAudioContextState(), 'running');
    });

    it('detects frozen zombie clock after cross-app backgrounding and resurrects context', async () => {
      const engine = new AudioEngine();
      engine.initContext();

      const firstCtx = instances[0];
      firstCtx.state = 'running';
      firstCtx.currentTime = 1.234; // Frozen clock (does not advance)

      // Trigger app leaving/returning
      (globalThis as any).document.hidden = true;
      (engine as any).handleLeavingTab();
      (globalThis as any).document.hidden = false;
      (engine as any).handleReturningToTab();

      // ensureContextActive should detect that currentTime is stuck at 1.234 and resurrect
      const active = await engine.ensureContextActive();

      assert.strictEqual(active, true);
      assert.strictEqual(instances.length, 2, 'Must recreate fresh context to replace zombie clock');
      assert.strictEqual(firstCtx.closeCalled, true);
    });

    it('proactively unlocks and heals interrupted context on user gesture', async () => {
      const engine = new AudioEngine();
      engine.initContext();

      const firstCtx = instances[0];
      firstCtx.state = 'interrupted';
      firstCtx.cannotResume = true;

      // Trigger user gesture
      engine.unlockOnUserGesture();

      // Wait a microtick for async ensureContextActive inside unlockOnUserGesture
      await new Promise(resolve => setTimeout(resolve, 50));

      assert.strictEqual(instances.length, 2, 'User gesture should heal the context');
      assert.strictEqual(instances[1].state, 'running');
    });

    it('resumes playback seamlessly with fallbackSong support', async () => {
      const engine = new AudioEngine();
      const mockSong: any = {
        id: 'test-song-resume',
        title: 'Test Song',
        key: 'C',
        bpm: 120,
        timeSignature: '4/4',
        measures: [
          {
            notes: [
              { id: 'n1', pitch: 1, octave: 0, duration: 1, lyric: {} }
            ]
          }
        ]
      };

      let stateObserved: any = null;
      engine.subscribeState(s => {
        stateObserved = s;
      });

      // Directly resume with fallbackSong
      engine.resume(mockSong);
      await new Promise(resolve => setTimeout(resolve, 50));

      assert.ok(engine.getIsPlaying(), 'Playback should start from fallbackSong');
      engine.stop();
      assert.strictEqual(engine.getIsPlaying(), false);
    });

    it('expands repeat barlines and volta endings accurately for playback sequence', () => {
      const songWithVolta: any = {
        bpm: 120,
        timeSignature: '4/4',
        measures: [
          { barlineType: 'single', notes: [{ id: 'm0n1', duration: 4, pitch: 1, lyric: {} }] }, // intro
          { barlineType: 'repeat_start', notes: [{ id: 'm1n1', duration: 4, pitch: 2, lyric: {} }] }, // intro end |:
          { barlineType: 'single', notes: [{ id: 'm2n1', duration: 4, pitch: 3, lyric: {} }] }, // shared verse body
          { barlineType: 'repeat_end', voltaEnding: [1], notes: [{ id: 'm3n1', duration: 4, pitch: 4, lyric: {} }] }, // volta [1] :|
          { barlineType: 'single', voltaEnding: [2], notes: [{ id: 'm4n1', duration: 4, pitch: 5, lyric: {} }] }, // volta [2]
          { barlineType: 'double', notes: [{ id: 'm5n1', duration: 4, pitch: 6, lyric: {} }] }, // outro
        ]
      };

      const engine = new AudioEngine();
      engine.setOptions({ expandRepeats: true });

      // Pass 1: m0, m1, m2 (body), m3 (volta 1)
      // Pass 2: m2 (body), m4 (volta 2), m5 (outro)
      // Expanded total = 7 measures; Linear total = 6 measures
      const durExpanded = engine.calculateSongDuration(songWithVolta);

      engine.setOptions({ expandRepeats: false });
      const durLinear = engine.calculateSongDuration(songWithVolta);

      assert.ok(durExpanded > durLinear, 'Expanded duration should be longer than linear duration');
      // Linear: 6 measures * 4 beats * 0.5s = 12s; Expanded = 7 measures * 4 * 0.5 = 14s
      assert.strictEqual(durLinear, 12);
      assert.strictEqual(durExpanded, 14);
    });

    it('calculates getMeasureStartTime and getPlaybackLocationAtTime accurately with repeats', () => {
      const engine = new AudioEngine();
      engine.setOptions({ expandRepeats: true, tempoMultiplier: 1.0 });

      const simpleRepeatSong: any = {
        bpm: 60, // 1 sec per beat
        timeSignature: '4/4',
        measures: [
          { barlineType: 'single', notes: [{ id: 'n0', duration: 4, pitch: 1, lyric: {} }] },
          { barlineType: 'repeat_end', notes: [{ id: 'n1', duration: 4, pitch: 2, lyric: {} }] },
          { barlineType: 'double', notes: [{ id: 'n2', duration: 4, pitch: 3, lyric: {} }] },
        ]
      };

      // Repeats measure 0..1 twice, then plays measure 2
      // Measure 0: 4s
      // Measure 1: 4s (total 8s), repeat back to 0
      // Measure 0: 4s (total 12s)
      // Measure 1: 4s (total 16s)
      // Measure 2 starts at 16s
      const m2StartTime = engine.getMeasureStartTime(simpleRepeatSong, 2);
      assert.strictEqual(m2StartTime, 16);

      // Location at 2s -> Measure 0, note 0
      const loc2s = engine.getPlaybackLocationAtTime(simpleRepeatSong, 2);
      assert.strictEqual(loc2s.measureIndex, 0);

      // Location at 10s (second pass through measure 0) -> Measure 0
      const loc10s = engine.getPlaybackLocationAtTime(simpleRepeatSong, 10);
      assert.strictEqual(loc10s.measureIndex, 0);

      // Location at 17s (in measure 2) -> Measure 2
      const loc17s = engine.getPlaybackLocationAtTime(simpleRepeatSong, 17);
      assert.strictEqual(loc17s.measureIndex, 2);
    });
  });
});
