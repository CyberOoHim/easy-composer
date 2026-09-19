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

  it('cleanSongForUrl strips empty lyrics, zero octave, false booleans, and empty objects', () => {
    const song: Song = {
      id: 'clean-test',
      title: 'Clean Test Song',
      subtitle: '',
      key: 'C',
      timeSignature: '4/4',
      bpm: 80,
      measures: [
        {
          id: 'm1',
          measureNumber: 1,
          chord: '',
          notes: [
            {
              id: 'n1',
              pitch: 1,
              octave: 0,
              duration: 1,
              isDotted: false,
              tieToNext: false,
              lyric: { poj: '', hanlo: '' },
            },
            {
              id: 'n2',
              pitch: 2,
              octave: 1,
              duration: 1,
              isDotted: true,
              lyric: { poj: 'ti', hanlo: '知' },
            },
          ],
        },
      ],
    };

    const cleaned = cleanSongForUrl(song) as Record<string, unknown>;
    assert.equal('subtitle' in cleaned, false);
    const measures = cleaned.measures as Array<Record<string, unknown>>;
    assert.equal('chord' in measures[0], false);
    const notes = measures[0].notes as Array<Record<string, unknown>>;

    // Note 1: octave 0, isDotted: false, tieToNext: false, empty lyric should all be stripped
    assert.equal('octave' in notes[0], false);
    assert.equal('isDotted' in notes[0], false);
    assert.equal('tieToNext' in notes[0], false);
    assert.equal('lyric' in notes[0], false);

    // Note 2: octave 1, isDotted: true, non-empty lyric should remain
    assert.equal(notes[1].octave, 1);
    assert.equal(notes[1].isDotted, true);
    assert.ok(notes[1].lyric);
  });

  it('compresses and roundtrips a large song with multi-verse lyrics', async () => {
    const largeSong: Song = {
      id: 'large-song',
      title: 'Long Hymn Score with Multi-Verse Lyrics',
      composer: 'Composer Name',
      key: 'Eb',
      timeSignature: '4/4',
      bpm: 72,
      measures: Array.from({ length: 32 }, (_, i) => ({
        id: `m-${i + 1}`,
        measureNumber: i + 1,
        chord: i % 2 === 0 ? 'Eb' : 'Bb7',
        notes: [
          { id: `m-${i + 1}-n1`, pitch: 1 as const, octave: 0, duration: 1, lyric: { poj: 'Sèng', hanlo: '聖' } },
          { id: `m-${i + 1}-n2`, pitch: 3 as const, octave: 0, duration: 1, lyric: { poj: 'châi', hanlo: '哉' } },
          { id: `m-${i + 1}-n3`, pitch: 5 as const, octave: 0, duration: 1, lyric: { poj: 'sèng', hanlo: '聖' } },
          { id: `m-${i + 1}-n4`, pitch: 1 as const, octave: 1, duration: 1, lyric: { poj: 'châi', hanlo: '哉' } },
        ],
      })),
    };

    const encoded = await encodeSongToUrlPayload(largeSong);
    assert.equal(encoded.type, 'song');
    if (encoded.type === 'song') {
      const decoded = await decodeSongFromUrlPayload(encoded.payload);
      assert.equal(decoded.title, largeSong.title);
      assert.equal(decoded.measures.length, 32);
      assert.equal(decoded.measures[0].notes[0].lyric.hanlo, '聖');
      assert.equal(decoded.measures[31].notes[3].octave, 1);
    }
  });

  it('generates preset URL for su-ki-hong (四季紅) and compresses when modified without hanging', async () => {
    const suKiHong = PRESET_SONGS.find(p => p.id === 'su-ki-hong');
    assert.ok(suKiHong, 'su-ki-hong preset must exist');

    // 1. Factory preset should generate #preset=su-ki-hong
    const presetRes = await createShareableSongUrl(suKiHong, 'https://composer.app/');
    assert.equal(presetRes.isPreset, true);
    assert.equal(presetRes.url, 'https://composer.app/#preset=su-ki-hong');

    // 2. Modified su-ki-hong should generate #song= URL without hanging
    const modifiedSuKiHong: Song = {
      ...suKiHong,
      subtitle: 'Sù-kì-hông (Arranged for Choir)',
    };
    const modifiedRes = await createShareableSongUrl(modifiedSuKiHong, 'https://composer.app/');
    assert.equal(modifiedRes.isPreset, false);
    assert.ok(modifiedRes.url.startsWith('https://composer.app/#song='));
    assert.ok(modifiedRes.payloadSize > 1000);

    const decoded = await parseSongFromUrl(modifiedRes.url);
    assert.ok(decoded);
    assert.equal(decoded.type, 'song');
    assert.equal(decoded.song.title, '四季紅');
    assert.equal(decoded.song.subtitle, 'Sù-kì-hông (Arranged for Choir)');
    assert.equal(decoded.song.measures.length, 34);
  });

  it('compresses and decompresses very large payloads (50KB+) within timeout threshold', async () => {
    const largeText = 'EasyComposerMusicalScoreData_'.repeat(2000); // ~58KB
    const { bytes, compressed } = await compressString(largeText);
    assert.equal(compressed, true);
    assert.ok(bytes.length < largeText.length);

    const restored = await decompressBytes(bytes);
    assert.equal(restored, largeText);
  });

  it('correctly encodes and decodes in browser-like environment without Buffer', async () => {
    const originalBuffer = globalThis.Buffer;
    try {
      // @ts-expect-error - Simulating browser environment where Buffer is undefined
      delete globalThis.Buffer;

      const bytes = new Uint8Array([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 255, 0, 128]);
      const b64 = uint8ArrayToBase64Url(bytes);
      assert.ok(typeof b64 === 'string');
      assert.match(b64, /^[A-Za-z0-9_-]+$/);

      const restored = base64UrlToUint8Array(b64);
      assert.deepEqual(restored, bytes);

      // Verify newly created song in browser environment
      const brandNewSong: Song = {
        id: 'new-song-no-buffer',
        title: 'New Melody Created by User',
        subtitle: 'Fresh composition',
        composer: 'User Composer',
        lyricist: 'Local Poet',
        key: 'D',
        timeSignature: '3/4',
        bpm: 108,
        measures: [
          {
            id: 'm-1',
            measureNumber: 1,
            chord: 'D',
            notes: [
              { id: 'n-1', pitch: 1, octave: 0, duration: 1, lyric: { poj: 'Lí', hanlo: '你' } },
              { id: 'n-2', pitch: 3, octave: 0, duration: 1, lyric: { poj: 'hó', hanlo: '好' } },
              { id: 'n-3', pitch: 5, octave: 0, duration: 1, lyric: { poj: 'bô', hanlo: '無' } },
            ],
          },
          {
            id: 'm-2',
            measureNumber: 2,
            chord: 'A7',
            barlineType: 'end',
            notes: [
              { id: 'n-4', pitch: 5, octave: 0, duration: 3, isDotted: true, lyric: { poj: 'ah', hanlo: '啊' } },
            ],
          },
        ],
      };

      const shareResult = await createShareableSongUrl(brandNewSong, 'https://test.app/');
      assert.equal(shareResult.isPreset, false);
      assert.ok(shareResult.url.startsWith('https://test.app/#song='));

      const parsed = await parseSongFromUrl(shareResult.url);
      assert.ok(parsed);
      assert.equal(parsed.type, 'song');
      assert.equal(parsed.song.title, 'New Melody Created by User');
      assert.equal(parsed.song.bpm, 108);
      assert.equal(parsed.song.measures.length, 2);
      assert.equal(parsed.song.measures[0].notes[0].lyric.hanlo, '你');
    } finally {
      globalThis.Buffer = originalBuffer;
    }
  });

  it('shares user-edited preset songs and user newly-created songs reliably', async () => {
    // 1. User edited preset song (望春風 edited with extra measure and altered lyrics)
    const basePreset = PRESET_SONGS[0];
    const editedPreset: Song = {
      ...basePreset,
      title: `${basePreset.title} (User Edited Edition)`,
      bpm: 76,
      measures: [
        ...basePreset.measures,
        {
          id: 'user-added-m',
          measureNumber: basePreset.measures.length + 1,
          chord: 'F',
          barlineType: 'end',
          notes: [
            { id: 'user-n1', pitch: 1, octave: 1, duration: 4, lyric: { poj: 'Soah', hanlo: '煞' } },
          ],
        },
      ],
    };

    const editedUrlResult = await createShareableSongUrl(editedPreset, 'https://example.com/easy-composer/');
    assert.equal(editedUrlResult.isPreset, false);
    assert.ok(editedUrlResult.url.includes('#song='));

    const parsedEdited = await parseSongFromUrl(editedUrlResult.url);
    assert.ok(parsedEdited);
    assert.equal(parsedEdited.type, 'song');
    assert.equal(parsedEdited.song.title, `${basePreset.title} (User Edited Edition)`);
    assert.equal(parsedEdited.song.measures.length, basePreset.measures.length + 1);
    assert.equal(parsedEdited.song.measures[parsedEdited.song.measures.length - 1].notes[0].lyric.hanlo, '煞');

    // 2. Newly created blank/custom song
    const newlyCreatedSong: Song = {
      id: `new-${Date.now()}`,
      title: 'Untilted Masterpiece',
      key: 'C',
      timeSignature: '4/4',
      bpm: 90,
      measures: [
        {
          id: 'm1',
          measureNumber: 1,
          notes: [
            { id: 'n1', pitch: 1, octave: 0, duration: 2, lyric: { poj: '', hanlo: '' } },
            { id: 'n2', pitch: 2, octave: 0, duration: 2, lyric: { poj: '', hanlo: '' } },
          ],
        },
      ],
    };

    const newSongUrlResult = await createShareableSongUrl(newlyCreatedSong, 'https://example.com/easy-composer/');
    assert.equal(newSongUrlResult.isPreset, false);
    assert.ok(newSongUrlResult.url.includes('#song='));

    const parsedNew = await parseSongFromUrl(newSongUrlResult.url);
    assert.ok(parsedNew);
    assert.equal(parsedNew.type, 'song');
    assert.equal(parsedNew.song.title, 'Untilted Masterpiece');
    assert.equal(parsedNew.song.measures.length, 1);
    assert.equal(parsedNew.song.measures[0].notes.length, 2);
  });
});
