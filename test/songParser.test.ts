import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PRESET_SONGS } from '../lib/presets.ts';
import { isSongModifiedFromPreset } from '../lib/indexedDb.ts';
import {
  sanitizeSong,
  importSongFromJson,
  importSongFromText,
  exportSongToText,
  exportSongToJson,
  formatNoteToNumberedNotationString,
} from '../lib/songParser.ts';
import type { NumberedNotationNote, Song } from '../types/song.ts';

function minimalNote(overrides: Partial<NumberedNotationNote> = {}): NumberedNotationNote {
  return {
    id: 'n1',
    pitch: 5,
    octave: 0,
    duration: 1,
    lyric: { poj: '', hanlo: '' },
    ...overrides,
  };
}

function minimalSong(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'song-test',
    title: 'Test Song',
    key: 'C',
    timeSignature: '4/4',
    bpm: 80,
    measures: [
      {
        id: 'm1',
        measureNumber: 1,
        notes: [minimalNote()],
      },
    ],
    ...overrides,
  };
}

describe('sanitizeSong', () => {
  it('returns null for non-objects, missing id, and empty measures', () => {
    assert.equal(sanitizeSong(null), null);
    assert.equal(sanitizeSong(undefined), null);
    assert.equal(sanitizeSong('song'), null);
    assert.equal(sanitizeSong({}), null);
    assert.equal(sanitizeSong({ id: '', title: 'T', measures: [{ notes: [] }] }), null);
    assert.equal(sanitizeSong({ id: 'x', title: 'T', measures: [] }), null);
    assert.equal(sanitizeSong({ id: 'x', title: 'T' }), null);
  });

  it('titles a missing or blank title Untitled Song', () => {
    const missing = sanitizeSong(minimalSong({ title: undefined }));
    assert.ok(missing);
    assert.equal(missing.title, 'Untitled Song');

    const blank = sanitizeSong(minimalSong({ title: '   ' }));
    assert.ok(blank);
    assert.equal(blank.title, 'Untitled Song');
  });

  it('maps an unknown key to C', () => {
    const song = sanitizeSong(minimalSong({ key: 'H' }));
    assert.ok(song);
    assert.equal(song.key, 'C');
  });

  it('repairs a missing lyric object so hanlo and poj always exist', () => {
    const song = sanitizeSong(minimalSong({
      measures: [{
        id: 'm1',
        notes: [{ id: 'n1', pitch: 1, octave: 0, duration: 1 }],
      }],
    }));
    assert.ok(song);
    const lyric = song.measures[0].notes[0].lyric;
    assert.ok(lyric);
    assert.equal(typeof lyric.hanlo, 'string');
    assert.equal(typeof lyric.poj, 'string');
    assert.equal(lyric.hanlo, '');
    assert.equal(lyric.poj, '');
  });

  it('migrates legacy tl / hanji / custom lyric aliases into poj and hanlo', () => {
    const song = sanitizeSong(minimalSong({
      measures: [{
        id: 'm1',
        notes: [{
          id: 'n1',
          pitch: 1,
          octave: 0,
          duration: 1,
          lyric: { tl: 'Bāng', hanji: '望', custom: '望' },
        }],
      }],
    }));
    assert.ok(song);
    const lyric = song.measures[0].notes[0].lyric;
    assert.equal(lyric.poj, 'Bāng');
    assert.equal(lyric.hanlo, '望');
  });

  it('does not mutate the caller’s object', () => {
    const raw = minimalSong({
      measures: [{
        id: 'm1',
        notes: [{ id: 'n1', pitch: 1, duration: 1 }],
      }],
    });
    const before = JSON.stringify(raw);
    const sanitized = sanitizeSong(raw);
    assert.ok(sanitized);
    assert.equal(JSON.stringify(raw), before);
    assert.ok(sanitized.measures[0].notes[0].lyric);
    const originalNote = (raw.measures as { notes: Record<string, unknown>[] }[])[0].notes[0];
    assert.equal(originalNote.lyric, undefined);
  });

  it('does not treat a factory preset as modified after sanitizing', () => {
    const factory = PRESET_SONGS[0];
    const sanitized = sanitizeSong(JSON.parse(JSON.stringify(factory)));
    assert.ok(sanitized);
    assert.equal(JSON.stringify(sanitized.measures), JSON.stringify(factory.measures));
    assert.equal(isSongModifiedFromPreset(sanitized), false);
    assert.equal(sanitized.id, factory.id);
    assert.equal(sanitized.title, factory.title);
    assert.equal(sanitized.key, factory.key);
  });
});

