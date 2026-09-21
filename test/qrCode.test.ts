import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateScoreQrCode } from '../lib/qrCode.ts';

describe('QR Code Generation Engine (qrCode)', () => {
  it('generates a valid data URL for standard preset URLs', async () => {
    const result = await generateScoreQrCode('https://example.com/#preset=bang-chhun-hong');
    assert.equal(result.error, null);
    assert.equal(result.isTooLarge, false);
    assert.ok(result.dataUrl);
    assert.ok(result.dataUrl.startsWith('data:image/png;base64,'));
  });

  it('generates a valid data URL for moderate-sized compressed song URLs', async () => {
    const fakePayload = 'A'.repeat(800);
    const result = await generateScoreQrCode(`https://example.com/#song=${fakePayload}`);
    assert.equal(result.error, null);
    assert.equal(result.isTooLarge, false);
    assert.ok(result.dataUrl);
    assert.ok(result.dataUrl.startsWith('data:image/png;base64,'));
  });

  it('handles empty URLs gracefully', async () => {
    const result = await generateScoreQrCode('');
    assert.equal(result.dataUrl, null);
    assert.equal(result.error, 'Empty URL');
    assert.equal(result.isTooLarge, false);
  });

  it('detects oversized payloads and provides user-friendly error', async () => {
    // 5000 characters exceeds maximum QR capacity
    const oversizedPayload = 'X'.repeat(5000);
    const result = await generateScoreQrCode(`https://example.com/#song=${oversizedPayload}`);
    assert.equal(result.dataUrl, null);
    assert.equal(result.isTooLarge, true);
    assert.ok(result.error?.includes('too large'));
  });
});
