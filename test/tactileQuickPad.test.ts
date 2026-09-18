import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  getStoredTactileQuickPad,
  setStoredTactileQuickPad,
  TACTILE_QUICK_PAD_EVENT,
  STORAGE_KEYS,
} from '../lib/storage.ts';

describe('Tactile Quick-Pad & Exclusive Ribbon Mode Toggling', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(k => delete store[k]);
    },
  };

  let dispatchedEvents: CustomEvent[] = [];

  beforeEach(() => {
    mockLocalStorage.clear();
    dispatchedEvents = [];
    (globalThis as any).window = {
      localStorage: mockLocalStorage,
      dispatchEvent: (e: any) => {
        dispatchedEvents.push(e);
        return true;
      },
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).localStorage = mockLocalStorage;
    (globalThis as any).CustomEvent = class {
      type: string;
      detail: any;
      constructor(type: string, params?: { detail?: any }) {
        this.type = type;
        this.detail = params?.detail;
      }
    };
  });

  it('verifies storage persistence and event dispatching for Tactile Quick-Pad', () => {
    assert.strictEqual(getStoredTactileQuickPad(false), false);

    setStoredTactileQuickPad(true);
    assert.strictEqual(getStoredTactileQuickPad(false), true);
    assert.strictEqual(store[STORAGE_KEYS.SHOW_TACTILE_QUICK_PAD], 'true');
    assert.strictEqual(dispatchedEvents.length, 1);
    assert.strictEqual(dispatchedEvents[0].type, TACTILE_QUICK_PAD_EVENT);
    assert.strictEqual(dispatchedEvents[0].detail.show, true);

    setStoredTactileQuickPad(false);
    assert.strictEqual(getStoredTactileQuickPad(true), false);
    assert.strictEqual(store[STORAGE_KEYS.SHOW_TACTILE_QUICK_PAD], 'false');
    assert.strictEqual(dispatchedEvents.length, 2);
    assert.strictEqual(dispatchedEvents[1].detail.show, false);
  });

  it('verifies Tactile Quick-Pad source has all red-circled input controls with full parity', () => {
    const hudSourcePath = path.resolve(process.cwd(), 'components/composer/FloatingScoreHud.tsx');
    const hudSource = fs.readFileSync(hudSourcePath, 'utf8');

    // 1. Quick-Pad container exists
    assert.ok(hudSource.includes('id="floating-score-hud-tactile-quickpad"'));

    // 2. Row 1: Pitch Numbers 1-7, 0 (Rest), - (Dash), ␣ (Empty)
    for (let p = 1; p <= 7; p++) {
      assert.ok(
        hudSource.includes(`id={\`quickpad-pitch-\${item.p}-btn\`}`),
        'Quick-Pad dynamic pitch button mapping exists'
      );
    }
    assert.ok(hudSource.includes('id="quickpad-pitch-0-btn"'), 'Quick-Pad should contain Rest 0');
    assert.ok(hudSource.includes('id="quickpad-dash-btn"'), 'Quick-Pad should contain Dash -');
    assert.ok(hudSource.includes('id="quickpad-empty-btn"'), 'Quick-Pad should contain Empty beat spacer');

    // 3. Row 2: Octaves, Duration Presets, and Multipliers
    assert.ok(hudSource.includes('id="quickpad-octave-down-btn"'), 'Quick-Pad should contain 8vb • octave down');
    assert.ok(hudSource.includes('id="quickpad-octave-reset-btn"'), 'Quick-Pad should contain octave reset');
    assert.ok(hudSource.includes('id="quickpad-octave-up-btn"'), 'Quick-Pad should contain 8va • octave up');
    assert.ok(hudSource.includes('id="quickpad-dur-1-4-btn"'), 'Quick-Pad should contain 1/4 note duration');
    assert.ok(hudSource.includes('id="quickpad-dur-1-2-btn"'), 'Quick-Pad should contain 1/2 note duration');
    assert.ok(hudSource.includes('id="quickpad-dur-1-btn"'), 'Quick-Pad should contain 1 beat duration');
    assert.ok(hudSource.includes('id="quickpad-dur-2-btn"'), 'Quick-Pad should contain 2 beat duration');
    assert.ok(hudSource.includes('id="quickpad-dur-4-btn"'), 'Quick-Pad should contain 4 beat duration');
    assert.ok(hudSource.includes('id="quickpad-dur-halve-btn"'), 'Quick-Pad should contain / 2 halve duration');
    assert.ok(hudSource.includes('id="quickpad-dur-double-btn"'), 'Quick-Pad should contain x 2 double duration');

    // 4. Row 3: Modifiers, Articulations & Navigation
    assert.ok(hudSource.includes('id="quickpad-dur-dot-btn"'), 'Quick-Pad should contain Dot button');
    assert.ok(hudSource.includes('id="quickpad-slur-btn"'), 'Quick-Pad should contain Slur button');
    assert.ok(hudSource.includes('id="quickpad-tie-btn"'), 'Quick-Pad should contain Tie button');
    assert.ok(hudSource.includes('id="quickpad-sharp-btn"'), 'Quick-Pad should contain Sharp accidental');
    assert.ok(hudSource.includes('id="quickpad-flat-btn"'), 'Quick-Pad should contain Flat accidental');
    assert.ok(hudSource.includes('id="quickpad-triplet-btn"'), 'Quick-Pad should contain Triplet button');
    assert.ok(hudSource.includes('id="quickpad-insert-note-btn"'), 'Quick-Pad should contain Insert Note button');
    assert.ok(hudSource.includes('id="quickpad-prev-note-btn"'), 'Quick-Pad should contain Prev Note button');
    assert.ok(hudSource.includes('id="quickpad-next-note-btn"'), 'Quick-Pad should contain Next Note button');
    assert.ok(hudSource.includes('id="quickpad-delete-note-btn"'), 'Quick-Pad should contain Delete Note button');

    // 5. Touch target ergonomics compliance (min 44px)
    assert.ok(
      hudSource.includes('min-h-[44px] min-w-[44px]'),
      'Touch buttons should comply with Apple HIG >= 44x44px'
    );
  });

  it('verifies mutual exclusivity: ribbon pitch inputs are hidden when showTactileQuickPad is true', () => {
    const hudSourcePath = path.resolve(process.cwd(), 'components/composer/FloatingScoreHud.tsx');
    const hudSource = fs.readFileSync(hudSourcePath, 'utf8');

    // All 4 pitch input containers in ribbon MUST have the condition !showTactileQuickPad
    const pitchPaletteCondition = "activeField === 'pitch' && !showTactileQuickPad";
    const occurrences = (hudSource.match(/activeField === 'pitch' && !showTactileQuickPad/g) || []).length;
    assert.strictEqual(
      occurrences,
      4,
      'All 4 ribbon note input containers (pitch palette, octave controls, duration presets, modifiers) must be conditioned on !showTactileQuickPad'
    );

    // Verify there are no lingering bare `activeField === 'pitch' && (` without !showTactileQuickPad in the note input groups
    const barePitchContainers = hudSource.match(/\{activeField === 'pitch' && \(/g) || [];
    assert.strictEqual(
      barePitchContainers.length,
      0,
      'There should be zero bare activeField === "pitch" containers in note input sections'
    );
  });

  it('verifies auto-rest button is relabeled to "Fill Rest" to disambiguate from Quick-Pad', () => {
    const hudSourcePath = path.resolve(process.cwd(), 'components/composer/FloatingScoreHud.tsx');
    const hudSource = fs.readFileSync(hudSourcePath, 'utf8');

    assert.ok(hudSource.includes('id="floating-hud-auto-rest-btn"'));
    assert.ok(hudSource.includes('<span>Fill Rest</span>'));
    assert.strictEqual(
      hudSource.includes('id="floating-hud-auto-rest-btn"') &&
        hudSource.includes('<span>Pad</span>'),
      false
    );
  });

  it('verifies Quick-Pad close button properly updates storage and resets showTactileQuickPad', () => {
    const hudSourcePath = path.resolve(process.cwd(), 'components/composer/FloatingScoreHud.tsx');
    const hudSource = fs.readFileSync(hudSourcePath, 'utf8');

    assert.ok(
      hudSource.includes('const handleCloseTactilePad = React.useCallback(() => {'),
      'handleCloseTactilePad callback must exist'
    );
    assert.ok(
      hudSource.includes('setStoredTactileQuickPad(false);'),
      'handleCloseTactilePad must persist false to storage'
    );
  });
});
