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
  detectScriptType,
  detectSongLanguageFromLyrics,
  separateDualLineLyrics,
} from '@/lib/multilingualUtils';
import {
  AlignLeft,
  X,
  Check,
  Plus,
  Trash2,
  Sparkles,
  Languages,
  ArrowRightLeft,
  ClipboardPaste,
  Eye,
  ArrowLeft,
  FileCheck2,
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
export type AlignerStep = 'input' | 'review';

export const QuickLyricAlignerModal: React.FC<QuickLyricAlignerModalProps> = ({
  isOpen,
  onClose,
  song,
  onApplyLyrics,
  activeCoordinate,
}) => {
  const [currentStep, setCurrentStep] = useState<AlignerStep>('input');
  const [alignLanguage, setAlignLanguage] = useState<SongLanguage>(() => song.language || 'taigi');
  const [prevSongLanguage, setPrevSongLanguage] = useState<SongLanguage | undefined>(song.language);

  if (song.language !== prevSongLanguage) {
    setPrevSongLanguage(song.language);
    setAlignLanguage(song.language || 'taigi');
  }

  // Dual and single input fields
  const [inputText, setInputText] = useState('');
  const [romanText, setRomanText] = useState('');
  const [hanloText, setHanloText] = useState('');
  const [pasteNotice, setPasteNotice] = useState<string | null>(null);

  const [targetField, setTargetFieldState] = useState<TargetAlignMode>(() => {
    if (typeof window !== 'undefined') return getStoredQuickAlignTarget('dual');
    return 'dual';
  });

  // Scope selection: whole song, from selection, from specific measure, or specific verse
  const [alignScope, setAlignScope] = useState<AlignScope>(() => {
    return activeCoordinate ? 'selection' : 'all';
  });
  const [selectedStartMeasure, setSelectedStartMeasure] = useState<number>(() => {
    return activeCoordinate ? activeCoordinate[0] : 0;
  });
  const [selectedTargetVerse, setSelectedTargetVerse] = useState<number>(1);

  // Editable token state inside preview / review
  const [editingTokenCoord, setEditingTokenCoord] = useState<{ vIdx: number; tIdx: number } | null>(null);
  const [tokenDraftText, setTokenDraftText] = useState<string>('');
  const [tokenDraftPoj, setTokenDraftPoj] = useState<string>('');

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

  // Real-time language & script detection badge
  const liveDetected = useMemo(() => {
    const textToCheck = targetField === 'dual' ? `${hanloText} ${romanText}` : inputText;
    if (!textToCheck.trim()) return null;
    const detectedLang = detectSongLanguageFromLyrics(hanloText || textToCheck, romanText || textToCheck);
    const hanloScript = hanloText ? detectScriptType(hanloText) : null;
    const romanScript = romanText ? detectScriptType(romanText) : null;
    return { detectedLang, hanloScript, romanScript };
  }, [targetField, hanloText, romanText, inputText]);

  // Swap Hanlo and POJ contents
  const handleSwapHanloAndPoj = () => {
    const temp = hanloText;
    setHanloText(romanText);
    setRomanText(temp);
  };

  // Smart paste handler that can take 2 lines and auto-route them
  const handleSmartPaste = (raw: string) => {
    if (!raw.trim()) return;
    const separated = separateDualLineLyrics(raw);

    if (separated.hanloText || separated.romanText) {
      setTargetField('dual');
      if (separated.hanloText) setHanloText(separated.hanloText);
      if (separated.romanText) setRomanText(separated.romanText);
      if (separated.detectedLang) setAlignLanguage(separated.detectedLang);

      setPasteNotice(
        separated.swapped
          ? 'Auto-detected & routed: Line 1 (Hàn-lô) and Line 2 (POJ) swapped to fit correct fields.'
          : `Auto-detected: Separated into Hàn-lô and POJ. Language set to ${separated.detectedLang.toUpperCase()}.`
      );
      setTimeout(() => setPasteNotice(null), 4500);
    }
  };

  // Pre-fill quick demo samples per language
  const handleLoadSample = (lang: SongLanguage) => {
    setAlignLanguage(lang);
    setTargetField('dual');
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
      setRomanText('To̍k-iā bô-phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe');
      setHanloText('獨夜無伴守燈下\n清風對面吹');
    }
  };

  if (!isOpen) return null;

  // Handle plan & preview generation
  const handleGeneratePlanForReview = () => {
    // DUAL MODE: User provides both Roman/POJ and Han-Lo text separately
    if (targetField === 'dual') {
      if (!romanText.trim() && !hanloText.trim()) return;

      const autoLang = detectSongLanguageFromLyrics(hanloText, romanText);
      if (autoLang && autoLang !== alignLanguage) {
        setAlignLanguage(autoLang);
      }

      // Check if user accidentally pasted inverted (e.g. roman into hanlo, and hanlo into roman)
      const hScript = detectScriptType(hanloText);
      const rScript = detectScriptType(romanText);
      let actualHanlo = hanloText;
      let actualRoman = romanText;
      if (hScript === 'roman' && rScript === 'hanlo') {
        actualHanlo = romanText;
        actualRoman = hanloText;
        setHanloText(actualHanlo);
        setRomanText(actualRoman);
      }

      const rLines = actualRoman.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const hLines = actualHanlo.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
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
      setCurrentStep('review');
      return;
    }

    // SINGLE MODE: Romanization/Phonetic or Han-Lo/Primary Text
    if (!inputText.trim()) return;

    const lines = inputText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    // If single textarea was used but contains 2 lines with 1 CJK and 1 Roman, auto-split
    if (lines.length === 2) {
      const s0 = detectScriptType(lines[0]);
      const s1 = detectScriptType(lines[1]);
      if ((s0 === 'hanlo' && s1 === 'roman') || (s0 === 'roman' && s1 === 'hanlo')) {
        const separated = separateDualLineLyrics(inputText);
        setTargetField('dual');
        setHanloText(separated.hanloText);
        setRomanText(separated.romanText);
        setAlignLanguage(separated.detectedLang);

        const rLines = separated.romanText.split(/\r?\n/).filter(Boolean);
        const hLines = separated.hanloText.split(/\r?\n/).filter(Boolean);
        const maxLines = Math.max(rLines.length, hLines.length);
        const previews: VersePreviewItem[] = [];
        for (let idx = 0; idx < maxLines; idx++) {
          const rLine = rLines[idx] || '';
          const hLine = hLines[idx] || '';
          const rSyl = splitMultilingualLyrics(rLine, separated.detectedLang);
          const hSyl = splitMultilingualLyrics(hLine, separated.detectedLang);
          const maxS = Math.max(rSyl.length, hSyl.length);
          const tokens: LyricSyllable[] = [];
          for (let sIdx = 0; sIdx < maxS; sIdx++) {
            const r = rSyl[sIdx];
            const h = hSyl[sIdx];
            tokens.push({
              text: (h ? h.text : '') || (r ? r.text : ''),
              phonetic: (r ? r.text : '') || (h ? h.phonetic : undefined),
              poj: r ? r.text : '',
              hanlo: h ? h.text : '',
            });
          }
          previews.push({
            verseIndex: idx,
            verseTitle: `Verse ${idx + 1}`,
            measureRange: '',
            noteCount: targetScopeNotesCount,
            tokens,
          });
        }
        setVersePreviews(previews);
        setCurrentStep('review');
        return;
      }
    }

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
    setCurrentStep('review');
  };

  // Interactive editing of preview tokens
  const handleStartEditToken = (vIdx: number, tIdx: number, currentHanlo: string, currentPoj: string) => {
    setEditingTokenCoord({ vIdx, tIdx });
    setTokenDraftText(currentHanlo);
    setTokenDraftPoj(currentPoj);
  };

  const handleSaveEditToken = () => {
    if (!editingTokenCoord) return;
    const { vIdx, tIdx } = editingTokenCoord;
    setVersePreviews(prev => {
      const next = [...prev];
      const targetVerse = { ...next[vIdx] };
      const nextTokens = [...targetVerse.tokens];
      const tok = { ...nextTokens[tIdx] };
      const trimmedText = tokenDraftText.trim();
      const trimmedPoj = tokenDraftPoj.trim();

      tok.hanlo = trimmedText;
      tok.text = trimmedText || trimmedPoj;
      tok.poj = trimmedPoj;
      tok.phonetic = trimmedPoj;

      nextTokens[tIdx] = tok;
      targetVerse.tokens = nextTokens;
      next[vIdx] = targetVerse;
      return next;
    });
    setEditingTokenCoord(null);
    setTokenDraftText('');
    setTokenDraftPoj('');
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
        targetField === 'dual'
          ? { hanlo: '字', poj: 'syl', text: '字', phonetic: 'syl' }
          : targetField === 'roman'
          ? { poj: 'syl', text: 'syl', phonetic: 'syl' }
          : { hanlo: '字', text: '字' },
      ];
      next[vIdx] = targetVerse;
      return next;
    });
  };

  // Shift syllable order left or right
  const handleShiftToken = (vIdx: number, tIdx: number, dir: -1 | 1) => {
    setVersePreviews(prev => {
      const next = [...prev];
      const targetVerse = { ...next[vIdx] };
      const tokens = [...targetVerse.tokens];
      const targetIdx = tIdx + dir;
      if (targetIdx < 0 || targetIdx >= tokens.length) return prev;
      const temp = tokens[tIdx];
      tokens[tIdx] = tokens[targetIdx];
      tokens[targetIdx] = temp;
      targetVerse.tokens = tokens;
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

    onApplyLyrics({
      ...updatedSongBase,
      measures: newMeasures,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl max-w-4xl w-full flex flex-col overflow-hidden max-h-[92vh]">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              {currentStep === 'review' ? <FileCheck2 className="w-5 h-5" /> : <AlignLeft className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-zinc-900 dark:text-zinc-100 text-base">
                  {currentStep === 'review' ? 'Review & Refine Alignment Plan' : 'Quick Lyric Aligner & Two-Line Smart Sync'}
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  currentStep === 'review'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30'
                }`}>
                  {currentStep === 'review' ? 'Step 2: Review Plan' : 'Step 1: Input & Auto-Fit'}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {currentStep === 'review'
                  ? 'Verify note-by-syllable mapping, adjust token pairs, or shift syllables before writing to score'
                  : 'Enter two lines (Hàn-lô & POJ) or paste lyrics; language & script auto-detects and fits automatically'}
              </p>
            </div>
          </div>
          <button
            id="aligner-close-btn"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 flex flex-col gap-4 max-h-[75vh] overflow-y-auto">
          {pasteNotice && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex items-center justify-between animate-in fade-in">
              <span className="font-medium flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500 shrink-0" />
                {pasteNotice}
              </span>
              <button
                type="button"
                onClick={() => setPasteNotice(null)}
                className="text-amber-600 hover:text-amber-800 dark:text-amber-300 ml-2 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* STEP 1: INPUT & AUTO-FIT VIEW */}
          {currentStep === 'input' && (
            <>
              {/* Language Selection & Auto-Detection Status */}
              <div className="flex flex-col gap-2 bg-amber-500/5 dark:bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                    <Languages className="w-3.5 h-3.5 text-amber-500" />
                    <span>Target Language</span>
                  </label>
                  {liveDetected && (
                    <span className="text-[11px] bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-200 font-mono px-2 py-0.5 rounded-md border border-amber-300 dark:border-amber-700 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Detected: {liveDetected.detectedLang.toUpperCase()}
                    </span>
                  )}
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
                    {alignLanguage === 'taigi' && <span className="text-[10px] bg-zinc-900 text-amber-300 px-1 rounded-sm">Active</span>}
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
                  <span className="font-medium">Preset Examples:</span>
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

              {/* Target Scope Selection */}
              <div className="flex flex-col gap-1.5 bg-zinc-50 dark:bg-zinc-800/40 p-3 rounded-xl border border-zinc-200 dark:border-zinc-700/70">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Target Score Scope</span>
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

              {/* Alignment Mode Tabs */}
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    Input Format Mode
                  </label>
                  <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Two lines (Hàn-lô + POJ) recommended for complete bilingual notation
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <button
                    id="align-mode-dual"
                    type="button"
                    onClick={() => {
                      setTargetField('dual');
                      if (!romanText && inputText) setRomanText(inputText);
                    }}
                    className={`p-2 rounded-xl border font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      targetField === 'dual'
                        ? 'bg-amber-500 text-zinc-950 border-amber-500 shadow-xs'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700 hover:border-amber-400'
                    }`}
                  >
                    <span>Two Lines: Hanlo + POJ</span>
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
                    Single: Han-Lo Only
                  </button>

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
                    Single: POJ / Roman Only
                  </button>
                </div>
              </div>

              {/* TWO LINES INPUT: LINE 1 HANLO & LINE 2 POJ */}
              {targetField === 'dual' ? (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-zinc-500 dark:text-zinc-400">
                      Auto-detects character types and fits each syllable to note positions.
                    </span>
                    <button
                      type="button"
                      onClick={handleSwapHanloAndPoj}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 hover:underline cursor-pointer"
                      title="Swap Hanlo and POJ lines"
                    >
                      <ArrowRightLeft className="w-3 h-3" />
                      <span>Swap Lines</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Line 1: Hanlo */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="aligner-hanlo-text" className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Line 1: Hàn-lô (漢字 / 漢羅)
                        </label>
                        <span className="text-[11px] text-zinc-400">Primary display</span>
                      </div>
                      <textarea
                        id="aligner-hanlo-text"
                        rows={4}
                        value={hanloText}
                        onChange={e => {
                          const val = e.target.value;
                          setHanloText(val);
                          if (val.includes('\n') && !romanText.trim()) {
                            const sep = separateDualLineLyrics(val);
                            if (sep.hanloText && sep.romanText) {
                              setHanloText(sep.hanloText);
                              setRomanText(sep.romanText);
                              setAlignLanguage(sep.detectedLang);
                            }
                          }
                        }}
                        placeholder={`e.g.:\n獨夜無伴守燈下\n清風對面吹`}
                        className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 font-serif leading-relaxed"
                      />
                    </div>

                    {/* Line 2: POJ */}
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center justify-between">
                        <label htmlFor="aligner-roman-text" className="block text-xs font-bold text-zinc-800 dark:text-zinc-200">
                          Line 2: POJ (白話字 / 羅馬字)
                        </label>
                        <span className="text-[11px] text-zinc-400">Phonetic tones & singing guide</span>
                      </div>
                      <textarea
                        id="aligner-roman-text"
                        rows={4}
                        value={romanText}
                        onChange={e => {
                          const val = e.target.value;
                          setRomanText(val);
                          if (val.includes('\n') && !hanloText.trim()) {
                            const sep = separateDualLineLyrics(val);
                            if (sep.hanloText && sep.romanText) {
                              setHanloText(sep.hanloText);
                              setRomanText(sep.romanText);
                              setAlignLanguage(sep.detectedLang);
                            }
                          }
                        }}
                        placeholder={`e.g.:\nTo̍k-iā bô-phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe`}
                        className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 font-serif leading-relaxed"
                      />
                    </div>
                  </div>

                  {/* Smart Paste Zone */}
                  <div className="p-2.5 bg-zinc-100 dark:bg-zinc-800/40 rounded-xl border border-dashed border-zinc-300 dark:border-zinc-700 flex items-center justify-between text-xs">
                    <span className="text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                      <ClipboardPaste className="w-3.5 h-3.5 text-amber-500" />
                      <span>Have a 2-line snippet or alternating lyrics? Paste here to auto-split and fit:</span>
                    </span>
                    <input
                      type="text"
                      placeholder="Paste 2 lines here..."
                      onChange={e => {
                        handleSmartPaste(e.target.value);
                        e.target.value = '';
                      }}
                      className="px-2.5 py-1 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg max-w-xs focus:ring-1 focus:ring-amber-500"
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
                        ? `e.g.:\nTo̍k-iā bô-phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe`
                        : `e.g.:\n獨夜無伴守燈下\n清風對面吹`
                    }
                    className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 font-serif leading-relaxed"
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
                onClick={handleGeneratePlanForReview}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold text-sm transition-all disabled:opacity-50 cursor-pointer shadow-sm active:scale-98"
              >
                <Eye className="w-4 h-4 text-amber-400" />
                <span>Plan for Review & Syllable Matching ➔</span>
              </button>
            </>
          )}

          {/* STEP 2: REVIEW PLAN & NOTE-BY-SYLLABLE MATRIX */}
          {currentStep === 'review' && (
            <div className="flex flex-col gap-4">
              {/* Review Header Banner */}
              <div className="flex items-center justify-between p-3.5 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 rounded-xl">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-lg">
                    <FileCheck2 className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-xs text-zinc-900 dark:text-zinc-100">
                      Alignment Review Plan ({versePreviews.length} verse{versePreviews.length > 1 ? 's' : ''})
                    </span>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Syllables paired across Hàn-lô and POJ. Click any token to adjust spelling or shift order.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`font-mono font-bold text-xs px-2.5 py-1 rounded-lg border ${
                    totalPreviewTokensCount <= targetScopeNotesCount
                      ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30'
                  }`}>
                    {totalPreviewTokensCount} / {targetScopeNotesCount} Notes Matched
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('input')}
                    className="flex items-center gap-1 px-3 py-1 text-xs font-bold text-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg hover:border-amber-400 cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Edit</span>
                  </button>
                </div>
              </div>

              {/* Verses Preview List with In-Line Micro-Editor */}
              <div className="flex flex-col gap-3 max-h-[46vh] overflow-y-auto pr-1">
                {versePreviews.map((vp, vIdx) => {
                  const isOverflowVerse = vIdx >= songVerses.length;
                  const isSyllableOverflow = !isOverflowVerse && vp.tokens.length > vp.noteCount;
                  return (
                    <div
                      key={vIdx}
                      className={`p-3 rounded-xl border flex flex-col gap-2.5 ${
                        isOverflowVerse
                          ? 'bg-zinc-100/50 dark:bg-zinc-800/30 border-dashed border-zinc-300 dark:border-zinc-700 opacity-60'
                          : 'bg-zinc-50 dark:bg-zinc-800/50 border-zinc-200 dark:border-zinc-700/80 shadow-xs'
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
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleAddToken(vIdx)}
                            className="text-[11px] font-mono font-bold text-zinc-500 hover:text-amber-500 flex items-center gap-0.5 cursor-pointer"
                            title="Add a syllable token"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Add Token</span>
                          </button>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {vp.tokens.length} syl
                            {isSyllableOverflow && (
                              <span className="text-amber-600 dark:text-amber-400 ml-1 font-bold">
                                (+{vp.tokens.length - vp.noteCount} excess)
                              </span>
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Syllables Matrix */}
                      <div className="flex flex-wrap gap-2">
                        {vp.tokens.map((tok, tokIdx) => {
                          const isExceedingNote = !isOverflowVerse && tokIdx >= vp.noteCount;
                          const isEditingThis = editingTokenCoord?.vIdx === vIdx && editingTokenCoord?.tIdx === tokIdx;
                          const hanloVal = tok.hanlo || tok.text || tok.hanji || tok.custom || '';
                          const pojVal = tok.poj || tok.phonetic || tok.tl || '';

                          return (
                            <div
                              key={tokIdx}
                              className={`group/tok relative flex flex-col items-center px-2.5 py-1.5 border rounded-xl text-xs transition-all ${
                                isExceedingNote
                                  ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300/50 text-zinc-400 dark:text-zinc-500 line-through'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs hover:border-amber-400'
                              }`}
                            >
                              <div className="flex items-center justify-between w-full gap-2 mb-0.5">
                                <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">#{tokIdx + 1}</span>
                                <div className="flex items-center gap-1 opacity-0 group-hover/tok:opacity-100 transition-opacity">
                                  {tokIdx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => handleShiftToken(vIdx, tokIdx, -1)}
                                      className="text-zinc-400 hover:text-amber-500 cursor-pointer"
                                      title="Move Left"
                                    >
                                      ‹
                                    </button>
                                  )}
                                  {tokIdx < vp.tokens.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleShiftToken(vIdx, tokIdx, 1)}
                                      className="text-zinc-400 hover:text-amber-500 cursor-pointer"
                                      title="Move Right"
                                    >
                                      ›
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteToken(vIdx, tokIdx)}
                                    className="text-rose-500 hover:text-rose-600 cursor-pointer"
                                    title="Delete token"
                                  >
                                    <Trash2 className="w-2.5 h-2.5" />
                                  </button>
                                </div>
                              </div>

                              {isEditingThis ? (
                                <div className="flex flex-col gap-1 w-20">
                                  <input
                                    type="text"
                                    placeholder="Hàn-lô"
                                    autoFocus
                                    value={tokenDraftText}
                                    onChange={e => setTokenDraftText(e.target.value)}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveEditToken();
                                      if (e.key === 'Escape') setEditingTokenCoord(null);
                                    }}
                                    className="w-full text-center font-bold text-xs bg-amber-50 dark:bg-amber-950 border border-amber-500 rounded px-1 py-0.5 outline-none"
                                  />
                                  <input
                                    type="text"
                                    placeholder="POJ"
                                    value={tokenDraftPoj}
                                    onChange={e => setTokenDraftPoj(e.target.value)}
                                    onBlur={handleSaveEditToken}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') handleSaveEditToken();
                                      if (e.key === 'Escape') setEditingTokenCoord(null);
                                    }}
                                    className="w-full text-center text-[10px] italic font-serif bg-emerald-50 dark:bg-emerald-950 border border-emerald-500 rounded px-1 py-0.5 outline-none text-emerald-700 dark:text-emerald-300"
                                  />
                                </div>
                              ) : (
                                <div
                                  onClick={() => handleStartEditToken(vIdx, tokIdx, hanloVal, pojVal)}
                                  className="flex flex-col items-center cursor-pointer hover:opacity-80 py-0.5"
                                  title="Click to edit Hàn-lô and POJ values"
                                >
                                  <span className="font-bold text-sm leading-tight text-zinc-900 dark:text-zinc-100">
                                    {hanloVal || '—'}
                                  </span>
                                  {pojVal && (
                                    <span className="font-serif italic text-emerald-600 dark:text-emerald-400 text-[10px] leading-tight">
                                      {pojVal}
                                    </span>
                                  )}
                                </div>
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
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {currentStep === 'review' ? (
              <span>Plan looks good? Click <strong>Apply to Score</strong> to update your sheet notation.</span>
            ) : (
              <span>Dual-line auto-detection keeps Han-Lo and POJ in sync.</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              id="aligner-cancel-btn"
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              Cancel
            </button>
            {currentStep === 'review' ? (
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
            ) : (
              <button
                type="button"
                disabled={
                  targetField === 'dual'
                    ? (!romanText.trim() && !hanloText.trim())
                    : !inputText.trim()
                }
                onClick={handleGeneratePlanForReview}
                className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer active:scale-98"
              >
                <span>Plan for Review ➔</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
