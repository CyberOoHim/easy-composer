'use client';

import React from 'react';
import {
  Music,
  Bookmark,
  Wand2,
  X,
} from 'lucide-react';

export interface ChordsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMeasureNumber?: number;
  currentMeasureChord: string;
  onUpdateMeasureChord?: (chord: string) => void;
  chordSuggestions: string[];
  currentMeasureSection?: string;
  onUpdateMeasureSection?: (section: string) => void;
  onAutoHarmonize?: () => void;
}

export const ChordsDrawer: React.FC<ChordsDrawerProps> = ({
  isOpen,
  onClose,
  selectedMeasureNumber,
  currentMeasureChord,
  onUpdateMeasureChord,
  chordSuggestions,
  currentMeasureSection,
  onUpdateMeasureSection,
  onAutoHarmonize,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="floating-score-hud-chords-bar"
      className="pointer-events-auto w-full max-w-full min-w-0 bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap no-scrollbar touch-momentum touch-pan-x animate-in fade-in slide-in-from-bottom-1 duration-150"
    >
      {/* Title / Measure Info */}
      <div className="flex items-center gap-1.5 text-amber-500 shrink-0 font-bold">
        <Music className="w-4 h-4" />
        <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 shrink-0">
          {selectedMeasureNumber ? `Bar #${selectedMeasureNumber} Chord:` : 'Chord:'}
        </span>
      </div>

      {/* Chord Input */}
      <input
        type="text"
        value={currentMeasureChord}
        onChange={e => onUpdateMeasureChord?.(e.target.value)}
        placeholder="e.g. C, G7, Am"
        className="w-22 sm:w-28 px-3 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-750 rounded-lg text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
      />

      {/* Suggested Chords */}
      {chordSuggestions.length > 0 && (
        <>
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5 hidden sm:block" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-zinc-400 uppercase hidden md:inline shrink-0">Suggestions:</span>
            {chordSuggestions.map(ch => (
              <button
                key={ch}
                type="button"
                onClick={() => onUpdateMeasureChord?.(ch)}
                className={`px-2.5 sm:px-3 py-1 rounded-lg font-mono font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0 ${
                  currentMeasureChord === ch
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500/20 text-zinc-800 dark:text-zinc-200'
                }`}
                title={`Set measure chord to ${ch}`}
              >
                {ch}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Section Badge Input */}
      {onUpdateMeasureSection && (
        <>
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5 hidden sm:block" />
          <div className="flex items-center gap-1.5 shrink-0">
            <span className="text-xs font-bold text-zinc-400 uppercase flex items-center gap-1 shrink-0">
              <Bookmark className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden md:inline">Section:</span>
            </span>
            <input
              type="text"
              value={currentMeasureSection}
              onChange={e => onUpdateMeasureSection(e.target.value)}
              placeholder="e.g. Intro, Interlude, Outro, [A]"
              className="w-24 sm:w-28 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-750 rounded-lg text-xs sm:text-sm font-mono font-bold text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500 shrink-0"
              title="Section badge name for current measure (English)"
            />
            <div className="flex items-center gap-1 shrink-0 hidden lg:flex">
              {['Intro', 'Interlude', 'Outro', '[A]', 'Chorus'].map(preset => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => onUpdateMeasureSection(preset)}
                  title={`Set section badge to ${preset}`}
                  className={`px-2 py-0.5 rounded text-xs font-mono font-bold transition-all cursor-pointer ${
                    currentMeasureSection === preset
                      ? 'bg-amber-500 text-zinc-950 font-black'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500/20 text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Auto Harmonize Button */}
      {onAutoHarmonize && (
        <>
          <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5 hidden sm:block" />
          <button
            type="button"
            onClick={() => {
              onAutoHarmonize();
              onClose();
            }}
            className="flex items-center gap-1.5 py-1 px-3 sm:px-3.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs sm:text-sm shadow-2xs transition-all cursor-pointer shrink-0"
            title="Auto-harmonize chords for all measures in song"
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>Auto-Harmonize</span>
          </button>
        </>
      )}

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer"
        title="Close Chords Bar (Esc)"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="w-2 shrink-0" aria-hidden="true" />
    </div>
  );
};
