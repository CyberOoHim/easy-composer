'use client';

import React from 'react';
import {
  Play,
  Square,
  Repeat,
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
  AlignLeft,
  RectangleHorizontal,
  RectangleVertical,
  Bookmark,
  LayoutGrid,
  Lightbulb,
} from 'lucide-react';
import { NoteDuration, PitchNumber, ArticulationType, NoteInputMode, VerseDisplayOption, SheetWrapMode, SheetOrientation, KeySignature, TimeSignature } from '@/types/song';
import { KeyboardShortcutsModal } from './KeyboardShortcutsModal';
import { COMMON_PUNCTUATIONS, COMMON_ANNOTATIONS } from '@/lib/taigiUtils';
import {
  type AccompanimentStyle,
  getStoredAccompanimentStyle,
  setStoredAccompanimentStyle,
  getStoredTactileQuickPad,
  setStoredTactileQuickPad,
  TACTILE_QUICK_PAD_EVENT,
  getStoredPentatonicMode,
  setStoredPentatonicMode,
} from '@/lib/storage';
import { CHORD_PROGRESSION_PRESETS } from '@/lib/creativityEngine';
import { audioEngine } from '@/lib/audioEngine';

export type HudDrawerType = 'none' | 'piano' | 'ornaments' | 'chords' | 'edit' | 'creativity';

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
  onInsertPunctuation?: (punct: string, insertAfter?: boolean) => void;
  onInsertPunctuationAfter?: (punct: string) => void;
  onInsertAnnotation?: (annot: string) => void;
  onAddGraceNote?: (type: 'pre' | 'post', pitch: 1 | 2 | 3 | 4 | 5 | 6 | 7, octave: number) => void;
  onClearGraceNotes?: () => void;
  hasGraceNotes?: boolean;

  // Chords & Harmony
  currentMeasureChord?: string;
  onUpdateMeasureChord?: (chord: string) => void;
  currentMeasureSection?: string;
  onUpdateMeasureSection?: (section: string) => void;
  chordSuggestions?: string[];
  onAutoHarmonize?: () => void;

  // Accompaniment Style & Creativity Studio (MOD-4 / MOD-6)
  accompanimentStyle?: AccompanimentStyle;
  onChangeAccompanimentStyle?: (style: AccompanimentStyle) => void;
  isPentatonicMode?: boolean;
  onTogglePentatonicMode?: () => void;
  onApplyChordProgressionPreset?: (presetId: string) => void;
  onApplyMotifTool?: (tool: 'invert' | 'retrograde' | 'seq_up' | 'seq_down' | 'ornaments' | 'spark') => void;
  songKey?: KeySignature;
  songTimeSignature?: TimeSignature;

  // Mutually exclusive drawer / popovers (Piano Bed, Ornaments, Chords, Edit, Creativity)
  activeDrawer?: HudDrawerType;
  onToggleDrawer?: (drawer: 'piano' | 'ornaments' | 'chords' | 'edit' | 'creativity') => void;
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
  onOpenLyricSpreader?: () => void;

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
  // A-B Section Suite Slot & Mode
  abRibbonSlot?: React.ReactNode;
  isAbActive?: boolean;
  onToggleAbMode?: () => void;

  // Undo / Redo
  onUndo?: () => boolean;
  onRedo?: () => boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  pastCount?: number;
  futureCount?: number;
}

