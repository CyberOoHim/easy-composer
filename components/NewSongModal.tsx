'use client';

import React, { useEffect } from 'react';
import { FilePlus2, BookmarkPlus, X, AlertCircle, Sparkles, Upload } from 'lucide-react';

interface NewSongModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentSongTitle: string;
  isDirty?: boolean;
  onConfirm: (saveCurrentFirst: boolean) => void;
  onOpenImport?: () => void;
}

export const NewSongModal: React.FC<NewSongModalProps> = ({
  isOpen,
  onClose,
  currentSongTitle,
  isDirty = false,
  onConfirm,
  onOpenImport,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      id="new-song-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="new-song-modal-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150 flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-song-modal-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-900/80">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center font-bold">
              <FilePlus2 className="w-4 h-4" />
            </div>
            <h3
              id="new-song-modal-title"
              className="text-base font-extrabold text-zinc-900 dark:text-zinc-100"
            >
              Create New Song
            </h3>
          </div>
          <button
            id="new-song-modal-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex flex-col gap-4 text-xs text-zinc-600 dark:text-zinc-400">
          <p className="text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
            A blank score canvas will be created (default Key C, 4/4 time, 80 BPM). You can immediately start composing notes and lyrics.
          </p>

          <div className={`flex items-start gap-2.5 p-3 rounded-2xl border ${
            isDirty
              ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200/80 dark:border-rose-800/80 text-rose-900 dark:text-rose-200'
              : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200/80 dark:border-amber-800/80 text-amber-900 dark:text-amber-200'
          }`}>
            <AlertCircle className={`w-4 h-4 shrink-0 mt-0.5 ${
              isDirty ? 'text-rose-600 dark:text-rose-400' : 'text-amber-600 dark:text-amber-400'
            }`} />
            <div className="flex flex-col gap-0.5">
              <span className="font-bold text-zinc-900 dark:text-zinc-100">
                Current song: &ldquo;{currentSongTitle || 'Untitled'}&rdquo;
              </span>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {isDirty
                  ? 'You have unsaved changes. Save Current & Create New keeps them. Discard Unsaved Changes leaves the last committed save in your library and does not write this draft.'
                  : 'If you have unsaved changes, we recommend saving to your Custom Library first so you can reload it anytime.'}
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
            <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
            <span className="text-[11px]">
              After creating a new song, expand &ldquo;Song Settings&rdquo; in the editor header to edit title, subtitle, composer, lyricist, and backstory!
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-6 pt-0 flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row-reverse gap-2 sm:gap-2.5">
            <button
              id="new-song-save-and-create-btn"
              type="button"
              onClick={() => onConfirm(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-98 cursor-pointer min-h-[40px]"
            >
              <BookmarkPlus className="w-4 h-4" />
              <span>Save Current & Create New</span>
            </button>

            <button
              id="new-song-direct-create-btn"
              type="button"
              onClick={() => onConfirm(false)}
              className={`flex items-center justify-center gap-1.5 px-4 py-2.5 font-bold text-xs rounded-xl border transition-colors cursor-pointer min-h-[40px] ${
                isDirty
                  ? 'bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-800 dark:text-rose-200 border-rose-200 dark:border-rose-800'
                  : 'bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border-zinc-200 dark:border-zinc-700'
              }`}
            >
              <FilePlus2 className={`w-3.5 h-3.5 ${isDirty ? 'text-rose-500' : 'text-zinc-500'}`} />
              <span>{isDirty ? 'Discard Unsaved Changes' : 'Create Blank Song'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-200/80 dark:border-zinc-800">
            {onOpenImport ? (
              <button
                id="new-song-import-score-btn"
                type="button"
                onClick={() => {
                  onClose();
                  onOpenImport();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10 font-bold text-xs rounded-lg transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Import Score (JSON/Text)</span>
              </button>
            ) : <div />}

            <button
              id="new-song-cancel-btn"
              type="button"
              onClick={onClose}
              className="flex items-center justify-center px-3 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 font-medium text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
