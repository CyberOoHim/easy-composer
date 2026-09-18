import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  CrossTabPlaybackCoordinator,
  type CrossTabMessage,
} from '../lib/crossTabPlayback.ts';
import {
  getStoredBackgroundPlaybackMode,
  setStoredBackgroundPlaybackMode,
  resetAllSettingsToDefault,
} from '../lib/storage.ts';

describe('Cross-Tab Audio Coordination & Background Playback', () => {
  const store: Record<string, string> = {};
  const mockLocalStorage = {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, val: string) => {
      store[key] = String(val);
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      Object.keys(store).forEach(k => delete store[k]);
    },
  };

  beforeEach(() => {
    mockLocalStorage.clear();
    (globalThis as any).window = {
      localStorage: mockLocalStorage,
      dispatchEvent: () => true,
      addEventListener: () => {},
      removeEventListener: () => {},
    };
    (globalThis as any).localStorage = mockLocalStorage;
  });

  afterEach(() => {
    delete (globalThis as any).window;
    delete (globalThis as any).localStorage;
  });

  describe('Storage persistence for Background Playback Mode', () => {
    it('defaults to "pause" if no stored preference exists', () => {
      assert.equal(getStoredBackgroundPlaybackMode(), 'pause');
    });

    it('persists and returns "continuous" mode', () => {
      setStoredBackgroundPlaybackMode('continuous');
      assert.equal(getStoredBackgroundPlaybackMode(), 'continuous');
    });

    it('persists and returns "pause" mode', () => {
      setStoredBackgroundPlaybackMode('continuous');
      setStoredBackgroundPlaybackMode('pause');
      assert.equal(getStoredBackgroundPlaybackMode(), 'pause');
    });

    it('resets background playback mode back to default in resetAllSettingsToDefault', () => {
      setStoredBackgroundPlaybackMode('continuous');
      assert.equal(getStoredBackgroundPlaybackMode(), 'continuous');
      resetAllSettingsToDefault();
      assert.equal(getStoredBackgroundPlaybackMode(), 'pause');
    });
  });

  describe('CrossTabPlaybackCoordinator lease arbitration', () => {
    it('creates coordinator with unique tab ID', () => {
      const c1 = new CrossTabPlaybackCoordinator();
      const c2 = new CrossTabPlaybackCoordinator();
      assert.ok(c1.tabId);
      assert.ok(c2.tabId);
      assert.notEqual(c1.tabId, c2.tabId);
      c1.destroy();
      c2.destroy();
    });

    it('claims lease and tracks master lease ownership', () => {
      const coordinator = new CrossTabPlaybackCoordinator();
      assert.equal(coordinator.isMaster(), false);

      coordinator.claimPlaybackLease('Test Song');
      assert.equal(coordinator.isMaster(), true);

      coordinator.releasePlaybackLease();
      assert.equal(coordinator.isMaster(), false);
      coordinator.destroy();
    });

    it('notifies subscribers when a remote tab claims playback', () => {
      const coordinator = new CrossTabPlaybackCoordinator();
      coordinator.claimPlaybackLease('Tab 1 Song');
      assert.equal(coordinator.isMaster(), true);

      let receivedMsg: CrossTabMessage | null = null;
      const unsub = coordinator.subscribe(msg => {
        receivedMsg = msg;
      });

      // Simulate an incoming CLAIM_PLAYBACK message from a remote tab
      const remoteClaim: CrossTabMessage = {
        type: 'CLAIM_PLAYBACK',
        tabId: 'remote-tab-999',
        songTitle: 'Tab 2 Song',
        timestamp: Date.now(),
      };

      (coordinator as any).handleIncomingMessage(remoteClaim);

      assert.ok(receivedMsg);
      assert.equal((receivedMsg as CrossTabMessage).type, 'CLAIM_PLAYBACK');
      assert.equal((receivedMsg as CrossTabMessage).tabId, 'remote-tab-999');
      assert.equal((receivedMsg as CrossTabMessage).songTitle, 'Tab 2 Song');
      assert.equal(coordinator.isMaster(), false);

      unsub();
      coordinator.destroy();
    });

    it('ignores messages sent by itself', () => {
      const coordinator = new CrossTabPlaybackCoordinator();
      coordinator.claimPlaybackLease('Own Song');

      let msgFired = false;
      coordinator.subscribe(() => {
        msgFired = true;
      });

      // Claim from same tab ID
      const ownClaim: CrossTabMessage = {
        type: 'CLAIM_PLAYBACK',
        tabId: coordinator.tabId,
        songTitle: 'Own Song',
        timestamp: Date.now(),
      };

      (coordinator as any).handleIncomingMessage(ownClaim);

      assert.equal(msgFired, false);
      assert.equal(coordinator.isMaster(), true);
      coordinator.destroy();
    });

    it('tracks remote playback state on HEARTBEAT and clears on RELEASE_PLAYBACK', () => {
      const coordinator = new CrossTabPlaybackCoordinator();

      // Remote tab claims
      (coordinator as any).handleIncomingMessage({
        type: 'CLAIM_PLAYBACK',
        tabId: 'remote-tab-abc',
        songTitle: 'Su-ki-hong',
        timestamp: Date.now(),
      });

      let state = coordinator.getRemotePlaybackState();
      assert.equal(state.isRemotePlaying, true);
      assert.equal(state.remoteTabId, 'remote-tab-abc');
      assert.equal(state.remoteSongTitle, 'Su-ki-hong');

      // Remote tab releases
      (coordinator as any).handleIncomingMessage({
        type: 'RELEASE_PLAYBACK',
        tabId: 'remote-tab-abc',
        timestamp: Date.now(),
      });

      state = coordinator.getRemotePlaybackState();
      assert.equal(state.isRemotePlaying, false);

      coordinator.destroy();
    });
  });
});
