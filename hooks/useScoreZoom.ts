'use client';

import { useSyncExternalStore, useCallback, useEffect } from 'react';
import {
  STORAGE_KEYS,
  NOTE_ZOOM_EVENT,
  LYRIC_ZOOM_EVENT,
  SETTINGS_RESET_EVENT,
  getStoredNoteZoom,
  setStoredNoteZoom,
  getStoredLyricZoom,
  setStoredLyricZoom,
} from '@/lib/storage';

export const SCORE_ZOOM_LEVELS = [0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8] as const;
export const SCORE_ZOOM_MIN = 0.7;
export const SCORE_ZOOM_MAX = 1.8;
export const SCORE_ZOOM_DEFAULT = 1.0;

let memoryNoteZoom: number = SCORE_ZOOM_DEFAULT;
let memoryLyricZoom: number = SCORE_ZOOM_DEFAULT;
let hasInitialized = false;

const noteListeners = new Set<() => void>();
const lyricListeners = new Set<() => void>();

function notifyNote() {
  noteListeners.forEach(l => {
    try {
      l();
    } catch (err) {
      console.error('[useScoreZoom] Note listener error:', err);
    }
  });
}

function notifyLyric() {
  lyricListeners.forEach(l => {
    try {
      l();
    } catch (err) {
      console.error('[useScoreZoom] Lyric listener error:', err);
    }
  });
}

export function applyNoteZoomToDOM(zoom: number) {
  if (typeof document === 'undefined') return;
  const roundedPercent = Math.round(zoom * 100);
  document.documentElement.style.setProperty('--note-zoom', String(zoom));
  document.documentElement.setAttribute('data-note-zoom', String(roundedPercent));
}

export function applyLyricZoomToDOM(zoom: number) {
  if (typeof document === 'undefined') return;
  const roundedPercent = Math.round(zoom * 100);
  document.documentElement.style.setProperty('--lyric-zoom', String(zoom));
  document.documentElement.setAttribute('data-lyric-zoom', String(roundedPercent));
}

function initMemoryScoreZooms() {
  if (hasInitialized || typeof window === 'undefined') return;
  hasInitialized = true;

  memoryNoteZoom = getStoredNoteZoom(SCORE_ZOOM_DEFAULT);
  memoryLyricZoom = getStoredLyricZoom(SCORE_ZOOM_DEFAULT);

  const apply = () => {
    applyNoteZoomToDOM(memoryNoteZoom);
    applyLyricZoomToDOM(memoryLyricZoom);
  };

  if (typeof requestAnimationFrame !== 'undefined') {
    requestAnimationFrame(apply);
  } else {
    setTimeout(apply, 0);
  }

  // Cross-tab storage synchronization
  window.addEventListener('storage', (e: StorageEvent) => {
    if (e.key === STORAGE_KEYS.NOTE_ZOOM && e.newValue) {
      const val = parseFloat(e.newValue);
      if (!isNaN(val) && val >= SCORE_ZOOM_MIN && val <= SCORE_ZOOM_MAX) {
        const clamped = Math.round(val * 10) / 10;
        if (memoryNoteZoom !== clamped) {
          memoryNoteZoom = clamped;
          applyNoteZoomToDOM(clamped);
          notifyNote();
        }
      }
    } else if (e.key === STORAGE_KEYS.LYRIC_ZOOM && e.newValue) {
      const val = parseFloat(e.newValue);
      if (!isNaN(val) && val >= SCORE_ZOOM_MIN && val <= SCORE_ZOOM_MAX) {
        const clamped = Math.round(val * 10) / 10;
        if (memoryLyricZoom !== clamped) {
          memoryLyricZoom = clamped;
          applyLyricZoomToDOM(clamped);
          notifyLyric();
        }
      }
    }
  });

  // Settings reset synchronization
  window.addEventListener(SETTINGS_RESET_EVENT, () => {
    memoryNoteZoom = SCORE_ZOOM_DEFAULT;
    memoryLyricZoom = SCORE_ZOOM_DEFAULT;
    applyNoteZoomToDOM(SCORE_ZOOM_DEFAULT);
    applyLyricZoomToDOM(SCORE_ZOOM_DEFAULT);
    notifyNote();
    notifyLyric();
  });

  // Event synchronization
  window.addEventListener(NOTE_ZOOM_EVENT, (e: Event) => {
    const ce = e as CustomEvent<{ zoom: number }>;
    if (ce.detail && typeof ce.detail.zoom === 'number') {
      const next = Math.round(ce.detail.zoom * 10) / 10;
      if (memoryNoteZoom !== next) {
        memoryNoteZoom = next;
        applyNoteZoomToDOM(next);
        notifyNote();
      }
    }
  });

  window.addEventListener(LYRIC_ZOOM_EVENT, (e: Event) => {
    const ce = e as CustomEvent<{ zoom: number }>;
    if (ce.detail && typeof ce.detail.zoom === 'number') {
      const next = Math.round(ce.detail.zoom * 10) / 10;
      if (memoryLyricZoom !== next) {
        memoryLyricZoom = next;
        applyLyricZoomToDOM(next);
        notifyLyric();
      }
    }
  });
}

