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
  });
});
