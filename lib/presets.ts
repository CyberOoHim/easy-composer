import type { Song } from '../types/song.ts';
import { sanitizeSong } from './songParser.ts';
import { RAW_PRESET_SHEETS, SHEET_FILE_REGISTRY, type SheetFileMeta } from './sheetManifest.ts';

export { SHEET_FILE_REGISTRY };
export type { SheetFileMeta };

/**
 * Pre-loaded and sanitized preset songs loaded dynamically from /data/sheets/
 */
export const PRESET_SONGS: Song[] = RAW_PRESET_SHEETS
  .map(raw => sanitizeSong(raw))
  .filter((s): s is Song => s !== null);

/**
 * Individual named preset export for backward compatibility
 */
export const TAIWAN_THE_GREEN: Song =
  PRESET_SONGS.find(s => s.id === 'taiwan-the-green') || PRESET_SONGS[0];

/**
 * Creates a brand-new empty/fresh song template ready for editing.
 */
export function createFreshSong(title = 'Untitled Song'): Song {
  const timestamp = Date.now();
  return {
    id: `song-${timestamp}`,
    title,
    subtitle: '',
    composer: '',
    lyricist: '',
    key: 'C',
    timeSignature: '4/4',
    bpm: 80,
    notesPerLine: 4,
    description: '',
    measures: [
      {
        id: `m-${timestamp}-1`,
        measureNumber: 1,
        chord: 'C',
        section: 'Verse 1',
        notes: [
          { id: `n-${timestamp}-1`, pitch: 1, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
          { id: `n-${timestamp}-2`, pitch: 2, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
          { id: `n-${timestamp}-3`, pitch: 3, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
          { id: `n-${timestamp}-4`, pitch: 5, octave: 0, duration: 1, lyric: { poj: '', hanlo: '' } },
        ],
      },
    ],
  };
}
