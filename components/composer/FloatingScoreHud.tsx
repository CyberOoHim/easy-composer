'use client';

import React from 'react';
import {
  Play,
  Square,
  Plus,
  CornerDownLeft,
  Wand2,
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Sparkles,
  ChevronDown,
  Music,
  Trash2,
  Sun,
  Moon,
  Undo2,
  Redo2,
  Scissors,
  Copy,
  Shuffle,
  AlertCircle,
  Settings2,
  Sliders,
  Layers,
  ArrowRight,
  ArrowLeft,
  ArrowRightToLine,
  ArrowLeftToLine,
  Check,
  X,
  Disc,
  Command,
  Keyboard,
  RotateCw,
  WrapText,
  AlignJustify,
  RectangleHorizontal,
  RectangleVertical,
} from 'lucide-react';
import { NoteDuration, PitchNumber, ArticulationType, NoteInputMode, VerseDisplayOption, SheetWrapMode, SheetOrientation } from '@/types/song';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';

export type HudDrawerType = 'none' | 'piano' | 'ornaments' | 'chords' | 'edit';

export interface FloatingScoreHudProps {
  // Playback
  isPlaying: boolean;
  onTogglePlay: () => void;
  selectedMeasureNumber?: number;
  selectedNoteNumber?: number;

  // Note Input Mode (Replace, Progressive Replace, Progressive Insert)
  noteInputMode?: NoteInputMode;
  onChangeNoteInputMode?: (mode: NoteInputMode) => void;

  // Rhythm Warnings & Auto Rearrange & Auto Wrap
  showRhythmWarnings?: boolean;
  onToggleShowRhythmWarnings?: () => void;
  onAutoRearrangeMeasures?: () => void;
  onAutoWrapMeasures?: () => void;
  sheetWrapMode?: SheetWrapMode;
  onRotateWrapMode?: () => void;
  sheetOrientation?: SheetOrientation;
  onToggleOrientation?: () => void;

  // Note editing operations
  onInsertNoteAfter?: () => void;
  onInsertNoteBefore?: () => void;
  onDeleteCurrentNote?: () => void;
  onDeleteNoteAfter?: () => void;
  onDeleteNoteBefore?: () => void;
  onDuplicateCurrentNote?: () => void;
  onPushNotesToNextMeasure?: () => void;
  onShiftNotesToPrevMeasure?: () => void;

  // Measure editing operations
  onAddMeasureAfter?: () => void;
  onAddMeasureBefore?: () => void;
  onDuplicateMeasure?: () => void;

  // Pitch input
  onSetPitch: (pitch: PitchNumber) => void;
  onSetDash: () => void; // Sustain dash '-'
  onSetOctave: (delta: number) => void;
  currentOctave: number;

  // Duration input
  onSetDuration: (duration: NoteDuration) => void;
  currentDuration?: NoteDuration;
  onToggleDotted: () => void;
  isDotted?: boolean;
  onToggleTriplet?: () => void;
  isTriplet?: boolean;

  // Modifiers
  onToggleSlur: () => void;
  isSlur?: boolean;
  onToggleTie: () => void;
  isTie?: boolean;
  onSetAccidental: (acc: '' | '#' | 'b') => void;
  currentAccidental?: '' | '#' | 'b';

  // Ornaments & Articulations
  currentArticulation?: ArticulationType;
  onSetArticulation?: (art: ArticulationType) => void;
  onInsertPunctuation?: (punct: string) => void;
  onInsertAnnotation?: (annot: string) => void;
  onAddGraceNote?: (type: 'pre' | 'post', pitch: 1 | 2 | 3 | 4 | 5 | 6 | 7, octave: number) => void;
  onClearGraceNotes?: () => void;
  hasGraceNotes?: boolean;

  // Chords & Harmony
  currentMeasureChord?: string;
  onUpdateMeasureChord?: (chord: string) => void;
  chordSuggestions?: string[];
  onAutoHarmonize?: () => void;

  // Mutually exclusive drawer / popovers (Piano Bed, Ornaments, Chords, Edit)
  activeDrawer?: HudDrawerType;
  onToggleDrawer?: (drawer: 'piano' | 'ornaments' | 'chords' | 'edit') => void;
  onCloseDrawer?: () => void;

  // Piano Bed & Keyboard Transcription (Legacy/Direct slot support)
  onTogglePianoBed?: () => void;
  showPianoBed?: boolean;
  pianoBedSlot?: React.ReactNode;

  // Measure operations
  onAddMeasure: () => void;
  onDeleteSelectedMeasure?: () => void;
  onToggleLineBreak: () => void;
  isLineBreak?: boolean;
  onTogglePrelude?: () => void;
  isPrelude?: boolean;
  onToggleVoltaEnding?: () => void;
  voltaEnding?: number[];
  onAutoFillRest?: () => void;
  canFillRest?: boolean;

  // Zoom & Print & Theme
  zoomScale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onPrint: () => void;
  sheetTheme?: 'light' | 'dark';
  onToggleSheetTheme?: () => void;