export function setNoteZoomGlobal(newZoom: number) {
  const clamped = Math.min(SCORE_ZOOM_MAX, Math.max(SCORE_ZOOM_MIN, Math.round(newZoom * 10) / 10));
  if (memoryNoteZoom === clamped) return;
  memoryNoteZoom = clamped;
  setStoredNoteZoom(clamped);
  applyNoteZoomToDOM(clamped);
  notifyNote();
}

export function setLyricZoomGlobal(newZoom: number) {
  const clamped = Math.min(SCORE_ZOOM_MAX, Math.max(SCORE_ZOOM_MIN, Math.round(newZoom * 10) / 10));
  if (memoryLyricZoom === clamped) return;
  memoryLyricZoom = clamped;
  setStoredLyricZoom(clamped);
  applyLyricZoomToDOM(clamped);
  notifyLyric();
}

function subscribeNote(callback: () => void) {
  initMemoryScoreZooms();
  noteListeners.add(callback);
  return () => {
    noteListeners.delete(callback);
  };
}

function getSnapshotNote(): number {
  initMemoryScoreZooms();
  return memoryNoteZoom;
}

function getServerSnapshot(): number {
  return SCORE_ZOOM_DEFAULT;
}

function subscribeLyric(callback: () => void) {
  initMemoryScoreZooms();
  lyricListeners.add(callback);
  return () => {
    lyricListeners.delete(callback);
  };
}

function getSnapshotLyric(): number {
  initMemoryScoreZooms();
  return memoryLyricZoom;
}

/**
 * Hook for managing Note Zoom state independently
 */
export function useNoteZoom() {
  const zoom = useSyncExternalStore(subscribeNote, getSnapshotNote, getServerSnapshot);

  const zoomIn = useCallback(() => {
    const current = Math.round(zoom * 10) / 10;
    const next = Math.min(SCORE_ZOOM_MAX, Math.round((current + 0.1) * 10) / 10);
    setNoteZoomGlobal(next);
  }, [zoom]);

  const zoomOut = useCallback(() => {
    const current = Math.round(zoom * 10) / 10;
    const prev = Math.max(SCORE_ZOOM_MIN, Math.round((current - 0.1) * 10) / 10);
    setNoteZoomGlobal(prev);
  }, [zoom]);

  const resetZoom = useCallback(() => {
    setNoteZoomGlobal(SCORE_ZOOM_DEFAULT);
  }, []);

  const setZoom = useCallback((val: number) => {
    setNoteZoomGlobal(val);
  }, []);

  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < SCORE_ZOOM_MAX;
  const canZoomOut = zoom > SCORE_ZOOM_MIN;

  return {
    zoom,
    zoomPercent,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    canZoomIn,
    canZoomOut,
  };
}

/**
 * Hook for managing Lyric Zoom state independently
 */
export function useLyricZoom() {
  const zoom = useSyncExternalStore(subscribeLyric, getSnapshotLyric, getServerSnapshot);

  const zoomIn = useCallback(() => {
    const current = Math.round(zoom * 10) / 10;
    const next = Math.min(SCORE_ZOOM_MAX, Math.round((current + 0.1) * 10) / 10);
    setLyricZoomGlobal(next);
  }, [zoom]);

  const zoomOut = useCallback(() => {
    const current = Math.round(zoom * 10) / 10;
    const prev = Math.max(SCORE_ZOOM_MIN, Math.round((current - 0.1) * 10) / 10);
    setLyricZoomGlobal(prev);
  }, [zoom]);

  const resetZoom = useCallback(() => {
    setLyricZoomGlobal(SCORE_ZOOM_DEFAULT);
  }, []);

  const setZoom = useCallback((val: number) => {
    setLyricZoomGlobal(val);
  }, []);

  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < SCORE_ZOOM_MAX;
  const canZoomOut = zoom > SCORE_ZOOM_MIN;

  return {
    zoom,
    zoomPercent,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoom,
    canZoomIn,
    canZoomOut,
  };
}

/**
 * Combined hook returning both noteZoom and lyricZoom controllers
 */
export function useScoreZoom() {
  const note = useNoteZoom();
  const lyric = useLyricZoom();

  return {
    noteZoom: note.zoom,
    notePercent: note.zoomPercent,
    zoomInNote: note.zoomIn,
    zoomOutNote: note.zoomOut,
    resetNoteZoom: note.resetZoom,
    canZoomInNote: note.canZoomIn,
    canZoomOutNote: note.canZoomOut,

    lyricZoom: lyric.zoom,
    lyricPercent: lyric.zoomPercent,
    zoomInLyric: lyric.zoomIn,
    zoomOutLyric: lyric.zoomOut,
    resetLyricZoom: lyric.resetZoom,
    canZoomInLyric: lyric.canZoomIn,
    canZoomOutLyric: lyric.canZoomOut,
  };
}
