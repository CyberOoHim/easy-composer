import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_SONGS } from '../lib/presets.ts';
import {
  cleanSongForUrl,
  uint8ArrayToBase64Url,
  base64UrlToUint8Array,
  compressString,
  decompressBytes,
  encodeSongToUrlPayload,
  decodeSongFromUrlPayload,
  createShareableSongUrl,
  extractSongParamsFromUrl,
  parseSongFromUrl,
} from '../lib/songUrl.ts';
import type { Song } from '../types/song.ts';

describe('Song URL Compression & Sharing Engine (songUrl)', () => {
  it('encodes and decodes base64url correctly', () => {
    const bytes = new Uint8Array([72, 101, 108, 108, 111, 32, 87, 111, 114, 108, 100, 33]);
    const b64url = uint8ArrayToBase64Url(bytes);
    assert.match(b64url, /^[A-Za-z0-9_-]+$/);
    const restored = base64UrlToUint8Array(b64url);
    assert.deepEqual(restored, bytes);
  });

  it('compresses and decompresses text losslessly', async () => {
    const text = 'Numbered Notation score for 望春風 with 台語 lyrics.';
    const { bytes, compressed } = await compressString(text);
    assert.equal(compressed, true);
    const restored = await decompressBytes(bytes);
    assert.equal(restored, text);
  });

  it('generates an ultra-compact preset URL for unmodified factory presets', async () => {
    const preset = PRESET_SONGS[0];
    const encoded = await encodeSongToUrlPayload(preset);
    assert.equal(encoded.type, 'preset');
    if (encoded.type === 'preset') {
      assert.equal(encoded.id, preset.id);
    }

    const { url, isPreset } = await createShareableSongUrl(preset, 'https://composer.app/');
    assert.equal(isPreset, true);
    assert.equal(url, `https://composer.app/#preset=${preset.id}`);
  });

  it('generates compressed #song= URL for modified preset songs', async () => {
    const modifiedPreset: Song = {
      ...PRESET_SONGS[0],
      title: '望春風 (Custom Arrangement)',
    };
    const encoded = await encodeSongToUrlPayload(modifiedPreset);
    assert.equal(encoded.type, 'song');
    if (encoded.type === 'song') {
      assert.ok(encoded.payload.length > 50);
    }

    const { url, isPreset } = await createShareableSongUrl(modifiedPreset, 'https://composer.app/');
    assert.equal(isPreset, false);
    assert.ok(url.startsWith('https://composer.app/#song='));
  });

  it('round-trips custom songs losslessly through URL payload', async () => {
    const customSong: Song = {
      id: 'custom-waltz-123',
      title: 'Tâi-lô Melody in 3/4',
      subtitle: 'A lovely springtime song',
      composer: 'Test Author',
      lyricist: 'Poet',
      key: 'G',
      timeSignature: '3/4',
      bpm: 96,
      measures: [
        {
          id: 'm1',
          measureNumber: 1,
          chord: 'G',
          section: 'Verse',
          notes: [
            { id: 'm1_n1', pitch: 1, octave: 0, duration: 1, lyric: { poj: 'Chhun', hanlo: '春' } },
            { id: 'm1_n2', pitch: 3, octave: 0, duration: 1, lyric: { poj: 'thiⁿ', hanlo: '天' } },
            { id: 'm1_n3', pitch: 5, octave: 0, duration: 1, lyric: { poj: 'ê', hanlo: 'ê' } },
          ],
        },
        {
          id: 'm2',
          measureNumber: 2,
          chord: 'D7',
          barlineType: 'end',
          notes: [
            { id: 'm2_n1', pitch: 2, octave: 0, duration: 3, isDotted: true, lyric: { poj: 'hong', hanlo: '風' } },
          ],
        },
      ],
    };

    const encoded = await encodeSongToUrlPayload(customSong);
    assert.equal(encoded.type, 'song');
    if (encoded.type === 'song') {
      const decoded = await decodeSongFromUrlPayload(encoded.payload);
      assert.equal(decoded.title, customSong.title);
      assert.equal(decoded.key, 'G');
      assert.equal(decoded.timeSignature, '3/4');
      assert.equal(decoded.bpm, 96);
      assert.equal(decoded.measures.length, 2);
      assert.equal(decoded.measures[0].notes[0].lyric.hanlo, '春');
      assert.equal(decoded.measures[0].notes[0].lyric.poj, 'Chhun');
      assert.equal(decoded.measures[1].notes[0].pitch, 2);
      assert.equal(decoded.measures[1].barlineType, 'end');
    }
  });

  it('extracts song params correctly from hash and query fallbacks', () => {
    // Hash preset
    const hashPreset = extractSongParamsFromUrl('https://example.com/app/#preset=bang-chhun-hong');
    assert.deepEqual(hashPreset, { presetId: 'bang-chhun-hong' });

    // Hash song
    const hashSong = extractSongParamsFromUrl('https://example.com/app/#song=xyzPayload123');
    assert.deepEqual(hashSong, { songPayload: 'xyzPayload123' });

    // Query fallback preset
    const queryPreset = extractSongParamsFromUrl('https://example.com/app/?preset=bang-chhun-hong');
    assert.deepEqual(queryPreset, { presetId: 'bang-chhun-hong' });

    // Query fallback song
    const querySong = extractSongParamsFromUrl('https://example.com/app/?song=xyzPayload123');
    assert.deepEqual(querySong, { songPayload: 'xyzPayload123' });

    // Location object mockup
    const locMock = {
      hash: '#song=mockHashPayload',
      search: '',
    } as Location;
    const locResult = extractSongParamsFromUrl(locMock);
    assert.deepEqual(locResult, { songPayload: 'mockHashPayload' });

    // Empty URL
    assert.equal(extractSongParamsFromUrl('https://example.com/'), null);
  });

  it('parseSongFromUrl returns correct Song for preset and payload URLs', async () => {
    // 1. Preset URL
    const presetRes = await parseSongFromUrl('https://example.com/#preset=bang-chhun-hong');
    assert.ok(presetRes);
    assert.equal(presetRes.type, 'preset');
    assert.equal(presetRes.song.id, 'bang-chhun-hong');

    // 2. Custom song URL
    const testSong: Song = {
      id: 'test-song-url',
      title: 'Shared Test Score',
      key: 'F',
      timeSignature: '4/4',
      bpm: 80,
      measures: [
        {
          id: 'm1',
          measureNumber: 1,
          notes: [{ id: 'n1', pitch: 5, octave: 0, duration: 4, lyric: { poj: 'Ho', hanlo: '好' } }],
        },
      ],
    };
    const { url } = await createShareableSongUrl(testSong, 'https://example.com/');
    const parsedRes = await parseSongFromUrl(url);
    assert.ok(parsedRes);
    assert.equal(parsedRes.type, 'song');
    assert.equal(parsedRes.song.title, 'Shared Test Score');
    assert.equal(parsedRes.song.key, 'F');
  });

  it('throws descriptive error on invalid or corrupt song URL payload', async () => {
    await assert.rejects(
      async () => {
        await decodeSongFromUrlPayload('invalid-corrupted-base64-payload-###');
      },
      {
        message: /Failed to parse song JSON|Invalid song data structure/,
      }
    );
  });
});
