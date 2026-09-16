'use client';

import React from 'react';
import { Minus, Plus, Music, Type } from 'lucide-react';
import { useNoteZoom, useLyricZoom } from '@/hooks/useScoreZoom';

export interface ZoomControlProps {
  idPrefix?: string;
  compact?: boolean;
  className?: string;
}

/**
 * Independent -/+ Zoom Control for Musical Notes (Numbered notation digits, octaves, accidentals, beams)
 */
export const NoteZoomControl: React.FC<ZoomControlProps> = ({
  idPrefix = 'note-zoom',
  compact = false,
  className = '',
}) => {
  const { zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut, zoomPercent } = useNoteZoom();

  const handleResetOrCycle = () => {
    if (zoomPercent !== 100) {
      resetZoom();
    } else {
      zoomIn();
    }
  };

  const isCustom = zoomPercent !== 100;

  if (compact) {
    return (
      <div
        id={`${idPrefix}-group`}
        className={`flex items-center bg-zinc-100 dark:bg-[#141720] p-0.5 rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 text-xs shrink-0 ${className}`}
      >
        <button
          id={`${idPrefix}-out-btn`}
          type="button"
          onClick={zoomOut}
          disabled={!canZoomOut}
          className="p-1 sm:px-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[36px] flex items-center justify-center"
          title="縮小音符大小 Zoom Out Notes (-)"
          aria-label="縮小音符大小 Zoom Out Notes"
        >
          <Minus className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
        </button>

        <button
          id={`${idPrefix}-reset-btn`}
          type="button"
          onClick={handleResetOrCycle}
          className={`px-2 py-1 font-mono font-bold text-xs rounded-md transition-all cursor-pointer touch-manipulation select-none flex items-center gap-1 min-h-[44px] ${
            isCustom
              ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25'
              : 'text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400'
          }`}
          title={`音符大小 Note Zoom: ${zoomPercent}% (點擊${isCustom ? '重設為 100%' : '放大至 110%'})`}
          aria-label={`Current Note Zoom ${zoomPercent}%`}
        >
          <Music className="w-3.5 h-3.5 text-amber-500 shrink-0" />
          <span className="font-mono text-[11px]">{zoomPercent}%</span>
        </button>

        <button
          id={`${idPrefix}-in-btn`}
          type="button"
          onClick={zoomIn}
          disabled={!canZoomIn}
          className="p-1 sm:px-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[36px] flex items-center justify-center"
          title="放大音符大小 Zoom In Notes (+)"
          aria-label="放大音符大小 Zoom In Notes"
        >
          <Plus className="w-3.5 h-3.5 text-amber-500" />
        </button>
      </div>
    );
  }

  return (
    <div
      id={`${idPrefix}-group`}
      className={`flex items-center bg-zinc-100 dark:bg-[#141720] p-0.5 rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 text-xs shrink-0 ${className}`}
    >
      <button
        id={`${idPrefix}-out-btn`}
        type="button"
        onClick={zoomOut}
        disabled={!canZoomOut}
        className="flex items-center justify-center p-1.5 sm:px-2.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[40px] shrink-0"
        title="縮小音符大小 Zoom Out Notes (-)"
        aria-label="Zoom out notes"
      >
        <Minus className="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-300" />
      </button>

      <button
        id={`${idPrefix}-reset-btn`}
        type="button"
        onClick={handleResetOrCycle}
        className={`px-2.5 py-1 font-mono font-bold text-xs rounded-md transition-all cursor-pointer touch-manipulation select-none flex items-center gap-1.5 shrink-0 min-h-[44px] ${
          isCustom
            ? 'text-amber-700 dark:text-amber-300 bg-amber-500/15 hover:bg-amber-500/25'
            : 'text-zinc-700 dark:text-zinc-300 hover:text-amber-600 dark:hover:text-amber-400'
        }`}
        title={`音符大小 Note Zoom: ${zoomPercent}% (點擊${isCustom ? '重設為 100%' : '放大至 110%'})`}
        aria-label={`Note zoom level ${zoomPercent}%`}
      >
        <Music className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <span className="font-mono text-xs">{zoomPercent}%</span>
      </button>

      <button
        id={`${idPrefix}-in-btn`}
        type="button"
        onClick={zoomIn}
        disabled={!canZoomIn}
        className="flex items-center justify-center p-1.5 sm:px-2.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[40px] shrink-0"
        title="放大音符大小 Zoom In Notes (+)"
        aria-label="Zoom in notes"
      >
        <Plus className="w-3.5 h-3.5 shrink-0 text-amber-500" />
      </button>
    </div>
  );
};

/**
 * Independent -/+ Zoom Control for Lyrics (Hàn-lô & POJ / Romanization)
 */
