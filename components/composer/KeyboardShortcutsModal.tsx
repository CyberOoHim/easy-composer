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
    title: 'Note Input Modes (音符輸入模式)',
    items: [
      { keyDesc: 'Replace', action: 'Direct Replace: Update pitch at caret position (覆蓋當前音符)' },
      { keyDesc: 'Prog. Replace', action: 'Progressive Replace: Overwrite & advance cursor (覆蓋並自動前進)' },
      { keyDesc: 'Prog. Insert', action: 'Progressive Insert: Insert new note after & advance (插入並自動前進)' },
    ],
  },
  {
    title: 'Pitches & Durations (簡譜音高與時值)',
    items: [
      { keyDesc: '1 ~ 7', action: 'Type pitch (Numbered notation 1 to 7)', badge: 'Pitch' },
      { keyDesc: '0', action: 'Rest note (休止符 0)', badge: 'Rest' },
      { keyDesc: '-', action: 'Sustain dash / extend note duration (延音線 -)', badge: 'Dash' },
      { keyDesc: '/', action: 'Halve note duration (時值減半: 1 ➔ 1/2 ➔ 1/4)' },
      { keyDesc: '*', action: 'Double note duration (時值加倍: 1/4 ➔ 1/2 ➔ 1 ➔ 2 ➔ 4)' },
      { keyDesc: '.', action: 'Toggle dotted note (切換附點音符)' },
      { keyDesc: '+ / =', action: 'Octave shift up (高音點 8va)' },
      { keyDesc: '_ / -', action: 'Octave shift down (低音點 8vb)' },
    ],
  },
  {
    title: 'Advanced Note & Measure Operations (音符與小節增刪)',
    items: [
      { keyDesc: 'Shift + + / +', action: 'Insert new note after current note (在當前音符後插入新音符)' },
      { keyDesc: 'Delete / Backspace', action: 'Delete current note (刪除當前音符)' },
      { keyDesc: 'Alt + Shift + →', action: 'Push current & following notes to next measure (將當前音符及之後的音符推至下一小節)' },
      { keyDesc: 'Alt + Shift + ←', action: 'Shift start & notes up to current to preceding measure (將當前音符及之前的音符移至上一小節)' },
      { keyDesc: 'Shift + Enter', action: 'Add measure after current measure (在當前小節後插入新小節)' },
      { keyDesc: 'Ctrl + Shift + Backspace', action: 'Delete current measure (刪除當前小節)' },
      { keyDesc: 'Rearrange', action: 'Auto-Rearrange measures to match time signature (小節自動重排依拍號對齊)' },
    ],
  },
  {
    title: 'Modifiers & Articulations (音符記號與修飾)',
    items: [
      { keyDesc: 'S', action: 'Toggle Slur arc across notes (圓滑線 ⌒)' },
      { keyDesc: 'T', action: 'Toggle Tie sustain across same pitch (同音連線)' },
      { keyDesc: '#', action: 'Sharp accidental (升記號 ♯)' },
      { keyDesc: 'b', action: 'Flat accidental (降記號 ♭)' },
    ],
  },
  {
    title: 'Navigation & History (游標移動與歷史)',
    items: [
      { keyDesc: '← / →', action: 'Move selection caret across notes (移動選取游標)' },
      { keyDesc: '↑ / ↓', action: 'Switch between Pitch and Lyric rows (切換簡譜與歌詞行)' },
      { keyDesc: 'Ctrl + Z / ⌘Z', action: 'Undo last change (復原)' },
      { keyDesc: 'Ctrl + Y / ⌘⇧Z', action: 'Redo change (重做)' },
      { keyDesc: 'Space', action: 'Play / Stop score playback (播放 / 停止)' },
      { keyDesc: 'Tab / Enter', action: 'Next lyric syllable in lyrics mode (切換下一個歌詞)' },
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
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
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
            <span>Keyboard Shortcuts Guide (快捷鍵指南)</span>
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
            Got It (知道了)
          </button>
        </div>
      </div>
    </div>
  );
};
