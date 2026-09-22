import QRCode from 'qrcode';
import type { Song } from '../types/song.ts';

export interface QrCodeOptions {
  width?: number;
  margin?: number;
  darkColor?: string;
  lightColor?: string;
}

export interface QrCodeResult {
  dataUrl: string | null;
  error: string | null;
  isTooLarge: boolean;
}

export interface FormattedSongTitle {
  primaryTitle: string;
  secondaryTitle?: string;
  fullTitle: string;
}

export interface QrCodeWithTitleOptions extends QrCodeOptions {
  canvasWidth?: number;
  qrSize?: number;
  includeFooter?: boolean;
}

export interface QrCodeWithTitleResult extends QrCodeResult {
  titleInfo: FormattedSongTitle;
  combinedDataUrl: string | null;
  rawQrDataUrl: string | null;
}

function isRomanized(text: string): boolean {
  if (!text) return false;
  // Contains Latin characters or common POJ/Tailo diacritics
  const latinCount = (text.match(/[A-Za-z\u00C0-\u024F\u1E00-\u1EFF]/g) || []).length;
  const hanCount = (text.match(/[\u4e00-\u9fa5]/g) || []).length;
  return latinCount > 0 && latinCount >= hanCount;
}

function isMetadata(text: string): boolean {
  if (!text) return false;
  return /詞|曲|制譜|採譜|記譜|演唱|版權|群：|http|www\./.test(text);
}

/**
 * Extracts and formats the song title based on the active language setting
 * (e.g. song.language: 'taigi' | 'english' | 'mandarin' | 'japanese', and verseDisplayOption: 'hanlo' | 'poj' | 'both_poj_top' | 'both_hanlo_top').
 */
export function getSongTitleByLanguageSetting(song: Song): FormattedSongTitle {
  const rawTitle = song.title ? song.title.trim() : 'Untitled Song';
  const rawSubtitle = song.subtitle ? song.subtitle.trim() : '';

  // 1. Parse title parenthetical content e.g. "雨夜花 (Ú-iā-hoe)"
  const titleParenMatch = rawTitle.match(/[\(（]([^\)）]+)[\)）]/);
  const titleParen = titleParenMatch ? titleParenMatch[1].trim() : '';
  const chineseTitlePart = rawTitle.replace(/\s*[\(（][^\)）]+[\)）]\s*/g, '').trim() || rawTitle;

  // 2. Parse subtitle content e.g. "Tâi-oân Chhùi Chhiⁿ (Taiwan the Green)" or "Sù-kì-hông (7030...)"
  const subParenMatch = rawSubtitle.match(/[\(（]([^\)）]+)[\)）]/);
  const subParen = subParenMatch ? subParenMatch[1].trim() : '';
  const subPreParen = rawSubtitle.replace(/\s*[\(（][^\)）]+[\)）]\s*/g, '').trim();

  // 3. Extract candidate POJ / Romanized title
  const candidateRoman = (titleParen && isRomanized(titleParen))
    ? titleParen
    : (subPreParen && isRomanized(subPreParen))
    ? subPreParen
    : (rawSubtitle && !isMetadata(rawSubtitle) && isRomanized(rawSubtitle))
    ? rawSubtitle
    : undefined;

  // 4. Extract candidate English title
  const candidateEnglish = (subParen && isRomanized(subParen) && !isMetadata(subParen))
    ? subParen
    : (rawSubtitle && !isMetadata(rawSubtitle) && /^[A-Za-z\s\-,.']+$/.test(rawSubtitle))
    ? rawSubtitle
    : undefined;

  const lang = song.language || 'taigi';
  const verseOption = song.verseDisplayOption || 'both_hanlo_top';

  let primary = rawTitle;
  let secondary: string | undefined = undefined;

  if (lang === 'english') {
    // English language preference
    if (candidateEnglish) {
      primary = candidateEnglish;
      secondary = chineseTitlePart !== primary ? chineseTitlePart : undefined;
    } else {
      primary = rawTitle;
      secondary = rawSubtitle && !isMetadata(rawSubtitle) ? rawSubtitle : undefined;
    }
  } else if (lang === 'mandarin' || lang === 'japanese') {
    // Mandarin or Japanese preference
    primary = chineseTitlePart || rawTitle;
    if (titleParen) {
      secondary = titleParen;
    } else if (rawSubtitle && !isMetadata(rawSubtitle)) {
      secondary = rawSubtitle;
    }
  } else {
    // Taigi or Multilingual preference (respect verseDisplayOption)
    if (verseOption === 'poj') {
      // POJ Romanization only
      if (candidateRoman) {
        primary = candidateRoman;
        secondary = chineseTitlePart !== primary ? chineseTitlePart : undefined;
      } else {
        primary = rawTitle;
        secondary = undefined;
      }
    } else if (verseOption === 'hanlo') {
      // Han-lo only
      primary = chineseTitlePart || rawTitle;
      secondary = undefined;
    } else if (verseOption === 'both_poj_top') {
      // POJ on top, Han-lo below
      if (candidateRoman) {
        primary = candidateRoman;
        secondary = chineseTitlePart !== primary ? chineseTitlePart : undefined;
      } else {
        primary = rawTitle;
        secondary = rawSubtitle && !isMetadata(rawSubtitle) ? rawSubtitle : undefined;
      }
    } else {
      // both_hanlo_top or default
      primary = chineseTitlePart || rawTitle;
      if (candidateRoman && candidateRoman !== primary) {
        secondary = candidateRoman;
      } else if (titleParen && titleParen !== primary) {
        secondary = titleParen;
      } else if (rawSubtitle && !isMetadata(rawSubtitle)) {
        secondary = rawSubtitle;
      }
    }
  }

  // Ensure clean primary and secondary
  primary = primary.trim() || 'Untitled Song';
  if (secondary && secondary.trim() === primary.trim()) {
    secondary = undefined;
  }

  const fullTitle = secondary ? `${primary} (${secondary})` : primary;

  return {
    primaryTitle: primary,
    secondaryTitle: secondary,
    fullTitle,
  };
}

/**
 * Helper to load an image source in browser environments.
 */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load QR image for composite rendering'));
    img.src = src;
  });
}

