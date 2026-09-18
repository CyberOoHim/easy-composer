'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { LyricDisplayMode, Song, InstrumentType } from '@/types/song';
import { PRESET_SONGS, createFreshSong } from '@/lib/presets';
import { audioEngine } from '@/lib/audioEngine';
import { wakeLockManager } from '@/lib/wakeLock';
import { HeaderBar } from '@/components/HeaderBar';
import { ComposerEditor } from '@/components/ComposerEditor';
import { ImportExportModal } from '@/components/ImportExportModal';
import { QuickLyricAlignerModal } from '@/components/QuickLyricAlignerModal';
import { LyricSearchModal } from '@/components/LyricSearchModal';
import { NewSongModal } from '@/components/NewSongModal';
import { useSongHistory } from '@/hooks/useSongHistory';
import { usePowerSaveMode } from '@/hooks/usePowerSaveMode';
import { useChordPlayback } from '@/hooks/useChordPlayback';
import { useMetronomePlayback } from '@/hooks/useMetronomePlayback';
import {
  getStoredDisplayMode,
  setStoredDisplayMode,
  getStoredCurrentSong,
  getStoredCurrentSongOrNull,
  setStoredCurrentSong,
  saveSongToCustomLibrary,
  getStoredAutosaveInterval,
  setStoredAutosaveInterval,
  getStoredInstrument,
  setStoredInstrument,
  resetAllSettingsToDefault,
  STORAGE_KEYS,
} from '@/lib/storage';
import {
  saveSongToDB,
  getSongFromDB,
  getCustomSongsFromDB,
  getModifiedPresetIds,
  resetPresetToFactory,
  resetAllPresetsToFactory,
  saveActiveSongToDB,
  getActiveSongFromDB,
  migrateLocalStorageToDB,
  isSongModifiedFromPreset,
  isStoredPresetOverride,
  pickBootstrapSong,
} from '@/lib/indexedDb';
import { setUiZoomGlobal } from '@/hooks/useUiZoom';
import { sanitizeSong } from '@/lib/songParser';

