'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { LyricSyllable, NoteDuration, Song, SongLanguage } from '@/types/song';
import {
  splitTaigiLyricSyllables,
  splitMultilingualLyrics,
  groupSongIntoVerses,
  isNonNotationItem,
  isPunctuationOrSpacer,
  normalizeSongDurations,
  applyLyricTokensToSong,
  getSongVerseCount,
} from '@/lib/taigiUtils';
import {
  AlignLeft,
  X,
  Check,
  Plus,
  Trash2,
  Edit2,
  Sparkles,
  Languages,
} from 'lucide-react';
import { getStoredQuickAlignTarget, setStoredQuickAlignTarget } from '@/lib/storage';

interface QuickLyricAlignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  onApplyLyrics: (updatedSong: Song) => void;
  activeCoordinate?: [number, number] | null;
}

interface VersePreviewItem {
  verseIndex: number;
  verseTitle: string;
  section?: string;
  measureRange: string;
  noteCount: number;
  tokens: LyricSyllable[];
}

export type TargetAlignMode = 'roman' | 'hanlo' | 'dual' | 'hanji' | 'poj' | 'tl' | 'custom';
export type AlignScope = 'all' | 'selection' | 'measure' | 'verse';

export const QuickLyricAlignerModal: React.FC<QuickLyricAlignerModalProps> = ({
  isOpen,
  onClose,
  song,
  onApplyLyrics,
  activeCoordinate,
}) => {
  const [alignLanguage, setAlignLanguage] = useState<SongLanguage>(() => song.language || 'taigi');
  const [prevSongLanguage, setPrevSongLanguage] = useState<SongLanguage | undefined>(song.language);

  if (song.language !== prevSongLanguage) {
    setPrevSongLanguage(song.language);
    setAlignLanguage(song.language || 'taigi');
  }
  const [inputText, setInputText] = useState('');
  const [romanText, setRomanText] = useState('');
  const [hanloText, setHanloText] = useState('');
  const [targetField, setTargetFieldState] = useState<TargetAlignMode>(() => {
    if (typeof window !== 'undefined') return getStoredQuickAlignTarget('roman');
    return 'roman';
  });

  // Scope selection: whole song, from selection, from specific measure, or specific verse
  const [alignScope, setAlignScope] = useState<AlignScope>(() => {
    return activeCoordinate ? 'selection' : 'all';
  });
  const [selectedStartMeasure, setSelectedStartMeasure] = useState<number>(() => {
    return activeCoordinate ? activeCoordinate[0] : 0;
  });
  const [selectedTargetVerse, setSelectedTargetVerse] = useState<number>(1);

  // Editable token state inside preview
  const [editingTokenCoord, setEditingTokenCoord] = useState<{ vIdx: number; tIdx: number } | null>(null);
  const [tokenDraftText, setTokenDraftText] = useState<string>('');

  const setTargetField = (mode: TargetAlignMode) => {
    setTargetFieldState(mode);
    if (mode === 'roman' || mode === 'hanlo' || mode === 'dual') {
      setStoredQuickAlignTarget(mode);
    }
  };
  const [versePreviews, setVersePreviews] = useState<VersePreviewItem[]>([]);

  // Total notes and verses available in song
  const totalNotesCount = useMemo(() => song.measures.reduce((acc, m) => acc + m.notes.length, 0), [song]);
  const songVerses = useMemo(() => groupSongIntoVerses(song), [song]);
  const verseCount = useMemo(() => getSongVerseCount(song), [song]);

  // Calculate notes available under current scope
  const targetScopeNotesCount = useMemo(() => {
    if (alignScope === 'all') return totalNotesCount;
    if (alignScope === 'selection' && activeCoordinate) {
      let count = 0;
      const [startM, startN] = activeCoordinate;
      for (let m = startM; m < song.measures.length; m++) {
        const notes = song.measures[m]?.notes || [];
        const nStart = m === startM ? startN : 0;
        count += Math.max(0, notes.length - nStart);
      }
      return count;
    }
    if (alignScope === 'measure') {
      let count = 0;
      for (let m = selectedStartMeasure; m < song.measures.length; m++) {
        count += song.measures[m]?.notes?.length || 0;
      }
      return count;
    }
    // 'verse' (parallel lyricsByVerse slot) and 'all' both span every note.
    return totalNotesCount;
  }, [alignScope, activeCoordinate, selectedStartMeasure, totalNotesCount, song]);

  const totalPreviewTokensCount = useMemo(() => {
    return versePreviews.reduce((acc, vp) => acc + vp.tokens.length, 0);
  }, [versePreviews]);

  // Pre-fill quick demo samples per language
  const handleLoadSample = (lang: SongLanguage) => {
    setAlignLanguage(lang);
    if (targetField === 'dual') {
      if (lang === 'english') {
        setRomanText('A-ma-zing grace, how sweet the sound\nThat saved a wretch like me');
        setHanloText('A-ma-zing grace, how sweet the sound\nThat saved a wretch like me');
      } else if (lang === 'mandarin') {
        setRomanText('Cháng tíng wài, gǔ dào biān\nFāng cǎo bì lián tiān');
        setHanloText('長亭外，古道邊\n芳草碧連天');
      } else if (lang === 'japanese') {
        setRomanText('Sa-ku-ra sa-ku-ra\nYa-yo-i no so-ra wa');
        setHanloText('桜[さくら] 桜[さくら]\n野山[のやま]も里[さと]も');
      } else {
        // Taigi default
        setRomanText('To̍k iā bô phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe');
        setHanloText('獨夜無伴守燈下\n清風對面吹');
      }
    } else {
      if (lang === 'english') {
        setInputText('A-ma-zing grace, how sweet the sound\nThat saved a wretch like me');
      } else if (lang === 'mandarin') {
        setInputText(
          targetField === 'roman'
            ? 'Cháng tíng wài, gǔ dào biān\nFāng cǎo bì lián tiān'
            : '長亭外，古道邊\n芳草碧連天'
        );
      } else if (lang === 'japanese') {
        setInputText(
          targetField === 'roman'
            ? 'Sa-ku-ra sa-ku-ra\nYa-yo-i no so-ra wa'
            : '桜[さくら] 桜[さくら]\n野山[のやま]も里[さと]も'
        );
      } else {
        // Taigi default
        setInputText(
          targetField === 'roman'
            ? 'To̍k iā bô phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe'
            : '獨夜無伴守燈下\n清風對面吹'
        );
      }
    }
  };

  if (!isOpen) return null;

  // Handle preview generation
  const handleGeneratePreview = () => {
    // DUAL MODE: User provides both Phonetic and Primary Text separately
    if (targetField === 'dual') {
      if (!romanText.trim() && !hanloText.trim()) return;

      const rLines = romanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const hLines = hanloText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const lineCount = Math.max(rLines.length, hLines.length);

      const previews: VersePreviewItem[] = [];
      for (let idx = 0; idx < lineCount; idx++) {
        const rLine = rLines[idx] || '';
        const hLine = hLines[idx] || '';
        const rSyllables = rLine ? splitMultilingualLyrics(rLine, alignLanguage) : [];
        const hSyllables = hLine ? splitMultilingualLyrics(hLine, alignLanguage) : [];
        const maxSyl = Math.max(rSyllables.length, hSyllables.length);

        const tokens: LyricSyllable[] = [];
        for (let sIdx = 0; sIdx < maxSyl; sIdx++) {
          const r = rSyllables[sIdx];
          const h = hSyllables[sIdx];
          const rText = r ? r.text : '';
          const hText = h ? h.text : '';
          tokens.push({
            text: hText || rText,
            phonetic: rText || (h ? h.phonetic : undefined),
            isHyphenated: h?.isHyphenated ?? r?.isHyphenated,
            isWordEnd: h?.isWordEnd ?? r?.isWordEnd,
            poj: rText,
            hanlo: hText,
          });
        }

        const matchedVerse = songVerses[idx];
        previews.push({
          verseIndex: idx,
          verseTitle: matchedVerse
            ? `Verse ${idx + 1}${matchedVerse.section ? ` (${matchedVerse.section})` : ''}`
            : `Verse ${idx + 1} (Line ${idx + 1})`,
          section: matchedVerse?.section,
          measureRange: matchedVerse
            ? `Measures ${matchedVerse.startMeasureNumber}-${matchedVerse.endMeasureNumber}`
            : '',
          noteCount: matchedVerse ? matchedVerse.notes.length : targetScopeNotesCount,
          tokens,
        });
      }
      setVersePreviews(previews);
      return;
    }

    // SINGLE MODE: Romanization/Phonetic or Han-Lo/Primary Text
    if (!inputText.trim()) return;

    const lines = inputText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    const isRomanTarget = targetField === 'roman' || targetField === 'poj' || targetField === 'tl';
    const previews: VersePreviewItem[] = lines.map((line, idx) => {
      const rawSyllables = splitMultilingualLyrics(line, alignLanguage);
      const tokens: LyricSyllable[] = rawSyllables.map(s => {
        if (isRomanTarget) {
          return {
            text: s.text,
            phonetic: s.phonetic || s.text,
            isHyphenated: s.isHyphenated,
            isWordEnd: s.isWordEnd,
            poj: s.text,
            hanlo: s.text,
          };
        } else {
          return {
            text: s.text,
            phonetic: s.phonetic,
            isHyphenated: s.isHyphenated,
            isWordEnd: s.isWordEnd,
            poj: s.phonetic || s.text,
            hanlo: s.text,
          };
        }
      });
      const matchedVerse = songVerses[idx];
      return {
        verseIndex: idx,
        verseTitle: matchedVerse
          ? `Verse ${idx + 1}${matchedVerse.section ? ` (${matchedVerse.section})` : ''}`
          : `Verse ${idx + 1} (Line ${idx + 1})`,
        section: matchedVerse?.section,
        measureRange: matchedVerse
          ? `Measures ${matchedVerse.startMeasureNumber}-${matchedVerse.endMeasureNumber}`
          : '',
        noteCount: matchedVerse ? matchedVerse.notes.length : targetScopeNotesCount,
        tokens,
      };
    });
    setVersePreviews(previews);
  };

  // Interactive editing of preview tokens
  const handleStartEditToken = (vIdx: number, tIdx: number, currentVal: string) => {
    setEditingTokenCoord({ vIdx, tIdx });
    setTokenDraftText(currentVal);
  };

  const handleSaveEditToken = () => {
    if (!editingTokenCoord) return;
    const { vIdx, tIdx } = editingTokenCoord;
    setVersePreviews(prev => {
      const next = [...prev];
      const targetVerse = { ...next[vIdx] };
      const nextTokens = [...targetVerse.tokens];
      const tok = { ...nextTokens[tIdx] };
      const trimmed = tokenDraftText.trim();
      if (targetField === 'roman' || targetField === 'poj' || targetField === 'tl') {
        tok.poj = trimmed;
        tok.phonetic = trimmed;
        if (!tok.text) tok.text = trimmed;
      } else {
        tok.hanlo = trimmed;
        tok.text = trimmed;
      }
      nextTokens[tIdx] = tok;
      targetVerse.tokens = nextTokens;
      next[vIdx] = targetVerse;
      return next;
    });
    setEditingTokenCoord(null);
    setTokenDraftText('');
  };

  const handleDeleteToken = (vIdx: number, tIdx: number) => {
    setVersePreviews(prev => {
      const next = [...prev];
      const targetVerse = { ...next[vIdx] };
      targetVerse.tokens = targetVerse.tokens.filter((_, i) => i !== tIdx);
      next[vIdx] = targetVerse;
      return next;
    });
  };

  const handleAddToken = (vIdx: number) => {
    setVersePreviews(prev => {
      const next = [...prev];
      const targetVerse = { ...next[vIdx] };
      targetVerse.tokens = [
        ...targetVerse.tokens,
        targetField === 'roman'
          ? { poj: 'syl', text: 'syl', phonetic: 'syl' }
          : { hanlo: '字', text: '字' },
      ];
      next[vIdx] = targetVerse;
      return next;
    });
  };

  const handleApply = () => {
    if (versePreviews.length === 0) return;

    const allTokens = versePreviews.flatMap(vp => vp.tokens);
    const updatedSongBase: Song = {
      ...song,
      language: alignLanguage,
    };

    // Selection / measure / verse scopes write tokens as-is so dual mode
    // keeps both POJ and Hàn-lô instead of flattening to hanlo || poj.
    if (alignScope === 'selection' && activeCoordinate) {
      const [startM, startN] = activeCoordinate;
      onApplyLyrics(
        applyLyricTokensToSong(updatedSongBase, allTokens, {
          startMeasureIdx: startM,
          startNoteIdx: startN,
          verseIndex: selectedTargetVerse,
        })
      );
      onClose();
      return;
    }

    if (alignScope === 'measure') {
      onApplyLyrics(
        applyLyricTokensToSong(updatedSongBase, allTokens, {
          startMeasureIdx: selectedStartMeasure,
          startNoteIdx: 0,
          verseIndex: selectedTargetVerse,
        })
      );
      onClose();
      return;
    }

    if (alignScope === 'verse') {
      onApplyLyrics(
        applyLyricTokensToSong(updatedSongBase, allTokens, {
          startMeasureIdx: 0,
          startNoteIdx: 0,
          verseIndex: selectedTargetVerse,
        })
      );
      onClose();
      return;
    }

    // Default: Multi-line verse alignment across the whole song
    const newMeasures = updatedSongBase.measures.map(m => ({
      ...m,
      notes: m.notes.map(note => ({
        ...note,
        lyric: { ...note.lyric },
      })),
    }));

    if (versePreviews.length > 1 || songVerses.length > 1) {
      versePreviews.forEach((vp, vIdx) => {
        const targetVerse = songVerses[vIdx];
        if (!targetVerse) return;

        let tokIdx = 0;
        for (let nIdx = 0; nIdx < targetVerse.notes.length; nIdx++) {
          if (tokIdx >= vp.tokens.length) break;
          const noteRef = targetVerse.notes[nIdx];
          const note = newMeasures[noteRef.measureIndex]?.notes[noteRef.noteIndex];
          if (!note) continue;

          const isNoteNonNotation = isNonNotationItem(note);
          const tok = vp.tokens[tokIdx];
          const isTokenPunct = isPunctuationOrSpacer(tok.text || tok.hanlo || tok.hanji || tok.custom || '');

          if (isNoteNonNotation && !isTokenPunct) {
            continue;
          }

          tokIdx++;
          const targetHanlo = tok.hanlo !== undefined ? tok.hanlo : (tok.hanji !== undefined ? tok.hanji : tok.custom);
          const targetPoj = tok.poj !== undefined ? tok.poj : tok.tl;

          const isLastTokenInLine = tokIdx === vp.tokens.length;
          const formattedHanlo = isLastTokenInLine && targetHanlo && !targetHanlo.includes('\n') ? `${targetHanlo}\n` : targetHanlo;
          const formattedPoj = isLastTokenInLine && targetPoj && !targetPoj.includes('\n') ? `${targetPoj}\n` : targetPoj;
          const targetText = tok.text || formattedHanlo || targetHanlo;
          const targetPhonetic = tok.phonetic || formattedPoj || targetPoj;

          note.lyric = {
            ...note.lyric,
            ...(formattedHanlo !== undefined ? { hanlo: formattedHanlo } : {}),
            ...(formattedPoj !== undefined ? { poj: formattedPoj } : {}),
            ...(targetText !== undefined ? { text: targetText } : {}),
            ...(targetPhonetic !== undefined ? { phonetic: targetPhonetic } : {}),
            ...(tok.isHyphenated !== undefined ? { isHyphenated: tok.isHyphenated } : {}),
            ...(tok.isWordEnd !== undefined ? { isWordEnd: tok.isWordEnd } : {}),
          };

          if (isTokenPunct && isNoteNonNotation) {
            note.pitch = 'empty';
            note.duration = 0 as NoteDuration;
          }
        }
      });
    } else {
      // Single continuous line across the whole song
      let tokenIdx = 0;
      const flatTokens = versePreviews[0]?.tokens || [];
      newMeasures.forEach(m => {
        m.notes.forEach(note => {
          if (tokenIdx < flatTokens.length) {
            const isNoteNonNotation = isNonNotationItem(note);
            const tok = flatTokens[tokenIdx];
            const isTokenPunct = isPunctuationOrSpacer(tok.text || tok.hanlo || tok.hanji || tok.custom || '');

            if (isNoteNonNotation && !isTokenPunct) {
              return;
            }

            tokenIdx++;
            const targetHanlo = tok.hanlo !== undefined ? tok.hanlo : (tok.hanji !== undefined ? tok.hanji : tok.custom);
            const targetPoj = tok.poj !== undefined ? tok.poj : tok.tl;
            const targetText = tok.text || targetHanlo;
            const targetPhonetic = tok.phonetic || targetPoj;

            note.lyric = {
              ...note.lyric,
              ...(targetHanlo !== undefined ? { hanlo: targetHanlo } : {}),
              ...(targetPoj !== undefined ? { poj: targetPoj } : {}),
              ...(targetText !== undefined ? { text: targetText } : {}),
              ...(targetPhonetic !== undefined ? { phonetic: targetPhonetic } : {}),
              ...(tok.isHyphenated !== undefined ? { isHyphenated: tok.isHyphenated } : {}),
              ...(tok.isWordEnd !== undefined ? { isWordEnd: tok.isWordEnd } : {}),
            };

            if (isTokenPunct && isNoteNonNotation) {
              note.pitch = 'empty';
              note.duration = 0 as NoteDuration;
            }
          }
        });
      });
    }

    onApplyLyrics(
      normalizeSongDurations({
        ...updatedSongBase,
        measures: newMeasures,
      })
    );

    onClose();
  };

  return (
    <div id="quick-aligner-modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs print:hidden">
      <div id="quick-aligner-modal-card" className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <div className="flex items-center gap-2 text-zinc-900 dark:text-zinc-100 font-bold text-lg">
            <AlignLeft className="w-5 h-5 text-amber-500" />
            <span>Smart Lyric Aligner & Spreader</span>
          </div>
          <button
            id="quick-aligner-close-btn"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {/* Language Selection & Sample Presets (Default: Taigi) */}
          <div className="flex flex-col gap-2 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Languages className="w-3.5 h-3.5 text-amber-500" />
                <span>Lyric Language</span>
              </label>
              <span className="text-[11px] text-amber-700 dark:text-amber-300 font-medium">
                Default: Taigi (台語)
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-xs">
              <button
                type="button"
                id="aligner-lang-taigi"
                onClick={() => setAlignLanguage('taigi')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  alignLanguage === 'taigi'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                <span>🇹🇼 台語 (Taigi)</span>
                {alignLanguage === 'taigi' && <span className="text-[10px] bg-zinc-900 text-amber-300 px-1 rounded-sm">Default</span>}
              </button>

              <button
                type="button"
                id="aligner-lang-english"
                onClick={() => setAlignLanguage('english')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  alignLanguage === 'english'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                <span>🇬🇧 English</span>
              </button>

              <button
                type="button"
                id="aligner-lang-mandarin"
                onClick={() => setAlignLanguage('mandarin')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  alignLanguage === 'mandarin'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                <span>🇨🇳 華語 (Mandarin)</span>
              </button>

              <button
                type="button"
                id="aligner-lang-japanese"
                onClick={() => setAlignLanguage('japanese')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  alignLanguage === 'japanese'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                <span>🇯🇵 日本語 (Japanese)</span>
              </button>
            </div>

            {/* Quick demo presets */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Try Sample:</span>
              <button
                type="button"
                onClick={() => handleLoadSample('taigi')}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono cursor-pointer transition-colors"
              >
                Taigi (望春風)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('english')}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono cursor-pointer transition-colors"
              >
                English (Amazing Grace)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('mandarin')}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono cursor-pointer transition-colors"
              >
                Mandarin (送別)
              </button>
              <button
                type="button"
                onClick={() => handleLoadSample('japanese')}
                className="px-2 py-0.5 rounded-md bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 font-mono cursor-pointer transition-colors"
              >
                Japanese (さくらさくら)
              </button>
            </div>
          </div>

          {/* Target Scope Selection (MOD-5 / MOD-3) */}
          <div className="flex flex-col gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/70">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Starting Target & Scope</span>
              </label>
              <span className="text-[11px] font-mono font-bold text-amber-600 dark:text-amber-400">
                {targetScopeNotesCount} notes available
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setAlignScope('all')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  alignScope === 'all'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                Whole Song
              </button>

              {activeCoordinate && (
                <button
                  type="button"
                  onClick={() => setAlignScope('selection')}
                  className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                    alignScope === 'selection'
                      ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                      : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                  }`}
                  title={`From M${activeCoordinate[0] + 1}, Note ${activeCoordinate[1] + 1}`}
                >
                  From Selection (M{activeCoordinate[0] + 1})
                </button>
              )}

              <button
                type="button"
                onClick={() => setAlignScope('measure')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  alignScope === 'measure'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                From Measure...
              </button>

              <button
                type="button"
                onClick={() => setAlignScope('verse')}
                className={`px-2.5 py-1.5 rounded-lg border font-bold transition-all cursor-pointer ${
                  alignScope === 'verse'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                Specific Verse...
              </button>
            </div>

            {/* Sub-selectors for Measure and Verse */}
            {alignScope === 'measure' && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Start Measure:</span>
                <select
                  value={selectedStartMeasure}
                  onChange={e => setSelectedStartMeasure(Number(e.target.value))}
                  className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-bold"
                >
                  {song.measures.map((m, idx) => (
                    <option key={m.id} value={idx}>
                      Measure {idx + 1} ({m.notes.length} notes)
                    </option>
                  ))}
                </select>
              </div>
            )}

            {alignScope === 'verse' && (
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-200 dark:border-zinc-700 text-xs">
                <span className="text-zinc-600 dark:text-zinc-400 font-medium">Target Verse:</span>
                <select
                  value={selectedTargetVerse}
                  onChange={e => setSelectedTargetVerse(Number(e.target.value))}
                  className="px-2 py-1 bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 font-bold"
                >
                  {Array.from({ length: Math.max(verseCount, 5) }, (_, i) => i + 1).map(v => (
                    <option key={v} value={v}>
                      Verse {v}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Target Field Mode Selection */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                Alignment Mode
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Supports Romanization (POJ) and Han-Lo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <button
                id="align-mode-roman"
                type="button"
                onClick={() => setTargetField('roman')}
                className={`p-2 rounded-xl border font-bold transition-all cursor-pointer ${
                  targetField === 'roman' || targetField === 'poj' || targetField === 'tl'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                Romanization (POJ)
              </button>

              <button
                id="align-mode-hanlo"
                type="button"
                onClick={() => setTargetField('hanlo')}
                className={`p-2 rounded-xl border font-bold transition-all cursor-pointer ${
                  targetField === 'hanlo' || targetField === 'custom' || targetField === 'hanji'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                Han-Lo
              </button>

              <button
                id="align-mode-dual"
                type="button"
                onClick={() => {
                  setTargetField('dual');
                  if (!romanText && inputText) setRomanText(inputText);
                }}
                className={`p-2 rounded-xl border font-bold transition-all cursor-pointer ${
                  targetField === 'dual'
                    ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                    : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                }`}
              >
                Dual Sync (POJ + Han-Lo)
              </button>
            </div>
          </div>

          {/* DUAL MODE INPUT */}
          {targetField === 'dual' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="aligner-roman-text" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    1. Romanization Lyrics (POJ)
                  </label>
                  <span className="text-[11px] text-zinc-400">Newline creates new verse</span>
                </div>
                <textarea
                  id="aligner-roman-text"
                  rows={4}
                  value={romanText}
                  onChange={e => setRomanText(e.target.value)}
                  placeholder={`e.g.:\nTo̍k iā bô phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe`}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 font-serif"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="aligner-hanlo-text" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    2. Han-Lo Lyrics (Han-lô)
                  </label>
                  <span className="text-[11px] text-zinc-400">Match syllables with POJ</span>
                </div>
                <textarea
                  id="aligner-hanlo-text"
                  rows={4}
                  value={hanloText}
                  onChange={e => setHanloText(e.target.value)}
                  placeholder={`e.g.:\n獨夜無伴守燈下\n清風對面吹`}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 font-serif"
                />
              </div>
            </div>
          ) : (
            /* SINGLE TEXTAREA INPUT */
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="aligner-input-text" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  {targetField === 'roman' || targetField === 'poj' || targetField === 'tl'
                    ? 'Paste Romanization Lyrics (POJ)'
                    : 'Paste Han-Lo Lyrics (Han-lô)'}
                </label>
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  💡 Newline creates new line/verse
                </span>
              </div>
              <textarea
                id="aligner-input-text"
                rows={4}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={
                  targetField === 'roman' || targetField === 'poj' || targetField === 'tl'
                    ? `e.g.:\nTo̍k iā bô phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe`
                    : `e.g.:\n獨夜無伴守燈下\n清風對面吹`
                }
                className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 font-serif"
              />
            </div>
          )}

          {/* Action Trigger Button */}
          <button
            id="aligner-parse-btn"
            type="button"
            disabled={
              targetField === 'dual'
                ? (!romanText.trim() && !hanloText.trim())
                : !inputText.trim()
            }
            onClick={handleGeneratePreview}
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-98"
          >
            <AlignLeft className="w-4 h-4 text-amber-400" />
            <span>Parse Syllables & Preview</span>
          </button>

          {/* Preview Tokens Grid Grouped by Verse with Interactive Editing */}
          {versePreviews.length > 0 && (
            <div id="aligner-preview-container" className="flex flex-col gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Syllables Preview ({versePreviews.length} verse{versePreviews.length > 1 ? 's' : ''} · {totalPreviewTokensCount} syllables)
                  </span>
                </span>
                <span className={`font-mono font-bold text-[11px] px-2 py-0.5 rounded ${
                  totalPreviewTokensCount <= targetScopeNotesCount
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}>
                  {totalPreviewTokensCount} / {targetScopeNotesCount} notes
                </span>
              </div>

              <div className="flex flex-col gap-2.5 max-h-56 overflow-y-auto pr-1">
                {versePreviews.map((vp, vIdx) => {
                  const isOverflowVerse = vIdx >= songVerses.length;
                  const isSyllableOverflow = !isOverflowVerse && vp.tokens.length > vp.noteCount;
                  return (
                    <div
                      key={vIdx}
                      className={`p-2.5 rounded-xl border flex flex-col gap-2 ${
                        isOverflowVerse
                          ? 'bg-zinc-100/50 dark:bg-zinc-800/30 border-dashed border-zinc-300 dark:border-zinc-700 opacity-60'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-amber-600 dark:text-amber-400 font-mono">
                            {vp.verseTitle}
                          </span>
                          {vp.measureRange && (
                            <span className="text-zinc-500 dark:text-zinc-400 text-[11px]">
                              ({vp.measureRange} · {vp.noteCount} notes)
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleAddToken(vIdx)}
                            className="text-[10px] font-mono font-bold text-zinc-500 hover:text-amber-500 flex items-center gap-0.5 cursor-pointer"
                            title="Add a syllable token"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add</span>
                          </button>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {vp.tokens.length} syl
                            {isSyllableOverflow && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1">
                                (+{vp.tokens.length - vp.noteCount})
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {vp.tokens.map((tok, tokIdx) => {
                          const isExceedingNote = !isOverflowVerse && tokIdx >= vp.noteCount;
                          const isEditingThis = editingTokenCoord?.vIdx === vIdx && editingTokenCoord?.tIdx === tokIdx;
                          const displayVal =
                            tok.text ||
                            tok.hanlo ||
                            tok.custom ||
                            tok.hanji ||
                            (tok.phonetic || tok.poj || tok.tl || '');
                          const phoneticVal = tok.phonetic || tok.poj || tok.tl;
                          const hasSecondaryPhonetic = (tok.text || tok.hanlo || tok.custom || tok.hanji) && phoneticVal && phoneticVal !== displayVal;

                          return (
                            <div
                              key={tokIdx}
                              className={`group/tok relative flex flex-col items-center px-2 py-1 border rounded-lg text-xs transition-all ${
                                isExceedingNote
                                  ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300/50 text-zinc-400 dark:text-zinc-500 line-through'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs hover:border-amber-400'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full gap-1">
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">#{tokIdx + 1}</span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteToken(vIdx, tokIdx)}
                                  className="opacity-0 group-hover/tok:opacity-100 text-rose-500 hover:text-rose-600 transition-opacity cursor-pointer"
                                  title="Delete syllable token"
                                >
                                  <Trash2 className="w-2.5 h-2.5" />
                                </button>
                              </div>

                              {isEditingThis ? (
                                <input
                                  type="text"
                                  autoFocus
                                  value={tokenDraftText}
                                  onChange={e => setTokenDraftText(e.target.value)}
                                  onBlur={handleSaveEditToken}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') handleSaveEditToken();
                                    if (e.key === 'Escape') setEditingTokenCoord(null);
                                  }}
                                  className="w-14 text-center font-bold text-xs bg-amber-100 dark:bg-amber-950 border border-amber-500 rounded px-0.5 outline-none"
                                />
                              ) : (
                                <span
                                  onClick={() => handleStartEditToken(vIdx, tokIdx, displayVal)}
                                  className="font-bold text-sm leading-tight cursor-pointer hover:underline"
                                  title="Click to edit syllable"
                                >
                                  {displayVal || '—'}
                                </span>
                              )}

                              {hasSecondaryPhonetic && (
                                <span className="font-serif italic text-emerald-600 dark:text-emerald-400 text-[10px] leading-tight">
                                  {phoneticVal}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
          <span className="text-xs text-zinc-500">
            {versePreviews.length > 0 ? 'Click any syllable to edit text before applying' : 'Ready to align'}
          </span>
          <div className="flex items-center gap-3">
            <button
              id="aligner-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="aligner-apply-btn"
              type="button"
              disabled={versePreviews.length === 0}
              onClick={handleApply}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-98"
            >
              <Check className="w-4 h-4" />
              <span>Apply to Score</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
