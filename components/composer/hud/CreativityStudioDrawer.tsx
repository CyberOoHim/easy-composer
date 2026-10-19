'use client';

import React from 'react';
import {
  Wand2,
  Lightbulb,
  Sparkles,
  X,
} from 'lucide-react';
import type { AccompanimentStyle } from '@/lib/storage';
import { CHORD_PROGRESSION_PRESETS } from '@/lib/creativityEngine';

export interface CreativityStudioDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  effectiveAccompanimentStyle: AccompanimentStyle;
  onSelectAccompanimentStyle: (style: AccompanimentStyle) => void;
  effectivePentatonicMode: boolean;
  onTogglePentatonic: () => void;
  selectedMeasureNumber?: number;
  onApplyMotifTool?: (tool: 'invert' | 'retrograde' | 'seq_up' | 'seq_down' | 'ornaments' | 'spark') => void;
  onApplyChordProgressionPreset?: (presetId: string) => void;
}

export const CreativityStudioDrawer: React.FC<CreativityStudioDrawerProps> = ({
  isOpen,
  onClose,
  effectiveAccompanimentStyle,
  onSelectAccompanimentStyle,
  effectivePentatonicMode,
  onTogglePentatonic,
  selectedMeasureNumber,
  onApplyMotifTool,
  onApplyChordProgressionPreset,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="floating-score-hud-creativity-bar"
      className="pointer-events-auto w-full max-w-full min-w-0 bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap no-scrollbar touch-momentum touch-pan-x animate-in fade-in slide-in-from-bottom-1 duration-150"
    >
      {/* Title / Studio Header */}
      <div className="flex items-center gap-1.5 text-amber-500 shrink-0 font-bold">
        <Wand2 className="w-4 h-4" />
        <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 shrink-0">
          Creativity Studio:
        </span>
      </div>

      {/* Accompaniment Styles Group (MOD-4) */}
      <div className="flex items-center gap-1 shrink-0 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
        <span className="text-2xs font-extrabold text-zinc-500 uppercase px-1 hidden md:inline">
          Style:
        </span>
        {(
          [
            { id: 'block', label: 'Block', desc: 'Block Chords (Steady 4-beat piano)' },
            { id: 'arpeggio', label: 'Arpeggio', desc: 'Rolling 8th-note Arpeggios' },
            { id: 'folk', label: 'Folk', desc: 'Folk Boom-Chick (Bass + offbeat strum)' },
            { id: 'waltz', label: 'Waltz', desc: 'Waltz 3/4 (Bass + dual chords)' },
          ] as const
        ).map(st => (
          <button
            key={st.id}
            id={`floating-hud-style-${st.id}-btn`}
            type="button"
            onClick={() => onSelectAccompanimentStyle(st.id)}
            className={`min-h-[44px] px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
              effectiveAccompanimentStyle === st.id
                ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
            title={`${st.desc} · Click to select and audition preview`}
          >
            {st.label}
          </button>
        ))}
      </div>

      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

      {/* Pentatonic Scale Mode Toggle (MOD-6) */}
      <div className="flex items-center gap-1 shrink-0">
        <button
          id="floating-hud-pentatonic-toggle-btn"
          type="button"
          onClick={onTogglePentatonic}
          className={`min-h-[44px] px-3 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 border ${
            effectivePentatonicMode
              ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/60 font-black shadow-xs'
              : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:bg-zinc-200 dark:hover:bg-zinc-700'
          }`}
          title="Toggle Pentatonic Mode: Highlights Gong/Yu 5-tone degrees (1, 2, 3, 5, 6) across HUD and dims 4 & 7"
        >
          <Lightbulb className={`w-4 h-4 ${effectivePentatonicMode ? 'text-amber-500' : 'text-zinc-400'}`} />
          <span>Pentatonic: {effectivePentatonicMode ? 'ON' : 'OFF'}</span>
        </button>
      </div>

      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

      {/* Melodic Motif Variations Group (MOD-6) */}
      <div className="flex items-center gap-1 shrink-0 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
        <span className="text-2xs font-extrabold text-zinc-500 uppercase px-1 hidden lg:inline">
          Bar #{selectedMeasureNumber || 1} Motif:
        </span>
        <button
          id="floating-hud-motif-invert-btn"
          type="button"
          onClick={() => onApplyMotifTool?.('invert')}
          className="min-h-[44px] px-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer flex items-center gap-1"
          title="Invert Motif: Diatonically flip pitch contours across first note axis"
        >
          Invert
        </button>
        <button
          id="floating-hud-motif-retrograde-btn"
          type="button"
          onClick={() => onApplyMotifTool?.('retrograde')}
          className="min-h-[44px] px-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer flex items-center gap-1"
          title="Retrograde: Reverse pitch order while preserving durations and lyrics"
        >
          Retrograde
        </button>
        <button
          id="floating-hud-motif-seq-up-btn"
          type="button"
          onClick={() => onApplyMotifTool?.('seq_up')}
          className="min-h-[44px] px-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer flex items-center gap-1"
          title="Sequence +1: Diatonic transpose scale degrees up by 1 step"
        >
          Seq +1
        </button>
        <button
          id="floating-hud-motif-seq-down-btn"
          type="button"
          onClick={() => onApplyMotifTool?.('seq_down')}
          className="min-h-[44px] px-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer flex items-center gap-1"
          title="Sequence -1: Diatonic transpose scale degrees down by 1 step"
        >
          Seq -1
        </button>
        <button
          id="floating-hud-motif-ornaments-btn"
          type="button"
          onClick={() => onApplyMotifTool?.('ornaments')}
          className="min-h-[44px] px-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer flex items-center gap-1"
          title="Folk Ornaments: Embellish notes ≥ 0.5 beat with authentic Taiwanese grace notes"
        >
          Folk Ornaments
        </button>
        <button
          id="floating-hud-motif-spark-btn"
          type="button"
          onClick={() => onApplyMotifTool?.('spark')}
          className="min-h-[44px] px-3 bg-amber-500 text-zinc-950 font-black rounded-lg text-xs hover:bg-amber-400 transition-all cursor-pointer flex items-center gap-1 shadow-2xs"
          title="Melody Spark: Generate a 1-measure pentatonic melodic motif matching current chord"
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>⚡ Spark</span>
        </button>
      </div>

      <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

      {/* Chord Progression Presets Group (MOD-6) */}
      <div className="flex items-center gap-1 shrink-0 bg-zinc-100 dark:bg-zinc-800/80 p-1 rounded-xl border border-zinc-200 dark:border-zinc-700/80">
        <span className="text-2xs font-extrabold text-zinc-500 uppercase px-1 hidden xl:inline">
          Harmonic Presets:
        </span>
        {CHORD_PROGRESSION_PRESETS.map(preset => (
          <button
            key={preset.id}
            id={`floating-hud-preset-${preset.id}-btn`}
            type="button"
            onClick={() => onApplyChordProgressionPreset?.(preset.id)}
            className="min-h-[44px] px-2.5 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer flex flex-col justify-center items-start leading-tight"
            title={`${preset.name}: ${preset.degrees.join(' - ')} · ${preset.description}`}
          >
            <span className="font-extrabold">{preset.name.split(' (')[0]}</span>
            <span className="text-[10px] text-zinc-500 dark:text-zinc-400">{preset.degrees.slice(0, 4).join('-')}</span>
          </button>
        ))}
      </div>

      {/* Close Button */}
      <button
        type="button"
        onClick={onClose}
        className="min-h-[44px] min-w-[44px] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer flex items-center justify-center"
        title="Close Creativity Studio (Esc)"
      >
        <X className="w-5 h-5" />
      </button>
      <div className="w-2 shrink-0" aria-hidden="true" />
    </div>
  );
};
