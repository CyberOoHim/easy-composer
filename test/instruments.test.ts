import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SOUNDFONT_CATALOG } from '../lib/soundFontEngine.ts';
import { CATEGORIZED_INSTRUMENT_OPTIONS, INSTRUMENT_LABELS, getInstrumentCategory } from '../lib/taigiUtils.ts';
import { GM_INSTRUMENT_MAP } from '../lib/midiExport.ts';
import { sanitizeSong } from '../lib/songParser.ts';
import { getStoredInstrument } from '../lib/storage.ts';

describe('New Instruments Integration (Flute, Kalimba, Music Box)', () => {
  it('includes flute, kalimba, and music_box in SOUNDFONT_CATALOG with proper GM metadata', () => {
    assert.ok(SOUNDFONT_CATALOG.flute, 'Flute must exist in SOUNDFONT_CATALOG');
    assert.equal(SOUNDFONT_CATALOG.flute.gmProgram, 73);
    assert.equal(SOUNDFONT_CATALOG.flute.category, 'standard');

    assert.ok(SOUNDFONT_CATALOG.kalimba, 'Kalimba must exist in SOUNDFONT_CATALOG');
    assert.equal(SOUNDFONT_CATALOG.kalimba.gmProgram, 108);
    assert.equal(SOUNDFONT_CATALOG.kalimba.category, 'folk');

    assert.ok(SOUNDFONT_CATALOG.music_box, 'music_box must exist in SOUNDFONT_CATALOG');
    assert.equal(SOUNDFONT_CATALOG.music_box.gmProgram, 10);
    assert.equal(SOUNDFONT_CATALOG.music_box.category, 'standard');

    assert.ok(SOUNDFONT_CATALOG['music-box'], 'music-box alias must exist in SOUNDFONT_CATALOG');
    assert.equal(SOUNDFONT_CATALOG['music-box'].gmProgram, 10);
  });

  it('maps all new instruments correctly in GM_INSTRUMENT_MAP for MIDI export', () => {
    assert.equal(GM_INSTRUMENT_MAP.flute, 73);
    assert.equal(GM_INSTRUMENT_MAP.kalimba, 108);
    assert.equal(GM_INSTRUMENT_MAP.music_box, 10);
    assert.equal(GM_INSTRUMENT_MAP['music-box'], 10);
  });

  it('exposes flute, kalimba, and music_box in UI options and categories', () => {
    assert.equal(getInstrumentCategory('flute'), 'standard');
    assert.equal(getInstrumentCategory('music_box'), 'standard');
    assert.equal(getInstrumentCategory('kalimba'), 'folk');

    assert.ok(INSTRUMENT_LABELS.flute, 'Flute label must be defined');
    assert.ok(INSTRUMENT_LABELS.kalimba, 'Kalimba label must be defined');
    assert.ok(INSTRUMENT_LABELS.music_box, 'Music box label must be defined');

    const standardGroup = CATEGORIZED_INSTRUMENT_OPTIONS.find(g => g.category === 'standard');
    assert.ok(standardGroup?.options.some(opt => opt.value === 'flute'));
    assert.ok(standardGroup?.options.some(opt => opt.value === 'music_box'));

    const folkGroup = CATEGORIZED_INSTRUMENT_OPTIONS.find(g => g.category === 'folk');
    assert.ok(folkGroup?.options.some(opt => opt.value === 'kalimba'));
  });

  it('sanitizes songs with kalimba and music_box without reverting them to default', () => {
    const rawKalimbaSong: any = {
      id: 'test-kalimba-song',
      title: 'Kalimba Tune',
      instrument: 'kalimba',
      key: 'C',
      timeSignature: '4/4',
      tempo: 100,
      measures: [
        {
          id: 'm-1',
          number: 1,
          notes: [{ id: 'n-1', pitch: 1, octave: 0, duration: 1 }],
        },
      ],
    };

    const sanitizedKalimba = sanitizeSong(rawKalimbaSong);
    assert.ok(sanitizedKalimba);
    assert.equal(sanitizedKalimba.instrument, 'kalimba');

    const rawMusicBoxSong: any = {
      ...rawKalimbaSong,
      id: 'test-music-box-song',
      instrument: 'music_box',
    };
    const sanitizedMusicBox = sanitizeSong(rawMusicBoxSong);
    assert.ok(sanitizedMusicBox);
    assert.equal(sanitizedMusicBox.instrument, 'music_box');
  });

  it('allows storage persistence of kalimba and music_box', () => {
    const store: Record<string, string> = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = String(v); },
      },
    };
    (globalThis as any).localStorage = (globalThis as any).window.localStorage;

    store['taigi_composer_instrument'] = 'kalimba';
    assert.equal(getStoredInstrument(), 'kalimba');

    store['taigi_composer_instrument'] = 'music_box';
    assert.equal(getStoredInstrument(), 'music_box');

    store['taigi_composer_instrument'] = 'flute';
    assert.equal(getStoredInstrument(), 'flute');
  });
});
