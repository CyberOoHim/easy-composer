'use client';

import React from 'react';
import {
  Sliders,
  Plus,
  Copy,
  Trash2,
  ArrowLeftToLine,
  ArrowRightToLine,
  Shuffle,
  AlertCircle,
  X,
} from 'lucide-react';
import type { NoteInputMode } from '@/types/song';

export interface EditSuiteDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  noteInputMode?: NoteInputMode;
  onChangeNoteInputMode?: (mode: NoteInputMode) => void;
  onInsertNoteAfter?: () => void;
  onInsertNoteBefore?: () => void;
  onDuplicateCurrentNote?: () => void;
  onDeleteCurrentNote?: () => void;
  onDeleteNoteAfter?: () => void;
  onShiftNotesToPrevMeasure?: () => void;
  onPushNotesToNextMeasure?: () => void;
  onAddMeasureAfter?: () => void;
  onAddMeasureBefore?: () => void;
  onDuplicateMeasure?: () => void;
  onDeleteSelectedMeasure?: () => void;
  onAutoRearrangeMeasures?: () => void;
  showRhythmWarnings?: boolean;
  onToggleShowRhythmWarnings?: () => void;
}

export const EditSuiteDrawer: React.FC<EditSuiteDrawerProps> = ({
  isOpen,
  onClose,
  noteInputMode,
  onChangeNoteInputMode,
  onInsertNoteAfter,
  onInsertNoteBefore,
  onDuplicateCurrentNote,
  onDeleteCurrentNote,
  onDeleteNoteAfter,
  onShiftNotesToPrevMeasure,
  onPushNotesToNextMeasure,
  onAddMeasureAfter,
  onAddMeasureBefore,
  onDuplicateMeasure,
  onDeleteSelectedMeasure,
  onAutoRearrangeMeasures,
  showRhythmWarnings,
  onToggleShowRhythmWarnings,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="floating-score-hud-edit-bar"
      className="pointer-events-auto w-full max-w-full min-w-0 bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap no-scrollbar touch-momentum touch-pan-x animate-in fade-in slide-in-from-bottom-1 duration-150"
    >
      {/* Title / Icon */}
      <div className="flex items-center gap-1.5 text-amber-500 shrink-0 font-bold">
        <Sliders className="w-4 h-4" />
        <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100">Edit Suite:</span>
      </div>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

      {/* Note Input Mode Segment */}
      {onChangeNoteInputMode && (
        <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shrink-0">
          <span className="text-xs font-bold text-zinc-400 uppercase px-1 hidden sm:inline">Input Mode:</span>
          <button
            type="button"
            onClick={() => onChangeNoteInputMode('replace')}
            className={`px-2.5 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              noteInputMode === 'replace'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="Replace Current Note: Modifies current note pitch without advancing cursor"
          >
            Replace
          </button>
          <button
            type="button"
            onClick={() => onChangeNoteInputMode('progressive_replace')}
            className={`px-2.5 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              noteInputMode === 'progressive_replace'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="Progressive Replace: Modifies current note pitch and auto-steps to next note"
          >
            Prog Replace
          </button>
          <button
            type="button"
            onClick={() => onChangeNoteInputMode('progressive_insert')}
            className={`px-2.5 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              noteInputMode === 'progressive_insert'
                ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
            }`}
            title="Progressive Insertion: Inserts a new note after current note and advances cursor"
          >
            Prog Insert
          </button>
        </div>
      )}

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

      {/* Note Operations Group */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-bold text-zinc-400 uppercase hidden md:inline">Note:</span>
        {onInsertNoteAfter && (
          <button
            type="button"
            onClick={onInsertNoteAfter}
            className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Add / Insert a note after current note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Note After</span>
          </button>
        )}
        {onInsertNoteBefore && (
          <button
            type="button"
            onClick={onInsertNoteBefore}
            className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Insert a note before current note"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Note Before</span>
          </button>
        )}
        {onDuplicateCurrentNote && (
          <button
            type="button"
            onClick={onDuplicateCurrentNote}
            className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Duplicate current note"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
          </button>
        )}
        {onDeleteCurrentNote && (
          <button
            type="button"
            onClick={onDeleteCurrentNote}
            className="px-2.5 py-1 sm:py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Delete current note"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Del Note</span>
          </button>
        )}
        {onDeleteNoteAfter && (
          <button
            type="button"
            onClick={onDeleteNoteAfter}
            className="px-2.5 py-1 sm:py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Delete note after current note"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Del After</span>
          </button>
        )}
        {onShiftNotesToPrevMeasure && (
          <button
            id="floating-hud-shift-notes-prev-bar-btn"
            type="button"
            onClick={onShiftNotesToPrevMeasure}
            className="px-2.5 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-500 hover:text-zinc-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
            title="Shift notes from start of measure up to & including current note into preceding measure (Alt+Shift+Left)"
          >
            <ArrowLeftToLine className="w-3.5 h-3.5" />
            <span>Shift to Prev Bar (⇤)</span>
          </button>
        )}
        {onPushNotesToNextMeasure && (
          <button
            id="floating-hud-push-notes-next-bar-btn"
            type="button"
            onClick={onPushNotesToNextMeasure}
            className="px-2.5 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-500 hover:text-zinc-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
            title="Push current note & all subsequent notes in measure into next measure (Alt+Shift+Right)"
          >
            <ArrowRightToLine className="w-3.5 h-3.5" />
            <span>Push to Next Bar (⇥)</span>
          </button>
        )}
      </div>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

      {/* Measure Operations Group */}
      <div className="flex items-center gap-1.5 shrink-0">
        <span className="text-xs font-bold text-zinc-400 uppercase hidden md:inline">Measure:</span>
        {onAddMeasureAfter && (
          <button
            type="button"
            onClick={onAddMeasureAfter}
            className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Add a measure after current measure"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Bar After</span>
          </button>
        )}
        {onAddMeasureBefore && (
          <button
            type="button"
            onClick={onAddMeasureBefore}
            className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Add a measure before current measure"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Bar Before</span>
          </button>
        )}
        {onDuplicateMeasure && (
          <button
            type="button"
            onClick={onDuplicateMeasure}
            className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Duplicate current measure"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Dup Bar</span>
          </button>
        )}
        {onDeleteSelectedMeasure && (
          <button
            type="button"
            onClick={onDeleteSelectedMeasure}
            className="px-2.5 py-1 sm:py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
            title="Delete current measure"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Del Bar</span>
          </button>
        )}
      </div>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

      {/* Rhythm Alignment & Warnings Group */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onAutoRearrangeMeasures && (
          <button
            type="button"
            onClick={onAutoRearrangeMeasures}
            className="px-3 py-1 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
            title="Auto Rearrange Measures: Redistribute notes across barlines to strictly conform to time signature"
          >
            <Shuffle className="w-3.5 h-3.5" />
            <span>Auto-Rearrange Bars</span>
          </button>
        )}
        {onToggleShowRhythmWarnings && (
          <button
            type="button"
            onClick={onToggleShowRhythmWarnings}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
              showRhythmWarnings
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
            title="Toggle Measure Beat Notices (⚠️ warnings on incomplete / overbeat measures; never printed)"
          >
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Notice: {showRhythmWarnings ? 'ON' : 'OFF'}</span>
          </button>
        )}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer"
        title="Close Edit Suite (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="w-2 shrink-0" aria-hidden="true" />
    </div>
  );
};
