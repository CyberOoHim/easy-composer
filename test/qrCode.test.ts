import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateScoreQrCode,
  generateScoreQrCodeWithTitle,
  getSongTitleByLanguageSetting,
} from '../lib/qrCode.ts';
import type { Song } from '../types/song.ts';

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

  describe('getSongTitleByLanguageSetting', () => {
    const baseSong: Song = {
      id: 'taiwan-the-green',
      title: '台灣翠青',
      subtitle: 'Tâi-oân Chhùi Chhiⁿ (Taiwan the Green)',
      composer: '蕭泰然',
      lyricist: '鄭兒玉',
      key: 'D',
      timeSignature: '4/4',
      bpm: 76,
      measures: [],
    };

    it('formats title for default Taigi both_hanlo_top (Hàn-lô top, POJ below)', () => {
      const res = getSongTitleByLanguageSetting({
        ...baseSong,
        language: 'taigi',
        verseDisplayOption: 'both_hanlo_top',
      });
      assert.equal(res.primaryTitle, '台灣翠青');
      assert.equal(res.secondaryTitle, 'Tâi-oân Chhùi Chhiⁿ');
    });

    it('formats title for POJ preference (POJ top, Hàn-lô below)', () => {
      const res = getSongTitleByLanguageSetting({
        ...baseSong,
        language: 'taigi',
        verseDisplayOption: 'poj',
      });
      assert.equal(res.primaryTitle, 'Tâi-oân Chhùi Chhiⁿ');
      assert.equal(res.secondaryTitle, '台灣翠青');
    });

    it('formats title for pure Hàn-lô preference (no secondary)', () => {
      const res = getSongTitleByLanguageSetting({
        ...baseSong,
        language: 'taigi',
        verseDisplayOption: 'hanlo',
      });
      assert.equal(res.primaryTitle, '台灣翠青');
      assert.equal(res.secondaryTitle, undefined);
    });

    it('formats title for English language setting', () => {
      const res = getSongTitleByLanguageSetting({
        ...baseSong,
        language: 'english',
      });
      assert.equal(res.primaryTitle, 'Taiwan the Green');
      assert.equal(res.secondaryTitle, '台灣翠青');
    });

    it('extracts POJ and Hanlo from parenthetical title like 雨夜花 (Ú-iā-hoe)', () => {
      const songU: Song = {
        id: 'u-ia-hoe',
        title: '雨夜花 (Ú-iā-hoe)',
        subtitle: '周添旺 詞 / 鄧雨賢 曲 (信望愛白話字 POJ 對齊·全四段)',
        key: 'Bb',
        timeSignature: '4/4',
        bpm: 72,
        measures: [],
      };

      const defaultRes = getSongTitleByLanguageSetting(songU);
      assert.equal(defaultRes.primaryTitle, '雨夜花');
      assert.equal(defaultRes.secondaryTitle, 'Ú-iā-hoe');

      const pojRes = getSongTitleByLanguageSetting({ ...songU, verseDisplayOption: 'poj' });
      assert.equal(pojRes.primaryTitle, 'Ú-iā-hoe');
      assert.equal(pojRes.secondaryTitle, '雨夜花');

      const hanloRes = getSongTitleByLanguageSetting({ ...songU, verseDisplayOption: 'hanlo' });
      assert.equal(hanloRes.primaryTitle, '雨夜花');
      assert.equal(hanloRes.secondaryTitle, undefined);
    });

    it('handles standalone titles without subtitle or parens gracefully', () => {
      const songB: Song = {
        id: 'bang-chhun-hong',
        title: '望春風',
        key: 'E',
        timeSignature: '4/4',
        bpm: 88,
        measures: [],
      };
      const res = getSongTitleByLanguageSetting(songB);
      assert.equal(res.primaryTitle, '望春風');
      assert.equal(res.secondaryTitle, undefined);
    });
  });

  describe('generateScoreQrCodeWithTitle', () => {
    it('generates QR code with titleInfo populated', async () => {
      const song: Song = {
        id: 'taiwan-the-green',
        title: '台灣翠青',
        subtitle: 'Tâi-oân Chhùi Chhiⁿ (Taiwan the Green)',
        key: 'D',
        timeSignature: '4/4',
        bpm: 76,
        measures: [],
      };
      const res = await generateScoreQrCodeWithTitle('https://example.com/#preset=taiwan-the-green', song);
      assert.equal(res.error, null);
      assert.ok(res.dataUrl);
      assert.equal(res.titleInfo.primaryTitle, '台灣翠青');
      assert.equal(res.titleInfo.secondaryTitle, 'Tâi-oân Chhùi Chhiⁿ');
    });
  });
});

