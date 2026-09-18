'use client';

/**
 * Cross-Tab Playback Coordinator
 *
 * Ensures only one browser tab plays audio at a time, preventing discordant audio collisions
 * when the DAW is open in multiple tabs or windows.
 *
 * Uses BroadcastChannel with a resilient localStorage fallback for sandboxed or older browsers.
 */

export interface RemotePlaybackInfo {
  isRemotePlaying: boolean;
  remoteTabId?: string;
  remoteSongTitle?: string;
  lastHeartbeatTime?: number;
}

export type CrossTabMessageType =
  | 'CLAIM_PLAYBACK'
  | 'HEARTBEAT'
  | 'RELEASE_PLAYBACK'
  | 'SONG_SAVED';

export interface CrossTabMessage {
  type: CrossTabMessageType;
  tabId: string;
  songTitle?: string;
  songId?: string;
  timestamp: number;
}

const CHANNEL_NAME = 'taigi_audio_cross_tab_v1';
const STORAGE_SYNC_KEY = 'taigi_cross_tab_msg_v1';
const HEARTBEAT_TIMEOUT_MS = 3800; // Consider remote tab dead if no heartbeat for 3.8s

export class CrossTabPlaybackCoordinator {
  public readonly tabId: string;
  private channel: BroadcastChannel | null = null;
  private listeners = new Set<(msg: CrossTabMessage) => void>();
  private remoteState: RemotePlaybackInfo = { isRemotePlaying: false };
  private heartbeatWatchdogTimer: ReturnType<typeof setInterval> | null = null;
  private localHeartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private isMasterOfLease = false;
  private currentMasterSongTitle = '';

  constructor() {
    this.tabId = this.generateTabId();
    if (typeof window !== 'undefined') {
      this.initChannel();
      this.startWatchdog();
    }
  }

  private generateTabId(): string {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substring(2, 9);
  }

