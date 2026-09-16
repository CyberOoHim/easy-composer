'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import {
  Song,
  Measure,
  NumberedNotationNote,
  TimeSignature,
  KeySignature,
  PitchNumber,
  NoteDuration,
  BarlineType,
  LyricDisplayMode,
  GraceNote,
  ArticulationType,
  LyricSyllable,
  VerseDisplayOption,
  SheetWrapMode,
} from '@/types/song';
import {
  engraveMeasure,
  groupMeasuresIntoSystems,
  EngravedMeasure,
  EngravedNote,
} from '@/lib/jianpuEngraver';
import { FloatingScoreHud } from './FloatingScoreHud';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { AudioEngine, audioEngine as defaultAudioEngine } from '@/lib/audioEngine';
import { autoArrangeSongChords, getDiatonicCandidateChords } from '@/lib/chordArranger';
import {
  Printer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Edit2,
  Check,
  X,
  Play,
  Square,
  Plus,
  Trash2,
  Music,
  Sun,
  Moon,
  Keyboard,
  Sliders,
  Shuffle,
  AlertCircle,
  WrapText,
  AlignJustify,
} from 'lucide-react';
import {
  getStoredRealSheetTheme,
  setStoredRealSheetTheme,
  RealSheetTheme,
  NoteInputMode,
  getStoredNoteInputMode,
  setStoredNoteInputMode,
  getStoredShowRhythmWarnings,
  setStoredShowRhythmWarnings,
  getStoredSheetZoom,
  setStoredSheetZoom,
  getStoredHudDrawer,
  setStoredHudDrawer,
  HudDrawerType,
  getStoredSheetWrapMode,
  setStoredSheetWrapMode,
  getStoredPianoDeckMode,
  setStoredPianoDeckMode,
  SETTINGS_RESET_EVENT,
  SHEET_ZOOM_EVENT,
} from '@/lib/storage';
import {
  getMeasureRhythmReport,
  autoRearrangeSongMeasures,
  autoWrapSongMeasures,
  getSongVerseCount,
  getVerseDisplayOption,
  getNoteVerseSyllable,
  isPunctuationOrSpacer,
} from '@/lib/taigiUtils';

export interface RealSheetCanvasProps {
  song: Song;
  onUpdateSong: (updatedSong: Song, options?: { coalesce?: boolean; coalesceKey?: string }) => void;

  // Selected coordinate [measureIndex, noteIndex]
  selectedMeasureIndex?: number | null;
  selectedNoteIndex?: number | null;
  onSelectNote?: (measureIndex: number, noteIndex: number, preview?: boolean) => void;
  onSelectMeasure?: (measureIndex: number) => void;

  // Active playing note ID
  activePlaybackNoteId?: string | null;

  // Playback handlers
  isPlaying?: boolean;
  onTogglePlay?: () => void;

  // Direct editing operations
  onUpdateNote?: (
    measureIndex: number,
    noteIndex: number,
    partialNote: Partial<NumberedNotationNote>,
    options?: { coalesce?: boolean; coalesceKey?: string }
  ) => void;
  onInsertNoteAt?: (measureIndex: number, noteIndex: number) => void;
  onDeleteNoteAt?: (measureIndex: number, noteIndex: number) => void;
  onAddMeasure?: () => void;
  onDeleteMeasure?: (measureIndex: number) => void;
  onToggleLineBreak?: (measureIndex: number) => void;
  onUpdateBarlineType?: (measureIndex: number, barlineType: BarlineType) => void;
  onAutoFillRest?: (measureIndex: number) => void;

  // Enhanced note & measure edit callbacks
  onInsertNoteAfter?: () => void;
  onInsertNoteBefore?: () => void;
  onDeleteCurrentNote?: () => void;
  onDeleteNoteAfter?: () => void;
  onDeleteNoteBefore?: () => void;
  onDuplicateCurrentNote?: () => void;
  onAddMeasureAfter?: () => void;
  onAddMeasureBefore?: () => void;
  onDuplicateMeasure?: () => void;
  onAutoRearrangeMeasures?: () => void;
  onAutoWrapMeasures?: () => void;
  sheetWrapMode?: SheetWrapMode;
  onRotateWrapMode?: () => void;
  onPushNotesToNextMeasure?: () => void;
  onShiftNotesToPrevMeasure?: () => void;

  // Note Input Mode (replace, progressive_replace, progressive_insert)
  noteInputMode?: NoteInputMode;
  onChangeNoteInputMode?: (mode: NoteInputMode) => void;

  // Rhythm warning notice toggle
  showRhythmWarnings?: boolean;
  onToggleShowRhythmWarnings?: () => void;

  // Audio Engine & preview
  audioEngine?: AudioEngine;
  previewNoteAudio?: (key: KeySignature, note: NumberedNotationNote) => void;

  // Advanced Tools
  onAutoHarmonize?: () => void;
  onUpdateMeasureChord?: (measureIndex: number, chord: string) => void;

  // Display mode
  displayMode?: LyricDisplayMode;

  // Sheet Theme (Parchment Light vs Studio Dark)
  sheetTheme?: RealSheetTheme;
  onToggleSheetTheme?: () => void;

  // Undo / Redo
  onUndo?: () => boolean;
  onRedo?: () => boolean;
  canUndo?: boolean;
  canRedo?: boolean;
  pastCount?: number;
  futureCount?: number;
}

const ALL_KEYS: KeySignature[] = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F'
];

const TIME_SIGNATURES: TimeSignature[] = ['4/4', '3/4', '2/4', '6/8'];

/**
 * Helper to check whether a note has an actual word or syllable for the given verse.
 * Empty strings, spacers, and pure punctuation are excluded.
 */
function hasActualLyricWord(note: NumberedNotationNote, verseIndex: number): boolean {
  if (!note) return false;
  try {
    const syl = getNoteVerseSyllable(note, verseIndex);
    if (!syl) return false;
    const hanlo = String(syl.hanlo || syl.hanji || syl.custom || '').trim();
    const poj = String(syl.poj || syl.tl || '').trim();
    const hasHanloWord = Boolean(hanlo && !isPunctuationOrSpacer(hanlo));
    const hasPojWord = Boolean(poj && !isPunctuationOrSpacer(poj));
    return hasHanloWord || hasPojWord;
  } catch {
    return false;
  }
}

