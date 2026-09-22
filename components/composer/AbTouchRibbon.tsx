'use client';

import React, { useState } from 'react';
import {
  Play,
  Square,
  Repeat,
  Copy,
  Clipboard,
  Trash2,
  ChevronLeft,
  ChevronRight,
  X,
  Music,
  FileText,
  Check,
  CornerDownRight,
  CornerDownLeft,
  MoreHorizontal,
} from 'lucide-react';
import type { Song, AbRange } from '@/types/song';
import { getExpectedMeasureBeats } from '@/lib/taigiUtils';

export interface AbTouchRibbonProps {
  song: Song;
  abRange: AbRange;
  onChangeAbRange: (range: AbRange) => void;
  isPlayingAb: boolean;
  isLoopingAb: boolean;
  onTogglePlayAb: () => void;
  onToggleLoopAb: () => void;
  onCopyAb: () => void;
  hasClipboardMeasures?: boolean;
  clipboardCount?: number;
  onPasteAb: (mode: 'insert_after' | 'insert_before' | 'replace') => void;
  onDeleteAb: () => void;
  onDuplicateAb: () => void;
  onTransposeAb: (stepDelta: number) => void;
  onClearLyricsAb: () => void;
  onAutoHarmonizeAb?: () => void;
  onSnapBar: () => void;
  onSnapLine: () => void;
  onSnapSection: () => void;
  onClose: () => void;
  sheetTheme?: 'light' | 'dark';
}

