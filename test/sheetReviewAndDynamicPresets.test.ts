import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { validateSongObject } from '../scripts/review-sheets.mjs';
import { generateManifest } from '../scripts/generate-sheet-manifest.mjs';
import { PRESET_SONGS, TAIWAN_THE_GREEN, SHEET_FILE_REGISTRY } from '../lib/presets.ts';
import { importSongFromJson, exportSongToJson, sanitizeSong } from '../lib/songParser.ts';
import type { Song } from '../types/song.ts';

test('Automated Song Review & Validation Engine', async (t) => {
  await t.test('validates standard Taigi score with POJ and Hanlo', () => {
    const validTaigiSong: Song = {
      id: 'test-taigi-song',
      title: '測試台語歌',
      key: 'F',
      timeSignature: '4/4',
      bpm: 80,
      measures: [
        {
          id: 'm-1',
          measureNumber: 1,
          notes: [
            {
              id: 'm-1-n-1',
              pitch: 1,
              octave: 0,
              duration: 1,
              lyric: { hanlo: '天', poj: 'thiⁿ' },
            },
            {
              id: 'm-1-n-2',
              pitch: 2,
              octave: 0,
              duration: 1,
              lyric: { hanlo: '黑', poj: 'o·' },
            },
            {
              id: 'm-1-n-3',
              pitch: 3,
              octave: 0,
              duration: 1,
              lyric: { hanlo: '黑', poj: 'o·' },
            },
            {
              id: 'm-1-n-4',
              pitch: 5,
              octave: 0,
              duration: 1,
              lyric: { hanlo: '欲', poj: 'beh' },
            },
          ],
        },
      ],
    };

    const errors = validateSongObject(validTaigiSong, 'data/sheets/test.taigi.json', true);
    assert.equal(errors.length, 0, `Expected 0 errors, got: ${errors.join(', ')}`);
  });

  await t.test('validates non-Taigi / General score (.json) without requiring POJ', () => {
    const generalSong = {
      id: 'general-folk-song',
      title: 'Jasmine Flower 茉莉花',
      key: 'G',
      timeSignature: '4/4',
      bpm: 90,
      measures: [
        {
          id: 'm-1',
          measureNumber: 1,
          notes: [
            {
              id: 'm-1-n-1',
              pitch: 3,
              octave: 0,
              duration: 1,
              lyric: { hanlo: '好' },
            },
            {
              id: 'm-1-n-2',
              pitch: 5,
              octave: 0,
              duration: 1,
              lyric: { hanlo: '一' },
            },
            {
              id: 'm-1-n-3',
              pitch: 6,
              octave: 0,
              duration: 1,
              lyric: { hanlo: '朵' },
            },
            {
              id: 'm-1-n-4',
              pitch: 1,
              octave: 1,
              duration: 1,
              lyric: { hanlo: '美' },
            },
          ],
        },
      ],
    };

    const errors = validateSongObject(generalSong, 'data/sheets/jasmine.json', false);
    assert.equal(errors.length, 0, `General .json score should validate without error, got: ${errors.join(', ')}`);
  });

  await t.test('catches malformed metadata and measures in song review', () => {
    const invalidSong = {
      id: 'bad song id with spaces!',
      title: '',
      key: 'H#', // Invalid key
      timeSignature: '5/7', // Invalid meter
      bpm: 9999, // Invalid BPM
      measures: [
        {
          id: '',
          notes: [
            { id: 'n1', pitch: 99, octave: 5, duration: -1 },
          ],
        },
      ],
    };

    const errors = validateSongObject(invalidSong, 'data/sheets/bad.json', false);
    assert.ok(errors.length >= 5, `Expected multiple validation errors, got ${errors.length}`);
    assert.ok(errors.some(e => e.includes('invalid characters')));
    assert.ok(errors.some(e => e.includes('Missing or invalid \'title\'')));
    assert.ok(errors.some(e => e.includes('Invalid key')));
    assert.ok(errors.some(e => e.includes('Invalid timeSignature')));
    assert.ok(errors.some(e => e.includes('Invalid bpm')));
    assert.ok(errors.some(e => e.includes('invalid pitch')));
    assert.ok(errors.some(e => e.includes('invalid octave')));
    assert.ok(errors.some(e => e.includes('invalid duration')));
  });

  await t.test('detects duplicate measure and note IDs within a song', () => {
    const duplicateIdsSong = {
      id: 'dup-test',
      title: 'Duplicate Test',
      key: 'C',
      timeSignature: '4/4',
      bpm: 80,
      measures: [
        {
          id: 'measure-same',
          measureNumber: 1,
          notes: [
            { id: 'note-same', pitch: 1, octave: 0, duration: 1, lyric: { hanlo: 'A' } },
            { id: 'note-same', pitch: 2, octave: 0, duration: 1, lyric: { hanlo: 'B' } },
          ],
        },
        {
          id: 'measure-same',
          measureNumber: 2,
          notes: [
            { id: 'note-unique', pitch: 3, octave: 0, duration: 1, lyric: { hanlo: 'C' } },
          ],
        },
      ],
    };

    const errors = validateSongObject(duplicateIdsSong, 'data/sheets/dup.json', false);
    assert.ok(errors.some(e => e.includes('duplicate measure id "measure-same"')));
    assert.ok(errors.some(e => e.includes('duplicate note id "note-same"')));
  });
});

