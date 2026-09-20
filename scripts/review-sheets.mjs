#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const SHEETS_DIR = path.resolve(process.cwd(), 'data/sheets');
const CACHE_DIR = path.resolve(process.cwd(), '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'sheet-review-cache.json');

const VALID_KEYS = new Set([
  'C', 'Db', 'C#', 'D', 'Eb', 'D#', 'E', 'F', 'F#', 'Gb', 'G', 'Ab', 'G#', 'A', 'Bb', 'A#', 'B'
]);

const VALID_METERS = new Set(['4/4', '3/4', '2/4', '6/8']);
const VALID_PITCHES = new Set([0, 1, 2, 3, 4, 5, 6, 7, '0', '1', '2', '3', '4', '5', '6', '7', 'empty']);

function computeHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function loadCache() {
  try {
    if (fs.existsSync(CACHE_FILE)) {
      const raw = fs.readFileSync(CACHE_FILE, 'utf-8');
      return JSON.parse(raw);
    }
  } catch {
    // Corrupt or unreadable cache - treat as empty
  }
  return { version: 1, files: {} };
}

function saveCache(cache) {
  try {
    if (!fs.existsSync(CACHE_DIR)) {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
    }
    fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Sheet Review] Warning: could not write cache file:', err.message);
  }
}

/**
 * Validate an individual song JSON object.
 * Returns array of error messages (empty if valid).
 */
export function validateSongObject(song, filePath, isTaigi) {
  const errors = [];
  const relPath = path.relative(process.cwd(), filePath);

  if (!song || typeof song !== 'object') {
    return [`[${relPath}] Root must be a valid JSON object`];
  }

  // 1. Core Metadata
  if (typeof song.id !== 'string' || !song.id.trim()) {
    errors.push(`[${relPath}] Missing or invalid 'id' string`);
  } else if (!/^[a-zA-Z0-9_-]+$/.test(song.id.trim())) {
    errors.push(`[${relPath}] Song id "${song.id}" contains invalid characters (allowed: a-z, 0-9, _, -)`);
  }

  if (typeof song.title !== 'string' || !song.title.trim()) {
    errors.push(`[${relPath}] Missing or invalid 'title' string`);
  }

  const cleanKey = typeof song.key === 'string'
    ? song.key.trim().replace(/^1\s*=\s*/i, '').replace(/^Key:\s*/i, '').trim()
    : '';
  if (!VALID_KEYS.has(cleanKey)) {
    errors.push(`[${relPath}] Invalid key "${song.key}". Supported: ${[...VALID_KEYS].join(', ')}`);
  }

  const cleanMeter = typeof song.timeSignature === 'string'
    ? song.timeSignature.trim().replace(/拍$/, '').trim()
    : '';
  if (!VALID_METERS.has(cleanMeter)) {
    errors.push(`[${relPath}] Invalid timeSignature "${song.timeSignature}". Supported: 4/4, 3/4, 2/4, 6/8`);
  }

  const bpm = Number(song.bpm);
  if (Number.isNaN(bpm) || bpm < 20 || bpm > 320) {
    errors.push(`[${relPath}] Invalid bpm "${song.bpm}" (expected number between 20 and 320)`);
  }

  // 2. Measures Array
  if (!Array.isArray(song.measures) || song.measures.length === 0) {
    errors.push(`[${relPath}] 'measures' must be a non-empty array`);
    return errors; // Cannot continue without measures
  }

  const seenMeasureIds = new Set();
  const seenNoteIds = new Set();

  song.measures.forEach((measure, mIdx) => {
    const mNum = measure?.measureNumber ?? (mIdx + 1);
    const mPrefix = `[${relPath}] Measure #${mNum}`;

    if (!measure || typeof measure !== 'object') {
      errors.push(`${mPrefix} is not an object`);
      return;
    }

    if (typeof measure.id !== 'string' || !measure.id.trim()) {
      errors.push(`${mPrefix} is missing an 'id'`);
    } else {
      if (seenMeasureIds.has(measure.id)) {
        errors.push(`${mPrefix} has duplicate measure id "${measure.id}"`);
      }
      seenMeasureIds.add(measure.id);
    }

    if (!Array.isArray(measure.notes) || measure.notes.length === 0) {
      errors.push(`${mPrefix} has no notes array or empty notes`);
      return;
    }

    measure.notes.forEach((note, nIdx) => {
      const nPrefix = `${mPrefix}, Note #${nIdx + 1}`;

      if (!note || typeof note !== 'object') {
        errors.push(`${nPrefix} is not an object`);
        return;
      }

      if (typeof note.id !== 'string' || !note.id.trim()) {
        errors.push(`${nPrefix} is missing note 'id'`);
      } else {
        if (seenNoteIds.has(note.id)) {
          errors.push(`${nPrefix} has duplicate note id "${note.id}"`);
        }
        seenNoteIds.add(note.id);
      }

      // Pitch validation
      const pitch = note.pitch;
      if (!VALID_PITCHES.has(pitch)) {
        errors.push(`${nPrefix} has invalid pitch "${pitch}" (allowed: 1-7, 0, 'empty')`);
      }

      // Octave validation
      const octave = Number(note.octave);
      if (Number.isNaN(octave) || octave < -2 || octave > 2) {
        errors.push(`${nPrefix} has invalid octave "${note.octave}" (allowed: -2 to 2)`);
      }

      // Duration validation
      const duration = Number(note.duration);
      if (Number.isNaN(duration) || duration < 0) {
        errors.push(`${nPrefix} has invalid duration "${note.duration}"`);
      }

      // Lyric validation
      if (note.lyric != null && typeof note.lyric !== 'object' && typeof note.lyric !== 'string') {
        errors.push(`${nPrefix} has invalid lyric field (must be object or string)`);
      }

      // Multi-verse validation
      if (note.lyricsByVerse && typeof note.lyricsByVerse === 'object') {
        for (const [verseIdx, vLyric] of Object.entries(note.lyricsByVerse)) {
          if (Number.isNaN(parseInt(verseIdx, 10))) {
            errors.push(`${nPrefix} has invalid verse index "${verseIdx}" in lyricsByVerse`);
          }
          if (vLyric != null && typeof vLyric !== 'object' && typeof vLyric !== 'string') {
            errors.push(`${nPrefix} has invalid verse lyric for verse ${verseIdx}`);
          }
        }
      }
    });
  });

  return errors;
}

