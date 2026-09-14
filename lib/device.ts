/**
 * Dedicated iPad device & capability helpers.
 * Streamlined specifically for iPadOS (MobileSafari / WebKit and iPad PWA).
 */

export function isIPad(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const isIPadUa = /iPad/.test(ua);
  const isIPadOsDesktopUa =
    navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return isIPadUa || isIPadOsDesktopUa;
}

export function isIosWebKit(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const iOSDevice = /iPad|iPhone|iPod/.test(ua);
  const iPadOsDesktopUa =
    navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1;
  return iOSDevice || iPadOsDesktopUa;
}

export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const media = window.matchMedia?.('(display-mode: standalone)')?.matches;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return Boolean(media || iosStandalone);
}

export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(pointer: coarse)')?.matches);
}

/** First-run layout: karaoke on iPad / standalone / touch pointers. */
export function prefersKaraokeDefaultLayout(): boolean {
  return isIPad() || isIosWebKit() || isStandalonePwa() || isCoarsePointer();
}

export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
}

