import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { SOUNDFONT_CATALOG, SoundFontEngine } from '../lib/soundFontEngine.ts';
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

  it('sanitizes notes with kalimba and music_box without reverting them to default', () => {
    const rawKalimbaSong: any = {
      id: 'test-kalimba-song',
      title: 'Kalimba Tune',
      key: 'C',
      timeSignature: '4/4',
      bpm: 100,
      measures: [
        {
          id: 'm-1',
          measureNumber: 1,
          notes: [{ id: 'n-1', pitch: 1, octave: 0, duration: 1, instrument: 'kalimba', lyric: { hanlo: '琴' } }],
        },
      ],
    };

    const sanitizedKalimba = sanitizeSong(rawKalimbaSong);
    assert.ok(sanitizedKalimba);
    assert.equal(sanitizedKalimba.measures[0].notes[0].instrument, 'kalimba');

    const rawMusicBoxSong: any = {
      ...rawKalimbaSong,
      id: 'test-music-box-song',
      measures: [
        {
          id: 'm-2',
          measureNumber: 1,
          notes: [{ id: 'n-2', pitch: 3, octave: 1, duration: 1, instrument: 'music_box', lyric: { hanlo: '音' } }],
        },
      ],
    };
    const sanitizedMusicBox = sanitizeSong(rawMusicBoxSong);
    assert.ok(sanitizedMusicBox);
    assert.equal(sanitizedMusicBox.measures[0].notes[0].instrument, 'music_box');

    const invalidSong: any = {
      ...rawKalimbaSong,
      id: 'test-invalid-song',
      measures: [
        {
          id: 'm-3',
          measureNumber: 1,
          notes: [{ id: 'n-3', pitch: 5, octave: 0, duration: 1, instrument: 'non_existent_inst', lyric: { hanlo: '試' } }],
        },
      ],
    };
    const sanitizedInvalid = sanitizeSong(invalidSong);
    assert.ok(sanitizedInvalid);
    assert.equal(sanitizedInvalid.measures[0].notes[0].instrument, undefined);
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

  it('verifies acoustic differentiation between flute, harmonica, and saxophone', () => {
    const fluteMeta = SOUNDFONT_CATALOG['flute'];
    const harmonicaMeta = SOUNDFONT_CATALOG['harmonica'];
    const saxMeta = SOUNDFONT_CATALOG['saxophone'];

    assert.ok(fluteMeta, 'Flute metadata must exist');
    assert.ok(harmonicaMeta, 'Harmonica metadata must exist');
    assert.ok(saxMeta, 'Saxophone metadata must exist');

    // Each must have unique GM programs (Alto Sax = 65, Harmonica = 22, Flute = 73)
    assert.equal(fluteMeta.gmProgram, 73);
    assert.equal(harmonicaMeta.gmProgram, 22);
    assert.equal(saxMeta.gmProgram, 65);
    assert.equal(saxMeta.gmName, 'alto_sax');
    assert.equal(GM_INSTRUMENT_MAP['saxophone'], 65);
    assert.notEqual(fluteMeta.gmProgram, harmonicaMeta.gmProgram);
    assert.notEqual(harmonicaMeta.gmProgram, saxMeta.gmProgram);
    assert.notEqual(fluteMeta.gmProgram, saxMeta.gmProgram);

    // Each must map to distinct GM names
    assert.notEqual(fluteMeta.gmName, harmonicaMeta.gmName);
    assert.notEqual(harmonicaMeta.gmName, saxMeta.gmName);
    assert.notEqual(fluteMeta.gmName, saxMeta.gmName);
  });

  it('includes choir_aahs and voice_oohs in SOUNDFONT_CATALOG with proper GM metadata', () => {
    const choirMeta = SOUNDFONT_CATALOG['choir_aahs'];
    const voiceMeta = SOUNDFONT_CATALOG['voice_oohs'];

    assert.ok(choirMeta, 'choir_aahs metadata must exist in SOUNDFONT_CATALOG');
    assert.ok(voiceMeta, 'voice_oohs metadata must exist in SOUNDFONT_CATALOG');

    assert.equal(choirMeta.gmProgram, 52);
    assert.equal(choirMeta.gmName, 'choir_aahs');
    assert.equal(choirMeta.category, 'vocal');
    assert.ok(choirMeta.anchorPitches.length > 0);

    assert.equal(voiceMeta.gmProgram, 53);
    assert.equal(voiceMeta.gmName, 'voice_oohs');
    assert.equal(voiceMeta.category, 'vocal');
    assert.ok(voiceMeta.anchorPitches.length > 0);
  });

  it('maps choir_aahs and voice_oohs in GM_INSTRUMENT_MAP for MIDI export', () => {
    assert.equal(GM_INSTRUMENT_MAP.choir_aahs, 52);
    assert.equal(GM_INSTRUMENT_MAP.voice_oohs, 53);
  });

  it('exposes choir_aahs and voice_oohs in UI options and vocal category', () => {
    assert.equal(getInstrumentCategory('choir_aahs'), 'vocal');
    assert.equal(getInstrumentCategory('voice_oohs'), 'vocal');

    assert.ok(INSTRUMENT_LABELS.choir_aahs, 'choir_aahs label must be defined');
    assert.ok(INSTRUMENT_LABELS.voice_oohs, 'voice_oohs label must be defined');

    const vocalGroup = CATEGORIZED_INSTRUMENT_OPTIONS.find(g => g.category === 'vocal');
    assert.ok(vocalGroup, 'Vocal instrument category group must exist in UI');
    assert.ok(vocalGroup.options.some(opt => opt.value === 'choir_aahs'), 'choir_aahs must be present in vocal options');
    assert.ok(vocalGroup.options.some(opt => opt.value === 'voice_oohs'), 'voice_oohs must be present in vocal options');
  });

  it('sanitizes notes with choir_aahs and voice_oohs without reverting them', () => {
    const rawVocalSong: any = {
      id: 'test-vocal-song',
      title: 'Vocal Melody',
      key: 'D',
      timeSignature: '4/4',
      bpm: 90,
      measures: [
        {
          id: 'm-v1',
          measureNumber: 1,
          notes: [
            { id: 'n-c1', pitch: 1, octave: 0, duration: 2, instrument: 'choir_aahs', lyric: { hanlo: '啊' } },
            { id: 'n-v1', pitch: 2, octave: 0, duration: 2, instrument: 'voice_oohs', lyric: { hanlo: '嗚' } },
          ],
        },
      ],
    };

    const sanitized = sanitizeSong(rawVocalSong);
    assert.ok(sanitized);
    assert.equal(sanitized.measures[0].notes[0].instrument, 'choir_aahs');
    assert.equal(sanitized.measures[0].notes[1].instrument, 'voice_oohs');
  });

  it('allows storage persistence of choir_aahs and voice_oohs', () => {
    const store: Record<string, string> = {};
    (globalThis as any).window = {
      localStorage: {
        getItem: (k: string) => store[k] ?? null,
        setItem: (k: string, v: string) => { store[k] = String(v); },
      },
    };
    (globalThis as any).localStorage = (globalThis as any).window.localStorage;

    store['taigi_composer_instrument'] = 'choir_aahs';
    assert.equal(getStoredInstrument(), 'choir_aahs');

    store['taigi_composer_instrument'] = 'voice_oohs';
    assert.equal(getStoredInstrument(), 'voice_oohs');
  });

  it('verifies acoustic differentiation between choir_aahs, voice_oohs, and other instruments', () => {
    const choirMeta = SOUNDFONT_CATALOG['choir_aahs'];
    const voiceMeta = SOUNDFONT_CATALOG['voice_oohs'];

    assert.notEqual(choirMeta.gmProgram, voiceMeta.gmProgram);
    assert.notEqual(choirMeta.gmName, voiceMeta.gmName);
    assert.notEqual(choirMeta.gmProgram, GM_INSTRUMENT_MAP['piano']);
    assert.notEqual(voiceMeta.gmProgram, SOUNDFONT_CATALOG['flute'].gmProgram);
  });

  it('generates high-fidelity vocal PCM samples with physical glottal and formant modeling', () => {
    const sfEngine = new SoundFontEngine();
    const mockCtx = {
      sampleRate: 44100,
      createBuffer: (channels: number, length: number, sampleRate: number) => {
        const data = new Float32Array(length);
        return {
          numberOfChannels: channels,
          length,
          sampleRate,
          duration: length / sampleRate,
          getChannelData: () => data,
        };
      },
    };
    (sfEngine as any).ctx = mockCtx;

    // Test choir_aahs PCM generation
    const choirBuf = (sfEngine as any).generatePcmSample(mockCtx, 'choir_aahs', 60, 1.0);
    assert.ok(choirBuf, 'Choir buffer must be generated');
    const choirData = choirBuf.getChannelData(0);
    assert.equal(choirData.length, 44100);

    let choirRms = 0;
    let choirMax = 0;
    for (let i = 0; i < choirData.length; i++) {
      const s = choirData[i];
      assert.ok(!isNaN(s) && isFinite(s), `Choir sample ${i} must be a valid number`);
      choirRms += s * s;
      if (Math.abs(s) > choirMax) choirMax = Math.abs(s);
    }
    choirRms = Math.sqrt(choirRms / choirData.length);
    assert.ok(choirRms > 0.05, 'Choir vocal sample must have substantial acoustic resonance');
    assert.ok(choirMax <= 1.0, 'Choir vocal sample must avoid digital clipping');

    // Test voice_oohs PCM generation
    const voiceBuf = (sfEngine as any).generatePcmSample(mockCtx, 'voice_oohs', 60, 1.0);
    assert.ok(voiceBuf, 'Voice Oohs buffer must be generated');
    const voiceData = voiceBuf.getChannelData(0);
    assert.equal(voiceData.length, 44100);

    let voiceRms = 0;
    let voiceMax = 0;
    for (let i = 0; i < voiceData.length; i++) {
      const s = voiceData[i];
      assert.ok(!isNaN(s) && isFinite(s), `Voice sample ${i} must be a valid number`);
      voiceRms += s * s;
      if (Math.abs(s) > voiceMax) voiceMax = Math.abs(s);
    }
    voiceRms = Math.sqrt(voiceRms / voiceData.length);
    assert.ok(voiceRms > 0.05, 'Voice oohs sample must have warm acoustic presence');
    assert.ok(voiceMax <= 1.0, 'Voice oohs sample must avoid digital clipping');

    // Verify dense anchor pitches prevent formant distortion across registers (A2 to E6)
    const choirAnchors = SOUNDFONT_CATALOG['choir_aahs'].anchorPitches;
    const voiceAnchors = SOUNDFONT_CATALOG['voice_oohs'].anchorPitches;
    assert.ok(choirAnchors.length >= 20, 'Choir must have dense anchor pitches');
    assert.ok(voiceAnchors.length >= 20, 'Voice guide must have dense anchor pitches');
    assert.ok(choirAnchors[0] <= 45, 'Choir range starts at or below A2');
    assert.ok(choirAnchors[choirAnchors.length - 1] >= 88, 'Choir range extends to or above E6');
  });
});
