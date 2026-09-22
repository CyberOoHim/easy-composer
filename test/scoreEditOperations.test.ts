import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addMeasureAt,
  duplicateMeasureAt,
  deleteMeasureAt,
  moveMeasure,
  setMeasureBarline,
  clearMeasureLyrics,
  clearMeasureNotes,
  splitMeasureAtNote,
  mergeMeasureWithNext,
  batchDeleteMeasures,
  batchDuplicateMeasures,
  batchShiftMeasures,
  batchClearLyrics,
  batchPadRests,
  insertNoteAt,
  deleteNoteAt,
  duplicateNoteAt,
  moveNote,
  transposeNote,
  scaleNoteDuration,
  toggleNoteModifier,
  batchDeleteNotes,
  batchTransposeNotes,
  batchScaleNoteDurations,
  shiftSyllable,
  pushSubsequentLyrics,
  pullSubsequentLyrics,
  clearSyllableAt,
  batchShiftLyricsRange,
} from '../lib/scoreEditOperations.ts';
import type { Song, Measure } from '../types/song.ts';

function createMockSong(): Song {
  const m1: Measure = {
    id: 'm1',
    measureNumber: 1,
    chord: 'C',
    notes: [
      { id: 'n1', pitch: 1, octave: 0, duration: 1, lyric: { text: 'A', poj: 'a' } },
      { id: 'n2', pitch: 2, octave: 0, duration: 1, lyric: { text: 'B', poj: 'b' } },
      { id: 'n3', pitch: 3, octave: 0, duration: 1, lyric: { text: 'C', poj: 'c' } },
      { id: 'n4', pitch: 4, octave: 0, duration: 1, lyric: { text: 'D', poj: 'd' } },
    ],
  };

  const m2: Measure = {
    id: 'm2',
    measureNumber: 2,
    chord: 'G',
    notes: [
      { id: 'n5', pitch: 5, octave: 0, duration: 2, lyric: { text: 'E', poj: 'e' } },
      { id: 'n6', pitch: 6, octave: 0, duration: 2, lyric: { text: 'F', poj: 'f' } },
    ],
  };

  const m3: Measure = {
    id: 'm3',
    measureNumber: 3,
    chord: 'Am',
    notes: [
      { id: 'n7', pitch: 7, octave: 0, duration: 4, lyric: { text: 'G', poj: 'g' } },
    ],
  };

  return {
    id: 'test-song',
    title: 'Test Song',
    key: 'C',
    timeSignature: '4/4',
    bpm: 80,
    measures: [m1, m2, m3],
  };
}

test('scoreEditOperations - Measure Operations', async (t) => {
  await t.test('addMeasureAt before and after', () => {
    const song = createMockSong();
    const resAfter = addMeasureAt(song, 0, 'after');
    assert.equal(resAfter.song.measures.length, 4);
    assert.equal(resAfter.newMeasureIndex, 1);
    assert.equal(resAfter.song.measures[1].notes[0].pitch, 0);

    const resBefore = addMeasureAt(song, 0, 'before');
    assert.equal(resBefore.song.measures.length, 4);
    assert.equal(resBefore.newMeasureIndex, 0);
  });

  await t.test('duplicateMeasureAt and deleteMeasureAt', () => {
    const song = createMockSong();
    const dupRes = duplicateMeasureAt(song, 0);
    assert.equal(dupRes.song.measures.length, 4);
    assert.equal(dupRes.newMeasureIndex, 1);
    assert.equal(dupRes.song.measures[1].notes.length, 4);

    const delRes = deleteMeasureAt(dupRes.song, 1);
    assert.equal(delRes.song.measures.length, 3);
    assert.equal(delRes.song.measures[0].measureNumber, 1);
    assert.equal(delRes.song.measures[1].measureNumber, 2);
  });

  await t.test('moveMeasure swaps adjacent measures', () => {
    const song = createMockSong();
    const moved = moveMeasure(song, 0, 'right');
    assert.equal(moved.newMeasureIndex, 1);
    assert.equal(moved.song.measures[0].chord, 'G');
    assert.equal(moved.song.measures[1].chord, 'C');
  });

  await t.test('splitMeasureAtNote and mergeMeasureWithNext', () => {
    const song = createMockSong();
    const splitRes = splitMeasureAtNote(song, 0, 1);
    assert.equal(splitRes.song.measures.length, 4);
    assert.equal(splitRes.song.measures[0].notes.length, 2);
    assert.equal(splitRes.song.measures[1].notes.length, 2);

    const mergeRes = mergeMeasureWithNext(splitRes.song, 0);
    assert.equal(mergeRes.song.measures.length, 3);
    assert.equal(mergeRes.song.measures[0].notes.length, 4);
  });

  await t.test('batchDeleteMeasures and batchShiftMeasures', () => {
    const song = createMockSong();
    const batchDel = batchDeleteMeasures(song, 1, 2);
    assert.equal(batchDel.song.measures.length, 1);

    const song2 = createMockSong();
    const batchShift = batchShiftMeasures(song2, 1, 2, 'left');
    assert.equal(batchShift.newStartIdx, 0);
    assert.equal(batchShift.song.measures[0].chord, 'G');
    assert.equal(batchShift.song.measures[2].chord, 'C');
  });
});