export async function runReview(options = {}) {
  const forceAll = options.all || process.argv.includes('--all') || process.argv.includes('--force');
  const clean = options.clean || process.argv.includes('--clean');

  if (clean && fs.existsSync(CACHE_FILE)) {
    fs.unlinkSync(CACHE_FILE);
    console.log('[Sheet Review] Cleared review cache.');
  }

  if (!fs.existsSync(SHEETS_DIR)) {
    console.error(`[Sheet Review Error] Sheets directory does not exist: ${SHEETS_DIR}`);
    process.exit(1);
  }

  const entries = fs.readdirSync(SHEETS_DIR, { withFileTypes: true });
  const sheetFiles = entries
    .filter(e => e.isFile() && (e.name.endsWith('.taigi.json') || e.name.endsWith('.json')))
    .map(e => path.join(SHEETS_DIR, e.name));

  if (sheetFiles.length === 0) {
    console.error(`[Sheet Review Error] No .taigi.json or .json sheet files found in ${SHEETS_DIR}`);
    process.exit(1);
  }

  const cache = forceAll ? { version: 1, files: {} } : loadCache();
  const currentFilesSet = new Set(sheetFiles);

  const addedFiles = [];
  const modifiedFiles = [];
  const unchangedFiles = [];
  const deletedFiles = [];

  // Detect deleted files
  for (const cachedPath of Object.keys(cache.files || {})) {
    if (!currentFilesSet.has(cachedPath)) {
      deletedFiles.push(cachedPath);
      delete cache.files[cachedPath];
    }
  }

  // Detect added, modified, unchanged files
  const fileDataMap = new Map();
  for (const filePath of sheetFiles) {
    const rawContent = fs.readFileSync(filePath, 'utf-8');
    const hash = computeHash(rawContent);
    fileDataMap.set(filePath, { rawContent, hash });

    const cached = cache.files?.[filePath];
    if (!cached) {
      addedFiles.push(filePath);
    } else if (cached.sha256 !== hash) {
      modifiedFiles.push(filePath);
    } else {
      unchangedFiles.push(filePath);
    }
  }

  console.log(
    `[Sheet Review] Total: ${sheetFiles.length} | Added: ${addedFiles.length}, Modified: ${modifiedFiles.length}, Deleted: ${deletedFiles.length}, Unchanged: ${unchangedFiles.length}`
  );

  if (deletedFiles.length > 0) {
    for (const d of deletedFiles) {
      console.log(`- Pruned deleted sheet: ${path.relative(process.cwd(), d)}`);
    }
  }

  const filesToReview = forceAll ? sheetFiles : [...addedFiles, ...modifiedFiles];
  let hasErrors = false;
  const allSongIds = new Map();

  // Populate songIds from cache for unchanged files to detect cross-file id collisions
  if (!forceAll) {
    for (const filePath of unchangedFiles) {
      const cached = cache.files[filePath];
      if (cached?.songId) {
        allSongIds.set(cached.songId, filePath);
      }
    }
  }

  for (const filePath of filesToReview) {
    const isTaigi = filePath.endsWith('.taigi.json');
    const rel = path.relative(process.cwd(), filePath);
    const { rawContent, hash } = fileDataMap.get(filePath);

    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (err) {
      console.error(`❌ [Sheet Review Failed] ${rel} is not valid JSON:\n   ${err.message}`);
      hasErrors = true;
      continue;
    }

    const errors = validateSongObject(parsed, filePath, isTaigi);
    if (errors.length > 0) {
      console.error(`❌ [Sheet Review Failed] ${rel} has ${errors.length} validation error(s):`);
      errors.forEach(err => console.error(`   • ${err}`));
      hasErrors = true;
      continue;
    }

    // Check cross-file ID collision
    if (allSongIds.has(parsed.id) && allSongIds.get(parsed.id) !== filePath) {
      console.error(
        `❌ [Sheet Review Failed] Duplicate song id "${parsed.id}" found in both ${rel} and ${path.relative(process.cwd(), allSongIds.get(parsed.id))}`
      );
      hasErrors = true;
      continue;
    }
    allSongIds.set(parsed.id, filePath);

    // Passed! Update cache entry
    const isAdded = addedFiles.includes(filePath);
    const label = isAdded ? 'Added' : 'Modified';
    const songType = isTaigi ? 'Taigi Song (.taigi.json)' : 'General Song (.json)';
    console.log(`✓ Verified (${label}): ${rel} [${songType} - "${parsed.title}"]`);

    cache.files[filePath] = {
      sha256: hash,
      mtime: fs.statSync(filePath).mtimeMs,
      status: 'valid',
      songId: parsed.id,
      title: parsed.title,
      isTaigi,
    };
  }

  if (hasErrors) {
    console.error('\n❌ Sheet review failed. Fix the errors above before building.');
    process.exit(1);
  }

  saveCache(cache);
  console.log(`✓ All sheet reviews passed cleanly.\n`);
}

// Execute if run directly from CLI
if (import.meta.url === `file://${process.argv[1]}`) {
  runReview().catch(err => {
    console.error('Fatal review error:', err);
    process.exit(1);
  });
}
