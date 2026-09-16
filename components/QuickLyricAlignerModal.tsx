'use client';

import React, { useState } from 'react';
import { LyricSyllable, NoteDuration, Song } from '@/types/song';
import {
  splitTaigiLyricSyllables,
  groupSongIntoVerses,
  isNonNotationItem,
  isPunctuationOrSpacer,
  normalizeSongDurations,
} from '@/lib/taigiUtils';
import {
  AlignLeft,
  X,
  Check,
} from 'lucide-react';
import { getStoredQuickAlignTarget, setStoredQuickAlignTarget } from '@/lib/storage';

interface QuickLyricAlignerModalProps {
  isOpen: boolean;
  onClose: () => void;
  song: Song;
  onApplyLyrics: (updatedSong: Song) => void;
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

export const QuickLyricAlignerModal: React.FC<QuickLyricAlignerModalProps> = ({
  isOpen,
  onClose,
  song,
  onApplyLyrics,
}) => {
  const [inputText, setInputText] = useState('');
  const [romanText, setRomanText] = useState('');
  const [hanloText, setHanloText] = useState('');
  const [targetField, setTargetFieldState] = useState<TargetAlignMode>(() => {
    if (typeof window !== 'undefined') return getStoredQuickAlignTarget('roman');
    return 'roman';
  });

  const setTargetField = (mode: TargetAlignMode) => {
    setTargetFieldState(mode);
    if (mode === 'roman' || mode === 'hanlo' || mode === 'dual') {
      setStoredQuickAlignTarget(mode);
    }
  };
  const [versePreviews, setVersePreviews] = useState<VersePreviewItem[]>([]);

  if (!isOpen) return null;

  // Calculate total notes and verses available in song
  const totalNotesCount = song.measures.reduce((acc, m) => acc + m.notes.length, 0);
  const songVerses = groupSongIntoVerses(song);
  const totalPreviewTokensCount = versePreviews.reduce((acc, vp) => acc + vp.tokens.length, 0);

  // Handle preview generation with newline as verse splitter
  const handleGeneratePreview = () => {
    // DUAL MODE: User provides both Romanization and Han-lo separately
    if (targetField === 'dual') {
      if (!romanText.trim() && !hanloText.trim()) return;

      const rLines = romanText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const hLines = hanloText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
      const lineCount = Math.max(rLines.length, hLines.length);

      const previews: VersePreviewItem[] = [];
      for (let idx = 0; idx < lineCount; idx++) {
        const rLine = rLines[idx] || '';
        const hLine = hLines[idx] || '';
        const rSyllables = rLine ? splitTaigiLyricSyllables(rLine) : [];
        const hSyllables = hLine ? splitTaigiLyricSyllables(hLine) : [];
        const maxSyl = Math.max(rSyllables.length, hSyllables.length);

        const tokens: LyricSyllable[] = [];
        for (let sIdx = 0; sIdx < maxSyl; sIdx++) {
          const r = rSyllables[sIdx] || '';
          const h = hSyllables[sIdx] || '';
          tokens.push({
            poj: r,
            hanlo: h,
          });
        }

        const matchedVerse = songVerses[idx];
        previews.push({
          verseIndex: idx,
          verseTitle: matchedVerse
            ? `Verse ${idx + 1}${matchedVerse.section ? ` (${matchedVerse.section})` : ''}`
            : `Verse ${idx + 1} (超出歌曲段落數)`,
          section: matchedVerse?.section,
          measureRange: matchedVerse
            ? `Measures ${matchedVerse.startMeasureNumber}-${matchedVerse.endMeasureNumber}`
            : '',
          noteCount: matchedVerse ? matchedVerse.notes.length : 0,
          tokens,
        });
      }

      setVersePreviews(previews);
      return;
    }

    if (!inputText.trim()) return;

    // Split input text by newlines into non-empty lines (each line is a verse)
    const lines = inputText
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);

    if (lines.length === 0) return;

    // Local splitting: roman or hanlo
    const isRomanTarget = targetField === 'roman' || targetField === 'poj' || targetField === 'tl';
    const previews: VersePreviewItem[] = lines.map((line, idx) => {
      const rawSyllables = splitTaigiLyricSyllables(line);
      const tokens: LyricSyllable[] = rawSyllables.map(s => {
        if (isRomanTarget) {
          return {
            poj: s,
          };
        } else {
          // hanlo
          return {
            hanlo: s,
          };
        }
      });
      const matchedVerse = songVerses[idx];
      return {
        verseIndex: idx,
        verseTitle: matchedVerse
          ? `Verse ${idx + 1}${matchedVerse.section ? ` (${matchedVerse.section})` : ''}`
          : `Verse ${idx + 1} (超出歌曲段落數)`,
        section: matchedVerse?.section,
        measureRange: matchedVerse
          ? `Measures ${matchedVerse.startMeasureNumber}-${matchedVerse.endMeasureNumber}`
          : '',
        noteCount: matchedVerse ? matchedVerse.notes.length : 0,
        tokens,
      };
    });
    setVersePreviews(previews);
  };