export const LyricZoomControl: React.FC<ZoomControlProps> = ({
  idPrefix = 'lyric-zoom',
  compact = false,
  className = '',
}) => {
  const { zoomIn, zoomOut, resetZoom, canZoomIn, canZoomOut, zoomPercent } = useLyricZoom();

  const handleResetOrCycle = () => {
    if (zoomPercent !== 100) {
      resetZoom();
    } else {
      zoomIn();
    }
  };

  const isCustom = zoomPercent !== 100;

  if (compact) {
    return (
      <div
        id={`${idPrefix}-group`}
        className={`flex items-center bg-zinc-100 dark:bg-[#141720] p-0.5 rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 text-xs shrink-0 ${className}`}
      >
        <button
          id={`${idPrefix}-out-btn`}
          type="button"
          onClick={zoomOut}
          disabled={!canZoomOut}
          className="p-1 sm:px-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[36px] flex items-center justify-center"
          title="縮小歌詞字級 Zoom Out Lyrics (-)"
          aria-label="縮小歌詞字級 Zoom Out Lyrics"
        >
          <Minus className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-300" />
        </button>

        <button
          id={`${idPrefix}-reset-btn`}
          type="button"
          onClick={handleResetOrCycle}
          className={`px-2 py-1 font-mono font-bold text-xs rounded-md transition-all cursor-pointer touch-manipulation select-none flex items-center gap-1 min-h-[44px] ${
            isCustom
              ? 'text-teal-700 dark:text-teal-300 bg-teal-500/15 hover:bg-teal-500/25'
              : 'text-zinc-700 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400'
          }`}
          title={`歌詞字級 Lyric Zoom: ${zoomPercent}% (點擊${isCustom ? '重設為 100%' : '放大至 110%'})`}
          aria-label={`Current Lyric Zoom ${zoomPercent}%`}
        >
          <Type className="w-3.5 h-3.5 text-teal-500 shrink-0" />
          <span className="font-mono text-[11px]">{zoomPercent}%</span>
        </button>

        <button
          id={`${idPrefix}-in-btn`}
          type="button"
          onClick={zoomIn}
          disabled={!canZoomIn}
          className="p-1 sm:px-2 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[36px] flex items-center justify-center"
          title="放大歌詞字級 Zoom In Lyrics (+)"
          aria-label="放大歌詞字級 Zoom In Lyrics"
        >
          <Plus className="w-3.5 h-3.5 text-teal-500" />
        </button>
      </div>
    );
  }

  return (
    <div
      id={`${idPrefix}-group`}
      className={`flex items-center bg-zinc-100 dark:bg-[#141720] p-0.5 rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 text-xs shrink-0 ${className}`}
    >
      <button
        id={`${idPrefix}-out-btn`}
        type="button"
        onClick={zoomOut}
        disabled={!canZoomOut}
        className="flex items-center justify-center p-1.5 sm:px-2.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[40px] shrink-0"
        title="縮小歌詞字級 Zoom Out Lyrics (-)"
        aria-label="Zoom out lyrics"
      >
        <Minus className="w-3.5 h-3.5 shrink-0 text-zinc-600 dark:text-zinc-300" />
      </button>

      <button
        id={`${idPrefix}-reset-btn`}
        type="button"
        onClick={handleResetOrCycle}
        className={`px-2.5 py-1 font-mono font-bold text-xs rounded-md transition-all cursor-pointer touch-manipulation select-none flex items-center gap-1.5 shrink-0 min-h-[44px] ${
          isCustom
            ? 'text-teal-700 dark:text-teal-300 bg-teal-500/15 hover:bg-teal-500/25'
            : 'text-zinc-700 dark:text-zinc-300 hover:text-teal-600 dark:hover:text-teal-400'
        }`}
        title={`歌詞字級 Lyric Zoom: ${zoomPercent}% (點擊${isCustom ? '重設為 100%' : '放大至 110%'})`}
        aria-label={`Lyric zoom level ${zoomPercent}%`}
      >
        <Type className="w-3.5 h-3.5 text-teal-500 shrink-0" />
        <span className="font-mono text-xs">{zoomPercent}%</span>
      </button>

      <button
        id={`${idPrefix}-in-btn`}
        type="button"
        onClick={zoomIn}
        disabled={!canZoomIn}
        className="flex items-center justify-center p-1.5 sm:px-2.5 rounded-lg text-zinc-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] min-w-[40px] shrink-0"
        title="放大歌詞字級 Zoom In Lyrics (+)"
        aria-label="Zoom in lyrics"
      >
        <Plus className="w-3.5 h-3.5 shrink-0 text-teal-500" />
      </button>
    </div>
  );
};

/**
 * Side-by-side or stacked container for both Note and Lyric zoom controls
 */
export const ScoreZoomControls: React.FC<{ compact?: boolean; className?: string }> = ({
  compact = false,
  className = '',
}) => {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <NoteZoomControl idPrefix="score-notes-zoom" compact={compact} />
      <LyricZoomControl idPrefix="score-lyrics-zoom" compact={compact} />
    </div>
  );
};
