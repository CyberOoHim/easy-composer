/**
 * Playback Auto-Scroll Engine for Easy Composer
 *
 * Provides smooth, predictive, lookahead-aware viewport calculations for realistic
 * sheet music playback on iPadOS Mobile Safari and Desktop browsers.
 */

export const VERTICAL_READING_ANCHOR_RATIO = 0.28; // Active line sits ~28% into safe zone
export const HORIZONTAL_READING_ANCHOR_RATIO = 0.33; // Active measure sits ~33% from left edge
export const VERTICAL_JITTER_TOLERANCE_PX = 8;
export const HORIZONTAL_JITTER_TOLERANCE_PX = 12;
export const USER_INTERACTION_GRACE_PERIOD_MS = 2500;

export interface ViewportBounds {
  viewportHeight: number;
  currentScrollY: number;
  headerHeight: number;
  hudHeight: number;
}

export interface ElementRect {
  top: number;
  bottom: number;
  height: number;
}

export interface VerticalScrollResult {
  shouldScroll: boolean;
  targetScrollY: number;
  reason?: 'out_of_safe_zone' | 'lookahead_next_system' | 'reading_anchor_realign';
}

export interface HorizontalBounds {
  wrapperWidth: number;
  currentScrollLeft: number;
  containerLeft: number;
}

export interface HorizontalElementRect {
  left: number;
  right: number;
  width: number;
}

export interface HorizontalScrollResult {
  shouldScroll: boolean;
  targetScrollLeft: number;
}

/**
 * Calculates safe vertical boundaries between the sticky top header and the floating bottom HUD stack.
 */
export function getVerticalSafeZone(viewport: ViewportBounds): {
  safeTop: number;
  safeBottom: number;
  availableHeight: number;
} {
  const headerH = Math.max(viewport.headerHeight, 44);
  const hudH = Math.max(viewport.hudHeight, 90);
  const safeTop = headerH + 12;
  const safeBottom = Math.max(safeTop + 100, viewport.viewportHeight - hudH - 16);
  const availableHeight = Math.max(100, safeBottom - safeTop);
  return { safeTop, safeBottom, availableHeight };
}

/**
 * Calculates smooth vertical playback scroll target with predictive lookahead.
 *
 * Preserves realistic sheet feel:
 * - Keeps top of page intact on initial measures without premature upward jumping.
 * - Anchors playing line in the "Golden Reading Band" (~28% down safe zone).
 * - Pre-rolls the viewport when the upcoming line approaches the bottom HUD.
 */
export function calculateVerticalPlaybackScroll(
  viewport: ViewportBounds,
  activeSystemRect: ElementRect,
  nextSystemRect?: ElementRect | null,
  options?: {
    isInitialOrTopSystem?: boolean;
    readingAnchorRatio?: number;
    tolerance?: number;
  }
): VerticalScrollResult {
  const { safeTop, safeBottom, availableHeight } = getVerticalSafeZone(viewport);
  const anchorRatio = options?.readingAnchorRatio ?? VERTICAL_READING_ANCHOR_RATIO;
  const tolerance = options?.tolerance ?? VERTICAL_JITTER_TOLERANCE_PX;
  const isInitial = Boolean(options?.isInitialOrTopSystem);

  // 1. If we are on the initial/top systems and already comfortably in view,
  // do NOT scroll so the title, header, and paper top remain visible.
  if (isInitial && viewport.currentScrollY <= 20) {
    const isCurrentSafe = activeSystemRect.top >= safeTop - 4 && activeSystemRect.bottom <= safeBottom;
    const isNextSafe = !nextSystemRect || nextSystemRect.bottom <= safeBottom;
    if (isCurrentSafe && isNextSafe) {
      return { shouldScroll: false, targetScrollY: viewport.currentScrollY };
    }
  }

  // 2. Check if current system is out of safe bounds
  const isCurrentOutOfSafeZone =
    activeSystemRect.top < safeTop || activeSystemRect.bottom > safeBottom;

  // 3. Lookahead check: is the upcoming system getting obscured by the bottom HUD?
  // If nextSystemRect exists and its bottom is close to or past safeBottom, we initiate
  // an anticipatory scroll so the user can sight-read the upcoming line before it plays.
  const isNextSystemApproachingBottom = Boolean(
    nextSystemRect && nextSystemRect.bottom > safeBottom - 24
  );

  if (isCurrentOutOfSafeZone || isNextSystemApproachingBottom) {
    // If this is the initial/top system and it was scrolled out of safe zone (e.g. user replayed
    // after scrolling down), reset to top of page (0) so score title and sheet paper top are restored.
    if (isInitial && activeSystemRect.top < safeTop) {
      if (Math.abs(viewport.currentScrollY - 0) > tolerance) {
        return {
          shouldScroll: true,
          targetScrollY: 0,
          reason: 'out_of_safe_zone',
        };
      }
      return { shouldScroll: false, targetScrollY: viewport.currentScrollY };
    }

    // Golden reading anchor position: ~28% from the top of the safe viewport
    const targetTopInViewport = safeTop + availableHeight * anchorRatio;
    const targetScrollY = Math.max(
      0,
      viewport.currentScrollY + activeSystemRect.top - targetTopInViewport
    );

    if (Math.abs(viewport.currentScrollY - targetScrollY) > tolerance) {
      return {
        shouldScroll: true,
        targetScrollY: Math.round(targetScrollY),
        reason: isCurrentOutOfSafeZone ? 'out_of_safe_zone' : 'lookahead_next_system',
      };
    }
  }

  return { shouldScroll: false, targetScrollY: viewport.currentScrollY };
}