export default function Home() {
  const {
    song,
    cursor,
    setCursor,
    setSong,
    loadNewSong,
    undo,
    redo,
    canUndo,
    canRedo,
    pastCount,
    futureCount,
    contentRevision,
  } = useSongHistory(PRESET_SONGS[0]);

  const {
    isEcoMode,
    toggleEcoMode,
    setEcoMode,
    batteryLevel,
    isCharging,
  } = usePowerSaveMode();

  const {
    chordEnabled,
    setChordEnabled,
  } = useChordPlayback();

  const {
    metronomeEnabled,
    metronomeVolume,
    setMetronomeEnabled,
    setMetronomeVolume,
  } = useMetronomePlayback();

  const [instrument, setInstrumentState] = useState<InstrumentType>(() => {
    if (typeof window !== 'undefined') return getStoredInstrument();
    return 'piano';
  });

  const handleSetInstrument = useCallback((inst: InstrumentType) => {
    setInstrumentState(inst);
    setStoredInstrument(inst);
    audioEngine.setOptions({ instrument: inst });
    if (!audioEngine.getIsPlaying()) {
      audioEngine.previewInstrumentTone(song.key, inst);
    }
  }, [song.key]);

  // Keep instrument synced if updated in another component
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEYS.INSTRUMENT && e.newValue) {
        const newInst = e.newValue as InstrumentType;
        setInstrumentState(newInst);
        audioEngine.setOptions({ instrument: newInst });
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  useEffect(() => {
    audioEngine.setOptions({
      ecoMode: isEcoMode,
      targetFps: isEcoMode ? 20 : 30,
      chordEnabled,
      metronomeEnabled,
      metronomeVolume,
      instrument,
    });
  }, [isEcoMode, chordEnabled, metronomeEnabled, metronomeVolume, instrument]);

  const [displayMode, setDisplayModeState] = useState<LyricDisplayMode>(() => {
    if (typeof window !== 'undefined') return getStoredDisplayMode();
    return 'roman_major_hanlo';
  });
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [importExportTab, setImportExportTab] = useState<'presets' | 'custom' | 'export' | 'import'>('presets');
  const [importExportFormat, setImportExportFormat] = useState<'json' | 'text' | 'midi' | undefined>(undefined);
  const [isLyricSearchOpen, setIsLyricSearchOpen] = useState(false);
  const [isAlignerOpen, setIsAlignerOpen] = useState(false);
  const [isNewSongConfirmOpen, setIsNewSongConfirmOpen] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetMeasureIndex, setTargetMeasureIndex] = useState<number | null>(null);

  // Persistence State
  const [savedRevision, setSavedRevision] = useState(0);
  const isDirty = contentRevision !== savedRevision;
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [autosaveInterval, setAutosaveIntervalState] = useState<number>(0);
  const [customSongs, setCustomSongs] = useState<Song[]>([]);
  const [modifiedPresetIds, setModifiedPresetIds] = useState<Set<string>>(new Set());
  const hasInitializedRef = React.useRef(false);
  const selectSongSeqRef = React.useRef(0);

  // Bootstrap IndexedDB on mount: migrate legacy localStorage, load active song, custom songs, and modified presets
  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      try {
        await migrateLocalStorageToDB();

        const [customList, modifiedIds, activeDbSong] = await Promise.all([
          getCustomSongsFromDB(),
          getModifiedPresetIds(),
          getActiveSongFromDB(),
        ]);

        if (!isMounted) return;

        const storedMode = getStoredDisplayMode();
        setDisplayModeState(storedMode);
        const storedAutosave = getStoredAutosaveInterval(0);
        if (storedAutosave !== 0) setAutosaveIntervalState(storedAutosave);

        setCustomSongs(customList);
        setModifiedPresetIds(modifiedIds);

        const localSong = getStoredCurrentSongOrNull();
        const { song: bootSong, fromLocalDraft } = pickBootstrapSong(activeDbSong, localSong);
        loadNewSong(bootSong, { unsaved: fromLocalDraft });
      } catch (err) {
        console.warn('[IndexedDB] Bootstrap failed, falling back to localStorage:', err);
        if (isMounted) {
          const localSong = getStoredCurrentSong();
          loadNewSong(localSong);
        }
      } finally {
        if (isMounted) {
          hasInitializedRef.current = true;
        }
      }
    }

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [loadNewSong]);

  // Persist the active song to localStorage after bootstrap with 300ms debounce
  // to avoid blocking the main thread during rapid typing or note editing.
  useEffect(() => {
    if (!hasInitializedRef.current) return;
    const timer = setTimeout(() => {
      setStoredCurrentSong(song);
    }, 300);

    return () => clearTimeout(timer);
  }, [song]);

  // Synchronize .is-playing class on documentElement for iPad GPU optimization during playback
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (isPlaying) {
      document.documentElement.classList.add('is-playing');
    } else {
      document.documentElement.classList.remove('is-playing');
    }
    return () => {
      document.documentElement.classList.remove('is-playing');
    };
  }, [isPlaying]);

  const setDisplayMode = useCallback((mode: LyricDisplayMode) => {
    setDisplayModeState(mode);
    setStoredDisplayMode(mode);
  }, []);

  const closeAllPrimaryModals = useCallback(() => {
    setIsImportExportOpen(false);
    setIsLyricSearchOpen(false);
    setIsAlignerOpen(false);
    setIsNewSongConfirmOpen(false);
  }, []);

  const handleStartFreshSong = useCallback(() => {
    closeAllPrimaryModals();
    setIsNewSongConfirmOpen(true);
  }, [closeAllPrimaryModals]);

  const handleOpenLibrary = useCallback(
    (tab: 'presets' | 'custom' | 'export' | 'import' = 'presets', format?: 'json' | 'text' | 'midi') => {
      closeAllPrimaryModals();
      setImportExportTab(tab);
      setImportExportFormat(format);
      setIsImportExportOpen(true);
    },
    [closeAllPrimaryModals]
  );

  const handleOpenImportScore = useCallback(() => {
    closeAllPrimaryModals();
    setImportExportTab('import');
    setImportExportFormat(undefined);
    setIsImportExportOpen(true);
  }, [closeAllPrimaryModals]);

  const handleOpenMidiExport = useCallback(() => {
    closeAllPrimaryModals();
    setImportExportTab('export');
    setImportExportFormat('midi');
    setIsImportExportOpen(true);
  }, [closeAllPrimaryModals]);

  const handleOpenLyricSearch = useCallback(() => {
    closeAllPrimaryModals();
    setIsLyricSearchOpen(true);
  }, [closeAllPrimaryModals]);

  const handleOpenAligner = useCallback(() => {
    closeAllPrimaryModals();
    setIsAlignerOpen(true);
  }, [closeAllPrimaryModals]);

  const handleSaveSong = useCallback(async () => {
    if (!song || isSaving) return;
    setIsSaving(true);
    setSaveError(null);
    // Crash draft first: pagehide cannot await IndexedDB, so localStorage stays the recovery source.
    setStoredCurrentSong(song);
    try {
      await saveActiveSongToDB(song);

      const [customList, modifiedIds] = await Promise.all([
        getCustomSongsFromDB(),
        getModifiedPresetIds(),
      ]);
      setCustomSongs(customList);
      setModifiedPresetIds(modifiedIds);

      setSavedRevision(contentRevision);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2200);
    } catch (err) {
      console.error('[page] Failed to save song to IndexedDB:', err);
      setSaveError(
        'Save failed: IndexedDB could not commit. Your draft is still in this browser. Export a JSON backup if this keeps happening.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [song, isSaving, contentRevision]);

  const handleSetAutosaveInterval = useCallback((intervalMs: number) => {
    setAutosaveIntervalState(intervalMs);
    setStoredAutosaveInterval(intervalMs);
  }, []);

  // Periodic autosave timer (when interval > 0)
  useEffect(() => {
    if (autosaveInterval <= 0) return;

    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (isDirty && !isSaving) {
        void handleSaveSong();
      }
    }, autosaveInterval);

    return () => clearInterval(timer);
  }, [autosaveInterval, isDirty, isSaving, handleSaveSong]);

  const handleResetPreset = useCallback(async (presetId: string) => {
    try {
      const pristine = await resetPresetToFactory(presetId);
      const modifiedIds = await getModifiedPresetIds();
      setModifiedPresetIds(modifiedIds);

      if (pristine && song.id === presetId) {
        loadNewSong(pristine);
        setSavedRevision(0);
        await saveActiveSongToDB(pristine);
      }
    } catch (err) {
      console.error('[page] Failed to reset preset to factory:', err);
    }
  }, [song.id, loadNewSong]);

  const handleResetAllPresets = useCallback(async () => {
    try {
      await resetAllPresetsToFactory();
      const modifiedIds = await getModifiedPresetIds();
      setModifiedPresetIds(modifiedIds);

      // If current song is a preset, reload its pristine version
      const matchingPreset = PRESET_SONGS.find(p => p.id === song.id);
      if (matchingPreset) {
        loadNewSong(matchingPreset);
        setSavedRevision(0);
        await saveActiveSongToDB(matchingPreset);
      }
    } catch (err) {
      console.error('[page] Failed to reset all presets to factory:', err);
    }
  }, [song.id, loadNewSong]);

  const handleRestoreDefaultSong = useCallback(async () => {
    try {
      const defaultSong = PRESET_SONGS[0];
      await resetPresetToFactory(defaultSong.id);
      const modifiedIds = await getModifiedPresetIds();
      setModifiedPresetIds(modifiedIds);
      loadNewSong(defaultSong);
      setSavedRevision(0);
      await saveActiveSongToDB(defaultSong);
    } catch (err) {
      console.error('[page] Failed to restore default song:', err);
    }
  }, [loadNewSong]);

  const handleRestoreSettingsToDefault = useCallback(async (options?: { restorePresetSong?: boolean }) => {
    resetAllSettingsToDefault();
    setInstrumentState('piano');
    setStoredInstrument('piano');
    audioEngine.setOptions({ instrument: 'piano', metronomeVolume: 0.45, metronomeEnabled: true, chordEnabled: true });
    setMetronomeEnabled(true);
    setMetronomeVolume(0.45);
    setChordEnabled(true);
    setDisplayModeState('roman_major_hanlo');
    setAutosaveIntervalState(0);
    setUiZoomGlobal(1.0);
    if (isEcoMode) {
      toggleEcoMode();
    }

    if (options?.restorePresetSong) {
      const isPreset = PRESET_SONGS.some(p => p.id === song.id);
      if (isPreset) {
        await handleResetPreset(song.id);
      } else {
        await handleRestoreDefaultSong();
      }
    }
  }, [isEcoMode, toggleEcoMode, song.id, handleResetPreset, handleRestoreDefaultSong, setChordEnabled, setMetronomeEnabled, setMetronomeVolume]);

  const handleConfirmFreshSong = useCallback(async (saveCurrentFirst: boolean) => {
    // Discard means discard: Create Blank Song must not persist dirty work.
    if (saveCurrentFirst) {
      try {
        await saveActiveSongToDB(song);
        setStoredCurrentSong(song);
      } catch {
        saveSongToCustomLibrary(song);
      }
    }
    if (audioEngine) {
      audioEngine.stop();
    }
    const freshSong = createFreshSong();
    try {
      await saveSongToDB(freshSong);
      await saveActiveSongToDB(freshSong);
      const customList = await getCustomSongsFromDB();
      setCustomSongs(customList);
    } catch (err) {
      console.warn('[page] Failed to save fresh song to IndexedDB:', err);
    }

    loadNewSong(freshSong);
    setSavedRevision(0);
    setSaveError(null);
    setTargetMeasureIndex(0);
    setIsNewSongConfirmOpen(false);
  }, [song, loadNewSong]);

  // Flush song state to storage immediately when switching tabs or apps (especially critical on iPad)
  useEffect(() => {
    const flushSongToStorage = () => {
      if (song) {
        setStoredCurrentSong(song);
        if (isDirty) {
          void saveActiveSongToDB(song);
        }
      }
    };

    window.addEventListener('pagehide', flushSongToStorage);
    window.addEventListener('beforeunload', flushSongToStorage);
    const handleVisibility = () => {
      if (document.hidden && song) {
        setStoredCurrentSong(song);
        if (isDirty) {
          void saveActiveSongToDB(song);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.removeEventListener('pagehide', flushSongToStorage);
      window.removeEventListener('beforeunload', flushSongToStorage);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [song, isDirty]);

  // Listen to cross-tab storage changes (e.g. if user edited or imported in another tab)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if ((e.key === STORAGE_KEYS.CURRENT_SONG || e.key === 'numbered_notation_current_song_v2') && e.newValue) {
        try {
          const parsed = sanitizeSong(JSON.parse(e.newValue));
          if (parsed && parsed.id !== song.id) {
            loadNewSong(parsed);
          }
        } catch {
          // ignore
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [song.id, loadNewSong]);

  const handleTogglePlay = useCallback(() => {
    if (!audioEngine) return;
    if (isPlaying) {
      audioEngine.pause();
    } else if (audioEngine.getIsPaused()) {
      audioEngine.unlockOnUserGesture();
      void wakeLockManager.requestForPlayback(isEcoMode);
      audioEngine.resume();
    } else {
      audioEngine.unlockOnUserGesture();
      void wakeLockManager.requestForPlayback(isEcoMode);
      audioEngine.play(song, 0);
    }
  }, [isPlaying, song, isEcoMode]);

  const handleSelectSong = useCallback(
    async (targetSong: Song) => {
      const currentSeq = ++selectSongSeqRef.current;
      if (audioEngine) {
        audioEngine.stop();
      }
      // Flush dirty work only when leaving a different song. Same-id loads
      // (import overwrite, re-select) must not write the in-memory copy over the incoming score.
      if (isDirty && song && song.id !== targetSong.id) {
        try {
          await saveActiveSongToDB(song);
        } catch (err) {
          console.warn('[page] Failed to flush current song before switching:', err);
        }
      }

      // Preset ids load factory code unless a modified override exists.
      // An incoming song that already differs from factory (import overwrite) is kept as-is.
      let songToLoad = targetSong;
      const matchingPreset = PRESET_SONGS.find(p => p.id === targetSong.id);
      if (matchingPreset && !isSongModifiedFromPreset(targetSong)) {
        try {
          const dbVersion = await getSongFromDB(targetSong.id);
          songToLoad = isStoredPresetOverride(dbVersion) && dbVersion ? dbVersion : matchingPreset;
        } catch (err) {
          console.warn('[page] Failed to check preset override:', err);
          songToLoad = matchingPreset;
        }
      }

      // Guard against stale async resolution if user quickly switched songs
      if (currentSeq !== selectSongSeqRef.current) return;

      loadNewSong(songToLoad);
      setSavedRevision(0);
      void saveActiveSongToDB(songToLoad);
    },
    [isDirty, song, loadNewSong]
  );

  // Handle jump request from Lyric Search palette
  const handleJumpFromSearch = useCallback(
    async (
      targetSong: Song,
      measureIndex: number
    ) => {
      if (audioEngine) {
        audioEngine.stop();
      }

      // Switch song if different from current active song
      if (targetSong.id !== song.id) {
        await handleSelectSong(targetSong);
      }

      setTargetMeasureIndex(measureIndex);
    },
    [song.id, handleSelectSong]
  );

  // Subscribe to audio engine playback state
  useEffect(() => {
    if (!audioEngine) return;
    const unsub = audioEngine.subscribeState(state => {
      setIsPlaying(state.isPlaying);
    });
    return () => {
      unsub();
    };
  }, []);

  // Global Keyboard shortcuts: Space for playback, Ctrl+Z / Cmd+Z for undo, Ctrl+Y / Cmd+Shift+Z for redo, Ctrl+S / Cmd+S for Save, Ctrl+K for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isTyping =
        activeEl instanceof HTMLInputElement ||
        activeEl instanceof HTMLTextAreaElement ||
        activeEl instanceof HTMLSelectElement ||
        activeEl?.getAttribute('contenteditable') === 'true';

      // Check for Lyric Search palette (Ctrl+K or Cmd+K)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsLyricSearchOpen(prev => {
          if (!prev) {
            closeAllPrimaryModals();
            return true;
          }
          return false;
        });
        return;
      }

      if (isTyping) return;
      if (e.defaultPrevented) return;

      // Check for Save (Ctrl+S or Cmd+S)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        void handleSaveSong();
        return;
      }

      // Check for Undo (Ctrl+Z or Cmd+Z without Shift)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        undo();
        return;
      }
      // Check for Redo (Ctrl+Y or Cmd+Shift+Z or Ctrl+Shift+Z)
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        redo();
        return;
      }

      // Spacebar to toggle playback
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault();
        handleTogglePlay();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo, handleTogglePlay, handleSaveSong, closeAllPrimaryModals]);

  const isAnyModalOpen =
    isImportExportOpen ||
    isLyricSearchOpen ||
    isAlignerOpen ||
    isNewSongConfirmOpen;

  return (
    <div className="min-h-screen bg-zinc-100 dark:bg-[#0c0e14] text-zinc-900 dark:text-zinc-100 flex flex-col antialiased selection:bg-amber-500/30 print:bg-white print:text-black print:min-h-0">
      {/* Top DAW Master Transport Console */}
      <HeaderBar
        song={song}
        onSelectSong={handleSelectSong}
        onStartFreshSong={handleStartFreshSong}
        onOpenLyricSearch={handleOpenLyricSearch}
        onOpenImportExport={handleOpenLibrary}
        onOpenImportScore={handleOpenImportScore}
        onOpenMidiExport={handleOpenMidiExport}
        isPlaying={isPlaying}
        onTogglePlay={handleTogglePlay}
        onUndo={undo}
        onRedo={redo}
        canUndo={canUndo}
        canRedo={canRedo}
        pastCount={pastCount}
        futureCount={futureCount}
        isEcoMode={isEcoMode}
        onToggleEcoMode={toggleEcoMode}
        batteryLevel={batteryLevel}
        isCharging={isCharging}
        onSave={handleSaveSong}
        isSaving={isSaving}
        isDirty={isDirty}
        saveSuccess={saveSuccess}
        saveError={saveError}
        autosaveInterval={autosaveInterval}
        onSetAutosaveInterval={handleSetAutosaveInterval}
        customSongs={customSongs}
        modifiedPresetIds={modifiedPresetIds}
        instrument={instrument}
        onSetInstrument={handleSetInstrument}
        isAnyModalOpen={isAnyModalOpen}
        onResetPreset={handleResetPreset}
        onResetAllPresets={handleResetAllPresets}
        onRestoreDefaultSong={handleRestoreDefaultSong}
        onRestoreSettingsToDefault={handleRestoreSettingsToDefault}
        onUpdateSong={setSong}
      />

      {saveError && (
        <div
          id="header-save-error-banner"
          role="alert"
          className="print:hidden mx-2 sm:mx-auto sm:max-w-[1600px] sm:w-full sm:px-3 lg:px-4 mt-1.5"
        >
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs font-medium">
            {saveError}
          </div>
        </div>
      )}

      {/* Main Studio Canvas - Consolidated WYSIWYG Sheet */}
      <main className="flex-1 max-w-[1600px] w-full mx-auto px-1 sm:px-3 lg:px-4 py-1 sm:py-2 flex flex-col gap-1.5 safe-px print:p-0 print:m-0 print:max-w-none print:w-full print:block">
        <ComposerEditor
          song={song}
          cursor={cursor}
          onSelectCoord={setCursor}
          onUpdateSong={setSong}
          audioEngine={audioEngine}
          displayMode={displayMode}
          setDisplayMode={setDisplayMode}
          onOpenAligner={handleOpenAligner}
          onStartFreshSong={handleStartFreshSong}
          targetMeasureIndex={targetMeasureIndex}
          onTargetMeasureHandled={() => setTargetMeasureIndex(null)}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          pastCount={pastCount}
          futureCount={futureCount}
          instrument={instrument}
          onSetInstrument={handleSetInstrument}
          onResetPresetSong={handleResetPreset}
          onRestoreDefaultSong={handleRestoreDefaultSong}
          modifiedPresetIds={modifiedPresetIds}
        />
      </main>

      {/* Modals */}
      <ImportExportModal
        key={`${isImportExportOpen ? 'open' : 'closed'}-${importExportTab}-${importExportFormat ?? 'auto'}`}
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
        currentSong={song}
        onLoadSong={handleSelectSong}
        onStartFreshSong={handleStartFreshSong}
        modifiedPresetIds={modifiedPresetIds}
        onResetPreset={handleResetPreset}
        initialTab={importExportTab}
        initialExportFormat={importExportFormat}
      />

      <LyricSearchModal
        key={isLyricSearchOpen ? 'open' : 'closed'}
        isOpen={isLyricSearchOpen}
        onClose={() => setIsLyricSearchOpen(false)}
        currentSong={song}
        customSongs={customSongs}
        initialScope="all"
        onJumpToMeasure={handleJumpFromSearch}
      />

      <QuickLyricAlignerModal
        isOpen={isAlignerOpen}
        onClose={() => setIsAlignerOpen(false)}
        song={song}
        onApplyLyrics={setSong}
        activeCoordinate={cursor}
      />

      <NewSongModal
        isOpen={isNewSongConfirmOpen}
        onClose={() => setIsNewSongConfirmOpen(false)}
        currentSongTitle={song.title}
        isDirty={isDirty}
        onConfirm={handleConfirmFreshSong}
        onOpenImport={handleOpenImportScore}
      />
    </div>
  );
}
