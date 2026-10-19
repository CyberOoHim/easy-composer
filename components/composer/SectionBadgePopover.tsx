'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Bookmark, X, Check, Trash2 } from 'lucide-react';

export interface SectionBadgePopoverProps {
  isOpen: boolean;
  measureIndex: number | null;
  measureNumber: number;
  initialValue: string;
  onSave: (measureIndex: number, section: string) => void;
  onClose: () => void;
}

export const SectionBadgePopover: React.FC<SectionBadgePopoverProps> = ({
  isOpen,
  measureIndex,
  measureNumber,
  initialValue,
  onSave,
  onClose,
}) => {
  const [prevInitial, setPrevInitial] = useState(initialValue);
  const [value, setValue] = useState(initialValue);
  const inputRef = useRef<HTMLInputElement>(null);

  if (initialValue !== prevInitial) {
    setPrevInitial(initialValue);
    setValue(initialValue || '');
  }

  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || measureIndex === null) return null;

  const handleSave = (valToSave: string) => {
    onSave(measureIndex, valToSave);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
      onClick={onClose}
    >
      <div
        id="section-badge-editor-popover"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#181b24] border border-amber-400/90 dark:border-amber-500/90 rounded-2xl shadow-2xl p-4 sm:p-5 max-w-sm w-full text-left animate-in fade-in zoom-in-95 duration-150 select-none z-50"
      >
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-zinc-200 dark:border-zinc-800">
          <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
            <Bookmark className="w-4 h-4 text-amber-500 shrink-0" />
            Edit Section Badge (Bar #{measureNumber})
          </span>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md cursor-pointer transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-1.5 mb-3">
          <input
            type="text"
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSave(value);
              } else if (e.key === 'Escape') {
                onClose();
              }
            }}
            placeholder="e.g. Intro, Verse 1, Chorus, [A]"
            className="flex-1 px-3 py-2 bg-zinc-100 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button
            type="button"
            onClick={() => handleSave(value)}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold rounded-xl text-sm flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-2xs"
            title="Save badge (Enter)"
          >
            <Check className="w-4 h-4" />
            <span>Save</span>
          </button>
        </div>

        {/* Quick Presets */}
        <div className="mb-3 space-y-2.5">
          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Instrumental & Passages:
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {[
                { label: 'Intro', tip: 'Intro Section' },
                { label: 'Interlude', tip: 'Interlude Section' },
                { label: 'Outro', tip: 'Outro Section' },
              ].map((item) => (
                <button
                  key={item.label}
                  type="button"
                  title={item.tip}
                  onClick={() => handleSave(item.label)}
                  className="py-1.5 text-center text-xs font-mono font-extrabold rounded-lg bg-amber-500/10 hover:bg-amber-500 hover:text-zinc-950 text-amber-700 dark:text-amber-300 border border-amber-300/80 dark:border-amber-600/60 cursor-pointer transition-all active:scale-95"
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider mb-1.5">
              Song Sections & Form:
            </div>
            <div className="grid grid-cols-4 gap-1.5 mb-1.5">
              {['[A]', '[B]', '[C]', '[D]'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSave(preset)}
                  className="py-1 text-center text-xs font-mono font-bold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-all active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {['Verse 1', 'Verse 2', 'Chorus', 'Bridge', 'Coda'].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => handleSave(preset)}
                  className="px-2.5 py-1 text-xs font-sans font-bold rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700 cursor-pointer transition-all active:scale-95"
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer: Remove badge & keyboard hint */}
        <div className="pt-2.5 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-center text-xs">
          <button
            type="button"
            onClick={() => handleSave('')}
            className="text-rose-600 hover:text-rose-700 dark:text-rose-400 font-bold flex items-center gap-1 cursor-pointer transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Badge</span>
          </button>
          <span className="text-zinc-400 font-mono text-[10px]">↵ Save · Esc Close</span>
        </div>
      </div>
    </div>
  );
};
