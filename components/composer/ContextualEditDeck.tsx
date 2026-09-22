import React, { useState, useMemo } from 'react';
import type { Song, BarlineType, PitchNumber } from '@/types/song';
import type { RealSheetTheme } from '@/lib/storage';
import {
  addMeasureAt,
  duplicateMeasureAt,
  deleteMeasureAt,
  moveMeasure,
  setMeasureBarline,
  clearMeasureLyrics,
  clearMeasureNotes,
  splitMeasureAtNote,
  mergeMeasureWithNext,
  batchDeleteMeasures,
  batchDuplicateMeasures,
  batchShiftMeasures,
  batchClearLyrics,
  batchPadRests,
  insertNoteAt,
  deleteNoteAt,
  duplicateNoteAt,
  moveNote,
  transposeNote,
  scaleNoteDuration,
  toggleNoteModifier,
  batchDeleteNotes,
  batchTransposeNotes,
  batchScaleNoteDurations,
  shiftSyllable,
  pushSubsequentLyrics,
  pullSubsequentLyrics,
  clearSyllableAt,
  appendToSyllable,
  batchShiftLyricsRange,
} from '@/lib/scoreEditOperations';
import { transposeMeasures } from '@/lib/abOperations';
import { fillMeasureDeficitWithRests } from '@/lib/taigiUtils';
import {
  Music,
  Sliders,
  Type,
  Layers,
  Plus,
  Trash2,
  Copy,
  ArrowLeft,
  ArrowRight,
  ArrowLeftToLine,
  ArrowRightToLine,
  Scissors,
  Split,
  Maximize2,
  Minimize2,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  RotateCcw,
  AlignLeft,
} from 'lucide-react';

export type EditTarget = 'measure' | 'note' | 'syllable';
export type EditScope = 'single' | 'batch';

export interface BatchMeasureRange {
  start: number;
  end: number;
}

export interface BatchNoteRange {
  start: number;
  end: number;
}

export interface ContextualEditDeckProps {
  song: Song;
  selectedMeasureIndex: number;
  selectedNoteIndex: number;
  selectedVerseRow?: number;
  editTarget: EditTarget;
  onChangeEditTarget: (target: EditTarget) => void;
  isBatchMode: boolean;
  onToggleBatchMode: (active: boolean) => void;
  batchMeasureRange: BatchMeasureRange;
  onChangeBatchMeasureRange: (range: BatchMeasureRange) => void;
  batchNoteRange: BatchNoteRange;
  onChangeBatchNoteRange: (range: BatchNoteRange) => void;
  sheetTheme?: RealSheetTheme;
  onUpdateSong: (song: Song, options?: { coalesce?: boolean; coalesceKey?: string }) => void;
  onSelectMeasure?: (measureIndex: number) => void;
  onSelectNote?: (measureIndex: number, noteIndex: number) => void;
  onOpenLyricSpreader?: () => void;
  onClose?: () => void;
}

