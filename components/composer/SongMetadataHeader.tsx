'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { KeySignature, LyricDisplayMode, Song, TimeSignature, InstrumentType, VerseDisplayOption } from '@/types/song';
import {
  AlignLeft,
  ChevronDown,
  Music,
  FilePlus2,
  FileEdit,
  Check,
  ArrowDown,
  ArrowUp,
  Plus,
  Minus,
  Activity,
  X,
  SlidersHorizontal,
  Info,
  RotateCcw,
  RotateCw,
  Languages,
} from 'lucide-react';
import { PRESET_SONGS } from '@/lib/presets';
import {
  getStoredAutoTransposeChords,
  setStoredAutoTransposeChords,
  getStoredSyncAllMeasures,
  setStoredSyncAllMeasures,
  SETTINGS_RESET_EVENT,
} from '@/lib/storage';
import {
  CHROMATIC_KEYS,
  STANDARD_TIME_SIGNATURES,
  TEMPO_PRESETS,
  INSTRUMENT_OPTIONS,
  transposeSongChords,
  autoFillSongMeasureRests,
  smartRebarSong,
  getVerseDisplayOption,
} from '@/lib/taigiUtils';

interface SongMetadataHeaderProps {
  song: Song;
  onUpdateSong: (
    updatedSong: Song,
    options?: { coalesce?: boolean; coalesceKey?: string }
  ) => void;
  displayMode: LyricDisplayMode;
  setDisplayMode: (mode: LyricDisplayMode) => void;
  onOpenAligner?: () => void;
  onStartFreshSong?: () => void;
  instrument?: InstrumentType;
  onSetInstrument?: (inst: InstrumentType) => void;
  onResetPresetSong?: (presetId: string) => void;
  onRestoreDefaultSong?: () => void;
  modifiedPresetIds?: Set<string>;
}

