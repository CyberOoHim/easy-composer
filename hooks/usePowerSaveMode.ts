'use client';

import { useEffect, useCallback, useSyncExternalStore } from 'react';

const STORAGE_KEY = 'taigi_composer_power_save_mode';
const ECO_MODE_EVENT = 'taigi_composer_eco_mode_change';

function getEcoModeSnapshot(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) {
      return saved === 'true';
    }
    return false;
  } catch {
    return false;
  }
}

function getEcoModeServerSnapshot(): boolean {
  return false;
}

function subscribeEcoMode(callback: () => void) {
  window.addEventListener('storage', callback);
  window.addEventListener(ECO_MODE_EVENT, callback);

  return () => {
    window.removeEventListener('storage', callback);
    window.removeEventListener(ECO_MODE_EVENT, callback);
  };
}

/**
 * iPad Dedicated Power Saving Hook
 * Manages Eco Mode to reduce GPU compositor load and cut WebKit battery consumption.
 * Automatically handles visibility changes to pause heavy renders when switching apps on iPad.
 */
export function usePowerSaveMode() {
  const isEcoMode = useSyncExternalStore(
    subscribeEcoMode,
    getEcoModeSnapshot,
    getEcoModeServerSnapshot
  );

  // Synchronize .eco-mode class on document element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (isEcoMode) {
        document.documentElement.classList.add('eco-mode');
      } else {
        document.documentElement.classList.remove('eco-mode');
      }
    }
  }, [isEcoMode]);

  // iPad Background App Switch & Visibility Handling for power saving
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const handleVisibility = () => {
      if (document.hidden) {
        // When iPad app is backgrounded or tab switched, ensure eco class is applied to pause CSS animations
        document.documentElement.classList.add('eco-mode');
      } else if (!isEcoMode) {
        document.documentElement.classList.remove('eco-mode');
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleVisibility);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleVisibility);
    };
  }, [isEcoMode]);

  const setEcoMode = useCallback((val: boolean) => {
    try {
      localStorage.setItem(STORAGE_KEY, String(val));
      window.dispatchEvent(new Event(ECO_MODE_EVENT));
    } catch {
      // ignore
    }
  }, []);

  const toggleEcoMode = useCallback(() => {
    const current = getEcoModeSnapshot();
    setEcoMode(!current);
  }, [setEcoMode]);

  return {
    isEcoMode,
    toggleEcoMode,
    setEcoMode,
    batteryLevel: null,
    isCharging: null,
    isLowBattery: false,
    batterySupported: false,
  };
}