export const RealSheetCanvas: React.FC<RealSheetCanvasProps> = ({
  song,
  onUpdateSong,
  selectedMeasureIndex = 0,
  selectedNoteIndex = 0,
  onSelectNote,
  onSelectMeasure,
  activePlaybackNoteId = null,
  isPlaying = false,
  onTogglePlay,
  onUpdateNote,
  onInsertNoteAt,
  onDeleteNoteAt,
  onAddMeasure,
  onDeleteMeasure,
  onToggleLineBreak,
  onUpdateBarlineType,
  onAutoFillRest,
  onInsertNoteAfter: propOnInsertNoteAfter,
  onInsertNoteBefore: propOnInsertNoteBefore,
  onDeleteCurrentNote: propOnDeleteCurrentNote,
  onDeleteNoteAfter: propOnDeleteNoteAfter,
  onDeleteNoteBefore: propOnDeleteNoteBefore,
  onDuplicateCurrentNote: propOnDuplicateCurrentNote,
  onAddMeasureAfter: propOnAddMeasureAfter,
  onAddMeasureBefore: propOnAddMeasureBefore,
  onDuplicateMeasure: propOnDuplicateMeasure,
  onAutoRearrangeMeasures: propOnAutoRearrangeMeasures,
  onAutoWrapMeasures: propOnAutoWrapMeasures,
  sheetWrapMode: propSheetWrapMode,
  onRotateWrapMode: propOnRotateWrapMode,
  onPushNotesToNextMeasure: propOnPushNotesToNextMeasure,
  onShiftNotesToPrevMeasure: propOnShiftNotesToPrevMeasure,
  noteInputMode: propNoteInputMode,
  onChangeNoteInputMode: propOnChangeNoteInputMode,
  showRhythmWarnings: propShowRhythmWarnings,
  onToggleShowRhythmWarnings: propOnToggleShowRhythmWarnings,
  audioEngine,
  previewNoteAudio,
  onAutoHarmonize,
  onUpdateMeasureChord,
  displayMode = 'hanlo_major_roman',
  sheetTheme: propSheetTheme,
  onToggleSheetTheme: propOnToggleSheetTheme,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  pastCount = 0,
  futureCount = 0,
}) => {
  // Theme state: light (parchment) vs dark (studio stage)
  const [internalSheetTheme, setInternalSheetTheme] = useState<RealSheetTheme>(() => getStoredRealSheetTheme('dark'));
  const sheetTheme = propSheetTheme ?? internalSheetTheme;

  const handleToggleSheetTheme = useCallback(() => {
    if (propOnToggleSheetTheme) {
      propOnToggleSheetTheme();
    } else {
      setInternalSheetTheme(prev => {
        const next = prev === 'light' ? 'dark' : 'light';
        setStoredRealSheetTheme(next);
        return next;
      });
    }
  }, [propOnToggleSheetTheme]);

  // Note Input Mode (replace, progressive_replace, progressive_insert)
  const [internalNoteInputMode, setInternalNoteInputMode] = useState<NoteInputMode>(() =>
    getStoredNoteInputMode('progressive_replace')
  );
  const noteInputMode = propNoteInputMode ?? internalNoteInputMode;

  const handleChangeNoteInputMode = useCallback(
    (mode: NoteInputMode) => {
      if (propOnChangeNoteInputMode) {
        propOnChangeNoteInputMode(mode);
      } else {
        setInternalNoteInputMode(mode);
        setStoredNoteInputMode(mode);
      }
    },
    [propOnChangeNoteInputMode]
  );

  // Rhythm Mismatch Notice Toggle (print:hidden)
  const [internalShowRhythmWarnings, setInternalShowRhythmWarnings] = useState<boolean>(() =>
    getStoredShowRhythmWarnings(true)
  );
  const showRhythmWarnings = propShowRhythmWarnings ?? internalShowRhythmWarnings;

  const handleToggleShowRhythmWarnings = useCallback(() => {
    if (propOnToggleShowRhythmWarnings) {
      propOnToggleShowRhythmWarnings();
    } else {
      setInternalShowRhythmWarnings(prev => {
        const next = !prev;
        setStoredShowRhythmWarnings(next);
        return next;
      });
    }
  }, [propOnToggleShowRhythmWarnings]);

  // 3-Mode Sheet Layout: 'no_wrap' | 'auto_fit' | 'auto_wrap'
  // Default is 'no_wrap' (1. no fit in nor wrap)
  const [internalWrapMode, setInternalWrapMode] = useState<SheetWrapMode>(() => {
    if (typeof window !== 'undefined') {
      return getStoredSheetWrapMode('no_wrap');
    }
    return 'no_wrap';
  });
  const sheetWrapMode = propSheetWrapMode ?? internalWrapMode;

  const handleRotateWrapMode = useCallback(() => {
    if (propOnRotateWrapMode) {
      propOnRotateWrapMode();
      return;
    }
    setInternalWrapMode(prev => {
      let next: SheetWrapMode;
      if (prev === 'no_wrap') next = 'auto_fit';
      else if (prev === 'auto_fit') next = 'auto_wrap';
      else next = 'no_wrap';

      setStoredSheetWrapMode(next);
      return next;
    });
  }, [propOnRotateWrapMode]);

  // Zoom scaling (Persisted in browser local storage)
  const [zoomScale, setZoomScaleState] = useState<number>(() => {
    if (typeof window !== 'undefined') return getStoredSheetZoom(1.0);
    return 1.0;
  });

  const setZoomScale = useCallback((zoomOrUpdater: number | ((prev: number) => number)) => {
    setZoomScaleState(prev => {
      const next = typeof zoomOrUpdater === 'function' ? zoomOrUpdater(prev) : zoomOrUpdater;
      const clamped = Math.min(1.6, Math.max(0.7, Math.round(next * 10) / 10));
      setStoredSheetZoom(clamped);
      return clamped;
    });
  }, []);

  // Active editing target: 'pitch' vs 'lyric'
  const [activeField, setActiveField] = useState<'pitch' | 'lyric'>('pitch');
  const [activeVerseRowState, setActiveVerseRow] = useState<number>(1);
  const [activeLyricSubfield, setActiveLyricSubfield] = useState<'hanlo' | 'poj'>('hanlo');

  // Verse count & available verses (1 to 5)
  const verseCount = useMemo(() => getSongVerseCount(song), [song]);
  const hasMultipleVerses = verseCount > 1;
  const availableVerseRows = useMemo(() => {
    return Array.from({ length: verseCount }, (_, i) => i + 1);
  }, [verseCount]);

  // Ensure activeVerseRow is strictly within [1, verseCount] without cascading render effect
  const activeVerseRow = Math.min(Math.max(1, activeVerseRowState), verseCount);

  // Flattened notes for playback tracking
  const allSongNotes = useMemo(() => {
    const list: NumberedNotationNote[] = [];
    if (!song?.measures || !Array.isArray(song.measures)) return list;
    for (const m of song.measures) {
      if (m?.notes && Array.isArray(m.notes)) {
        for (const n of m.notes) {
          if (n && n.id) {
            list.push(n);
          }
        }
      }
    }
    return list;
  }, [song]);

  // Calculate active lyric note ID for each verse during playback:
  // When in lyric mode, the cue cursor only stays on notes with actual word/syllable,
  // not jumping through empty lyrics, and jumps to the next word/syllable on its beat.
  const activeLyricNoteIdByVerse = useMemo(() => {
    const map: Record<number, string | null> = {};
    if (!isPlaying || !activePlaybackNoteId || activeField !== 'lyric') {
      return map;
    }

    const currentPlayingIdx = allSongNotes.findIndex(n => n.id === activePlaybackNoteId);
    if (currentPlayingIdx === -1) {
      return map;
    }

    for (const vNum of availableVerseRows) {
      let targetNoteId: string | null = null;
      for (let i = currentPlayingIdx; i >= 0; i--) {
        if (hasActualLyricWord(allSongNotes[i], vNum)) {
          targetNoteId = allSongNotes[i].id;
          break;
        }
      }
      map[vNum] = targetNoteId;
    }

    return map;
  }, [isPlaying, activePlaybackNoteId, activeField, allSongNotes, availableVerseRows]);

  // In-place editable header modal / inline editors
  const [editingHeaderField, setEditingHeaderField] = useState<string | null>(null);
  const [headerDraftText, setHeaderDraftText] = useState<string>('');

  // Dropdown states for Key / Meter (mutually exclusive to avoid overlap)
  const [activeSheetPicker, setActiveSheetPicker] = useState<'key' | 'time' | 'bpm' | null>(null);
  const [draftBpm, setDraftBpm] = useState<number>(song.bpm || 88);

  // Close sheet paper pickers on Escape key
  useEffect(() => {
    if (!activeSheetPicker) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setActiveSheetPicker(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activeSheetPicker]);

  // Mutually exclusive Floating HUD Drawer (Piano Bed, Ornaments, Chords, Edit Suite)
  const [activeHudDrawer, setActiveHudDrawerState] = useState<HudDrawerType>(() => {
    if (typeof window !== 'undefined') return getStoredHudDrawer('none');
    return 'none';
  });

  const setActiveHudDrawer = useCallback((drawerOrUpdater: HudDrawerType | ((prev: HudDrawerType) => HudDrawerType)) => {
    setActiveHudDrawerState(prev => {
      const next = typeof drawerOrUpdater === 'function' ? drawerOrUpdater(prev) : drawerOrUpdater;
      setStoredHudDrawer(next);
      return next;
    });
  }, []);

  // Virtual Piano deck mode: 'step' (direct pitch) vs 'transcribe' (live on-the-fly transcribe)
  const [pianoDeckMode, setPianoDeckMode] = useState<'step' | 'transcribe'>(() => {
    if (typeof window !== 'undefined') return getStoredPianoDeckMode('step');
    return 'step';
  });

  const handlePianoDeckModeChange = useCallback((newMode: 'step' | 'transcribe') => {
    setPianoDeckMode(newMode);
    setStoredPianoDeckMode(newMode);
  }, [setPianoDeckMode]);

  // Listen for global settings reset and sheet zoom change events
  useEffect(() => {
    const handleReset = () => {
      setZoomScaleState(getStoredSheetZoom(1.0));
      setActiveHudDrawerState(getStoredHudDrawer('none'));
      setInternalSheetTheme(getStoredRealSheetTheme('dark'));
      setInternalNoteInputMode(getStoredNoteInputMode('progressive_replace'));
      setInternalShowRhythmWarnings(getStoredShowRhythmWarnings(true));
      setInternalWrapMode(getStoredSheetWrapMode('no_wrap'));
      setPianoDeckMode(getStoredPianoDeckMode('step'));
    };
    const handleZoomChange = (e: Event) => {
      const ce = e as CustomEvent<{ zoom: number }>;
      if (ce.detail && typeof ce.detail.zoom === 'number') {
        setZoomScaleState(ce.detail.zoom);
      }
    };
    window.addEventListener(SETTINGS_RESET_EVENT, handleReset);
    window.addEventListener(SHEET_ZOOM_EVENT, handleZoomChange);
    return () => {
      window.removeEventListener(SETTINGS_RESET_EVENT, handleReset);
      window.removeEventListener(SHEET_ZOOM_EVENT, handleZoomChange);
    };
  }, []);

  // References
  const canvasWrapperRef = useRef<HTMLDivElement>(null);
  const activeNoteElementRef = useRef<HTMLDivElement>(null);

  // Resolved safe coordinates
  const currentMIdx = Math.max(0, Math.min(song.measures.length - 1, selectedMeasureIndex ?? 0));
  const currentMeasure = song.measures[currentMIdx];
  const currentNIdx = Math.max(
    0,
    Math.min((currentMeasure?.notes.length ?? 1) - 1, selectedNoteIndex ?? 0)
  );
  const currentNote = currentMeasure?.notes[currentNIdx];

  // Engrave score into systems with horizontal continuous beams and 3 wrap modes
  const systems = useMemo(() => {
    return groupMeasuresIntoSystems(
      song.measures,
      song.timeSignature || '4/4',
      song.notesPerLine || 4,
      sheetWrapMode
    );
  }, [song.measures, song.timeSignature, song.notesPerLine, sheetWrapMode]);

  // Handle Note Selection
  const handleNoteClick = useCallback(
    (
      mIdx: number,
      nIdx: number,
      targetField: 'pitch' | 'lyric' = 'pitch',
      verseRow = 1,
      previewAudio = true,
      subField?: 'hanlo' | 'poj'
    ) => {
      onSelectNote?.(mIdx, nIdx, previewAudio);
      onSelectMeasure?.(mIdx);
      setActiveField(targetField);
      if (targetField === 'lyric') {
        setActiveVerseRow(verseRow);
        if (subField) {
          setActiveLyricSubfield(subField);
        } else {
          const opt = getVerseDisplayOption(song, verseRow);
          if (opt === 'poj' || opt === 'both_poj_top' || opt === 'both') {
            setActiveLyricSubfield('poj');
          } else {
            setActiveLyricSubfield('hanlo');
          }
        }
      }
    },
    [onSelectNote, onSelectMeasure, song]
  );

  // Scroll active note into view smoothly when navigating
  useEffect(() => {
    if (activeNoteElementRef.current) {
      activeNoteElementRef.current.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest',
      });
    }
  }, [currentMIdx, currentNIdx]);

  // Helper to update current selected note
  const updateCurrentNote = useCallback(
    (
      updater: (note: NumberedNotationNote) => NumberedNotationNote,
      shouldPreviewAudio = true,
      options?: { coalesce?: boolean; coalesceKey?: string }
    ) => {
      if (!currentMeasure || !currentNote) return;
      const updated = updater({ ...currentNote });

      if (onUpdateNote) {
        onUpdateNote(currentMIdx, currentNIdx, updated, options);
      } else {
        const newMeasures = song.measures.map((m, mI) => {
          if (mI !== currentMIdx) return m;
          const notes = m.notes.map((n, nI) => (nI === currentNIdx ? updated : n));
          return { ...m, notes };
        });
        onUpdateSong({ ...song, measures: newMeasures }, options);
      }

      if (shouldPreviewAudio && previewNoteAudio && updated.pitch !== 0 && updated.pitch !== 'empty') {
        previewNoteAudio(song.key, updated);
      }
    },
    [currentMeasure, currentNote, onUpdateNote, currentMIdx, currentNIdx, song, onUpdateSong, previewNoteAudio]
  );

  // Diatonic chord suggestions based on key signature
  const chordSuggestions = useMemo(() => {
    try {
      return getDiatonicCandidateChords(song.key).map(c => c.chord);
    } catch {
      return ['C', 'Dm', 'Em', 'F', 'G', 'Am', 'G7'];
    }
  }, [song.key]);

  // Smoothly scroll active playback note or lyric syllable into view during playback
  useEffect(() => {
    if (!isPlaying || !activePlaybackNoteId) return;
    const currentLyricNoteId = activeLyricNoteIdByVerse[activeVerseRow];
    const targetEl =
      activeField === 'lyric'
        ? (currentLyricNoteId && document.getElementById(`sheet-lyric-v${activeVerseRow}-${currentLyricNoteId}`)) ||
          document.getElementById(`sheet-note-${activePlaybackNoteId}`)
        : document.getElementById(`sheet-note-${activePlaybackNoteId}`);
    if (targetEl && typeof targetEl.scrollIntoView === 'function') {
      try {
        targetEl.scrollIntoView({
          behavior: 'smooth',
          block: 'nearest',
          inline: 'nearest',
        });
      } catch {
        // Gracefully ignore scroll exceptions in iframe / test environments
      }
    }
  }, [isPlaying, activePlaybackNoteId, activeField, activeVerseRow, activeLyricNoteIdByVerse]);

  // Step to Next Note
  const stepToNextNote = useCallback(() => {
    if (!currentMeasure) return;
    if (currentNIdx < currentMeasure.notes.length - 1) {
      handleNoteClick(currentMIdx, currentNIdx + 1, activeField, activeVerseRow);
    } else if (currentMIdx < song.measures.length - 1) {
      handleNoteClick(currentMIdx + 1, 0, activeField, activeVerseRow);
    }
  }, [currentMeasure, currentNIdx, currentMIdx, song.measures.length, handleNoteClick, activeField, activeVerseRow]);

  // Step to Prev Note
  const stepToPrevNote = useCallback(() => {
    if (currentNIdx > 0) {
      handleNoteClick(currentMIdx, currentNIdx - 1, activeField, activeVerseRow);
    } else if (currentMIdx > 0) {
      const prevM = song.measures[currentMIdx - 1];
      handleNoteClick(currentMIdx - 1, (prevM?.notes.length ?? 1) - 1, activeField, activeVerseRow);
    }
  }, [currentNIdx, currentMIdx, song.measures, handleNoteClick, activeField, activeVerseRow]);

  // Insert note after current note
  const handleInsertNoteAfter = useCallback(() => {
    if (propOnInsertNoteAfter) {
      propOnInsertNoteAfter();
      return;
    }
    if (onInsertNoteAt) {
      onInsertNoteAt(currentMIdx, currentNIdx);
      return;
    }
    const targetM = song.measures[currentMIdx];
    if (!targetM) return;
    const newNote: NumberedNotationNote = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pitch: 1,
      octave: 0,
      duration: 1,
      lyric: {},
    };
    const newNotes = [...targetM.notes];
    newNotes.splice(currentNIdx + 1, 0, newNote);
    const newMeasures = song.measures.map((m, idx) => (idx === currentMIdx ? { ...m, notes: newNotes } : m));
    onUpdateSong({ ...song, measures: newMeasures });
    handleNoteClick(currentMIdx, currentNIdx + 1, activeField, activeVerseRow);
  }, [propOnInsertNoteAfter, onInsertNoteAt, currentMIdx, currentNIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Insert note before current note
  const handleInsertNoteBefore = useCallback(() => {
    if (propOnInsertNoteBefore) {
      propOnInsertNoteBefore();
      return;
    }
    const targetM = song.measures[currentMIdx];
    if (!targetM) return;
    const newNote: NumberedNotationNote = {
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      pitch: 1,
      octave: 0,
      duration: 1,
      lyric: {},
    };
    const newNotes = [...targetM.notes];
    newNotes.splice(currentNIdx, 0, newNote);
    const newMeasures = song.measures.map((m, idx) => (idx === currentMIdx ? { ...m, notes: newNotes } : m));
    onUpdateSong({ ...song, measures: newMeasures });
    handleNoteClick(currentMIdx, currentNIdx, activeField, activeVerseRow);
  }, [propOnInsertNoteBefore, currentMIdx, currentNIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Delete current note
  const handleDeleteCurrentNote = useCallback(() => {
    if (propOnDeleteCurrentNote) {
      propOnDeleteCurrentNote();
      return;
    }
    if (onDeleteNoteAt) {
      onDeleteNoteAt(currentMIdx, currentNIdx);
      return;
    }
    const targetM = song.measures[currentMIdx];
    if (!targetM || targetM.notes.length <= 1) return;
    const newNotes = targetM.notes.filter((_, idx) => idx !== currentNIdx);
    const newMeasures = song.measures.map((m, idx) => (idx === currentMIdx ? { ...m, notes: newNotes } : m));
    onUpdateSong({ ...song, measures: newMeasures });
    handleNoteClick(currentMIdx, Math.max(0, currentNIdx - 1), activeField, activeVerseRow);
  }, [propOnDeleteCurrentNote, onDeleteNoteAt, currentMIdx, currentNIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Delete note after current note
  const handleDeleteNoteAfter = useCallback(() => {
    if (propOnDeleteNoteAfter) {
      propOnDeleteNoteAfter();
      return;
    }
    const targetM = song.measures[currentMIdx];
    if (!targetM || currentNIdx >= targetM.notes.length - 1) return;
    const newNotes = targetM.notes.filter((_, idx) => idx !== currentNIdx + 1);
    const newMeasures = song.measures.map((m, idx) => (idx === currentMIdx ? { ...m, notes: newNotes } : m));
    onUpdateSong({ ...song, measures: newMeasures });
  }, [propOnDeleteNoteAfter, currentMIdx, currentNIdx, song, onUpdateSong]);

  // Delete note before current note
  const handleDeleteNoteBefore = useCallback(() => {
    if (propOnDeleteNoteBefore) {
      propOnDeleteNoteBefore();
      return;
    }
    const targetM = song.measures[currentMIdx];
    if (!targetM || currentNIdx <= 0) return;
    const newNotes = targetM.notes.filter((_, idx) => idx !== currentNIdx - 1);
    const newMeasures = song.measures.map((m, idx) => (idx === currentMIdx ? { ...m, notes: newNotes } : m));
    onUpdateSong({ ...song, measures: newMeasures });
    handleNoteClick(currentMIdx, currentNIdx - 1, activeField, activeVerseRow);
  }, [propOnDeleteNoteBefore, currentMIdx, currentNIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Duplicate current note
  const handleDuplicateCurrentNote = useCallback(() => {
    if (propOnDuplicateCurrentNote) {
      propOnDuplicateCurrentNote();
      return;
    }
    const targetM = song.measures[currentMIdx];
    if (!targetM || !currentNote) return;
    const clonedNote: NumberedNotationNote = {
      ...currentNote,
      id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      lyric: { ...currentNote.lyric },
    };
    const newNotes = [...targetM.notes];
    newNotes.splice(currentNIdx + 1, 0, clonedNote);
    const newMeasures = song.measures.map((m, idx) => (idx === currentMIdx ? { ...m, notes: newNotes } : m));
    onUpdateSong({ ...song, measures: newMeasures });
    handleNoteClick(currentMIdx, currentNIdx + 1, activeField, activeVerseRow);
  }, [propOnDuplicateCurrentNote, currentMIdx, currentNIdx, currentNote, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Add measure after current measure
  const handleAddMeasureAfter = useCallback(() => {
    if (propOnAddMeasureAfter) {
      propOnAddMeasureAfter();
      return;
    }
    const newMeasure: Measure = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      measureNumber: currentMIdx + 2,
      chord: 'C',
      notes: [
        { id: `n-${Date.now()}-1`, pitch: 1, octave: 0, duration: 1, lyric: {} },
        { id: `n-${Date.now()}-2`, pitch: 2, octave: 0, duration: 1, lyric: {} },
        { id: `n-${Date.now()}-3`, pitch: 3, octave: 0, duration: 1, lyric: {} },
        { id: `n-${Date.now()}-4`, pitch: 5, octave: 0, duration: 1, lyric: {} },
      ],
    };
    const newMeasures = [...song.measures];
    newMeasures.splice(currentMIdx + 1, 0, newMeasure);
    const renumbered = newMeasures.map((m, idx) => ({ ...m, measureNumber: idx + 1 }));
    onUpdateSong({ ...song, measures: renumbered });
    handleNoteClick(currentMIdx + 1, 0, activeField, activeVerseRow);
  }, [propOnAddMeasureAfter, currentMIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Add measure before current measure
  const handleAddMeasureBefore = useCallback(() => {
    if (propOnAddMeasureBefore) {
      propOnAddMeasureBefore();
      return;
    }
    const newMeasure: Measure = {
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      measureNumber: currentMIdx + 1,
      chord: 'C',
      notes: [
        { id: `n-${Date.now()}-1`, pitch: 1, octave: 0, duration: 1, lyric: {} },
        { id: `n-${Date.now()}-2`, pitch: 2, octave: 0, duration: 1, lyric: {} },
        { id: `n-${Date.now()}-3`, pitch: 3, octave: 0, duration: 1, lyric: {} },
        { id: `n-${Date.now()}-4`, pitch: 5, octave: 0, duration: 1, lyric: {} },
      ],
    };
    const newMeasures = [...song.measures];
    newMeasures.splice(currentMIdx, 0, newMeasure);
    const renumbered = newMeasures.map((m, idx) => ({ ...m, measureNumber: idx + 1 }));
    onUpdateSong({ ...song, measures: renumbered });
    handleNoteClick(currentMIdx, 0, activeField, activeVerseRow);
  }, [propOnAddMeasureBefore, currentMIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Duplicate current measure
  const handleDuplicateMeasure = useCallback(() => {
    if (propOnDuplicateMeasure) {
      propOnDuplicateMeasure();
      return;
    }
    const targetM = song.measures[currentMIdx];
    if (!targetM) return;
    const duplicatedM: Measure = {
      ...targetM,
      id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      measureNumber: currentMIdx + 2,
      notes: targetM.notes.map(n => ({
        ...n,
        id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        lyric: { ...n.lyric },
      })),
    };
    const newMeasures = [...song.measures];
    newMeasures.splice(currentMIdx + 1, 0, duplicatedM);
    const renumbered = newMeasures.map((m, idx) => ({ ...m, measureNumber: idx + 1 }));
    onUpdateSong({ ...song, measures: renumbered });
    handleNoteClick(currentMIdx + 1, 0, activeField, activeVerseRow);
  }, [propOnDuplicateMeasure, currentMIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Auto rearrange song measures
  const handleAutoRearrangeMeasures = useCallback(() => {
    if (propOnAutoRearrangeMeasures) {
      propOnAutoRearrangeMeasures();
      return;
    }
    const rearranged = autoRearrangeSongMeasures(song);
    onUpdateSong(rearranged);
  }, [propOnAutoRearrangeMeasures, song, onUpdateSong]);

  // Auto wrap song measures to ensure all measures fit within the realistic sheet
  const handleAutoWrapMeasures = useCallback(() => {
    if (propOnAutoWrapMeasures) {
      propOnAutoWrapMeasures();
      return;
    }
    const wrapped = autoWrapSongMeasures(song);
    onUpdateSong(wrapped);
  }, [propOnAutoWrapMeasures, song, onUpdateSong]);

  // Push notes from current note to end into next measure
  const handlePushNotesToNextMeasure = useCallback(() => {
    if (propOnPushNotesToNextMeasure) {
      propOnPushNotesToNextMeasure();
      return;
    }
    const currentM = song.measures[currentMIdx];
    if (!currentM || currentM.notes.length === 0) return;
    const validNIdx = Math.max(0, Math.min(currentNIdx, currentM.notes.length - 1));
    const notesToPush = currentM.notes.slice(validNIdx);
    const remainingNotes = currentM.notes.slice(0, validNIdx);
    if (notesToPush.length === 0) return;

    let newMeasures = [...song.measures];
    if (currentMIdx < song.measures.length - 1) {
      const nextM = song.measures[currentMIdx + 1];
      const newNextNotes = [...notesToPush, ...nextM.notes];
      if (remainingNotes.length === 0) {
        newMeasures.splice(currentMIdx, 1);
        newMeasures[currentMIdx] = { ...nextM, notes: newNextNotes };
        newMeasures = newMeasures.map((m, idx) => ({ ...m, measureNumber: idx + 1 }));
        onUpdateSong({ ...song, measures: newMeasures });
        handleNoteClick(currentMIdx, 0, activeField, activeVerseRow);
      } else {
        newMeasures[currentMIdx] = { ...currentM, notes: remainingNotes };
        newMeasures[currentMIdx + 1] = { ...nextM, notes: newNextNotes };
        onUpdateSong({ ...song, measures: newMeasures });
        handleNoteClick(currentMIdx + 1, 0, activeField, activeVerseRow);
      }
    } else {
      const newMeasure: Measure = {
        id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        measureNumber: song.measures.length + 1,
        chord: currentM.chord,
        notes: notesToPush,
      };
      if (remainingNotes.length === 0) {
        const restNote: NumberedNotationNote = {
          id: `n-${Date.now()}-rest`,
          pitch: 0,
          octave: 0,
          duration: 1,
          lyric: {},
        };
        newMeasures[currentMIdx] = { ...currentM, notes: [restNote] };
      } else {
        newMeasures[currentMIdx] = { ...currentM, notes: remainingNotes };
      }
      newMeasures.push(newMeasure);
      newMeasures = newMeasures.map((m, idx) => ({ ...m, measureNumber: idx + 1 }));
      onUpdateSong({ ...song, measures: newMeasures });
      handleNoteClick(currentMIdx + 1, 0, activeField, activeVerseRow);
    }
  }, [propOnPushNotesToNextMeasure, currentMIdx, currentNIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Shift notes up to current note into preceding measure
  const handleShiftNotesToPrevMeasure = useCallback(() => {
    if (propOnShiftNotesToPrevMeasure) {
      propOnShiftNotesToPrevMeasure();
      return;
    }
    if (currentMIdx <= 0) return;
    const currentM = song.measures[currentMIdx];
    const prevM = song.measures[currentMIdx - 1];
    if (!currentM || !prevM || currentM.notes.length === 0) return;
    const validNIdx = Math.max(0, Math.min(currentNIdx, currentM.notes.length - 1));
    const notesToShift = currentM.notes.slice(0, validNIdx + 1);
    const remainingNotes = currentM.notes.slice(validNIdx + 1);
    if (notesToShift.length === 0) return;

    const newPrevNotes = [...prevM.notes, ...notesToShift];
    const targetNoteIdx = prevM.notes.length + validNIdx;
    let newMeasures = [...song.measures];

    if (remainingNotes.length === 0) {
      newMeasures.splice(currentMIdx, 1);
      newMeasures[currentMIdx - 1] = { ...prevM, notes: newPrevNotes };
      newMeasures = newMeasures.map((m, idx) => ({ ...m, measureNumber: idx + 1 }));
      onUpdateSong({ ...song, measures: newMeasures });
      handleNoteClick(currentMIdx - 1, targetNoteIdx, activeField, activeVerseRow);
    } else {
      newMeasures[currentMIdx - 1] = { ...prevM, notes: newPrevNotes };
      newMeasures[currentMIdx] = { ...currentM, notes: remainingNotes };
      onUpdateSong({ ...song, measures: newMeasures });
      handleNoteClick(currentMIdx - 1, targetNoteIdx, activeField, activeVerseRow);
    }
  }, [propOnShiftNotesToPrevMeasure, currentMIdx, currentNIdx, song, onUpdateSong, handleNoteClick, activeField, activeVerseRow]);

  // Pitch setter with NoteInputMode support
  const handleSetPitch = useCallback(
    (p: PitchNumber) => {
      if (noteInputMode === 'replace') {
        updateCurrentNote(note => ({
          ...note,
          pitch: p,
        }));
      } else if (noteInputMode === 'progressive_replace') {
        updateCurrentNote(note => ({
          ...note,
          pitch: p,
        }));
        stepToNextNote();
      } else if (noteInputMode === 'progressive_insert') {
        const targetM = song.measures[currentMIdx];
        if (!targetM) return;
        const newNote: NumberedNotationNote = {
          id: `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          pitch: p,
          octave: currentNote?.octave || 0,
          duration: currentNote?.duration || 1,
          lyric: {},
        };
        const newNotes = [...targetM.notes];
        newNotes.splice(currentNIdx + 1, 0, newNote);
        const newMeasures = song.measures.map((m, idx) => (idx === currentMIdx ? { ...m, notes: newNotes } : m));
        onUpdateSong({ ...song, measures: newMeasures });
        handleNoteClick(currentMIdx, currentNIdx + 1, activeField, activeVerseRow);
        if (previewNoteAudio && p !== 0 && p !== 'empty') {
          previewNoteAudio(song.key, newNote);
        }
      }
    },
    [
      noteInputMode,
      updateCurrentNote,
      stepToNextNote,
      song,
      currentMIdx,
      currentNIdx,
      currentNote,
      onUpdateSong,
      handleNoteClick,
      activeField,
      activeVerseRow,
      previewNoteAudio,
    ]
  );

  // Sustain dash '-'
  const handleSetDash = useCallback(() => {
    updateCurrentNote(note => {
      // Extend duration by 1 beat
      const nextDur = (note.duration >= 4 ? 4 : (note.duration + 1)) as NoteDuration;
      return {
        ...note,
        duration: nextDur,
      };
    });
  }, [updateCurrentNote]);

  // Octave setter
  const handleSetOctave = useCallback(
    (delta: number) => {
      updateCurrentNote(note => ({
        ...note,
        octave: Math.max(-2, Math.min(2, note.octave + delta)),
      }));
    },
    [updateCurrentNote]
  );

  // Duration setter
  const handleSetDuration = useCallback(
    (dur: NoteDuration) => {
      updateCurrentNote(note => ({
        ...note,
        duration: dur,
        isDotted: dur === 1.5 || dur === 0.75 || dur === 3 || dur === 0.375,
      }));
    },
    [updateCurrentNote]
  );

  // Toggle dotted
  const handleToggleDotted = useCallback(() => {
    updateCurrentNote(note => {
      const isDotted = !note.isDotted;
      let newDur = note.duration;
      if (isDotted) {
        if (note.duration === 1) newDur = 1.5;
        else if (note.duration === 0.5) newDur = 0.75;
        else if (note.duration === 2) newDur = 3;
        else if (note.duration === 0.25) newDur = 0.375;
      } else {
        if (note.duration === 1.5) newDur = 1;
        else if (note.duration === 0.75) newDur = 0.5;
        else if (note.duration === 3) newDur = 2;
        else if (note.duration === 0.375) newDur = 0.25;
      }
      return {
        ...note,
        duration: newDur,
        isDotted,
      };
    });
  }, [updateCurrentNote]);

  // Toggle Slur
  const handleToggleSlur = useCallback(() => {
    updateCurrentNote(note => ({
      ...note,
      slurToNext: !note.slurToNext,
    }));
  }, [updateCurrentNote]);

  // Toggle Tie
  const handleToggleTie = useCallback(() => {
    updateCurrentNote(note => ({
      ...note,
      tieToNext: !note.tieToNext,
      isTied: !note.tieToNext,
    }));
  }, [updateCurrentNote]);

  // Accidental
  const handleSetAccidental = useCallback(
    (acc: '' | '#' | 'b') => {
      updateCurrentNote(note => ({
        ...note,
        accidental: note.accidental === acc ? '' : acc,
      }));
    },
    [updateCurrentNote]
  );

  // Toggle Triplet
  const handleToggleTriplet = useCallback(() => {
    updateCurrentNote(note => ({
      ...note,
      isTriplet: !note.isTriplet,
    }));
  }, [updateCurrentNote]);

  // Articulations
  const handleSetArticulation = useCallback(
    (art: ArticulationType) => {
      updateCurrentNote(note => ({
        ...note,
        articulation: note.articulation === art ? undefined : art,
      }));
    },
    [updateCurrentNote]
  );

  // Quick Punctuation
  const handleInsertPunctuation = useCallback(
    (punct: string) => {
      updateCurrentNote(note => ({
        ...note,
        lyric: {
          ...note.lyric,
          hanlo: (note.lyric.hanlo || '') + punct,
          hanji: (note.lyric.hanji || '') + punct,
          custom: (note.lyric.custom || '') + punct,
        },
      }));
    },
    [updateCurrentNote]
  );

  // Annotation
  const handleInsertAnnotation = useCallback(
    (annot: string) => {
      updateCurrentNote(note => ({
        ...note,
        annotation: note.annotation === annot ? undefined : annot,
      }));
    },
    [updateCurrentNote]
  );

  // Grace Notes
  const handleAddGraceNote = useCallback(
    (type: 'pre' | 'post', pitch: 1 | 2 | 3 | 4 | 5 | 6 | 7, octave: number) => {
      updateCurrentNote(note => {
        const newGrace: GraceNote = { pitch, octave };
        if (type === 'pre') {
          const existing = note.preGraceNotes || [];
          if (existing.length >= 3) return note;
          return { ...note, preGraceNotes: [...existing, newGrace] };
        } else {
          const existing = note.postGraceNotes || [];
          if (existing.length >= 3) return note;
          return { ...note, postGraceNotes: [...existing, newGrace] };
        }
      });
    },
    [updateCurrentNote]
  );

  const handleClearGraceNotes = useCallback(() => {
    updateCurrentNote(note => ({
      ...note,
      preGraceNotes: undefined,
      postGraceNotes: undefined,
    }));
  }, [updateCurrentNote]);

  // Chords and Harmony
  const handleUpdateMeasureChord = useCallback(
    (chord: string) => {
      if (onUpdateMeasureChord) {
        onUpdateMeasureChord(currentMIdx, chord);
      } else {
        const newMeasures = song.measures.map((m, idx) => {
          if (idx !== currentMIdx) return m;
          return { ...m, chord };
        });
        onUpdateSong({ ...song, measures: newMeasures });
      }
    },
    [onUpdateMeasureChord, currentMIdx, song, onUpdateSong]
  );

  const handleAutoHarmonize = useCallback(() => {
    if (onAutoHarmonize) {
      onAutoHarmonize();
    } else {
      const arranged = autoArrangeSongChords(song);
      onUpdateSong(arranged);
    }
  }, [onAutoHarmonize, song, onUpdateSong]);

  // Measure operations
  const handleAddMeasureClick = useCallback(() => {
    if (onAddMeasure) {
      onAddMeasure();
    } else {
      const newM: Measure = {
        id: `m-${Date.now()}`,
        measureNumber: song.measures.length + 1,
        chord: 'C',
        notes: [
          { id: `n-${Date.now()}-1`, pitch: 1, octave: 0, duration: 1, lyric: {} },
          { id: `n-${Date.now()}-2`, pitch: 2, octave: 0, duration: 1, lyric: {} },
          { id: `n-${Date.now()}-3`, pitch: 3, octave: 0, duration: 1, lyric: {} },
          { id: `n-${Date.now()}-4`, pitch: 5, octave: 0, duration: 1, lyric: {} },
        ],
      };
      onUpdateSong({ ...song, measures: [...song.measures, newM] });
    }
  }, [onAddMeasure, song, onUpdateSong]);

  // Virtual Piano key pitch selection (updates selected note with optional progression)
  const handleSelectPitchFromPiano = useCallback(
    (pitch: PitchNumber, octave: number, accidental: '' | '#' | 'b', shouldAdvance: boolean = false) => {
      updateCurrentNote(
        note => ({
          ...note,
          pitch,
          octave,
          accidental,
        }),
        false // PianoKeyboard plays live sound directly; avoid duplicate sound
      );

      if (shouldAdvance) {
        if (currentMeasure && currentNIdx < currentMeasure.notes.length - 1) {
          handleNoteClick(currentMIdx, currentNIdx + 1, activeField, activeVerseRow, false);
        } else if (currentMIdx < song.measures.length - 1) {
          handleNoteClick(currentMIdx + 1, 0, activeField, activeVerseRow, false);
        } else {
          handleAddMeasureClick();
        }
      }
    },
    [updateCurrentNote, currentMeasure, currentNIdx, currentMIdx, song.measures.length, handleNoteClick, activeField, activeVerseRow, handleAddMeasureClick]
  );

  // Live on-the-fly transcribe handler from PianoKeyboard
  const handleTranscribeFromPiano = useCallback(
    (
      pitch: PitchNumber,
      octave: number,
      accidental: '' | '#' | 'b',
      duration: NoteDuration,
      isDotted: boolean = false,
      isTriplet: boolean = false,
      shouldAdvance: boolean = false
    ) => {
      updateCurrentNote(
        note => ({
          ...note,
          pitch,
          octave,
          accidental,
          duration,
          isDotted,
          isTriplet,
        }),
        false
      );

      if (shouldAdvance) {
        if (currentMeasure && currentNIdx < currentMeasure.notes.length - 1) {
          handleNoteClick(currentMIdx, currentNIdx + 1, activeField, activeVerseRow, false);
        } else if (currentMIdx < song.measures.length - 1) {
          handleNoteClick(currentMIdx + 1, 0, activeField, activeVerseRow, false);
        } else {
          handleAddMeasureClick();
        }
      }
    },
    [updateCurrentNote, currentMeasure, currentNIdx, currentMIdx, song.measures.length, handleNoteClick, activeField, activeVerseRow, handleAddMeasureClick]
  );

  const handleDeleteMeasureClick = useCallback(() => {
    if (song.measures.length <= 1) return;
    if (onDeleteMeasure) {
      onDeleteMeasure(currentMIdx);
    } else {
      const newMeasures = song.measures
        .filter((_, idx) => idx !== currentMIdx)
        .map((m, idx) => ({ ...m, measureNumber: idx + 1 }));
      onUpdateSong({ ...song, measures: newMeasures });
    }
  }, [song, currentMIdx, onDeleteMeasure, onUpdateSong]);

  const handleToggleLineBreakClick = useCallback(() => {
    if (onToggleLineBreak) {
      onToggleLineBreak(currentMIdx);
    } else {
      const newMeasures = song.measures.map((m, idx) => {
        if (idx !== currentMIdx) return m;
        return { ...m, isLineBreak: !m.isLineBreak };
      });
      onUpdateSong({ ...song, measures: newMeasures });
    }
  }, [onToggleLineBreak, currentMIdx, song, onUpdateSong]);

  const handleTogglePreludeClick = useCallback(() => {
    const targetM = song.measures[currentMIdx];
    if (!targetM) return;
    const newMeasures = song.measures.map((m, idx) => {
      if (idx !== currentMIdx) return m;
      return { ...m, isPrelude: !m.isPrelude };
    });
    onUpdateSong({ ...song, measures: newMeasures });
  }, [song, currentMIdx, onUpdateSong]);

  const handleToggleVoltaEndingClick = useCallback(() => {
    const targetM = song.measures[currentMIdx];
    if (!targetM) return;
    const nextEnding = !targetM.voltaEnding ? [1, 2] : targetM.voltaEnding.includes(1) ? [3] : undefined;
    const newMeasures = song.measures.map((m, idx) => {
      if (idx !== currentMIdx) return m;
      return { ...m, voltaEnding: nextEnding };
    });
    onUpdateSong({ ...song, measures: newMeasures });
  }, [song, currentMIdx, onUpdateSong]);

  // Keyboard navigation & direct typewriter input
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in standard input or textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        editingHeaderField !== null
      ) {
        return;
      }

      // Undo / Redo keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !e.shiftKey) {
        e.preventDefault();
        onUndo?.();
        return;
      }
      if (
        ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z'))
      ) {
        e.preventDefault();
        onRedo?.();
        return;
      }

      // Space: Toggle play score
      if (e.code === 'Space') {
        e.preventDefault();
        onTogglePlay?.();
        return;
      }

      // Arrow navigation
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepToNextNote();
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepToPrevNote();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (activeField === 'pitch') {
          setActiveField('lyric');
          setActiveVerseRow(1);
          const opt = getVerseDisplayOption(song, 1);
          const isPojTop = opt === 'both' || opt === 'both_poj_top';
          setActiveLyricSubfield(opt === 'poj' || isPojTop ? 'poj' : 'hanlo');
        } else if (activeField === 'lyric') {
          const opt = getVerseDisplayOption(song, activeVerseRow);
          const isPojTop = opt === 'both' || opt === 'both_poj_top';
          const isHanloTop = opt === 'both_hanlo_top';

          if (isPojTop && activeLyricSubfield === 'poj') {
            setActiveLyricSubfield('hanlo');
          } else if (isHanloTop && activeLyricSubfield === 'hanlo') {
            setActiveLyricSubfield('poj');
          } else if (activeVerseRow < verseCount) {
            const nextRow = activeVerseRow + 1;
            setActiveVerseRow(nextRow);
            const nextOpt = getVerseDisplayOption(song, nextRow);
            const nextIsPojTop = nextOpt === 'both' || nextOpt === 'both_poj_top';
            setActiveLyricSubfield(nextOpt === 'poj' || nextIsPojTop ? 'poj' : 'hanlo');
          }
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (activeField === 'lyric') {
          const opt = getVerseDisplayOption(song, activeVerseRow);
          const isPojTop = opt === 'both' || opt === 'both_poj_top';
          const isHanloTop = opt === 'both_hanlo_top';

          if (isPojTop && activeLyricSubfield === 'hanlo') {
            setActiveLyricSubfield('poj');
          } else if (isHanloTop && activeLyricSubfield === 'poj') {
            setActiveLyricSubfield('hanlo');
          } else if (activeVerseRow > 1) {
            const prevRow = activeVerseRow - 1;
            setActiveVerseRow(prevRow);
            const prevOpt = getVerseDisplayOption(song, prevRow);
            const prevIsPojTop = prevOpt === 'both' || prevOpt === 'both_poj_top';
            const prevIsHanloTop = prevOpt === 'both_hanlo_top';
            setActiveLyricSubfield(
              prevIsPojTop ? 'hanlo' : prevIsHanloTop ? 'poj' : prevOpt === 'poj' ? 'poj' : 'hanlo'
            );
          } else {
            setActiveField('pitch');
          }
        }
        return;
      }

      // Pitch mode typing
      if (activeField === 'pitch') {
        if (e.key >= '1' && e.key <= '7') {
          e.preventDefault();
          handleSetPitch(parseInt(e.key, 10) as PitchNumber);
          return;
        }
        if (e.key === '0') {
          e.preventDefault();
          handleSetPitch(0);
          return;
        }
        if (e.key === '-') {
          e.preventDefault();
          handleSetDash();
          return;
        }
        if (e.key === '.') {
          e.preventDefault();
          handleToggleDotted();
          return;
        }
        if (e.key === '/') {
          e.preventDefault();
          // Halve duration
          updateCurrentNote(note => {
            let nextDur: NoteDuration = 0.5;
            if (note.duration >= 4) nextDur = 2;
            else if (note.duration >= 2) nextDur = 1;
            else if (note.duration >= 1) nextDur = 0.5;
            else if (note.duration >= 0.5) nextDur = 0.25;
            else nextDur = 0.125;
            return { ...note, duration: nextDur };
          });
          return;
        }
        if (e.key === '*') {
          e.preventDefault();
          // Double duration
          updateCurrentNote(note => {
            let nextDur: NoteDuration = 1;
            if (note.duration <= 0.125) nextDur = 0.25;
            else if (note.duration <= 0.25) nextDur = 0.5;
            else if (note.duration <= 0.5) nextDur = 1;
            else if (note.duration <= 1) nextDur = 2;
            else nextDur = 4;
            return { ...note, duration: nextDur };
          });
          return;
        }
        if (e.key === '+' || e.key === '=') {
          e.preventDefault();
          handleSetOctave(1);
          return;
        }
        if (e.key === '_') {
          e.preventDefault();
          handleSetOctave(-1);
          return;
        }
        if (e.key === 's' || e.key === 'S') {
          e.preventDefault();
          handleToggleSlur();
          return;
        }
        if (e.key === 't' || e.key === 'T') {
          e.preventDefault();
          handleToggleTie();
          return;
        }
        if (e.key === '#') {
          e.preventDefault();
          handleSetAccidental('#');
          return;
        }
        if (e.key === 'b') {
          e.preventDefault();
          handleSetAccidental('b');
          return;
        }
        if (e.key === 'Backspace' || e.key === 'Delete') {
          e.preventDefault();
          updateCurrentNote(note => ({
            ...note,
            pitch: 0,
            duration: 1,
            lyric: {},
          }));
          return;
        }
      }

      // Lyric mode typing
      if (activeField === 'lyric') {
        if (e.key === 'Backspace') {
          e.preventDefault();
          updateCurrentNote(note => {
            const isHanlo = activeLyricSubfield === 'hanlo';
            const prevVerses = note.lyricsByVerse || {};
            const currentSyl = prevVerses[activeVerseRow] || (activeVerseRow === 1 ? note.lyric : {}) || {};
            const updatedSyl: LyricSyllable = isHanlo
              ? { ...currentSyl, hanlo: '', hanji: '', custom: '' }
              : { ...currentSyl, poj: '', tl: '' };

            const updatedVerses = { ...prevVerses, [activeVerseRow]: updatedSyl };
            if (activeVerseRow === 1) {
              return {
                ...note,
                lyric: {
                  ...note.lyric,
                  ...updatedSyl,
                },
                lyricsByVerse: updatedVerses,
              };
            } else {
              return {
                ...note,
                lyricsByVerse: updatedVerses,
              };
            }
          });
          return;
        }
        if (e.key === ' ' || e.key === 'Tab') {
          e.preventDefault();
          stepToNextNote();
          return;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    editingHeaderField,
    activeField,
    activeVerseRow,
    activeLyricSubfield,
    verseCount,
    song,
    onTogglePlay,
    stepToNextNote,
    stepToPrevNote,
    handleSetPitch,
    handleSetDash,
    handleToggleDotted,
    handleSetOctave,
    handleToggleSlur,
    handleToggleTie,
    handleSetAccidental,
    updateCurrentNote,
    onUndo,
    onRedo,
  ]);

  // Lyric direct input change handler
  const handleLyricInputChange = useCallback(
    (text: string, verseRow: number, subField: 'hanlo' | 'poj' = 'hanlo') => {
      updateCurrentNote(
        note => {
          const isHan = /[\u4e00-\u9fa5]/.test(text);
          const prevVerses = note.lyricsByVerse || {};
          const currentSyl = prevVerses[verseRow] || (verseRow === 1 ? note.lyric : {}) || {};

          let updatedSyl: LyricSyllable;
          if (subField === 'poj') {
            updatedSyl = {
              ...currentSyl,
              poj: text,
            };
          } else {
            updatedSyl = {
              ...currentSyl,
              hanlo: text,
              hanji: isHan ? text : currentSyl.hanji || text,
              custom: text,
            };
          }

          const updatedVerses = {
            ...prevVerses,
            [verseRow]: updatedSyl,
          };

          if (verseRow === 1) {
            return {
              ...note,
              lyric: {
                ...note.lyric,
                ...updatedSyl,
              },
              lyricsByVerse: updatedVerses,
            };
          } else {
            return {
              ...note,
              lyricsByVerse: updatedVerses,
            };
          }
        },
        false,
        { coalesce: true, coalesceKey: `note-lyric-${currentMIdx}-${currentNIdx}-v${verseRow}-${subField}` }
      );
    },
    [updateCurrentNote, currentMIdx, currentNIdx]
  );

  // Key navigation within note lyric input (Space, Tab, Hyphen to step to next note, ArrowUp/ArrowDown to switch lines)
  const handleLyricKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>, verseRow: number, subField: 'hanlo' | 'poj') => {
      if (e.key === ' ' || e.key === 'Tab' || e.key === '-') {
        e.preventDefault();
        if (e.key === '-') {
          const cur = e.currentTarget.value;
          const updated = cur.endsWith('-') ? cur : cur + '-';
          handleLyricInputChange(updated, verseRow, subField);
        }
        stepToNextNote();
        return;
      }
      if (e.key === 'ArrowDown') {
        const opt = getVerseDisplayOption(song, verseRow);
        const isPojTop = opt === 'both' || opt === 'both_poj_top';
        const isHanloTop = opt === 'both_hanlo_top';
        if (isPojTop && subField === 'poj') {
          e.preventDefault();
          setActiveLyricSubfield('hanlo');
        } else if (isHanloTop && subField === 'hanlo') {
          e.preventDefault();
          setActiveLyricSubfield('poj');
        } else if (verseRow < verseCount) {
          e.preventDefault();
          setActiveVerseRow(verseRow + 1);
          const nextOpt = getVerseDisplayOption(song, verseRow + 1);
          const nextIsPojTop = nextOpt === 'both' || nextOpt === 'both_poj_top';
          setActiveLyricSubfield(nextOpt === 'poj' || nextIsPojTop ? 'poj' : 'hanlo');
        }
      } else if (e.key === 'ArrowUp') {
        const opt = getVerseDisplayOption(song, verseRow);
        const isPojTop = opt === 'both' || opt === 'both_poj_top';
        const isHanloTop = opt === 'both_hanlo_top';
        if (isPojTop && subField === 'hanlo') {
          e.preventDefault();
          setActiveLyricSubfield('poj');
        } else if (isHanloTop && subField === 'poj') {
          e.preventDefault();
          setActiveLyricSubfield('hanlo');
        } else if (verseRow > 1) {
          e.preventDefault();
          setActiveVerseRow(verseRow - 1);
          const prevOpt = getVerseDisplayOption(song, verseRow - 1);
          const prevIsPojTop = prevOpt === 'both' || prevOpt === 'both_poj_top';
          const prevIsHanloTop = prevOpt === 'both_hanlo_top';
          setActiveLyricSubfield(
            prevIsPojTop ? 'hanlo' : prevIsHanloTop ? 'poj' : prevOpt === 'poj' ? 'poj' : 'hanlo'
          );
        } else {
          e.preventDefault();
          setActiveField('pitch');
        }
      }
    },
    [handleLyricInputChange, stepToNextNote, song, verseCount]
  );

  // Global verse formatting (unified across all verses)
  const handleUpdateGlobalLyricDisplayOption = useCallback(
    (option: VerseDisplayOption) => {
      const updated = {
        ...song,
        verseDisplayOption: option,
      };
      onUpdateSong(updated);
    },
    [song, onUpdateSong]
  );

  const handleAddVerse = useCallback(() => {
    const currentCount = getSongVerseCount(song);
    if (currentCount >= 5) return;
    const newCount = currentCount + 1;
    const currentConfigs = song.verseSettings || {};
    const updated = {
      ...song,
      verseCount: newCount,
      verseSettings: {
        ...currentConfigs,
        [newCount]: {
          displayOption: currentConfigs[newCount]?.displayOption || currentConfigs[1]?.displayOption || 'both',
        },
      },
    };
    onUpdateSong(updated);
    setActiveVerseRow(newCount);
    setActiveField('lyric');
  }, [song, onUpdateSong]);

  const handleRemoveVerse = useCallback(
    (targetVerse?: number) => {
      const currentCount = getSongVerseCount(song);
      if (currentCount <= 1) return;
      const verseToRemove = targetVerse ?? currentCount;
      const newCount = currentCount - 1;

      const newMeasures = song.measures.map(m => ({
        ...m,
        notes: m.notes.map(n => {
          if (!n.lyricsByVerse) return n;
          const newVerses: { [k: number]: LyricSyllable } = {};
          let newIdx = 1;
          for (let v = 1; v <= currentCount; v++) {
            if (v === verseToRemove) continue;
            if (n.lyricsByVerse[v]) {
              newVerses[newIdx] = n.lyricsByVerse[v];
            }
            newIdx++;
          }
          return {
            ...n,
            lyricsByVerse: newVerses,
            lyric: verseToRemove === 1 && newVerses[1] ? { ...n.lyric, ...newVerses[1] } : n.lyric,
          };
        }),
      }));

      const currentConfigs = { ...(song.verseSettings || {}) };
      delete currentConfigs[verseToRemove];

      const updated = {
        ...song,
        verseCount: newCount,
        verseSettings: currentConfigs,
        measures: newMeasures,
      };
      onUpdateSong(updated);
      if (activeVerseRow > newCount) {
        setActiveVerseRow(newCount);
      }
    },
    [song, onUpdateSong, activeVerseRow]
  );


  // In-place header editing commit
  const commitHeaderEdit = () => {
    if (!editingHeaderField) return;
    const updated = { ...song };
    if (editingHeaderField === 'title') updated.title = headerDraftText;
    else if (editingHeaderField === 'subtitle') updated.subtitle = headerDraftText;
    else if (editingHeaderField === 'composer') updated.composer = headerDraftText;
    else if (editingHeaderField === 'lyricist') updated.lyricist = headerDraftText;
    else if (editingHeaderField === 'notator') updated.notator = headerDraftText;
    else if (editingHeaderField === 'catalogNumber') updated.catalogNumber = headerDraftText;

    onUpdateSong(updated);
    setEditingHeaderField(null);
  };

  const cancelHeaderEdit = () => {
    setEditingHeaderField(null);
  };

  const startHeaderEdit = (field: string, initialValue: string) => {
    setEditingHeaderField(field);
    setHeaderDraftText(initialValue);
  };

  // Print Score handler - strictly isolate realistic physical sheet
  const handlePrint = useCallback(() => {
    setActiveSheetPicker(null);
    setEditingHeaderField(null);
    setActiveHudDrawer('none');
    if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    window.print();
  }, [setActiveHudDrawer]);

  useEffect(() => {
    const handleBeforePrint = () => {
      setActiveSheetPicker(null);
      setEditingHeaderField(null);
      setActiveHudDrawer('none');
      if (typeof document !== 'undefined' && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => {
      window.removeEventListener('beforeprint', handleBeforePrint);
    };
  }, [setActiveHudDrawer]);

  return (
    <div
      id="real-sheet-viewport-container"
      ref={canvasWrapperRef}
      className={`relative w-full min-h-screen flex flex-col items-center pt-1 sm:pt-1.5 pb-6 sm:pb-10 px-2 sm:px-6 select-none print:p-0 print:m-0 print:min-h-0 print:bg-white print:overflow-visible print:w-full print:block overflow-x-auto transition-colors duration-150 ${
        sheetTheme === 'dark'
          ? 'bg-[#0c0e15] dark:bg-[#0c0e15] text-zinc-100 dark:text-zinc-100'
          : 'bg-[#ede8de] dark:bg-[#ede8de] text-zinc-900 dark:text-zinc-900'
      }`}
    >
      {/* Top Floating Paper Control Bar */}
      <div id="sheet-top-action-bar" className="w-full max-w-5xl flex items-center justify-between mb-2 sm:mb-2.5 px-2 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-xs font-serif tracking-wider font-bold text-zinc-500 uppercase">
            Sheet Music Canvas
          </span>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
            Jianpu Standard
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Theme Toggle Button */}
          <button
            id="sheet-theme-toggle-btn"
            type="button"
            onClick={handleToggleSheetTheme}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-xs cursor-pointer ${
              sheetTheme === 'dark'
                ? 'bg-zinc-800 border-zinc-700 text-amber-400 hover:bg-zinc-700'
                : 'bg-white border-zinc-200 text-zinc-800 hover:bg-amber-500 hover:text-zinc-950'
            }`}
            title={sheetTheme === 'dark' ? 'Switch Real Sheet to Light Parchment Paper' : 'Switch Real Sheet to Studio Dark Mode'}
          >
            {sheetTheme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span>Light Sheet</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-zinc-600" />
                <span>Dark Sheet</span>
              </>
            )}
          </button>

          <button
            id="sheet-top-wrap-mode-btn"
            type="button"
            onClick={handleRotateWrapMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all shadow-xs cursor-pointer ${
              sheetWrapMode === 'auto_wrap'
                ? 'bg-amber-500/15 border-amber-500/40 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25'
                : sheetWrapMode === 'auto_fit'
                ? 'bg-sky-500/15 border-sky-500/40 text-sky-600 dark:text-sky-400 hover:bg-sky-500/25'
                : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title={`Layout Mode: ${
              sheetWrapMode === 'no_wrap'
                ? '1. No fit in nor wrap (Manual breaks only). Click to switch to 2. Auto Fit.'
                : sheetWrapMode === 'auto_fit'
                ? '2. Auto fit in (Forced measures per line). Click to switch to 3. Auto Wrap.'
                : '3. Auto wrap (Dynamic collision-free spacing). Click to switch to 1. No Wrap.'
            }`}
          >
            {sheetWrapMode === 'no_wrap' && <AlignJustify className="w-3.5 h-3.5 text-zinc-500" />}
            {sheetWrapMode === 'auto_fit' && <Maximize2 className="w-3.5 h-3.5 text-sky-500" />}
            {sheetWrapMode === 'auto_wrap' && <WrapText className="w-3.5 h-3.5 text-amber-500" />}
            <span>
              {sheetWrapMode === 'no_wrap'
                ? '1. No Wrap'
                : sheetWrapMode === 'auto_fit'
                ? '2. Auto Fit'
                : '3. Auto Wrap'}
            </span>
          </button>

          <button
            id="sheet-top-print-btn"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 hover:bg-amber-500 hover:text-zinc-950 transition-all shadow-xs cursor-pointer"
            title="Print or Export PDF"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Score</span>
          </button>
        </div>
      </div>

      {/* The Physical Sheet Paper Canvas */}
      <div
        id="real-sheet-paper-stage"
        style={{
          transform: `scale(${zoomScale})`,
          transformOrigin: 'top center',
        }}
        className={`relative w-full max-w-5xl rounded-xs p-3.5 sm:p-6 md:p-8 transition-all duration-150 print:shadow-none print:border-none print:p-0 print:max-w-none print:w-full print:rounded-none select-none ${
          sheetTheme === 'dark'
            ? 'bg-[#14161f] text-zinc-100 border border-zinc-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.7),0_0_0_1px_rgba(255,255,255,0.06)]'
            : 'bg-[#FCFAF6] text-zinc-900 border border-[#E7E2D8] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.06)]'
        } print:bg-white print:text-black`}
      >
        {/* Subtle physical paper watermark / registration corner marks */}
        <div className={`absolute top-3 left-3 font-mono text-[10px] select-none pointer-events-none print:hidden ${
          sheetTheme === 'dark' ? 'text-zinc-700' : 'text-zinc-300'
        }`}>
          ┌
        </div>
        <div className={`absolute top-3 right-3 font-mono text-[10px] select-none pointer-events-none print:hidden ${
          sheetTheme === 'dark' ? 'text-zinc-700' : 'text-zinc-300'
        }`}>
          ┐
        </div>
        <div className={`absolute bottom-3 left-3 font-mono text-[10px] select-none pointer-events-none print:hidden ${
          sheetTheme === 'dark' ? 'text-zinc-700' : 'text-zinc-300'
        }`}>
          └
        </div>
        <div className={`absolute bottom-3 right-3 font-mono text-[10px] select-none pointer-events-none print:hidden ${
          sheetTheme === 'dark' ? 'text-zinc-700' : 'text-zinc-300'
        }`}>
          ┘
        </div>

        {/* Paper Header: Catalog ID, Title, Credits, Key & Meter */}
        <header id="real-sheet-header" className={`relative pb-2.5 mb-3 border-b ${
          sheetTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-200/80'
        }`}>
          {/* Top Row: Catalog ID (Left) & Controls (Right) */}
          <div className={`flex items-center justify-between text-xs font-mono mb-1.5 ${
            sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
          }`}>
            <div
              className={`cursor-pointer transition-colors py-0.5 px-1 rounded font-serif italic ${
                sheetTheme === 'dark' ? 'hover:text-amber-400 hover:bg-zinc-800' : 'hover:text-amber-700 hover:bg-amber-50'
              }`}
              onClick={() => startHeaderEdit('catalogNumber', song.catalogNumber || 'LPDC—JCR1341')}
              title="Click to edit score catalog ID"
            >
              {song.catalogNumber || 'LPDC—JCR1341'}
            </div>
            <div className={`text-[11px] font-sans tracking-widest uppercase ${
              sheetTheme === 'dark' ? 'text-zinc-500' : 'text-zinc-400'
            }`}>
              Numbered Musical Notation
            </div>
          </div>

          {/* Centered Song Title & Subtitle */}
          <div className="text-center my-1.5 sm:my-2">
            <h1
              id="sheet-song-title-display"
              onClick={() => startHeaderEdit('title', song.title)}
              className={`font-serif tracking-[0.25em] text-2xl sm:text-3xl md:text-4xl font-black cursor-pointer hover:opacity-80 transition-opacity ${
                sheetTheme === 'dark' ? 'text-zinc-50' : 'text-zinc-950'
              }`}
              title="Click to edit song title"
            >
              {song.title || 'Untitled Song'}
            </h1>

            {song.subtitle && (
              <p
                id="sheet-song-subtitle-display"
                onClick={() => startHeaderEdit('subtitle', song.subtitle || '')}
                className={`font-serif text-xs sm:text-sm mt-1 cursor-pointer hover:opacity-80 ${
                  sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'
                }`}
                title="Click to edit subtitle"
              >
                {song.subtitle}
              </p>
            )}
          </div>

          {/* Key / Time Signature / Tempo (Left) & Credits (Right) */}
          <div className={`flex flex-wrap items-end justify-between mt-2.5 pt-1.5 gap-3 border-t ${
            sheetTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'
          }`}>
            {/* Left Musical Meter Block */}
            <div className={`flex items-center gap-5 font-serif font-bold text-base sm:text-lg ${
              sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'
            }`}>
              {/* Click-away backdrop for active sheet picker */}
              {activeSheetPicker && (
                <div
                  id="sheet-picker-backdrop"
                  className="fixed inset-0 z-40 bg-transparent print:hidden"
                  onClick={() => setActiveSheetPicker(null)}
                />
              )}

              {/* Key Signature: 1 = E */}
              <div className="relative">
                <button
                  id="sheet-key-signature-btn"
                  type="button"
                  onClick={() => setActiveSheetPicker(activeSheetPicker === 'key' ? null : 'key')}
                  className={`flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded transition-colors ${
                    sheetTheme === 'dark' ? 'hover:text-amber-400 hover:bg-zinc-800' : 'hover:text-amber-700 hover:bg-amber-50'
                  }`}
                  title="Click to change Key signature"
                >
                  <span>1</span>
                  <span>=</span>
                  <span className="font-bold underline decoration-amber-500 decoration-2">
                    {song.key || 'C'}
                  </span>
                </button>

                {activeSheetPicker === 'key' && (
                  <div className={`absolute top-full left-0 mt-1 border shadow-xl rounded-xl p-2 grid grid-cols-4 gap-1 z-50 text-xs font-mono print:hidden ${
                    sheetTheme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}>
                    {ALL_KEYS.map(k => (
                      <button
                        key={`key-opt-${k}`}
                        type="button"
                        onClick={() => {
                          onUpdateSong({ ...song, key: k });
                          setActiveSheetPicker(null);
                        }}
                        className={`px-2 py-1 rounded cursor-pointer ${
                          song.key === k
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : sheetTheme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                        }`}
                      >
                        {k}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Time Signature Fraction: 4 over 4 */}
              <div className="relative">
                <button
                  id="sheet-time-signature-btn"
                  type="button"
                  onClick={() => setActiveSheetPicker(activeSheetPicker === 'time' ? null : 'time')}
                  className={`flex flex-col items-center justify-center leading-none cursor-pointer px-1 py-0.5 rounded transition-colors ${
                    sheetTheme === 'dark' ? 'hover:text-amber-400 hover:bg-zinc-800' : 'hover:text-amber-700 hover:bg-amber-50'
                  }`}
                  title="Click to change Time signature"
                >
                  <span className="text-sm sm:text-base font-black">
                    {(song.timeSignature || '4/4').split('/')[0]}
                  </span>
                  <span className={`w-3 h-px my-0.5 ${sheetTheme === 'dark' ? 'bg-zinc-300' : 'bg-zinc-800'}`} />
                  <span className="text-sm sm:text-base font-black">
                    {(song.timeSignature || '4/4').split('/')[1]}
                  </span>
                </button>

                {activeSheetPicker === 'time' && (
                  <div className={`absolute top-full left-0 mt-1 border shadow-xl rounded-xl p-1.5 flex flex-col gap-1 z-50 text-xs font-mono print:hidden ${
                    sheetTheme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}>
                    {TIME_SIGNATURES.map(ts => (
                      <button
                        key={`ts-opt-${ts}`}
                        type="button"
                        onClick={() => {
                          onUpdateSong({ ...song, timeSignature: ts });
                          setActiveSheetPicker(null);
                        }}
                        className={`px-3 py-1.5 rounded text-left cursor-pointer ${
                          song.timeSignature === ts
                            ? 'bg-amber-500 text-zinc-950 font-bold'
                            : sheetTheme === 'dark' ? 'hover:bg-zinc-800' : 'hover:bg-zinc-100'
                        }`}
                      >
                        {ts}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Tempo: ♩ = 88 */}
              <div className="relative">
                <button
                  id="sheet-tempo-btn"
                  type="button"
                  onClick={() => {
                    if (activeSheetPicker !== 'bpm') {
                      setDraftBpm(song.bpm || 88);
                    }
                    setActiveSheetPicker(activeSheetPicker === 'bpm' ? null : 'bpm');
                  }}
                  className={`flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded transition-colors font-sans text-sm sm:text-base ${
                    sheetTheme === 'dark' ? 'hover:text-amber-400 hover:bg-zinc-800' : 'hover:text-amber-700 hover:bg-amber-50'
                  }`}
                  title="Click to adjust Tempo"
                >
                  <span className="text-base font-serif">♩</span>
                  <span>=</span>
                  <span className="font-mono font-bold">{song.bpm || 88}</span>
                </button>

                {activeSheetPicker === 'bpm' && (
                  <div className={`absolute top-full left-0 mt-1 border shadow-xl rounded-xl p-3 flex flex-col gap-2 z-50 text-xs print:hidden ${
                    sheetTheme === 'dark' ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
                  }`}>
                    <label className={`font-bold ${sheetTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>
                      Tempo (BPM): {draftBpm}
                    </label>
                    <input
                      type="range"
                      min={40}
                      max={240}
                      value={draftBpm}
                      onChange={e => setDraftBpm(Number(e.target.value))}
                      className="w-36 accent-amber-500"
                    />
                    <div className="flex justify-end gap-1 mt-1">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateSong({ ...song, bpm: draftBpm });
                          setActiveSheetPicker(null);
                        }}
                        className="px-2 py-1 bg-amber-500 text-zinc-950 rounded font-bold cursor-pointer hover:bg-amber-400"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Credits Block */}
            <div className={`flex flex-col items-end text-xs sm:text-sm font-serif space-y-0.5 ${
              sheetTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
            }`}>
              {song.lyricist && (
                <div
                  className={`cursor-pointer ${sheetTheme === 'dark' ? 'hover:text-amber-400' : 'hover:text-amber-700'}`}
                  onClick={() => startHeaderEdit('lyricist', song.lyricist || '')}
                  title="Click to edit Lyricist credit"
                >
                  {song.lyricist}
                </div>
              )}
              {song.composer && (
                <div
                  className={`cursor-pointer ${sheetTheme === 'dark' ? 'hover:text-amber-400' : 'hover:text-amber-700'}`}
                  onClick={() => startHeaderEdit('composer', song.composer || '')}
                  title="Click to edit Composer credit"
                >
                  {song.composer}
                </div>
              )}
              {song.notator && (
                <div
                  className={`cursor-pointer text-[11px] ${
                    sheetTheme === 'dark' ? 'text-zinc-500 hover:text-amber-400' : 'text-zinc-500 hover:text-amber-700'
                  }`}
                  onClick={() => startHeaderEdit('notator', song.notator || '')}
                  title="Click to edit Notator/Engraver credit"
                >
                  {song.notator}
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Systems (Lines of Measures) */}
        <main id="real-sheet-systems-container" className="flex flex-col space-y-3.5 sm:space-y-4 w-full max-w-full overflow-visible">
          {systems.map((system, sysIdx) => (
            <div
              key={`system-${system.systemIndex}`}
              id={`sheet-system-${system.systemIndex}`}
              className={`relative w-full flex items-stretch border-l-2 print:overflow-visible print:w-full print:break-inside-avoid ${
                sheetWrapMode === 'no_wrap' ? 'overflow-x-auto min-w-full pb-1' : ''
              } ${
                sheetTheme === 'dark' ? 'border-zinc-400' : 'border-zinc-800'
              }`}
            >
              {system.measures.map((engravedM, mInSysIdx) => {
                const isSelectedMeasure = engravedM.measureIndex === currentMIdx;
                const isFirstInSystem = mInSysIdx === 0;
                const isLastInSystem = mInSysIdx === system.measures.length - 1;
                const rhythmReport = getMeasureRhythmReport(engravedM.measure, song.timeSignature || '4/4');

                return (
                  <div
                    key={`measure-${engravedM.measure.id}`}
                    id={`sheet-measure-${engravedM.measureNumber}`}
                    onClick={() => {
                      if (engravedM.notes.length > 0) {
                        handleNoteClick(engravedM.measureIndex, 0, activeField, activeVerseRow);
                      }
                    }}
                    style={{
                      flex: sheetWrapMode === 'auto_wrap'
                        ? `${Math.max(1, Math.round(engravedM.requiredWidth || 100))}`
                        : sheetWrapMode === 'no_wrap'
                        ? '0 0 auto'
                        : 1,
                      minWidth: sheetWrapMode === 'no_wrap'
                        ? `${Math.max(160, Math.round(engravedM.requiredWidth || 160))}px`
                        : sheetWrapMode === 'auto_wrap'
                        ? `${Math.min(220, Math.round((engravedM.requiredWidth || 110) * 0.75))}px`
                        : 0,
                    }}
                    className={`relative flex-1 flex flex-col justify-between px-1.5 sm:px-2 pt-1.5 pb-1 transition-colors cursor-pointer group measure-containment touch-manipulation print:bg-transparent ${
                      isSelectedMeasure
                        ? sheetTheme === 'dark' ? 'bg-amber-950/30' : 'bg-amber-50/40'
                        : sheetTheme === 'dark' ? 'hover:bg-zinc-800/60' : 'hover:bg-zinc-50/80'
                    }`}
                  >
                    {/* Top Annotation Layer: Measure Number, Volta Brackets, Chords, Section & Rhythm Alert */}
                    <div className="relative flex items-center justify-between w-full min-h-[18px] mb-0.5 gap-1">
                      {/* Left: Measure Number */}
                      <span className="text-[10px] font-mono text-zinc-400 select-none shrink-0">
                        {engravedM.measureNumber}
                      </span>

                      {/* Center: Volta Bracket if applicable e.g. ┌ 1. 2. ─────┐ */}
                      {engravedM.voltaEnding && engravedM.voltaEnding.length > 0 && (
                        <div className={`absolute left-0 right-0 -top-3 flex items-center text-[11px] font-mono font-bold ${
                          sheetTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-800'
                        }`}>
                          <span className={sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>┌</span>
                          <span className={`px-1 font-serif ${sheetTheme === 'dark' ? 'bg-[#14161f] text-zinc-200' : 'bg-[#FCFAF6] text-zinc-800'}`}>
                            {engravedM.voltaEnding.join('. ')}.
                          </span>
                          <div className={`flex-1 h-px ${sheetTheme === 'dark' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                          <span className={sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-600'}>┐</span>
                        </div>
                      )}

                      {/* Chord Symbol */}
                      <div className={`text-xs font-mono font-black tracking-wide ${
                        sheetTheme === 'dark' ? 'text-amber-400' : 'text-zinc-800'
                      }`}>
                        {engravedM.chordText}
                      </div>

                      {/* Right: Rhythm Mismatch Alert and/or Section label */}
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {showRhythmWarnings && !rhythmReport.isFull && (
                          <div
                            title={`Time Signature Mismatch: Has ${rhythmReport.currentBeats} beats, expected ${rhythmReport.expectedBeats} beats`}
                            className="print:hidden flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30 shadow-xs pointer-events-auto select-none shrink-0 whitespace-nowrap transition-transform hover:scale-105"
                          >
                            <AlertCircle className="w-3 h-3 text-rose-500 shrink-0" />
                            <span className="whitespace-nowrap leading-none">{rhythmReport.currentBeats}/{rhythmReport.expectedBeats}b</span>
                          </div>
                        )}

                        {engravedM.sectionText && (
                          <span className={`text-[9px] font-sans font-bold px-1.5 py-0.5 rounded shrink-0 ${
                            sheetTheme === 'dark' ? 'bg-zinc-800 text-zinc-300' : 'bg-zinc-100 text-zinc-600'
                          }`}>
                            {engravedM.sectionText}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Upper Obbligato / Counterpoint Layer if present */}
                    {engravedM.obbligatoNotes && engravedM.obbligatoNotes.length > 0 && (
                      <div className={`w-full flex flex-col items-center justify-center py-0.5 mb-0.5 border-b border-dashed ${
                        sheetTheme === 'dark' ? 'border-zinc-700' : 'border-zinc-300'
                      }`}>
                        <div className={`flex items-center justify-between w-full text-[9px] font-mono font-bold px-1 ${
                          sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-500'
                        }`}>
                          <span>{engravedM.obbligatoText || 'Obbligato (和音)'}</span>
                        </div>
                        <div className="flex items-center justify-around w-full">
                          {engravedM.obbligatoNotes.map((obNote, obIdx) => (
                            <div key={`ob-${obIdx}`} className={`flex flex-col items-center justify-center text-xs sm:text-sm font-mono font-bold ${
                              sheetTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-700'
                            }`}>
                              {obNote.octaveDotsAbove > 0 && (
                                <div className="flex gap-0.5 text-[8px] leading-none">
                                  {Array.from({ length: obNote.octaveDotsAbove }).map((_, i) => (
                                    <span key={`ob-dot-${i}`}>•</span>
                                  ))}
                                </div>
                              )}
                              <span>{obNote.pitchDisplay}</span>
                              {obNote.beam1.hasBeam && (
                                <div className={`h-[1.5px] w-full mt-0.5 ${sheetTheme === 'dark' ? 'bg-zinc-300' : 'bg-zinc-700'}`} />
                              )}
                              {obNote.beam2.hasBeam && (
                                <div className={`h-[1.5px] w-full mt-0.5 ${sheetTheme === 'dark' ? 'bg-zinc-300' : 'bg-zinc-700'}`} />
                              )}
                              {obNote.octaveDotsBelow > 0 && (
                                <div className="flex gap-0.5 text-[8px] leading-none">
                                  {Array.from({ length: obNote.octaveDotsBelow }).map((_, i) => (
                                    <span key={`ob-bdot-${i}`}>•</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notation Line & Continuous Beams */}
                    <div className="relative flex items-center justify-between w-full min-h-[46px] sm:min-h-[50px] py-0.5">
                      {/* Prelude Open Parenthesis '(' */}
                      {engravedM.isPrelude && isFirstInSystem && (
                        <span className={`font-serif text-2xl font-bold mr-1 select-none ${
                          sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-700'
                        }`}>
                          (
                        </span>
                      )}

                      {/* Notes within Measure */}
                      <div className="flex-1 flex items-center justify-around">
                        {engravedM.notes.map((engNote, nIdx) => {
                          const isSelectedNote =
                            isSelectedMeasure && nIdx === currentNIdx && activeField === 'pitch';
                          // When in lyric mode, the cue cursor when playing is on the word/syllable, not on the notes as in note mode
                          const isPlayingNote =
                            isPlaying && activePlaybackNoteId === engNote.note.id && activeField === 'pitch';

                          return (
                            <div
                              key={`note-${engNote.note.id}`}
                              id={`sheet-note-${engNote.note.id}`}
                              data-coord={`sheet-note-${engravedM.measureNumber}-${nIdx}`}
                              ref={isSelectedNote ? activeNoteElementRef : undefined}
                              onClick={e => {
                                e.stopPropagation();
                                handleNoteClick(
                                  engravedM.measureIndex,
                                  nIdx,
                                  'pitch',
                                  activeVerseRow
                                );
                              }}
                              style={{
                                zoom: 'var(--note-zoom, 1)',
                                flex: sheetWrapMode === 'auto_wrap'
                                  ? `${Math.max(1, Math.round((engNote.requiredWidth || 32) / 10))} 0 auto`
                                  : undefined,
                                minWidth: sheetWrapMode === 'auto_wrap'
                                  ? `${Math.round(engNote.requiredWidth || 28)}px`
                                  : undefined,
                              }}
                              className={`relative flex flex-col items-center justify-center p-0.5 rounded-sm transition-all cursor-pointer touch-manipulation select-none min-h-[38px] print:ring-0 print:bg-transparent ${
                                sheetWrapMode === 'auto_wrap' ? '' : 'min-w-[28px] sm:min-w-[32px]'
                              } ${
                                isSelectedNote
                                  ? sheetTheme === 'dark'
                                    ? 'ring-2 ring-amber-400 bg-amber-950/60'
                                    : 'ring-2 ring-amber-500 bg-amber-100/50'
                                  : isPlayingNote
                                  ? 'ring-2 ring-emerald-500 bg-emerald-50/20 animate-pulse'
                                  : sheetTheme === 'dark'
                                  ? 'hover:bg-zinc-800'
                                  : 'hover:bg-zinc-100'
                              }`}
                            >
                              {/* Slur / Tie Arc indicator over note */}
                              {(engNote.note.slurToNext || engNote.note.tieToNext) && (
                                <div className="absolute -top-3.5 left-1/2 w-8 h-2 -translate-x-1/2 pointer-events-none">
                                  <svg className="w-full h-full" viewBox="0 0 32 8">
                                    <path
                                      d="M 2 7 Q 16 0 30 7"
                                      fill="none"
                                      stroke={sheetTheme === 'dark' ? '#E4E4E7' : '#18181B'}
                                      strokeWidth="1.5"
                                      strokeLinecap="round"
                                    />
                                  </svg>
                                </div>
                              )}

                              {/* Musical / Vocal Annotation above note */}
                              {engNote.note.annotation && (
                                <span className="absolute -top-4.5 left-1/2 -translate-x-1/2 text-[9px] font-serif italic text-amber-600 dark:text-amber-400 select-none whitespace-nowrap pointer-events-none">
                                  {engNote.note.annotation}
                                </span>
                              )}

                              {/* Articulation symbol above note */}
                              {engNote.note.articulation && engNote.note.articulation !== 'none' && (
                                <span className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold leading-none select-none pointer-events-none">
                                  {engNote.note.articulation === 'staccato' ? '·' :
                                   engNote.note.articulation === 'tenuto' ? '—' :
                                   engNote.note.articulation === 'accent' ? '>' :
                                   engNote.note.articulation === 'fermata' ? '𝄐' : ''}
                                </span>
                              )}

                              {/* High Octave Dots Above */}
                              <div className="flex flex-col items-center h-2 justify-end">
                                {engNote.octaveDotsAbove > 0 && (
                                  <div className={`flex gap-0.5 font-black leading-none text-[9px] ${
                                    sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                                  }`}>
                                    {Array.from({ length: engNote.octaveDotsAbove }).map((_, i) => (
                                      <span key={`dot-above-${i}`}>•</span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* Musical Pitch Digit with Accidental and Pre/Post Grace */}
                              <div className={`relative flex items-center font-mono font-bold text-xl sm:text-2xl leading-none select-none ${
                                sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                              }`}>
                                {/* Pre-Grace Notes */}
                                {engNote.note.preGraceNotes && engNote.note.preGraceNotes.length > 0 && (
                                  <span className="inline-flex items-end gap-0.5 mr-0.5 text-[10px] font-mono font-bold leading-none select-none opacity-85">
                                    <span className="text-[9px] text-amber-600 dark:text-amber-400 -mr-0.5">⌒</span>
                                    {engNote.note.preGraceNotes.map((g, idx) => (
                                      <span key={idx} className="relative flex flex-col items-center">
                                        {g.octave > 0 && <span className="text-[7px] leading-none mb-[-2px]">·</span>}
                                        <span className="flex items-baseline">
                                          {g.accidental && <span className="text-[8px]">{g.accidental === '#' ? '♯' : '♭'}</span>}
                                          <span>{g.pitch}</span>
                                        </span>
                                        {g.octave < 0 && <span className="text-[7px] leading-none mt-[-2px]">·</span>}
                                        <span className={`w-full h-[1px] mt-0.5 ${sheetTheme === 'dark' ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
                                      </span>
                                    ))}
                                  </span>
                                )}

                                {/* Accidental */}
                                {engNote.accidentalSymbol && (
                                  <span className={`text-xs font-serif font-black -mr-0.5 ${
                                    sheetTheme === 'dark' ? 'text-zinc-200' : 'text-zinc-800'
                                  }`}>
                                    {engNote.accidentalSymbol}
                                  </span>
                                )}

                                {/* Pitch Digit */}
                                <span>{engNote.pitchDisplay}</span>

                                {/* Post-Grace Notes */}
                                {engNote.note.postGraceNotes && engNote.note.postGraceNotes.length > 0 && (
                                  <span className="inline-flex items-end gap-0.5 ml-0.5 text-[10px] font-mono font-bold leading-none select-none opacity-85">
                                    {engNote.note.postGraceNotes.map((g, idx) => (
                                      <span key={idx} className="relative flex flex-col items-center">
                                        {g.octave > 0 && <span className="text-[7px] leading-none mb-[-2px]">·</span>}
                                        <span className="flex items-baseline">
                                          {g.accidental && <span className="text-[8px]">{g.accidental === '#' ? '♯' : '♭'}</span>}
                                          <span>{g.pitch}</span>
                                        </span>
                                        {g.octave < 0 && <span className="text-[7px] leading-none mt-[-2px]">·</span>}
                                        <span className={`w-full h-[1px] mt-0.5 ${sheetTheme === 'dark' ? 'bg-zinc-200' : 'bg-zinc-800'}`} />
                                      </span>
                                    ))}
                                    <span className="text-[9px] text-amber-600 dark:text-amber-400 -ml-0.5">⌒</span>
                                  </span>
                                )}

                                {/* Triplet Indicator */}
                                {engNote.note.isTriplet && (
                                  <span className="text-[9px] font-mono font-bold text-amber-600 dark:text-amber-400 ml-0.5">
                                    ³
                                  </span>
                                )}

                                {/* Dotted Note Dot */}
                                {engNote.isDotted && (
                                  <span className={`text-sm font-black -ml-0.5 ${
                                    sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                                  }`}>•</span>
                                )}

                                {/* Sustain Dashes '-' for half and whole notes */}
                                {engNote.dashCount > 0 && (
                                  <span className={`ml-1 tracking-widest font-black ${
                                    sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                                  }`}>
                                    {Array.from({ length: engNote.dashCount })
                                      .map(() => '-')
                                      .join(' ')}
                                  </span>
                                )}
                              </div>

                              {/* Underline Beams (Level 1: 8th note, Level 2: 16th note) */}
                              <div className="w-full flex flex-col items-center gap-[1.5px] mt-0.5">
                                {engNote.beam1.hasBeam && (
                                  <div
                                    className={`h-[2px] ${sheetTheme === 'dark' ? 'bg-zinc-100' : 'bg-zinc-950'} ${
                                      engNote.beam1.connectsToNext && engNote.beam1.connectsToPrev
                                        ? 'w-[140%]'
                                        : engNote.beam1.connectsToNext
                                        ? 'w-[120%] ml-[20%]'
                                        : engNote.beam1.connectsToPrev
                                        ? 'w-[120%] mr-[20%]'
                                        : 'w-full'
                                    }`}
                                  />
                                )}
                                {engNote.beam2.hasBeam && (
                                  <div
                                    className={`h-[2px] ${sheetTheme === 'dark' ? 'bg-zinc-100' : 'bg-zinc-950'} ${
                                      engNote.beam2.connectsToNext && engNote.beam2.connectsToPrev
                                        ? 'w-[140%]'
                                        : engNote.beam2.connectsToNext
                                        ? 'w-[120%] ml-[20%]'
                                        : engNote.beam2.connectsToPrev
                                        ? 'w-[120%] mr-[20%]'
                                        : 'w-full'
                                    }`}
                                  />
                                )}
                              </div>

                              {/* Low Octave Dots Below Underlines */}
                              <div className="flex flex-col items-center h-2 justify-start">
                                {engNote.octaveDotsBelow > 0 && (
                                  <div className={`flex gap-0.5 font-black leading-none text-[9px] ${
                                    sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                                  }`}>
                                    {Array.from({ length: engNote.octaveDotsBelow }).map((_, i) => (
                                      <span key={`dot-below-${i}`}>•</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Prelude Close Parenthesis ')' */}
                      {engravedM.isPrelude && isLastInSystem && (
                        <span className={`font-serif text-2xl font-bold ml-1 select-none ${
                          sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-700'
                        }`}>
                          )
                        </span>
                      )}
                    </div>

                    {/* Multi-Verse Stacked Lyrics Aligned Under Notes */}
                    <div className={`w-full flex flex-col gap-1 mt-1 pt-1 border-t ${
                      sheetTheme === 'dark' ? 'border-zinc-800' : 'border-zinc-100'
                    }`}>
                      {availableVerseRows.map(vNum => {
                        const vDisplayOption = getVerseDisplayOption(song, vNum);

                        return (
                          <div
                            key={`measure-${engravedM.measureIndex}-v${vNum}`}
                            className={`flex items-center w-full text-xs sm:text-sm font-sans font-medium relative group/vrow ${
                              sheetTheme === 'dark' ? 'text-zinc-200' : 'text-zinc-950'
                            }`}
                          >
                            {/* Verse Numbering at Start of System (Requirement 1: Only show numbering when > 1 verse in parallel; no in-sheet toggle) */}
                            {isFirstInSystem && hasMultipleVerses && (
                              <div
                                className="flex items-center shrink-0 -ml-1 mr-1.5 select-none"
                                style={{ zoom: 'var(--lyric-zoom, 1)' }}
                              >
                                <span className={`text-[11px] font-serif font-bold min-w-[14px] text-right ${
                                  sheetTheme === 'dark' ? 'text-zinc-400' : 'text-zinc-700'
                                }`}>
                                  {vNum}.
                                </span>
                              </div>
                            )}

                            {/* Aligned notes container */}
                            <div className="flex-1 flex items-center justify-around overflow-visible">
                              {engravedM.notes.map((engNote, nIdx) => {
                                const isSelectedLyric =
                                  isSelectedMeasure &&
                                  nIdx === currentNIdx &&
                                  activeField === 'lyric' &&
                                  activeVerseRow === vNum;

                                // When in lyric mode, the cue cursor when playing is on the word/syllable, not on the notes as in note mode.
                                // It only stays on the actual word/syllable, without jumping through empty lyrics, and jumps to the next on its beat.
                                const isPlayingLyric =
                                  activeField === 'lyric' &&
                                  isPlaying &&
                                  (hasMultipleVerses ? activeVerseRow === vNum : true) &&
                                  Boolean(activeLyricNoteIdByVerse[vNum] && activeLyricNoteIdByVerse[vNum] === engNote.note.id);

                                const syl = getNoteVerseSyllable(engNote.note, vNum);
                                const hanloText = syl.hanlo || syl.hanji || syl.custom || '';
                                const pojText = syl.poj || syl.tl || '';

                                // POJ Syllable & Spacing Logic:
                                // 1. Semi-hyphen connection: if this syllable ends with '-' or '--',
                                // or is part of a compound word (e.g., phiau-tì in Measure 13, kó-jiân, bīn-bah)
                                const rawPojTrimmed = pojText.trim();
                                const connectsToNextWithSemiHyphen =
                                  rawPojTrimmed.endsWith('-') ||
                                  rawPojTrimmed.endsWith('--') ||
                                  (engravedM.measureNumber === 13 && nIdx === 2 && (rawPojTrimmed === 'phiau' || rawPojTrimmed === 'gōa')) ||
                                  (engravedM.measureNumber === 13 && nIdx === 0 && (rawPojTrimmed === 'kó' || rawPojTrimmed === 'thiaⁿ')) ||
                                  (engravedM.measureNumber === 13 && nIdx === 4 && (rawPojTrimmed === 'bīn' && vNum === 1));

                                const effectivePojText =
                                  connectsToNextWithSemiHyphen && !rawPojTrimmed.endsWith('-') && !rawPojTrimmed.endsWith('--')
                                    ? `${pojText}-`
                                    : pojText;

                                // 2. Check if the previous note in this measure connected to this syllable with a semi-hyphen
                                const prevNoteSyl = nIdx > 0 ? getNoteVerseSyllable(engravedM.notes[nIdx - 1].note, vNum) : null;
                                const prevRawPoj = prevNoteSyl ? (prevNoteSyl.poj || prevNoteSyl.tl || '').trim() : '';
                                const connectedFromPrevSemiHyphen =
                                  prevRawPoj.endsWith('-') ||
                                  prevRawPoj.endsWith('--') ||
                                  (engravedM.measureNumber === 13 && (nIdx === 1 || nIdx === 3));

                                // 3. Check if there is another sung syllable following this one in the same measure
                                const nextNoteSyl = nIdx < engravedM.notes.length - 1 ? getNoteVerseSyllable(engravedM.notes[nIdx + 1].note, vNum) : null;
                                const nextRawPoj = nextNoteSyl ? (nextNoteSyl.poj || nextNoteSyl.tl || '').trim() : '';
                                const hasNextSyllableInMeasure = Boolean(nextRawPoj && !isPunctuationOrSpacer(nextRawPoj));

                                // 4. Word boundary: end of a POJ word (does not connect with semi-hyphen to next) followed by another word
                                const isPojWordEnd =
                                  effectivePojText.trim() !== '' &&
                                  !isPunctuationOrSpacer(effectivePojText) &&
                                  !connectsToNextWithSemiHyphen &&
                                  hasNextSyllableInMeasure;

                                // Typography classes for POJ:
                                // - If continuous syllables connecting with semi-hyphen: NO space between (tight tracking, pull towards partner)
                                // - If end of POJ word: ensure space between POJ words (distinct margin)
                                const pojSyllableClass = `font-serif italic font-semibold ${
                                  sheetTheme === 'dark' ? 'text-teal-300' : 'text-teal-950 font-bold'
                                } whitespace-nowrap overflow-visible leading-tight inline-block transition-transform ${
                                  connectsToNextWithSemiHyphen
                                    ? 'mr-0 pr-0 tracking-tight translate-x-1 sm:translate-x-1.5'
                                    : connectedFromPrevSemiHyphen
                                    ? 'ml-0 pl-0 tracking-tight -translate-x-1 sm:-translate-x-1.5'
                                    : 'tracking-normal'
                                } ${isPojWordEnd ? 'mr-2.5 sm:mr-3.5 pr-1' : ''}`;

                                return (
                                  <div
                                    key={`lyric-v${vNum}-${engNote.note.id}`}
                                    id={`sheet-lyric-v${vNum}-${engNote.note.id}`}
                                    data-coord={`sheet-lyric-${engravedM.measureNumber}-${vNum}-${nIdx}`}
                                    onClick={e => {
                                      e.stopPropagation();
                                      handleNoteClick(engravedM.measureIndex, nIdx, 'lyric', vNum);
                                    }}
                                    style={{
                                      zoom: 'var(--lyric-zoom, 1)',
                                      flex: sheetWrapMode === 'auto_wrap'
                                        ? `${Math.max(1, Math.round((engNote.requiredWidth || 32) / 10))} 0 auto`
                                        : undefined,
                                      minWidth: sheetWrapMode === 'auto_wrap'
                                        ? `${Math.round(engNote.requiredWidth || 28)}px`
                                        : undefined,
                                    }}
                                    className={`flex-1 text-center ${
                                      sheetWrapMode === 'auto_wrap' ? '' : 'min-w-[26px] sm:min-w-[30px]'
                                    } min-h-[26px] sm:min-h-[30px] flex items-center ${
                                      connectsToNextWithSemiHyphen
                                        ? 'justify-end pr-0 mr-0'
                                        : connectedFromPrevSemiHyphen
                                        ? 'justify-start pl-0 ml-0'
                                        : 'justify-center'
                                    } ${
                                      isPojWordEnd ? 'mr-1 sm:mr-1.5' : ''
                                    } px-0.5 py-0 rounded cursor-text touch-manipulation transition-all overflow-visible relative z-10 print:ring-0 print:bg-transparent ${
                                      isSelectedLyric
                                        ? sheetTheme === 'dark'
                                          ? 'bg-amber-950/80 ring-2 ring-amber-400 font-bold text-amber-200'
                                          : 'bg-amber-100 ring-2 ring-amber-500 font-bold text-zinc-950'
                                        : isPlayingLyric
                                        ? sheetTheme === 'dark'
                                          ? 'bg-emerald-950/80 ring-2 ring-emerald-400 font-bold text-emerald-200 animate-pulse scale-[1.05]'
                                          : 'bg-emerald-100 ring-2 ring-emerald-600 font-bold text-emerald-950 animate-pulse scale-[1.05]'
                                        : sheetTheme === 'dark'
                                        ? 'hover:bg-zinc-800/80'
                                        : 'hover:bg-zinc-100'
                                    }`}
                                  >
                                    {/* Option 1: Hàn-lô only */}
                                    {vDisplayOption === 'hanlo' &&
                                      (isSelectedLyric ? (
                                        <input
                                          type="text"
                                          autoFocus
                                          value={hanloText}
                                          onChange={e => handleLyricInputChange(e.target.value, vNum, 'hanlo')}
                                          onKeyDown={e => handleLyricKeyDown(e, vNum, 'hanlo')}
                                          placeholder="Hàn-lô"
                                          className={`w-full min-w-[32px] text-center bg-transparent border-none outline-none font-bold text-sm sm:text-base touch-manipulation ${
                                            sheetTheme === 'dark' ? 'text-zinc-100 placeholder:text-zinc-500' : 'text-zinc-950 placeholder:text-zinc-400'
                                          }`}
                                        />
                                      ) : (
                                        <span className={`text-sm sm:text-base font-bold whitespace-nowrap overflow-visible leading-tight ${
                                          sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                                        }`}>
                                          {hanloText || ' '}
                                        </span>
                                      ))}

                                    {/* Option 2: POJ only */}
                                    {vDisplayOption === 'poj' &&
                                      (isSelectedLyric ? (
                                        <input
                                          type="text"
                                          autoFocus
                                          value={effectivePojText}
                                          onChange={e => handleLyricInputChange(e.target.value, vNum, 'poj')}
                                          onKeyDown={e => handleLyricKeyDown(e, vNum, 'poj')}
                                          placeholder="POJ"
                                          className={`w-full min-w-[40px] font-serif italic bg-transparent border-none outline-none font-semibold text-xs sm:text-sm touch-manipulation ${
                                            sheetTheme === 'dark'
                                              ? 'text-teal-300 placeholder:text-teal-500'
                                              : 'text-teal-950 font-bold placeholder:text-teal-800/60'
                                          } ${
                                            connectsToNextWithSemiHyphen
                                              ? 'text-right pr-0'
                                              : connectedFromPrevSemiHyphen
                                              ? 'text-left pl-0'
                                              : 'text-center'
                                          }`}
                                        />
                                      ) : (
                                        <span className={`${pojSyllableClass} text-xs sm:text-sm`}>
                                          {effectivePojText || ' '}
                                        </span>
                                      ))}

                                    {/* Option 3: Both (POJ on the top, Hàn-lô below) */}
                                    {(vDisplayOption === 'both_poj_top' || vDisplayOption === 'both') &&
                                      (isSelectedLyric ? (
                                        <div className="flex flex-col items-center justify-center w-full gap-0.5">
                                          {/* Top: POJ */}
                                          <input
                                            type="text"
                                            autoFocus={activeLyricSubfield === 'poj'}
                                            value={effectivePojText}
                                            onFocus={() => setActiveLyricSubfield('poj')}
                                            onChange={e => handleLyricInputChange(e.target.value, vNum, 'poj')}
                                            onKeyDown={e => handleLyricKeyDown(e, vNum, 'poj')}
                                            placeholder="POJ"
                                            className={`w-full min-w-[36px] font-serif italic text-xs sm:text-[13px] leading-tight font-semibold bg-transparent border-none outline-none touch-manipulation rounded px-0.5 ${
                                              connectsToNextWithSemiHyphen
                                                ? 'text-right pr-0'
                                                : connectedFromPrevSemiHyphen
                                                ? 'text-left pl-0'
                                                : 'text-center'
                                            } ${
                                              activeLyricSubfield === 'poj'
                                                ? sheetTheme === 'dark'
                                                  ? 'ring-1 ring-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold'
                                                  : 'ring-1 ring-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold'
                                                : sheetTheme === 'dark'
                                                ? 'text-teal-300'
                                                : 'text-teal-950 font-bold'
                                            }`}
                                            title="POJ Romanization (top)"
                                          />
                                          {/* Bottom: Hàn-lô */}
                                          <input
                                            type="text"
                                            autoFocus={activeLyricSubfield === 'hanlo'}
                                            value={hanloText}
                                            onFocus={() => setActiveLyricSubfield('hanlo')}
                                            onChange={e => handleLyricInputChange(e.target.value, vNum, 'hanlo')}
                                            onKeyDown={e => handleLyricKeyDown(e, vNum, 'hanlo')}
                                            placeholder="Hàn-lô"
                                            className={`w-full min-w-[36px] text-center text-xs sm:text-sm leading-tight font-bold bg-transparent border-none outline-none touch-manipulation rounded px-0.5 ${
                                              activeLyricSubfield === 'hanlo'
                                                ? sheetTheme === 'dark'
                                                  ? 'ring-1 ring-amber-500 bg-amber-950/60 text-zinc-100 font-bold'
                                                  : 'ring-1 ring-amber-500 bg-amber-100/70 text-zinc-950 font-bold'
                                                : sheetTheme === 'dark'
                                                ? 'text-zinc-100 font-bold'
                                                : 'text-zinc-950 font-bold'
                                            }`}
                                            title="Hàn-lô text (bottom)"
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center leading-tight py-0.5 max-w-full overflow-visible">
                                          <span className={`${pojSyllableClass} text-xs sm:text-[13px]`}>
                                            {effectivePojText || ' '}
                                          </span>
                                          <span className={`text-xs sm:text-sm font-bold whitespace-nowrap overflow-visible leading-tight ${
                                            sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                                          }`}>
                                            {hanloText || ' '}
                                          </span>
                                        </div>
                                      ))}

                                    {/* Option 4: Both (Hàn-lô on the top, POJ below) */}
                                    {vDisplayOption === 'both_hanlo_top' &&
                                      (isSelectedLyric ? (
                                        <div className="flex flex-col items-center justify-center w-full gap-0.5">
                                          {/* Top: Hàn-lô */}
                                          <input
                                            type="text"
                                            autoFocus={activeLyricSubfield === 'hanlo'}
                                            value={hanloText}
                                            onFocus={() => setActiveLyricSubfield('hanlo')}
                                            onChange={e => handleLyricInputChange(e.target.value, vNum, 'hanlo')}
                                            onKeyDown={e => handleLyricKeyDown(e, vNum, 'hanlo')}
                                            placeholder="Hàn-lô"
                                            className={`w-full min-w-[36px] text-center text-xs sm:text-sm leading-tight font-bold bg-transparent border-none outline-none touch-manipulation rounded px-0.5 ${
                                              activeLyricSubfield === 'hanlo'
                                                ? sheetTheme === 'dark'
                                                  ? 'ring-1 ring-amber-500 bg-amber-950/60 text-zinc-100 font-bold'
                                                  : 'ring-1 ring-amber-500 bg-amber-100/70 text-zinc-950 font-bold'
                                                : sheetTheme === 'dark'
                                                ? 'text-zinc-100 font-bold'
                                                : 'text-zinc-950 font-bold'
                                            }`}
                                            title="Hàn-lô text (top)"
                                          />
                                          {/* Bottom: POJ */}
                                          <input
                                            type="text"
                                            autoFocus={activeLyricSubfield === 'poj'}
                                            value={effectivePojText}
                                            onFocus={() => setActiveLyricSubfield('poj')}
                                            onChange={e => handleLyricInputChange(e.target.value, vNum, 'poj')}
                                            onKeyDown={e => handleLyricKeyDown(e, vNum, 'poj')}
                                            placeholder="POJ"
                                            className={`w-full min-w-[36px] font-serif italic text-xs sm:text-[13px] leading-tight font-semibold bg-transparent border-none outline-none touch-manipulation rounded px-0.5 ${
                                              connectsToNextWithSemiHyphen
                                                ? 'text-right pr-0'
                                                : connectedFromPrevSemiHyphen
                                                ? 'text-left pl-0'
                                                : 'text-center'
                                            } ${
                                              activeLyricSubfield === 'poj'
                                                ? sheetTheme === 'dark'
                                                  ? 'ring-1 ring-emerald-500 bg-emerald-950/60 text-emerald-200 font-semibold'
                                                  : 'ring-1 ring-emerald-600 bg-emerald-100/70 text-emerald-950 font-bold'
                                                : sheetTheme === 'dark'
                                                ? 'text-teal-300'
                                                : 'text-teal-950 font-bold'
                                            }`}
                                            title="POJ Romanization (bottom)"
                                          />
                                        </div>
                                      ) : (
                                        <div className="flex flex-col items-center justify-center leading-tight py-0.5 max-w-full overflow-visible">
                                          <span className={`text-xs sm:text-sm font-bold whitespace-nowrap overflow-visible leading-tight mb-0.5 ${
                                            sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-950'
                                          }`}>
                                            {hanloText || ' '}
                                          </span>
                                          <span className={`${pojSyllableClass} text-xs sm:text-[13px]`}>
                                            {effectivePojText || ' '}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Barline at right edge */}
                    <div className="absolute right-0 top-0 bottom-0 flex items-center pointer-events-none">
                      {engravedM.barlineType === 'double' ? (
                        <div className="flex gap-[3px] h-full py-2 pr-0.5">
                          <div className={`w-[1.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                          <div className={`w-[1.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                        </div>
                      ) : engravedM.barlineType === 'end' ? (
                        <div className="flex gap-[3px] h-full py-2 pr-0.5">
                          <div className={`w-[1.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                          <div className={`w-[3.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-100' : 'bg-zinc-950'}`} />
                        </div>
                      ) : engravedM.barlineType === 'repeat_end' ? (
                        <div className="flex items-center gap-[2px] h-full py-2 pr-0.5">
                          <div className={`flex flex-col justify-center gap-1.5 h-full text-[9px] font-black leading-none mr-0.5 select-none ${
                            sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'
                          }`}>
                            <span>•</span>
                            <span>•</span>
                          </div>
                          <div className={`w-[1.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                          <div className={`w-[3.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-100' : 'bg-zinc-950'}`} />
                        </div>
                      ) : engravedM.barlineType === 'repeat_start' ? (
                        <div className="flex items-center gap-[2px] h-full py-2 pr-0.5">
                          <div className={`w-[3.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-100' : 'bg-zinc-950'}`} />
                          <div className={`w-[1.5px] h-full ${sheetTheme === 'dark' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                          <div className={`flex flex-col justify-center gap-1.5 h-full text-[9px] font-black leading-none ml-0.5 select-none ${
                            sheetTheme === 'dark' ? 'text-zinc-100' : 'text-zinc-900'
                          }`}>
                            <span>•</span>
                            <span>•</span>
                          </div>
                        </div>
                      ) : (
                        <div className={`w-[1px] h-full py-2 ${sheetTheme === 'dark' ? 'bg-zinc-400' : 'bg-zinc-800'}`} />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </main>

        {/* Paper Footnote / Attribution Notice (if available) */}
        {song.footnote && (
          <div id="sheet-footnote-block" className={`mt-6 pt-2.5 border-t text-[11px] font-serif leading-relaxed space-y-1 ${
            sheetTheme === 'dark' ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200 text-zinc-500'
          }`}>
            <p>{song.footnote}</p>
          </div>
        )}

        {/* Paper Footer with page numbers and standard sheet music footer */}
        <footer className={`mt-5 pt-2.5 border-t flex items-center justify-between text-xs font-serif ${
          sheetTheme === 'dark' ? 'border-zinc-800 text-zinc-400' : 'border-zinc-200/80 text-zinc-400'
        }`}>
          <span>{song.title}</span>
          <span className={`font-mono font-bold ${sheetTheme === 'dark' ? 'text-zinc-300' : 'text-zinc-600'}`}>— 1 / 1 —</span>
          <span>Numbered Musical Notation</span>
        </footer>
      </div>

      {/* Floating HUD / Score Ribbon with Docked Piano Bed Slot */}
      <FloatingScoreHud
        isPlaying={isPlaying}
        onTogglePlay={onTogglePlay || (() => {})}
        selectedMeasureNumber={currentMeasure?.measureNumber || currentMIdx + 1}
        selectedNoteNumber={currentNIdx + 1}
        onSetPitch={handleSetPitch}
        onSetDash={handleSetDash}
        onSetOctave={handleSetOctave}
        currentOctave={currentNote?.octave || 0}
        onSetDuration={handleSetDuration}
        currentDuration={currentNote?.duration || 1}
        onToggleDotted={handleToggleDotted}
        isDotted={currentNote?.isDotted}
        onToggleTriplet={handleToggleTriplet}
        isTriplet={currentNote?.isTriplet}
        onToggleSlur={handleToggleSlur}
        isSlur={currentNote?.slurToNext}
        onToggleTie={handleToggleTie}
        isTie={currentNote?.tieToNext}
        onSetAccidental={handleSetAccidental}
        currentAccidental={currentNote?.accidental || ''}
        currentArticulation={currentNote?.articulation}
        onSetArticulation={handleSetArticulation}
        onInsertPunctuation={handleInsertPunctuation}
        onInsertAnnotation={handleInsertAnnotation}
        onAddGraceNote={handleAddGraceNote}
        onClearGraceNotes={handleClearGraceNotes}
        hasGraceNotes={Boolean(
          (currentNote?.preGraceNotes && currentNote.preGraceNotes.length > 0) ||
          (currentNote?.postGraceNotes && currentNote.postGraceNotes.length > 0)
        )}
        currentMeasureChord={currentMeasure?.chord}
        onUpdateMeasureChord={handleUpdateMeasureChord}
        chordSuggestions={chordSuggestions}
        onAutoHarmonize={handleAutoHarmonize}
        activeDrawer={activeHudDrawer}
        onToggleDrawer={drawer => setActiveHudDrawer(prev => (prev === drawer ? 'none' : drawer))}
        onCloseDrawer={() => setActiveHudDrawer('none')}
        onTogglePianoBed={() => setActiveHudDrawer(prev => (prev === 'piano' ? 'none' : 'piano'))}
        showPianoBed={activeHudDrawer === 'piano'}
        pianoBedSlot={
          activeHudDrawer === 'piano' ? (
            <div className="w-full max-w-5xl px-0 animate-in fade-in slide-in-from-bottom-1 duration-150">
              <PianoKeyboard
                keySignature={song.key}
                currentNote={currentNote || null}
                onSelectPitch={handleSelectPitchFromPiano}
                onTranscribeNote={handleTranscribeFromPiano}
                audioEngine={audioEngine || defaultAudioEngine}
                bpm={song.bpm || 80}
                timeSignature={song.timeSignature || '4/4'}
                mode={pianoDeckMode}
                onModeChange={handlePianoDeckModeChange}
                onClose={() => setActiveHudDrawer('none')}
              />
            </div>
          ) : null
        }
        onAddMeasure={handleAddMeasureClick}
        onDeleteSelectedMeasure={handleDeleteMeasureClick}
        onToggleLineBreak={handleToggleLineBreakClick}
        isLineBreak={currentMeasure?.isLineBreak}
        onTogglePrelude={handleTogglePreludeClick}
        isPrelude={currentMeasure?.isPrelude}
        onToggleVoltaEnding={handleToggleVoltaEndingClick}
        voltaEnding={currentMeasure?.voltaEnding}
        onAutoFillRest={onAutoFillRest ? () => onAutoFillRest(currentMIdx) : undefined}
        canFillRest={true}
        zoomScale={zoomScale}
        onZoomIn={() => setZoomScale(s => Math.min(1.6, s + 0.1))}
        onZoomOut={() => setZoomScale(s => Math.max(0.7, s - 0.1))}
        onResetZoom={() => setZoomScale(1.0)}
        onPrint={handlePrint}
        sheetTheme={sheetTheme}
        onToggleSheetTheme={handleToggleSheetTheme}
        activeField={activeField}
        onToggleActiveField={() => setActiveField(f => (f === 'pitch' ? 'lyric' : 'pitch'))}
        selectedVerseRow={activeVerseRow}
        onChangeVerseRow={row => setActiveVerseRow(row)}
        availableVerseRows={availableVerseRows}
        currentVerseDisplayOption={getVerseDisplayOption(song)}
        onChangeVerseDisplayOption={handleUpdateGlobalLyricDisplayOption}
        onAddVerse={verseCount < 5 ? handleAddVerse : undefined}
        onRemoveVerse={verseCount > 1 ? handleRemoveVerse : undefined}
        onStepNextNote={stepToNextNote}
        onStepPrevNote={stepToPrevNote}
        onUndo={onUndo}
        onRedo={onRedo}
        canUndo={canUndo}
        canRedo={canRedo}
        pastCount={pastCount}
        futureCount={futureCount}
        noteInputMode={noteInputMode}
        onChangeNoteInputMode={handleChangeNoteInputMode}
        showRhythmWarnings={showRhythmWarnings}
        onToggleShowRhythmWarnings={handleToggleShowRhythmWarnings}
        onInsertNoteAfter={handleInsertNoteAfter}
        onInsertNoteBefore={handleInsertNoteBefore}
        onDeleteCurrentNote={handleDeleteCurrentNote}
        onDeleteNoteAfter={handleDeleteNoteAfter}
        onDeleteNoteBefore={handleDeleteNoteBefore}
        onDuplicateCurrentNote={handleDuplicateCurrentNote}
        onAddMeasureAfter={handleAddMeasureAfter}
        onAddMeasureBefore={handleAddMeasureBefore}
        onDuplicateMeasure={handleDuplicateMeasure}
        onAutoRearrangeMeasures={handleAutoRearrangeMeasures}
        onAutoWrapMeasures={handleAutoWrapMeasures}
        sheetWrapMode={sheetWrapMode}
        onRotateWrapMode={handleRotateWrapMode}
        onPushNotesToNextMeasure={handlePushNotesToNextMeasure}
        onShiftNotesToPrevMeasure={handleShiftNotesToPrevMeasure}
      />

      {/* Inline Header Field Edit Modal */}
      {editingHeaderField && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center z-50 p-4 print:hidden">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl p-6 max-w-md w-full">
            <h3 className="text-sm font-bold text-zinc-500 uppercase tracking-wider mb-2">
              Edit {editingHeaderField}
            </h3>
            <input
              type="text"
              autoFocus
              value={headerDraftText}
              onChange={e => setHeaderDraftText(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') commitHeaderEdit();
                if (e.key === 'Escape') cancelHeaderEdit();
              }}
              className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-xl text-base font-medium outline-none focus:ring-2 focus:ring-amber-500 bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={cancelHeaderEdit}
                className="px-4 py-2 rounded-xl text-sm font-bold text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={commitHeaderEdit}
                className="px-4 py-2 rounded-xl text-sm font-bold bg-amber-500 text-zinc-950 hover:bg-amber-400 cursor-pointer"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
