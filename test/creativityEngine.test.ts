import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHORD_PROGRESSION_PRESETS,
  getDiatonicChordForDegree,
  applyChordProgression,
  invertMotif,
  retrogradeMotif,
  sequenceShiftMotif,
  embellishWithFolkOrnaments,
  isPitchInScale,
  generateMelodySpark,
} from '../lib/creativityEngine.ts';
import type { Song, Measure, NumberedNotationNote } from '../types/song.ts';

function createNotes(pitches: (number | 'empty')[], durations: number[] = []): NumberedNotationNote[] {
  return pitches.map((p, i) => ({
    id: `note-${i}`,
    pitch: p as any,
    octave: 0,
    duration: durations[i] || 1,
    lyric: { hanlo: `字${i}`, poj: `ji${i}` },
  }));
}

describe('Creative Composition Engine (MOD-2)', () => {
  describe('Chord Progression Presets & Diatonic Resolution', () => {
    it('provides standard progression presets', () => {
      assert.ok(CHORD_PROGRESSION_PRESETS.length >= 6);
      const popBallad = CHORD_PROGRESSION_PRESETS.find(p => p.id === 'pop_ballad');
      assert.ok(popBallad);
      assert.deepEqual(popBallad.degrees, ['I', 'V', 'vi', 'IV']);
    });

    it('resolves diatonic degrees accurately across keys', () => {
      // Key of C
      assert.equal(getDiatonicChordForDegree('C', 'I'), 'C');
      assert.equal(getDiatonicChordForDegree('C', 'ii'), 'Dm');
      assert.equal(getDiatonicChordForDegree('C', 'IV'), 'F');
      assert.equal(getDiatonicChordForDegree('C', 'V'), 'G');
      assert.equal(getDiatonicChordForDegree('C', 'vi'), 'Am');

      // Key of G
      assert.equal(getDiatonicChordForDegree('G', 'I'), 'G');
      assert.equal(getDiatonicChordForDegree('G', 'IV'), 'C');
      assert.equal(getDiatonicChordForDegree('G', 'V'), 'D');
      assert.equal(getDiatonicChordForDegree('G', 'vi'), 'Em');

      // Key of F
      assert.equal(getDiatonicChordForDegree('F', 'I'), 'F');
      assert.equal(getDiatonicChordForDegree('F', 'IV'), 'Bb');
      assert.equal(getDiatonicChordForDegree('F', 'V'), 'C');
      assert.equal(getDiatonicChordForDegree('F', 'vi'), 'Dm');
    });

    it('applies progression preset to song measures sequentially', () => {
      const measures: Measure[] = [1, 2, 3, 4, 5].map(n => ({
        id: `m${n}`,
        measureNumber: n,
        notes: createNotes([1, 2, 3, 4]),
      }));
      const song: Song = {
        id: 's1',
        title: 'Progression Test',
        key: 'C',
        timeSignature: '4/4',
        bpm: 90,
        measures,
      };

      const updated = applyChordProgression(song, 'pop_ballad', 0);
      assert.equal(updated.measures[0].chord, 'C');
      assert.equal(updated.measures[1].chord, 'G');
      assert.equal(updated.measures[2].chord, 'Am');
      assert.equal(updated.measures[3].chord, 'F');
      assert.equal(updated.measures[4].chord, 'C'); // wraps
    });
  });

  describe('Motif Inversion', () => {
    it('inverts scale degrees diatonically across first pitch axis', () => {
      // Axis is 1 (C4). Distances from 1: 1->0, 3->+2, 5->+4
      // Inverted: 1->1, 3->(1-2=-1 -> degree 6 in octave -1), 5->(1-4=-3 -> degree 4 in octave -1)
      const notes = createNotes([1, 3, 5]);
      const inverted = invertMotif(notes);

      assert.equal(inverted[0].pitch, 1);
      assert.equal(inverted[0].octave, 0);

      // Distance +2 steps above 1 becomes 2 steps below 1: 7, 6 (octave -1)
      assert.equal(inverted[1].pitch, 6);
      assert.equal(inverted[1].octave, -1);

      // Distance +4 steps above 1 becomes 4 steps below 1: 7, 6, 5, 4 (octave -1)
      assert.equal(inverted[2].pitch, 4);
      assert.equal(inverted[2].octave, -1);
    });

    it('preserves rests and note durations during inversion', () => {
      const notes = createNotes([1, 0, 3], [1, 0.5, 1.5]);
      const inverted = invertMotif(notes);

      assert.equal(inverted[1].pitch, 0);
      assert.equal(inverted[1].duration, 0.5);
      assert.equal(inverted[2].duration, 1.5);
    });
  });

  describe('Motif Retrograde', () => {
    it('reverses the pitch sequence while preserving metric durations and lyrics', () => {
      const notes = createNotes([1, 2, 3, 5], [0.5, 1, 1.5, 2]);
      const retro = retrogradeMotif(notes);

      // Pitches reversed: 5, 3, 2, 1
      assert.equal(retro[0].pitch, 5);
      assert.equal(retro[1].pitch, 3);
      assert.equal(retro[2].pitch, 2);
      assert.equal(retro[3].pitch, 1);

      // Durations stay in their original metric slots:
      assert.equal(retro[0].duration, 0.5);
      assert.equal(retro[1].duration, 1);
      assert.equal(retro[2].duration, 1.5);
      assert.equal(retro[3].duration, 2);

      // Lyrics stay chronological:
      assert.equal(retro[0].lyric.hanlo, '字0');
    });
  });

  describe('Sequence Shift', () => {
    it('shifts scale degrees by stepDelta with octave wrapping', () => {
      const notes = createNotes([1, 2, 7]);
      const shiftedUp = sequenceShiftMotif(notes, 1);

      assert.equal(shiftedUp[0].pitch, 2);
      assert.equal(shiftedUp[1].pitch, 3);
      assert.equal(shiftedUp[2].pitch, 1); // 7 + 1 -> 1 in octave +1
      assert.equal(shiftedUp[2].octave, 1);

      const shiftedDown = sequenceShiftMotif(notes, -1);
      assert.equal(shiftedDown[0].pitch, 7); // 1 - 1 -> 7 in octave -1
      assert.equal(shiftedDown[0].octave, -1);
    });
  });

  describe('Folk Ornaments & Pentatonic Filters', () => {
    it('embellishes long notes with pre-grace notes without changing note duration', () => {
      const notes = createNotes([1, 3], [1, 1]);
      const embellished = embellishWithFolkOrnaments(notes);

      assert.ok(embellished[0].preGraceNotes && embellished[0].preGraceNotes.length > 0);
      assert.equal(embellished[0].duration, 1); // Duration strictly preserved
    });

    it('identifies pentatonic mode pitches accurately', () => {
      assert.equal(isPitchInScale(1, 'pentatonic'), true);
      assert.equal(isPitchInScale(2, 'pentatonic'), true);
      assert.equal(isPitchInScale(3, 'pentatonic'), true);
      assert.equal(isPitchInScale(4, 'pentatonic'), false);
      assert.equal(isPitchInScale(5, 'pentatonic'), true);
      assert.equal(isPitchInScale(6, 'pentatonic'), true);
      assert.equal(isPitchInScale(7, 'pentatonic'), false);

      // Yu mode: 6, 1, 2, 3, 5
      assert.equal(isPitchInScale(6, 'yu'), true);
      assert.equal(isPitchInScale(4, 'yu'), false);
    });

    it('generates offline melody sparks with valid measure durations', () => {
      const spark44 = generateMelodySpark('C', 'C', '4/4', 'pentatonic');
      const totalDur = spark44.reduce((sum, n) => sum + n.duration, 0);
      assert.equal(totalDur, 4);

      const spark34 = generateMelodySpark('G', 'G', '3/4', 'folk');
      const totalDur34 = spark34.reduce((sum, n) => sum + n.duration, 0);
      assert.equal(totalDur34, 3);
    });
  });
});
