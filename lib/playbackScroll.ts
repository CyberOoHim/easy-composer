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
export const LINE_RETURN_SCROLL_DURATION_MS = 120; // Fast, snappy transition for line returns and pre-cues
export const INTRA_LINE_SCROLL_DURATION_MS = 220; // Smooth glide between measures within the same line

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
    targetNextSystem?: boolean;
  }
): VerticalScrollResult {
  const { safeTop, safeBottom, availableHeight } = getVerticalSafeZone(viewport);
  const anchorRatio = options?.readingAnchorRatio ?? VERTICAL_READING_ANCHOR_RATIO;
  const tolerance = options?.tolerance ?? VERTICAL_JITTER_TOLERANCE_PX;
  const isInitial = Boolean(options?.isInitialOrTopSystem);

  // If explicitly targeting the next system (e.g. anticipatory line-cueing)
  if (options?.targetNextSystem && nextSystemRect) {
    const targetTopInViewport = safeTop + availableHeight * anchorRatio;
    const targetScrollY = Math.max(
      0,
      viewport.currentScrollY + nextSystemRect.top - targetTopInViewport
    );
    if (Math.abs(viewport.currentScrollY - targetScrollY) > tolerance) {
      return {
        shouldScroll: true,
        targetScrollY: Math.round(targetScrollY),
        reason: 'lookahead_next_system',
      };
    }
    return { shouldScroll: false, targetScrollY: viewport.currentScrollY };
  }

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

    let targetScrollY: number;
    if (isCurrentOutOfSafeZone) {
      targetScrollY = Math.max(
        0,
        viewport.currentScrollY + activeSystemRect.top - targetTopInViewport
      );
    } else {
      // Lookahead: scroll enough so upcoming system is brought safely above safeBottom - 24,
      // or shift current system up toward target reading anchor
      const minScrollToClearNext = viewport.currentScrollY + (nextSystemRect!.bottom - (safeBottom - 24));
      const targetByCurrent = viewport.currentScrollY + activeSystemRect.top - targetTopInViewport;
      targetScrollY = Math.max(0, Math.max(minScrollToClearNext, targetByCurrent));
    }

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
 * Clamps against system width to prevent over-scrolling into blank space, and handles
 * line returns cleanly.
 */
export function calculateHorizontalPlaybackScroll(
  bounds: HorizontalBounds,
  activeMeasureRect: HorizontalElementRect,
  options?: {
    anchorRatio?: number;
    tolerance?: number;
    isLineReturn?: boolean;
    maxContentWidth?: number;
    containerPadding?: number;
    isLastMeasureInSystem?: boolean;
  }
): HorizontalScrollResult {
  const tolerance = options?.tolerance ?? HORIZONTAL_JITTER_TOLERANCE_PX;

  // 1. Explicit line return (returning to the start of a line/system)
  if (options?.isLineReturn) {
    const shouldScroll = bounds.currentScrollLeft > tolerance;
    return { shouldScroll, targetScrollLeft: 0 };
  }

  // 2. If the entire system fits within the wrapper width, never scroll right
  if (options?.maxContentWidth !== undefined && options.maxContentWidth <= bounds.wrapperWidth) {
    const shouldScroll = bounds.currentScrollLeft > tolerance;
    return { shouldScroll, targetScrollLeft: 0 };
  }

  const anchorRatio = options?.anchorRatio ?? HORIZONTAL_READING_ANCHOR_RATIO;
  const targetAnchorX = bounds.wrapperWidth * anchorRatio;
  const currentMeasureLeftInWrapper = activeMeasureRect.left - bounds.containerLeft;

  // Compute standard offset to anchor active measure at targetAnchorX (~33%)
  const offsetFromAnchor = currentMeasureLeftInWrapper - targetAnchorX;
  let targetScrollLeft = Math.max(0, bounds.currentScrollLeft + offsetFromAnchor);

  // Clamp against system right edge if maxContentWidth is provided
  if (options?.maxContentWidth !== undefined && options.maxContentWidth > bounds.wrapperWidth) {
    const padding = options.containerPadding ?? 48;
    const maxAllowedScroll = Math.max(0, options.maxContentWidth - bounds.wrapperWidth + padding);
    targetScrollLeft = Math.min(targetScrollLeft, maxAllowedScroll);
  }

  // If this is the last measure in the system, clamp so its right edge does not push into empty space
  if (options?.isLastMeasureInSystem) {
    const measureRightInWrapper = (activeMeasureRect.right - bounds.containerLeft) + bounds.currentScrollLeft;
    const maxScrollForLastMeasure = Math.max(0, measureRightInWrapper - bounds.wrapperWidth + 32);
    targetScrollLeft = Math.min(targetScrollLeft, maxScrollForLastMeasure);
  }

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
