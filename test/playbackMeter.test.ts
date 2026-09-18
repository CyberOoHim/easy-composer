import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import type { Measure, NumberedNotationNote, Song } from '../types/song.ts';
import {
  getExpectedMeasureBeats,
  getPaddedMeasureBeats,
  getPlaybackBeatsPerBar,
  getWrittenPlaybackBeats,
} from '../lib/taigiUtils.ts';
import { AudioEngine, buildMeasureBeatEvents, buildSongBeatEvents } from '../lib/audioEngine.ts';
import { extractTimedNotes } from '../lib/chordArranger.ts';

function makeNote(pitch: number | 'empty', duration: number): NumberedNotationNote {
  return {
    id: `n-${pitch}-${duration}-${Math.random().toString(36).slice(2, 6)}`,
    pitch: pitch as NumberedNotationNote['pitch'],
    octave: 0,
    duration,
    lyric: { hanlo: '', poj: '' },
  };
}

function makeMeasure(notes: NumberedNotationNote[], extras: Partial<Measure> = {}): Measure {
  return {
    id: extras.id || 'm1',
    measureNumber: extras.measureNumber || 1,
    notes,
    chord: extras.chord,
    chords: extras.chords,
    timeSignature: extras.timeSignature,
  };
}

function makeSong(measures: Measure[], timeSignature: Song['timeSignature'] = '4/4'): Song {
  return {
    id: 'meter-test',
    title: 'Meter Test',
    key: 'C',
    bpm: 60,
    timeSignature,
    measures,
  };
}

describe('Playback meter (INT-4)', () => {
  it('counts 6/8 as 3 quarter-note beats, not 6 eighths', () => {
    assert.equal(getExpectedMeasureBeats('6/8'), 3);
    assert.equal(getPlaybackBeatsPerBar('6/8'), 3);
    assert.equal(getPlaybackBeatsPerBar('4/4'), 4);
    assert.equal(getPlaybackBeatsPerBar('3/4'), 3);
  });

  it('pads an incomplete 4/4 bar to 4 beats', () => {
    const m = makeMeasure([makeNote(1, 1), makeNote(3, 1), makeNote(5, 1)]);
    assert.equal(getWrittenPlaybackBeats(m), 3);
    assert.equal(getPaddedMeasureBeats(m, '4/4'), 4);
  });

  it('schedules 3 clicks for a 6/8 bar', () => {
    const song = makeSong(
      [makeMeasure([makeNote(1, 1), makeNote(3, 1), makeNote(5, 1)], { chord: 'C', timeSignature: '6/8' })],
      '6/8'
    );
    const events = buildMeasureBeatEvents(song, 0, 0, 1);
    assert.equal(events.length, 3);
    assert.deepEqual(events.map(e => e.songTime), [0, 1, 2]);
    assert.equal(events[0].isDownbeat, true);
    assert.equal(events[1].isDownbeat, false);
    assert.equal(events[2].isDownbeat, false);
  });

  it('does not schedule a 4th 4/4 click onto the next bar downbeat', () => {
    const song = makeSong([
      makeMeasure([makeNote(1, 1), makeNote(3, 1), makeNote(5, 1)], { id: 'm1', measureNumber: 1, chord: 'C' }),
      makeMeasure([makeNote(1, 4)], { id: 'm2', measureNumber: 2, chord: 'G' }),
    ]);
    const events = buildSongBeatEvents(song, 1);
    const bar1 = events.filter(e => e.songTime < 4);
    const bar2 = events.filter(e => e.songTime >= 4);
    assert.equal(bar1.length, 4);
    assert.equal(bar1[3].songTime, 3);
    assert.equal(bar2[0].songTime, 4);
    assert.equal(bar2[0].isDownbeat, true);
    assert.ok(bar1[3].songTime < bar2[0].songTime);
  });

  it('treats a mid-bar chord change as isChordChange, not as a downbeat', () => {
    const song = makeSong([
      makeMeasure([makeNote(1, 1), makeNote(3, 1), makeNote(5, 1), makeNote(1, 1)], {
        chords: ['C', 'G'],
      }),
    ]);
    const events = buildMeasureBeatEvents(song, 0, 0, 1);
    assert.equal(events.length, 4);
    assert.equal(events[0].isDownbeat, true);
    assert.equal(events[0].isChordChange, true);
    assert.equal(events[0].chord, 'C');

    const change = events.find(e => e.chord === 'G' && e.isChordChange);
    assert.ok(change, 'second-half chord should be marked as a chord change');
    assert.equal(change!.isDownbeat, false);
    assert.ok(change!.beatIndexInBar > 0);
  });

  it('counts padded bars in song duration and measure start times', () => {
    const engine = new AudioEngine();
    const song = makeSong([
      makeMeasure([makeNote(1, 1), makeNote(3, 1), makeNote(5, 1)], { id: 'm1', measureNumber: 1 }),
      makeMeasure([makeNote(1, 4)], { id: 'm2', measureNumber: 2 }),
    ]);
    // bpm 60 → 1s per quarter. Incomplete first bar pads 3→4, second bar is 4.
    assert.equal(engine.calculateSongDuration(song), 8);
    assert.equal(engine.getMeasureStartTime(song, 1), 4);
    assert.equal(engine.getNoteStartTime(song, 1, 0), 4);
  });
});

