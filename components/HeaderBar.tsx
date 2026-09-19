'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Song, InstrumentType, VerseDisplayOption } from '@/types/song';
import { PRESET_SONGS } from '@/lib/presets';
import { INSTRUMENT_OPTIONS, getVerseDisplayOption } from '@/lib/taigiUtils';
import {
  Music,
  Library,
  Play,
  Pause,
  Undo2,
  Redo2,
  Keyboard,
  X,
  Leaf,
  Battery,
  BatteryCharging,
  BatteryLow,
  FilePlus2,
  Save,
  Check,
  AlertCircle,
  ChevronDown,
  SlidersHorizontal,
  Download,
  Upload,
  Search,
  RotateCcw,
  RotateCw,
  Languages,
  Sparkles,
  Type,
  Share2,
} from 'lucide-react';
import { UiZoomControl } from '@/components/UiZoomControl';
import { NoteZoomControl, LyricZoomControl } from '@/components/ScoreZoomControls';
import { ChordPlaybackControl } from '@/components/ChordPlaybackControl';
import { MetronomePlaybackControl } from '@/components/MetronomePlaybackControl';
import { KeyboardShortcutsModal } from '@/components/composer/KeyboardShortcutsModal';
import { resetAllSettingsToDefault } from '@/lib/storage';

interface HeaderBarProps {
  song: Song;
  onSelectSong: (song: Song) => void;
  onStartFreshSong?: () => void;
  onOpenLyricSearch?: () => void;
  onOpenShare?: () => void;
  onOpenImportExport: (tab?: 'presets' | 'custom' | 'export' | 'import', format?: 'json' | 'text' | 'midi') => void;
  onOpenImportScore?: () => void;
  onOpenMidiExport?: () => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onUndo?: () => boolean;
  onRedo?: () => boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  pastCount?: number;
  futureCount?: number;
  isEcoMode?: boolean;
  onToggleEcoMode?: () => void;
  batteryLevel?: number | null;
  isCharging?: boolean | null;
  onSave?: () => void;
  isSaving?: boolean;
  isDirty?: boolean;
  saveSuccess?: boolean;
  saveError?: string | null;
  autosaveInterval?: number;
  onSetAutosaveInterval?: (intervalMs: number) => void;
  customSongs?: Song[];
  modifiedPresetIds?: Set<string>;
  instrument?: InstrumentType;
  onSetInstrument?: (instrument: InstrumentType) => void;
  isAnyModalOpen?: boolean;
  onResetPreset?: (presetId: string) => void;
  onResetAllPresets?: () => void;
  onRestoreDefaultSong?: () => void;
  onRestoreSettingsToDefault?: (options?: { restorePresetSong?: boolean }) => void;
  onUpdateSong?: (updatedSong: Song) => void;
}

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

