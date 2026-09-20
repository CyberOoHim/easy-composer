#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const SHEETS_DIR = path.resolve(process.cwd(), 'data/sheets');
const MANIFEST_FILE = path.resolve(process.cwd(), 'lib/sheetManifest.ts');

function toIdentifier(str) {
  return str
    .replace(/\.(taigi|json)/g, '')
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase())
    .replace(/^[0-9]+/, '')
    .replace(/^[^a-zA-Z_$]/, '_');
}

export function generateManifest() {
  if (!fs.existsSync(SHEETS_DIR)) {
    fs.mkdirSync(SHEETS_DIR, { recursive: true });
  }

  const entries = fs.readdirSync(SHEETS_DIR, { withFileTypes: true });
  const sheetFiles = entries
    .filter(e => e.isFile() && (e.name.endsWith('.taigi.json') || e.name.endsWith('.json')))
    .map(e => e.name);

  const sheetsMeta = [];

  for (const filename of sheetFiles) {
    const fullPath = path.join(SHEETS_DIR, filename);
    const content = fs.readFileSync(fullPath, 'utf-8');
    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      continue;
    }
    const isTaigi = filename.endsWith('.taigi.json');
    sheetsMeta.push({
      filename,
      id: parsed.id || filename,
      title: parsed.title || 'Untitled',
      order: typeof parsed.order === 'number' ? parsed.order : 9999,
      isTaigi,
    });
  }

  // Sort by order ascending, then by title
  sheetsMeta.sort((a, b) => {
    if (a.order !== b.order) return a.order - b.order;
    return a.title.localeCompare(b.title);
  });

  const imports = [];
  const rawList = [];
  const metaList = [];

  const seenVarNames = new Set();

  sheetsMeta.forEach((meta, idx) => {
    let varName = toIdentifier(meta.filename) || `sheet_${idx}`;
    if (seenVarNames.has(varName)) {
      varName = `${varName}_${idx}`;
    }
    seenVarNames.add(varName);

    imports.push(`import ${varName} from '../data/sheets/${meta.filename}' with { type: 'json' };`);
    rawList.push(`  ${varName} as unknown as Song,`);
    metaList.push(`  { filename: '${meta.filename}', id: '${meta.id}', title: ${JSON.stringify(meta.title)}, isTaigi: ${meta.isTaigi}, order: ${meta.order} },`);
  });

  const banner = `/**
 * AUTO-GENERATED FILE by scripts/generate-sheet-manifest.mjs
 * DO NOT EDIT DIRECTLY.
 * Add, edit, or delete .taigi.json and .json files in /data/sheets/
 */
import type { Song } from '../types/song.ts';

${imports.join('\n')}

export interface SheetFileMeta {
  filename: string;
  id: string;
  title: string;
  isTaigi: boolean;
  order: number;
}

export const SHEET_FILE_REGISTRY: SheetFileMeta[] = [
${metaList.join('\n')}
];

export const RAW_PRESET_SHEETS: Song[] = [
${rawList.join('\n')}
];
`;

  fs.writeFileSync(MANIFEST_FILE, banner, 'utf-8');
  console.log(`[Sheet Manifest] Successfully generated ${MANIFEST_FILE} with ${sheetsMeta.length} sheets.`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  generateManifest();
}