test('Dynamic Preset Folder & Manifest Integration', async (t) => {
  await t.test('SHEET_FILE_REGISTRY contains all 4 default sheets with correct metadata', () => {
    assert.ok(SHEET_FILE_REGISTRY.length >= 4, `Expected at least 4 sheets, got ${SHEET_FILE_REGISTRY.length}`);
    const bch = SHEET_FILE_REGISTRY.find(s => s.id === 'bang-chhun-hong');
    const uia = SHEET_FILE_REGISTRY.find(s => s.id === 'u-ia-hoe');
    const skh = SHEET_FILE_REGISTRY.find(s => s.id === 'su-ki-hong');
    const ttg = SHEET_FILE_REGISTRY.find(s => s.id === 'taiwan-the-green');

    assert.ok(bch, 'bang-chhun-hong must be present in registry');
    assert.ok(uia, 'u-ia-hoe must be present in registry');
    assert.ok(skh, 'su-ki-hong must be present in registry');
    assert.ok(ttg, 'taiwan-the-green must be present in registry');

    assert.equal(bch?.isTaigi, true);
    assert.equal(bch?.order, 1);
    assert.equal(uia?.order, 2);
    assert.equal(skh?.order, 3);
    assert.equal(ttg?.order, 4);
  });

  await t.test('PRESET_SONGS retains exact expected ordering and song details', () => {
    assert.ok(PRESET_SONGS.length >= 4);
    assert.equal(PRESET_SONGS[0].id, 'bang-chhun-hong');
    assert.equal(PRESET_SONGS[0].title, '望春風');
    assert.equal(PRESET_SONGS[1].id, 'u-ia-hoe');
    assert.equal(PRESET_SONGS[2].id, 'su-ki-hong');
    assert.equal(PRESET_SONGS[3].id, 'taiwan-the-green');

    assert.equal(TAIWAN_THE_GREEN.id, 'taiwan-the-green');
    assert.equal(TAIWAN_THE_GREEN.title, '台灣翠青');
  });

  await t.test('manifest generator runs cleanly and produces valid manifest file', () => {
    // Generate manifest programmatically
    generateManifest();
    const manifestPath = path.resolve(process.cwd(), 'lib/sheetManifest.ts');
    assert.ok(fs.existsSync(manifestPath), 'lib/sheetManifest.ts must exist');
    const content = fs.readFileSync(manifestPath, 'utf-8');
    assert.ok(content.includes('export const RAW_PRESET_SHEETS'));
    assert.ok(content.includes('export const SHEET_FILE_REGISTRY'));
    assert.ok(content.includes('bang-chhun-hong.taigi.json'));
  });
});

test('Format Compatibility & Import / Export Interoperability', async (t) => {
  await t.test('both .taigi.json and .json export cleanly with exportSongToJson', () => {
    const song = PRESET_SONGS[0];
    const exportedJson = exportSongToJson(song);
    assert.ok(typeof exportedJson === 'string');
    assert.ok(exportedJson.includes('"title": "望春風"'));

    const reimported = importSongFromJson(exportedJson);
    assert.ok(reimported !== null);
    assert.equal(reimported.id, song.id);
    assert.equal(reimported.measures.length, song.measures.length);
  });

  await t.test('imports non-Taigi standard JSON with general lyrics cleanly', () => {
    const nonTaigiJson = JSON.stringify({
      id: 'twinkle-star',
      title: 'Twinkle Twinkle Little Star',
      key: 'C',
      timeSignature: '4/4',
      bpm: 100,
      measures: [
        {
          id: 'm-1',
          measureNumber: 1,
          notes: [
            { id: 'n-1', pitch: 1, octave: 0, duration: 1, lyric: { hanlo: 'Twin' } },
            { id: 'n-2', pitch: 1, octave: 0, duration: 1, lyric: { hanlo: 'kle' } },
            { id: 'n-3', pitch: 5, octave: 0, duration: 1, lyric: { hanlo: 'twin' } },
            { id: 'n-4', pitch: 5, octave: 0, duration: 1, lyric: { hanlo: 'kle' } },
          ],
        },
      ],
    });

    const parsed = importSongFromJson(nonTaigiJson);
    assert.ok(parsed !== null);
    assert.equal(parsed.title, 'Twinkle Twinkle Little Star');
    assert.equal(parsed.measures[0].notes[0].lyric?.hanlo, 'Twin');
    assert.equal(parsed.measures[0].notes[0].lyric?.poj, '');

    // Re-export and verify roundtrip
    const reExported = exportSongToJson(parsed);
    const reImported = importSongFromJson(reExported);
    assert.equal(reImported?.title, 'Twinkle Twinkle Little Star');
  });

  await t.test('developer can add a new .json or .taigi.json file and sanitize it without corruption', () => {
    const rawCustomSheet = {
      order: 10,
      id: 'custom-dev-song',
      title: 'Developer Added Song',
      key: 'G',
      timeSignature: '3/4',
      bpm: 110,
      measures: [
        {
          id: 'm-1',
          notes: [
            { id: 'n-1', pitch: 5, octave: 0, duration: 1, lyric: { hanlo: 'Dev' } },
            { id: 'n-2', pitch: 6, octave: 0, duration: 1, lyric: { hanlo: 'Song' } },
            { id: 'n-3', pitch: 1, octave: 1, duration: 1, lyric: { hanlo: 'Note' } },
          ],
        },
      ],
    };

    const sanitized = sanitizeSong(rawCustomSheet);
    assert.ok(sanitized !== null);
    assert.equal(sanitized.id, 'custom-dev-song');
    assert.equal(sanitized.timeSignature, '3/4');
    assert.equal(sanitized.bpm, 110);
    assert.equal(sanitized.measures[0].measureNumber, 1);
  });
});