export const HeaderBar: React.FC<HeaderBarProps> = ({
  song,
  onSelectSong,
  onStartFreshSong,
  onOpenLyricSearch,
  onOpenShare,
  onOpenImportExport,
  onOpenImportScore,
  onOpenMidiExport,
  isPlaying,
  onTogglePlay,
  onUndo,
  onRedo,
  canUndo = false,
  canRedo = false,
  pastCount = 0,
  futureCount = 0,
  isEcoMode = false,
  onToggleEcoMode,
  batteryLevel,
  isCharging,
  onSave,
  isSaving = false,
  isDirty = false,
  saveSuccess = false,
  saveError = null,
  autosaveInterval = 0,
  onSetAutosaveInterval,
  customSongs = [],
  modifiedPresetIds = new Set(),
  instrument = 'piano',
  onSetInstrument,
  isAnyModalOpen = false,
  onResetPreset,
  onResetAllPresets,
  onRestoreDefaultSong,
  onRestoreSettingsToDefault,
  onUpdateSong,
}) => {
  const [showKeyboardShortcuts, setShowKeyboardShortcuts] = useState(false);
  const [isStudioMenuOpen, setIsStudioMenuOpen] = useState<boolean>(false);
  const [isScoreActionMenuOpen, setIsScoreActionMenuOpen] = useState<boolean>(false);
  const [scoreMenuPos, setScoreMenuPos] = useState<{ top: number; left: number }>({ top: 48, left: 180 });
  const scoreBtnRef = useRef<HTMLButtonElement | null>(null);
  const [defaultRestoreNotice, setDefaultRestoreNotice] = useState<string | null>(null);
  const noticeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStudioOpen = isStudioMenuOpen && !isAnyModalOpen;
  const isScoreMenuOpen = isScoreActionMenuOpen && !isAnyModalOpen;

  const handleToggleScoreMenu = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!isScoreActionMenuOpen && scoreBtnRef.current) {
      const rect = scoreBtnRef.current.getBoundingClientRect();
      setScoreMenuPos({
        top: Math.round(rect.bottom + 6),
        left: Math.max(8, Math.min(Math.round(rect.left), typeof window !== 'undefined' ? window.innerWidth - 280 : 180)),
      });
    }
    setIsScoreActionMenuOpen(prev => !prev);
  }, [isScoreActionMenuOpen]);

  // Keep score menu aligned on window resize or scroll
  useEffect(() => {
    if (!isScoreMenuOpen) return;
    const updatePos = () => {
      if (scoreBtnRef.current) {
        const rect = scoreBtnRef.current.getBoundingClientRect();
        setScoreMenuPos({
          top: Math.round(rect.bottom + 6),
          left: Math.max(8, Math.min(Math.round(rect.left), window.innerWidth - 280)),
        });
      }
    };
    window.addEventListener('resize', updatePos);
    window.addEventListener('scroll', updatePos, { passive: true });
    return () => {
      window.removeEventListener('resize', updatePos);
      window.removeEventListener('scroll', updatePos);
    };
  }, [isScoreMenuOpen]);

  const showNotice = useCallback((msg: string) => {
    if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    setDefaultRestoreNotice(msg);
    noticeTimerRef.current = setTimeout(() => setDefaultRestoreNotice(null), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, []);

  const currentLyricOption = getVerseDisplayOption(song);
  const activeLyricOpt =
    currentLyricOption === 'both' ? 'both_poj_top' : (currentLyricOption || 'both_poj_top');
  const activeLyricIdx = Math.max(0, FORMAT_CYCLE.findIndex(item => item.id === activeLyricOpt));
  const activeLyricConfig = FORMAT_CYCLE[activeLyricIdx];
  const nextLyricConfig = FORMAT_CYCLE[(activeLyricIdx + 1) % FORMAT_CYCLE.length];

  const handleCycleLyricFormat = () => {
    if (onUpdateSong) {
      onUpdateSong({
        ...song,
        verseDisplayOption: nextLyricConfig.id,
      });
    }
  };

  const handleSelectLyricFormat = (optId: VerseDisplayOption) => {
    if (onUpdateSong) {
      onUpdateSong({
        ...song,
        verseDisplayOption: optId,
      });
    }
  };

  // Close Studio and Score popups when Escape is pressed
  useEffect(() => {
    if (!isStudioOpen && !isScoreMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsStudioMenuOpen(false);
        setIsScoreActionMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isStudioOpen, isScoreMenuOpen]);

  return (
    <header
      id="header-bar"
      className="sticky top-0 z-40 w-full bg-white/95 dark:bg-[#10121a]/95 backdrop-blur-md border-b border-zinc-200/90 dark:border-zinc-800/80 shadow-xs transition-colors select-none pl-[env(safe-area-inset-left,0px)] pr-[env(safe-area-inset-right,0px)] print:hidden"
    >
      <div className="w-full max-w-[1680px] mx-auto px-2 sm:px-3 h-11 sm:h-12 flex items-center justify-between gap-1 sm:gap-2 overflow-x-auto no-scrollbar touch-pan-x touch-momentum">
        {/* Left: Studio Brand & Active Song Selector */}
        <div className="flex items-center gap-1 sm:gap-1.5 min-w-0 shrink">
          <div className="relative flex items-center justify-center w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 text-zinc-950 font-black shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/50 shrink-0">
            <Music className={`w-3.5 h-3.5 shrink-0 ${isPlaying && !isEcoMode ? 'animate-bounce' : ''}`} />
            {isPlaying && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-zinc-950 animate-ping" />
            )}
          </div>

          {/* Song Quick Picker & Metadata Badge */}
          <div className="flex items-center gap-1 min-w-0">
            <div className="relative flex items-center min-w-0 max-w-[130px] sm:max-w-[180px] md:max-w-[220px] xl:max-w-[250px]">
              <select
                id="header-preset-song-select"
                value={song.id}
                onChange={e => {
                  const selectedPreset = PRESET_SONGS.find(p => p.id === e.target.value);
                  if (selectedPreset) {
                    onSelectSong(selectedPreset);
                    return;
                  }
                  const selectedCustom = customSongs.find(s => s.id === e.target.value);
                  if (selectedCustom) {
                    onSelectSong(selectedCustom);
                  }
                }}
                className="w-full text-xs font-bold bg-zinc-100 hover:bg-zinc-200/80 dark:bg-[#151822] dark:hover:bg-[#1a1e2b] border border-zinc-200/90 dark:border-zinc-700/80 text-zinc-900 dark:text-zinc-100 rounded-lg pl-2 pr-5 py-1 focus:outline-hidden focus:ring-1.5 focus:ring-amber-500 truncate cursor-pointer h-7.5 sm:h-8 transition-colors"
                title="Select Score (Presets and Custom Library)"
              >
                <optgroup label="Preset Songs">
                  {PRESET_SONGS.map(p => {
                    const isModified = modifiedPresetIds.has(p.id);
                    return (
                      <option key={p.id} value={p.id}>
                        {p.title} {isModified ? '★ (Modified)' : ''}
                      </option>
                    );
                  })}
                </optgroup>
                {customSongs.length > 0 && (
                  <optgroup label={`Custom Scores (${customSongs.length})`}>
                    {customSongs.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.title || 'Untitled Song'}
                      </option>
                    ))}
                  </optgroup>
                )}
              </select>
              <ChevronDown className="w-3 h-3 text-zinc-400 absolute right-1.5 pointer-events-none" />
            </div>

            {/* Quick Song Spec Chip */}
            <span className="hidden xl:inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 text-amber-800 dark:text-amber-300 font-mono font-bold border border-amber-400/30 whitespace-nowrap shrink-0">
              1={song.key} · {song.timeSignature} · {song.bpm}BPM
            </span>

            {/* New / Import Score Menu Quick Trigger */}
            <div className="relative shrink-0 flex items-center">
              <button
                ref={scoreBtnRef}
                id="header-new-song-btn"
                type="button"
                onClick={handleToggleScoreMenu}
                className={`relative z-10 flex items-center justify-center p-1 rounded-lg border text-xs font-bold transition-all active:scale-95 cursor-pointer h-7.5 w-7.5 sm:h-8 sm:w-8 shrink-0 touch-manipulation ${
                  isScoreMenuOpen
                    ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-xs'
                    : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#151822] dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-750'
                }`}
                title="Score Actions: Create New Blank Song or Import Score"
                aria-expanded={isScoreMenuOpen}
              >
                <FilePlus2 className={`w-3.5 h-3.5 shrink-0 ${isScoreMenuOpen ? 'text-zinc-950' : 'text-amber-500'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Master Transport & Consolidated Studio Tools */}
        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
          {/* Master Transport Backlit Play/Pause Button */}
          <button
            id="header-toggle-play-btn"
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation touch-target-expand h-7.5 sm:h-8 whitespace-nowrap shrink-0 ${
              isPlaying
                ? 'bg-amber-500 text-zinc-950 ring-1.5 ring-amber-400 shadow-sm shadow-amber-500/30 font-black'
                : 'bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white'
            }`}
            title={isPlaying ? 'Pause Playback (Space)' : 'Play Full Score (Space)'}
          >
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5 fill-current shrink-0" />
                <span className="hidden md:inline whitespace-nowrap">Pause</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current ml-0.5 shrink-0" />
                <span className="hidden md:inline whitespace-nowrap">Play</span>
              </>
            )}
          </button>

          {/* Master Instrument Selector */}
          {onSetInstrument && (
            <div
              id="header-instrument-selector"
              className="hidden md:flex items-center gap-1 bg-zinc-100 dark:bg-[#151822] px-2 py-0.5 rounded-lg border border-zinc-200/90 dark:border-zinc-750 text-xs h-7.5 sm:h-8 shrink-0 shadow-2xs"
            >
              <Music className="w-3 h-3 text-amber-500 shrink-0" />
              <select
                id="header-instrument-select"
                value={instrument}
                onChange={e => onSetInstrument(e.target.value as InstrumentType)}
                className="bg-transparent font-bold text-xs text-zinc-800 dark:text-zinc-200 focus:outline-hidden cursor-pointer touch-manipulation"
                title="Select Melody Instrument (Piano, Flute, Whistle, Guitar, Synth, Bell, Cello)"
              >
                {INSTRUMENT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">
                    {opt.labelEn}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Global Metronome Control on Toolbar */}
          <div className="hidden xl:flex items-center">
            <MetronomePlaybackControl variant="compact" idPrefix="header-bar-metronome" />
          </div>

          {/* User Save Button with Dirty Dot */}
          {onSave && (
            <button
              id="header-save-btn"
              type="button"
              onClick={onSave}
              disabled={isSaving}
              className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation touch-target-expand h-7.5 sm:h-8 shrink-0 border ${
                isSaving
                  ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-400/40'
                  : saveError
                  ? 'bg-rose-500 text-white font-black border-rose-400 shadow-xs'
                  : saveSuccess
                  ? 'bg-emerald-500 text-white font-black border-emerald-400 shadow-xs'
                  : isDirty
                  ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black border-amber-400 shadow-xs'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#151822] dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border-zinc-200/90 dark:border-zinc-750'
              }`}
              title={
                saveError
                  ? saveError
                  : isDirty
                  ? 'Save changes to IndexedDB [Ctrl+S] (unsaved edits pending)'
                  : 'Changes saved safely in IndexedDB [Ctrl+S]'
              }
            >
              {saveError ? (
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              ) : saveSuccess ? (
                <Check className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Save className={`w-3.5 h-3.5 shrink-0 ${isDirty ? 'text-zinc-950' : 'text-amber-500'}`} />
              )}
              <span className="hidden sm:inline whitespace-nowrap">
                {isSaving
                  ? 'Saving...'
                  : saveError
                  ? 'Save failed'
                  : saveSuccess
                  ? 'Saved'
                  : isDirty
                  ? 'Save*'
                  : 'Save'}
              </span>
              {isDirty && !isSaving && !saveSuccess && !saveError && (
                <span className="w-1.5 h-1.5 rounded-full bg-amber-950 dark:bg-amber-900 animate-ping inline-block shrink-0" />
              )}
            </button>
          )}

          {/* Master Transport Undo / Redo Module */}
          {onUndo && onRedo && (
            <div
              id="header-undo-redo-group"
              className="flex items-center bg-zinc-100 dark:bg-[#151822] p-0.5 rounded-lg border border-zinc-200/90 dark:border-zinc-750 h-7.5 sm:h-8 shrink-0"
            >
              <button
                id="header-undo-btn"
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title={canUndo ? `Undo [Ctrl+Z / ⌘Z] · ${pastCount} step(s)` : 'Nothing to undo'}
                aria-label="Undo"
                className="flex items-center justify-center p-1 rounded text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation touch-target-expand h-6.5 w-6.5 shrink-0"
              >
                <Undo2 className="w-3.5 h-3.5 shrink-0" />
              </button>

              <div className="w-[1px] h-3.5 bg-zinc-300 dark:bg-zinc-700 mx-0.5" />

              <button
                id="header-redo-btn"
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title={canRedo ? `Redo [Ctrl+Y / ⌘Shift+Z] · ${futureCount} step(s)` : 'Nothing to redo'}
                aria-label="Redo"
                className="flex items-center justify-center p-1 rounded text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation touch-target-expand h-6.5 w-6.5 shrink-0"
              >
                <Redo2 className="w-3.5 h-3.5 shrink-0" />
              </button>
            </div>
          )}

          {/* Quick Lyric Search Trigger */}
          {onOpenLyricSearch && (
            <button
              id="header-top-search-btn"
              type="button"
              onClick={onOpenLyricSearch}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold transition-all active:scale-95 cursor-pointer h-7.5 sm:h-8 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#151822] dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-750 shrink-0 touch-manipulation touch-target-expand"
              title="Search Lyrics & Notes [Ctrl+K / ⌘K]"
            >
              <Search className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden xl:inline whitespace-nowrap">Search</span>
              <kbd className="hidden lg:inline text-[9px] px-1 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700/80 font-mono font-bold text-zinc-600 dark:text-zinc-400">⌘K</kbd>
            </button>
          )}

          {/* Quick Share Trigger */}
          {onOpenShare && (
            <button
              id="header-top-share-btn"
              type="button"
              onClick={onOpenShare}
              className="flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold transition-all active:scale-95 cursor-pointer h-7.5 sm:h-8 bg-zinc-100 hover:bg-zinc-200 dark:bg-[#151822] dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-750 shrink-0 touch-manipulation touch-target-expand"
              title="Share Score with App URL"
            >
              <Share2 className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="hidden xl:inline whitespace-nowrap">Share</span>
            </button>
          )}

          {/* Consolidated Studio Menu Dropdown Trigger (⋯ / Sliders) */}
          <button
            id="header-studio-menu-btn"
            type="button"
            onClick={() => setIsStudioMenuOpen(prev => !prev)}
            className={`flex items-center gap-1 px-2 sm:px-2.5 py-1 rounded-lg border text-xs font-bold transition-all active:scale-95 cursor-pointer h-7.5 sm:h-8 shrink-0 touch-manipulation touch-target-expand ${
              isStudioOpen
                ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-xs font-black'
                : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-[#151822] dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-750'
            }`}
            title="Studio Tools & Settings"
            aria-expanded={isStudioOpen}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Studio</span>
            {isEcoMode && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" title="Eco Mode Active" />
            )}
            <ChevronDown className={`w-3 h-3 transition-transform duration-200 shrink-0 ${isStudioOpen ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Click-away backdrop */}
      {isStudioOpen && (
        <div
          id="header-studio-menu-backdrop"
          className="fixed inset-0 z-40 bg-black/25 dark:bg-black/45 backdrop-blur-[1px] animate-in fade-in duration-150"
          onClick={() => setIsStudioMenuOpen(false)}
        />
      )}

      {/* Consolidated Studio Menu Popover Card - Viewport Clamped & Never Clipped */}
      {isStudioOpen && (
        <div
          id="header-studio-menu-popover"
          role="dialog"
          aria-modal="true"
          aria-label="Studio Settings & Tools"
          className="fixed top-12 sm:top-13 right-2 sm:right-4 z-50 w-[min(384px,calc(100vw-16px))] max-h-[calc(100dvh-56px)] overflow-y-auto no-scrollbar touch-momentum p-3.5 bg-white dark:bg-[#141720] border border-zinc-200 dark:border-zinc-750 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-3"
        >
          {/* Header in Popover */}
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-amber-500 shrink-0" />
              <span className="font-extrabold text-xs text-zinc-900 dark:text-zinc-100 uppercase tracking-wider">
                Studio Settings & Tools
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsStudioMenuOpen(false)}
              className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Section 1: Playback Accompaniment & Audio */}
          <div className="flex flex-col gap-2">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Accompaniment & Playback
            </span>

            {/* Instrument Timbre Selector */}
            {onSetInstrument && (
              <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Music className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                      Melody Instrument
                    </span>
                  </div>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono font-bold">
                    {INSTRUMENT_OPTIONS.find(o => o.value === instrument)?.labelEn}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {INSTRUMENT_OPTIONS.map(opt => {
                    const isSelected = instrument === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => onSetInstrument(opt.value)}
                        className={`px-2 py-1.5 rounded-lg text-xs font-bold text-left flex items-center justify-between transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-zinc-950 shadow-xs'
                            : 'bg-white/80 dark:bg-zinc-800/80 hover:bg-zinc-200/60 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200'
                        }`}
                      >
                        <span className="truncate">{opt.labelEn}</span>
                        {isSelected && <Check className="w-3 h-3 text-zinc-950 stroke-[3] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Chord Playback Control */}
            <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  Chord Accompaniment & Volume
                </span>
              </div>
              <ChordPlaybackControl variant="toolbar" previewKeyChord={song.key} idPrefix="header-chord" />
            </div>

            {/* Global Metronome Control */}
            <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  Global Metronome & Volume
                </span>
              </div>
              <MetronomePlaybackControl variant="toolbar" idPrefix="header-metronome" />
            </div>

            {/* Eco / Power Save Mode */}
            {onToggleEcoMode && (
              <button
                id="header-popover-eco-btn"
                type="button"
                onClick={onToggleEcoMode}
                className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                  isEcoMode
                    ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300 border-emerald-500/40 shadow-xs'
                    : 'bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border-zinc-200 dark:border-zinc-750'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Leaf className={`w-4 h-4 shrink-0 ${isEcoMode ? 'text-emerald-500 fill-emerald-500' : 'text-zinc-400 dark:text-zinc-400'}`} />
                  <div className="flex flex-col text-left">
                    <span className="font-bold">{isEcoMode ? 'Eco Mode Active' : 'Eco Mode (Power Saver)'}</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {isEcoMode ? 'Screen sleep allowed · Lightweight audio' : 'Light audio · Lower GPU load'}
                    </span>
                  </div>
                </div>
                {typeof batteryLevel === 'number' && (
                  <span className="text-[11px] font-mono flex items-center gap-1 text-zinc-500 dark:text-zinc-400">
                    {isCharging ? (
                      <BatteryCharging className="w-3.5 h-3.5 text-emerald-500" />
                    ) : batteryLevel <= 0.2 ? (
                      <BatteryLow className="w-3.5 h-3.5 text-rose-500" />
                    ) : (
                      <Battery className="w-3.5 h-3.5" />
                    )}
                    <span>{Math.round(batteryLevel * 100)}%</span>
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Section 2: Lyric Display Format (4-Stage Rotational Toggle & Direct Selector) */}
          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-amber-500" />
                <span>Lyric Display Format</span>
              </span>
              {/* Quick Cycle Rotational Button */}
              <button
                id="header-studio-rotational-cycle-btn"
                type="button"
                onClick={handleCycleLyricFormat}
                className="group flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-400 text-[10px] font-bold transition-all cursor-pointer border border-amber-500/30 touch-manipulation active:scale-95"
                title={`Click to rotate format to: ${nextLyricConfig.label} (${nextLyricConfig.desc})`}
              >
                <span>Rotate</span>
                <RotateCw className="w-2.5 h-2.5 group-hover:rotate-180 transition-all duration-300 shrink-0" />
              </button>
            </div>

            <div className="p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  4-Format Display Support
                </span>
                <span className="text-[10px] font-mono font-bold text-amber-600 dark:text-amber-400">
                  {activeLyricConfig.label} {activeLyricConfig.badge ? `(${activeLyricConfig.badge})` : ''}
                </span>
              </div>

              {/* 4 Format Direct Option Cards */}
              <div className="grid grid-cols-2 gap-1.5">
                {FORMAT_CYCLE.map(opt => {
                  const isSelected = activeLyricOpt === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectLyricFormat(opt.id)}
                      className={`p-2 rounded-xl text-left flex flex-col justify-between gap-1 transition-all cursor-pointer border touch-manipulation min-h-[58px] ${
                        isSelected
                          ? 'bg-amber-500 text-zinc-950 border-amber-400 shadow-xs ring-1 ring-amber-400/50'
                          : 'bg-white/90 dark:bg-zinc-800/90 hover:bg-zinc-200/70 dark:hover:bg-zinc-750 text-zinc-800 dark:text-zinc-200 border-zinc-200/80 dark:border-zinc-700'
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

              {/* Single 4-Stage Rotational Toggle Button (Moved from HUD) */}
              <div className="flex items-center justify-between pt-1.5 border-t border-zinc-200 dark:border-zinc-750">
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Single Rotational Toggle:
                </span>
                <button
                  id="studio-settings-rotational-toggle-btn"
                  type="button"
                  onClick={handleCycleLyricFormat}
                  className="group flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white dark:bg-zinc-800 hover:bg-amber-50 dark:hover:bg-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs border border-zinc-300 dark:border-zinc-650 text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation"
                  title={`Lyric Format: ${activeLyricConfig.label} (${activeLyricConfig.desc}). Click to rotate to ${nextLyricConfig.label} (${nextLyricConfig.desc})`}
                >
                  <span className={activeLyricConfig.isSerif ? 'font-serif italic tracking-wide' : ''}>
                    {activeLyricConfig.label}
                  </span>
                  {activeLyricConfig.badge && (
                    <span className="text-[9px] font-medium px-1 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 leading-none">
                      {activeLyricConfig.badge}
                    </span>
                  )}
                  <RotateCw className="w-3 h-3 text-zinc-400 group-hover:text-amber-600 dark:group-hover:text-amber-400 group-hover:rotate-180 transition-all duration-300 shrink-0" />
                </button>
              </div>
            </div>
          </div>

          {/* Section 3: Score & UI Zoom */}
          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                Score & UI Zoom
              </span>
            </div>

            {/* Note Zoom (-/+) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
              <div className="flex items-center gap-2">
                <Music className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                    Notes Zoom
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Scale numbered notation digits & beams
                  </span>
                </div>
              </div>
              <NoteZoomControl idPrefix="header-menu-note-zoom" />
            </div>

            {/* Lyric Zoom (-/+) */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
              <div className="flex items-center gap-2">
                <Type className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400 shrink-0" />
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                    Lyrics Zoom
                  </span>
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                    Scale Hàn-lô & POJ lyrics
                  </span>
                </div>
              </div>
              <LyricZoomControl idPrefix="header-menu-lyric-zoom" />
            </div>

            {/* UI Text Zoom */}
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  UI Text Zoom
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                  Global app interface scaling
                </span>
              </div>
              <UiZoomControl idPrefix="header-menu-ui-zoom" />
            </div>

            {/* Autosave Interval */}
            {onSetAutosaveInterval && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100/80 dark:bg-zinc-850 border border-zinc-200 dark:border-zinc-750">
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-100">
                  Autosave Frequency
                </span>
                <select
                  id="header-menu-autosave-select"
                  value={autosaveInterval}
                  onChange={e => onSetAutosaveInterval(Number(e.target.value))}
                  className="text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 text-zinc-800 dark:text-zinc-100 px-2.5 py-1 rounded-lg cursor-pointer focus:outline-hidden"
                >
                  <option value={0}>Manual Only (Default)</option>
                  <option value={60000}>Every 1 min</option>
                  <option value={180000}>Every 3 mins</option>
                  <option value={300000}>Every 5 mins</option>
                  <option value={600000}>Every 10 mins</option>
                </select>
              </div>
            )}
          </div>

          {/* Section 3: Creation & Repertoire Tools */}
          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
              Score Tools & Repertoire
            </span>

            <div className="grid grid-cols-2 gap-2">
              {/* Song Library */}
              <button
                type="button"
                onClick={() => {
                  setIsStudioMenuOpen(false);
                  onOpenImportExport('presets');
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-750 text-xs font-bold transition-all cursor-pointer"
              >
                <Library className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Score Repertoire</span>
              </button>

              {/* Import Score */}
              <button
                id="studio-menu-import-score-btn"
                type="button"
                onClick={() => {
                  setIsStudioMenuOpen(false);
                  if (onOpenImportScore) {
                    onOpenImportScore();
                  } else {
                    onOpenImportExport('import');
                  }
                }}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-750 text-xs font-bold transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-amber-500 shrink-0" />
                <span>Import Score</span>
              </button>

              {/* MIDI Export */}
              {onOpenMidiExport && (
                <button
                  type="button"
                  onClick={() => {
                    setIsStudioMenuOpen(false);
                    onOpenMidiExport();
                  }}
                  className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-750 text-xs font-bold transition-all cursor-pointer"
                >
                  <Download className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Export MIDI File</span>
                </button>
              )}

              {/* Share Score via App URL */}
              {onOpenShare && (
                <button
                  id="studio-menu-share-score-btn"
                  type="button"
                  onClick={() => {
                    setIsStudioMenuOpen(false);
                    onOpenShare();
                  }}
                  className="col-span-2 flex items-center justify-center gap-2 p-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-900 dark:text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
                >
                  <Share2 className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                  <span>Share Song via App URL</span>
                </button>
              )}
            </div>

            {/* Shortcuts Button */}
            <button
              type="button"
              onClick={() => {
                setIsStudioMenuOpen(false);
                setShowKeyboardShortcuts(true);
              }}
              className="flex items-center justify-center gap-2 p-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold text-xs transition-colors cursor-pointer"
            >
              <Keyboard className="w-4 h-4 text-zinc-500 dark:text-zinc-400 shrink-0" />
              <span>Keyboard Shortcuts Guide</span>
            </button>
          </div>

          {/* Section 4: System & Defaults */}
          <div className="flex flex-col gap-2 pt-1 border-t border-zinc-200 dark:border-zinc-800">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                System & Defaults
              </span>
              {defaultRestoreNotice && (
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 animate-in fade-in">
                  <Check className="w-3 h-3" />
                  {defaultRestoreNotice}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              {/* Restore All Settings to Default */}
              <button
                id="header-restore-settings-btn"
                type="button"
                onClick={() => {
                  if (window.confirm('Are you sure you want to restore all studio settings (instruments, volume, metronome, zoom, and editing preferences) to factory defaults?')) {
                    if (onRestoreSettingsToDefault) {
                      onRestoreSettingsToDefault();
                    } else {
                      resetAllSettingsToDefault();
                    }
                    showNotice('Settings restored to defaults!');
                  }
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-750 text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[44px]"
                title="Reset all studio, playback, input and display settings to defaults"
              >
                <div className="flex items-center gap-2">
                  <RotateCcw className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold">Restore Settings to Default</span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      Reset volume, metronome, chord, zoom & input preferences
                    </span>
                  </div>
                </div>
              </button>

              {/* Restore Preset Song(s) */}
              <button
                id="header-restore-preset-song-btn"
                type="button"
                onClick={() => {
                  const matchingPreset = PRESET_SONGS.find(p => p.id === song.id || p.id === song.originalPresetId);
                  if (matchingPreset) {
                    if (window.confirm(`Are you sure you want to restore "${matchingPreset.title}" to factory preset? This will clear all your modifications on this song.`)) {
                      if (onResetPreset) {
                        onResetPreset(matchingPreset.id);
                      }
                      showNotice(`Restored "${matchingPreset.title}" to default!`);
                    }
                  } else {
                    if (window.confirm('Are you sure you want to load factory default song "Bāng Chhun-hong"?')) {
                      if (onRestoreDefaultSong) {
                        onRestoreDefaultSong();
                      } else if (onResetPreset) {
                        onResetPreset(PRESET_SONGS[0].id);
                      }
                      showNotice('Restored default song "Bāng Chhun-hong"!');
                    }
                  }
                }}
                className="flex items-center justify-between p-2.5 rounded-xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 border border-zinc-200 dark:border-zinc-750 text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[44px]"
                title="Restore preset song to original factory score"
              >
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex flex-col text-left">
                    <span className="font-bold">
                      {PRESET_SONGS.some(p => p.id === song.id) ? `Restore Preset Song (${song.title})` : 'Restore Default Song (Bāng Chhun-hong)'}
                    </span>
                    <span className="text-[10px] text-zinc-500 dark:text-zinc-400">
                      {PRESET_SONGS.some(p => p.id === song.id)
                        ? 'Revert current preset song back to pristine factory score'
                        : 'Load factory default preset score: Bāng Chhun-hong'}
                    </span>
                  </div>
                </div>
              </button>

              {/* If any preset has been modified across library, offer Restore All Presets */}
              {modifiedPresetIds && modifiedPresetIds.size > 0 && onResetAllPresets && (
                <button
                  id="header-restore-all-presets-btn"
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to restore all ${modifiedPresetIds.size} modified preset songs to factory defaults?`)) {
                      onResetAllPresets();
                      showNotice(`Restored all ${modifiedPresetIds.size} preset songs!`);
                    }
                  }}
                  className="flex items-center gap-2 p-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[40px]"
                >
                  <RotateCcw className="w-3.5 h-3.5 shrink-0" />
                  <span>Restore All Preset Songs ({modifiedPresetIds.size} modified)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Click-away backdrop for Score Action Menu */}
      {isScoreMenuOpen && (
        <div
          id="header-score-menu-backdrop"
          className="fixed inset-0 z-40 bg-black/25 dark:bg-black/45 backdrop-blur-[0.5px] animate-in fade-in duration-150"
          onClick={() => setIsScoreActionMenuOpen(false)}
        />
      )}

      {/* Score Actions Popover Card - Positioned below the button, never clipped */}
      {isScoreMenuOpen && (
        <div
          id="header-score-menu-popover"
          role="menu"
          aria-label="Score Options"
          style={{
            top: `${scoreMenuPos.top}px`,
            left: `${scoreMenuPos.left}px`,
          }}
          className="fixed z-50 w-68 sm:w-72 p-2 bg-white dark:bg-[#141720] border border-zinc-200 dark:border-zinc-750 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-150 flex flex-col gap-1 text-left"
        >
          <div className="px-2.5 py-1.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
              Score Actions
            </span>
            <button
              type="button"
              onClick={() => setIsScoreActionMenuOpen(false)}
              className="p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 1. Share Song Link Button */}
          {onOpenShare && (
            <button
              id="header-menu-share-song-btn"
              type="button"
              onClick={() => {
                setIsScoreActionMenuOpen(false);
                onOpenShare();
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-amber-500/10 text-zinc-800 dark:text-zinc-100 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors">
                <Share2 className="w-3.5 h-3.5" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Share Song Link
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  Copy direct app URL to share score
                </span>
              </div>
            </button>
          )}

          {/* 2. Import Score Button */}
          <button
            id="header-menu-import-score-btn"
            type="button"
            onClick={() => {
              setIsScoreActionMenuOpen(false);
              if (onOpenImportScore) {
                onOpenImportScore();
              } else {
                onOpenImportExport('import');
              }
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-amber-500/10 text-zinc-800 dark:text-zinc-100 hover:text-amber-700 dark:hover:text-amber-400 transition-colors cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 group-hover:bg-amber-500 group-hover:text-zinc-950 transition-colors">
              <Upload className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Import Score
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                Load JSON or Text notation file
              </span>
            </div>
          </button>

          {/* 2. New Blank Song Button */}
          {onStartFreshSong && (
            <button
              id="header-menu-new-song-btn"
              type="button"
              onClick={() => {
                setIsScoreActionMenuOpen(false);
                onStartFreshSong();
              }}
              className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer group"
            >
              <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
                <FilePlus2 className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                  Create New Blank Song
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                  Start fresh score (Key C, 4/4, 80 BPM)
                </span>
              </div>
            </button>
          )}

          {/* 3. Repertoire / Presets */}
          <button
            id="header-menu-repertoire-btn"
            type="button"
            onClick={() => {
              setIsScoreActionMenuOpen(false);
              onOpenImportExport('presets');
            }}
            className="w-full flex items-center gap-2.5 p-2 rounded-xl text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-100 transition-colors cursor-pointer group"
          >
            <div className="w-7 h-7 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700">
              <Library className="w-3.5 h-3.5 text-zinc-500" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                Score Repertoire & Presets
              </span>
              <span className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
                Browse factory scores and library
              </span>
            </div>
          </button>
        </div>
      )}

      {/* Keyboard Shortcuts Modal */}
      <KeyboardShortcutsModal
        isOpen={showKeyboardShortcuts}
        onClose={() => setShowKeyboardShortcuts(false)}
      />
    </header>
  );
};
