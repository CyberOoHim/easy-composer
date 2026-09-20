'use client';

import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { NumberedNotationNote, KeySignature, PitchNumber, InstrumentType, NoteDuration } from '@/types/song';
import { AudioEngine } from '@/lib/audioEngine';
import { KEY_SEMITONES, SCALE_DEGREE_SEMITONES, INSTRUMENT_OPTIONS, CATEGORIZED_INSTRUMENT_OPTIONS } from '@/lib/taigiUtils';
import {
  getStoredInstrument,
  setStoredInstrument,
  getStoredAutoStepAdvance,
  setStoredAutoStepAdvance,
  getStoredPianoOctaveView,
  setStoredPianoOctaveView,
  getStoredPianoLabelMode,
  setStoredPianoLabelMode,
  getStoredPianoQuantizeGrid,
  setStoredPianoQuantizeGrid,
  getStoredPianoAllowTriplets,
  setStoredPianoAllowTriplets,
  getStoredPianoDeckMode,
  setStoredPianoDeckMode,
  SETTINGS_RESET_EVENT,
  PianoOctaveView,
  PianoLabelMode,
} from '@/lib/storage';
import {
  quantizeDurationToBeats,
  midiToNumberedPitch,
  getGridBeatValue,
  QuantizeGrid,
  QuantizedDurationResult,
} from '@/lib/pitch/scoreQuantizer';
import { resolveQwertyKey } from '@/lib/keyboard/keyEventEngine';
import { useWebMidi } from '@/lib/keyboard/webMidi';
import {
  Music,
  Keyboard,
  Zap,
  Target,
  ArrowRight,
  Volume2,
  VolumeX,
  Radio,
  Clock,
  Sparkles,
  X,
  Sliders,
} from 'lucide-react';

export type PianoDeckMode = 'step' | 'transcribe';
export type PianoProgressionMode = 'single' | 'auto';

export interface PianoKeyboardProps {
  keySignature: KeySignature;
  currentNote: NumberedNotationNote | null;
  onSelectPitch: (
    pitch: PitchNumber,
    octave: number,
    accidental: '' | '#' | 'b',
    shouldAdvance?: boolean
  ) => void;
  onTranscribeNote?: (
    pitch: PitchNumber,
    octave: number,
    accidental: '' | '#' | 'b',
    duration: NoteDuration,
    isDotted?: boolean,
    isTriplet?: boolean,
    shouldAdvance?: boolean
  ) => void;
  audioEngine: AudioEngine;
  bpm?: number;
  timeSignature?: string;
  className?: string;
  onOpenKeyboardToScore?: () => void;
  instrument?: InstrumentType;
  onSetInstrument?: (inst: InstrumentType) => void;
  mode?: PianoDeckMode;
  onModeChange?: (mode: PianoDeckMode) => void;
  progressionMode?: PianoProgressionMode;
  onProgressionModeChange?: (progression: PianoProgressionMode) => void;
  onClose?: () => void;
}

// 12 chromatic note names for sharp keys vs flat keys
const CHROMATIC_NOTE_NAMES_SHARP = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_NOTE_NAMES_FLAT = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
const FLAT_KEY_SIGNATURES = new Set(['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb']);

export interface KeyDefinition {
  isBlack: boolean;
  pitch: PitchNumber;
  accidental: '' | '#' | 'b';
  octave: number;
  numberedNotationLabel: string;
  accidentalLabel?: string;
  solfege: string;
  noteName: string;
  leftPercent?: number;
}