test('scoreEditOperations - Note Operations', async (t) => {
  await t.test('insertNoteAt, deleteNoteAt, duplicateNoteAt', () => {
    const song = createMockSong();
    const ins = insertNoteAt(song, 0, 1, 'after', 5, 0.5);
    assert.equal(ins.song.measures[0].notes.length, 5);
    assert.equal(ins.song.measures[0].notes[2].pitch, 5);
    assert.equal(ins.newCoord[1], 2);

    const del = deleteNoteAt(ins.song, 0, 2);
    assert.equal(del.song.measures[0].notes.length, 4);

    const dup = duplicateNoteAt(song, 0, 0);
    assert.equal(dup.song.measures[0].notes.length, 5);
    assert.equal(dup.song.measures[0].notes[1].pitch, 1);
  });

  await t.test('moveNote within and across measures', () => {
    const song = createMockSong();
    const moveInside = moveNote(song, 0, 0, 'right');
    assert.equal(moveInside.song.measures[0].notes[0].pitch, 2);
    assert.equal(moveInside.song.measures[0].notes[1].pitch, 1);

    const moveAcross = moveNote(song, 1, 0, 'left');
    assert.equal(moveAcross.newCoord[0], 0);
    assert.equal(moveAcross.song.measures[0].notes.length, 5);
    assert.equal(moveAcross.song.measures[1].notes.length, 1);
  });

  await t.test('transposeNote and scaleNoteDuration', () => {
    const song = createMockSong();
    const trans = transposeNote(song, 0, 0, 1);
    assert.equal(trans.measures[0].notes[0].pitch, 2);

    const scale = scaleNoteDuration(song, 0, 0, 0.5);
    assert.equal(scale.measures[0].notes[0].duration, 0.5);
  });

  await t.test('batchDeleteNotes and batchTransposeNotes', () => {
    const song = createMockSong();
    const bTrans = batchTransposeNotes(song, 0, 0, 1, 2);
    assert.equal(bTrans.measures[0].notes[0].pitch, 3);
    assert.equal(bTrans.measures[0].notes[1].pitch, 4);

    const bDel = batchDeleteNotes(song, 0, 0, 1);
    assert.equal(bDel.song.measures[0].notes.length, 2);
  });
});

test('scoreEditOperations - Char & Syllable (Lyric) Operations', async (t) => {
  await t.test('shiftSyllable shifts lyric between notes', () => {
    const song = createMockSong();
    const shifted = shiftSyllable(song, 0, 0, 'right', 1);
    assert.equal(shifted.song.measures[0].notes[0].lyric.text, 'B');
    assert.equal(shifted.song.measures[0].notes[1].lyric.text, 'A');
  });

  await t.test('pushSubsequentLyrics pushes following lyrics right', () => {
    const song = createMockSong();
    const pushed = pushSubsequentLyrics(song, 0, 1, 1);
    assert.equal(pushed.measures[0].notes[0].lyric.text, 'A');
    assert.equal(pushed.measures[0].notes[1].lyric.text, undefined); // freed slot
    assert.equal(pushed.measures[0].notes[2].lyric.text, 'B'); // pushed
    assert.equal(pushed.measures[0].notes[3].lyric.text, 'C'); // pushed
  });

  await t.test('pullSubsequentLyrics pulls following lyrics left', () => {
    const song = createMockSong();
    const pulled = pullSubsequentLyrics(song, 0, 1, 1);
    assert.equal(pulled.measures[0].notes[0].lyric.text, 'A');
    assert.equal(pulled.measures[0].notes[1].lyric.text, 'C'); // pulled from next
    assert.equal(pulled.measures[0].notes[2].lyric.text, 'D'); // pulled from next
  });

  await t.test('batchShiftLyricsRange shifts lyrics block left and right', () => {
    const song = createMockSong();
    const batchShift = batchShiftLyricsRange(song, 0, 0, 'left', 1);
    assert.equal(batchShift.measures[0].notes[0].lyric.text, 'B');
    assert.equal(batchShift.measures[0].notes[1].lyric.text, 'C');
    assert.equal(batchShift.measures[0].notes[2].lyric.text, 'D');
    assert.equal(batchShift.measures[0].notes[3].lyric.text, undefined);
  });
});