export const ContextualEditDeck: React.FC<ContextualEditDeckProps> = ({
  song,
  selectedMeasureIndex,
  selectedNoteIndex,
  selectedVerseRow = 1,
  editTarget,
  onChangeEditTarget,
  isBatchMode,
  onToggleBatchMode,
  batchMeasureRange,
  onChangeBatchMeasureRange,
  batchNoteRange,
  onChangeBatchNoteRange,
  sheetTheme = 'classic',
  onUpdateSong,
  onSelectMeasure,
  onSelectNote,
  onOpenLyricSpreader,
  onClose,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);

  const currentM = song.measures[selectedMeasureIndex];
  const currentN = currentM?.notes[selectedNoteIndex];
  const totalMeasures = song.measures.length;
  const totalNotesInCurrentM = currentM?.notes.length || 0;

  const currentMeasureNumber = currentM?.measureNumber || selectedMeasureIndex + 1;
  const currentPitch = currentN?.pitch;
  const pitchLabel =
    currentPitch === 0
      ? 'Rest 0'
      : typeof currentPitch === 'number'
      ? `Pitch ${currentPitch}`
      : 'Empty';

  // --- Handlers for Measure Operations ---

  const handleAddBarAfter = () => {
    const res = addMeasureAt(song, selectedMeasureIndex, 'after');
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  const handleAddBarBefore = () => {
    const res = addMeasureAt(song, selectedMeasureIndex, 'before');
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  const handleDuplicateBar = () => {
    const res = duplicateMeasureAt(song, selectedMeasureIndex);
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  const handleDeleteBar = () => {
    const res = deleteMeasureAt(song, selectedMeasureIndex);
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  const handleMoveBar = (dir: 'left' | 'right') => {
    const res = moveMeasure(song, selectedMeasureIndex, dir);
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  const handleSetBarline = (barlineType: BarlineType) => {
    const updated = setMeasureBarline(song, selectedMeasureIndex, barlineType);
    onUpdateSong(updated);
  };

  const handlePadMeasureRests = () => {
    if (!currentM) return;
    const filledM = fillMeasureDeficitWithRests(currentM, song.timeSignature || '4/4');
    const updated: Song = {
      ...song,
      measures: song.measures.map((m, idx) => (idx === selectedMeasureIndex ? filledM : m)),
      updatedAt: Date.now(),
    };
    onUpdateSong(updated);
  };

  const handleClearBarLyrics = () => {
    const updated = clearMeasureLyrics(song, selectedMeasureIndex, selectedVerseRow);
    onUpdateSong(updated);
  };

  const handleClearBarNotes = () => {
    const updated = clearMeasureNotes(song, selectedMeasureIndex);
    onUpdateSong(updated);
  };

  const handleSplitBar = () => {
    const res = splitMeasureAtNote(song, selectedMeasureIndex, selectedNoteIndex);
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  const handleMergeNextBar = () => {
    const res = mergeMeasureWithNext(song, selectedMeasureIndex);
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  // --- Handlers for Batch Measure Operations ---

  const handleBatchDeleteBars = () => {
    const res = batchDeleteMeasures(song, batchMeasureRange.start, batchMeasureRange.end);
    onUpdateSong(res.song);
    onSelectMeasure?.(res.newMeasureIndex);
  };

  const handleBatchDuplicateBars = () => {
    const res = batchDuplicateMeasures(song, batchMeasureRange.start, batchMeasureRange.end);
    onUpdateSong(res.song);
    onChangeBatchMeasureRange({ start: res.newStartIdx, end: res.newEndIdx });
    onSelectMeasure?.(res.newStartIdx);
  };

  const handleBatchShiftBars = (dir: 'left' | 'right') => {
    const res = batchShiftMeasures(song, batchMeasureRange.start, batchMeasureRange.end, dir);
    onUpdateSong(res.song);
    onChangeBatchMeasureRange({ start: res.newStartIdx, end: res.newEndIdx });
    onSelectMeasure?.(res.newStartIdx);
  };

  const handleBatchClearLyrics = () => {
    const updated = batchClearLyrics(
      song,
      batchMeasureRange.start,
      batchMeasureRange.end,
      selectedVerseRow
    );
    onUpdateSong(updated);
  };

  const handleBatchPadRests = () => {
    const updated = batchPadRests(song, batchMeasureRange.start, batchMeasureRange.end);
    onUpdateSong(updated);
  };

  const handleBatchTransposeBars = (stepDelta: number) => {
    const updated = transposeMeasures(
      song,
      {
        startMeasureIndex: batchMeasureRange.start,
        endMeasureIndex: batchMeasureRange.end,
      },
      stepDelta
    );
    onUpdateSong(updated);
  };

  // --- Handlers for Note Operations ---

  const handleInsertNote = (pos: 'before' | 'after', pitch: PitchNumber = 1) => {
    const res = insertNoteAt(song, selectedMeasureIndex, selectedNoteIndex, pos, pitch, 1);
    onUpdateSong(res.song);
    onSelectNote?.(res.newCoord[0], res.newCoord[1]);
  };

  const handleDeleteNote = () => {
    const res = deleteNoteAt(song, selectedMeasureIndex, selectedNoteIndex);
    onUpdateSong(res.song);
    onSelectNote?.(res.newCoord[0], res.newCoord[1]);
  };

  const handleDuplicateNote = () => {
    const res = duplicateNoteAt(song, selectedMeasureIndex, selectedNoteIndex);
    onUpdateSong(res.song);
    onSelectNote?.(res.newCoord[0], res.newCoord[1]);
  };

  const handleMoveNote = (dir: 'left' | 'right') => {
    const res = moveNote(song, selectedMeasureIndex, selectedNoteIndex, dir);
    onUpdateSong(res.song);
    onSelectNote?.(res.newCoord[0], res.newCoord[1]);
  };

  const handleTransposeNote = (delta: number) => {
    const updated = transposeNote(song, selectedMeasureIndex, selectedNoteIndex, delta);
    onUpdateSong(updated);
  };

  const handleScaleDuration = (factor: 0.5 | 2) => {
    const updated = scaleNoteDuration(song, selectedMeasureIndex, selectedNoteIndex, factor);
    onUpdateSong(updated);
  };

  const handleToggleModifier = (
    mod: 'slur' | 'tie' | 'fermata' | 'staccato' | 'accent' | 'tenuto' | 'dotted' | 'triplet'
  ) => {
    const updated = toggleNoteModifier(song, selectedMeasureIndex, selectedNoteIndex, mod);
    onUpdateSong(updated);
  };

  // --- Handlers for Batch Note Operations ---

  const handleBatchDeleteNotes = () => {
    const res = batchDeleteNotes(song, selectedMeasureIndex, batchNoteRange.start, batchNoteRange.end);
    onUpdateSong(res.song);
    onSelectNote?.(res.newCoord[0], res.newCoord[1]);
  };

  const handleBatchTransposeNotes = (delta: number) => {
    const updated = batchTransposeNotes(
      song,
      selectedMeasureIndex,
      batchNoteRange.start,
      batchNoteRange.end,
      delta
    );
    onUpdateSong(updated);
  };

  const handleBatchScaleDurations = (factor: 0.5 | 2) => {
    const updated = batchScaleNoteDurations(
      song,
      selectedMeasureIndex,
      batchNoteRange.start,
      batchNoteRange.end,
      factor
    );
    onUpdateSong(updated);
  };

  // --- Handlers for Syllable Operations ---

  const handleShiftSyllable = (dir: 'left' | 'right') => {
    const res = shiftSyllable(song, selectedMeasureIndex, selectedNoteIndex, dir, selectedVerseRow);
    onUpdateSong(res.song);
    onSelectNote?.(res.newCoord[0], res.newCoord[1]);
  };

  const handlePushLyrics = () => {
    const updated = pushSubsequentLyrics(
      song,
      selectedMeasureIndex,
      selectedNoteIndex,
      selectedVerseRow
    );
    onUpdateSong(updated);
  };

  const handlePullLyrics = () => {
    const updated = pullSubsequentLyrics(
      song,
      selectedMeasureIndex,
      selectedNoteIndex,
      selectedVerseRow
    );
    onUpdateSong(updated);
  };

  const handleClearSyllable = () => {
    const updated = clearSyllableAt(
      song,
      selectedMeasureIndex,
      selectedNoteIndex,
      selectedVerseRow
    );
    onUpdateSong(updated);
  };

  const handleAppendSymbol = (symbol: string) => {
    const updated = appendToSyllable(
      song,
      selectedMeasureIndex,
      selectedNoteIndex,
      symbol,
      selectedVerseRow
    );
    onUpdateSong(updated);
  };

  const handleBatchShiftLyrics = (dir: 'left' | 'right') => {
    const updated = batchShiftLyricsRange(
      song,
      batchMeasureRange.start,
      batchMeasureRange.end,
      dir,
      selectedVerseRow
    );
    onUpdateSong(updated);
  };

  return (
    <div
      id="contextual-edit-deck"
      className="pointer-events-auto w-full max-w-full mx-auto bg-white/95 dark:bg-[#141820]/95 backdrop-blur-md rounded-2xl border border-zinc-250 dark:border-zinc-750 shadow-2xl overflow-hidden transition-all duration-200"
    >
      {/* Top Header / Mode & Target Selector */}
      <div className="flex items-center justify-between px-2.5 sm:px-3 py-1 sm:py-1.5 border-b border-zinc-200 dark:border-zinc-800 gap-2 min-w-0">
        {/* Left: Target Switch Tabs */}
        <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-momentum touch-pan-x py-0.5 pr-2">
          <button
            id="context-tab-measure"
            type="button"
            onClick={() => onChangeEditTarget('measure')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shrink-0 ${
              editTarget === 'measure'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
            }`}
            title="Edit Measure / Bar Structure"
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>Bar #{currentMeasureNumber}</span>
          </button>

          <button
            id="context-tab-note"
            type="button"
            onClick={() => onChangeEditTarget('note')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shrink-0 ${
              editTarget === 'note'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
            }`}
            title="Edit Note Pitch, Duration, Phrasing"
          >
            <Music className="w-4 h-4 shrink-0" />
            <span>Note #{selectedNoteIndex + 1} ({pitchLabel})</span>
          </button>

          <button
            id="context-tab-syllable"
            type="button"
            onClick={() => onChangeEditTarget('syllable')}
            className={`min-h-[40px] px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shrink-0 ${
              editTarget === 'syllable'
                ? 'bg-amber-500 text-zinc-950 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-750'
            }`}
            title="Edit Character / Syllable Alignment & Flow"
          >
            <Type className="w-4 h-4 shrink-0" />
            <span>Lyric (v{selectedVerseRow})</span>
          </button>
          <div className="w-2 shrink-0" aria-hidden="true" />
        </div>

        {/* Right: Single vs Batch Switch & Minimize/Close */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto shrink-0">
          {/* Single vs Batch Toggle */}
          <div className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              id="context-scope-single-btn"
              type="button"
              onClick={() => onToggleBatchMode(false)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation ${
                !isBatchMode
                  ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              Single
            </button>
            <button
              id="context-scope-batch-btn"
              type="button"
              onClick={() => onToggleBatchMode(true)}
              className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer active:scale-95 touch-manipulation flex items-center gap-1 ${
                isBatchMode
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              <span>Batch</span>
            </button>
          </div>

          {/* Minimize / Expand */}
          <button
            type="button"
            onClick={() => setIsMinimized(prev => !prev)}
            className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer"
            title={isMinimized ? 'Expand Edit Deck' : 'Minimize Edit Deck'}
          >
            {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
          </button>

          {/* Close */}
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center p-1.5 rounded-xl text-zinc-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
              title="Close Edit Deck"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Controls Panel (Collapsible) */}
      {!isMinimized && (
        <div className="px-2 sm:px-3 py-0.5 space-y-1 text-sm w-full max-w-full min-w-0 overflow-hidden">
          {/* ========================================================================= */}
          {/* MEASURE EDIT MODE */}
          {/* ========================================================================= */}
          {editTarget === 'measure' && (
            <div className="flex flex-col gap-1.5">
              {/* Batch Range Bar (Only in Batch Mode) */}
              {isBatchMode && (
                <div className="flex items-center gap-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-2.5 py-1 flex-wrap text-xs font-medium text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Selected Bars:
                  </span>

                  {/* Start Bar Stepper */}
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      disabled={batchMeasureRange.start <= 0}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          start: Math.max(0, batchMeasureRange.start - 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold px-1.5">Bar {batchMeasureRange.start + 1}</span>
                    <button
                      type="button"
                      disabled={batchMeasureRange.start >= batchMeasureRange.end}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          start: Math.min(batchMeasureRange.end, batchMeasureRange.start + 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-bold text-zinc-400">➔</span>

                  {/* End Bar Stepper */}
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      disabled={batchMeasureRange.end <= batchMeasureRange.start}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          end: Math.max(batchMeasureRange.start, batchMeasureRange.end - 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold px-1.5">Bar {batchMeasureRange.end + 1}</span>
                    <button
                      type="button"
                      disabled={batchMeasureRange.end >= totalMeasures - 1}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          end: Math.min(totalMeasures - 1, batchMeasureRange.end + 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Quick Preset: All Bars */}
                  <button
                    type="button"
                    onClick={() => onChangeBatchMeasureRange({ start: 0, end: totalMeasures - 1 })}
                    className="ml-auto px-2.5 py-1 bg-white dark:bg-zinc-900 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded-lg font-bold transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                  >
                    Select All ({totalMeasures} Bars)
                  </button>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-momentum touch-pan-x py-0.5 px-0.5">
                {!isBatchMode ? (
                  <>
                    {/* Add Bars */}
                    <button
                      type="button"
                      onClick={handleAddBarAfter}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Add a new measure after this bar"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Bar After</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleAddBarBefore}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Add a new measure before this bar"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Bar Before</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicateBar}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Duplicate this entire measure"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteBar}
                      className="min-h-[44px] px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Delete this measure"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Del Bar</span>
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Move / Reorder Measure */}
                    <button
                      type="button"
                      disabled={selectedMeasureIndex <= 0}
                      onClick={() => handleMoveBar('left')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move this bar left / earlier in the song"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Move ⇦</span>
                    </button>

                    <button
                      type="button"
                      disabled={selectedMeasureIndex >= totalMeasures - 1}
                      onClick={() => handleMoveBar('right')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Move this bar right / later in the song"
                    >
                      <span>Move ⇨</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Split & Merge */}
                    <button
                      type="button"
                      onClick={handleSplitBar}
                      className="min-h-[44px] px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Split this bar into two measures at current note"
                    >
                      <Scissors className="w-4 h-4" />
                      <span>Split Bar</span>
                    </button>

                    <button
                      type="button"
                      disabled={selectedMeasureIndex >= totalMeasures - 1}
                      onClick={handleMergeNextBar}
                      className="min-h-[44px] px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation disabled:opacity-30"
                      title="Merge this bar with the following measure"
                    >
                      <ArrowRightToLine className="w-4 h-4" />
                      <span>Merge Next</span>
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Barline Selector */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border border-zinc-200 dark:border-zinc-750">
                      <span className="text-[11px] font-bold text-zinc-400 px-1 uppercase">Barline:</span>
                      <button
                        type="button"
                        onClick={() => handleSetBarline('single')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          !currentM?.barlineType || currentM.barlineType === 'single'
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950'
                        }`}
                        title="Standard Single Barline"
                      >
                        | Single
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetBarline('double')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentM?.barlineType === 'double'
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950'
                        }`}
                        title="Double Barline (Section Change)"
                      >
                        || Double
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetBarline('repeat_start')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentM?.barlineType === 'repeat_start'
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950'
                        }`}
                        title="Repeat Start (|:)"
                      >
                        |: Start
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetBarline('repeat_end')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentM?.barlineType === 'repeat_end'
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950'
                        }`}
                        title="Repeat End (:|)"
                      >
                        :| End
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSetBarline('end')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentM?.barlineType === 'end'
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'text-zinc-600 dark:text-zinc-300 hover:text-zinc-950'
                        }`}
                        title="Final Song Ending Barline (|▌)"
                      >
                        |▌ Final
                      </button>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Quick Clean Up */}
                    <button
                      type="button"
                      onClick={handlePadMeasureRests}
                      className="min-h-[44px] px-3 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Pad remaining beat deficit with rest notes"
                    >
                      <RotateCcw className="w-4 h-4" />
                      <span>Pad Rests</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleClearBarLyrics}
                      className="min-h-[44px] px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Clear all lyrics in this measure"
                    >
                      <span>Clear Lyrics</span>
                    </button>
                  </>
                ) : (
                  /* BATCH MEASURE ACTIONS */
                  <>
                    <button
                      type="button"
                      onClick={handleBatchDeleteBars}
                      className="min-h-[44px] px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs"
                      title="Delete all selected measures in range"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Selected Bars</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBatchDuplicateBars}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Duplicate all selected measures in range"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate Bars</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchShiftBars('left')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Shift entire block of selected measures left"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Shift Bars ⇦</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchShiftBars('right')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Shift entire block of selected measures right"
                    >
                      <span>Shift Bars ⇨</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    <button
                      type="button"
                      onClick={() => handleBatchTransposeBars(1)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Transpose all pitches in selected measures up 1 diatonic step"
                    >
                      <span>Transpose +1 ♯</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchTransposeBars(-1)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Transpose all pitches in selected measures down 1 diatonic step"
                    >
                      <span>Transpose -1 ♭</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBatchPadRests}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Pad beat deficits with rests in all selected bars"
                    >
                      <span>Pad Rests in Range</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleBatchClearLyrics}
                      className="min-h-[44px] px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Clear lyrics across all selected measures"
                    >
                      <span>Clear Lyrics in Range</span>
                    </button>
                  </>
                )}
                <div className="w-3 shrink-0" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* NOTE EDIT MODE */}
          {/* ========================================================================= */}
          {editTarget === 'note' && (
            <div className="flex flex-col gap-1.5">
              {/* Batch Note Range (Within Active Measure) */}
              {isBatchMode && (
                <div className="flex items-center gap-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-2.5 py-1 flex-wrap text-xs font-medium text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Notes in Bar #{currentMeasureNumber}:
                  </span>

                  {/* Start Note */}
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      disabled={batchNoteRange.start <= 0}
                      onClick={() =>
                        onChangeBatchNoteRange({
                          ...batchNoteRange,
                          start: Math.max(0, batchNoteRange.start - 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold px-1.5">Note {batchNoteRange.start + 1}</span>
                    <button
                      type="button"
                      disabled={batchNoteRange.start >= batchNoteRange.end}
                      onClick={() =>
                        onChangeBatchNoteRange({
                          ...batchNoteRange,
                          start: Math.min(batchNoteRange.end, batchNoteRange.start + 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-bold text-zinc-400">➔</span>

                  {/* End Note */}
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      disabled={batchNoteRange.end <= batchNoteRange.start}
                      onClick={() =>
                        onChangeBatchNoteRange({
                          ...batchNoteRange,
                          end: Math.max(batchNoteRange.start, batchNoteRange.end - 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold px-1.5">Note {batchNoteRange.end + 1}</span>
                    <button
                      type="button"
                      disabled={batchNoteRange.end >= totalNotesInCurrentM - 1}
                      onClick={() =>
                        onChangeBatchNoteRange({
                          ...batchNoteRange,
                          end: Math.min(totalNotesInCurrentM - 1, batchNoteRange.end + 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Select All Notes in Bar */}
                  <button
                    type="button"
                    onClick={() =>
                      onChangeBatchNoteRange({ start: 0, end: Math.max(0, totalNotesInCurrentM - 1) })
                    }
                    className="ml-auto px-2.5 py-1 bg-white dark:bg-zinc-900 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded-lg font-bold transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                  >
                    Select All in Bar ({totalNotesInCurrentM} Notes)
                  </button>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-momentum touch-pan-x py-0.5 px-0.5">
                {!isBatchMode ? (
                  <>
                    {/* Add / Delete Note */}
                    <button
                      type="button"
                      onClick={() => handleInsertNote('after', 1)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Insert a note after current note"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Note After</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertNote('before', 1)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Insert a note before current note"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Note Before</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleInsertNote('after', 0)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Insert a rest note (0) after current note"
                    >
                      <Plus className="w-4 h-4" />
                      <span>+ Rest (0)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDuplicateNote}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Duplicate current note"
                    >
                      <Copy className="w-4 h-4" />
                      <span>Duplicate</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDeleteNote}
                      className="min-h-[44px] px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/50 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Delete current note"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Del Note</span>
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Move / Shift Note (Swaps or Hops Across Bars!) */}
                    <button
                      type="button"
                      onClick={() => handleMoveNote('left')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Move note left (swaps in bar, or moves to preceding measure)"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Move ⇦</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleMoveNote('right')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Move note right (swaps in bar, or moves to next measure)"
                    >
                      <span>Move ⇨</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Transpose Pitches */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border border-zinc-200 dark:border-zinc-750">
                      <span className="text-[11px] font-bold text-zinc-400 px-1 uppercase">Pitch:</span>
                      <button
                        type="button"
                        onClick={() => handleTransposeNote(1)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Step Up (+1)"
                      >
                        +1 Step
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTransposeNote(-1)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Step Down (-1)"
                      >
                        -1 Step
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTransposeNote(7)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Octave Up (+8va)"
                      >
                        +8va
                      </button>
                      <button
                        type="button"
                        onClick={() => handleTransposeNote(-7)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Octave Down (-8vb)"
                      >
                        -8vb
                      </button>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Duration Scaling */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border border-zinc-200 dark:border-zinc-750">
                      <span className="text-[11px] font-bold text-zinc-400 px-1 uppercase">Duration:</span>
                      <button
                        type="button"
                        onClick={() => handleScaleDuration(0.5)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Halve Duration (÷2)"
                      >
                        ÷2 Halve
                      </button>
                      <button
                        type="button"
                        onClick={() => handleScaleDuration(2)}
                        className="min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Double Duration (×2)"
                      >
                        ×2 Double
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleModifier('dotted')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentN?.isDotted
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                        title="Toggle Dotted Note"
                      >
                        • Dot
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleModifier('triplet')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentN?.isTriplet
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                        title="Toggle Triplet"
                      >
                        ³ Triplet
                      </button>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Phrasing & Articulation */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border border-zinc-200 dark:border-zinc-750">
                      <button
                        type="button"
                        onClick={() => handleToggleModifier('tie')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentN?.tieToNext
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                        title="Toggle Tie to Next Note (⌒)"
                      >
                        ⌒ Tie
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleModifier('slur')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentN?.slurToNext
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                        title="Toggle Slur to Next Note (⌢)"
                      >
                        ⌢ Slur
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleModifier('fermata')}
                        className={`min-h-[36px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          currentN?.articulation === 'fermata'
                            ? 'bg-amber-500 text-zinc-950 font-black'
                            : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                        title="Toggle Fermata (Hold)"
                      >
                        𝄐 Hold
                      </button>
                    </div>
                  </>
                ) : (
                  /* BATCH NOTE ACTIONS */
                  <>
                    <button
                      type="button"
                      onClick={handleBatchDeleteNotes}
                      className="min-h-[44px] px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs"
                      title="Delete selected range of notes in measure"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Delete Notes in Range</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchTransposeNotes(1)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Transpose selected notes up 1 step"
                    >
                      <span>Pitch +1 ♯</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchTransposeNotes(-1)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-indigo-600 hover:text-white text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Transpose selected notes down 1 step"
                    >
                      <span>Pitch -1 ♭</span>
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    <button
                      type="button"
                      onClick={() => handleBatchScaleDurations(0.5)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Halve duration of all selected notes"
                    >
                      <span>÷2 Halve All</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchScaleDurations(2)}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Double duration of all selected notes"
                    >
                      <span>×2 Double All</span>
                    </button>
                  </>
                )}
                <div className="w-3 shrink-0" aria-hidden="true" />
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* SYLLABLE / CHAR EDIT MODE */}
          {/* ========================================================================= */}
          {editTarget === 'syllable' && (
            <div className="flex flex-col gap-1.5">
              {/* Batch Lyrics Range (By Measures) */}
              {isBatchMode && (
                <div className="flex items-center gap-2 bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 rounded-xl px-2.5 py-1 flex-wrap text-xs font-medium text-indigo-900 dark:text-indigo-200">
                  <span className="font-bold flex items-center gap-1 text-indigo-700 dark:text-indigo-300">
                    <Sparkles className="w-3.5 h-3.5" />
                    Lyrics in Bars:
                  </span>

                  {/* Start Bar */}
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      disabled={batchMeasureRange.start <= 0}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          start: Math.max(0, batchMeasureRange.start - 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold px-1.5">Bar {batchMeasureRange.start + 1}</span>
                    <button
                      type="button"
                      disabled={batchMeasureRange.start >= batchMeasureRange.end}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          start: Math.min(batchMeasureRange.end, batchMeasureRange.start + 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="font-bold text-zinc-400">➔</span>

                  {/* End Bar */}
                  <div className="flex items-center gap-1 bg-white dark:bg-zinc-900 border border-indigo-200 dark:border-indigo-800 rounded-lg px-2 py-1">
                    <button
                      type="button"
                      disabled={batchMeasureRange.end <= batchMeasureRange.start}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          end: Math.max(batchMeasureRange.start, batchMeasureRange.end - 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold px-1.5">Bar {batchMeasureRange.end + 1}</span>
                    <button
                      type="button"
                      disabled={batchMeasureRange.end >= totalMeasures - 1}
                      onClick={() =>
                        onChangeBatchMeasureRange({
                          ...batchMeasureRange,
                          end: Math.min(totalMeasures - 1, batchMeasureRange.end + 1),
                        })
                      }
                      className="p-1 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded disabled:opacity-30 cursor-pointer"
                    >
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onChangeBatchMeasureRange({ start: 0, end: totalMeasures - 1 })}
                    className="ml-auto px-2.5 py-1 bg-white dark:bg-zinc-900 hover:bg-indigo-100 dark:hover:bg-zinc-800 rounded-lg font-bold transition-all border border-indigo-200 dark:border-indigo-800 cursor-pointer"
                  >
                    All Bars ({totalMeasures})
                  </button>
                </div>
              )}

              {/* Action Buttons Row */}
              <div className="w-full max-w-full min-w-0 flex items-center gap-1.5 overflow-x-auto no-scrollbar touch-momentum touch-pan-x py-0.5 px-0.5">
                {!isBatchMode ? (
                  <>
                    {/* Shift Syllable Left / Right */}
                    <button
                      type="button"
                      onClick={() => handleShiftSyllable('left')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Shift this syllable to preceding note (⇦)"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Shift Syl ⇦</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleShiftSyllable('right')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Shift this syllable to next note (⇨)"
                    >
                      <span>Shift Syl ⇨</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Push / Pull Stream */}
                    <button
                      type="button"
                      onClick={handlePushLyrics}
                      className="min-h-[44px] px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-850 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-2xs"
                      title="Push this syllable and all subsequent lyrics forward by 1 note (frees current slot for new word!)"
                    >
                      <ArrowRightToLine className="w-4 h-4" />
                      <span>Push All Following ⇨⇨</span>
                    </button>

                    <button
                      type="button"
                      onClick={handlePullLyrics}
                      className="min-h-[44px] px-3.5 py-2 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-600 hover:text-white text-indigo-950 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-850 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-2xs"
                      title="Delete this syllable and pull all subsequent lyrics backward by 1 note"
                    >
                      <ArrowLeftToLine className="w-4 h-4" />
                      <span>Pull All Following ⇦⇦</span>
                    </button>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Quick Connectors & Punctuation */}
                    <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-850 p-1 rounded-xl border border-zinc-200 dark:border-zinc-750">
                      <button
                        type="button"
                        onClick={() => handleAppendSymbol('-')}
                        className="min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Add Hyphen Connector (-)"
                      >
                        -
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAppendSymbol('␣')}
                        className="min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Add Spacer (␣)"
                      >
                        ␣
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAppendSymbol('，')}
                        className="min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Add Comma (，)"
                      >
                        ，
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAppendSymbol('。')}
                        className="min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Add Period (。)"
                      >
                        。
                      </button>
                      <button
                        type="button"
                        onClick={() => handleAppendSymbol('！')}
                        className="min-h-[36px] min-w-[36px] px-2.5 py-1 rounded-lg text-xs font-bold bg-white dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                        title="Add Exclamation (！)"
                      >
                        ！
                      </button>
                    </div>

                    <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

                    {/* Clear Syllable */}
                    <button
                      type="button"
                      onClick={handleClearSyllable}
                      className="min-h-[44px] px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Clear this syllable"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Syllable</span>
                    </button>

                    {/* Launch Lyric Spreader */}
                    {onOpenLyricSpreader && (
                      <button
                        type="button"
                        onClick={onOpenLyricSpreader}
                        className="min-h-[44px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs"
                        title="Open Full Lyric Spreader & Auto-Aligner"
                      >
                        <AlignLeft className="w-4 h-4" />
                        <span>Lyric Aligner</span>
                      </button>
                    )}
                  </>
                ) : (
                  /* BATCH SYLLABLE ACTIONS */
                  <>
                    <button
                      type="button"
                      onClick={() => handleBatchShiftLyrics('left')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Shift all lyrics in selected measure range left by 1 note"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Shift Range Left (⇦)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleBatchShiftLyrics('right')}
                      className="min-h-[44px] px-3.5 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Shift all lyrics in selected measure range right by 1 note"
                    >
                      <span>Shift Range Right (⇨)</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={handleBatchClearLyrics}
                      className="min-h-[44px] px-3.5 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-xl font-bold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation"
                      title="Clear lyrics in selected measure range"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Clear Lyrics in Range</span>
                    </button>

                    {onOpenLyricSpreader && (
                      <button
                        type="button"
                        onClick={onOpenLyricSpreader}
                        className="min-h-[44px] px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 rounded-xl font-extrabold flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 touch-manipulation shadow-xs ml-auto"
                        title="Open Full Lyric Spreader"
                      >
                        <AlignLeft className="w-4 h-4" />
                        <span>Lyric Aligner</span>
                      </button>
                    )}
                  </>
                )}
                <div className="w-3 shrink-0" aria-hidden="true" />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