describe('importSongFromJson', () => {
  it('strips a UTF-8 BOM before parsing', () => {
    const json = JSON.stringify(minimalSong({ title: 'BOM Song' }));
    const song = importSongFromJson(`\uFEFF${json}`);
    assert.equal(song.title, 'BOM Song');
    assert.equal(song.measures.length, 1);
  });

  it('unwraps a markdown json fence', () => {
    const json = JSON.stringify(minimalSong({ title: 'Fenced Song' }));
    const song = importSongFromJson('```json\n' + json + '\n```');
    assert.equal(song.title, 'Fenced Song');
  });

  it('rejects an empty measures array', () => {
    assert.throws(
      () => importSongFromJson(JSON.stringify({ id: 'x', title: 'Empty', measures: [] })),
      /missing title or measures/i,
    );
  });

  it('titles a JSON song with no title Untitled Song', () => {
    const raw = minimalSong();
    delete raw.title;
    const song = importSongFromJson(JSON.stringify(raw));
    assert.equal(song.title, 'Untitled Song');
  });

  it('repairs missing lyric on JSON import', () => {
    const song = importSongFromJson(JSON.stringify(minimalSong({
      measures: [{ id: 'm1', notes: [{ id: 'n1', pitch: 2, duration: 1 }] }],
    })));
    assert.ok(song.measures[0].notes[0].lyric);
    assert.equal(song.measures[0].notes[0].lyric.hanlo, '');
    assert.equal(song.measures[0].notes[0].lyric.poj, '');
  });
});

describe('dotted-half text round-trip', () => {
  it('exports duration 3 with isDotted as -- not a single dot, and re-imports as 3 beats', () => {
    const song = sanitizeSong(minimalSong({
      title: 'Dotted Half',
      measures: [{
        id: 'm1',
        measureNumber: 1,
        notes: [minimalNote({ duration: 3, isDotted: true })],
      }],
    })) as Song;

    const encoded = formatNoteToNumberedNotationString(song.measures[0].notes[0]);
    assert.match(encoded, /--/);
    assert.ok(!/^[#b]?[0-7][+,]*\.$/.test(encoded));

    const text = exportSongToText(song);
    assert.match(text, /5--/);
    assert.doesNotMatch(text, /Numbered Notation:\s+5\.(?:\s|$)/);

    const imported = importSongFromText(text);
    assert.equal(imported.measures[0].notes[0].duration, 3);
  });

  it('round-trips duration 3 without isDotted as 3 beats', () => {
    const song = sanitizeSong(minimalSong({
      measures: [{
        id: 'm1',
        notes: [minimalNote({ duration: 3 })],
      }],
    })) as Song;
    const imported = importSongFromText(exportSongToText(song));
    assert.equal(imported.measures[0].notes[0].duration, 3);
  });

  it('does not mark a JSON duration-3 note as a single-dot quarter', () => {
    const song = importSongFromJson(JSON.stringify(minimalSong({
      measures: [{
        id: 'm1',
        notes: [{ id: 'n1', pitch: 5, octave: 0, duration: 3, lyric: { poj: '', hanlo: '' } }],
      }],
    })));
    assert.equal(song.measures[0].notes[0].duration, 3);
    assert.notEqual(song.measures[0].notes[0].isDotted, true);
    const text = exportSongToText(song);
    assert.match(text, /5--/);
  });

  it('JSON export/import keeps duration 3', () => {
    const song = sanitizeSong(minimalSong({
      measures: [{
        id: 'm1',
        notes: [minimalNote({ duration: 3, isDotted: true })],
      }],
    })) as Song;
    const imported = importSongFromJson(exportSongToJson(song));
    assert.equal(imported.measures[0].notes[0].duration, 3);
  });
});