/**
 * Draws the song title text (per language setting) on top of the QR code canvas
 * and returns the composite image as a high-resolution PNG data URL.
 */
async function renderQrWithTitleToDataUrl(
  rawQrDataUrl: string,
  song: Song,
  titleInfo: FormattedSongTitle,
  options?: QrCodeWithTitleOptions
): Promise<string> {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return rawQrDataUrl;
  }

  const img = await loadImage(rawQrDataUrl);

  const canvasWidth = options?.canvasWidth ?? 640;
  const qrTargetSize = options?.qrSize ?? 460;
  const padX = 40;
  const padY = 34;
  const contentWidth = canvasWidth - padX * 2;

  // Use an offscreen canvas to measure and layout typography
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return rawQrDataUrl;

  // 1. Calculate suitable font size for primary title
  let titleFontSize = 34;
  ctx.font = `bold ${titleFontSize}px "Noto Serif TC", "Source Han Serif", serif, "Songti SC", system-ui, sans-serif`;
  while (ctx.measureText(titleInfo.primaryTitle).width > contentWidth && titleFontSize > 18) {
    titleFontSize -= 2;
    ctx.font = `bold ${titleFontSize}px "Noto Serif TC", "Source Han Serif", serif, "Songti SC", system-ui, sans-serif`;
  }
  const titleLineHeight = Math.round(titleFontSize * 1.3);

  // 2. Calculate suitable font size for secondary title (if present)
  let subFontSize = 18;
  let subLineHeight = 0;
  if (titleInfo.secondaryTitle) {
    ctx.font = `normal ${subFontSize}px "Noto Serif TC", "Source Han Serif", serif, system-ui, sans-serif`;
    while (ctx.measureText(titleInfo.secondaryTitle).width > contentWidth && subFontSize > 13) {
      subFontSize -= 1;
      ctx.font = `normal ${subFontSize}px "Noto Serif TC", "Source Han Serif", serif, system-ui, sans-serif`;
    }
    subLineHeight = Math.round(subFontSize * 1.35);
  }

  const gapTitleToSub = titleInfo.secondaryTitle ? 6 : 0;
  const gapSubToQr = 20;
  const gapQrToFooter = 16;
  const footerLineHeight = options?.includeFooter === false ? 0 : 22;

  const canvasHeight =
    padY +
    titleLineHeight +
    gapTitleToSub +
    subLineHeight +
    gapSubToQr +
    qrTargetSize +
    (options?.includeFooter === false ? 0 : gapQrToFooter + footerLineHeight) +
    padY;

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Fill crisp white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  // Draw Primary Title (centered on top)
  let currentY = padY + Math.round(titleLineHeight * 0.72);
  ctx.fillStyle = '#1c1917'; // warm rich near-black
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.font = `bold ${titleFontSize}px "Noto Serif TC", "Source Han Serif", serif, "Songti SC", system-ui, sans-serif`;
  ctx.fillText(titleInfo.primaryTitle, canvasWidth / 2, currentY);

  // Draw Secondary Title if present (centered)
  if (titleInfo.secondaryTitle) {
    currentY += gapTitleToSub + subLineHeight;
    ctx.fillStyle = '#57534e'; // stone-600
    ctx.font = `normal ${subFontSize}px "Noto Serif TC", "Source Han Serif", serif, system-ui, sans-serif`;
    ctx.fillText(titleInfo.secondaryTitle, canvasWidth / 2, currentY);
  }

  // Draw QR Code centered horizontally
  const qrX = Math.round((canvasWidth - qrTargetSize) / 2);
  const qrY = currentY + gapSubToQr;
  ctx.drawImage(img, qrX, qrY, qrTargetSize, qrTargetSize);

  // Draw Musical Meter Footer & Attribution (centered)
  if (options?.includeFooter !== false) {
    const footerY = qrY + qrTargetSize + gapQrToFooter + Math.round(footerLineHeight * 0.7);
    ctx.fillStyle = '#78716c'; // stone-500
    ctx.font = `600 13px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    const meterText = `1 = ${song.key || 'C'}   ·   ${song.timeSignature || '4/4'}   ·   ${song.bpm || 80} BPM   ·   Easy Composer`;
    ctx.fillText(meterText, canvasWidth / 2, footerY);
  }

  return canvas.toDataURL('image/png');
}

/**
 * Generates a high-resolution, high-contrast QR code data URL for shareable score URLs.
 * Uses Error Correction Level 'L' to maximize data payload capacity for serialized musical scores.
 */
export async function generateScoreQrCode(
  url: string,
  options?: QrCodeOptions
): Promise<QrCodeResult> {
  if (!url || !url.trim()) {
    return { dataUrl: null, error: 'Empty URL', isTooLarge: false };
  }

  try {
    const dataUrl = await QRCode.toDataURL(url, {
      errorCorrectionLevel: 'L',
      margin: options?.margin ?? 2,
      width: options?.width ?? 480,
      color: {
        dark: options?.darkColor ?? '#1c1917',
        light: options?.lightColor ?? '#ffffff',
      },
    });
    return { dataUrl, error: null, isTooLarge: false };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    const isTooLarge =
      errMsg.toLowerCase().includes('too big') ||
      errMsg.toLowerCase().includes('overflow') ||
      errMsg.toLowerCase().includes('exceed') ||
      errMsg.toLowerCase().includes('amount of data');
    return {
      dataUrl: null,
      error: isTooLarge
        ? 'This score URL is too large to fit into a standard QR code. Please copy or share the link directly.'
        : 'Failed to generate QR code.',
      isTooLarge,
    };
  }
}

/**
 * Generates a complete shareable QR code package with the song title text on top
 * (per the language setting) to be displayed and downloaded as a unified image.
 */
export async function generateScoreQrCodeWithTitle(
  url: string,
  song: Song,
  options?: QrCodeWithTitleOptions
): Promise<QrCodeWithTitleResult> {
  const qrRes = await generateScoreQrCode(url, options);
  const titleInfo = getSongTitleByLanguageSetting(song);

  if (!qrRes.dataUrl) {
    return {
      dataUrl: null,
      error: qrRes.error,
      isTooLarge: qrRes.isTooLarge,
      titleInfo,
      combinedDataUrl: null,
      rawQrDataUrl: null,
    };
  }

  // In browser environments with Canvas, composite the song title on top
  if (typeof document !== 'undefined' && typeof window !== 'undefined') {
    try {
      const combinedDataUrl = await renderQrWithTitleToDataUrl(qrRes.dataUrl, song, titleInfo, options);
      return {
        dataUrl: combinedDataUrl || qrRes.dataUrl,
        error: null,
        isTooLarge: false,
        titleInfo,
        combinedDataUrl: combinedDataUrl || qrRes.dataUrl,
        rawQrDataUrl: qrRes.dataUrl,
      };
    } catch (err) {
      console.warn('[qrCode] Fallback to raw QR without title composition:', err);
    }
  }

  return {
    dataUrl: qrRes.dataUrl,
    error: null,
    isTooLarge: false,
    titleInfo,
    combinedDataUrl: qrRes.dataUrl,
    rawQrDataUrl: qrRes.dataUrl,
  };
}

/**
 * Programmatically initiates the download of the QR code image.
 */
export function downloadQrCodeImage(
  dataUrl: string,
  fileName = 'score-qrcode.png'
): boolean {
  if (typeof document === 'undefined' || !dataUrl) return false;
  try {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Failed to trigger QR code download:', err);
    return false;
  }
}