export const SongMetadataHeader: React.FC<SongMetadataHeaderProps> = React.memo(({
  song,
  onUpdateSong,
  displayMode,
  setDisplayMode,
  onOpenAligner,
  onStartFreshSong,
  instrument = 'piano',
  onSetInstrument,
  onResetPresetSong,
  onRestoreDefaultSong,
  modifiedPresetIds = new Set(),
}) => {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [restoreSuccessNotice, setRestoreSuccessNotice] = useState<string | null>(null);

  // Active inline popover for DAW LCD items: 'key' | 'timeSignature' | 'bpm' | 'displayMode' | null
  const [activePopover, setActivePopover] = useState<'key' | 'timeSignature' | 'bpm' | 'displayMode' | null>(null);

  // Key Signature Settings
  const [autoTransposeChords, setAutoTransposeChordsState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return getStoredAutoTransposeChords(true);
    return true;
  });
  const setAutoTransposeChords = useCallback((val: boolean) => {
    setAutoTransposeChordsState(val);
    setStoredAutoTransposeChords(val);
  }, []);

  // Time Signature Settings
  const [syncAllMeasures, setSyncAllMeasuresState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return getStoredSyncAllMeasures(true);
    return true;
  });
  const setSyncAllMeasures = useCallback((val: boolean) => {
    setSyncAllMeasuresState(val);
    setStoredSyncAllMeasures(val);
  }, []);

  // Preset detection & restore handlers
  const matchingPreset = React.useMemo(() => {
    return PRESET_SONGS.find(p => p.id === song.id || p.id === song.originalPresetId);
  }, [song.id, song.originalPresetId]);
  const isPresetSong = Boolean(matchingPreset);
  const isModified = Boolean(
    song.isPresetModified ||
    (modifiedPresetIds && matchingPreset && modifiedPresetIds.has(matchingPreset.id)) ||
    (matchingPreset && (
      song.title !== matchingPreset.title ||
      song.subtitle !== matchingPreset.subtitle ||
      song.composer !== matchingPreset.composer ||
      song.lyricist !== matchingPreset.lyricist ||
      song.key !== matchingPreset.key ||
      song.timeSignature !== matchingPreset.timeSignature ||
      song.bpm !== matchingPreset.bpm ||
      song.notesPerLine !== matchingPreset.notesPerLine ||
      song.description !== matchingPreset.description ||
      JSON.stringify(song.measures) !== JSON.stringify(matchingPreset.measures)
    ))
  );

  const handleRestorePreset = useCallback(() => {
    if (!matchingPreset) return;
    if (window.confirm(`確定要將《${matchingPreset.title}》恢復為原廠預設嗎？這將會清除您在此曲上的所有修改與設定。(Restore《${matchingPreset.title}》to factory default?)`)) {
      if (onResetPresetSong) {
        onResetPresetSong(matchingPreset.id);
      } else {
        onUpdateSong(matchingPreset);
      }
      setRestoreSuccessNotice(`已將《${matchingPreset.title}》恢復為原廠預設！`);
      setTimeout(() => setRestoreSuccessNotice(null), 3500);
    }
  }, [matchingPreset, onResetPresetSong, onUpdateSong]);

  const handleRestoreDefaultSong = useCallback(() => {
    const defaultPreset = PRESET_SONGS[0];
    if (window.confirm(`確定要載入出廠預設歌曲《${defaultPreset.title}》嗎？(Restore default preset song《${defaultPreset.title}》?)`)) {
      if (onRestoreDefaultSong) {
        onRestoreDefaultSong();
      } else if (onResetPresetSong) {
        onResetPresetSong(defaultPreset.id);
      } else {
        onUpdateSong(defaultPreset);
      }
      setRestoreSuccessNotice(`已恢復為出廠預設曲目《${defaultPreset.title}》！`);
      setTimeout(() => setRestoreSuccessNotice(null), 3500);
    }
  }, [onRestoreDefaultSong, onResetPresetSong, onUpdateSong]);

  const handleRestoreSongLayoutDefaults = useCallback(() => {
    onUpdateSong({
      ...song,
      notesPerLine: 4,
    });
    if (onSetInstrument) {
      onSetInstrument('piano');
    }
    setAutoTransposeChords(true);
    setSyncAllMeasures(true);
    setRestoreSuccessNotice('已重設版面與音色設定為預設值！');
    setTimeout(() => setRestoreSuccessNotice(null), 3500);
  }, [song, onUpdateSong, onSetInstrument, setAutoTransposeChords, setSyncAllMeasures]);

  // Listen to global settings reset event
  useEffect(() => {
    const handleReset = () => {
      setAutoTransposeChordsState(getStoredAutoTransposeChords(true));
      setSyncAllMeasuresState(getStoredSyncAllMeasures(true));
    };
    window.addEventListener(SETTINGS_RESET_EVENT, handleReset);
    return () => window.removeEventListener(SETTINGS_RESET_EVENT, handleReset);
  }, []);

  // Tap Tempo state
  const tapTimesRef = useRef<number[]>([]);
  const [tapTempoFeedback, setTapTempoFeedback] = useState<string | null>(null);

  // Close popovers on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActivePopover(null);
        setIsSettingsModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Handle Key Change
  const handleSelectKey = (targetKey: KeySignature) => {
    if (targetKey === song.key) {
      setActivePopover(null);
      return;
    }
    if (autoTransposeChords) {
      const updated = transposeSongChords(song, targetKey);
      onUpdateSong(updated);
    } else {
      onUpdateSong({ ...song, key: targetKey });
    }
    setActivePopover(null);
  };

  const handleStepKey = (delta: number) => {
    const currentIdx = CHROMATIC_KEYS.indexOf(song.key);
    const safeIdx = currentIdx >= 0 ? currentIdx : 0;
    const nextIdx = (safeIdx + delta + 12) % 12;
    const targetKey = CHROMATIC_KEYS[nextIdx];
    handleSelectKey(targetKey);
  };

  // Handle Time Signature Change
  const handleSelectTimeSignature = (targetTimeSig: TimeSignature) => {
    if (syncAllMeasures) {
      const updatedMeasures = song.measures.map(m => ({
        ...m,
        timeSignature: undefined,
      }));
      onUpdateSong({
        ...song,
        timeSignature: targetTimeSig,
        measures: updatedMeasures,
      });
    } else {
      onUpdateSong({ ...song, timeSignature: targetTimeSig });
    }
    setActivePopover(null);
  };

  // Smart Re-bar measures
  const handleSmartRebar = (targetTimeSig: TimeSignature) => {
    const updated = smartRebarSong(song, targetTimeSig);
    onUpdateSong(updated);
    setActivePopover(null);
  };

  // Auto Fill Rests
  const handleAutoFillRests = () => {
    const updated = autoFillSongMeasureRests(song);
    onUpdateSong(updated);
    setActivePopover(null);
  };

  // Handle BPM Change
  const handleSetBpm = (newBpm: number) => {
    const clamped = Math.max(30, Math.min(260, Math.round(newBpm)));
    onUpdateSong({ ...song, bpm: clamped }, { coalesce: true, coalesceKey: 'song-bpm' });
  };

  const handleStepBpm = (delta: number) => {
    handleSetBpm(song.bpm + delta);
  };

  // Tap Tempo Handler
  const handleTapTempo = () => {
    const now = Date.now();
    const recentTaps = tapTimesRef.current.filter(t => now - t < 2600);
    recentTaps.push(now);
    tapTimesRef.current = recentTaps;

    if (recentTaps.length >= 2) {
      let totalDiff = 0;
      for (let i = 1; i < recentTaps.length; i++) {
        totalDiff += recentTaps[i] - recentTaps[i - 1];
      }
      const avgInterval = totalDiff / (recentTaps.length - 1);
      const computedBpm = Math.round(60000 / avgInterval);
      const clamped = Math.max(40, Math.min(240, computedBpm));
      handleSetBpm(clamped);
      setTapTempoFeedback(`${clamped} BPM (${recentTaps.length} taps)`);
    } else {
      setTapTempoFeedback('Tap again to measure...');
    }
  };

  // Display mode label helper
  const getDisplayModeSummary = () => {
    switch (displayMode) {
      case 'roman':
        return 'Roman (POJ)';
      case 'hanlo':
      case 'hanji_only':
      case 'custom_only':
        return 'Han-lô';
      case 'roman_major_hanlo':
      case 'all':
        return 'Bilingual (Roman)';
      case 'hanlo_major_roman':
      case 'hanji_poj':
        return 'Bilingual (Han-lô)';
      default:
        return 'Lyric Mode';
    }
  };

  return (
    <>
      {/* Click-away Backdrop for Active Popovers */}
      {activePopover && (
        <div
          id="popover-backdrop"
          className="fixed inset-0 z-30 bg-black/10 dark:bg-black/30"
          onClick={() => setActivePopover(null)}
        />
      )}

      {/* COMPACT DAW PROJECT STRIP (High-Density, Maximize Viewport for Notation) */}
      <div
        id="song-metadata-card"
        className="px-2.5 py-1 sm:py-1.5 bg-white/95 dark:bg-[#141720]/95 backdrop-blur-md border border-zinc-200/90 dark:border-zinc-800/80 rounded-xl shadow-2xs flex items-center justify-between gap-1.5 sm:gap-2 flex-wrap select-none relative print:hidden"
      >
        {/* Left: Song Title & Quick Musical LCD Badges */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap min-w-0">
          <div className="flex items-center gap-1 min-w-0">
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold shrink-0 border border-amber-500/20">
              <Music className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </div>

            <button
              id="compact-song-title-btn"
              type="button"
              onClick={() => {
                setActivePopover(null);
                setIsSettingsModalOpen(true);
              }}
              className="flex items-center gap-1 text-left font-extrabold text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 hover:text-amber-600 dark:hover:text-amber-400 transition-colors cursor-pointer group max-w-[150px] sm:max-w-[220px] truncate"
              title="Click to edit song details and layout settings"
            >
              <span className="truncate">{song.title || 'Untitled Song'}</span>
              <FileEdit className="w-2.5 h-2.5 text-zinc-400 group-hover:text-amber-500 shrink-0 opacity-70" />
            </button>
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {/* Key Signature Popover Trigger */}
            <div className="relative inline-block">
              <button
                id="header-key-badge-btn"
                type="button"
                onClick={() => setActivePopover(activePopover === 'key' ? null : 'key')}
                className={`daw-lcd text-[11px] px-2 py-0.5 rounded-md font-mono font-bold shadow-xs cursor-pointer touch-manipulation transition-all flex items-center gap-1 border h-6.5 sm:h-7 ${
                  activePopover === 'key'
                    ? 'ring-1.5 ring-amber-400 border-amber-500 brightness-110 text-amber-300'
                    : 'border-amber-500/20 hover:border-amber-400/60 hover:brightness-105 active:scale-95'
                }`}
                title="Key Signature: 1 = ?"
              >
                <span>1 = {song.key}</span>
                <ChevronDown className="w-2.5 h-2.5 text-amber-500/70" />
              </button>

              {activePopover === 'key' && (
                <div
                  id="popover-key-editor"
                  className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 p-3.5 bg-white dark:bg-[#161922] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      <Music className="w-3.5 h-3.5 text-amber-500" />
                      <span>Key Signature (1 = ?)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 mb-3">
                    <button
                      id="key-step-down-btn"
                      type="button"
                      onClick={() => handleStepKey(-1)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Down 1 semitone"
                    >
                      <ArrowDown className="w-3.5 h-3.5 text-amber-500" />
                      <span>-1 Semitone</span>
                    </button>

                    <div className="daw-lcd px-2.5 py-1 text-xs font-mono font-bold rounded-lg shrink-0">
                      1 = {song.key}
                    </div>

                    <button
                      id="key-step-up-btn"
                      type="button"
                      onClick={() => handleStepKey(1)}
                      className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="Up 1 semitone"
                    >
                      <ArrowUp className="w-3.5 h-3.5 text-amber-500" />
                      <span>+1 Semitone</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 mb-3">
                    {CHROMATIC_KEYS.map(k => {
                      const isCurrent = song.key === k;
                      return (
                        <button
                          key={k}
                          id={`key-opt-${k}`}
                          type="button"
                          onClick={() => handleSelectKey(k)}
                          className={`py-1.5 px-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer touch-manipulation flex items-center justify-center gap-1 ${
                            isCurrent
                              ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/60 hover:bg-amber-500/10 hover:border-amber-500/40'
                          }`}
                        >
                          <span>1={k}</span>
                          {isCurrent && <Check className="w-3 h-3 text-zinc-950 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  <label className="flex items-center gap-2 p-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/80 dark:border-zinc-700/60 cursor-pointer">
                    <input
                      id="auto-transpose-chords-checkbox"
                      type="checkbox"
                      checked={autoTransposeChords}
                      onChange={e => setAutoTransposeChords(e.target.checked)}
                      className="w-4 h-4 rounded-sm text-amber-500 focus:ring-amber-400 border-zinc-300 dark:border-zinc-600 bg-white dark:bg-zinc-800"
                    />
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                        Auto-transpose measure chords
                      </span>
                      <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                        Transpose chords when changing key (e.g. Gm → Am)
                      </span>
                    </div>
                  </label>
                </div>
              )}
            </div>

            {/* Time Signature Popover Trigger */}
            <div className="relative inline-block">
              <button
                id="header-timesig-badge-btn"
                type="button"
                onClick={() => setActivePopover(activePopover === 'timeSignature' ? null : 'timeSignature')}
                className={`daw-lcd text-[11px] px-2 py-0.5 rounded-md font-mono font-bold shadow-xs cursor-pointer touch-manipulation transition-all flex items-center gap-1 border h-6.5 sm:h-7 ${
                  activePopover === 'timeSignature'
                    ? 'ring-1.5 ring-amber-400 border-amber-500 brightness-110 text-amber-300'
                    : 'border-amber-500/20 hover:border-amber-400/60 hover:brightness-105 active:scale-95'
                }`}
                title="Time Signature / Meter"
              >
                <span>{song.timeSignature}</span>
                <ChevronDown className="w-2.5 h-2.5 text-amber-500/70" />
              </button>

              {activePopover === 'timeSignature' && (
                <div
                  id="popover-timesig-editor"
                  className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 p-3.5 bg-white dark:bg-[#161922] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                      <span>Time Signature Settings</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col gap-1.5 mb-3">
                    {STANDARD_TIME_SIGNATURES.map(ts => {
                      const isCurrent = song.timeSignature === ts.value;
                      return (
                        <button
                          key={ts.value}
                          id={`timesig-opt-${ts.value.replace('/', '-')}`}
                          type="button"
                          onClick={() => handleSelectTimeSignature(ts.value)}
                          className={`p-2 rounded-xl border text-left transition-all cursor-pointer touch-manipulation flex items-center justify-between ${
                            isCurrent
                              ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700/60 hover:bg-amber-500/10 hover:border-amber-500/40'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm w-8">{ts.label}</span>
                            <span className="text-[11px] opacity-90">{ts.sublabel}</span>
                          </div>
                          {isCurrent && <Check className="w-4 h-4 text-zinc-950 stroke-[3]" />}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => handleSmartRebar(song.timeSignature)}
                      className="w-full py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left"
                    >
                      Smart Re-bar to new meter
                    </button>

                    <button
                      type="button"
                      onClick={handleAutoFillRests}
                      className="w-full py-1.5 px-2.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer text-left"
                    >
                      Auto Fill Rests for incomplete measures
                    </button>

                    <label className="flex items-center gap-2 px-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncAllMeasures}
                        onChange={e => setSyncAllMeasures(e.target.checked)}
                        className="w-3.5 h-3.5 rounded text-amber-500"
                      />
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        Apply to all measures without custom meter
                      </span>
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* BPM Popover Trigger */}
            <div className="relative inline-block">
              <button
                id="header-bpm-badge-btn"
                type="button"
                onClick={() => setActivePopover(activePopover === 'bpm' ? null : 'bpm')}
                className={`daw-lcd text-[11px] px-2 py-0.5 rounded-md font-mono font-bold shadow-xs cursor-pointer touch-manipulation transition-all flex items-center gap-1 border h-6.5 sm:h-7 ${
                  activePopover === 'bpm'
                    ? 'ring-1.5 ring-amber-400 border-amber-500 brightness-110 text-amber-300'
                    : 'border-amber-500/20 hover:border-amber-400/60 hover:brightness-105 active:scale-95'
                }`}
                title="Tempo (BPM)"
              >
                <span>♩ = {song.bpm}</span>
                <ChevronDown className="w-2.5 h-2.5 text-amber-500/70" />
              </button>

              {activePopover === 'bpm' && (
                <div
                  id="popover-bpm-editor"
                  className="absolute left-0 top-full mt-2 z-40 w-72 sm:w-80 p-3.5 bg-white dark:bg-[#161922] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150"
                >
                  <div className="flex items-center justify-between pb-2 mb-2.5 border-b border-zinc-200 dark:border-zinc-800">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-900 dark:text-zinc-100">
                      <Activity className="w-3.5 h-3.5 text-amber-500" />
                      <span>Tempo Settings (BPM)</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActivePopover(null)}
                      className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 mb-3">
                    <button
                      id="bpm-minus-10-btn"
                      type="button"
                      onClick={() => handleStepBpm(-10)}
                      className="py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                      title="-10 BPM"
                    >
                      -10
                    </button>
                    <button
                      id="bpm-minus-1-btn"
                      type="button"
                      onClick={() => handleStepBpm(-1)}
                      className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="-1 BPM"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <div className="flex-1 flex items-center justify-center bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-2 py-1">
                      <input
                        id="bpm-direct-input"
                        type="number"
                        min="30"
                        max="260"
                        value={song.bpm}
                        onChange={e => handleSetBpm(parseInt(e.target.value, 10) || 80)}
                        className="w-16 text-center text-base font-mono font-black text-amber-600 dark:text-amber-400 bg-transparent focus:outline-hidden"
                      />
                      <span className="text-[11px] font-mono font-bold text-zinc-500 dark:text-zinc-400">
                        BPM
                      </span>
                    </div>

                    <button
                      id="bpm-plus-1-btn"
                      type="button"
                      onClick={() => handleStepBpm(1)}
                      className="p-1.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                      title="+1 BPM"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="bpm-plus-10-btn"
                      type="button"
                      onClick={() => handleStepBpm(10)}
                      className="py-1.5 px-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-mono font-bold transition-colors cursor-pointer"
                      title="+10 BPM"
                    >
                      +10
                    </button>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mb-3">
                    {TEMPO_PRESETS.map(preset => {
                      const isCurrent = song.bpm === preset.bpm;
                      return (
                        <button
                          key={preset.bpm}
                          id={`bpm-preset-${preset.bpm}`}
                          type="button"
                          onClick={() => handleSetBpm(preset.bpm)}
                          className={`py-1 px-1.5 text-[11px] font-medium rounded-lg border transition-all cursor-pointer text-center truncate ${
                            isCurrent
                              ? 'bg-amber-500 text-zinc-950 border-amber-400 font-bold shadow-xs'
                              : 'bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700/60 hover:bg-amber-500/10'
                          }`}
                          title={preset.label}
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex flex-col gap-1.5">
                    <button
                      id="bpm-tap-tempo-btn"
                      type="button"
                      onClick={handleTapTempo}
                      className="w-full py-2 px-3 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-black text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center gap-1.5"
                    >
                      <Activity className="w-4 h-4 text-zinc-950" />
                      <span>Tap Tempo</span>
                    </button>

                    {tapTempoFeedback && (
                      <p className="text-[11px] text-center font-mono text-amber-600 dark:text-amber-400 font-bold animate-in fade-in">
                        {tapTempoFeedback}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Measures Count Pill */}
            <span className="text-[10px] font-mono font-bold text-zinc-500 dark:text-zinc-400 px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/80 dark:border-zinc-750 shrink-0 h-6.5 sm:h-7 flex items-center">
              {song.measures.length} M
            </span>
          </div>
        </div>

        {/* Right: Lyric Mode Selector & Studio Utilities */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap">
          {/* Quick Lyric Display Mode Switcher */}
          <div className="relative">
            <div
              id="header-lyric-mode-group"
              className="flex items-center bg-zinc-100 dark:bg-zinc-900/90 p-0.5 rounded-lg border border-zinc-200/90 dark:border-zinc-750 text-xs font-bold shadow-2xs h-6.5 sm:h-7.5"
            >
              <button
                type="button"
                onClick={() => setDisplayMode('roman')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer touch-manipulation text-[11px] ${
                  displayMode === 'roman'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs font-black'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title="Romanization Only (POJ/TL)"
              >
                Roman
              </button>
              <button
                type="button"
                onClick={() => setDisplayMode('hanlo')}
                className={`px-2 py-0.5 rounded-md transition-all cursor-pointer touch-manipulation text-[11px] ${
                  displayMode === 'hanlo' || displayMode === 'hanji_only' || displayMode === 'custom_only'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs font-black'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title="Han-lô Only"
              >
                Han-lô
              </button>
              <button
                type="button"
                onClick={() => setActivePopover(activePopover === 'displayMode' ? null : 'displayMode')}
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-md transition-all cursor-pointer touch-manipulation text-[11px] ${
                  displayMode.includes('major') || displayMode === 'all'
                    ? 'bg-amber-500 text-zinc-950 shadow-xs font-black'
                    : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                }`}
                title="Bilingual Mode"
              >
                <span>Bilingual</span>
                <ChevronDown className="w-2.5 h-2.5" />
              </button>
            </div>

            {/* Display Mode Sub-Menu Popover */}
            {activePopover === 'displayMode' && (
              <div
                id="popover-display-mode-menu"
                className="absolute right-0 top-full mt-2 z-40 w-56 p-2 bg-white dark:bg-[#161922] border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 text-xs"
              >
                <div className="px-2 py-1 text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                  Bilingual Alignment Display
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayMode('roman_major_hanlo');
                    setActivePopover(null);
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl text-left font-bold transition-colors cursor-pointer ${
                    displayMode === 'roman_major_hanlo' || displayMode === 'all'
                      ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>Roman (Primary) + Han-lô</span>
                  {(displayMode === 'roman_major_hanlo' || displayMode === 'all') && (
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDisplayMode('hanlo_major_roman');
                    setActivePopover(null);
                  }}
                  className={`flex items-center justify-between p-2 rounded-xl text-left font-bold transition-colors cursor-pointer ${
                    displayMode === 'hanlo_major_roman' || displayMode === 'hanji_poj'
                      ? 'bg-amber-500/15 text-amber-900 dark:text-amber-200'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>Han-lô (Primary) + Roman</span>
                  {(displayMode === 'hanlo_major_roman' || displayMode === 'hanji_poj') && (
                    <Check className="w-3.5 h-3.5 text-amber-600" />
                  )}
                </button>
              </div>
            )}
          </div>

          {/* Quick Lyric Aligner Modal Trigger */}
          <button
            id="composer-open-aligner-btn"
            type="button"
            onClick={() => {
              setActivePopover(null);
              onOpenAligner?.();
            }}
            className="flex items-center gap-1 px-2 py-0.5 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 font-bold text-xs rounded-lg border border-zinc-200/90 dark:border-zinc-750 shadow-2xs transition-all active:scale-95 cursor-pointer touch-manipulation h-6.5 sm:h-7.5"
            title="Lyric Aligner (Supports Roman and Han-lô)"
          >
            <AlignLeft className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline text-[11px]">Align Lyrics</span>
          </button>

          {/* Song Settings / Metadata Dialog Trigger */}
          <button
            id="composer-expand-settings-btn"
            type="button"
            onClick={() => {
              setActivePopover(null);
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-1 px-2 py-0.5 font-bold text-xs rounded-lg border transition-all cursor-pointer h-6.5 sm:h-7.5 touch-manipulation bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-900/90 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-750 shadow-2xs"
            title="Song Settings (Title, Composer, Lyricist, Layout, Notes)"
          >
            <SlidersHorizontal className="w-3 h-3 text-amber-500" />
            <span className="hidden sm:inline text-[11px]">Settings</span>
          </button>
        </div>
      </div>

      {/* SONG SETTINGS MODAL DIALOG (Non-intrusive, Does not shift notation scroll position) */}
      {isSettingsModalOpen && (
        <div
          id="song-settings-modal-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
          onClick={() => setIsSettingsModalOpen(false)}
        >
          <div
            id="song-settings-modal-card"
            className="bg-white dark:bg-[#141720] border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-150"
            onClick={e => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-zinc-900 dark:text-zinc-100">
                    Song Settings & Details
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Edit score title, credits, layout per line, and background notes
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Section 1: Basic Song Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Song Title */}
              <div>
                <label
                  htmlFor="composer-song-title-input"
                  className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1"
                >
                  Title *
                </label>
                <input
                  id="composer-song-title-input"
                  type="text"
                  value={song.title}
                  onChange={e => onUpdateSong({ ...song, title: e.target.value }, { coalesce: true, coalesceKey: 'meta-title' })}
                  className="w-full text-sm font-bold text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
                  placeholder="e.g. Bang Chhun-hong..."
                />
              </div>

              {/* Subtitle / Alternate Name */}
              <div>
                <label
                  htmlFor="composer-song-subtitle-input"
                  className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1"
                >
                  Subtitle / English
                </label>
                <input
                  id="composer-song-subtitle-input"
                  type="text"
                  value={song.subtitle || ''}
                  onChange={e => onUpdateSong({ ...song, subtitle: e.target.value }, { coalesce: true, coalesceKey: 'meta-subtitle' })}
                  className="w-full text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
                  placeholder="e.g. Taiwanese Folk Song..."
                />
              </div>

              {/* Composer */}
              <div>
                <label
                  htmlFor="composer-song-composer-input"
                  className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1"
                >
                  Composer
                </label>
                <input
                  id="composer-song-composer-input"
                  type="text"
                  value={song.composer || ''}
                  onChange={e => onUpdateSong({ ...song, composer: e.target.value }, { coalesce: true, coalesceKey: 'meta-composer' })}
                  className="w-full text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
                  placeholder="e.g. Tēng Ú-hiân..."
                />
              </div>

              {/* Lyricist */}
              <div>
                <label
                  htmlFor="composer-song-lyricist-input"
                  className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1"
                >
                  Lyricist
                </label>
                <input
                  id="composer-song-lyricist-input"
                  type="text"
                  value={song.lyricist || ''}
                  onChange={e => onUpdateSong({ ...song, lyricist: e.target.value }, { coalesce: true, coalesceKey: 'meta-lyricist' })}
                  className="w-full text-sm font-medium text-zinc-900 dark:text-zinc-100 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all"
                  placeholder="e.g. Lí Lîm-chhiu..."
                />
              </div>
            </div>

            {/* Section 2: Layout & Measures Per Line */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
              <div>
                <label
                  htmlFor="composer-notes-per-line-select"
                  className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1"
                >
                  Measures Per Line
                </label>
                <select
                  id="composer-notes-per-line-select"
                  value={song.notesPerLine || 4}
                  onChange={e =>
                    onUpdateSong({ ...song, notesPerLine: parseInt(e.target.value, 10) || 4 })
                  }
                  className="w-full bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold rounded-xl px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-colors cursor-pointer"
                >
                  <option value="2">2 Measures / Line</option>
                  <option value="3">3 Measures / Line</option>
                  <option value="4">4 Measures / Line (Standard 4/4)</option>
                  <option value="5">5 Measures / Line</option>
                  <option value="6">6 Measures / Line (Compact)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-1">
                  Structure Summary
                </label>
                <div className="flex items-center gap-2 p-2 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-mono font-bold text-zinc-700 dark:text-zinc-300">
                  <span>{song.measures.length} Measures</span>
                  <span>·</span>
                  <span>Key 1 = {song.key}</span>
                  <span>·</span>
                  <span>{song.timeSignature} Meter</span>
                  <span>·</span>
                  <span>{song.bpm} BPM</span>
                </div>
              </div>
            </div>

            {/* Lyric Display Format (4-Format Display Support & 4-Stage Rotational Toggle) */}
            {(() => {
              const FORMAT_CYCLE: {
                id: VerseDisplayOption;
                label: string;
                badge?: string;
                isSerif?: boolean;
                desc: string;
              }[] = [
                {
                  id: 'hanlo',
                  label: 'Hàn-lô',
                  desc: 'Displays only Hàn-lô / Hanji characters',
                },
                {
                  id: 'poj',
                  label: 'POJ',
                  isSerif: true,
                  desc: 'Displays only Pe̍h-ōe-jī romanization in italicized serif styling',
                },
                {
                  id: 'both_poj_top',
                  label: 'POJ / Hàn',
                  badge: 'POJ on top',
                  desc: 'Stacked layout with POJ on top and Hàn-lô below',
                },
                {
                  id: 'both_hanlo_top',
                  label: 'Hàn / POJ',
                  badge: 'Hàn on top',
                  desc: 'Stacked layout with Hàn-lô on top and POJ below',
                },
              ];

              const currentLyricOption = getVerseDisplayOption(song);
              const activeLyricOpt =
                currentLyricOption === 'both' ? 'both_poj_top' : (currentLyricOption || 'both_poj_top');
              const activeLyricIdx = Math.max(0, FORMAT_CYCLE.findIndex(item => item.id === activeLyricOpt));
              const activeLyricConfig = FORMAT_CYCLE[activeLyricIdx];
              const nextLyricConfig = FORMAT_CYCLE[(activeLyricIdx + 1) % FORMAT_CYCLE.length];

              const handleCycleLyricFormat = () => {
                onUpdateSong({
                  ...song,
                  verseDisplayOption: nextLyricConfig.id,
                });
              };

              const handleSelectLyricFormat = (optId: VerseDisplayOption) => {
                onUpdateSong({
                  ...song,
                  verseDisplayOption: optId,
                });
              };

              return (
                <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Languages className="w-3.5 h-3.5 text-amber-500" />
                      <span>Lyric Display Format (4-Stage Support)</span>
                    </label>
                    <button
                      id="song-settings-rotational-cycle-btn"
                      type="button"
                      onClick={handleCycleLyricFormat}
                      className="group flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 text-xs font-bold transition-all cursor-pointer border border-amber-500/30 touch-manipulation active:scale-95"
                      title={`Rotate format to: ${nextLyricConfig.label} (${nextLyricConfig.desc})`}
                    >
                      <span>Rotate ({nextLyricConfig.label})</span>
                      <RotateCw className="w-3 h-3 group-hover:rotate-180 transition-all duration-300 shrink-0" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {FORMAT_CYCLE.map(opt => {
                      const isSelected = activeLyricOpt === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleSelectLyricFormat(opt.id)}
                          className={`p-2 rounded-xl text-left flex flex-col justify-between gap-1 transition-all cursor-pointer border min-h-[64px] touch-manipulation ${
                            isSelected
                              ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                              : 'bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
                          }`}
                        >
                          <div className="flex items-center justify-between w-full">
                            <span className={`text-xs font-bold ${opt.isSerif ? 'font-serif italic' : ''}`}>
                              {opt.label}
                            </span>
                            {isSelected ? (
                              <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3] shrink-0" />
                            ) : opt.badge ? (
                              <span className="text-[9px] font-medium px-1 py-0.2 rounded bg-zinc-200/80 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300">
                                {opt.badge}
                              </span>
                            ) : null}
                          </div>
                          <span
                            className={`text-[9.5px] leading-tight ${
                              isSelected ? 'text-zinc-950 font-medium' : 'text-zinc-500 dark:text-zinc-400'
                            }`}
                          >
                            {opt.desc}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* Section 3: Melody Instrument Timbre Selector */}
            {onSetInstrument && (
              <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                    Melody Instrument Tone / 音色選擇
                  </label>
                  <span className="text-xs text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {INSTRUMENT_OPTIONS.find(o => o.value === instrument)?.labelEn}
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {INSTRUMENT_OPTIONS.map(opt => {
                    const isSelected = instrument === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSetInstrument(opt.value)}
                        className={`px-2.5 py-1.5 rounded-xl text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-zinc-950 shadow-xs ring-1 ring-amber-400'
                            : 'bg-zinc-50 dark:bg-zinc-800/80 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700'
                        }`}
                      >
                        <span className="truncate">{opt.labelEn}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-zinc-950 stroke-[3] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Section 4: Description Multi-line Input */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
              <label
                htmlFor="composer-song-description-textarea"
                className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider"
              >
                Background & Performance Notes
              </label>
              <textarea
                id="composer-song-description-textarea"
                rows={3}
                value={song.description || ''}
                onChange={e => onUpdateSong({ ...song, description: e.target.value }, { coalesce: true, coalesceKey: 'meta-desc' })}
                className="w-full text-xs font-normal leading-relaxed text-zinc-800 dark:text-zinc-200 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl p-3 focus:outline-hidden focus:ring-2 focus:ring-amber-500 transition-all resize-y"
                placeholder="Enter historical background, lyrical context, or performance tips..."
              />
            </div>

            {/* Section 5: Defaults & Factory Reset */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                  Defaults & Factory Reset / 恢復預設
                </label>
                {restoreSuccessNotice && (
                  <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                    <Check className="w-3.5 h-3.5" />
                    {restoreSuccessNotice}
                  </span>
                )}
              </div>
              <div className="p-3 rounded-xl bg-zinc-50 dark:bg-zinc-850/60 border border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      {isPresetSong ? `Preset Song: ${matchingPreset?.title}` : 'Current Song: Custom Composition'}
                    </span>
                    {isPresetSong && isModified && (
                      <span className="px-1.5 py-0.2 text-[10px] font-extrabold rounded-md bg-amber-500/20 text-amber-800 dark:text-amber-300 border border-amber-400/50">
                        Modified
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {isPresetSong
                      ? (isModified ? 'Has custom edits · Restore will revert back to pristine factory score' : 'Pristine factory preset score')
                      : 'Custom user composition · Revert settings or load factory preset'}
                  </span>
                </div>
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  {isPresetSong ? (
                    <button
                      id="song-settings-restore-preset-btn"
                      type="button"
                      onClick={handleRestorePreset}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[44px] bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-300 dark:border-rose-800 active:scale-98"
                      title="Revert this preset song to original factory score"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>Restore Preset Song</span>
                    </button>
                  ) : (
                    <button
                      id="song-settings-restore-default-song-btn"
                      type="button"
                      onClick={handleRestoreDefaultSong}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[44px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-900 dark:text-amber-200 border border-amber-300 dark:border-amber-700 active:scale-98"
                      title="Load factory default preset song (望春風)"
                    >
                      <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                      <span>Restore Default Song</span>
                    </button>
                  )}
                  <button
                    id="song-settings-restore-layout-btn"
                    type="button"
                    onClick={handleRestoreSongLayoutDefaults}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[44px] bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 active:scale-98"
                    title="Reset measures per line to 4 and melody instrument to Piano"
                  >
                    <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
                    <span>Reset Layout & Tone</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                {onStartFreshSong && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSettingsModalOpen(false);
                      onStartFreshSong();
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer touch-manipulation min-h-[44px]"
                  >
                    <FilePlus2 className="w-3.5 h-3.5 text-amber-500" />
                    <span>New Blank Song</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={() => setIsSettingsModalOpen(false)}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs rounded-xl shadow-xs transition-colors cursor-pointer touch-manipulation min-h-[44px]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

SongMetadataHeader.displayName = 'SongMetadataHeader';
