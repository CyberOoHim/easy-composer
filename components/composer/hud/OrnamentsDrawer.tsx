'use client';

import React from 'react';
import {
  Sparkles,
  Plus,
  X,
} from 'lucide-react';
import type { ArticulationType } from '@/types/song';
import { COMMON_PUNCTUATIONS, COMMON_ANNOTATIONS } from '@/lib/taigiUtils';

export interface OrnamentsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertPunctuation?: (punct: string, after: boolean) => void;
  onInsertPunctuationAfter?: (punct: string) => void;
  isAddDelimiterActive: boolean;
  onToggleAddDelimiterActive: () => void;
  onClearAddDelimiterActive: () => void;
  currentArticulation?: ArticulationType;
  onSetArticulation?: (art: ArticulationType) => void;
  isTriplet?: boolean;
  onToggleTriplet?: () => void;
  onAddGraceNote?: (type: 'pre' | 'post', pitch: 1 | 2 | 3 | 4 | 5 | 6 | 7, octave: number) => void;
  hasGraceNotes?: boolean;
  onClearGraceNotes?: () => void;
  onInsertAnnotation?: (text: string) => void;
}

export const OrnamentsDrawer: React.FC<OrnamentsDrawerProps> = ({
  isOpen,
  onClose,
  onInsertPunctuation,
  onInsertPunctuationAfter,
  isAddDelimiterActive,
  onToggleAddDelimiterActive,
  onClearAddDelimiterActive,
  currentArticulation,
  onSetArticulation,
  isTriplet,
  onToggleTriplet,
  onAddGraceNote,
  hasGraceNotes,
  onClearGraceNotes,
  onInsertAnnotation,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="floating-score-hud-ornaments-bar"
      className="pointer-events-auto w-full max-w-full min-w-0 bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap no-scrollbar touch-momentum touch-pan-x animate-in fade-in slide-in-from-bottom-1 duration-150"
    >
      {/* Title / Icon */}
      <div className="flex items-center gap-1.5 text-amber-500 shrink-0 font-bold">
        <Sparkles className="w-4 h-4" />
        <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 hidden sm:inline">Ornaments:</span>
      </div>

      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 hidden sm:block" />

      {/* Delimiters & Punctuation (at the beginning of Ornaments bar) */}
      {onInsertPunctuation && (
        <div className="flex items-center gap-1 shrink-0">
          <span className="text-xs font-bold text-zinc-400 uppercase hidden xl:inline mr-0.5">Delim:</span>
          {/* Combinational "Add" Button: click first, then click delimiter to insert after cursor. Click twice to cancel. */}
          <button
            id="floating-hud-add-delimiter-btn"
            type="button"
            onClick={onToggleAddDelimiterActive}
            className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
              isAddDelimiterActive
                ? 'bg-amber-500 text-zinc-950 font-black shadow-sm ring-2 ring-amber-400 dark:ring-amber-500'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={
              isAddDelimiterActive
                ? 'Add Delimiter active: Click any delimiter to insert after cursor (Click again to cancel)'
                : 'Insert Delimiter After Cursor (Click then select delimiter; click twice to cancel)'
            }
            aria-pressed={isAddDelimiterActive}
          >
            <Plus className={`w-3.5 h-3.5 ${isAddDelimiterActive ? 'stroke-[3]' : 'stroke-2'}`} />
            <span>Add</span>
          </button>

          <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />

          {COMMON_PUNCTUATIONS.map(p => (
            <button
              key={p.label}
              type="button"
              onClick={() => {
                if (isAddDelimiterActive) {
                  if (onInsertPunctuationAfter) {
                    onInsertPunctuationAfter(p.value);
                  } else {
                    onInsertPunctuation(p.value, true);
                  }
                  onClearAddDelimiterActive();
                } else {
                  onInsertPunctuation(p.value, false);
                }
              }}
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 text-sm sm:text-base font-bold flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                isAddDelimiterActive ? 'ring-1 ring-amber-400/60' : ''
              }`}
              title={
                isAddDelimiterActive
                  ? `Insert "${p.label}" after current note`
                  : p.title
              }
            >
              {p.label}
            </button>
          ))}
        </div>
      )}

      {/* Articulations */}
      <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {(['none', 'staccato', 'tenuto', 'accent', 'fermata'] as ArticulationType[]).map(art => (
          <button
            key={art}
            type="button"
            onClick={() => onSetArticulation?.(art)}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold capitalize cursor-pointer transition-all ${
              currentArticulation === art
                ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={`Articulation: ${art}`}
          >
            {art === 'none' ? 'Natural' : art}
          </button>
        ))}
        {onToggleTriplet && (
          <button
            type="button"
            onClick={onToggleTriplet}
            className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all ${
              isTriplet
                ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title="Toggle Triplet (3 notes in 2 beats time)"
          >
            Triplet (3)
          </button>
        )}
      </div>

      {/* Grace Notes */}
      {onAddGraceNote && (
        <>
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-zinc-400 uppercase hidden lg:inline">Grace:</span>
            <button
              type="button"
              onClick={() => onAddGraceNote('pre', 5, 0)}
              className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all"
              title="Add Pre-Grace Note"
            >
              + Pre
            </button>
            <button
              type="button"
              onClick={() => onAddGraceNote('post', 6, 0)}
              className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all"
              title="Add Post-Grace Note"
            >
              + Post
            </button>
            {hasGraceNotes && onClearGraceNotes && (
              <button
                type="button"
                onClick={onClearGraceNotes}
                className="px-2 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all"
                title="Clear Grace Notes"
              >
                Clear
              </button>
            )}
          </div>
        </>
      )}

      {/* Annotations */}
      {onInsertAnnotation && (
        <>
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />
          <div className="flex items-center gap-1.5 shrink-0">
            {COMMON_ANNOTATIONS.map(a => (
              <button
                key={a}
                type="button"
                onClick={() => onInsertAnnotation(a)}
                className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 font-serif italic font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0"
                title={`Insert annotation ${a}`}
              >
                {a}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer"
        title="Close Ornaments Bar (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="w-2 shrink-0" aria-hidden="true" />
    </div>
  );
};
