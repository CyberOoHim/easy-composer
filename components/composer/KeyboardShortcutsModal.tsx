'use client';

import React, { useEffect } from 'react';
import { Keyboard, X } from 'lucide-react';

export interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keyDesc: string;
  action: string;
  badge?: string;
}

const SHORTCUT_GROUPS: { title: string; items: ShortcutItem[] }[] = [
  {
    title: 'Note Input Modes',
    items: [
      { keyDesc: 'Replace', action: 'Direct Replace: Update pitch at caret position' },
      { keyDesc: 'Prog. Replace', action: 'Progressive Replace: Overwrite and advance cursor' },
      { keyDesc: 'Prog. Insert', action: 'Progressive Insert: Insert new note after and advance' },
    ],
  },
  {
    title: 'Pitches & Durations',
    items: [
      { keyDesc: '1 ~ 7', action: 'Type pitch (Numbered notation 1 to 7)', badge: 'Pitch' },
      { keyDesc: '0', action: 'Rest note (0)', badge: 'Rest' },
      { keyDesc: '` / _ / ␣', action: 'Empty / zero-beat spacer note (␣) [0 beats]', badge: 'Empty' },
      { keyDesc: '-', action: 'Sustain dash / extend note duration (-)', badge: 'Dash' },
      { keyDesc: '/', action: 'Halve note duration (1 ➔ 1/2 ➔ 1/4)' },
      { keyDesc: '*', action: 'Double note duration (1/4 ➔ 1/2 ➔ 1 ➔ 2 ➔ 4)' },
      { keyDesc: '.', action: 'Toggle dotted note' },
      { keyDesc: '+ / =', action: 'Octave shift up (8va dot above)' },
      { keyDesc: '_ / -', action: 'Octave shift down (8vb dot below)' },
    ],
  },
  {
    title: 'Advanced Note & Measure Operations',
    items: [
      { keyDesc: 'Shift + + / +', action: 'Insert new note after current note' },
      { keyDesc: 'Delete / Backspace', action: 'Delete current note' },
      { keyDesc: 'Alt + Shift + →', action: 'Push current and following notes to next measure' },
      { keyDesc: 'Alt + Shift + ←', action: 'Shift start and notes up to current to preceding measure' },
      { keyDesc: 'Shift + Enter', action: 'Add measure after current measure' },
      { keyDesc: 'Ctrl + Shift + Backspace', action: 'Delete current measure' },
      { keyDesc: 'Rearrange', action: 'Auto-Rearrange measures to match time signature' },
      { keyDesc: 'Auto Wrap', action: 'Auto-wrap measures to fit comfortably within realistic sheet paper' },
    ],
  },
  {
    title: 'Modifiers & Articulations',
    items: [
      { keyDesc: 'S', action: 'Toggle Slur arc across notes (⌒)' },
      { keyDesc: 'T', action: 'Toggle Tie sustain across same pitch' },
      { keyDesc: '#', action: 'Sharp accidental (♯)' },
      { keyDesc: 'b', action: 'Flat accidental (♭)' },
    ],
  },
  {
    title: 'Navigation & History',
    items: [
      { keyDesc: '← / →', action: 'Move selection caret across notes' },
      { keyDesc: '↑ / ↓', action: 'Switch between Pitch and Lyric rows' },
      { keyDesc: 'Ctrl + Z / ⌘Z', action: 'Undo last change' },
      { keyDesc: 'Ctrl + Y / ⌘⇧Z', action: 'Redo change' },
      { keyDesc: 'Space', action: 'Play / Stop score playback' },
      { keyDesc: 'Tab / Enter', action: 'Next lyric syllable in lyrics mode' },
    ],
  },
];

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  isOpen,
  onClose,
}) => {
  // Close on Escape key
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

  if (!isOpen) return null;

  return (
    <div
      id="shortcuts-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150 print:hidden"
      onClick={onClose}
    >
      <div
        id="shortcuts-modal-card"
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg max-h-[85vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-150"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-800 px-5 py-3.5 shrink-0">
          <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
            <Keyboard className="w-4 h-4 text-amber-500" />
            <span>Keyboard Shortcuts Guide</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg cursor-pointer transition-colors"
            title="Close (Esc)"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Scrollable */}
        <div className="overflow-y-auto p-4 sm:p-5 flex flex-col gap-4 text-xs">
          {SHORTCUT_GROUPS.map(group => (
            <div key={group.title} className="flex flex-col gap-1.5">
              <h4 className="text-[11px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">
                {group.title}
              </h4>
              <div className="grid grid-cols-1 gap-1.5">
                {group.items.map(item => (
                  <div
                    key={item.keyDesc}
                    className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200/60 dark:border-zinc-700/60"
                  >
                    <span className="text-zinc-700 dark:text-zinc-300 font-medium">
                      {item.action}
                    </span>
                    <kbd className="shrink-0 px-2 py-0.5 ml-2 rounded-lg bg-zinc-200 dark:bg-zinc-700 font-mono font-bold text-zinc-800 dark:text-zinc-200 text-[11px] shadow-2xs">
                      {item.keyDesc}
                    </kbd>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-5 py-3 bg-zinc-50/50 dark:bg-zinc-900/50 shrink-0">
          <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline">
            Press <kbd className="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 font-bold">Esc</kbd> anytime to close
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs hover:bg-amber-400 transition-colors cursor-pointer shadow-xs ml-auto"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  );
};