describe('extractTimedNotes rest time (INT-4)', () => {
  it('advances beat weight across a pitch-0 rest', () => {
    const downbeatOnly = extractTimedNotes(makeMeasure([makeNote(5, 1)]), 4);
    assert.equal(downbeatOnly[0].beatStart, 0);
    assert.ok(downbeatOnly[0].weight > 1.5);

    const afterRest = extractTimedNotes(makeMeasure([makeNote(0, 1), makeNote(5, 1)]), 4);
    assert.equal(afterRest.length, 1);
    assert.equal(afterRest[0].pitch, 5);
    assert.equal(afterRest[0].beatStart, 1);
    assert.ok(afterRest[0].weight < downbeatOnly[0].weight);
  });

  it('skips empty spacers without occupying time', () => {
    const timed = extractTimedNotes(
      makeMeasure([makeNote('empty', 1), makeNote(5, 1)]),
      4
    );
    assert.equal(timed.length, 1);
    assert.equal(timed[0].beatStart, 0);
  });
});

describe('Playback wake lock and downbeat wiring (INT-4)', () => {
  const root = process.cwd();
  const read = (rel: string) => fs.readFileSync(path.resolve(root, rel), 'utf8');

  it('releases wake lock from pause, stop, and notifyEnded', () => {
    const src = read('lib/audioEngine.ts');
    assert.match(src, /private notifyEnded\(\) \{\s*this\.releaseWakeLock\(\)/);
    assert.match(src, /this\.isPaused = true;[\s\S]*?this\.releaseWakeLock\(\)/);
    assert.match(src, /if \(notify\) \{\s*this\.releaseWakeLock\(\)/);
  });

  it('passes isDownbeat, not isChordChange, into playChordBeat', () => {
    const src = read('lib/audioEngine.ts');
    assert.match(src, /this\.playChordBeat\(\s*ev\.chord,\s*scheduleAt,\s*ev\.beatDuration,\s*ev\.isDownbeat,/);
    assert.equal(src.includes('ev.isChordChange,\n            false'), false);
    assert.match(src, /this\.playChordBeat\(ev\.chord, beatTime, ev\.beatDuration, ev\.isDownbeat/);
  });

  it('requests a wake lock from sheet play as well as header transport', () => {
    const editor = read('components/ComposerEditor.tsx');
    const page = read('app/page.tsx');
    assert.match(editor, /wakeLockManager\.requestForPlayback/);
    assert.match(editor, /audioEngine\.playMeasure/);
    assert.match(editor, /audioEngine\.playSystem/);
    assert.match(page, /wakeLockManager\.requestForPlayback/);
    assert.match(page, /wakeLockManager\.release/);
  });
});
