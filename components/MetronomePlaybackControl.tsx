'use client';

import React from 'react';
import { Timer, Volume2, VolumeX } from 'lucide-react';
import { useMetronomePlayback } from '@/hooks/useMetronomePlayback';
import { audioEngine } from '@/lib/audioEngine';

interface MetronomePlaybackControlProps {
  variant?: 'toolbar' | 'compact' | 'inline' | 'card';
  className?: string;
  idPrefix?: string;
}

export const MetronomePlaybackControl: React.FC<MetronomePlaybackControlProps> = ({
  variant = 'toolbar',
  className = '',
  idPrefix = 'metronome-ctrl',
}) => {
  const {
    metronomeEnabled,
    metronomeVolume,
    toggleMetronomeEnabled,
    setMetronomeVolume,
  } = useMetronomePlayback();

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setMetronomeVolume(val);
  };

  const handlePointerUp = () => {
    // If not actively playing, give subtle audition feedback of metronome click at new volume
    if (!audioEngine.getIsPlaying() && metronomeEnabled && metronomeVolume > 0.05) {
      audioEngine.previewMetronome(true);
    }
  };

  if (variant === 'compact') {
    return (
      <div className={`inline-flex items-center gap-1.5 bg-zinc-100 dark:bg-[#141720] p-1 rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs ${className}`}>
        <button
          id={`${idPrefix}-toggle-btn`}
          type="button"
          onClick={toggleMetronomeEnabled}
          aria-pressed={metronomeEnabled}
          className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[32px] ${
            metronomeEnabled
              ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
              : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
          }`}
          title={metronomeEnabled ? 'Turn Metronome OFF' : 'Turn Metronome ON'}
        >
          <Timer className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] whitespace-nowrap">
            {metronomeEnabled ? 'Metro ON' : 'Metro OFF'}
          </span>
        </button>

        <div className="flex items-center gap-1 px-1">
          <input
            id={`${idPrefix}-volume-slider`}
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={metronomeVolume}
            disabled={!metronomeEnabled}
            onChange={handleVolumeChange}
            onPointerUp={handlePointerUp}
            className={`w-16 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-opacity ${
              !metronomeEnabled ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
            }`}
            title={`Metronome Volume: ${Math.round(metronomeVolume * 100)}%`}
          />
          <span className={`text-[10px] font-mono w-7 text-right ${metronomeEnabled ? 'text-zinc-700 dark:text-zinc-300 font-bold' : 'text-zinc-400'}`}>
            {Math.round(metronomeVolume * 100)}%
          </span>
        </div>
      </div>
    );
  }

  if (variant === 'card') {
    return (
      <div className={`flex flex-col gap-2 p-3 bg-zinc-50 dark:bg-[#12141c] rounded-xl border border-zinc-200/80 dark:border-zinc-800 ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs font-bold text-zinc-800 dark:text-zinc-200">
            <Timer className="w-3.5 h-3.5 text-amber-500" />
            <span>Metronome</span>
          </div>
          <button
            id={`${idPrefix}-card-toggle`}
            type="button"
            onClick={toggleMetronomeEnabled}
            aria-pressed={metronomeEnabled}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[30px] flex items-center gap-1 ${
              metronomeEnabled
                ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'
            }`}
            title={metronomeEnabled ? 'Turn Metronome OFF' : 'Turn Metronome ON'}
          >
            {metronomeEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span>{metronomeEnabled ? 'ON' : 'OFF'}</span>
          </button>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <input
            id={`${idPrefix}-card-volume-slider`}
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={metronomeVolume}
            disabled={!metronomeEnabled}
            onChange={handleVolumeChange}
            onPointerUp={handlePointerUp}
            className={`flex-1 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-opacity ${
              !metronomeEnabled ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
            }`}
          />
          <span className={`text-xs font-mono w-8 text-right font-bold ${metronomeEnabled ? 'text-zinc-800 dark:text-zinc-200' : 'text-zinc-400'}`}>
            {Math.round(metronomeVolume * 100)}%
          </span>
        </div>
      </div>
    );
  }

  // Default 'toolbar' variant: clean DAW studio transport cluster
  return (
    <div
      id={`${idPrefix}-container`}
      className={`flex items-center bg-zinc-100 dark:bg-[#141720] p-0.5 sm:p-1 rounded-xl border border-zinc-200/90 dark:border-zinc-700/80 shadow-2xs gap-1 sm:gap-2 shrink-0 ${className}`}
    >
      {/* Toggle Button */}
      <button
        id={`${idPrefix}-toggle-btn`}
        type="button"
        onClick={toggleMetronomeEnabled}
        aria-pressed={metronomeEnabled}
        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[36px] sm:min-h-[38px] shrink-0 ${
          metronomeEnabled
            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black shadow-xs'
            : 'bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-750 text-zinc-500 dark:text-zinc-400 font-semibold'
        }`}
        title={metronomeEnabled ? 'Mute Metronome' : 'Enable Metronome'}
      >
        <Timer className="w-3.5 sm:w-4 h-3.5 sm:h-4 shrink-0" />
        <span className="whitespace-nowrap">
          {metronomeEnabled ? 'Metronome ON' : 'Metronome OFF'}
        </span>
      </button>

      {/* Volume Slider & Percent Readout */}
      <div className="flex items-center gap-1.5 px-1 sm:px-1.5 shrink-0">
        <input
          id={`${idPrefix}-volume-slider`}
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={metronomeVolume}
          disabled={!metronomeEnabled}
          onChange={handleVolumeChange}
          onPointerUp={handlePointerUp}
          className={`w-14 sm:w-20 md:w-24 h-1.5 bg-zinc-300 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-amber-500 transition-opacity ${
            !metronomeEnabled ? 'opacity-30 cursor-not-allowed' : 'opacity-100'
          }`}
          title={`Metronome Volume: ${Math.round(metronomeVolume * 100)}%`}
        />
        <span
          className={`text-[11px] sm:text-xs font-mono w-8 text-right select-none ${
            metronomeEnabled ? 'text-zinc-800 dark:text-zinc-200 font-bold' : 'text-zinc-400'
          }`}
          title={`Metronome Volume: ${Math.round(metronomeVolume * 100)}%`}
        >
          {Math.round(metronomeVolume * 100)}%
        </span>
      </div>
    </div>
  );
};
