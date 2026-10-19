'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import type { Song, AbRange } from '@/types/song';
import type { BatchMeasureRange } from './ContextualEditDeck';
import {
  extractLyricsFromScope,
  distributeLyricsAcrossNotes,
  splitTaigiLyricSyllables,
  applyLyricTokensToSong,
  getSongVerseCount,
} from '@/lib/taigiUtils';
import {
  separateDualLineLyrics,
  parseAndPairBilingualLyrics,
} from '@/lib/multilingualUtils';
import { smartFindSystemRange } from '@/lib/abOperations';
import {
  AlignLeft,
  Sparkles,
  ExternalLink,
  X,
  ArrowRightLeft,
} from 'lucide-react';

export interface InlineLyricSpreaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  onUpdateSong: (updatedSong: Song) => void;
  onOpenAligner?: () => void;
  currentMIdx: number;
  currentNIdx: number;
  activeVerseRow: number;
  abRange: AbRange | null;
  batchMeasureRange: BatchMeasureRange;
  initialScope?: 'cursor' | 'bar' | 'line' | 'range';
}

const InlineLyricSpreaderModalContent: React.FC<InlineLyricSpreaderModalProps> = ({
  onClose,
  song,
  onUpdateSong,
  onOpenAligner,
  currentMIdx,
  currentNIdx,
  activeVerseRow,
  abRange,
  batchMeasureRange,
  initialScope = 'cursor',
}) => {
  const [mode, setMode] = useState<'dual' | 'single'>('dual');
  const [scope, setScope] = useState<'cursor' | 'bar' | 'line' | 'range'>(initialScope);
  const [skipRestsAndTies, setSkipRestsAndTies] = useState<boolean>(true);
  const [verse, setVerse] = useState<number>(activeVerseRow);

  const initialExtracted = useMemo(() => {
    if (initialScope === 'cursor') return { hanlo: '', poj: '', single: '' };
    let startMeasureIdx = currentMIdx;
    let startNoteIdx: number | undefined = 0;
    let endMeasureIdx: number | undefined = currentMIdx;
    const endNoteIdx: number | undefined = undefined;

    if (initialScope === 'bar') {
      startMeasureIdx = currentMIdx;
      startNoteIdx = 0;
      endMeasureIdx = currentMIdx;
    } else if (initialScope === 'line') {
      const sysRange = smartFindSystemRange(song, currentMIdx);
      startMeasureIdx = sysRange.startMeasureIndex;
      startNoteIdx = 0;
      endMeasureIdx = sysRange.endMeasureIndex;
    } else if (initialScope === 'range') {
      const rStart = abRange ? abRange.startMeasureIndex : batchMeasureRange.start;
      const rEnd = abRange ? abRange.endMeasureIndex : batchMeasureRange.end;
      startMeasureIdx = Math.min(rStart, rEnd);
      startNoteIdx = 0;
      endMeasureIdx = Math.max(rStart, rEnd);
    }
    const extracted = extractLyricsFromScope(song, {
      startMeasureIdx,
      startNoteIdx,
      endMeasureIdx,
      endNoteIdx,
      verseIndex: activeVerseRow,
      skipRests: true,
      skipTiedNotes: true,
    });
    return {
      hanlo: extracted.hanloText,
      poj: extracted.romanText,
      single: [extracted.hanloText, extracted.romanText].filter(Boolean).join('\n'),
    };
  }, [initialScope, song, currentMIdx, activeVerseRow, abRange, batchMeasureRange]);

  const [hanloText, setHanloText] = useState(initialExtracted.hanlo);
  const [pojText, setPojText] = useState(initialExtracted.poj);
  const [singleInput, setSingleInput] = useState(initialExtracted.single);
  const [singleField, setSingleField] = useState<'auto' | 'roman' | 'hanlo'>('auto');

  const verseCount = useMemo(() => getSongVerseCount(song), [song]);

  const computeBounds = useCallback(
    (targetScope: 'cursor' | 'bar' | 'line' | 'range') => {
      if (targetScope === 'bar') {
        return {
          startMeasureIdx: currentMIdx,
          startNoteIdx: 0,
          endMeasureIdx: currentMIdx,
          endNoteIdx: undefined as number | undefined,
          label: `Bar #${currentMIdx + 1} Only`,
        };
      }
      if (targetScope === 'line') {
        const sysRange = smartFindSystemRange(song, currentMIdx);
        return {
          startMeasureIdx: sysRange.startMeasureIndex,
          startNoteIdx: 0,
          endMeasureIdx: sysRange.endMeasureIndex,
          endNoteIdx: undefined as number | undefined,
          label: `Current Line (Bars #${sysRange.startMeasureIndex + 1}–#${sysRange.endMeasureIndex + 1})`,
        };
      }
      if (targetScope === 'range') {
        const rStart = abRange ? abRange.startMeasureIndex : batchMeasureRange.start;
        const rEnd = abRange ? abRange.endMeasureIndex : batchMeasureRange.end;
        return {
          startMeasureIdx: Math.min(rStart, rEnd),
          startNoteIdx: 0,
          endMeasureIdx: Math.max(rStart, rEnd),
          endNoteIdx: undefined as number | undefined,
          label: `Selected Range (Bars #${Math.min(rStart, rEnd) + 1}–#${Math.max(rStart, rEnd) + 1})`,
        };
      }
      return {
        startMeasureIdx: currentMIdx,
        startNoteIdx: currentNIdx,
        endMeasureIdx: undefined as number | undefined,
        endNoteIdx: undefined as number | undefined,
        label: `From Bar #${currentMIdx + 1}, Note #${currentNIdx + 1} to End`,
      };
    },
    [currentMIdx, currentNIdx, song, abRange, batchMeasureRange]
  );

  const handleLoadScopeLyrics = useCallback(
    (
      targetScope: 'cursor' | 'bar' | 'line' | 'range' = scope,
      targetVerse: number = verse,
      skipFlag: boolean = skipRestsAndTies
    ) => {
      const bounds = computeBounds(targetScope);
      const extracted = extractLyricsFromScope(song, {
        startMeasureIdx: bounds.startMeasureIdx,
        startNoteIdx: bounds.startNoteIdx,
        endMeasureIdx: bounds.endMeasureIdx,
        endNoteIdx: bounds.endNoteIdx,
        verseIndex: targetVerse,
        skipRests: skipFlag,
        skipTiedNotes: skipFlag,
      });
      setHanloText(extracted.hanloText);
      setPojText(extracted.romanText);
      const combined = [extracted.hanloText, extracted.romanText].filter(Boolean).join('\n');
      setSingleInput(combined);
    },
    [scope, verse, skipRestsAndTies, computeBounds, song]
  );



  const handleSwapLines = () => {
    setHanloText((prev) => {
      const curPoj = pojText;
      setPojText(prev);
      return curPoj;
    });
  };

  const handleApply = () => {
    const bounds = computeBounds(scope);
    if (mode === 'dual') {
      if (!hanloText.trim() && !pojText.trim()) return;
      const tokens = parseAndPairBilingualLyrics(
        hanloText,
        pojText,
        song.language || 'taigi',
        { preserveHyphens: true }
      );
      const updated = applyLyricTokensToSong(song, tokens, {
        startMeasureIdx: bounds.startMeasureIdx,
        startNoteIdx: bounds.startNoteIdx,
        endMeasureIdx: bounds.endMeasureIdx,
        endNoteIdx: bounds.endNoteIdx,
        verseIndex: verse,
        skipRests: skipRestsAndTies,
        skipTiedNotes: skipRestsAndTies,
      });
      onUpdateSong(updated);
      onClose();
      setHanloText('');
      setPojText('');
      setSingleInput('');
      return;
    }

    if (!singleInput.trim()) return;
    const lines = singleInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    if (lines.length >= 2) {
      const sep = separateDualLineLyrics(singleInput);
      if (sep.hanloText && sep.romanText) {
        const tokens = parseAndPairBilingualLyrics(
          sep.hanloText,
          sep.romanText,
          song.language || 'taigi',
          { preserveHyphens: true }
        );
        const updated = applyLyricTokensToSong(song, tokens, {
          startMeasureIdx: bounds.startMeasureIdx,
          startNoteIdx: bounds.startNoteIdx,
          endMeasureIdx: bounds.endMeasureIdx,
          endNoteIdx: bounds.endNoteIdx,
          verseIndex: verse,
          skipRests: skipRestsAndTies,
          skipTiedNotes: skipRestsAndTies,
        });
        onUpdateSong(updated);
        onClose();
        setSingleInput('');
        setHanloText('');
        setPojText('');
        return;
      }
    }

    const updated = distributeLyricsAcrossNotes(
      singleInput,
      song,
      bounds.startMeasureIdx,
      bounds.startNoteIdx,
      verse,
      singleField,
      {
        endMeasureIdx: bounds.endMeasureIdx,
        endNoteIdx: bounds.endNoteIdx,
        skipRests: skipRestsAndTies,
        skipTiedNotes: skipRestsAndTies,
      }
    );
    onUpdateSong(updated);
    onClose();
  };

  const activeBounds = computeBounds(scope);
  const scopeStats = extractLyricsFromScope(song, {
    startMeasureIdx: activeBounds.startMeasureIdx,
    startNoteIdx: activeBounds.startNoteIdx,
    endMeasureIdx: activeBounds.endMeasureIdx,
    endNoteIdx: activeBounds.endNoteIdx,
    verseIndex: verse,
    skipRests: skipRestsAndTies,
    skipTiedNotes: skipRestsAndTies,
  });

  const dualTokens = parseAndPairBilingualLyrics(
    hanloText,
    pojText,
    song.language || 'taigi',
    { preserveHyphens: true }
  );

  const singleLines = singleInput.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const autoSeparated = singleLines.length >= 2 ? separateDualLineLyrics(singleInput) : null;
  const isAutoDual = Boolean(autoSeparated && autoSeparated.hanloText && autoSeparated.romanText);
  const autoTokens = isAutoDual && autoSeparated
    ? parseAndPairBilingualLyrics(
        autoSeparated.hanloText,
        autoSeparated.romanText,
        song.language || 'taigi',
        { preserveHyphens: true }
      )
    : null;
  const singleSyllables = splitTaigiLyricSyllables(singleInput);
  const parsedSyllableCount =
    mode === 'dual'
      ? dualTokens.length
      : isAutoDual && autoTokens
      ? autoTokens.length
      : singleSyllables.length;

  const canDistribute = mode === 'dual'
    ? Boolean(hanloText.trim() || pojText.trim())
    : Boolean(singleInput.trim());

  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && canDistribute) {
      e.preventDefault();
      handleApply();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      id="lyric-spreader-backdrop"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 print:hidden"
      onClick={onClose}
    >
      <div
        id="lyric-spreader-card"
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-[#181b24] border border-amber-500/80 rounded-2xl shadow-2xl p-5 max-w-xl w-full text-left animate-in fade-in zoom-in-95 duration-150 select-none z-50"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-zinc-200 dark:border-zinc-800">
          <div className="flex items-center gap-2">
            <AlignLeft className="w-5 h-5 text-amber-500 shrink-0" />
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <span>Spread & Edit Lyrics</span>
                <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 text-[10px] font-mono font-bold">
                  Bilingual
                </span>
              </h3>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                {activeBounds.label} · {scopeStats.singableNoteCount} singable note(s)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleLoadScopeLyrics()}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 text-xs font-bold border border-zinc-300 dark:border-zinc-700 transition-all cursor-pointer"
              title="Load existing lyrics from the selected scope into the editor boxes"
            >
              <span>Load Existing</span>
            </button>
            {onOpenAligner && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenAligner();
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-700 dark:text-amber-300 text-xs font-bold border border-amber-500/30 transition-all cursor-pointer"
                title="Open full Lyric Aligner with Note-by-Note Review Plan matrix"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Full Aligner</span>
                <ExternalLink className="w-3 h-3 opacity-70" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-md cursor-pointer transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scope Selector Tabs */}
        <div className="flex items-center gap-1 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl mb-2.5 border border-zinc-200 dark:border-zinc-700 text-[11px] font-bold">
          {(
            [
              { id: 'cursor', label: 'From Cursor' },
              { id: 'bar', label: `Bar #${currentMIdx + 1}` },
              { id: 'line', label: 'Current Line' },
              { id: 'range', label: 'Selected Range' },
            ] as const
          ).map((sc) => (
            <button
              key={sc.id}
              type="button"
              onClick={() => {
                setScope(sc.id);
                if (sc.id !== 'cursor' && !hanloText.trim() && !pojText.trim() && !singleInput.trim()) {
                  handleLoadScopeLyrics(sc.id);
                }
              }}
              className={`flex-1 py-1 px-2 rounded-lg transition-all cursor-pointer text-center ${
                scope === sc.id
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
              }`}
            >
              {sc.label}
            </button>
          ))}
        </div>

        {/* Mode Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-zinc-100 dark:bg-zinc-800/80 rounded-xl mb-3 border border-zinc-200 dark:border-zinc-700 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('dual')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              mode === 'dual'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            <span>Two Lines: Han-lo + POJ</span>
          </button>
          <button
            type="button"
            onClick={() => setMode('single')}
            className={`flex-1 py-1.5 px-3 rounded-lg transition-all cursor-pointer text-center flex items-center justify-center gap-1.5 ${
              mode === 'single'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-bold shadow-xs'
                : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
            }`}
          >
            <span>Single Line / Quick Paste</span>
          </button>
        </div>

        {/* Target Settings */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-zinc-600 dark:text-zinc-400">Verse:</span>
              <select
                value={verse}
                onChange={(e) => setVerse(Number(e.target.value))}
                className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-bold"
              >
                {Array.from({ length: Math.max(verseCount, 5) }, (_, i) => i + 1).map((v) => (
                  <option key={v} value={v}>
                    Verse {v}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'single' && (
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-zinc-600 dark:text-zinc-400">Field:</span>
                <select
                  value={singleField}
                  onChange={(e) => setSingleField(e.target.value as 'auto' | 'roman' | 'hanlo')}
                  className="px-2 py-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-bold"
                >
                  <option value="auto">Auto-detect</option>
                  <option value="roman">Romanization (POJ)</option>
                  <option value="hanlo">Han-lo</option>
                </select>
              </div>
            )}
          </div>

          <label className="flex items-center gap-1.5 cursor-pointer select-none text-zinc-700 dark:text-zinc-300 font-semibold">
            <input
              type="checkbox"
              checked={skipRestsAndTies}
              onChange={(e) => setSkipRestsAndTies(e.target.checked)}
              className="rounded border-zinc-300 text-amber-500 focus:ring-amber-500 cursor-pointer"
            />
            <span>Skip Rests (0) & Tied Notes</span>
          </label>
        </div>

        {/* Inputs */}
        {mode === 'dual' ? (
          <div className="space-y-2.5 mb-3">
            {/* Line 1: Han-lo */}
            <div>
              <div className="flex items-center justify-between mb-1 text-xs">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-zinc-200 dark:bg-zinc-700 text-[10px] font-mono">Line 1</span>
                  <span>Han-lo Script</span>
                </label>
                <span className="text-[10px] text-zinc-400">Primary script characters</span>
              </div>
              <textarea
                rows={2}
                value={hanloText}
                onChange={(e) => setHanloText(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="Paste or type Han-lo lyrics here..."
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-serif text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            {/* Swap Lines Button */}
            <div className="flex items-center justify-between -my-1">
              <span className="text-[10px] font-mono text-zinc-400">
                Tip: Press Cmd/Ctrl + Enter to apply immediately
              </span>
              <button
                type="button"
                onClick={handleSwapLines}
                className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-700 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 hover:bg-amber-500/10 rounded-md transition-colors cursor-pointer"
                title="Swap Line 1 and Line 2"
              >
                <ArrowRightLeft className="w-3.5 h-3.5" />
                <span>Swap Lines</span>
              </button>
            </div>

            {/* Line 2: POJ */}
            <div>
              <div className="flex items-center justify-between mb-1 text-xs">
                <label className="font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 text-[10px] font-mono">Line 2</span>
                  <span>POJ / Romanization</span>
                </label>
                <span className="text-[10px] text-zinc-400">Romanization with tone marks & hyphens</span>
              </div>
              <textarea
                rows={2}
                value={pojText}
                onChange={(e) => setPojText(e.target.value)}
                onKeyDown={handleTextareaKeyDown}
                placeholder="e.g. To̍k-iā bô-phōaⁿ siú teng-ē"
                className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-serif text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>
        ) : (
          <div className="mb-3">
            <label className="block text-xs font-bold text-zinc-700 dark:text-zinc-300 mb-1">
              Paste or type full phrase / verse line:
            </label>
            <textarea
              autoFocus
              rows={3}
              value={singleInput}
              onChange={(e) => setSingleInput(e.target.value)}
              onKeyDown={handleTextareaKeyDown}
              placeholder="e.g. To̍k-iā bô-phōaⁿ siú teng-ē (or paste 2 lines to auto-pair Han-lo + POJ)"
              className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 rounded-xl text-sm font-serif text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-amber-500"
            />
            {isAutoDual && (
              <div className="mt-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs flex items-center justify-between">
                <span>💡 <strong>Auto-detected 2 lines:</strong> Han-lo + POJ will pair onto the same notes!</span>
                <button
                  type="button"
                  onClick={() => {
                    if (autoSeparated) {
                      setHanloText(autoSeparated.hanloText);
                      setPojText(autoSeparated.romanText);
                      setMode('dual');
                    }
                  }}
                  className="underline font-bold text-amber-800 dark:text-amber-200 cursor-pointer ml-2"
                >
                  Edit in Two Lines ➔
                </button>
              </div>
            )}
          </div>
        )}

        {/* Syllable Tokens Preview */}
        {mode === 'dual' ? (
          dualTokens.length > 0 && (
            <div className="mb-4 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between text-xs mb-1.5 text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Paired Syllables ({dualTokens.length} / {scopeStats.singableNoteCount} singable notes in scope)
                </span>
                <span
                  className={`font-mono text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    dualTokens.length === scopeStats.singableNoteCount
                      ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                      : 'bg-amber-500/15 text-amber-700 dark:text-amber-300'
                  }`}
                >
                  {dualTokens.length === scopeStats.singableNoteCount
                    ? 'Exact Fit'
                    : dualTokens.length < scopeStats.singableNoteCount
                    ? `${scopeStats.singableNoteCount - dualTokens.length} note(s) remaining`
                    : `${dualTokens.length - scopeStats.singableNoteCount} extra syllable(s)`}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
                {dualTokens.map((tok, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs shadow-2xs min-w-[36px]"
                  >
                    <span className="font-serif font-bold text-zinc-900 dark:text-zinc-100">
                      {tok.hanlo || '—'}
                    </span>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                      {tok.poj || '—'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )
        ) : isAutoDual && autoTokens ? (
          <div className="mb-4 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <div className="flex items-center justify-between text-xs mb-1.5 text-zinc-500 dark:text-zinc-400">
              <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                Auto-Paired Syllables ({autoTokens.length} / {scopeStats.singableNoteCount} notes)
              </span>
              <span className="font-mono text-[10px]">Both tiers assign to the same note</span>
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1">
              {autoTokens.map((tok, idx) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center px-2 py-1 rounded-lg bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs shadow-2xs min-w-[36px]"
                >
                  <span className="font-serif font-bold text-zinc-900 dark:text-zinc-100">
                    {tok.hanlo || '—'}
                  </span>
                  <span className="text-[10px] text-amber-600 dark:text-amber-400 font-mono">
                    {tok.poj || '—'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          singleInput.trim() && (
            <div className="mb-4 p-2.5 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <div className="flex items-center justify-between text-xs mb-1.5 text-zinc-500 dark:text-zinc-400">
                <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                  Parsed Syllables ({singleSyllables.length} / {scopeStats.singableNoteCount} singable notes)
                </span>
                <span className="font-mono text-[10px]">Each syllable assigns to one note</span>
              </div>
              <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto">
                {singleSyllables.map((syl, sIdx) => (
                  <span
                    key={sIdx}
                    className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-xs font-medium text-amber-700 dark:text-amber-300 shadow-2xs"
                  >
                    {syl}
                  </span>
                ))}
              </div>
            </div>
          )
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-zinc-200 dark:border-zinc-800 text-xs">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 cursor-pointer"
          >
            Cancel
          </button>
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline text-[10px] font-mono text-zinc-400">
              {parsedSyllableCount > 0 ? `${parsedSyllableCount} syl` : ''}
            </span>
            <button
              type="button"
              disabled={!canDistribute}
              onClick={handleApply}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold text-xs shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-95"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Distribute Across Notes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export const InlineLyricSpreaderModal: React.FC<InlineLyricSpreaderModalProps> = (props) => {
  if (!props.isOpen) return null;
  return <InlineLyricSpreaderModalContent {...props} />;
};