/**
 * Calculates smooth horizontal scroll target for no_wrap continuous mode.
 *
 * Keeps active measure anchored at ~33% from the left edge of the viewport,
 * ensuring ~67% of remaining screen width gives advance visibility of upcoming measures.
 */
export function calculateHorizontalPlaybackScroll(
  bounds: HorizontalBounds,
  activeMeasureRect: HorizontalElementRect,
  options?: {
    anchorRatio?: number;
    tolerance?: number;
  }
): HorizontalScrollResult {
  const anchorRatio = options?.anchorRatio ?? HORIZONTAL_READING_ANCHOR_RATIO;
  const tolerance = options?.tolerance ?? HORIZONTAL_JITTER_TOLERANCE_PX;

  const targetAnchorX = bounds.wrapperWidth * anchorRatio;
  const currentMeasureLeftInWrapper = activeMeasureRect.left - bounds.containerLeft;

  // Compute how far to adjust scroll to center active measure at targetAnchorX
  const offsetFromAnchor = currentMeasureLeftInWrapper - targetAnchorX;
  const targetScrollLeft = Math.max(0, bounds.currentScrollLeft + offsetFromAnchor);

  if (Math.abs(bounds.currentScrollLeft - targetScrollLeft) > tolerance) {
    return {
      shouldScroll: true,
      targetScrollLeft: Math.round(targetScrollLeft),
    };
  }

  return { shouldScroll: false, targetScrollLeft: bounds.currentScrollLeft };
}

export interface CancelableScrollAnimation {
  cancel: () => void;
  target: number;
}

/**
 * Smoothly scrolls the window to a target Y position using requestAnimationFrame with ease-out cubic easing.
 * Avoids WebKit Mobile Safari smooth scroll queueing and allows instant interruption when touch interaction occurs.
 */
export function smoothScrollWindowTo(
  targetY: number,
  options?: { duration?: number; tolerance?: number }
): CancelableScrollAnimation {
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
    return { cancel: () => {}, target: targetY };
  }

  const duration = options?.duration ?? 280;
  const tolerance = options?.tolerance ?? 2;
  const currentY = window.scrollY || document.documentElement.scrollTop;
  const distance = targetY - currentY;

  if (Math.abs(distance) <= tolerance || duration <= 0) {
    window.scrollTo({ top: targetY, behavior: 'auto' });
    return { cancel: () => {}, target: targetY };
  }

  if (
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    window.scrollTo({ top: targetY, behavior: 'auto' });
    return { cancel: () => {}, target: targetY };
  }

  let rafId: number | null = null;
  let startTime: number | null = null;
  let isCancelled = false;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    if (isCancelled) return;
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easedProgress = easeOutCubic(progress);
    const nextY = Math.round(currentY + distance * easedProgress);

    window.scrollTo({ top: nextY, behavior: 'auto' });

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    }
  };

  rafId = requestAnimationFrame(step);

  return {
    cancel: () => {
      isCancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    target: targetY,
  };
}

/**
 * Smoothly scrolls an element horizontally to a target scrollLeft position using requestAnimationFrame with ease-out cubic easing.
 */
export function smoothScrollElementTo(
  el: HTMLElement,
  targetX: number,
  options?: { duration?: number; tolerance?: number }
): CancelableScrollAnimation {
  if (typeof window === 'undefined' || typeof requestAnimationFrame === 'undefined') {
    if (el) el.scrollLeft = targetX;
    return { cancel: () => {}, target: targetX };
  }

  const duration = options?.duration ?? 280;
  const tolerance = options?.tolerance ?? 2;
  const currentX = el.scrollLeft;
  const distance = targetX - currentX;

  if (Math.abs(distance) <= tolerance || duration <= 0) {
    el.scrollLeft = targetX;
    return { cancel: () => {}, target: targetX };
  }

  if (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  ) {
    el.scrollLeft = targetX;
    return { cancel: () => {}, target: targetX };
  }

  let rafId: number | null = null;
  let startTime: number | null = null;
  let isCancelled = false;

  const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

  const step = (now: number) => {
    if (isCancelled) return;
    if (startTime === null) startTime = now;
    const elapsed = now - startTime;
    const progress = Math.min(1, elapsed / duration);
    const easedProgress = easeOutCubic(progress);
    const nextX = Math.round(currentX + distance * easedProgress);

    el.scrollLeft = nextX;

    if (progress < 1) {
      rafId = requestAnimationFrame(step);
    }
  };

  rafId = requestAnimationFrame(step);

  return {
    cancel: () => {
      isCancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    target: targetX,
  };
}
