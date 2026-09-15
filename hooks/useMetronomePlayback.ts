'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getStoredMetronomeEnabled,
  setStoredMetronomeEnabled,
  getStoredMetronomeVolume,
  setStoredMetronomeVolume,
  METRONOME_SETTINGS_EVENT,
  STORAGE_KEYS,
} from '@/lib/storage';
import { audioEngine } from '@/lib/audioEngine';

export function useMetronomePlayback() {
  const [metronomeEnabled, setMetronomeEnabledState] = useState<boolean>(() => {
    return getStoredMetronomeEnabled(true);
  });

  const [metronomeVolume, setMetronomeVolumeState] = useState<number>(() => {
    return getStoredMetronomeVolume(0.45);
  });

  // Ensure AudioEngine options stay synchronized initially
  useEffect(() => {
    audioEngine.setOptions({
      metronomeEnabled,
      metronomeVolume,
    });
  }, [metronomeEnabled, metronomeVolume]);

  const updateMetronomeEnabled = useCallback((enabled: boolean) => {
    setMetronomeEnabledState(enabled);
    setStoredMetronomeEnabled(enabled);
    audioEngine.setOptions({ metronomeEnabled: enabled });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(METRONOME_SETTINGS_EVENT, {
          detail: { metronomeEnabled: enabled, metronomeVolume },
        })
      );
    }
  }, [metronomeVolume]);

  const toggleMetronomeEnabled = useCallback(() => {
    updateMetronomeEnabled(!metronomeEnabled);
  }, [metronomeEnabled, updateMetronomeEnabled]);

  const updateMetronomeVolume = useCallback((vol: number) => {
    const clamped = Math.max(0, Math.min(1, vol));
    setMetronomeVolumeState(clamped);
    setStoredMetronomeVolume(clamped);
    audioEngine.setOptions({ metronomeVolume: clamped });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(METRONOME_SETTINGS_EVENT, {
          detail: { metronomeEnabled, metronomeVolume: clamped },
        })
      );
    }
  }, [metronomeEnabled]);

  // Synchronize across components in the same window and across browser tabs
  useEffect(() => {
    const handleCustomChange = (e: Event) => {
      const customEvent = e as CustomEvent<{ metronomeEnabled?: boolean; metronomeVolume?: number }>;
      if (customEvent.detail) {
        if (typeof customEvent.detail.metronomeEnabled === 'boolean') {
          setMetronomeEnabledState(customEvent.detail.metronomeEnabled);
        }
        if (typeof customEvent.detail.metronomeVolume === 'number') {
          setMetronomeVolumeState(customEvent.detail.metronomeVolume);
        }
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.METRONOME_ENABLED && e.newValue !== null) {
        const enabled = e.newValue === 'true';
        setMetronomeEnabledState(enabled);
        audioEngine.setOptions({ metronomeEnabled: enabled });
      } else if (e.key === STORAGE_KEYS.METRONOME_VOLUME && e.newValue !== null) {
        const num = parseFloat(e.newValue);
        if (!isNaN(num)) {
          setMetronomeVolumeState(num);
          audioEngine.setOptions({ metronomeVolume: num });
        }
      }
    };

    window.addEventListener(METRONOME_SETTINGS_EVENT, handleCustomChange);
    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener(METRONOME_SETTINGS_EVENT, handleCustomChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  return {
    metronomeEnabled,
    metronomeVolume,
    setMetronomeEnabled: updateMetronomeEnabled,
    toggleMetronomeEnabled,
    setMetronomeVolume: updateMetronomeVolume,
  };
}
