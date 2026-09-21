import QRCode from 'qrcode';

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
      width: options?.width ?? 360,
      color: {
        dark: options?.darkColor ?? '#3b2818',
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
