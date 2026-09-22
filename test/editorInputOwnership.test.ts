import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

function readSource(relPath: string): string {
  return fs.readFileSync(path.resolve(ROOT, relPath), 'utf8');
}

describe('Editor input ownership (INT-3)', () => {
  it('does not special-case measure 13 for hyphen joining', () => {
    const canvas = readSource('components/composer/RealSheetCanvas.tsx');
    assert.equal(canvas.includes('measureNumber === 13'), false);
    assert.match(canvas, /rawPojTrimmed\.endsWith\('-'\)/);
  });

  it('selects the tapped note without also calling onSelectMeasure', () => {
    const canvas = readSource('components/composer/RealSheetCanvas.tsx');
    const clickFn = canvas.match(
      /const handleNoteClick = useCallback\(\s*\(([\s\S]*?)\},\s*\[[^\]]*\]\s*\);/
    );
    assert.ok(clickFn, 'handleNoteClick should exist');
    assert.equal(
      clickFn![1].includes('onSelectMeasure'),
      false,
      'handleNoteClick must not call onSelectMeasure'
    );
    assert.match(
      canvas,
      /onClick=\{\(\) => \{[\s\S]*?onSelectMeasure\?\.\(engravedM\.measureIndex\);[\s\S]*?\}\}/
    );
  });

  it('maps - to dash and _ to octave down in the score keydown owner', () => {
    const canvas = readSource('components/composer/RealSheetCanvas.tsx');
    assert.match(canvas, /if \(e\.key === '-'\) \{[\s\S]*?handleSetDash\(\)/);
    assert.match(canvas, /if \(e\.key === '_'\) \{[\s\S]*?handleSetOctave\(-1\)/);
    assert.equal(canvas.includes("e.key === '`' || e.key === '_'"), false);
  });

  it('drops duplicate pitch / octave / dash handling from ComposerEditor', () => {
    const editor = readSource('components/ComposerEditor.tsx');
    const keydown = editor.match(
      /Global Find \/ transport \/ measure-ops only[\s\S]*?window\.addEventListener\('keydown'/
    );
    assert.ok(keydown, 'ComposerEditor should keep a reduced global keydown handler');
    assert.equal(keydown![0].includes('handleSetPitch'), false);
    assert.equal(keydown![0].includes('handleSetOctave'), false);
    assert.equal(keydown![0].includes("e.key === '-'"), false);
    assert.match(keydown![0], /e\.defaultPrevented/);
  });

  it('aligns HUD octave-down tooltip with Key _', () => {
    const hud = readSource('components/composer/FloatingScoreHud.tsx');
    assert.equal(hud.includes('Octave Down (• below) (Key -)'), false);
    assert.ok(hud.includes('Octave Down (• below) (Key _)'));
  });

  it('applies Specific Verse scope through applyLyricTokensToSong', () => {
    const modal = readSource('components/QuickLyricAlignerModal.tsx');
    assert.match(
      modal,
      /if \(alignScope === 'verse'\) \{[\s\S]*?applyLyricTokensToSong\(/
    );
    assert.equal(modal.includes('t.hanlo || t.poj'), false);
  });
});
