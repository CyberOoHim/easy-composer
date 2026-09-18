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
import { getChordMidiNotes } from '../lib/midiExport.ts';
import { getChordRootName, KEY_SEMITONES } from '../lib/taigiUtils.ts';
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

    it('resolves diatonic VII accurately in non-C keys (INT-5)', () => {
      assert.equal(getDiatonicChordForDegree('C', 'VII'), 'Bdim');
      assert.equal(getDiatonicChordForDegree('G', 'VII'), 'F#dim');
      assert.equal(getDiatonicChordForDegree('F', 'VII'), 'Edim');
      assert.equal(getDiatonicChordForDegree('D', 'VII'), 'C#dim');
      assert.equal(getDiatonicChordForDegree('Bb', 'VII'), 'Adim');
      assert.equal(getDiatonicChordForDegree('Eb', 'VII'), 'Ddim');
      assert.equal(getDiatonicChordForDegree('A', 'VII'), 'G#dim');
    });

    it('spells VII from the shared chord root namer, not a private map', () => {
      for (const key of ['C', 'G', 'F', 'D', 'Bb', 'Eb', 'A'] as const) {
        const expected = `${getChordRootName(key, (KEY_SEMITONES[key] ?? 0) + 11)}dim`;
        assert.equal(getDiatonicChordForDegree(key, 'VII'), expected);
        assert.equal(getDiatonicChordForDegree(key, 'VIIDIM'), expected);
      }
    });

    it('embellishes degree 7 with upper neighbor 1 at octave+1 and clamps octave (INT-5)', () => {
      // Degree 7 at octave 0 -> upper neighbor grace note should be pitch 1 at octave +1
      const note7 = createNotes([7], [1]);
      const embellished7 = embellishWithFolkOrnaments(note7);
      assert.ok(embellished7[0].preGraceNotes?.[0]);
      assert.equal(embellished7[0].preGraceNotes[0].pitch, 1);
      assert.equal(embellished7[0].preGraceNotes[0].octave, 1);

      // Degree 1 at octave 0 -> lower neighbor grace note should be pitch 7 at octave -1
      const note1 = createNotes([1], [1]);
      const embellished1 = embellishWithFolkOrnaments(note1);
      assert.ok(embellished1[0].preGraceNotes?.[0]);
      assert.equal(embellished1[0].preGraceNotes[0].pitch, 7);
      assert.equal(embellished1[0].preGraceNotes[0].octave, -1);

      // Clamp test: degree 7 at octave 2 cannot exceed octave 2
      const highNote7: NumberedNotationNote[] = [{
        id: 'high-7',
        pitch: 7,
        octave: 2,
        duration: 1,
        lyric: { hanlo: '七', poj: 'chhit' },
      }];
      const embellishedHigh7 = embellishWithFolkOrnaments(highNote7);
      assert.equal(embellishedHigh7[0].preGraceNotes?.[0].octave, 2);

      // Clamp test: degree 1 at octave -2 cannot go below octave -2
      const lowNote1: NumberedNotationNote[] = [{
        id: 'low-1',
        pitch: 1,
        octave: -2,
        duration: 1,
        lyric: { hanlo: '一', poj: 'chit' },
      }];
      const embellishedLow1 = embellishWithFolkOrnaments(lowNote1);
      assert.equal(embellishedLow1[0].preGraceNotes?.[0].octave, -2);
    });

    it('preserves lyrics, lyricsByVerse, and note ids during melody spark when durations match (INT-5)', () => {
      const existing: NumberedNotationNote[] = [
        {
          id: 'note-preserve-0',
          pitch: 1,
          octave: 0,
          duration: 1,
          lyric: { hanlo: '阮', poj: 'gún' },
          lyricsByVerse: {
            1: { hanlo: '阮', poj: 'gún' },
            2: { hanlo: '你', poj: 'lí' },
          },
        },
        {
          id: 'note-preserve-1',
          pitch: 2,
          octave: 0,
          duration: 1,
          lyric: { hanlo: '的', poj: 'ê' },
          lyricsByVerse: {
            1: { hanlo: '的', poj: 'ê' },
            2: { hanlo: '的', poj: 'ê' },
          },
        },
        {
          id: 'note-preserve-2',
          pitch: 3,
          octave: 0,
          duration: 1,
          lyric: { hanlo: '心', poj: 'sim' },
        },
        {
          id: 'note-preserve-3',
          pitch: 5,
          octave: 0,
          duration: 1,
          lyric: { hanlo: '聲', poj: 'siann' },
        },
      ];

      const spark = generateMelodySpark('C', 'C', '4/4', 'pentatonic', existing);

      assert.equal(spark.length, 4);
      // Preserves original IDs
      assert.equal(spark[0].id, 'note-preserve-0');
      assert.equal(spark[1].id, 'note-preserve-1');
      assert.equal(spark[2].id, 'note-preserve-2');
      assert.equal(spark[3].id, 'note-preserve-3');

      // Preserves original lyrics
      assert.equal(spark[0].lyric.hanlo, '阮');
      assert.equal(spark[0].lyric.poj, 'gún');
      assert.equal(spark[0].lyricsByVerse?.[2]?.hanlo, '你');
      assert.equal(spark[3].lyric.hanlo, '聲');

      // Pitches are updated to chord tones
      for (const note of spark) {
        assert.ok([1, 2, 3, 5, 6].includes(note.pitch as number));
      }
    });

    it('MIDI helper getChordMidiNotes parses m7 and slash bass accurately (INT-5)', () => {
      // Am7: Root A (57), C (60), E (64), Minor 7th G (67)
      const am7Notes = getChordMidiNotes('Am7');
      assert.deepEqual(am7Notes, [57, 60, 64, 67]);
      assert.ok(am7Notes.includes(67), 'Am7 must include the minor 7th (G4 = 67)');

      // C/E: Root C (48), E (52), G (55), plus bass E (40)
      const ceNotes = getChordMidiNotes('C/E');
      assert.ok(ceNotes.includes(40), 'C/E must include bass note E2 (40)');
      assert.equal(ceNotes[0], 40, 'Bass note must be lowest');

      // Cmaj7: Root C (48), E (52), G (55), Major 7th B (59)
      const cmaj7Notes = getChordMidiNotes('Cmaj7');
      assert.deepEqual(cmaj7Notes, [48, 52, 55, 59]);

      // Empty / N.C. chords return empty array
      assert.deepEqual(getChordMidiNotes(''), []);
      assert.deepEqual(getChordMidiNotes('N.C.'), []);
      assert.deepEqual(getChordMidiNotes('None'), []);
    });
  });
});
