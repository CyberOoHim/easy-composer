/**
 * AUTO-GENERATED FILE by scripts/generate-sheet-manifest.mjs
 * DO NOT EDIT DIRECTLY.
 * Add, edit, or delete .taigi.json and .json files in /data/sheets/
 */
import type { Song } from '../types/song.ts';

import bangChhunHong from '../data/sheets/bang-chhun-hong.taigi.json' with { type: 'json' };
import uIaHoe from '../data/sheets/u-ia-hoe.taigi.json' with { type: 'json' };
import suKiHong from '../data/sheets/su-ki-hong.taigi.json' with { type: 'json' };
import taiwanTheGreen from '../data/sheets/taiwan-the-green.taigi.json' with { type: 'json' };

export interface SheetFileMeta {
  filename: string;
  id: string;
  title: string;
  isTaigi: boolean;
  order: number;
}

export const SHEET_FILE_REGISTRY: SheetFileMeta[] = [
  { filename: 'bang-chhun-hong.taigi.json', id: 'bang-chhun-hong', title: "望春風", isTaigi: true, order: 1 },
  { filename: 'u-ia-hoe.taigi.json', id: 'u-ia-hoe', title: "雨夜花 (Ú-iā-hoe)", isTaigi: true, order: 2 },
  { filename: 'su-ki-hong.taigi.json', id: 'su-ki-hong', title: "四季紅", isTaigi: true, order: 3 },
  { filename: 'taiwan-the-green.taigi.json', id: 'taiwan-the-green', title: "台灣翠青", isTaigi: true, order: 4 },
];

export const RAW_PRESET_SHEETS: Song[] = [
  bangChhunHong as unknown as Song,
  uIaHoe as unknown as Song,
  suKiHong as unknown as Song,
  taiwanTheGreen as unknown as Song,
];