  private initChannel() {
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.channel = new BroadcastChannel(CHANNEL_NAME);
        this.channel.onmessage = (event: MessageEvent) => {
          this.handleIncomingMessage(event.data);
        };
      } catch (err) {
        console.warn('[CrossTabPlayback] BroadcastChannel unavailable, using storage fallback:', err);
        this.channel = null;
      }
    }

    // Storage event fallback for older browsers or sandboxed iframes
    if (typeof window !== 'undefined') {
      window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === STORAGE_SYNC_KEY && e.newValue) {
          try {
            const data = JSON.parse(e.newValue) as CrossTabMessage;
            this.handleIncomingMessage(data);
          } catch {
            // ignore malformed storage payload
          }
        }
      });

      // Release lease on tab unload / close
      window.addEventListener('beforeunload', () => {
        if (this.isMasterOfLease) {
          this.releasePlaybackLease();
        }
      });
    }
  }

  private broadcast(msg: CrossTabMessage) {
    if (this.channel) {
      try {
        this.channel.postMessage(msg);
      } catch (err) {
        console.warn('[CrossTabPlayback] postMessage failed:', err);
      }
    }

    if (typeof window !== 'undefined') {
      try {
        // Set timestamp in value to guarantee storage event triggers across tabs
        localStorage.setItem(STORAGE_SYNC_KEY, JSON.stringify(msg));
      } catch {
        // storage quota or blocked
      }
    }
  }

  private handleIncomingMessage(msg: CrossTabMessage) {
    if (!msg || typeof msg !== 'object' || msg.tabId === this.tabId) {
      return; // Ignore messages sent by self
    }

    switch (msg.type) {
      case 'CLAIM_PLAYBACK': {
        this.isMasterOfLease = false;
        this.stopLocalHeartbeat();
        this.remoteState = {
          isRemotePlaying: true,
          remoteTabId: msg.tabId,
          remoteSongTitle: msg.songTitle,
          lastHeartbeatTime: Date.now(),
        };
        this.notifyListeners(msg);
        break;
      }

      case 'HEARTBEAT': {
        if (this.remoteState.isRemotePlaying && this.remoteState.remoteTabId === msg.tabId) {
          this.remoteState.lastHeartbeatTime = Date.now();
          if (msg.songTitle) {
            this.remoteState.remoteSongTitle = msg.songTitle;
          }
        } else if (!this.isMasterOfLease) {
          // Discovered an active playing tab
          this.remoteState = {
            isRemotePlaying: true,
            remoteTabId: msg.tabId,
            remoteSongTitle: msg.songTitle,
            lastHeartbeatTime: Date.now(),
          };
          this.notifyListeners(msg);
        }
        break;
      }

      case 'RELEASE_PLAYBACK': {
        if (this.remoteState.remoteTabId === msg.tabId) {
          this.remoteState = { isRemotePlaying: false };
          this.notifyListeners(msg);
        }
        break;
      }

      case 'SONG_SAVED': {
        this.notifyListeners(msg);
        break;
      }
    }
  }

  private startWatchdog() {
    if (this.heartbeatWatchdogTimer) clearInterval(this.heartbeatWatchdogTimer);
    this.heartbeatWatchdogTimer = setInterval(() => {
      if (this.remoteState.isRemotePlaying && this.remoteState.lastHeartbeatTime) {
        const elapsed = Date.now() - this.remoteState.lastHeartbeatTime;
        if (elapsed > HEARTBEAT_TIMEOUT_MS) {
          // Remote tab closed or stopped silently
          this.remoteState = { isRemotePlaying: false };
          this.notifyListeners({
            type: 'RELEASE_PLAYBACK',
            tabId: this.remoteState.remoteTabId || '',
            timestamp: Date.now(),
          });
        }
      }
    }, 1500);
  }

  private startLocalHeartbeat() {
    this.stopLocalHeartbeat();
    this.localHeartbeatTimer = setInterval(() => {
      if (this.isMasterOfLease) {
        this.broadcast({
          type: 'HEARTBEAT',
          tabId: this.tabId,
          songTitle: this.currentMasterSongTitle,
          timestamp: Date.now(),
        });
      }
    }, 1200);
  }

  private stopLocalHeartbeat() {
    if (this.localHeartbeatTimer) {
      clearInterval(this.localHeartbeatTimer);
      this.localHeartbeatTimer = null;
    }
  }

  private notifyListeners(msg: CrossTabMessage) {
    this.listeners.forEach(listener => {
      try {
        listener(msg);
      } catch (err) {
        console.error('[CrossTabPlayback] listener error:', err);
      }
    });
  }

  /**
   * Claim playback master lease for this tab.
   * If other tabs are currently playing, they will be preempted.
   */
  public claimPlaybackLease(songTitle: string = '') {
    this.isMasterOfLease = true;
    this.currentMasterSongTitle = songTitle;
    this.remoteState = { isRemotePlaying: false };

    this.broadcast({
      type: 'CLAIM_PLAYBACK',
      tabId: this.tabId,
      songTitle,
      timestamp: Date.now(),
    });

    this.startLocalHeartbeat();
  }

  /**
   * Release playback master lease (e.g. paused, stopped, or song finished).
   */
  public releasePlaybackLease() {
    if (!this.isMasterOfLease) return;
    this.isMasterOfLease = false;
    this.stopLocalHeartbeat();

    this.broadcast({
      type: 'RELEASE_PLAYBACK',
      tabId: this.tabId,
      timestamp: Date.now(),
    });
  }

  /**
   * Notify other open tabs that a song was saved so they can prompt or reload
   */
  public broadcastSongSaved(songTitle: string, songId?: string) {
    this.broadcast({
      type: 'SONG_SAVED',
      tabId: this.tabId,
      songTitle,
      songId,
      timestamp: Date.now(),
    });
  }

  /**
   * Subscribe to incoming cross-tab messages
   */
  public subscribe(listener: (msg: CrossTabMessage) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public getRemotePlaybackState(): RemotePlaybackInfo {
    return { ...this.remoteState };
  }

  public isMaster(): boolean {
    return this.isMasterOfLease;
  }

  public destroy() {
    this.stopLocalHeartbeat();
    if (this.heartbeatWatchdogTimer) {
      clearInterval(this.heartbeatWatchdogTimer);
      this.heartbeatWatchdogTimer = null;
    }
    if (this.channel) {
      try {
        this.channel.close();
      } catch {}
      this.channel = null;
    }
    this.listeners.clear();
  }
}

export const crossTabCoordinator = new CrossTabPlaybackCoordinator();