  // State
  activeField: 'pitch' | 'lyric';
  onToggleActiveField: () => void;
  selectedVerseRow: number;
  onChangeVerseRow: (row: number) => void;
  availableVerseRows?: number[];
  currentVerseDisplayOption?: VerseDisplayOption;
  onChangeVerseDisplayOption?: (option: VerseDisplayOption) => void;
  onAddVerse?: () => void;
  onRemoveVerse?: (verseRow: number) => void;
  onStepNextNote?: () => void;
  onStepPrevNote?: () => void;

  // Undo / Redo
  onUndo?: () => boolean;
  onRedo?: () => boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  pastCount?: number;
  futureCount?: number;
}

const COMMON_PUNCTUATIONS = ['，', '。', '！', '？', '、', '；', '：', '—', '…'];
const COMMON_ANNOTATIONS = ['rit.', 'accel.', 'a tempo', 'fine', 'V', 'fermata'];

export const FloatingScoreHud: React.FC<FloatingScoreHudProps> = ({
  isPlaying,
  onTogglePlay,
  selectedMeasureNumber,
  selectedNoteNumber,
  noteInputMode = 'progressive_replace',
  onChangeNoteInputMode,
  showRhythmWarnings = true,
  onToggleShowRhythmWarnings,
  onAutoRearrangeMeasures,
  onAutoWrapMeasures,
  sheetWrapMode = 'no_wrap',
  onRotateWrapMode,
  sheetOrientation = 'portrait',
  onToggleOrientation,
  onInsertNoteAfter,
  onInsertNoteBefore,
  onDeleteCurrentNote,
  onDeleteNoteAfter,
  onDeleteNoteBefore,
  onDuplicateCurrentNote,
  onPushNotesToNextMeasure,
  onShiftNotesToPrevMeasure,
  onAddMeasureAfter,
  onAddMeasureBefore,
  onDuplicateMeasure,
  onSetPitch,
  onSetDash,
  onSetOctave,
  currentOctave,
  onSetDuration,
  currentDuration,
  onToggleDotted,
  isDotted,
  onToggleTriplet,
  isTriplet,
  onToggleSlur,
  isSlur,
  onToggleTie,
  isTie,
  onSetAccidental,
  currentAccidental,
  currentArticulation = 'none',
  onSetArticulation,
  onInsertPunctuation,
  onInsertAnnotation,
  onAddGraceNote,
  onClearGraceNotes,
  hasGraceNotes,
  currentMeasureChord = '',
  onUpdateMeasureChord,
  chordSuggestions = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7'],
  onAutoHarmonize,
  activeDrawer,
  onToggleDrawer,
  onCloseDrawer,
  onTogglePianoBed,
  showPianoBed,
  pianoBedSlot,
  onAddMeasure,
  onDeleteSelectedMeasure,
  onToggleLineBreak,
  isLineBreak,
  onTogglePrelude,
  isPrelude,
  onToggleVoltaEnding,
  voltaEnding,
  onAutoFillRest,
  canFillRest,
  zoomScale,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onPrint,
  sheetTheme,
  onToggleSheetTheme,
  activeField,
  onToggleActiveField,
  selectedVerseRow,
  onChangeVerseRow,
  availableVerseRows = [1],
  currentVerseDisplayOption = 'both',
  onChangeVerseDisplayOption,
  onAddVerse,
  onRemoveVerse,
  onStepNextNote,
  onStepPrevNote,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  pastCount = 0,
  futureCount = 0,
}) => {
  const [internalDrawer, setInternalDrawer] = React.useState<HudDrawerType>('none');
  const [showShortcutsModal, setShowShortcutsModal] = React.useState<boolean>(false);

  // Determine current active drawer (controlled or internal)
  const currentDrawer: HudDrawerType =
    activeDrawer !== undefined
      ? activeDrawer
      : showPianoBed
      ? 'piano'
      : internalDrawer;

  const handleToggleDrawer = (target: 'piano' | 'ornaments' | 'chords' | 'edit') => {
    if (onToggleDrawer) {
      onToggleDrawer(target);
    } else if (target === 'piano' && onTogglePianoBed) {
      if (currentDrawer === 'piano') {
        onTogglePianoBed();
        setInternalDrawer('none');
      } else {
        setInternalDrawer('piano');
        if (!showPianoBed) onTogglePianoBed();
      }
    } else {
      setInternalDrawer(prev => (prev === target ? 'none' : target));
      if (showPianoBed && onTogglePianoBed) {
        onTogglePianoBed();
      }
    }
  };

  const handleCloseDrawer = React.useCallback(() => {
    if (onCloseDrawer) {
      onCloseDrawer();
    } else {
      setInternalDrawer('none');
      if (showPianoBed && onTogglePianoBed) {
        onTogglePianoBed();
      }
    }
  }, [onCloseDrawer, showPianoBed, onTogglePianoBed]);

  // Close active drawer on Escape key
  React.useEffect(() => {
    if (currentDrawer === 'none') return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCloseDrawer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentDrawer, handleCloseDrawer]);

  return (
    <>
      {/* Click-away backdrop for active HUD drawer (ornaments or chords) */}
      {currentDrawer !== 'none' && currentDrawer !== 'piano' && (
        <div
          id="floating-score-hud-popover-backdrop"
          className="fixed inset-0 z-30 bg-transparent"
          onClick={handleCloseDrawer}
        />
      )}

      <div
        id="floating-score-hud-container"
        className="fixed bottom-0 sm:bottom-1 left-1/2 -translate-x-1/2 z-40 w-full max-w-5xl px-1.5 sm:px-2 pointer-events-none print:hidden flex flex-col items-center gap-1"
      >
        {/* Wide Bar for Ornaments & Articulations (Minimal Height, Horizontal Toolbar) */}
        {currentDrawer === 'ornaments' && (
          <div
            id="floating-score-hud-ornaments-bar"
            className="pointer-events-auto w-full bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap scrollbar-none animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            {/* Title / Icon */}
            <div className="flex items-center gap-1.5 text-amber-500 shrink-0 font-bold">
              <Sparkles className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 hidden sm:inline">Ornaments:</span>
            </div>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 hidden sm:block" />

            {/* Articulations */}
            <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
              {(['none', 'staccato', 'tenuto', 'accent', 'fermata'] as ArticulationType[]).map(art => (
                <button
                  key={art}
                  type="button"
                  onClick={() => onSetArticulation?.(art)}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold capitalize cursor-pointer transition-all ${
                    currentArticulation === art
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title={`Articulation: ${art}`}
                >
                  {art === 'none' ? 'Natural' : art}
                </button>
              ))}
              {onToggleTriplet && (
                <button
                  type="button"
                  onClick={onToggleTriplet}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all ${
                    isTriplet
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title="Toggle Triplet (3 notes in 2 beats time)"
                >
                  Triplet (3)
                </button>
              )}
            </div>

            {/* Grace Notes */}
            {onAddGraceNote && (
              <>
                <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-xs font-bold text-zinc-400 uppercase hidden lg:inline">Grace:</span>
                  <button
                    type="button"
                    onClick={() => onAddGraceNote('pre', 5, 0)}
                    className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all"
                    title="Add Pre-Grace Note (前倚音)"
                  >
                    + Pre
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddGraceNote('post', 6, 0)}
                    className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all"
                    title="Add Post-Grace Note (後倚音)"
                  >
                    + Post
                  </button>
                  {hasGraceNotes && onClearGraceNotes && (
                    <button
                      type="button"
                      onClick={onClearGraceNotes}
                      className="px-2 py-1 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all"
                      title="Clear Grace Notes"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </>
            )}

            {/* Punctuation */}
            {onInsertPunctuation && (
              <>
                <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs font-bold text-zinc-400 uppercase hidden xl:inline mr-0.5">Punct:</span>
                  {COMMON_PUNCTUATIONS.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => onInsertPunctuation(p)}
                      className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 text-sm sm:text-base font-bold flex items-center justify-center cursor-pointer transition-all shrink-0"
                      title={`Insert punctuation ${p}`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Annotations */}
            {onInsertAnnotation && (
              <>
                <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />
                <div className="flex items-center gap-1.5 shrink-0">
                  {COMMON_ANNOTATIONS.map(a => (
                    <button
                      key={a}
                      type="button"
                      onClick={() => onInsertAnnotation(a)}
                      className="px-2.5 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 font-serif italic font-bold text-xs sm:text-sm cursor-pointer transition-all shrink-0"
                      title={`Insert annotation ${a}`}
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer"
              title="Close Ornaments Bar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Wide Bar for Measure Chords (Minimal Height, Horizontal Toolbar) */}
        {currentDrawer === 'chords' && (
          <div
            id="floating-score-hud-chords-bar"
            className="pointer-events-auto w-full bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap scrollbar-none animate-in fade-in slide-in-from-bottom-1 duration-150"
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

            {/* Auto Harmonize Button */}
            {onAutoHarmonize && (
              <>
                <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5 hidden sm:block" />
                <button
                  type="button"
                  onClick={() => {
                    onAutoHarmonize();
                    handleCloseDrawer();
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
              onClick={handleCloseDrawer}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer"
              title="Close Chords Bar (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Wide Bar for Comprehensive Edit Suite (Minimal Height, Horizontal Toolbar) */}
        {currentDrawer === 'edit' && (
          <div
            id="floating-score-hud-edit-bar"
            className="pointer-events-auto w-full bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap scrollbar-none animate-in fade-in slide-in-from-bottom-1 duration-150"
          >
            {/* Title / Icon */}
            <div className="flex items-center gap-1.5 text-amber-500 shrink-0 font-bold">
              <Sliders className="w-4 h-4" />
              <span className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100">Edit Suite:</span>
            </div>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

            {/* Note Input Mode Segment */}
            {onChangeNoteInputMode && (
              <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-lg border border-zinc-200 dark:border-zinc-700 shrink-0">
                <span className="text-xs font-bold text-zinc-400 uppercase px-1 hidden sm:inline">Input Mode:</span>
                <button
                  type="button"
                  onClick={() => onChangeNoteInputMode('replace')}
                  className={`px-2.5 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    noteInputMode === 'replace'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title="Replace Current Note: Modifies current note pitch without advancing cursor"
                >
                  Replace (覆蓋)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeNoteInputMode('progressive_replace')}
                  className={`px-2.5 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    noteInputMode === 'progressive_replace'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title="Progressive Replace: Modifies current note pitch and auto-steps to next note"
                >
                  Prog Replace (遞進覆蓋)
                </button>
                <button
                  type="button"
                  onClick={() => onChangeNoteInputMode('progressive_insert')}
                  className={`px-2.5 py-1 sm:py-1.5 rounded text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                    noteInputMode === 'progressive_insert'
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200'
                  }`}
                  title="Progressive Insertion: Inserts a new note after current note and advances cursor"
                >
                  Prog Insert (遞進插入)
                </button>
              </div>
            )}

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

            {/* Note Operations Group */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-zinc-400 uppercase hidden md:inline">Note:</span>
              {onInsertNoteAfter && (
                <button
                  type="button"
                  onClick={onInsertNoteAfter}
                  className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Add / Insert a note after current note"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Note After</span>
                </button>
              )}
              {onInsertNoteBefore && (
                <button
                  type="button"
                  onClick={onInsertNoteBefore}
                  className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Insert a note before current note"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Note Before</span>
                </button>
              )}
              {onDuplicateCurrentNote && (
                <button
                  type="button"
                  onClick={onDuplicateCurrentNote}
                  className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Duplicate current note"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Duplicate</span>
                </button>
              )}
              {onDeleteCurrentNote && (
                <button
                  type="button"
                  onClick={onDeleteCurrentNote}
                  className="px-2.5 py-1 sm:py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Delete current note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Del Note</span>
                </button>
              )}
              {onDeleteNoteAfter && (
                <button
                  type="button"
                  onClick={onDeleteNoteAfter}
                  className="px-2.5 py-1 sm:py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Delete note after current note"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Del After</span>
                </button>
              )}
              {onShiftNotesToPrevMeasure && (
                <button
                  id="floating-hud-shift-notes-prev-bar-btn"
                  type="button"
                  onClick={onShiftNotesToPrevMeasure}
                  className="px-2.5 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-500 hover:text-zinc-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Shift notes from start of measure up to & including current note into preceding measure (Alt+Shift+Left)"
                >
                  <ArrowLeftToLine className="w-3.5 h-3.5" />
                  <span>Shift to Prev Bar (⇤)</span>
                </button>
              )}
              {onPushNotesToNextMeasure && (
                <button
                  id="floating-hud-push-notes-next-bar-btn"
                  type="button"
                  onClick={onPushNotesToNextMeasure}
                  className="px-2.5 py-1 sm:py-1.5 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-500 hover:text-zinc-950 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Push current note & all subsequent notes in measure into next measure (Alt+Shift+Right)"
                >
                  <ArrowRightToLine className="w-3.5 h-3.5" />
                  <span>Push to Next Bar (⇥)</span>
                </button>
              )}
            </div>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

            {/* Measure Operations Group */}
            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-xs font-bold text-zinc-400 uppercase hidden md:inline">Measure:</span>
              {onAddMeasureAfter && (
                <button
                  type="button"
                  onClick={onAddMeasureAfter}
                  className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Add a measure after current measure"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bar After</span>
                </button>
              )}
              {onAddMeasureBefore && (
                <button
                  type="button"
                  onClick={onAddMeasureBefore}
                  className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Add a measure before current measure"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bar Before</span>
                </button>
              )}
              {onDuplicateMeasure && (
                <button
                  type="button"
                  onClick={onDuplicateMeasure}
                  className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Duplicate current measure"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>Dup Bar</span>
                </button>
              )}
              {onDeleteSelectedMeasure && (
                <button
                  type="button"
                  onClick={onDeleteSelectedMeasure}
                  className="px-2.5 py-1 sm:py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-950/40 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5"
                  title="Delete current measure"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Del Bar</span>
                </button>
              )}
            </div>

            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0" />

            {/* Rhythm Alignment & Warnings Group */}
            <div className="flex items-center gap-1.5 shrink-0">
              {onAutoRearrangeMeasures && (
                <button
                  type="button"
                  onClick={() => {
                    onAutoRearrangeMeasures();
                  }}
                  className="px-3 py-1 sm:py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 shadow-2xs"
                  title="Auto Rearrange Measures: Redistribute notes across barlines to strictly conform to time signature"
                >
                  <Shuffle className="w-3.5 h-3.5" />
                  <span>Auto-Rearrange Bars</span>
                </button>
              )}
              {onToggleShowRhythmWarnings && (
                <button
                  type="button"
                  onClick={onToggleShowRhythmWarnings}
                  className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all flex items-center gap-1.5 ${
                    showRhythmWarnings
                      ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/40'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  title="Toggle Measure Beat Notices (⚠️ warnings on incomplete / overbeat measures; never printed)"
                >
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>Notice: {showRhythmWarnings ? 'ON' : 'OFF'}</span>
                </button>
              )}
            </div>

            {/* Close Button */}
            <button
              type="button"
              onClick={handleCloseDrawer}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer"
              title="Close Edit Suite (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Docked Piano Bed Slot (Mutually Exclusive) */}
        {currentDrawer === 'piano' && pianoBedSlot && (
          <div className="pointer-events-auto w-full flex justify-center">
            {pianoBedSlot}
          </div>
        )}

      <div className="pointer-events-auto flex flex-col items-center gap-1 p-1 sm:p-1.5 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl transition-all duration-200">
        {/* Main Ribbon Buttons */}
        <div className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center">
          {/* Play/Stop Sheet Button */}
          <button
            id="floating-hud-play-btn"
            type="button"
            onClick={onTogglePlay}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold text-xs shadow-xs transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[42px] ${
              isPlaying
                ? 'bg-rose-600 hover:bg-rose-500 text-white ring-2 ring-rose-400 font-extrabold animate-pulse'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold'
            }`}
            title={
              isPlaying
                ? 'Stop playback (Space)'
                : selectedMeasureNumber
                ? `Play score from Measure #${selectedMeasureNumber} (Space)`
                : 'Play score from beginning (Space)'
            }
          >
            {isPlaying ? (
              <>
                <Square className="w-4 h-4 fill-current" />
                <span>Stop</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>Play</span>
              </>
            )}
          </button>

          {/* Quick Undo / Redo in HUD */}
          {onUndo && onRedo && (
            <div
              id="floating-hud-undo-redo-group"
              className="flex items-center bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 min-h-[42px]"
            >
              <button
                id="floating-hud-undo-btn"
                type="button"
                onClick={onUndo}
                disabled={!canUndo}
                title={canUndo ? `Undo [Ctrl+Z / ⌘Z] · ${pastCount} step(s)` : 'Nothing to undo'}
                aria-label="Undo"
                className="p-2.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer touch-manipulation min-h-[38px] min-w-[38px] flex items-center justify-center"
              >
                <Undo2 className="w-4 h-4" />
              </button>
              <div className="w-[1px] h-4 bg-zinc-300 dark:bg-zinc-750 mx-0.5" />
              <button
                id="floating-hud-redo-btn"
                type="button"
                onClick={onRedo}
                disabled={!canRedo}
                title={canRedo ? `Redo [Ctrl+Y / ⌘Shift+Z] · ${futureCount} step(s)` : 'Nothing to redo'}
                aria-label="Redo"
                className="p-2.5 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-white dark:hover:bg-zinc-700 disabled:opacity-30 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-all active:scale-90 cursor-pointer touch-manipulation min-h-[38px] min-w-[38px] flex items-center justify-center"
              >
                <Redo2 className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block mx-0.5" />

          {/* Active Field Toggle: Pitch vs Lyric */}
          <div className="flex bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700 min-h-[42px] items-center">
            <button
              id="floating-hud-pitch-mode-btn"
              type="button"
              onClick={() => activeField !== 'pitch' && onToggleActiveField()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[36px] flex items-center justify-center ${
                activeField === 'pitch'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
              title="Edit musical pitches & durations (Up/Down arrow to switch)"
            >
              Notes
            </button>
            <button
              id="floating-hud-lyric-mode-btn"
              type="button"
              onClick={() => activeField !== 'lyric' && onToggleActiveField()}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation min-h-[36px] flex items-center justify-center ${
                activeField === 'lyric'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900'
              }`}
              title="Edit lyrics aligned under notes (Up/Down arrow to switch)"
            >
              Lyrics
            </button>
          </div>

          {/* Verse Selector when in Lyric mode */}
          {activeField === 'lyric' && (
            <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-1 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-bold shrink-0">
              <span className="text-zinc-500 text-[11px]">Verse:</span>
              {availableVerseRows.map(row => (
                <button
                  key={`hud-vrow-${row}`}
                  type="button"
                  onClick={() => onChangeVerseRow(row)}
                  className={`w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                    selectedVerseRow === row
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                      : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title={`Select Verse ${row}`}
                >
                  {row}
                </button>
              ))}
              {onAddVerse && availableVerseRows.length < 5 && (
                <button
                  type="button"
                  onClick={onAddVerse}
                  className="w-6 h-6 rounded-lg text-xs font-black flex items-center justify-center bg-zinc-200/90 dark:bg-zinc-700/80 hover:bg-amber-500 hover:text-zinc-950 text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer"
                  title="Add parallel verse (up to 5 verses allowed)"
                >
                  +
                </button>
              )}
              {onRemoveVerse && availableVerseRows.length > 1 && (
                <button
                  type="button"
                  onClick={() => onRemoveVerse(selectedVerseRow)}
                  className="w-6 h-6 rounded-lg text-xs font-bold flex items-center justify-center text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                  title={`Delete Verse ${selectedVerseRow}`}
                >
                  ×
                </button>
              )}
            </div>
          )}

          {/* Step Prev / Next note navigation when in Lyric mode */}
          {activeField === 'lyric' && (onStepPrevNote || onStepNextNote) && (
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              {onStepPrevNote && (
                <button
                  id="floating-hud-lyric-prev-note-btn"
                  type="button"
                  onClick={onStepPrevNote}
                  className="px-2.5 h-7 sm:h-8 rounded-lg font-sans font-bold text-xs flex items-center justify-center text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-all cursor-pointer touch-manipulation"
                  title="Previous Note"
                >
                  ←
                </button>
              )}
              {onStepNextNote && (
                <button
                  id="floating-hud-lyric-next-note-btn"
                  type="button"
                  onClick={onStepNextNote}
                  className="px-2.5 h-7 sm:h-8 rounded-lg font-sans font-bold text-xs flex items-center justify-center bg-amber-500 text-zinc-950 font-bold hover:bg-amber-400 transition-all cursor-pointer touch-manipulation shadow-2xs"
                  title="Next Note"
                >
                  Next →
                </button>
              )}
            </div>
          )}

          {/* Pitch Palette: 1-7, 0, - */}
          {activeField === 'pitch' && (
            <div className="flex items-center gap-0.5 sm:gap-1 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              {([1, 2, 3, 4, 5, 6, 7] as PitchNumber[]).map(p => (
                <button
                  key={`hud-pitch-${p}`}
                  id={`floating-hud-pitch-${p}-btn`}
                  type="button"
                  onClick={() => onSetPitch(p)}
                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-black text-sm sm:text-base flex items-center justify-center text-zinc-800 dark:text-zinc-100 hover:bg-amber-500 hover:text-zinc-950 transition-all active:scale-90 cursor-pointer"
                  title={`Pitch ${p} (Key ${p})`}
                >
                  {p}
                </button>
              ))}
              <button
                id="floating-hud-pitch-rest-btn"
                type="button"
                onClick={() => onSetPitch(0)}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-black text-sm sm:text-base flex items-center justify-center text-zinc-800 dark:text-zinc-100 hover:bg-amber-500 hover:text-zinc-950 transition-all active:scale-90 cursor-pointer"
                title="Rest note (0)"
              >
                0
              </button>
              <button
                id="floating-hud-pitch-dash-btn"
                type="button"
                onClick={onSetDash}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-black text-sm sm:text-base flex items-center justify-center text-zinc-800 dark:text-zinc-100 hover:bg-amber-500 hover:text-zinc-950 transition-all active:scale-90 cursor-pointer"
                title="Sustain Dash (-) extend note duration"
              >
                -
              </button>
            </div>
          )}

          {/* Octave Controls */}
          {activeField === 'pitch' && (
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                id="floating-hud-octave-down-btn"
                type="button"
                onClick={() => onSetOctave(-1)}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentOctave < 0
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Octave Down (• below) (Key -)"
              >
                8vb •
              </button>
              <button
                id="floating-hud-octave-up-btn"
                type="button"
                onClick={() => onSetOctave(1)}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentOctave > 0
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Octave Up (• above) (Key +)"
              >
                8va •
              </button>
            </div>
          )}

          {/* Duration Selector */}
          {activeField === 'pitch' && (
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                id="floating-hud-dur-quarter-btn"
                type="button"
                onClick={() => onSetDuration(1)}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentDuration === 1
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Quarter note (1 beat)"
              >
                1
              </button>
              <button
                id="floating-hud-dur-eighth-btn"
                type="button"
                onClick={() => onSetDuration(0.5)}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentDuration === 0.5
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="8th note (1/2 beat - single beam) (Key /)"
              >
                <span className="underline decoration-2">1/2</span>
              </button>
              <button
                id="floating-hud-dur-sixteenth-btn"
                type="button"
                onClick={() => onSetDuration(0.25)}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentDuration === 0.25
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="16th note (1/4 beat - double beam)"
              >
                <span className="underline decoration-double">1/4</span>
              </button>
              <button
                id="floating-hud-dur-half-btn"
                type="button"
                onClick={() => onSetDuration(2)}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentDuration === 2
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Half note (2 beats)"
              >
                2
              </button>
              <button
                id="floating-hud-dur-whole-btn"
                type="button"
                onClick={() => onSetDuration(4)}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentDuration === 4
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Whole note (4 beats)"
              >
                4
              </button>
            </div>
          )}

          {/* Dotted, Slur, Tie, Accidentals */}
          {activeField === 'pitch' && (
            <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
              <button
                id="floating-hud-toggle-dot-btn"
                type="button"
                onClick={onToggleDotted}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isDotted
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Toggle Dotted Note (Key .)"
              >
                • Dot
              </button>
              <button
                id="floating-hud-toggle-slur-btn"
                type="button"
                onClick={onToggleSlur}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isSlur
                    ? 'bg-purple-600 text-white font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Toggle Slur arc across notes (Key S)"
              >
                ⌒ Slur
              </button>
              <button
                id="floating-hud-toggle-tie-btn"
                type="button"
                onClick={onToggleTie}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  isTie
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Toggle Tie sustain same pitch (Key T)"
              >
                Tie
              </button>
              <button
                id="floating-hud-toggle-sharp-btn"
                type="button"
                onClick={() => onSetAccidental('#')}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentAccidental === '#'
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Sharp accidental (Key #)"
              >
                ♯
              </button>
              <button
                id="floating-hud-toggle-flat-btn"
                type="button"
                onClick={() => onSetAccidental('b')}
                className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg text-xs font-bold flex items-center justify-center transition-all cursor-pointer ${
                  currentAccidental === 'b'
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Flat accidental (Key b)"
              >
                ♭
              </button>
            </div>
          )}

          {/* Popovers, Piano Bed, Recorder & Tools (Mutually Exclusive) */}
          <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
            {/* Virtual Piano Bed Toggle */}
            <button
              id="floating-hud-piano-bed-btn"
              type="button"
              onClick={() => handleToggleDrawer('piano')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentDrawer === 'piano'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Toggle Virtual Piano Bed (Interactive on-screen keys with audio tone preview)"
            >
              <Keyboard className={`w-4 h-4 ${currentDrawer === 'piano' ? 'text-zinc-950' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">Piano</span>
            </button>

            {/* Edit Suite Popover Toggle */}
            <button
              id="floating-hud-edit-suite-btn"
              type="button"
              onClick={() => handleToggleDrawer('edit')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentDrawer === 'edit'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Comprehensive Edit Suite: Note/Measure Insertion & Deletion, Input Modes, Auto-Rearrange"
            >
              <Sliders className={`w-4 h-4 ${currentDrawer === 'edit' ? 'text-zinc-950' : 'text-amber-500'}`} />
              <span className="hidden sm:inline">Edit Suite</span>
            </button>

            {/* Ornaments & Articulations Popover Toggle */}
            <button
              id="floating-hud-ornaments-btn"
              type="button"
              onClick={() => handleToggleDrawer('ornaments')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentDrawer === 'ornaments'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Ornaments, Articulations, Grace Notes & Performance Marks"
            >
              <Sparkles className={`w-4 h-4 ${currentDrawer === 'ornaments' ? 'text-zinc-950' : 'text-amber-500'}`} />
              <span className="hidden md:inline">Ornaments</span>
            </button>

            {/* Chords Popover Toggle */}
            <button
              id="floating-hud-chords-btn"
              type="button"
              onClick={() => handleToggleDrawer('chords')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentDrawer === 'chords'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Measure Chords & Auto-Harmonization"
            >
              <Music className={`w-4 h-4 ${currentDrawer === 'chords' ? 'text-zinc-950' : 'text-amber-500'}`} />
              <span className="hidden md:inline">Chords</span>
            </button>
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block mx-0.5" />

          {/* Quick Note Operations Group */}
          <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
            {onInsertNoteAfter && (
              <button
                id="floating-hud-quick-add-note-btn"
                type="button"
                onClick={onInsertNoteAfter}
                className="flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                title="Insert note after current note (Shift+Plus / +)"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Note</span>
              </button>
            )}
            {onDeleteCurrentNote && (
              <button
                id="floating-hud-quick-del-note-btn"
                type="button"
                onClick={onDeleteCurrentNote}
                className="p-1 h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 flex items-center justify-center transition-all cursor-pointer"
                title="Delete current note (Backspace / Delete)"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block mx-0.5" />

          {/* Measure Level Controls: Add Measure After, Line Break, Prelude, Voltas, Auto-Rearrange */}
          <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              id="floating-hud-append-measure-btn"
              type="button"
              onClick={onAddMeasureAfter || onAddMeasure}
              className="flex items-center gap-1 px-2.5 h-7 sm:h-8 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
              title="Add Measure after current measure"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Bar</span>
            </button>

            <button
              id="floating-hud-toggle-break-btn"
              type="button"
              onClick={onToggleLineBreak}
              className={`flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isLineBreak
                  ? 'bg-amber-500 text-zinc-950 font-black'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Force line break at current measure (splits staff system)"
            >
              <CornerDownLeft className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Break ↵</span>
            </button>

            {onTogglePrelude && (
              <button
                id="floating-hud-toggle-prelude-btn"
                type="button"
                onClick={onTogglePrelude}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  isPrelude
                    ? 'bg-indigo-600 text-white font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Toggle instrumental prelude parentheses ( ... )"
              >
                ( )
              </button>
            )}

            {onToggleVoltaEnding && (
              <button
                id="floating-hud-toggle-volta-btn"
                type="button"
                onClick={onToggleVoltaEnding}
                className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  voltaEnding && voltaEnding.length > 0
                    ? 'bg-amber-500 text-zinc-950 font-black'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Toggle Volta repeat ending bracket ┌ 1. 2. ──┐"
              >
                ┌ 1. 2. ┐
              </button>
            )}

            {onAutoRearrangeMeasures && (
              <button
                id="floating-hud-rearrange-measures-btn"
                type="button"
                onClick={onAutoRearrangeMeasures}
                className="flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-950/50 transition-all cursor-pointer"
                title="Auto-Rearrange all measures in song to match time signature"
              >
                <Shuffle className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Rearrange</span>
              </button>
            )}

            {onRotateWrapMode ? (
              <button
                id="floating-hud-wrap-mode-btn"
                type="button"
                onClick={onRotateWrapMode}
                className={`flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  sheetWrapMode === 'auto_wrap'
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                    : sheetWrapMode === 'auto_fit'
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title={`Layout mode: ${
                  sheetWrapMode === 'no_wrap'
                    ? '1. No fit in nor wrap (Manual breaks only). Click to rotate to 2. Auto Fit.'
                    : sheetWrapMode === 'auto_fit'
                    ? '2. Auto fit in (Forced measures per line). Click to rotate to 3. Auto Wrap.'
                    : '3. Auto wrap (Dynamic collision-free spacing). Click to rotate to 1. No Wrap.'
                }`}
              >
                {sheetWrapMode === 'no_wrap' && <AlignJustify className="w-3.5 h-3.5" />}
                {sheetWrapMode === 'auto_fit' && <Maximize2 className="w-3.5 h-3.5" />}
                {sheetWrapMode === 'auto_wrap' && <WrapText className="w-3.5 h-3.5" />}
                <span className="inline font-mono text-[11px]">
                  {sheetWrapMode === 'no_wrap' ? '1. No Wrap' : sheetWrapMode === 'auto_fit' ? '2. Auto Fit' : '3. Auto Wrap'}
                </span>
              </button>
            ) : onAutoWrapMeasures ? (
              <button
                id="floating-hud-auto-wrap-measures-btn"
                type="button"
                onClick={onAutoWrapMeasures}
                className="flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-all cursor-pointer"
                title="Auto-wrap measures to ensure all measures fit within the realistic sheet"
              >
                <WrapText className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Wrap Up</span>
              </button>
            ) : null}

            {onToggleOrientation && (
              <button
                id="floating-hud-orientation-btn"
                type="button"
                onClick={onToggleOrientation}
                className={`flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  sheetOrientation === 'landscape'
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/25'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title={`Sheet Orientation: ${
                  sheetOrientation === 'portrait'
                    ? 'Portrait (210×297mm). Click to switch to Landscape.'
                    : 'Landscape (297×210mm). Click to switch to Portrait.'
                }`}
              >
                {sheetOrientation === 'portrait' ? (
                  <RectangleVertical className="w-3.5 h-3.5 text-zinc-500 dark:text-zinc-400" />
                ) : (
                  <RectangleHorizontal className="w-3.5 h-3.5 text-emerald-500" />
                )}
                <span className="inline font-mono text-[11px]">
                  {sheetOrientation === 'portrait' ? 'Portrait' : 'Landscape'}
                </span>
              </button>
            )}

            {canFillRest && onAutoFillRest && (
              <button
                id="floating-hud-auto-rest-btn"
                type="button"
                onClick={onAutoFillRest}
                className="flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-all cursor-pointer shadow-2xs"
                title="Auto-fill missing beats with rest notes (0)"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Pad</span>
              </button>
            )}

            {onDeleteSelectedMeasure && (
              <button
                id="floating-hud-delete-measure-btn"
                type="button"
                onClick={onDeleteSelectedMeasure}
                className="p-1 h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-950/50 flex items-center justify-center transition-all cursor-pointer"
                title="Delete current measure"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <div className="h-6 w-px bg-zinc-200 dark:bg-zinc-700 hidden sm:block mx-0.5" />

          {/* Zoom & Print */}
          <div className="flex items-center gap-0.5 bg-zinc-100 dark:bg-zinc-800 p-0.5 rounded-xl border border-zinc-200 dark:border-zinc-700">
            <button
              id="floating-hud-zoom-out-btn"
              type="button"
              onClick={onZoomOut}
              className="p-1 h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-all cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <button
              id="floating-hud-reset-zoom-btn"
              type="button"
              onClick={onResetZoom}
              className="px-1.5 h-7 sm:h-8 rounded-lg text-[11px] font-mono font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-all cursor-pointer"
              title="Reset Zoom to 100%"
            >
              {Math.round(zoomScale * 100)}%
            </button>
            <button
              id="floating-hud-zoom-in-btn"
              type="button"
              onClick={onZoomIn}
              className="p-1 h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 flex items-center justify-center transition-all cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              id="floating-hud-print-btn"
              type="button"
              onClick={onPrint}
              className="p-1 h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center transition-all cursor-pointer"
              title="Print Sheet Music (WYSIWYG)"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
            {onToggleSheetTheme && (
              <button
                id="floating-hud-toggle-theme-btn"
                type="button"
                onClick={onToggleSheetTheme}
                className="p-1 h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center transition-all cursor-pointer"
                title={sheetTheme === 'dark' ? 'Switch score paper to Light Parchment' : 'Switch score paper to Dark Stage Mode'}
              >
                {sheetTheme === 'dark' ? (
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                ) : (
                  <Moon className="w-3.5 h-3.5" />
                )}
              </button>
            )}
            {/* Keyboard Shortcuts Guide Trigger */}
            <button
              id="floating-hud-shortcuts-btn"
              type="button"
              onClick={() => setShowShortcutsModal(true)}
              className="p-1 h-7 sm:h-8 w-7 sm:w-8 rounded-lg text-zinc-700 dark:text-zinc-300 hover:bg-amber-500 hover:text-zinc-950 flex items-center justify-center transition-all cursor-pointer"
              title="Keyboard Shortcuts Guide (快捷鍵指南)"
            >
              <Command className="w-3.5 h-3.5 text-amber-500" />
            </button>
          </div>
        </div>
      </div>
    </div>

    {/* Keyboard Shortcuts Modal */}
    <KeyboardShortcutsModal
      isOpen={showShortcutsModal}
      onClose={() => setShowShortcutsModal(false)}
    />
  </>
);
};