  const handleApply = () => {
    if (versePreviews.length === 0) return;

    // Deep clone measures
    const newMeasures = song.measures.map(m => ({
      ...m,
      notes: m.notes.map(note => ({
        ...note,
        lyric: { ...note.lyric },
      })),
    }));

    // If input has multiple lines or song has multiple verses:
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

          // If note is an explicit non-notation break or spacer, don't overwrite with sung lyric unless token is also punctuation
          const isNoteNonNotation = isNonNotationItem(note);
          const tok = vp.tokens[tokIdx];
          const isTokenPunct = isPunctuationOrSpacer(tok.hanlo || tok.hanji || tok.custom || '');

          if (isNoteNonNotation && !isTokenPunct) {
            continue; // Skip non-notation note so syllable aligns with sung pitch
          }

          tokIdx++;
          const targetHanlo = tok.hanlo !== undefined ? tok.hanlo : (tok.hanji !== undefined ? tok.hanji : tok.custom);
          const targetPoj = tok.poj !== undefined ? tok.poj : tok.tl;

          // If this is the last token of a line/verse preview, append newline to preserve short meaningful verse in Karaoke mode
          const isLastTokenInLine = tokIdx === vp.tokens.length;
          const formattedHanlo = isLastTokenInLine && targetHanlo && !targetHanlo.includes('\n') ? `${targetHanlo}\n` : targetHanlo;
          const formattedPoj = isLastTokenInLine && targetPoj && !targetPoj.includes('\n') ? `${targetPoj}\n` : targetPoj;

          note.lyric = {
            ...note.lyric,
            ...(formattedHanlo !== undefined ? { hanlo: formattedHanlo } : {}),
            ...(formattedPoj !== undefined ? { poj: formattedPoj } : {}),
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
            const isTokenPunct = isPunctuationOrSpacer(tok.hanlo || tok.hanji || tok.custom || '');

            if (isNoteNonNotation && !isTokenPunct) {
              return; // Skip non-notation note
            }

            tokenIdx++;
            const targetHanlo = tok.hanlo !== undefined ? tok.hanlo : (tok.hanji !== undefined ? tok.hanji : tok.custom);
            const targetPoj = tok.poj !== undefined ? tok.poj : tok.tl;
            note.lyric = {
              ...note.lyric,
              ...(targetHanlo !== undefined ? { hanlo: targetHanlo } : {}),
              ...(targetPoj !== undefined ? { poj: targetPoj } : {}),
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
        ...song,
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
            <span>臺語歌詞對齊台 (Lyric Aligner Deck)</span>
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
          {/* Target Field Mode Selection */}
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                對齊目標模式 (Alignment Mode)
              </label>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                支援 羅馬字 (POJ) 與 漢羅 (Han-lô)
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
                填入 羅馬字
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
                填入 漢羅
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
                雙欄同步 (羅馬字 + 漢羅)
              </button>
            </div>
          </div>

          {/* DUAL MODE INPUT: Separate Romanization & Han-lo */}
          {targetField === 'dual' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="aligner-roman-text" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    1. 羅馬字 歌詞 (POJ)
                  </label>
                  <span className="text-[11px] text-zinc-400">換行代表分句</span>
                </div>
                <textarea
                  id="aligner-roman-text"
                  rows={5}
                  value={romanText}
                  onChange={e => setRomanText(e.target.value)}
                  placeholder={`例：\nTo̍k iā bô phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe\n\nKhuànn-tio̍h thâu-tsîng thinn tō beh kng`}
                  className="w-full px-3 py-2.5 text-sm bg-zinc-50 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-amber-500 text-zinc-900 dark:text-zinc-100 font-serif"
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label htmlFor="aligner-hanlo-text" className="block text-xs font-bold text-zinc-700 dark:text-zinc-300">
                    2. 漢羅 歌詞 (Han-lô)
                  </label>
                  <span className="text-[11px] text-zinc-400">音節數對齊羅馬字</span>
                </div>
                <textarea
                  id="aligner-hanlo-text"
                  rows={5}
                  value={hanloText}
                  onChange={e => setHanloText(e.target.value)}
                  placeholder={`例：\n獨夜無伴守燈下\n清風對面吹\n\n看著頭前天著欲光`}
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
                    ? '貼上 羅馬字 歌詞 (POJ)'
                    : '貼上 漢羅 歌詞 (Han-lô)'}
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                    💡 換行代表分句/分段
                  </span>
                </div>
              </div>
              <textarea
                id="aligner-input-text"
                rows={4}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={
                  targetField === 'roman' || targetField === 'poj' || targetField === 'tl'
                    ? `例：\nTo̍k iā bô phōaⁿ siú teng-ē\nChheng-hong tùi bīn chhoe`
                    : `例：\n獨夜無伴守燈下\n清風對面吹`
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
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 font-bold text-sm transition-all disabled:opacity-50 cursor-pointer"
          >
            <AlignLeft className="w-4 h-4 text-amber-400" />
            <span>分詞並預覽對齊 (Parse Syllables & Preview)</span>
          </button>

          {/* Preview Tokens Grid Grouped by Verse */}
          {versePreviews.length > 0 && (
            <div id="aligner-preview-container" className="flex flex-col gap-3 pt-2 border-t border-zinc-200 dark:border-zinc-800">
              <div className="flex items-center justify-between text-xs text-zinc-500">
                <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                  <AlignLeft className="w-3.5 h-3.5 text-amber-500" />
                  <span>
                    Syllable Alignment Preview ({versePreviews.length} verses / {totalPreviewTokensCount} syllables / {totalNotesCount} notes total)
                  </span>
                </span>
                {versePreviews.length > songVerses.length && (
                  <span className="text-amber-600 dark:text-amber-400 font-medium text-xs">
                    (Notice: Lyrics lines exceed song verse count; extras will be ignored)
                  </span>
                )}
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
                        <span className="text-[11px] text-zinc-500 font-mono">
                          {vp.tokens.length} syllables
                          {isSyllableOverflow && (
                            <span className="text-amber-600 dark:text-amber-400 ml-1">
                              ({vp.tokens.length - vp.noteCount} extra truncated)
                            </span>
                          )}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {vp.tokens.map((tok, tokIdx) => {
                          const isExceedingNote = !isOverflowVerse && tokIdx >= vp.noteCount;
                          return (
                            <div
                              key={tokIdx}
                              className={`flex flex-col items-center px-2 py-1 border rounded-lg text-xs transition-all ${
                                isExceedingNote
                                  ? 'bg-amber-50/50 dark:bg-amber-950/30 border-amber-300/50 text-zinc-400 dark:text-zinc-500 line-through'
                                  : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 shadow-2xs'
                              }`}
                              title={isExceedingNote ? 'Syllable exceeds note limit for this verse' : undefined}
                            >
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-mono">#{tokIdx + 1}</span>
                              <span className="font-bold text-sm leading-tight">
                                {tok.hanlo || tok.custom || tok.hanji || (tok.poj || tok.tl || '—')}
                              </span>
                              {(tok.hanlo || tok.custom || tok.hanji) && (tok.poj || tok.tl) && (
                                <span className="font-serif italic text-emerald-600 dark:text-emerald-400 text-[10px] leading-tight">
                                  {tok.poj || tok.tl}
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
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60">
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
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-zinc-950 font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            <span>Apply to Score</span>
          </button>
        </div>
      </div>
    </div>
  );
};