export { COMMON_PUNCTUATIONS, COMMON_ANNOTATIONS };

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
  onInsertPunctuationAfter,
  onInsertAnnotation,
  onAddGraceNote,
  onClearGraceNotes,
  hasGraceNotes,
  currentMeasureChord = '',
  onUpdateMeasureChord,
  currentMeasureSection = '',
  onUpdateMeasureSection,
  chordSuggestions = ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7'],
  onAutoHarmonize,
  accompanimentStyle,
  onChangeAccompanimentStyle,
  isPentatonicMode,
  onTogglePentatonicMode,
  onApplyChordProgressionPreset,
  onApplyMotifTool,
  songKey = 'C',
  songTimeSignature = '4/4',
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
  onOpenLyricSpreader,
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
  abRibbonSlot,
  isAbActive = false,
  onToggleAbMode,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  pastCount = 0,
  futureCount = 0,
}) => {
  const [internalDrawer, setInternalDrawer] = React.useState<HudDrawerType>('none');
  const [showShortcutsModal, setShowShortcutsModal] = React.useState<boolean>(false);
  const [addDelimiterActiveKey, setAddDelimiterActiveKey] = React.useState<string | null>(null);

  // Accompaniment Style State (MOD-4)
  const [internalAccompanimentStyle, setInternalAccompanimentStyle] = React.useState<AccompanimentStyle>(() => {
    return accompanimentStyle !== undefined ? accompanimentStyle : getStoredAccompanimentStyle('block');
  });

  const effectiveAccompanimentStyle = accompanimentStyle !== undefined ? accompanimentStyle : internalAccompanimentStyle;

  const handleSelectAccompanimentStyle = React.useCallback((style: AccompanimentStyle) => {
    setInternalAccompanimentStyle(style);
    setStoredAccompanimentStyle(style);
    audioEngine.setAccompanimentStyle(style);
    onChangeAccompanimentStyle?.(style);
    // Audition preview
    audioEngine.previewChord(currentMeasureChord || 'C');
  }, [currentMeasureChord, onChangeAccompanimentStyle]);

  // Tactile Quick-Pad State (MOD-6)
  const [showTactileQuickPad, setShowTactileQuickPad] = React.useState<boolean>(() => {
    return getStoredTactileQuickPad(false);
  });

  const handleToggleTactilePad = React.useCallback(() => {
    if (activeField !== 'pitch') {
      onToggleActiveField();
    }
    setShowTactileQuickPad(prev => {
      const nextVal = !prev;
      setStoredTactileQuickPad(nextVal);
      return nextVal;
    });
  }, [activeField, onToggleActiveField]);

  const handleCloseTactilePad = React.useCallback(() => {
    setShowTactileQuickPad(false);
    setStoredTactileQuickPad(false);
  }, []);

  React.useEffect(() => {
    const handleTactileEvent = (e: Event) => {
      const customEvent = e as CustomEvent<{ show: boolean }>;
      if (customEvent.detail && typeof customEvent.detail.show === 'boolean') {
        setShowTactileQuickPad(customEvent.detail.show);
      }
    };
    if (typeof window !== 'undefined') {
      window.addEventListener(TACTILE_QUICK_PAD_EVENT, handleTactileEvent);
      return () => {
        window.removeEventListener(TACTILE_QUICK_PAD_EVENT, handleTactileEvent);
      };
    }
  }, []);

  // Pentatonic Mode State (MOD-6)
  const [internalPentatonic, setInternalPentatonic] = React.useState<boolean>(() => {
    return isPentatonicMode !== undefined ? isPentatonicMode : getStoredPentatonicMode(false);
  });

  const effectivePentatonicMode = isPentatonicMode !== undefined ? isPentatonicMode : internalPentatonic;

  const handleTogglePentatonic = React.useCallback(() => {
    const nextVal = !effectivePentatonicMode;
    setInternalPentatonic(nextVal);
    setStoredPentatonicMode(nextVal);
    onTogglePentatonicMode?.();
  }, [effectivePentatonicMode, onTogglePentatonicMode]);

  // Determine current active drawer (controlled or internal)
  const currentDrawer: HudDrawerType =
    activeDrawer !== undefined
      ? activeDrawer
      : showPianoBed
      ? 'piano'
      : internalDrawer;

  const currentSelectionKey = `ornaments-${selectedMeasureNumber}-${selectedNoteNumber}`;
  const isAddDelimiterActive = currentDrawer === 'ornaments' && addDelimiterActiveKey === currentSelectionKey;

  const handleToggleDrawer = (target: 'piano' | 'ornaments' | 'chords' | 'edit' | 'creativity') => {
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

            {/* Delimiters & Punctuation (at the beginning of Ornaments bar) */}
            {onInsertPunctuation && (
              <div className="flex items-center gap-1 shrink-0">
                <span className="text-xs font-bold text-zinc-400 uppercase hidden xl:inline mr-0.5">Delim:</span>
                {/* Combinational "Add" Button: click first, then click delimiter to insert after cursor. Click twice to cancel. */}
                <button
                  id="floating-hud-add-delimiter-btn"
                  type="button"
                  onClick={() =>
                    setAddDelimiterActiveKey(prev =>
                      prev === currentSelectionKey ? null : currentSelectionKey
                    )
                  }
                  className={`px-2 h-7 sm:h-8 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-all shrink-0 ${
                    isAddDelimiterActive
                      ? 'bg-amber-500 text-zinc-950 font-black shadow-sm ring-2 ring-amber-400 dark:ring-amber-500'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                  }`}
                  title={
                    isAddDelimiterActive
                      ? 'Add Delimiter active: Click any delimiter to insert after cursor (Click again to cancel)'
                      : 'Insert Delimiter After Cursor (Click then select delimiter; click twice to cancel)'
                  }
                  aria-pressed={isAddDelimiterActive}
                >
                  <Plus className={`w-3.5 h-3.5 ${isAddDelimiterActive ? 'stroke-[3]' : 'stroke-2'}`} />
                  <span>Add</span>
                </button>

                <div className="h-4 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />

                {COMMON_PUNCTUATIONS.map(p => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => {
                      if (isAddDelimiterActive) {
                        if (onInsertPunctuationAfter) {
                          onInsertPunctuationAfter(p.value);
                        } else {
                          onInsertPunctuation(p.value, true);
                        }
                        setAddDelimiterActiveKey(null);
                      } else {
                        onInsertPunctuation(p.value, false);
                      }
                    }}
                    className={`w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 text-sm sm:text-base font-bold flex items-center justify-center cursor-pointer transition-all shrink-0 ${
                      isAddDelimiterActive ? 'ring-1 ring-amber-400/60' : ''
                    }`}
                    title={
                      isAddDelimiterActive
                        ? `Insert "${p.label}" after current note`
                        : p.title
                    }
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            )}

            {/* Articulations */}
            <div className="h-5 w-px bg-zinc-200 dark:bg-zinc-750 shrink-0 mx-0.5" />
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
                    title="Add Pre-Grace Note"
                  >
                    + Pre
                  </button>
                  <button
                    type="button"
                    onClick={() => onAddGraceNote('post', 6, 0)}
                    className="px-2.5 py-1 sm:py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-amber-500 hover:text-zinc-950 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs sm:text-sm font-bold cursor-pointer transition-all"
                    title="Add Post-Grace Note"
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
                  Replace
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
                  Prog Replace
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
                  Prog Insert
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

        {/* Creativity Studio Drawer (MOD-4 & MOD-6) */}
        {currentDrawer === 'creativity' && (
          <div
            id="floating-score-hud-creativity-bar"
            className="pointer-events-auto w-full bg-white/95 dark:bg-[#151921]/95 backdrop-blur-md rounded-xl sm:rounded-2xl border border-zinc-200/90 dark:border-zinc-800 shadow-2xl px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-2 sm:gap-3 text-sm overflow-x-auto whitespace-nowrap scrollbar-none animate-in fade-in slide-in-from-bottom-1 duration-150"
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
                  onClick={() => handleSelectAccompanimentStyle(st.id)}
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
                onClick={handleTogglePentatonic}
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
              onClick={handleCloseDrawer}
              className="min-h-[44px] min-w-[44px] hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 shrink-0 ml-auto cursor-pointer flex items-center justify-center"
              title="Close Creativity Studio (Esc)"
            >
              <X className="w-5 h-5" />
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
        {/* Tactile Quick-Pad (MOD-6: iPad-ergonomic thumb pad ≥44px touch targets) */}
        {showTactileQuickPad && (
          <div
            id="floating-score-hud-tactile-quickpad"
            className="w-full bg-zinc-900/95 text-white dark:bg-zinc-950/95 backdrop-blur-md rounded-2xl border border-amber-500/40 p-2 sm:p-2.5 shadow-2xl flex flex-col gap-1.5 animate-in fade-in slide-in-from-bottom-2 duration-150 select-none mb-1"
          >
            {/* Top Bar / Header of Quick-Pad */}
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-extrabold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <LayoutGrid className="w-4 h-4 text-amber-500" />
                  Tactile Quick-Pad
                </span>
                {effectivePentatonicMode && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/40">
                    Pentatonic Active
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleTogglePentatonic}
                  className={`min-h-[44px] px-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1 border ${
                    effectivePentatonicMode
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/60'
                      : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                  }`}
                  title="Toggle Pentatonic Mode"
                >
                  <Lightbulb className="w-3.5 h-3.5 text-amber-400" />
                  <span>5-Tone</span>
                </button>
                <button
                  type="button"
                  onClick={handleCloseTactilePad}
                  className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 cursor-pointer touch-manipulation"
                  title="Close Quick-Pad"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Row 1: Pitch Numbers 1-7, 0 (Rest), - (Dash), ␣ (Empty) - Touch Targets ≥44px */}
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {[
                { p: 1 as PitchNumber, name: '1 Do' },
                { p: 2 as PitchNumber, name: '2 Re' },
                { p: 3 as PitchNumber, name: '3 Mi' },
                { p: 4 as PitchNumber, name: '4 Fa' },
                { p: 5 as PitchNumber, name: '5 Sol' },
                { p: 6 as PitchNumber, name: '6 La' },
                { p: 7 as PitchNumber, name: '7 Ti' },
              ].map(item => {
                const isPentatonicTone = [1, 2, 3, 5, 6].includes(item.p as number);
                return (
                  <button
                    key={`quickpad-pitch-${item.p}`}
                    id={`quickpad-pitch-${item.p}-btn`}
                    type="button"
                    onClick={() => onSetPitch(item.p)}
                    className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl text-base sm:text-lg font-black transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                      effectivePentatonicMode
                        ? isPentatonicTone
                          ? 'bg-gradient-to-b from-amber-500/25 to-amber-600/35 border-amber-400 text-amber-300 hover:from-amber-500/40 hover:to-amber-600/50'
                          : 'bg-zinc-800/60 border-zinc-700/60 text-zinc-400 opacity-45 hover:opacity-100'
                        : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-100'
                    }`}
                  >
                    <span className="leading-none">{item.p}</span>
                    {effectivePentatonicMode && isPentatonicTone && (
                      <span className="text-[9px] font-medium leading-none text-amber-400 mt-0.5">
                        {item.name.split(' ')[1]}
                      </span>
                    )}
                  </button>
                );
              })}

              {/* 0 (Rest) */}
              <button
                id="quickpad-pitch-0-btn"
                type="button"
                onClick={() => onSetPitch(0)}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl text-base sm:text-lg font-black bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-100 transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center shadow-xs"
                title="Rest (0)"
              >
                <span className="leading-none">0</span>
                <span className="text-[9px] font-medium text-zinc-400 mt-0.5">Rest</span>
              </button>

              {/* - (Sustain Dash) */}
              <button
                id="quickpad-dash-btn"
                type="button"
                onClick={onSetDash}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl text-base sm:text-lg font-black bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-amber-400 transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center shadow-xs"
                title="Sustain Dash (-)"
              >
                <span className="leading-none">-</span>
                <span className="text-[9px] font-medium text-zinc-400 mt-0.5">Dash</span>
              </button>

              {/* ␣ (Empty Beat Spacer) */}
              <button
                id="quickpad-empty-btn"
                type="button"
                onClick={() => onSetPitch('empty')}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl text-sm font-bold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center shadow-xs"
                title="Empty Beat Spacer"
              >
                <span className="leading-none">␣</span>
                <span className="text-[9px] font-medium text-zinc-400 mt-0.5">Empty</span>
              </button>
            </div>

            {/* Row 2: Octaves, Duration Presets, and Multipliers - Touch Targets ≥44px */}
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {/* Octave Down (8vb •) */}
              <button
                id="quickpad-octave-down-btn"
                type="button"
                onClick={() => onSetOctave(-1)}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentOctave < 0
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Octave Down (• below) (Key _)"
              >
                <span className="leading-none font-black text-xs sm:text-sm">8vb •</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Down</span>
              </button>

              {/* Octave Readout / Reset */}
              <button
                id="quickpad-octave-reset-btn"
                type="button"
                onClick={() => onSetOctave(-currentOctave)}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-extrabold text-xs bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-amber-400 cursor-pointer touch-manipulation flex flex-col items-center justify-center transition-all active:scale-95 shadow-xs"
                title="Reset Octave to 0"
              >
                <span className="text-[9px] text-zinc-400 uppercase leading-none">Octave</span>
                <span className="text-xs sm:text-sm font-black leading-none mt-0.5">
                  {currentOctave > 0 ? `+${currentOctave}` : currentOctave}
                </span>
              </button>

              {/* Octave Up (8va •) */}
              <button
                id="quickpad-octave-up-btn"
                type="button"
                onClick={() => onSetOctave(1)}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold text-xs transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentOctave > 0
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Octave Up (• above) (Key +)"
              >
                <span className="leading-none font-black text-xs sm:text-sm">8va •</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Up</span>
              </button>

              {/* Duration: 16th Note (1/4 beat) */}
              <button
                id="quickpad-dur-1-4-btn"
                type="button"
                onClick={() => onSetDuration(0.25)}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentDuration === 0.25
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="16th note (1/4 beat - double beam)"
              >
                <span className="underline decoration-double font-black text-sm sm:text-base leading-none">1/4</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">0.25b</span>
              </button>

              {/* Duration: 8th Note (1/2 beat) */}
              <button
                id="quickpad-dur-1-2-btn"
                type="button"
                onClick={() => onSetDuration(0.5)}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentDuration === 0.5
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="8th note (1/2 beat - single beam) (Key /)"
              >
                <span className="underline decoration-2 font-black text-sm sm:text-base leading-none">1/2</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">0.5b</span>
              </button>

              {/* Duration: Quarter Note (1 beat) */}
              <button
                id="quickpad-dur-1-btn"
                type="button"
                onClick={() => onSetDuration(1)}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentDuration === 1
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Quarter note (1 beat)"
              >
                <span className="font-black text-base sm:text-lg leading-none">1</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">1b</span>
              </button>

              {/* Duration: Half Note (2 beats) */}
              <button
                id="quickpad-dur-2-btn"
                type="button"
                onClick={() => onSetDuration(2)}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentDuration === 2
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Half note (2 beats)"
              >
                <span className="font-black text-base sm:text-lg leading-none">2</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">2b</span>
              </button>

              {/* Duration: Whole Note (4 beats) */}
              <button
                id="quickpad-dur-4-btn"
                type="button"
                onClick={() => onSetDuration(4)}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentDuration === 4
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Whole note (4 beats)"
              >
                <span className="font-black text-base sm:text-lg leading-none">4</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">4b</span>
              </button>

              {/* Duration Halve (/2) */}
              <button
                id="quickpad-dur-halve-btn"
                type="button"
                onClick={() => {
                  const curr = currentDuration || 1;
                  const next = (curr <= 0.125 ? 0.125 : curr / 2) as NoteDuration;
                  onSetDuration(next);
                }}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center shadow-xs"
                title="Halve Duration (/2)"
              >
                <span className="leading-none font-bold">/ 2</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">{currentDuration || 1}b</span>
              </button>

              {/* Duration Double (x2) */}
              <button
                id="quickpad-dur-double-btn"
                type="button"
                onClick={() => {
                  const curr = currentDuration || 1;
                  const next = (curr >= 4 ? 4 : curr * 2) as NoteDuration;
                  onSetDuration(next);
                }}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold text-xs bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center shadow-xs"
                title="Double Duration (x2)"
              >
                <span className="leading-none font-bold">x 2</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">{currentDuration || 1}b</span>
              </button>
            </div>

            {/* Row 3: Modifiers, Articulations, Navigation & Operations - Touch Targets ≥44px */}
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {/* Toggle Dotted Note (•) */}
              <button
                id="quickpad-dur-dot-btn"
                type="button"
                onClick={onToggleDotted}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  isDotted
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Toggle Dotted Note (•: adds 50% duration) (Key .)"
              >
                <span className="leading-none text-xl font-black">•</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Dot</span>
              </button>

              {/* Toggle Slur (⌒) */}
              <button
                id="quickpad-slur-btn"
                type="button"
                onClick={onToggleSlur}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  isSlur
                    ? 'bg-purple-600 text-white font-black border-purple-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Toggle Slur arc across notes (Key S)"
              >
                <span className="leading-none text-base font-bold">⌒</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Slur</span>
              </button>

              {/* Toggle Tie */}
              <button
                id="quickpad-tie-btn"
                type="button"
                onClick={onToggleTie}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  isTie
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Toggle Tie sustain same pitch (Key T)"
              >
                <span className="leading-none text-xs sm:text-sm font-bold">Tie</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Sustain</span>
              </button>

              {/* Sharp Accidental (♯) */}
              <button
                id="quickpad-sharp-btn"
                type="button"
                onClick={() => onSetAccidental('#')}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentAccidental === '#'
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Sharp accidental (Key #)"
              >
                <span className="leading-none text-base sm:text-lg font-black">♯</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Sharp</span>
              </button>

              {/* Flat Accidental (♭) */}
              <button
                id="quickpad-flat-btn"
                type="button"
                onClick={() => onSetAccidental('b')}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs ${
                  currentAccidental === 'b'
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Flat accidental (Key b)"
              >
                <span className="leading-none text-base sm:text-lg font-black">♭</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Flat</span>
              </button>

              {/* Triplet Toggle (3) */}
              <button
                id="quickpad-triplet-btn"
                type="button"
                onClick={onToggleTriplet || (() => {})}
                disabled={!onToggleTriplet}
                className={`min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center border shadow-xs disabled:opacity-40 disabled:cursor-not-allowed ${
                  isTriplet
                    ? 'bg-amber-500 text-zinc-950 font-black border-amber-400 shadow-2xs'
                    : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 text-zinc-200'
                }`}
                title="Toggle Triplet duration"
              >
                <span className="leading-none text-sm sm:text-base font-black">3</span>
                <span className="text-[9px] text-zinc-400 font-medium leading-none mt-0.5">Triplet</span>
              </button>

              {/* Insert Note After */}
              <button
                id="quickpad-insert-note-btn"
                type="button"
                onClick={onInsertNoteAfter || (() => {})}
                disabled={!onInsertNoteAfter}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-emerald-400 transition-all active:scale-95 cursor-pointer touch-manipulation flex flex-col items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Insert new note after cursor"
              >
                <Plus className="w-5 h-5 leading-none" />
                <span className="text-[9px] text-emerald-400 font-medium leading-none mt-0.5">Note</span>
              </button>

              {/* Step Previous Note */}
              <button
                id="quickpad-prev-note-btn"
                type="button"
                onClick={onStepPrevNote}
                disabled={!onStepPrevNote}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold text-base bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Step to Previous Note (ArrowLeft)"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>

              {/* Step Next Note */}
              <button
                id="quickpad-next-note-btn"
                type="button"
                onClick={onStepNextNote}
                disabled={!onStepNextNote}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold text-base bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Step to Next Note (ArrowRight)"
              >
                <ArrowRight className="w-5 h-5" />
              </button>

              {/* Delete Note */}
              <button
                id="quickpad-delete-note-btn"
                type="button"
                onClick={onDeleteCurrentNote}
                disabled={!onDeleteCurrentNote}
                className="min-h-[44px] min-w-[44px] h-11 sm:h-12 rounded-xl font-bold text-rose-400 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/60 transition-all active:scale-95 cursor-pointer touch-manipulation flex items-center justify-center shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                title="Delete Current Note (Backspace / Delete)"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {/* A-B Section Suite Ribbon Slot */}
        {abRibbonSlot}

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
          {activeField === 'pitch' && !showTactileQuickPad && (
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
                title="Rest note (0) [Key 0]"
              >
                0
              </button>
              <button
                id="floating-hud-pitch-empty-btn"
                type="button"
                onClick={() => onSetPitch('empty')}
                className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg font-mono font-black text-sm sm:text-base flex items-center justify-center text-zinc-800 dark:text-zinc-100 hover:bg-amber-500 hover:text-zinc-950 transition-all active:scale-90 cursor-pointer"
                title="Empty / Zero-beat spacer (␣) [0 beats] (Key `)"
              >
                ␣
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
          {activeField === 'pitch' && !showTactileQuickPad && (
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
                title="Octave Down (• below) (Key _)"
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
          {activeField === 'pitch' && !showTactileQuickPad && (
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
          {activeField === 'pitch' && !showTactileQuickPad && (
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

            {/* Creativity Studio Popover Toggle (MOD-4 & MOD-6) */}
            <button
              id="floating-hud-creativity-btn"
              type="button"
              onClick={() => handleToggleDrawer('creativity')}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                currentDrawer === 'creativity'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title="Creativity Studio: Accompaniment Styles, Melodic Motif Tools & Pentatonic Scale Mode"
            >
              <Wand2 className={`w-4 h-4 ${currentDrawer === 'creativity' ? 'text-zinc-950' : 'text-amber-500'}`} />
              <span className="hidden md:inline">Creativity</span>
            </button>

            {/* Tactile Quick-Pad Toggle (MOD-6: iPad-ergonomic thumb pad) */}
            <button
              id="floating-hud-tactile-pad-toggle-btn"
              type="button"
              onClick={handleToggleTactilePad}
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                showTactileQuickPad
                  ? 'bg-indigo-600 text-white font-black shadow-2xs'
                  : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
              title={
                showTactileQuickPad
                  ? 'Close Tactile Quick-Pad and restore inline ribbon inputs'
                  : 'Toggle Tactile Quick-Pad (iPad-ergonomic touch-friendly note pad ≥44px)'
              }
            >
              <LayoutGrid className={`w-4 h-4 ${showTactileQuickPad ? 'text-white' : 'text-indigo-500'}`} />
              <span className="hidden sm:inline">Quick-Pad</span>
            </button>

            {/* A-B Section Mode Toggle */}
            {onToggleAbMode && (
              <button
                id="floating-hud-ab-mode-btn"
                type="button"
                onClick={onToggleAbMode}
                className={`flex items-center gap-1.5 px-2.5 sm:px-3 h-8 sm:h-9 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                  isAbActive
                    ? 'bg-amber-500 text-zinc-950 font-black shadow-2xs'
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title="Toggle A-B Section Suite (Loop Play, Copy, Paste, Delete, Duplicate)"
              >
                <Repeat className={`w-4 h-4 ${isAbActive ? 'text-zinc-950' : 'text-amber-500'}`} />
                <span className="hidden sm:inline">A-B</span>
              </button>
            )}
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
            {onOpenLyricSpreader && (
              <button
                id="floating-hud-paste-lyrics-btn"
                type="button"
                onClick={onOpenLyricSpreader}
                className="flex items-center gap-1 px-2 h-7 sm:h-8 rounded-lg text-xs font-bold text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all cursor-pointer"
                title="Paste Line / Spread Lyrics across consecutive notes (MOD-3/MOD-5)"
              >
                <AlignLeft className="w-3.5 h-3.5 text-amber-500" />
                <span className="hidden lg:inline">Spread Lyrics</span>
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
                    ? 'bg-amber-100 dark:bg-amber-500/20 border-amber-400 dark:border-amber-500/50 text-amber-900 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-500/30'
                    : sheetWrapMode === 'auto_fit'
                    ? 'bg-sky-100 dark:bg-sky-500/20 border-sky-400 dark:border-sky-500/50 text-sky-900 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-500/30'
                    : 'bg-zinc-100 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700'
                }`}
                title={`Layout mode: ${
                  sheetWrapMode === 'no_wrap'
                    ? 'No Wrap (Lines spread naturally without forced extension; wraps only at delimiters & breaks). Click to rotate to Auto Wrap.'
                    : sheetWrapMode === 'auto_wrap'
                    ? 'Auto Wrap (Dynamic collision-free spacing). Click to rotate to Auto Fix.'
                    : 'Auto Fix (Forced measures per line). Click to rotate to No Wrap.'
                }`}
              >
                {sheetWrapMode === 'no_wrap' && <AlignJustify className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />}
                {sheetWrapMode === 'auto_wrap' && <WrapText className="w-3.5 h-3.5 text-amber-800 dark:text-amber-400" />}
                {sheetWrapMode === 'auto_fit' && <Maximize2 className="w-3.5 h-3.5 text-sky-800 dark:text-sky-400" />}
                <span className="inline font-mono text-[11px]">
                  {sheetWrapMode === 'no_wrap' ? 'No Wrap' : sheetWrapMode === 'auto_wrap' ? 'Auto Wrap' : 'Auto Fix'}
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
                <span>Fill Rest</span>
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
              title="Keyboard Shortcuts Guide"
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
