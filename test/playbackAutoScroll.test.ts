import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  getVerticalSafeZone,
  calculateVerticalPlaybackScroll,
  calculateHorizontalPlaybackScroll,
  VERTICAL_READING_ANCHOR_RATIO,
  HORIZONTAL_READING_ANCHOR_RATIO,
  VERTICAL_JITTER_TOLERANCE_PX,
  HORIZONTAL_JITTER_TOLERANCE_PX,
  LINE_RETURN_SCROLL_DURATION_MS,
  INTRA_LINE_SCROLL_DURATION_MS,
  smoothScrollWindowTo,
  smoothScrollElementTo,
} from '../lib/playbackScroll.ts';

describe('Playback Auto-Scroll Engine (playbackScroll)', () => {
  describe('getVerticalSafeZone', () => {
    it('computes safe boundaries based on sticky header and floating HUD height', () => {
      const zone = getVerticalSafeZone({
        viewportHeight: 800,
        currentScrollY: 0,
        headerHeight: 52,
        hudHeight: 180,
      });

      // safeTop = header (52) + 12 = 64
      assert.equal(zone.safeTop, 64);
      // safeBottom = 800 - 180 - 16 = 604
      assert.equal(zone.safeBottom, 604);
      // availableHeight = 604 - 64 = 540
      assert.equal(zone.availableHeight, 540);
    });

    it('enforces minimum fallbacks for very compact viewports or small HUDs', () => {
      const zone = getVerticalSafeZone({
        viewportHeight: 400,
        currentScrollY: 0,
        headerHeight: 30, // below 44 min
        hudHeight: 50,    // below 90 min
      });

      assert.equal(zone.safeTop, 56); // 44 + 12
      assert.ok(zone.availableHeight >= 100);
    });
  });

  describe('calculateVerticalPlaybackScroll', () => {
    const defaultViewport = {
      viewportHeight: 800,
      currentScrollY: 0,
      headerHeight: 52,
      hudHeight: 180,
    };

    it('preserves top of sheet paper on initial systems when comfortably visible', () => {
      // System 0 at top of sheet (top: 80, bottom: 200)
      const activeRect = { top: 80, bottom: 200, height: 120 };
      const nextRect = { top: 220, bottom: 340, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        nextRect,
        { isInitialOrTopSystem: true }
      );

      // Should NOT scroll away from 0 so title and top margin remain visible
      assert.equal(result.shouldScroll, false);
      assert.equal(result.targetScrollY, 0);
    });

    it('resets viewport to 0 on initial system if user was scrolled down (replay from top)', () => {
      // User was scrolled down at scrollY 400 when restarting from measure 0
      const scrolledViewport = {
        ...defaultViewport,
        currentScrollY: 400,
      };
      // Active system 0 is now way above viewport top
      const activeRect = { top: -320, bottom: -200, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        scrolledViewport,
        activeRect,
        null,
        { isInitialOrTopSystem: true }
      );

      assert.equal(result.shouldScroll, true);
      assert.equal(result.targetScrollY, 0);
      assert.equal(result.reason, 'out_of_safe_zone');
    });

    it('handles short single-system song (no nextSystemRect) safely', () => {
      // Short 1-measure song where nextSystemRect is null
      const activeRect = { top: 80, bottom: 200, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        null,
        { isInitialOrTopSystem: true }
      );

      assert.equal(result.shouldScroll, false);
      assert.equal(result.targetScrollY, 0);
    });

    it('smoothly scrolls active line into golden reading band when it overflows safe bottom', () => {
      // System playing down at bottom near HUD (top: 550, bottom: 670 > safeBottom 604)
      const activeRect = { top: 550, bottom: 670, height: 120 };
      const nextRect = { top: 680, bottom: 800, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        nextRect,
        { isInitialOrTopSystem: false }
      );

      assert.equal(result.shouldScroll, true);
      assert.equal(result.reason, 'out_of_safe_zone');
      // safeTop = 64, available = 540.
      // goldenAnchor = 64 + 540 * 0.28 = 215.2
      // targetScroll = 0 + 550 - 215.2 = 334.8 -> ~335
      assert.ok(result.targetScrollY > 320 && result.targetScrollY < 350);
    });

    it('triggers lookahead anticipatory scroll when upcoming system approaches safe bottom', () => {
      // Current system is safe (top: 400, bottom: 520 <= safeBottom 604)
      // BUT next system (bottom: 640 > safeBottom - 24 = 580) is hidden behind HUD
      const activeRect = { top: 400, bottom: 520, height: 120 };
      const nextRect = { top: 530, bottom: 650, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        nextRect,
        { isInitialOrTopSystem: false }
      );

      assert.equal(result.shouldScroll, true);
      assert.equal(result.reason, 'lookahead_next_system');
      // Moves active system up so next system becomes legible before notes sound!
      assert.ok(result.targetScrollY > 0);
    });

    it('strictly tests lookahead boundary precision (safeBottom - 24)', () => {
      // safeBottom = 604; safeBottom - 24 = 580
      // Place activeRect at top: 350 so its safe zone is fine, but targetScroll differs from 0
      const activeRect = { top: 350, bottom: 470, height: 120 };

      // Exactly at boundary (580) -> should NOT trigger
      const exactBoundaryRect = { top: 460, bottom: 580, height: 120 };
      const resExact = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        exactBoundaryRect,
        { isInitialOrTopSystem: false }
      );
      assert.equal(resExact.shouldScroll, false);

      // 1px past boundary (581) -> SHOULD trigger
      const pastBoundaryRect = { top: 461, bottom: 581, height: 120 };
      const resPast = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        pastBoundaryRect,
        { isInitialOrTopSystem: false }
      );
      assert.equal(resPast.shouldScroll, true);
      assert.equal(resPast.reason, 'lookahead_next_system');
    });

    it('handles extreme compact iPad viewports without negative or NaN heights', () => {
      const compactViewport = {
        viewportHeight: 350,
        currentScrollY: 0,
        headerHeight: 44,
        hudHeight: 160,
      };
      const activeRect = { top: 250, bottom: 340, height: 90 };

      const result = calculateVerticalPlaybackScroll(
        compactViewport,
        activeRect,
        null,
        { isInitialOrTopSystem: false }
      );

      assert.equal(result.shouldScroll, true);
      assert.ok(!Number.isNaN(result.targetScrollY));
      assert.ok(result.targetScrollY >= 0);
    });

    it('respects custom reading anchor ratio and custom jitter tolerance', () => {
      const activeRect = { top: 500, bottom: 620, height: 120 };
      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        null,
        {
          isInitialOrTopSystem: false,
          readingAnchorRatio: 0.5, // center safe zone (50%)
          tolerance: 50,
        }
      );

      assert.equal(result.shouldScroll, true);
      // center anchor = 64 + 540 * 0.5 = 334. target = 0 + 500 - 334 = 166
      assert.equal(result.targetScrollY, 166);
    });

    it('does not scroll when current position is within jitter tolerance', () => {
      const activeRect = { top: 215, bottom: 335, height: 120 };
      const nextRect = { top: 350, bottom: 470, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        nextRect,
        { isInitialOrTopSystem: false }
      );

      // Already comfortably anchored near 215
      assert.equal(result.shouldScroll, false);
    });

    it('directly positions next system when targetNextSystem is specified for anticipatory line cueing', () => {
      // Active system at top, upcoming next system is lower down at top: 600
      const activeRect = { top: 215, bottom: 335, height: 120 };
      const nextRect = { top: 600, bottom: 720, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        nextRect,
        { targetNextSystem: true }
      );

      assert.equal(result.shouldScroll, true);
      assert.equal(result.reason, 'lookahead_next_system');
      // Position next system at golden reading anchor (safeTop 64 + 540 * 0.28 = 215)
      // 0 + 600 - 215 = 385
      assert.equal(result.targetScrollY, 385);
    });

    it('ensures next system clears safeBottom even when active system is already at reading anchor', () => {
      // Active system is already perfectly anchored at 215
      // But next system bottom (620) overflows safeBottom (604) - 24 = 580
      const activeRect = { top: 215, bottom: 335, height: 120 };
      const nextRect = { top: 500, bottom: 620, height: 120 };

      const result = calculateVerticalPlaybackScroll(
        defaultViewport,
        activeRect,
        nextRect,
        { isInitialOrTopSystem: false }
      );

      assert.equal(result.shouldScroll, true);
      assert.equal(result.reason, 'lookahead_next_system');
      // Scroll amount must at least clear safeBottom - 24: 0 + (620 - 580) = 40
      assert.ok(result.targetScrollY >= 40);
    });
  });

  describe('calculateHorizontalPlaybackScroll', () => {
    it('anchors active measure at ~33% width giving ~67% lookahead ahead of playback', () => {
      const bounds = {
        wrapperWidth: 1000,
        currentScrollLeft: 0,
        containerLeft: 0,
      };

      // Measure 5 is currently at left: 600 (too far to the right)
      const measureRect = { left: 600, right: 750, width: 150 };

      const result = calculateHorizontalPlaybackScroll(bounds, measureRect);

      assert.equal(result.shouldScroll, true);
      // Target anchor is 1000 * 0.33 = 330.
      // Offset = 600 - 330 = 270.
      // Target scrollLeft = 270.
      assert.equal(result.targetScrollLeft, 270);
    });

    it('clamps horizontal scroll to 0 when active measure is near left boundary (no negative scroll)', () => {
      const bounds = {
        wrapperWidth: 1000,
        currentScrollLeft: 0,
        containerLeft: 0,
      };

      // Measure 1 is at left: 50 (to the left of anchor 330)
      const measureRect = { left: 50, right: 200, width: 150 };

      const result = calculateHorizontalPlaybackScroll(bounds, measureRect);

      // 0 + (50 - 330) = -280 -> clamped to 0. Since currentScrollLeft is 0, difference is 0 <= 12 tolerance
      assert.equal(result.shouldScroll, false);
      assert.equal(result.targetScrollLeft, 0);
    });

    it('does not scroll if active measure is already positioned near anchor within tolerance', () => {
      const bounds = {
        wrapperWidth: 1000,
        currentScrollLeft: 270,
        containerLeft: 0,
      };

      // Measure is at 605 in DOM -> 605 - 270 = 335 in viewport (anchor is 330, difference is 5 <= 12 tolerance)
      const measureRect = { left: 335, right: 485, width: 150 };

      const result = calculateHorizontalPlaybackScroll(bounds, measureRect);

      assert.equal(result.shouldScroll, false);
    });

    it('does not scroll horizontally when system fits entirely within wrapper width (maxContentWidth <= wrapperWidth)', () => {
      const bounds = {
        wrapperWidth: 1000,
        currentScrollLeft: 0,
        containerLeft: 0,
      };

      // Measure 3 in a 780px wide system: fits completely within 1000px wrapper
      const measureRect = { left: 520, right: 780, width: 260 };

      const result = calculateHorizontalPlaybackScroll(bounds, measureRect, {
        maxContentWidth: 780,
      });

      // System fits completely on screen: must NOT scroll right into empty void!
      assert.equal(result.shouldScroll, false);
      assert.equal(result.targetScrollLeft, 0);
    });

    it('returns targetScrollLeft = 0 immediately on explicit line return (isLineReturn: true)', () => {
      const bounds = {
        wrapperWidth: 1000,
        currentScrollLeft: 450, // Was scrolled far to the right from previous long line
        containerLeft: 0,
      };

      const measureRect = { left: 40, right: 190, width: 150 };

      const result = calculateHorizontalPlaybackScroll(bounds, measureRect, {
        isLineReturn: true,
      });

      assert.equal(result.shouldScroll, true);
      assert.equal(result.targetScrollLeft, 0);
    });

    it('clamps horizontal scroll to prevent over-scrolling past system right edge into empty space', () => {
      const bounds = {
        wrapperWidth: 800,
        currentScrollLeft: 0,
        containerLeft: 0,
      };

      // System is 1000px wide. Measure is near the end at left: 850
      const measureRect = { left: 850, right: 1000, width: 150 };

      const result = calculateHorizontalPlaybackScroll(bounds, measureRect, {
        maxContentWidth: 1000,
        containerPadding: 48,
      });

      assert.equal(result.shouldScroll, true);
      // maxAllowedScroll = 1000 - 800 + 48 = 248
      // Without clamping, 850 - 800*0.33 = 586 (which would show 338px of empty space!)
      // Clamped targetScrollLeft must be 248:
      assert.equal(result.targetScrollLeft, 248);
    });

    it('clamps scroll for the last measure in system so it does not push empty space onto the screen', () => {
      const bounds = {
        wrapperWidth: 800,
        currentScrollLeft: 0,
        containerLeft: 0,
      };

      // Last measure of a system ending at 850px
      const measureRect = { left: 600, right: 850, width: 250 };

      const result = calculateHorizontalPlaybackScroll(bounds, measureRect, {
        isLastMeasureInSystem: true,
      });

      assert.equal(result.shouldScroll, true);
      // maxScrollForLastMeasure = 850 - 800 + 32 = 82
      assert.equal(result.targetScrollLeft, 82);
    });
  });

  describe('Smooth Scroll Animation Utilities', () => {
    it('smoothScrollWindowTo returns a cancelable handle with requested target', () => {
      const handle = smoothScrollWindowTo(350, { duration: 280 });
      assert.equal(handle.target, 350);
      assert.equal(typeof handle.cancel, 'function');
      // Calling cancel should be safe
      handle.cancel();
    });

    it('smoothScrollElementTo handles target and cancellation cleanly', () => {
      const mockElement = { scrollLeft: 50 } as unknown as HTMLElement;
      const handle = smoothScrollElementTo(mockElement, 250, { duration: 280 });
      assert.equal(handle.target, 250);
      assert.equal(typeof handle.cancel, 'function');
      handle.cancel();
    });
  });

  describe('Universal Multi-System Playback Scroll Across Wrap Modes', () => {
    const viewport = {
      viewportHeight: 800,
      currentScrollY: 0,
      headerHeight: 52,
      hudHeight: 180,
    };

    it('produces identical vertical scroll targets for systems in no_wrap, auto_wrap, and auto_fit', () => {
      // Simulate System 2 at vertical position 650 (past safeBottom 604)
      const systemRect = { top: 650, bottom: 770, height: 120 };
      const nextSystemRect = { top: 790, bottom: 910, height: 120 };

      // In all wrap modes (no_wrap, auto_wrap, auto_fit), the system vertical layout uses the same engine
      const wrapModes = ['no_wrap', 'auto_wrap', 'auto_fit'] as const;
      const results = wrapModes.map(() =>
        calculateVerticalPlaybackScroll(viewport, systemRect, nextSystemRect, {
          isInitialOrTopSystem: false,
        })
      );

      // All wrap modes should agree on shouldScroll = true and identical targetScrollY
      assert.ok(results.every(r => r.shouldScroll === true));
      const firstTarget = results[0].targetScrollY;
      assert.ok(firstTarget > 400);
      assert.ok(results.every(r => r.targetScrollY === firstTarget));
    });

    it('correctly coordinates dual-axis scrolling when advancing from system 0 to system 1 in no_wrap mode', () => {
      // System 0 ends at measure 4, which had scrolled horizontally to scrollLeft 300
      const horizontalBounds = {
        wrapperWidth: 1000,
        currentScrollLeft: 300,
        containerLeft: 0,
      };

      // Transition to Measure 5 (first measure of System 1), located near left edge (left: 40px)
      // and vertically located at top: 580px (approaching safe bottom)
      const measure5HorizontalRect = { left: 40, right: 190, width: 150 };
      const system1VerticalRect = { top: 580, bottom: 700, height: 120 };

      // 1. Vertical calculation scrolls down to reveal System 1
      const verticalRes = calculateVerticalPlaybackScroll(viewport, system1VerticalRect, null, {
        isInitialOrTopSystem: false,
      });
      assert.equal(verticalRes.shouldScroll, true);
      assert.ok(verticalRes.targetScrollY > 300);

      // 2. Horizontal calculation scrolls wrapper back to left (from 300 down to 10) for Measure 5
      const horizontalRes = calculateHorizontalPlaybackScroll(horizontalBounds, measure5HorizontalRect);
      assert.equal(horizontalRes.shouldScroll, true);
      assert.equal(horizontalRes.targetScrollLeft, 10); // 300 + (40 - 330) = 10
    });
  });
});