export const PianoKeyboard: React.FC<PianoKeyboardProps> = React.memo(({
  keySignature,
  currentNote,
  onSelectPitch,
  onTranscribeNote,
  audioEngine,
  bpm = 80,
  timeSignature = '4/4',
  className = '',
  onOpenKeyboardToScore,
  instrument: propInstrument,
  onSetInstrument,
  mode: propMode,
  onModeChange,
  progressionMode: propProgressionMode,
  onProgressionModeChange,
  onClose,
}) => {
  // 1. Operational Mode: 'step' (Direct Pitch Selection) vs 'transcribe' (Live on-the-fly transcribe)
  const [internalMode, setInternalMode] = useState<PianoDeckMode>(() => {
    if (typeof window !== 'undefined') return getStoredPianoDeckMode('step');
    return 'step';
  });
  const activeMode = propMode !== undefined ? propMode : internalMode;

  const handleSetMode = useCallback((newMode: PianoDeckMode) => {
    setInternalMode(newMode);
    setStoredPianoDeckMode(newMode);
    onModeChange?.(newMode);
  }, [onModeChange]);

  // 2. Progression Mode: 'single' (Enter in current note only) vs 'auto' (Auto-advance caret to next note)
  const [internalProgression, setInternalProgression] = useState<PianoProgressionMode>(() => {
    return getStoredAutoStepAdvance(false) ? 'auto' : 'single';
  });
  const activeProgression = propProgressionMode !== undefined ? propProgressionMode : internalProgression;

  const handleSetProgression = useCallback((newProg: PianoProgressionMode) => {
    setInternalProgression(newProg);
    const isAuto = newProg === 'auto';
    setStoredAutoStepAdvance(isAuto);
    onProgressionModeChange?.(newProg);
  }, [onProgressionModeChange]);

  // 3. Transcribe Quantization Settings
  const [quantizeGrid, setQuantizeGridState] = useState<QuantizeGrid>(() => {
    if (typeof window !== 'undefined') return getStoredPianoQuantizeGrid('eighth');
    return 'eighth';
  });
  const setQuantizeGrid = useCallback((grid: QuantizeGrid) => {
    setQuantizeGridState(grid);
    setStoredPianoQuantizeGrid(grid);
  }, []);

  const [allowTriplets, setAllowTripletsState] = useState<boolean>(() => {
    if (typeof window !== 'undefined') return getStoredPianoAllowTriplets(false);
    return false;
  });
  const setAllowTriplets = useCallback((valOrUpdater: boolean | ((prev: boolean) => boolean)) => {
    setAllowTripletsState(prev => {
      const next = typeof valOrUpdater === 'function' ? valOrUpdater(prev) : valOrUpdater;
      setStoredPianoAllowTriplets(next);
      return next;
    });
  }, []);

  const [isMetronomeActive, setIsMetronomeActive] = useState<boolean>(false);
  const [metronomeBeat, setMetronomeBeat] = useState<number>(1);
  const [isMetronomePulse, setIsMetronomePulse] = useState<boolean>(false);

  // 4. Keyboard Display Settings
  const [octaveView, setOctaveViewState] = useState<PianoOctaveView>(() => {
    if (typeof window !== 'undefined') return getStoredPianoOctaveView('low_mid');
    return 'low_mid';
  });
  const setOctaveView = useCallback((view: PianoOctaveView) => {
    setOctaveViewState(view);
    setStoredPianoOctaveView(view);
  }, []);

  const [labelMode, setLabelModeState] = useState<PianoLabelMode>(() => {
    if (typeof window !== 'undefined') return getStoredPianoLabelMode('both');
    return 'both';
  });
  const setLabelMode = useCallback((mode: PianoLabelMode) => {
    setLabelModeState(mode);
    setStoredPianoLabelMode(mode);
  }, []);

  // Listen for reset events
  useEffect(() => {
    const handleReset = () => {
      setInternalMode(getStoredPianoDeckMode('step'));
      setQuantizeGridState(getStoredPianoQuantizeGrid('eighth'));
      setAllowTripletsState(getStoredPianoAllowTriplets(false));
      setOctaveViewState(getStoredPianoOctaveView('low_mid'));
      setLabelModeState(getStoredPianoLabelMode('both'));
      setLocalInstrument(getStoredInstrument());
    };
    window.addEventListener(SETTINGS_RESET_EVENT, handleReset);
    return () => window.removeEventListener(SETTINGS_RESET_EVENT, handleReset);
  }, []);

  // 5. Active Instrument
  const [localInstrument, setLocalInstrument] = useState<InstrumentType>(() => {
    if (propInstrument) return propInstrument;
    if (typeof window !== 'undefined') return getStoredInstrument();
    return 'piano';
  });
  const activeInstrument = propInstrument || localInstrument;

  const handleInstrumentChange = useCallback((newInst: InstrumentType) => {
    setLocalInstrument(newInst);
    setStoredInstrument(newInst);
    audioEngine.setOptions({ instrument: newInst });
    audioEngine.previewInstrumentTone(keySignature, newInst);
    onSetInstrument?.(newInst);
  }, [audioEngine, keySignature, onSetInstrument]);

  // Base key semitone relative to C4 (0 = C)
  const baseKeySemitone = KEY_SEMITONES[keySignature] ?? 0;
  const isFlatKey = FLAT_KEY_SIGNATURES.has(keySignature);
  const noteNameList = isFlatKey ? CHROMATIC_NOTE_NAMES_FLAT : CHROMATIC_NOTE_NAMES_SHARP;

  // Helper to compute note details
  const getNoteDetails = useMemo(() => {
    return (pitch: PitchNumber, octave: number, accidental: '' | '#' | 'b') => {
      if (pitch === 'empty' || pitch === 0) {
        return { noteName: '', solfege: '', midiNote: 0 };
      }

      const degreeOffset = SCALE_DEGREE_SEMITONES[pitch] || 0;
      let accOffset = 0;
      if (accidental === '#') accOffset = 1;
      if (accidental === 'b') accOffset = -1;

      const totalSemitones = baseKeySemitone + degreeOffset + octave * 12 + accOffset;
      const midiNote = 60 + totalSemitones; // 60 = C4

      const noteIndex = ((midiNote % 12) + 12) % 12;
      const calcOctave = Math.floor(midiNote / 12) - 1;
      const rawName = noteNameList[noteIndex];

      const solfegeMap: Record<string, string> = {
        '1': 'Do',
        '1#': 'Di',
        '2b': 'Ra',
        '2': 'Re',
        '2#': 'Ri',
        '3b': 'Me',
        '3': 'Mi',
        '4': 'Fa',
        '4#': 'Fi',
        '5b': 'Se',
        '5': 'Sol',
        '5#': 'Si',
        '6b': 'Le',
        '6': 'La',
        '6#': 'Li',
        '7b': 'Te',
        '7': 'Ti',
      };

      const keyTag = `${pitch}${accidental || ''}`;
      const solfege = solfegeMap[keyTag] || `${pitch}`;

      return {
        noteName: `${rawName}${calcOctave}`,
        solfege,
        midiNote,
      };
    };
  }, [baseKeySemitone, noteNameList]);

  // Generate keys for an octave
  const generateOctaveKeys = useCallback((octaveNum: number) => {
    const whiteKeys: KeyDefinition[] = [1, 2, 3, 4, 5, 6, 7].map(p => {
      const pitch = p as PitchNumber;
      const { noteName, solfege } = getNoteDetails(pitch, octaveNum, '');
      return {
        isBlack: false,
        pitch,
        accidental: '',
        octave: octaveNum,
        numberedNotationLabel: `${pitch}`,
        solfege,
        noteName,
      };
    });

    const blackKeys: KeyDefinition[] = [
      { pitch: 1 as PitchNumber, accidental: '#' as const, leftPercent: 9.7, numberedNotationLabel: '♯1', accidentalLabel: '♭2' },
      { pitch: 2 as PitchNumber, accidental: '#' as const, leftPercent: 24.0, numberedNotationLabel: '♯2', accidentalLabel: '♭3' },
      { pitch: 4 as PitchNumber, accidental: '#' as const, leftPercent: 52.5, numberedNotationLabel: '♯4', accidentalLabel: '♭5' },
      { pitch: 5 as PitchNumber, accidental: '#' as const, leftPercent: 66.8, numberedNotationLabel: '♯5', accidentalLabel: '♭6' },
      { pitch: 6 as PitchNumber, accidental: '#' as const, leftPercent: 81.1, numberedNotationLabel: '♯6', accidentalLabel: '♭7' },
    ].map(bk => {
      const { noteName, solfege } = getNoteDetails(bk.pitch, octaveNum, bk.accidental);
      return {
        isBlack: true,
        pitch: bk.pitch,
        accidental: bk.accidental,
        octave: octaveNum,
        numberedNotationLabel: bk.numberedNotationLabel,
        accidentalLabel: bk.accidentalLabel,
        solfege,
        noteName,
        leftPercent: bk.leftPercent,
      };
    });

    return { whiteKeys, blackKeys, octaveNum };
  }, [getNoteDetails]);

  // Determine active octaves
  const activeOctaves = useMemo(() => {
    switch (octaveView) {
      case 'mid': return [0];
      case 'low_mid': return [-1, 0];
      case 'mid_high': return [0, 1];
      case 'all': default: return [-1, 0, 1];
    }
  }, [octaveView]);

  const octavesData = useMemo(() => {
    return activeOctaves.map(oct => generateOctaveKeys(oct));
  }, [activeOctaves, generateOctaveKeys]);

  // Check if a key is currently selected in the score
  const isKeyActiveInScore = useCallback((keyDef: KeyDefinition) => {
    if (!currentNote) return false;
    if (currentNote.pitch === 'empty' || currentNote.pitch === 0) return false;

    const curPitch = currentNote.pitch;
    const curOct = currentNote.octave ?? 0;
    const curAcc = currentNote.accidental || '';

    if (curPitch === keyDef.pitch && curOct === keyDef.octave && curAcc === keyDef.accidental) {
      return true;
    }

    if (keyDef.isBlack && curOct === keyDef.octave) {
      if (keyDef.pitch === 1 && keyDef.accidental === '#' && curPitch === 2 && curAcc === 'b') return true;
      if (keyDef.pitch === 2 && keyDef.accidental === '#' && curPitch === 3 && curAcc === 'b') return true;
      if (keyDef.pitch === 4 && keyDef.accidental === '#' && curPitch === 5 && curAcc === 'b') return true;
      if (keyDef.pitch === 5 && keyDef.accidental === '#' && curPitch === 6 && curAcc === 'b') return true;
      if (keyDef.pitch === 6 && keyDef.accidental === '#' && curPitch === 7 && curAcc === 'b') return true;
    }
    return false;
  }, [currentNote]);

  // Tracking active pressed keys & sound voices
  const [activeDownKeyIds, setActiveDownKeyIds] = useState<Set<string>>(new Set());
  const activeVoicesRef = useRef<Map<string, { voiceId: string; startTime: number; keyDef: KeyDefinition }>>(new Map());
  const isPointerDownRef = useRef<boolean>(false);

  // Live held duration ticker for transcribe mode
  const [liveHeldInfo, setLiveHeldInfo] = useState<{
    keyLabel: string;
    elapsedMs: number;
    estimatedBeats: number;
    quantized: QuantizedDurationResult;
  } | null>(null);

  const activeHoldTickerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Unmount cleanup: release any ongoing hold ticker and sustained audio voices
  useEffect(() => {
    return () => {
      if (activeHoldTickerRef.current) {
        clearInterval(activeHoldTickerRef.current);
        activeHoldTickerRef.current = null;
      }
      audioEngine.stopAllSustainedNotes();
    };
  }, [audioEngine]);

  // Metronome audio & visual ticker
  useEffect(() => {
    if (!isMetronomeActive || activeMode !== 'transcribe') {
      setIsMetronomePulse(false);
      return;
    }

    const beatsPerBar = parseInt(timeSignature.split('/')[0], 10) || 4;
    const intervalMs = (60 / Math.max(30, Math.min(240, bpm))) * 1000;
    let b = 1;
    let pulseTimer: ReturnType<typeof setTimeout> | null = null;

    const metroInterval = setInterval(() => {
      setMetronomeBeat(b);
      setIsMetronomePulse(true);
      // Metronome audio click
      try {
        const isDownbeat = b === 1;
        audioEngine.playMetronomeClick(undefined, isDownbeat, true);
      } catch {
        // Fallback silent pulse if audio unavailable
      }
      b = (b % beatsPerBar) + 1;
      if (pulseTimer) clearTimeout(pulseTimer);
      pulseTimer = setTimeout(() => setIsMetronomePulse(false), 120);
    }, intervalMs);

    return () => {
      clearInterval(metroInterval);
      if (pulseTimer) clearTimeout(pulseTimer);
    };
  }, [isMetronomeActive, activeMode, bpm, timeSignature, audioEngine]);

  // Live Duration Ticker when key is held in transcribe mode
  const startLiveHoldTicker = useCallback((keyDef: KeyDefinition, startTime: number) => {
    if (activeHoldTickerRef.current) {
      clearInterval(activeHoldTickerRef.current);
    }

    const msPerBeat = (60 / Math.max(30, Math.min(240, bpm))) * 1000;
    const isEco = typeof document !== 'undefined' && document.documentElement.classList.contains('eco-mode');
    const intervalMs = isEco ? 66 : 40;

    activeHoldTickerRef.current = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const rawBeats = elapsed / msPerBeat;
      const quantized = quantizeDurationToBeats(elapsed, bpm, quantizeGrid, allowTriplets, true);
      const acc = keyDef.accidental || '';
      const dot = keyDef.octave > 0 ? '̇' : keyDef.octave < 0 ? '̣' : '';
      const label = `${acc}${keyDef.pitch}${dot}`;

      setLiveHeldInfo({
        keyLabel: label,
        elapsedMs: Math.round(elapsed),
        estimatedBeats: Math.round(rawBeats * 100) / 100,
        quantized,
      });
    }, intervalMs);
  }, [bpm, quantizeGrid, allowTriplets]);

  const stopLiveHoldTicker = useCallback(() => {
    if (activeHoldTickerRef.current) {
      clearInterval(activeHoldTickerRef.current);
      activeHoldTickerRef.current = null;
    }
    setLiveHeldInfo(null);
  }, []);

  // Primary Key Down Handler
  const handleKeyNoteDown = useCallback((keyDef: KeyDefinition, customKeyId?: string) => {
    const keyId = customKeyId || `${keyDef.octave}-${keyDef.pitch}-${keyDef.accidental || ''}`;
    const voiceId = `deck-${keyId}-${Date.now()}`;
    const now = performance.now();

    // Sound generation
    const tempNote: NumberedNotationNote = {
      id: voiceId,
      pitch: keyDef.pitch,
      octave: keyDef.octave,
      accidental: keyDef.accidental,
      duration: 1,
      lyric: {},
      instrument: activeInstrument,
    };

    audioEngine.startSustainedNote(keySignature, tempNote, voiceId, activeInstrument);

    activeVoicesRef.current.set(keyId, {
      voiceId,
      startTime: now,
      keyDef,
    });

    setActiveDownKeyIds(prev => new Set(prev).add(keyId));

    if (activeMode === 'step') {
      // Step Input Mode: Direct pitch update immediately
      const shouldAdvance = activeProgression === 'auto';
      onSelectPitch(keyDef.pitch, keyDef.octave, keyDef.accidental, shouldAdvance);
    } else {
      // Live Transcribe Mode: Start live duration tracker
      startLiveHoldTicker(keyDef, now);
    }
  }, [activeInstrument, audioEngine, keySignature, activeMode, activeProgression, onSelectPitch, startLiveHoldTicker]);

  // Primary Key Up Handler
  const handleKeyNoteUp = useCallback((customKeyId?: string) => {
    const now = performance.now();

    const commitAndStopVoice = (keyId: string, entry: { voiceId: string; startTime: number; keyDef: KeyDefinition }) => {
      const elapsed = now - entry.startTime;
      const minRingMs = 160;
      const remaining = Math.max(0, minRingMs - elapsed);

      if (remaining > 0) {
        setTimeout(() => {
          audioEngine.stopSustainedNote(entry.voiceId, 0.12);
        }, remaining);
      } else {
        audioEngine.stopSustainedNote(entry.voiceId, 0.12);
      }

      if (activeMode === 'transcribe') {
        const result = quantizeDurationToBeats(elapsed, bpm, quantizeGrid, allowTriplets, true);
        const shouldAdvance = activeProgression === 'auto';

        if (onTranscribeNote) {
          onTranscribeNote(
            entry.keyDef.pitch,
            entry.keyDef.octave,
            entry.keyDef.accidental,
            result.duration,
            result.isDotted,
            result.isTriplet,
            shouldAdvance
          );
        } else {
          onSelectPitch(entry.keyDef.pitch, entry.keyDef.octave, entry.keyDef.accidental, shouldAdvance);
        }
      }
    };

    if (customKeyId) {
      const entry = activeVoicesRef.current.get(customKeyId);
      if (entry) {
        commitAndStopVoice(customKeyId, entry);
        activeVoicesRef.current.delete(customKeyId);
      }
      setActiveDownKeyIds(prev => {
        const next = new Set(prev);
        next.delete(customKeyId);
        return next;
      });
    } else {
      // Release all active voices
      activeVoicesRef.current.forEach((entry, keyId) => {
        commitAndStopVoice(keyId, entry);
      });
      activeVoicesRef.current.clear();
      setActiveDownKeyIds(new Set());
    }

    if (activeVoicesRef.current.size === 0) {
      stopLiveHoldTicker();
    }
  }, [audioEngine, activeMode, bpm, quantizeGrid, allowTriplets, activeProgression, onTranscribeNote, onSelectPitch, stopLiveHoldTicker]);

  // Special Keys (Rest '0', Empty '␣')
  const handleSpecialKeyDown = useCallback((pitch: 0 | 'empty') => {
    const keyId = `special-${pitch}`;
    const shouldAdvance = activeProgression === 'auto';

    if (activeMode === 'step') {
      onSelectPitch(pitch, 0, '', shouldAdvance);
    } else {
      // In transcribe mode, enter standard 1 beat duration or current grid duration
      const gridDur = getGridBeatValue(quantizeGrid) as NoteDuration;
      if (onTranscribeNote) {
        onTranscribeNote(pitch, 0, '', gridDur, false, false, shouldAdvance);
      } else {
        onSelectPitch(pitch, 0, '', shouldAdvance);
      }
    }

    setActiveDownKeyIds(prev => new Set(prev).add(keyId));
    setTimeout(() => {
      setActiveDownKeyIds(prev => {
        const next = new Set(prev);
        next.delete(keyId);
        return next;
      });
    }, 120);
  }, [activeProgression, activeMode, onSelectPitch, quantizeGrid, onTranscribeNote]);

  // Web MIDI Hardware Controller Hook
  const handleMidiMessage = useCallback((event: { data: Uint8Array | number[] }) => {
    const data = event.data;
    if (!data || data.length < 2) return;

    const status = data[0] & 0xf0;
    const noteNumber = data[1];
    const velocity = data.length > 2 ? data[2] : 64;

    if (status === 0x90 && velocity > 0) {
      // Note On
      const pitchInfo = midiToNumberedPitch(noteNumber, keySignature);
      if (pitchInfo.pitch !== 'empty' && pitchInfo.pitch !== 0) {
        const keyDef: KeyDefinition = {
          isBlack: pitchInfo.accidental === '#' || pitchInfo.accidental === 'b',
          pitch: pitchInfo.pitch,
          accidental: pitchInfo.accidental,
          octave: pitchInfo.octave,
          numberedNotationLabel: `${pitchInfo.pitch}`,
          solfege: '',
          noteName: '',
        };
        handleKeyNoteDown(keyDef, `midi-${noteNumber}`);
      }
    } else if (status === 0x80 || (status === 0x90 && velocity === 0)) {
      // Note Off
      handleKeyNoteUp(`midi-${noteNumber}`);
    }
  }, [keySignature, handleKeyNoteDown, handleKeyNoteUp]);

  const midiState = useWebMidi(handleMidiMessage, true);

  // QWERTY Computer Keyboard Typing Listener
  useEffect(() => {
    const activeQwertyKeys = new Set<string>();

    const handleKeyDown = (e: KeyboardEvent) => {
      // Guard: Ignore if user is typing in text inputs or dialogs
      const activeEl = document.activeElement;
      if (
        activeEl &&
        (activeEl.tagName === 'INPUT' ||
          activeEl.tagName === 'TEXTAREA' ||
          (activeEl instanceof HTMLElement && activeEl.isContentEditable))
      ) {
        return;
      }

      if (e.repeat) return; // Prevent OS key repetition bounces

      // Rest note 0 or Spacebar
      if (e.code === 'Digit0' || e.code === 'Numpad0' || e.code === 'Space') {
        e.preventDefault();
        handleSpecialKeyDown(0);
        return;
      }

      // Empty note
      if (e.code === 'Backquote') {
        e.preventDefault();
        handleSpecialKeyDown('empty');
        return;
      }

      // Check musical QWERTY mapping
      const resolved = resolveQwertyKey(e.code, keySignature, 0, 'chromatic_piano');
      if (resolved && resolved.pitch !== 'empty' && resolved.pitch !== 0) {
        e.preventDefault();
        activeQwertyKeys.add(e.code);
        const keyDef: KeyDefinition = {
          isBlack: resolved.isBlack,
          pitch: resolved.pitch,
          accidental: resolved.accidental,
          octave: resolved.octave,
          numberedNotationLabel: resolved.label,
          solfege: resolved.solfege,
          noteName: '',
        };
        handleKeyNoteDown(keyDef, `qwerty-${e.code}`);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (activeQwertyKeys.has(e.code)) {
        activeQwertyKeys.delete(e.code);
        handleKeyNoteUp(`qwerty-${e.code}`);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      handleKeyNoteUp(); // Release everything on unmount
    };
  }, [keySignature, handleKeyNoteDown, handleKeyNoteUp, handleSpecialKeyDown]);

  // Global Pointer Release handlers
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      if (isPointerDownRef.current) {
        isPointerDownRef.current = false;
        handleKeyNoteUp();
      }
    };

    window.addEventListener('pointerup', handleGlobalPointerUp);
    window.addEventListener('pointercancel', handleGlobalPointerUp);
    window.addEventListener('touchend', handleGlobalPointerUp);
    window.addEventListener('touchcancel', handleGlobalPointerUp);
    window.addEventListener('blur', handleGlobalPointerUp);

    return () => {
      window.removeEventListener('pointerup', handleGlobalPointerUp);
      window.removeEventListener('pointercancel', handleGlobalPointerUp);
      window.removeEventListener('touchend', handleGlobalPointerUp);
      window.removeEventListener('touchcancel', handleGlobalPointerUp);
      window.removeEventListener('blur', handleGlobalPointerUp);
      handleKeyNoteUp();
    };
  }, [handleKeyNoteUp]);

  return (
    <div
      id="piano-keyboard-deck"
      className={`relative flex flex-col gap-2 sm:gap-2.5 p-2.5 sm:p-3 bg-zinc-950/98 text-zinc-100 rounded-2xl border border-zinc-800 shadow-2xl backdrop-blur-md select-none ${className}`}
      style={{ touchAction: 'manipulation' }}
    >
      {/* ─── ALWAYS TOP-RIGHT CLOSE BUTTON ─── */}
      {onClose && (
        <button
          id="piano-deck-close-btn"
          type="button"
          onClick={onClose}
          className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 z-30 w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg bg-zinc-900/90 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 border border-zinc-700/60 hover:border-zinc-500 shadow-sm transition-all cursor-pointer touch-manipulation"
          title="Close Piano Deck (Esc)"
        >
          <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
        </button>
      )}

      {/* ─── TOP PRIMARY CONTROL RIBBON (STRICT SINGLE LINE, COMPACT UI) ─── */}
      <div className="flex items-center justify-between flex-nowrap gap-1 sm:gap-1.5 text-xs border-b border-zinc-800/90 pb-1.5 sm:pb-2 pr-8 sm:pr-9 overflow-x-auto no-scrollbar whitespace-nowrap touch-momentum">
        <div className="flex items-center gap-1 sm:gap-1.5 flex-nowrap shrink-0">
          {/* Deck Title / Key Signature */}
          <div
            className="flex items-center gap-1 font-black text-amber-400 bg-amber-950/40 border border-amber-800/50 px-2 py-0.5 sm:py-1 rounded-lg shadow-xs shrink-0 text-[11px]"
            title={`Key Signature: 1 = ${keySignature}`}
          >
            <Music className="w-3 h-3 shrink-0" />
            <span className="font-mono text-zinc-200 font-bold">1={keySignature}</span>
          </div>

          {/* 1. Operational Mode Toggle: Touch vs Transcribe */}
          <div
            id="piano-mode-toggle-group"
            className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-700/80 shadow-inner text-[10px] sm:text-[11px] shrink-0"
          >
            <button
              id="piano-mode-step-btn"
              type="button"
              onClick={() => handleSetMode('step')}
              className={`flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md font-bold transition-all min-h-[26px] cursor-pointer touch-manipulation ${
                activeMode === 'step'
                  ? 'bg-amber-500 text-zinc-950 shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Touch Mode: Tap key to directly set pitch"
            >
              <Keyboard className="w-3 h-3 shrink-0" />
              <span>Touch</span>
            </button>
            <button
              id="piano-mode-transcribe-btn"
              type="button"
              onClick={() => handleSetMode('transcribe')}
              className={`flex items-center gap-1 px-2 py-0.5 sm:py-1 rounded-md font-bold transition-all min-h-[26px] cursor-pointer touch-manipulation ${
                activeMode === 'transcribe'
                  ? 'bg-gradient-to-r from-amber-400 to-amber-500 text-zinc-950 shadow-md ring-1 ring-amber-300 animate-pulse-subtle'
                  : 'text-amber-400/80 hover:text-amber-300 hover:bg-amber-950/20'
              }`}
              title="Live Transcribe Mode: Hold key to record duration"
            >
              <Zap className="w-3 h-3 fill-current shrink-0" />
              <span>Transcribe</span>
            </button>
          </div>

          {/* 2. Progression Toggle: Single vs Auto Advance */}
          <div
            id="piano-progression-toggle-group"
            className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-700/80 shadow-inner text-[10px] sm:text-[11px] shrink-0"
          >
            <button
              id="piano-progression-single-btn"
              type="button"
              onClick={() => handleSetProgression('single')}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-bold transition-all min-h-[26px] cursor-pointer touch-manipulation ${
                activeProgression === 'single'
                  ? 'bg-zinc-200 text-zinc-950 font-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Single: Stay on current cursor note"
            >
              <Target className="w-3 h-3 shrink-0" />
              <span>Single</span>
            </button>
            <button
              id="piano-progression-auto-btn"
              type="button"
              onClick={() => handleSetProgression('auto')}
              className={`flex items-center gap-1 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-bold transition-all min-h-[26px] cursor-pointer touch-manipulation ${
                activeProgression === 'auto'
                  ? 'bg-amber-500 text-zinc-950 font-black shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Auto: Advance cursor automatically after each input"
            >
              <ArrowRight className="w-3 h-3 shrink-0" />
              <span>Auto</span>
            </button>
          </div>

          {/* 3. Octave View Tabs (low_mid, mid_high, all) */}
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[10px] sm:text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setOctaveView('low_mid')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium transition-all min-h-[26px] cursor-pointer ${
                octaveView === 'low_mid'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Low + Mid Octaves (Bass / Mid Register)"
            >
              Low+Mid
            </button>
            <button
              type="button"
              onClick={() => setOctaveView('mid_high')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium transition-all min-h-[26px] cursor-pointer ${
                octaveView === 'mid_high'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Mid + High Octaves (Standard Melody Register)"
            >
              Mid+High
            </button>
            <button
              type="button"
              onClick={() => setOctaveView('all')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium transition-all min-h-[26px] cursor-pointer ${
                octaveView === 'all'
                  ? 'bg-amber-500 text-zinc-950 font-bold shadow-xs'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="All 3 Octaves"
            >
              All
            </button>
          </div>

          {/* 4. Label Display Mode */}
          <div className="flex items-center bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-[10px] sm:text-[11px] shrink-0">
            <button
              type="button"
              onClick={() => setLabelMode('both')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium transition-all min-h-[26px] cursor-pointer ${
                labelMode === 'both' ? 'bg-zinc-700 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Show both Numbered Notation numbers and pitch names"
            >
              1-7+Pitch
            </button>
            <button
              type="button"
              onClick={() => setLabelMode('numberedNotations')}
              className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md font-medium transition-all min-h-[26px] cursor-pointer ${
                labelMode === 'numberedNotations' ? 'bg-zinc-700 text-zinc-100 font-bold' : 'text-zinc-400 hover:text-zinc-200'
              }`}
              title="Show only Numbered Notation 1-7"
            >
              1-7
            </button>
          </div>

          {/* 5. Instrument Selector */}
          <div
            id="piano-instrument-selector"
            className="hidden sm:flex items-center gap-1 bg-zinc-900 px-2 py-0.5 sm:py-1 rounded-lg border border-zinc-800 text-[10px] sm:text-[11px] shrink-0"
            title="Select Melody Instrument"
          >
            <Music className="w-3 h-3 text-amber-500 shrink-0" />
            <select
              id="piano-instrument-select"
              value={activeInstrument}
              onChange={e => handleInstrumentChange(e.target.value as InstrumentType)}
              className="bg-transparent font-bold text-zinc-200 focus:outline-hidden cursor-pointer"
            >
              {CATEGORIZED_INSTRUMENT_OPTIONS.map(group => (
                <optgroup key={group.category} label={group.labelEn}>
                  {group.options.map(opt => (
                    <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100">
                      {opt.shortLabelEn || opt.labelEn}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
        </div>

        {/* MIDI & QWERTY Status Badges */}
        <div className="flex items-center gap-1.5 shrink-0 pl-1">
          {midiState.isConnected ? (
            <span
              className="flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-600/70 text-emerald-400 text-[10px] font-bold shrink-0"
              title={`Hardware MIDI Connected: ${midiState.activeDevice || 'Device Ready'}`}
            >
              <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
              <span>MIDI</span>
            </span>
          ) : (
            <span
              className="hidden lg:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-zinc-900 border border-zinc-700/60 text-zinc-400 text-[10px] font-mono shrink-0"
              title="QWERTY Keys [A-K], [W-P] active for musical typing"
            >
              <Keyboard className="w-2.5 h-2.5 text-amber-400" />
              <span>QWERTY</span>
            </span>
          )}
        </div>
      </div>

      {/* ─── OPTIONAL TRANSCRIBE CONTROLS (ONLY IN TRANSCRIBE MODE) ─── */}
      {activeMode === 'transcribe' && (
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs py-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>Quantize Grid:</span>
            </span>
            <div className="flex items-center bg-zinc-900 p-0.5 rounded-xl border border-zinc-800 text-[11px]">
              {(['quarter', 'eighth', 'sixteenth'] as QuantizeGrid[]).map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setQuantizeGrid(g)}
                  className={`px-2.5 py-1 rounded-lg font-mono font-bold transition-all cursor-pointer ${
                    quantizeGrid === g
                      ? 'bg-amber-500 text-zinc-950 shadow-xs'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`}
                  title={`Snap to ${g === 'quarter' ? '1/4 (♩)' : g === 'eighth' ? '1/8 (♪)' : '1/16 (𝅘𝅥𝅯)'}`}
                >
                  {g === 'quarter' ? '♩ 1/4' : g === 'eighth' ? '♪ 1/8' : '𝅘𝅥𝅯 1/16'}
                </button>
              ))}
            </div>

            {/* Triplet toggle */}
            <button
              type="button"
              onClick={() => setAllowTriplets(prev => !prev)}
              className={`px-2 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                allowTriplets
                  ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title="Allow 3-tuple / Triplet quantization (0.33, 0.67 beats)"
            >
              3-Triplet
            </button>

            {/* Metronome Audio Click Toggle */}
            <button
              id="piano-deck-metronome-btn"
              type="button"
              onClick={() => setIsMetronomeActive(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                isMetronomeActive
                  ? isMetronomePulse
                    ? 'bg-amber-400 text-zinc-950 border-amber-300 font-black scale-105 shadow-sm'
                    : 'bg-amber-600 text-zinc-950 border-amber-500 font-bold'
                  : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
              }`}
              title={`Metronome pulse @ ${bpm} BPM (${timeSignature})`}
            >
              {isMetronomeActive ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
              <span>Metronome @ {bpm} BPM</span>
              {isMetronomeActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-zinc-950 animate-ping ml-0.5" />
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── LIVE REAL-TIME TRANSCRIBE DURATION FEEDBACK BANNER ─── */}
      {activeMode === 'transcribe' && (
        <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-amber-950/30 border border-amber-800/40 text-xs min-h-[36px]">
          {liveHeldInfo ? (
            <div className="flex items-center gap-3 w-full justify-between animate-fade-in">
              <div className="flex items-center gap-2 font-mono font-bold text-amber-300">
                <span className="text-base font-black px-2 py-0.5 rounded bg-amber-500 text-zinc-950">
                  {liveHeldInfo.keyLabel}
                </span>
                <span>Holding: {liveHeldInfo.elapsedMs}ms ({liveHeldInfo.estimatedBeats} beats)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">➔ Quantized:</span>
                <span className="px-2 py-0.5 rounded bg-amber-400 text-zinc-950 font-mono font-black text-xs shadow-xs">
                  {liveHeldInfo.quantized.duration} Beat{liveHeldInfo.quantized.duration > 1 ? 's' : ''}
                  {liveHeldInfo.quantized.isDotted ? ' (Dotted ♩.)' : ''}
                  {liveHeldInfo.quantized.isTriplet ? ' (Triplet)' : ''}
                </span>
                <span className="text-[10px] text-amber-300/80 italic hidden sm:inline">
                  (Release key to transcribe)
                </span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between w-full text-zinc-400 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500/80 animate-ping" />
                <span><strong>No countdown needed!</strong> Press & hold any key anytime to transcribe from current note.</span>
              </div>
              <span className="font-mono text-zinc-500 hidden sm:inline">
                {activeProgression === 'auto' ? '➔ Auto-advances caret on release' : '➔ Keeps cursor on current note'}
              </span>
            </div>
          )}
        </div>
      )}

      {/* ─── PIANO KEYBOARD BED WITH REST & EMPTY PADS ─── */}
      <div className="flex items-stretch gap-2 w-full">
        {/* Left Auxiliary Buttons: Rest (0) & Empty Spacer (␣) */}
        <div className="flex flex-col gap-1.5 w-14 sm:w-16 shrink-0 select-none">
          <button
            id="piano-key-rest"
            type="button"
            onPointerDown={e => {
              e.preventDefault();
              handleSpecialKeyDown(0);
            }}
            className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-xl border transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] ${
              activeDownKeyIds.has('special-0') || currentNote?.pitch === 0
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-md ring-2 ring-amber-400'
                : 'bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border-zinc-700 shadow-xs'
            }`}
            title="Rest (0) [Space / 0]"
          >
            <span className="font-mono text-base sm:text-lg font-black leading-none">0</span>
            <span className="text-[9px] font-sans font-semibold mt-0.5">Rest</span>
          </button>

          <button
            id="piano-key-empty"
            type="button"
            onPointerDown={e => {
              e.preventDefault();
              handleSpecialKeyDown('empty');
            }}
            className={`flex-1 flex flex-col items-center justify-center p-1.5 rounded-xl border border-dashed transition-all active:scale-95 cursor-pointer touch-manipulation min-h-[44px] ${
              activeDownKeyIds.has('special-empty') || currentNote?.pitch === 'empty'
                ? 'bg-amber-500 text-zinc-950 border-amber-400 font-black shadow-md ring-2 ring-amber-400'
                : 'bg-zinc-900/80 hover:bg-zinc-800 text-zinc-300 border-zinc-700 shadow-xs'
            }`}
            title="Empty spacer / punctuation (Empty) [`]"
          >
            <span className="font-mono text-xs font-bold leading-none">␣</span>
            <span className="text-[9px] font-sans mt-0.5">Empty</span>
          </button>
        </div>

        {/* Realistic Interactive Piano Keys Bed */}
        <div
          id="piano-keys-bed"
          style={{ touchAction: 'none' }}
          className="flex-1 flex items-stretch bg-zinc-950 p-1.5 rounded-xl border border-zinc-800 shadow-inner relative min-w-[320px] select-none touch-none overflow-x-auto"
        >
          {octavesData.map((octData, octIdx) => {
            const octLabel =
              octData.octaveNum === -1
                ? 'Low (-1)'
                : octData.octaveNum === 1
                ? 'High (+1)'
                : 'Mid (0)';

            return (
              <div
                key={`piano-oct-${octData.octaveNum}`}
                className="flex-1 relative flex flex-col min-w-[160px]"
              >
                {/* Octave Badge */}
                <div className="absolute top-1 left-2 z-20 pointer-events-none">
                  <span className="text-[8px] font-bold font-mono tracking-tight px-1 py-0.2 rounded bg-zinc-900/90 text-zinc-400 border border-zinc-700/60 backdrop-blur-xs">
                    {octLabel}
                  </span>
                </div>

                {/* Octave Container: White Keys Row + Overlayed Black Keys */}
                <div className="relative flex w-full h-24 sm:h-28">
                  {/* WHITE KEYS */}
                  {octData.whiteKeys.map((wKey, wIdx) => {
                    const keyId = `${octData.octaveNum}-${wKey.pitch}-${wKey.accidental || ''}`;
                    const isDown = activeDownKeyIds.has(keyId);
                    const isInScore = isKeyActiveInScore(wKey);
                    const isFirstInOctave = wIdx === 0;
                    const isLastInOctave = wIdx === octData.whiteKeys.length - 1;

                    return (
                      <button
                        key={`w-${octData.octaveNum}-${wKey.pitch}`}
                        id={`piano-white-key-${octData.octaveNum}-${wKey.pitch}`}
                        type="button"
                        onPointerDown={e => {
                          e.preventDefault();
                          isPointerDownRef.current = true;
                          handleKeyNoteDown(wKey);
                        }}
                        onPointerEnter={() => {
                          if (isPointerDownRef.current) {
                            handleKeyNoteDown(wKey);
                          }
                        }}
                        onPointerLeave={() => {
                          if (isPointerDownRef.current) {
                            handleKeyNoteUp(keyId);
                          }
                        }}
                        onPointerUp={e => {
                          e.preventDefault();
                          isPointerDownRef.current = false;
                          handleKeyNoteUp(keyId);
                        }}
                        className={`group relative flex-1 flex flex-col items-center justify-end pb-2 pt-6 transition-transform duration-75 border-r last:border-r-0 cursor-pointer select-none touch-none ${
                          isDown
                            ? '!bg-amber-400 !border-amber-600 !text-zinc-950 ring-2 ring-amber-500 z-10 shadow-inner font-black translate-y-1'
                            : isInScore
                            ? '!bg-amber-200 dark:!bg-amber-300 !border-amber-500 !text-zinc-950 ring-2 ring-amber-400 z-10 shadow-md font-black'
                            : 'bg-linear-to-b from-zinc-100 via-white to-zinc-200 hover:from-amber-50 hover:to-amber-100 text-zinc-900 border-zinc-300 dark:border-zinc-400 shadow-[0_4px_3px_rgba(0,0,0,0.12)]'
                        } ${isFirstInOctave && octIdx === 0 ? 'rounded-bl-lg' : ''} ${
                          isLastInOctave && octIdx === octavesData.length - 1 ? 'rounded-br-lg' : ''
                        } rounded-b-md border-b-4 ${
                          isDown ? 'border-b-amber-600' : isInScore ? 'border-b-amber-500' : 'border-b-zinc-400'
                        }`}
                        title={`Pitch: ${wKey.numberedNotationLabel} (${wKey.noteName} - ${wKey.solfege})`}
                      >
                        {/* Live active glow */}
                        {(isInScore || isDown) && (
                          <div className="absolute top-2 w-2 h-2 rounded-full bg-amber-600 animate-ping" />
                        )}

                        {/* Top Octave Dot */}
                        {wKey.octave > 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mb-0.5 ${
                              isDown || isInScore ? 'bg-zinc-950' : 'bg-zinc-900'
                            }`}
                          />
                        )}

                        {/* Numbered Notation Pitch Number */}
                        {(labelMode === 'both' || labelMode === 'numberedNotations') && (
                          <span
                            className={`font-mono text-base sm:text-lg font-black leading-none ${
                              isDown || isInScore ? 'text-zinc-950 scale-110' : 'text-zinc-900'
                            }`}
                          >
                            {wKey.numberedNotationLabel}
                          </span>
                        )}

                        {/* Bottom Octave Dot */}
                        {wKey.octave < 0 && (
                          <span
                            className={`w-1.5 h-1.5 rounded-full mt-0.5 ${
                              isDown || isInScore ? 'bg-zinc-950' : 'bg-zinc-900'
                            }`}
                          />
                        )}

                        {/* Note Name & Solfege */}
                        {(labelMode === 'both' || labelMode === 'note') && (
                          <span
                            className={`text-[9px] sm:text-[10px] font-semibold mt-0.5 leading-tight ${
                              isDown || isInScore ? 'text-zinc-900 font-bold' : 'text-zinc-600'
                            }`}
                          >
                            {wKey.noteName}
                          </span>
                        )}
                      </button>
                    );
                  })}

                  {/* BLACK KEYS (OVERLAYED WITH PRECISE PIANO SPACING) */}
                  {octData.blackKeys.map(bKey => {
                    const bKeyId = `${octData.octaveNum}-${bKey.pitch}-${bKey.accidental || ''}`;
                    const isDown = activeDownKeyIds.has(bKeyId);
                    const isInScore = isKeyActiveInScore(bKey);

                    return (
                      <button
                        key={`b-${octData.octaveNum}-${bKey.pitch}-${bKey.accidental}`}
                        id={`piano-black-key-${octData.octaveNum}-${bKey.pitch}-${bKey.accidental}`}
                        type="button"
                        style={{ left: `${bKey.leftPercent}%` }}
                        onPointerDown={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          isPointerDownRef.current = true;
                          handleKeyNoteDown(bKey);
                        }}
                        onPointerEnter={() => {
                          if (isPointerDownRef.current) {
                            handleKeyNoteDown(bKey);
                          }
                        }}
                        onPointerLeave={() => {
                          if (isPointerDownRef.current) {
                            handleKeyNoteUp(bKeyId);
                          }
                        }}
                        onPointerUp={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          isPointerDownRef.current = false;
                          handleKeyNoteUp(bKeyId);
                        }}
                        className={`absolute top-0 w-[8.2%] h-14 sm:h-16 z-20 flex flex-col items-center justify-end pb-1 rounded-b-md transition-all duration-75 border border-zinc-900 cursor-pointer select-none touch-none shadow-md ${
                          isDown
                            ? '!bg-amber-400 !border-amber-600 !text-zinc-950 ring-2 ring-amber-500 shadow-inner font-black translate-y-0.5'
                            : isInScore
                            ? '!bg-amber-300 !border-amber-500 !text-zinc-950 ring-2 ring-amber-400 shadow-lg font-black'
                            : 'bg-linear-to-b from-zinc-800 via-zinc-900 to-black hover:from-zinc-700 text-zinc-100 border-b-4 border-b-zinc-950'
                        }`}
                        title={`Accidental Pitch: ${bKey.numberedNotationLabel} / ${bKey.accidentalLabel} (${bKey.noteName})`}
                      >
                        {/* Top Octave Dot */}
                        {bKey.octave > 0 && (
                          <span
                            className={`w-1 h-1 rounded-full mb-0.5 ${
                              isDown || isInScore ? 'bg-zinc-950' : 'bg-zinc-100'
                            }`}
                          />
                        )}

                        {/* Numbered Notation Label */}
                        {(labelMode === 'both' || labelMode === 'numberedNotations') && (
                          <span
                            className={`font-mono text-[10px] sm:text-xs font-black leading-none ${
                              isDown || isInScore ? 'text-zinc-950' : 'text-amber-400'
                            }`}
                          >
                            {bKey.numberedNotationLabel}
                          </span>
                        )}

                        {/* Bottom Octave Dot */}
                        {bKey.octave < 0 && (
                          <span
                            className={`w-1 h-1 rounded-full mt-0.5 ${
                              isDown || isInScore ? 'bg-zinc-950' : 'bg-zinc-100'
                            }`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});

PianoKeyboard.displayName = 'PianoKeyboard';