export const AbTouchRibbon: React.FC<AbTouchRibbonProps> = ({
  song,
  abRange,
  onChangeAbRange,
  isPlayingAb,
  isLoopingAb,
  onTogglePlayAb,
  onToggleLoopAb,
  onCopyAb,
  hasClipboardMeasures = false,
  clipboardCount = 0,
  onPasteAb,
  onDeleteAb,
  onDuplicateAb,
  onTransposeAb,
  onClearLyricsAb,
  onAutoHarmonizeAb,
  onSnapBar,
  onSnapLine,
  onSnapSection,
  onClose,
  sheetTheme = 'light',
}) => {
  const [showMoreMenu, setShowMoreMenu] = useState<boolean>(false);
  const [showPasteOptions, setShowPasteOptions] = useState<boolean>(false);

  const startMeasureNumber = (abRange.startMeasureIndex ?? 0) + 1;
  const endMeasureNumber = (abRange.endMeasureIndex ?? 0) + 1;
  const selectedBarCount = Math.max(1, endMeasureNumber - startMeasureNumber + 1);

  // Total beats in the A-B range based on actual notes and meter
  const totalBeats = React.useMemo(() => {
    let beats = 0;
    const start = Math.max(0, abRange.startMeasureIndex);
    const end = Math.min(song.measures.length - 1, abRange.endMeasureIndex);
    for (let i = start; i <= end; i++) {
      const m = song.measures[i];
      if (m) {
        let mBeats = 0;
        m.notes?.forEach(n => {
          if (n.pitch !== 'empty' && typeof n.duration === 'number' && n.duration > 0) {
            mBeats += n.duration;
          }
        });
        const expected = getExpectedMeasureBeats(m.timeSignature || song.timeSignature || '4/4');
        beats += mBeats > 0 ? mBeats : expected;
      }
    }
    return Math.round(beats * 100) / 100;
  }, [song.measures, song.timeSignature, abRange]);

  // Fine-tuning nudge handlers
  const handleNudgeStart = (delta: number) => {
    const nextStart = Math.max(0, Math.min(abRange.endMeasureIndex, abRange.startMeasureIndex + delta));
    onChangeAbRange({
      startMeasureIndex: nextStart,
      endMeasureIndex: abRange.endMeasureIndex,
    });
  };

  const handleNudgeEnd = (delta: number) => {
    const nextEnd = Math.max(
      abRange.startMeasureIndex,
      Math.min(song.measures.length - 1, abRange.endMeasureIndex + delta)
    );
    onChangeAbRange({
      startMeasureIndex: abRange.startMeasureIndex,
      endMeasureIndex: nextEnd,
    });
  };

  return (
    <div
      id="ab-touch-ribbon-container"
      className="w-full max-w-5xl pointer-events-auto select-none touch-manipulation animate-in fade-in slide-in-from-bottom-2 duration-150 mb-1 px-1 relative"
    >
      {/* Tap-outside overlay to dismiss popover menus on iPad */}
      {(showPasteOptions || showMoreMenu) && (
        <div
          className="fixed inset-0 z-40 bg-transparent"
          onClick={() => {
            setShowPasteOptions(false);
            setShowMoreMenu(false);
          }}
          aria-hidden="true"
        />
      )}

      <div
        className={`relative z-40 w-full max-w-full min-w-0 flex flex-wrap items-center justify-between gap-1.5 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border shadow-xl ${
          sheetTheme === 'dark'
            ? 'bg-[#161a23]/95 border-amber-500/40 text-zinc-100'
            : 'bg-white/95 border-amber-400 text-zinc-900'
        }`}
      >
        {/* Left: Range Indicator & Nudge Buttons */}
        <div className="flex items-center gap-1 shrink-0">
          <span className="flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-zinc-950 rounded-lg text-xs font-black shadow-xs min-h-[32px]">
            <span>A-B</span>
            <span className="font-mono">
              #{startMeasureNumber}–#{endMeasureNumber}
            </span>
          </span>

          <span className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 hidden sm:inline px-0.5">
            {selectedBarCount} {selectedBarCount === 1 ? 'bar' : 'bars'} · {totalBeats} beats
          </span>

          {/* Nudge Start Bar [‹ A ›] */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
            <button
              type="button"
              onClick={() => handleNudgeStart(-1)}
              disabled={abRange.startMeasureIndex <= 0}
              className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer touch-manipulation"
              title="Expand Point A left by 1 measure"
              aria-label="Nudge Point A left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-1 font-mono text-amber-600 dark:text-amber-400">A</span>
            <button
              type="button"
              onClick={() => handleNudgeStart(1)}
              disabled={abRange.startMeasureIndex >= abRange.endMeasureIndex}
              className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer touch-manipulation"
              title="Shrink Point A right by 1 measure"
              aria-label="Nudge Point A right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Nudge End Bar [‹ B ›] */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
            <button
              type="button"
              onClick={() => handleNudgeEnd(-1)}
              disabled={abRange.endMeasureIndex <= abRange.startMeasureIndex}
              className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer touch-manipulation"
              title="Shrink Point B left by 1 measure"
              aria-label="Nudge Point B left"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-bold px-1 font-mono text-amber-600 dark:text-amber-400">B</span>
            <button
              type="button"
              onClick={() => handleNudgeEnd(1)}
              disabled={abRange.endMeasureIndex >= song.measures.length - 1}
              className="w-8 h-8 sm:w-9 sm:h-9 min-w-[32px] min-h-[32px] flex items-center justify-center rounded text-zinc-700 dark:text-zinc-300 disabled:opacity-30 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer touch-manipulation"
              title="Expand Point B right by 1 measure"
              aria-label="Nudge Point B right"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Play, Loop, Copy, Paste, Delete Actions */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Play / Stop A-B Button */}
          <button
            id="ab-play-toggle-btn"
            type="button"
            onClick={onTogglePlayAb}
            className={`flex items-center gap-1.5 px-3 h-8 sm:h-9 min-h-[36px] rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer touch-manipulation shadow-xs active:scale-95 ${
              isPlayingAb
                ? 'bg-rose-600 hover:bg-rose-500 text-white font-black animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white font-black'
            }`}
            title={isPlayingAb ? 'Stop A-B playback' : 'Play A-B section'}
          >
            {isPlayingAb ? <Square className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current" />}
            <span>{isPlayingAb ? 'Stop' : 'Play A-B'}</span>
          </button>

          {/* Loop A-B Toggle */}
          <button
            id="ab-loop-toggle-btn"
            type="button"
            onClick={onToggleLoopAb}
            className={`flex items-center gap-1 px-2.5 h-8 sm:h-9 min-h-[36px] rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
              isLoopingAb
                ? 'bg-amber-500 text-zinc-950 font-black ring-2 ring-amber-400'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={isLoopingAb ? 'Loop active: continuously repeats A-B section' : 'Enable continuous A-B loop'}
            aria-pressed={isLoopingAb}
          >
            <Repeat className={`w-3.5 h-3.5 ${isLoopingAb ? 'stroke-[2.5]' : ''}`} />
            <span className="hidden sm:inline">Loop</span>
          </button>

          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-700 mx-0.5" />

          {/* Copy A-B */}
          <button
            id="ab-copy-btn"
            type="button"
            onClick={onCopyAb}
            className="flex items-center gap-1 px-2.5 h-8 sm:h-9 min-h-[36px] rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 text-xs font-bold transition-all cursor-pointer touch-manipulation"
            title="Copy measures in A-B range to clipboard (Cmd+C)"
          >
            <Copy className="w-3.5 h-3.5 text-amber-500" />
            <span className="hidden sm:inline">Copy</span>
          </button>

          {/* Paste Options */}
          <div className="relative">
            <button
              id="ab-paste-btn"
              type="button"
              onClick={() => {
                if (hasClipboardMeasures) {
                  setShowPasteOptions(prev => !prev);
                  setShowMoreMenu(false);
                }
              }}
              disabled={!hasClipboardMeasures}
              className={`flex items-center gap-1 px-2.5 h-8 sm:h-9 min-h-[36px] rounded-lg text-xs font-bold transition-all touch-manipulation ${
                hasClipboardMeasures
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-400 dark:text-zinc-600 opacity-50 cursor-not-allowed'
              }`}
              title={
                hasClipboardMeasures
                  ? `Paste ${clipboardCount} copied measure(s)`
                  : 'Clipboard is empty (Copy an A-B section first)'
              }
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste</span>
              {clipboardCount > 0 && (
                <span className="text-[10px] font-mono bg-white/20 px-1 rounded">
                  {clipboardCount}
                </span>
              )}
            </button>

            {/* Paste Mode Dropdown */}
            {showPasteOptions && hasClipboardMeasures && (
              <div
                className={`absolute left-0 bottom-full mb-2 w-52 rounded-xl border shadow-2xl p-1.5 z-50 flex flex-col gap-1 ${
                  sheetTheme === 'dark' ? 'bg-[#151921] border-zinc-700' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="text-[10px] font-bold text-zinc-400 uppercase px-2 py-1">
                  Paste Options
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onPasteAb('insert_after');
                    setShowPasteOptions(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer touch-manipulation min-h-[36px]"
                >
                  <span>Insert After Point B</span>
                  <CornerDownRight className="w-3.5 h-3.5 text-indigo-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPasteAb('insert_before');
                    setShowPasteOptions(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer touch-manipulation min-h-[36px]"
                >
                  <span>Insert Before Point A</span>
                  <CornerDownLeft className="w-3.5 h-3.5 text-indigo-500" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onPasteAb('replace');
                    setShowPasteOptions(false);
                  }}
                  className="w-full flex items-center justify-between p-2 rounded-lg text-left text-xs font-bold hover:bg-rose-50 dark:hover:bg-rose-950/40 text-rose-600 dark:text-rose-400 cursor-pointer touch-manipulation min-h-[36px]"
                >
                  <span>Replace A-B Range</span>
                  <Check className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Delete A-B */}
          <button
            id="ab-delete-btn"
            type="button"
            onClick={onDeleteAb}
            className="flex items-center gap-1 px-2.5 h-8 sm:h-9 min-h-[36px] rounded-lg bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-950/70 text-rose-600 dark:text-rose-400 text-xs font-bold transition-all cursor-pointer touch-manipulation"
            title="Delete measures within A-B range (Shift+Backspace)"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Delete</span>
          </button>
        </div>

        {/* Right: Smart Snaps & More Menu */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Smart Snap Pill: Bar, Line, Section */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700 p-0.5">
            <button
              id="ab-snap-bar-btn"
              type="button"
              onClick={onSnapBar}
              className="px-2.5 h-8 sm:h-8.5 min-h-[32px] rounded text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer touch-manipulation"
              title="Snap A-B to current measure"
            >
              Bar
            </button>
            <button
              id="ab-snap-line-btn"
              type="button"
              onClick={onSnapLine}
              className="px-2.5 h-8 sm:h-8.5 min-h-[32px] rounded text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer touch-manipulation"
              title="Snap A-B to current printed line/system"
            >
              Line
            </button>
            <button
              id="ab-snap-section-btn"
              type="button"
              onClick={onSnapSection}
              className="px-2.5 h-8 sm:h-8.5 min-h-[32px] rounded text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 cursor-pointer touch-manipulation"
              title="Snap A-B to current musical section (Intro, Verse, Chorus)"
            >
              Section
            </button>
          </div>

          {/* More Musical Operations Dropdown */}
          <div className="relative">
            <button
              id="ab-more-tools-btn"
              type="button"
              onClick={() => {
                setShowMoreMenu(prev => !prev);
                setShowPasteOptions(false);
              }}
              className={`p-2 h-8 sm:h-9 w-8 sm:w-9 min-w-[36px] min-h-[36px] rounded-lg flex items-center justify-center transition-all cursor-pointer touch-manipulation ${
                showMoreMenu
                  ? 'bg-amber-500 text-zinc-950 font-black'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="More A-B features: Duplicate, Transpose, Harmonize, Clear Lyrics"
              aria-label="More A-B features"
            >
              <MoreHorizontal className="w-4 h-4" />
            </button>

            {showMoreMenu && (
              <div
                className={`absolute right-0 bottom-full mb-2 w-56 rounded-xl border shadow-2xl p-1.5 z-50 flex flex-col gap-1 ${
                  sheetTheme === 'dark' ? 'bg-[#151921] border-zinc-700' : 'bg-white border-zinc-200'
                }`}
              >
                <div className="text-[10px] font-bold text-zinc-400 uppercase px-2 py-1">
                  Section Operations
                </div>

                {/* Duplicate Section */}
                <button
                  type="button"
                  onClick={() => {
                    onDuplicateAb();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer touch-manipulation min-h-[36px]"
                >
                  <Copy className="w-3.5 h-3.5 text-amber-500" />
                  <span>Duplicate Section</span>
                </button>

                {/* Transpose Up / Down */}
                <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-zinc-50 dark:bg-zinc-850 text-xs font-bold min-h-[36px]">
                  <span>Transpose</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onTransposeAb(-1)}
                      className="px-3 py-1 min-w-[36px] min-h-[32px] rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-amber-500 hover:text-zinc-950 cursor-pointer touch-manipulation flex items-center justify-center font-bold"
                      title="Transpose A-B down 1 step"
                    >
                      -1
                    </button>
                    <button
                      type="button"
                      onClick={() => onTransposeAb(1)}
                      className="px-3 py-1 min-w-[36px] min-h-[32px] rounded bg-zinc-200 dark:bg-zinc-700 hover:bg-amber-500 hover:text-zinc-950 cursor-pointer touch-manipulation flex items-center justify-center font-bold"
                      title="Transpose A-B up 1 step"
                    >
                      +1
                    </button>
                  </div>
                </div>

                {/* Harmonize A-B */}
                {onAutoHarmonizeAb && (
                  <button
                    type="button"
                    onClick={() => {
                      onAutoHarmonizeAb();
                      setShowMoreMenu(false);
                    }}
                    className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer touch-manipulation min-h-[36px]"
                  >
                    <Music className="w-3.5 h-3.5 text-purple-500" />
                    <span>Auto-Harmonize A-B</span>
                  </button>
                )}

                {/* Clear Lyrics */}
                <button
                  type="button"
                  onClick={() => {
                    onClearLyricsAb();
                    setShowMoreMenu(false);
                  }}
                  className="w-full flex items-center gap-2 p-2 rounded-lg text-left text-xs font-bold hover:bg-zinc-100 dark:hover:bg-zinc-800 text-amber-600 dark:text-amber-400 cursor-pointer touch-manipulation min-h-[36px]"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Clear Lyrics in A-B</span>
                </button>
              </div>
            )}
          </div>

          {/* Close Ribbon */}
          <button
            id="ab-close-ribbon-btn"
            type="button"
            onClick={onClose}
            className="w-8 sm:w-9 h-8 sm:h-9 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer touch-manipulation"
            title="Close A-B selection (Esc)"
            aria-label="Close A-B selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
