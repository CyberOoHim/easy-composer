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

export const NOTE_ZOOM_MIN = 0.7;
export const NOTE_ZOOM_MAX = 2.0;
export const NOTE_ZOOM_DEFAULT = 1.0;
export const NOTE_ZOOM_STEP = 0.05;

export const LYRIC_ZOOM_MIN = 0.7;
export const LYRIC_ZOOM_MAX = 1.8;
export const LYRIC_ZOOM_DEFAULT = 1.0;
export const LYRIC_ZOOM_STEP = 0.05;

// Backward-compatible generic score zoom constants
export const SCORE_ZOOM_MIN = 0.7;
export const SCORE_ZOOM_MAX = 2.0;
export const SCORE_ZOOM_DEFAULT = 1.0;
export const SCORE_ZOOM_LEVELS = [0.7, 0.75, 0.8, 0.85, 0.9, 0.95, 1.0, 1.05, 1.1, 1.15, 1.2, 1.25, 1.3, 1.35, 1.4, 1.45, 1.5, 1.55, 1.6, 1.65, 1.7, 1.75, 1.8, 1.85, 1.9, 1.95, 2.0] as const;

let memoryNoteZoom: number = NOTE_ZOOM_DEFAULT;
let memoryLyricZoom: number = LYRIC_ZOOM_DEFAULT;
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
  const effectiveScale = Number((zoom * 1.2).toFixed(4));
  const roundedPercent = Math.round(zoom * 100);
  document.documentElement.style.setProperty('--lyric-zoom', String(effectiveScale));
  document.documentElement.setAttribute('data-lyric-zoom', String(roundedPercent));
}

function initMemoryScoreZooms() {
  if (hasInitialized || typeof window === 'undefined') return;
  hasInitialized = true;

  memoryNoteZoom = getStoredNoteZoom(NOTE_ZOOM_DEFAULT);
  memoryLyricZoom = getStoredLyricZoom(LYRIC_ZOOM_DEFAULT);

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
      if (!isNaN(val) && val >= NOTE_ZOOM_MIN && val <= NOTE_ZOOM_MAX) {
        const clamped = Math.round(val * 100) / 100;
        if (memoryNoteZoom !== clamped) {
          memoryNoteZoom = clamped;
          applyNoteZoomToDOM(clamped);
          notifyNote();
        }
      }
    } else if (e.key === STORAGE_KEYS.LYRIC_ZOOM && e.newValue) {
      const val = parseFloat(e.newValue);
      if (!isNaN(val) && val >= LYRIC_ZOOM_MIN && val <= LYRIC_ZOOM_MAX) {
        const clamped = Math.round(val * 100) / 100;
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
    memoryNoteZoom = NOTE_ZOOM_DEFAULT;
    memoryLyricZoom = LYRIC_ZOOM_DEFAULT;
    applyNoteZoomToDOM(NOTE_ZOOM_DEFAULT);
    applyLyricZoomToDOM(LYRIC_ZOOM_DEFAULT);
    notifyNote();
    notifyLyric();
  });

  // Event synchronization
  window.addEventListener(NOTE_ZOOM_EVENT, (e: Event) => {
    const ce = e as CustomEvent<{ zoom: number }>;
    if (ce.detail && typeof ce.detail.zoom === 'number') {
      const next = Math.round(ce.detail.zoom * 100) / 100;
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
      const next = Math.round(ce.detail.zoom * 100) / 100;
      if (memoryLyricZoom !== next) {
        memoryLyricZoom = next;
        applyLyricZoomToDOM(next);
        notifyLyric();
      }
    }
  });
}

export function setNoteZoomGlobal(newZoom: number) {
  const clamped = Math.min(NOTE_ZOOM_MAX, Math.max(NOTE_ZOOM_MIN, Math.round(newZoom * 100) / 100));
  if (memoryNoteZoom === clamped) return;
  memoryNoteZoom = clamped;
  setStoredNoteZoom(clamped);
  applyNoteZoomToDOM(clamped);
  notifyNote();
}

export function setLyricZoomGlobal(newZoom: number) {
  const clamped = Math.min(LYRIC_ZOOM_MAX, Math.max(LYRIC_ZOOM_MIN, Math.round(newZoom * 100) / 100));
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

function getServerSnapshotNote(): number {
  return NOTE_ZOOM_DEFAULT;
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

function getServerSnapshotLyric(): number {
  return LYRIC_ZOOM_DEFAULT;
}

/**
 * Hook for managing Note Zoom state independently
 */
export function useNoteZoom() {
  const zoom = useSyncExternalStore(subscribeNote, getSnapshotNote, getServerSnapshotNote);

  const zoomIn = useCallback(() => {
    const current = Math.round(zoom * 100) / 100;
    const next = Math.min(NOTE_ZOOM_MAX, Math.round((current + NOTE_ZOOM_STEP) * 100) / 100);
    setNoteZoomGlobal(next);
  }, [zoom]);

  const zoomOut = useCallback(() => {
    const current = Math.round(zoom * 100) / 100;
    const prev = Math.max(NOTE_ZOOM_MIN, Math.round((current - NOTE_ZOOM_STEP) * 100) / 100);
    setNoteZoomGlobal(prev);
  }, [zoom]);

  const resetZoom = useCallback(() => {
    setNoteZoomGlobal(NOTE_ZOOM_DEFAULT);
  }, []);

  const setZoom = useCallback((val: number) => {
    setNoteZoomGlobal(val);
  }, []);

  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < NOTE_ZOOM_MAX - 0.005;
  const canZoomOut = zoom > NOTE_ZOOM_MIN + 0.005;

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
  const zoom = useSyncExternalStore(subscribeLyric, getSnapshotLyric, getServerSnapshotLyric);

  const zoomIn = useCallback(() => {
    const current = Math.round(zoom * 100) / 100;
    const next = Math.min(LYRIC_ZOOM_MAX, Math.round((current + LYRIC_ZOOM_STEP) * 100) / 100);
    setLyricZoomGlobal(next);
  }, [zoom]);

  const zoomOut = useCallback(() => {
    const current = Math.round(zoom * 100) / 100;
    const prev = Math.max(LYRIC_ZOOM_MIN, Math.round((current - LYRIC_ZOOM_STEP) * 100) / 100);
    setLyricZoomGlobal(prev);
  }, [zoom]);

  const resetZoom = useCallback(() => {
    setLyricZoomGlobal(LYRIC_ZOOM_DEFAULT);
  }, []);

  const setZoom = useCallback((val: number) => {
    setLyricZoomGlobal(val);
  }, []);

  const zoomPercent = Math.round(zoom * 100);
  const canZoomIn = zoom < LYRIC_ZOOM_MAX - 0.005;
  const canZoomOut = zoom > LYRIC_ZOOM_MIN + 0.005;

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
