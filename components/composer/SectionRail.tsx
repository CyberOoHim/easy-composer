'use client';

import React, { useMemo } from 'react';
import { Song } from '@/types/song';
import { getMeasureRhythmReport } from '@/lib/taigiUtils';
import { Bookmark, AlertCircle } from 'lucide-react';

interface SectionRailProps {
  song: Song;
  selectedMeasureIndex: number | null;
  onSelectMeasure: (measureIndex: number) => void;
  playingMeasureIdx?: number | null;
  onSelectSectionAbRange?: (range: { startMeasureIndex: number; endMeasureIndex: number }) => void;
}

interface SectionItem {
  id: string;
  name: string;
  startMeasureIndex: number;
  endMeasureIndex: number;
  startMeasureNumber: number;
  endMeasureNumber: number;
  chord?: string;
  noteCount: number;
  hasIncompleteMeasures: boolean;
}

export const SectionRail: React.FC<SectionRailProps> = React.memo(({
  song,
  selectedMeasureIndex,
  onSelectMeasure,
  playingMeasureIdx,
  onSelectSectionAbRange,
}) => {
  const sections = useMemo<SectionItem[]>(() => {
    if (!song.measures || song.measures.length === 0) return [];

    const sectionStarts: { index: number; name: string }[] = [];

    song.measures.forEach((m, idx) => {
      if (m.section && m.section.trim()) {
        const trimmed = m.section.trim();
        const lastSection = sectionStarts[sectionStarts.length - 1];
        if (!lastSection || lastSection.name !== trimmed) {
          sectionStarts.push({ index: idx, name: trimmed });
        }
      }
    });

    if (sectionStarts.length === 0 || sectionStarts[0].index !== 0) {
      sectionStarts.unshift({
        index: 0,
        name: sectionStarts.length > 0 ? 'Intro' : 'Section 1',
      });
    }

    // Chunk every 4 measures if there's only 1 default section and no explicit markers
    if (sectionStarts.length === 1 && !song.measures[0]?.section && song.measures.length > 4) {
      const chunkSize = song.notesPerLine || 4;
      sectionStarts.length = 0;
      for (let i = 0; i < song.measures.length; i += chunkSize) {
        const secNum = Math.floor(i / chunkSize) + 1;
        sectionStarts.push({ index: i, name: `Section ${secNum}` });
      }
    }

    return sectionStarts.map((curr, i) => {
      const next = sectionStarts[i + 1];
      const startMeasureIndex = curr.index;
      const endMeasureIndex = next ? next.index - 1 : song.measures.length - 1;

      let noteCount = 0;
      let hasIncompleteMeasures = false;
      for (let m = startMeasureIndex; m <= endMeasureIndex; m++) {
        const curM = song.measures[m];
        if (curM) {
          noteCount += curM.notes?.length || 0;
          const report = getMeasureRhythmReport(curM, song.timeSignature || '4/4');
          if (!report.isFull) {
            hasIncompleteMeasures = true;
          }
        }
      }

      return {
        id: `sec-${i}-${startMeasureIndex}`,
        name: curr.name,
        startMeasureIndex,
        endMeasureIndex,
        startMeasureNumber: song.measures[startMeasureIndex]?.measureNumber || startMeasureIndex + 1,
        endMeasureNumber: song.measures[endMeasureIndex]?.measureNumber || endMeasureIndex + 1,
        chord: song.measures[startMeasureIndex]?.chord,
        noteCount,
        hasIncompleteMeasures,
      };
    });
  }, [song]);

  if (sections.length <= 1 && song.measures.length <= 4) {
    return null;
  }

  return (
    <div
      id="composer-section-rail"
      className="flex items-center gap-1.5 px-2 py-1 bg-white/95 dark:bg-[#141720]/95 rounded-lg sm:rounded-xl border border-zinc-200/90 dark:border-zinc-800/80 shadow-2xs overflow-x-auto select-none no-scrollbar touch-pan-x min-h-[36px] print:hidden"
    >
      <div className="flex items-center gap-1 text-[11px] font-bold text-zinc-500 dark:text-zinc-400 shrink-0">
        <Bookmark className="w-3.5 h-3.5 text-amber-500" />
        <span className="hidden sm:inline">Sections:</span>
      </div>

      <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
        {sections.map((sec) => {
          const isSelected =
            selectedMeasureIndex !== null &&
            selectedMeasureIndex >= sec.startMeasureIndex &&
            selectedMeasureIndex <= sec.endMeasureIndex;

          const isPlaying =
            playingMeasureIdx !== null &&
            playingMeasureIdx !== undefined &&
            playingMeasureIdx >= sec.startMeasureIndex &&
            playingMeasureIdx <= sec.endMeasureIndex;

          return (
            <div
              key={sec.id}
              className={`inline-flex items-stretch rounded-lg text-xs font-bold transition-all shrink-0 border shadow-2xs overflow-hidden h-8 sm:h-8.5 ${
                isPlaying
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 ring-2 ring-amber-400 animate-pulse'
                  : isSelected
                  ? 'bg-amber-500/15 text-amber-950 dark:text-amber-100 border-amber-400/70'
                  : 'bg-zinc-100 dark:bg-[#0a0c10] text-zinc-700 dark:text-zinc-300 border-zinc-200/90 dark:border-zinc-800'
              }`}
            >
              {/* Jump to section button */}
              <button
                type="button"
                onClick={() => onSelectMeasure(sec.startMeasureIndex)}
                className="flex items-center gap-1 px-2.5 h-full hover:bg-black/5 dark:hover:bg-white/5 active:scale-98 cursor-pointer touch-manipulation min-h-[32px]"
                title={`Jump to ${sec.name} (Measures #${sec.startMeasureNumber}-#${sec.endMeasureNumber} · ${sec.noteCount} notes)`}
                aria-label={`Jump to ${sec.name}`}
              >
                <span>{sec.name}</span>
                {sec.chord && (
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold hidden md:inline">
                    [{sec.chord}]
                  </span>
                )}
                {sec.hasIncompleteMeasures && (
                  <span className="shrink-0 flex items-center" title="Section contains incomplete measure(s)">
                    <AlertCircle className="w-3 h-3 text-amber-500" />
                  </span>
                )}
              </button>

              {/* Set A-B range button */}
              {onSelectSectionAbRange && (
                <button
                  type="button"
                  onClick={() =>
                    onSelectSectionAbRange({
                      startMeasureIndex: sec.startMeasureIndex,
                      endMeasureIndex: sec.endMeasureIndex,
                    })
                  }
                  className={`h-full px-2 text-[10px] font-mono flex items-center justify-center border-l border-black/10 dark:border-white/10 hover:bg-amber-500 hover:text-zinc-950 transition-colors cursor-pointer touch-manipulation min-w-[36px] min-h-[32px] ${
                    isSelected
                      ? 'bg-amber-500/30 text-amber-950 dark:text-amber-100 font-black'
                      : 'text-zinc-500 dark:text-zinc-400'
                  }`}
                  title={`Set A-B selection to ${sec.name} (#${sec.startMeasureNumber}-#${sec.endMeasureNumber})`}
                  aria-label={`Set A-B selection to ${sec.name}`}
                >
                  #{sec.startMeasureNumber}-{sec.endMeasureNumber}
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
});

SectionRail.displayName = 'SectionRail';
