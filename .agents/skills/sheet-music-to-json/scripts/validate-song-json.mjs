#!/usr/bin/env node

/**
 * validate-song-json.mjs
 * 
 * Verifies that a generated Song JSON file is 100% compliant with the
 * Taigi Composer / Karaoke application before importing.
 * 
 * Usage:
 *   node validate-song-json.mjs <path-to-song.json>
 */

import fs from 'node:fs';
import path from 'node:path';

const VALID_KEYS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const VALID_TIME_SIGS = ['4/4', '3/4', '2/4', '6/8'];

function getExpectedBeats(timeSignature) {
  const [num, den] = (timeSignature || '4/4').split('/').map(Number);
  return (num || 4) * (4 / (den || 4));
}

function validateSongFile(filePath) {
  console.log(`\n🔍 Validating Song JSON: ${filePath}`);

  if (!fs.existsSync(filePath)) {
    console.error(`❌ Error: File not found at ${filePath}`);
    process.exit(1);
  }

  let data;
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    data = JSON.parse(raw);
  } catch (err) {
    console.error(`❌ Error: Invalid JSON syntax:`, err.message);
    process.exit(1);
  }

  const errors = [];
  const warnings = [];

  // Root fields validation (Mandatory title, measures, and core metadata)
  if (!data.id || typeof data.id !== 'string') errors.push('Missing or invalid root "id" (string required)');
  if (!data.title || typeof data.title !== 'string' || data.title.trim() === '') {
    errors.push('Missing or empty mandatory root "title" (non-empty string required)');
  }
  if (!VALID_KEYS.includes(data.key)) errors.push(`Invalid root "key": "${data.key}". Expected one of: ${VALID_KEYS.join(', ')}`);
  if (!VALID_TIME_SIGS.includes(data.timeSignature)) errors.push(`Invalid root "timeSignature": "${data.timeSignature}". Expected one of: ${VALID_TIME_SIGS.join(', ')}`);
  if (typeof data.bpm !== 'number' || data.bpm <= 0) errors.push(`Invalid root "bpm": ${data.bpm}. Expected a positive number`);
  if (data.orientation && !['portrait', 'landscape'].includes(data.orientation)) errors.push(`Invalid "orientation": "${data.orientation}". Expected "portrait" or "landscape"`);
  if (data.verseCount !== undefined && (typeof data.verseCount !== 'number' || data.verseCount < 1 || data.verseCount > 5)) errors.push(`Invalid "verseCount": ${data.verseCount}. Expected 1..5`);
  if (!Array.isArray(data.measures) || data.measures.length === 0) {
    errors.push('Missing or empty mandatory root "measures" array (at least 1 measure required)');
  }

  if (errors.length > 0) {
    console.error('\n❌ Critical Schema Errors Found:');
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  const defaultExpectedBeats = getExpectedBeats(data.timeSignature);
  let totalNotes = 0;
  let totalLyrics = 0;
  let rhythmIssues = 0;

  data.measures.forEach((m, mIdx) => {
    const mNum = m.measureNumber ?? (mIdx + 1);
    if (!m.id) errors.push(`Measure ${mNum} missing "id"`);
    if (!Array.isArray(m.notes)) {
      errors.push(`Measure ${mNum} missing "notes" array`);
      return;
    }

    if (m.barlineType && !['single', 'double', 'end', 'repeat_start', 'repeat_end'].includes(m.barlineType)) {
      warnings.push(`Measure ${mNum} has unknown barlineType: "${m.barlineType}"`);
    }

    const expectedBeats = m.timeSignature ? getExpectedBeats(m.timeSignature) : defaultExpectedBeats;
    let measureBeats = 0;

    m.notes.forEach((n, nIdx) => {
      totalNotes++;
      if (!n.id) errors.push(`Measure ${mNum}, note index ${nIdx} missing "id"`);
      
      const pitch = n.pitch;
      if (pitch !== 'empty' && (typeof pitch !== 'number' || pitch < 0 || pitch > 7)) {
        errors.push(`Measure ${mNum}, note ${nIdx} has invalid pitch: ${pitch}. Must be 0..7 or 'empty'`);
      }

      if (typeof n.octave !== 'number' || n.octave < -2 || n.octave > 2) {
        errors.push(`Measure ${mNum}, note ${nIdx} has invalid octave: ${n.octave}. Expected -2..2`);
      }

      if (typeof n.duration !== 'number' || n.duration < 0) {
        errors.push(`Measure ${mNum}, note ${nIdx} has invalid duration: ${n.duration}`);
      } else if (pitch !== 'empty') {
        measureBeats += n.duration;
      }

      if (n.instrument && !['piano', 'flute', 'whistle', 'guitar', 'synth', 'bell', 'cello'].includes(n.instrument)) {
        warnings.push(`Measure ${mNum}, note ${nIdx} has non-standard instrument: "${n.instrument}"`);
      }

      if (n.lyric && (n.lyric.hanlo || n.lyric.poj || n.lyric.hanji || n.lyric.custom)) {
        totalLyrics++;
      } else if (n.lyricsByVerse && Object.keys(n.lyricsByVerse).length > 0) {
        totalLyrics++;
      }
    });

    const diff = Math.abs(measureBeats - expectedBeats);
    if (diff > 0.05 && !m.isPrelude && !m.section?.includes('前奏') && !m.section?.includes('Pickup') && !m.section?.includes('弱起')) {
      rhythmIssues++;
      warnings.push(`Measure ${mNum} total duration is ${measureBeats.toFixed(2)} beats, expected ${expectedBeats} beats.`);
    }
  });

  // Mandatory lyrics check across the song
  if (totalLyrics === 0) {
    errors.push('Missing mandatory lyrics in output JSON: The song must contain lyrics ("hanlo" and "poj") aligned to melody notes');
  }

  // App import simulation check
  try {
    if (!data.title || !Array.isArray(data.measures) || data.measures.length === 0) {
      throw new Error('Missing title or empty measures array');
    }
    const simulatedMeasures = data.measures.map((m, idx) => ({
      id: m.id || `m-${idx + 1}-${Date.now()}`,
      measureNumber: typeof m.measureNumber === 'number' ? m.measureNumber : idx + 1,
      notes: Array.isArray(m.notes) ? m.notes : [],
    }));
    if (simulatedMeasures.length === 0) {
      throw new Error('Simulation resulted in 0 measures');
    }
  } catch (simErr) {
    errors.push(`App import simulation failed: ${simErr.message}`);
  }

  // Verse / Phrase segmentation analysis for Karaoke mode
  const karaokeTips = [];
  let currentPhraseSyllables = 0;
  let currentPhraseStartM = 1;
  let currentPhraseEndM = 1;
  let phraseCount = 0;

  data.measures.forEach((m, mIdx) => {
    const mNum = m.measureNumber ?? (mIdx + 1);
    currentPhraseEndM = mNum;

    m.notes.forEach((n) => {
      const sylText = (n.lyric?.hanlo || n.lyric?.poj || n.lyric?.hanji || n.lyric?.custom || '').trim();
      const isDashesOnly = /^[—\-_~·\s]+$/.test(sylText);
      const hasSyl = sylText.length > 0 && !isDashesOnly;
      const isBreak = (n.lyric && (
        (n.lyric.hanlo && /[\n\r↵]/.test(n.lyric.hanlo)) ||
        (n.lyric.poj && /[\n\r↵]/.test(n.lyric.poj))
      )) || (n.annotation && /[\n\r↵]/.test(n.annotation));

      if (hasSyl && !isBreak) {
        currentPhraseSyllables++;
      }

      if (isBreak) {
        phraseCount++;
        if (currentPhraseSyllables > 10) {
          karaokeTips.push(`Phrase in measures ${currentPhraseStartM}–${currentPhraseEndM} has ${currentPhraseSyllables} syllables. Consider splitting into shorter, meaningful phrases (4–8 syllables) for easier Karaoke reading.`);
        }
        currentPhraseSyllables = 0;
        currentPhraseStartM = mNum;
      }
    });

    if (m.isLineBreak && currentPhraseSyllables > 0) {
      phraseCount++;
      if (currentPhraseSyllables > 10) {
        karaokeTips.push(`Phrase ending at measure ${mNum} has ${currentPhraseSyllables} syllables. Consider splitting into shorter, meaningful phrases (4–8 syllables) for easier Karaoke reading.`);
      }
      currentPhraseSyllables = 0;
      currentPhraseStartM = mNum + 1;
    }
  });

  if (currentPhraseSyllables > 10) {
    karaokeTips.push(`Final phrase in measures ${currentPhraseStartM}–${currentPhraseEndM} has ${currentPhraseSyllables} syllables. Consider splitting into shorter, meaningful phrases (4–8 syllables) for easier Karaoke reading.`);
  }

  console.log(`\n📊 Analysis Results:`);
  console.log(`   Title (Mandatory):    ✓ ${data.title} ${data.subtitle ? `(${data.subtitle})` : ''}`);
  console.log(`   Measures (Mandatory): ✓ ${data.measures.length} measures`);
  console.log(`   Lyrics (Mandatory):   ✓ ${totalLyrics} syllables`);
  console.log(`   Composer / Lyricist:  ${data.composer || '—'} / ${data.lyricist || '—'}`);
  console.log(`   Key & Time:           Key ${data.key}, Time ${data.timeSignature}, ${data.bpm} BPM`);
  console.log(`   Notes count:          ${totalNotes}`);
  console.log(`   Karaoke phrases:      ${phraseCount || 1}`);

  if (karaokeTips.length > 0) {
    console.log(`\n🎤 Karaoke Readability Guidance (${karaokeTips.length}):`);
    karaokeTips.slice(0, 5).forEach(tip => console.log(`   💡 ${tip}`));
    if (karaokeTips.length > 5) console.log(`   ... and ${karaokeTips.length - 5} more.`);
  }

  if (warnings.length > 0) {
    console.log(`\n⚠️  Rhythm Warnings (${warnings.length}):`);
    warnings.slice(0, 10).forEach(w => console.log(`   - ${w}`));
    if (warnings.length > 10) console.log(`   ... and ${warnings.length - 10} more.`);
  }

  if (errors.length > 0) {
    console.log(`\n❌ Validation FAILED with ${errors.length} error(s):`);
    errors.forEach(e => console.error(`   - ${e}`));
    process.exit(1);
  }

  console.log(`\n✅ Validation PASSED! File is fully ready for import into the Taigi Composer app.\n`);
}

const target = process.argv[2];
if (!target) {
  console.log('Usage: node validate-song-json.mjs <path-to-song.json>');
  process.exit(1);
}

validateSongFile(target);
