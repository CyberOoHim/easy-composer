'use client';

import type { Song, LyricDisplayMode, InstrumentType, EditorEditMode, NoteEditSubMode, NoteInputMode, Measure, NumberedNotationNote, SheetWrapMode, SheetOrientation } from '../types/song.ts';
import { PRESET_SONGS } from './presets.ts';

export const STORAGE_KEYS = {
  ACTIVE_TAB: 'taigi_composer_active_tab',
  LYRIC_DISPLAY_MODE: 'taigi_composer_lyric_display_mode',
  CURRENT_SONG: 'taigi_composer_current_song',
  CUSTOM_LIBRARY: 'taigi_composer_custom_library',
  POWER_SAVE_MODE: 'taigi_composer_power_save_mode',
  INSTRUMENT: 'taigi_composer_instrument',
  MELODY_VOLUME: 'taigi_composer_melody_volume',
  BACKING_VOLUME: 'taigi_composer_backing_volume',
  CHORD_ENABLED: 'taigi_composer_chord_enabled',
  METRONOME_ENABLED: 'taigi_composer_metronome_enabled',
  METRONOME_VOLUME: 'taigi_composer_metronome_volume',
  TRANSPOSE: 'taigi_composer_transpose',
  TEMPO_MULTIPLIER: 'taigi_composer_tempo_multiplier',
  SHOW_MIXER: 'taigi_composer_show_mixer',
  STAGE_MODE_ZOOM: 'taigi_composer_stage_zoom',
  UI_TEXT_ZOOM: 'taigi_composer_ui_text_zoom',
  NOTE_ZOOM: 'taigi_composer_note_zoom',
  LYRIC_ZOOM: 'taigi_composer_lyric_zoom',
  KARAOKE_LEAD_IN_ENABLED: 'taigi_karaoke_lead_in_enabled',
  EDITOR_EDIT_MODE: 'taigi_composer_editor_edit_mode',
  NOTE_SUB_MODE: 'taigi_composer_note_sub_mode',
  NOTE_INPUT_MODE: 'taigi_composer_note_input_mode',
  SHOW_RHYTHM_WARNINGS: 'taigi_composer_show_rhythm_warnings',
  AUTO_STEP_ADVANCE: 'taigi_composer_auto_step_advance',
  DECK_TAB: 'taigi_composer_deck_tab',
  AUTOSAVE_INTERVAL: 'taigi_composer_autosave_interval',
  KARAOKE_STAGE_THEME: 'taigi_karaoke_stage_theme',
  REAL_SHEET_THEME: 'taigi_real_sheet_theme',
  REAL_SHEET_WRAP_MODE: 'real_sheet_wrap_mode',
  REAL_SHEET_ORIENTATION: 'real_sheet_orientation',
  KARAOKE_SHOW_NOTATION: 'taigi_karaoke_show_notation',
  KARAOKE_LAYOUT_MODE: 'taigi_karaoke_layout_mode',
  KARAOKE_LYRIC_ALIGN: 'taigi_karaoke_lyric_align',
  ECO_PROMPT_DISMISSED: 'taigi_composer_eco_prompt_dismissed',
  PWA_PROMPT_DISMISSED: 'taigi_pwa_prompt_dismissed',
  // Piano Deck Selections
  PIANO_OCTAVE_VIEW: 'taigi_composer_piano_octave_view',
  PIANO_LABEL_MODE: 'taigi_composer_piano_label_mode',
  PIANO_QUANTIZE_GRID: 'taigi_composer_piano_quantize_grid',
  PIANO_ALLOW_TRIPLETS: 'taigi_composer_piano_allow_triplets',
  PIANO_DECK_MODE: 'taigi_composer_piano_deck_mode',
  // Score Sheet & Layout Selections
  SHEET_ZOOM: 'taigi_composer_sheet_zoom',
  HUD_DRAWER: 'taigi_composer_hud_drawer',
  // Song Metadata Header Selections
  AUTO_TRANSPOSE_CHORDS: 'taigi_composer_auto_transpose_chords',
  SYNC_ALL_MEASURES: 'taigi_composer_sync_all_measures',
  // Quick Lyric Aligner Selections
  QUICK_ALIGN_TARGET: 'taigi_composer_quick_align_target',
  // MIDI & Score Export Selections
  EXPORT_FORMAT: 'taigi_composer_export_format',
  MIDI_INSTRUMENT: 'taigi_composer_midi_instrument',
  MIDI_LYRIC_TYPE: 'taigi_composer_midi_lyric_type',
  MIDI_FORMAT: 'taigi_composer_midi_format',
  MIDI_ACCOMPANIMENT: 'taigi_composer_midi_accompaniment',
  MIDI_KARAOKE_TRACK: 'taigi_composer_midi_karaoke_track',
  MIDI_MELODY_LYRICS: 'taigi_composer_midi_melody_lyrics',
  // Search Preferences
  SEARCH_SCOPE: 'taigi_composer_search_scope',
  SEARCH_MATCH_FILTER: 'taigi_composer_search_match_filter',
  IN_SONG_FILTER: 'taigi_composer_in_song_filter',
} as const;

export type ActiveTabMode = 'karaoke' | 'editor' | 'split';
export type DeckTabMode = 'numpad' | 'piano' | 'chords' | 'ornaments' | 'lyrics';
export type KaraokeStageTheme = 'dark' | 'daylight';
export type KaraokeLayoutMode = 'two_line' | 'single_line';
export type KaraokeLyricAlign = 'center' | 'left';
export type PianoOctaveView = 'low_mid' | 'mid_high' | 'all' | 'mid';
export type PianoLabelMode = 'both' | 'numberedNotations' | 'note';
export type PianoQuantizeGrid = 'quarter' | 'eighth' | 'sixteenth' | 'thirtysecond';
export type PianoDeckMode = 'step' | 'transcribe';
export type HudDrawerType = 'none' | 'piano' | 'ornaments' | 'chords' | 'edit';
export type ExportFormat = 'json' | 'text' | 'midi';
export type MidiLyricMode = 'hanlo' | 'poj' | 'both' | 'none';
export type SearchScope = 'all' | 'current';
export type SearchMatchFilter = 'all' | 'measure' | 'verse';
export type InSongFilter = 'all' | 'measure' | 'verse';
export type QuickAlignTarget = 'roman' | 'hanlo' | 'dual';
export type { NoteInputMode, SheetWrapMode, SheetOrientation };

/**
 * Safe local storage getter with fallback
 */
export function safeGetItem(key: string): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(key);
  } catch (err) {
    console.warn(`[storage] Failed to read key "${key}":`, err);
    return null;
  }
}

/**
 * Safe local storage setter with boolean success status
 */
export function safeSetItem(key: string, value: string): boolean {
  if (typeof window === 'undefined') return false;
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.error(`[storage] Storage quota exceeded or blocked for key "${key}":`, err);
    return false;
  }
}

// ============================================================================
// 1. ACTIVE VIEW TAB (Default: 'split')
// ============================================================================
export function getStoredActiveTab(): ActiveTabMode {
  const val = safeGetItem(STORAGE_KEYS.ACTIVE_TAB);
  if (val === 'split' || val === 'karaoke' || val === 'editor') {
    return val;
  }
  return 'split'; // Default to split view
}

/** Distinguishes "user never chose a tab" from the split default. */
export function getStoredActiveTabOrNull(): ActiveTabMode | null {
  const val = safeGetItem(STORAGE_KEYS.ACTIVE_TAB);
  if (val === 'split' || val === 'karaoke' || val === 'editor') {
    return val;
  }
  return null;
}

export function setStoredActiveTab(tab: ActiveTabMode): void {
  safeSetItem(STORAGE_KEYS.ACTIVE_TAB, tab);
}

// ============================================================================
// 2. LYRIC DISPLAY MODE (Default: 'roman_major_hanlo')
// ============================================================================
export function getStoredDisplayMode(): LyricDisplayMode {
  const val = safeGetItem(STORAGE_KEYS.LYRIC_DISPLAY_MODE);
  if (val === 'roman' || val === 'hanlo' || val === 'roman_major_hanlo' || val === 'hanlo_major_roman') {
    return val;
  }
  // Migration support for legacy stored preferences:
  if (val === 'poj_only' || val === 'tl_only') return 'roman';
  if (val === 'hanji_only' || val === 'custom_only') return 'hanlo';
  if (val === 'hanji_poj') return 'hanlo_major_roman';
  if (val === 'all' || val === 'hanji_tl' || val === 'hanji_pij') return 'roman_major_hanlo';

  return 'roman_major_hanlo';
}

export function setStoredDisplayMode(mode: LyricDisplayMode): void {
  safeSetItem(STORAGE_KEYS.LYRIC_DISPLAY_MODE, mode);
}

// ============================================================================
// 3. CURRENT ACTIVE SONG (Default: PRESET_SONGS[0])
// ============================================================================
export function getStoredCurrentSong(): Song {
  const raw = safeGetItem(STORAGE_KEYS.CURRENT_SONG);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.id && Array.isArray(parsed.measures) && parsed.measures.length > 0) {
        const song = parsed as Song;
        song.measures.forEach(m => {
          if (Array.isArray(m.notes)) {
            m.notes.forEach(n => {
              if (n && n.lyric) {
                if (!n.lyric.poj && n.lyric.tl) n.lyric.poj = n.lyric.tl;
                if (!n.lyric.hanlo) {
                  n.lyric.hanlo = n.lyric.custom || n.lyric.hanji || '';
                }
              }
            });
          }
        });
        return song;
      }
    } catch {
      // JSON parse error, fallback
    }
  }
  return PRESET_SONGS[0];
}

export function setStoredCurrentSong(song: Song): boolean {
  try {
    return safeSetItem(STORAGE_KEYS.CURRENT_SONG, JSON.stringify(song));
  } catch {
    return false;
  }
}

// ============================================================================
// 4. CUSTOM SONG LIBRARY (User-saved songs)
// ============================================================================
export function getStoredCustomLibrary(): Song[] {
  const raw = safeGetItem(STORAGE_KEYS.CUSTOM_LIBRARY);
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed as Song[];
      }
    } catch {
      // ignore
    }
  }
  return [];
}

export function setStoredCustomLibrary(songs: Song[]): boolean {
  try {
    return safeSetItem(STORAGE_KEYS.CUSTOM_LIBRARY, JSON.stringify(songs));
  } catch (err) {
    console.error('[storage] Failed to serialize custom library:', err);
    return false;
  }
}

export interface SaveSongResult {
  success: boolean;
  library: Song[];
  error?: string;
}

export function saveSongToCustomLibraryWithResult(song: Song): SaveSongResult {
  const library = getStoredCustomLibrary();
  const existingIdx = library.findIndex(s => s.id === song.id);
  let updated: Song[];
  if (existingIdx !== -1) {
    updated = [...library];
    updated[existingIdx] = song;
  } else {
    updated = [song, ...library];
  }
  const success = setStoredCustomLibrary(updated);
  return {
    success,
    library: success ? updated : library,
    error: success ? undefined : 'Save failed: Local storage is full. Please clear space or export a JSON backup.',
  };
}

export function saveSongToCustomLibrary(song: Song): Song[] {
  const res = saveSongToCustomLibraryWithResult(song);
  return res.library;
}

export interface DeleteSongResult {
  success: boolean;
  library: Song[];
  error?: string;
}

export function deleteSongFromCustomLibraryWithResult(songId: string): DeleteSongResult {
  const library = getStoredCustomLibrary();
  const updated = library.filter(s => s.id !== songId);
  const success = setStoredCustomLibrary(updated);
  return {
    success,
    library: success ? updated : library,
    error: success ? undefined : 'Delete failed: Local storage write failed.',
  };
}

export function deleteSongFromCustomLibrary(songId: string): Song[] {
  const res = deleteSongFromCustomLibraryWithResult(songId);
  return res.library;
}

// ============================================================================
// 5. AUDIO / KARAOKE CONTROLS
// ============================================================================
export function getStoredInstrument(): InstrumentType {
  const val = safeGetItem(STORAGE_KEYS.INSTRUMENT);
  if (val === 'piano' || val === 'flute' || val === 'whistle' || val === 'guitar' || val === 'synth' || val === 'bell' || val === 'cello') {
    return val;
  }
  return 'piano';
}

export function setStoredInstrument(inst: InstrumentType): void {
  safeSetItem(STORAGE_KEYS.INSTRUMENT, inst);
}

export function getStoredMelodyVolume(defaultVal = 0.85): number {
  const val = safeGetItem(STORAGE_KEYS.MELODY_VOLUME);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 1) return num;
  }
  return defaultVal;
}

export function setStoredMelodyVolume(vol: number): void {
  safeSetItem(STORAGE_KEYS.MELODY_VOLUME, String(vol));
}

export function getStoredBackingVolume(defaultVal = 0.6): number {
  const val = safeGetItem(STORAGE_KEYS.BACKING_VOLUME);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 1) return num;
  }
  return defaultVal;
}

export const CHORD_SETTINGS_EVENT = 'taigi_composer_chord_settings_change';

export function setStoredBackingVolume(vol: number): void {
  safeSetItem(STORAGE_KEYS.BACKING_VOLUME, String(vol));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHORD_SETTINGS_EVENT, { detail: { chordVolume: vol } }));
  }
}

export function getStoredChordEnabled(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.CHORD_ENABLED);
  if (val !== null) {
    return val === 'true';
  }
  return defaultVal;
}

export function setStoredChordEnabled(enabled: boolean): void {
  safeSetItem(STORAGE_KEYS.CHORD_ENABLED, String(enabled));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(CHORD_SETTINGS_EVENT, { detail: { chordEnabled: enabled } }));
  }
}

export const METRONOME_SETTINGS_EVENT = 'taigi_composer_metronome_settings_change';

export function getStoredMetronomeEnabled(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.METRONOME_ENABLED);
  if (val !== null) {
    return val === 'true';
  }
  return defaultVal;
}

export function setStoredMetronomeEnabled(enabled: boolean): void {
  safeSetItem(STORAGE_KEYS.METRONOME_ENABLED, String(enabled));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(METRONOME_SETTINGS_EVENT, { detail: { metronomeEnabled: enabled } }));
  }
}

export function getStoredMetronomeVolume(defaultVal = 0.45): number {
  const val = safeGetItem(STORAGE_KEYS.METRONOME_VOLUME);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0 && num <= 1) {
      // If the previously saved default was the old whisper-quiet 0.15, upgrade to 0.45 for audible clarity
      if (Math.abs(num - 0.15) < 0.01) return 0.45;
      return num;
    }
  }
  return defaultVal;
}

export function setStoredMetronomeVolume(vol: number): void {
  safeSetItem(STORAGE_KEYS.METRONOME_VOLUME, String(vol));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(METRONOME_SETTINGS_EVENT, { detail: { metronomeVolume: vol } }));
  }
}

export function getStoredTranspose(defaultVal = 0): number {
  const val = safeGetItem(STORAGE_KEYS.TRANSPOSE);
  if (val !== null) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= -12 && num <= 12) return num;
  }
  return defaultVal;
}

export function setStoredTranspose(transpose: number): void {
  safeSetItem(STORAGE_KEYS.TRANSPOSE, String(transpose));
}

export function getStoredTempoMultiplier(defaultVal = 1.0): number {
  const val = safeGetItem(STORAGE_KEYS.TEMPO_MULTIPLIER);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.5 && num <= 2.0) return num;
  }
  return defaultVal;
}

export function setStoredTempoMultiplier(mul: number): void {
  safeSetItem(STORAGE_KEYS.TEMPO_MULTIPLIER, String(mul));
}

export function getStoredShowMixer(defaultVal = false): boolean {
  const val = safeGetItem(STORAGE_KEYS.SHOW_MIXER);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredShowMixer(show: boolean): void {
  safeSetItem(STORAGE_KEYS.SHOW_MIXER, String(show));
}

export function getStoredStageZoom(defaultVal = 1.0): number {
  const val = safeGetItem(STORAGE_KEYS.STAGE_MODE_ZOOM);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 1.0 && num <= 2.0) return num;
  }
  return defaultVal;
}

export function setStoredStageZoom(zoom: number): void {
  safeSetItem(STORAGE_KEYS.STAGE_MODE_ZOOM, String(zoom));
}

export function getStoredUiZoom(defaultVal = 1.0): number {
  const val = safeGetItem(STORAGE_KEYS.UI_TEXT_ZOOM);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.7 && num <= 2.0) return num;
  }
  return defaultVal;
}

export function setStoredUiZoom(zoom: number): void {
  safeSetItem(STORAGE_KEYS.UI_TEXT_ZOOM, String(zoom));
}

export const NOTE_ZOOM_EVENT = 'taigi_composer_note_zoom_change';
export const LYRIC_ZOOM_EVENT = 'taigi_composer_lyric_zoom_change';

export function getStoredNoteZoom(defaultVal = 1.0): number {
  const val = safeGetItem(STORAGE_KEYS.NOTE_ZOOM);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.6 && num <= 2.2) return Math.round(num * 10) / 10;
  }
  return defaultVal;
}

export function setStoredNoteZoom(zoom: number): void {
  const clamped = Math.min(2.0, Math.max(0.6, Math.round(zoom * 10) / 10));
  safeSetItem(STORAGE_KEYS.NOTE_ZOOM, String(clamped));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTE_ZOOM_EVENT, { detail: { zoom: clamped } }));
  }
}

export function getStoredLyricZoom(defaultVal = 1.0): number {
  const val = safeGetItem(STORAGE_KEYS.LYRIC_ZOOM);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.6 && num <= 2.2) return Math.round(num * 10) / 10;
  }
  return defaultVal;
}

export function setStoredLyricZoom(zoom: number): void {
  const clamped = Math.min(2.0, Math.max(0.6, Math.round(zoom * 10) / 10));
  safeSetItem(STORAGE_KEYS.LYRIC_ZOOM, String(clamped));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LYRIC_ZOOM_EVENT, { detail: { zoom: clamped } }));
  }
}

// ============================================================================
// 6. COMPOSER EDITOR SETTINGS
// ============================================================================
export function getStoredEditorEditMode(): EditorEditMode {
  const val = safeGetItem(STORAGE_KEYS.EDITOR_EDIT_MODE);
  if (val === 'note' || val === 'sheet') return val;
  if (val === 'verse' || val === 'measure') return 'sheet';
  return 'sheet';
}

export function setStoredEditorEditMode(mode: EditorEditMode): void {
  safeSetItem(STORAGE_KEYS.EDITOR_EDIT_MODE, mode);
}

export function getStoredNoteSubMode(): NoteEditSubMode {
  const val = safeGetItem(STORAGE_KEYS.NOTE_SUB_MODE);
  if (val === 'verse' || val === 'measure') return val;
  // If legacy editor edit mode was measure, respect it
  const legacyEditMode = safeGetItem(STORAGE_KEYS.EDITOR_EDIT_MODE);
  if (legacyEditMode === 'measure') return 'measure';
  return 'verse';
}

export function setStoredNoteSubMode(mode: NoteEditSubMode): void {
  safeSetItem(STORAGE_KEYS.NOTE_SUB_MODE, mode);
}

export function getStoredAutoStepAdvance(defaultVal = false): boolean {
  const val = safeGetItem(STORAGE_KEYS.AUTO_STEP_ADVANCE);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredAutoStepAdvance(advance: boolean): void {
  safeSetItem(STORAGE_KEYS.AUTO_STEP_ADVANCE, String(advance));
}

export function getStoredDeckTab(): DeckTabMode {
  const val = safeGetItem(STORAGE_KEYS.DECK_TAB);
  if (val === 'numpad' || val === 'piano' || val === 'chords' || val === 'ornaments' || val === 'lyrics') return val;
  return 'numpad';
}

export function setStoredDeckTab(tab: DeckTabMode): void {
  safeSetItem(STORAGE_KEYS.DECK_TAB, tab);
}

export function getStoredLeadInEnabled(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.KARAOKE_LEAD_IN_ENABLED);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredLeadInEnabled(enabled: boolean): void {
  safeSetItem(STORAGE_KEYS.KARAOKE_LEAD_IN_ENABLED, String(enabled));
}

// ============================================================================
// 7. AUTOSAVE INTERVAL (Default: 0 = Manual Save only)
// Options in ms: 0 (manual), 60000 (1m), 180000 (3m), 300000 (5m), 600000 (10m)
// ============================================================================
export function getStoredAutosaveInterval(defaultVal = 0): number {
  const val = safeGetItem(STORAGE_KEYS.AUTOSAVE_INTERVAL);
  if (val !== null) {
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) return num;
  }
  return defaultVal;
}

export function setStoredAutosaveInterval(intervalMs: number): void {
  safeSetItem(STORAGE_KEYS.AUTOSAVE_INTERVAL, String(intervalMs));
}

// ============================================================================
// 8. KARAOKE STAGE READABILITY PREFERENCES
// ============================================================================
export function getStoredStageTheme(defaultVal: KaraokeStageTheme = 'dark'): KaraokeStageTheme {
  const val = safeGetItem(STORAGE_KEYS.KARAOKE_STAGE_THEME);
  if (val === 'dark' || val === 'daylight') return val;
  return defaultVal;
}

export function setStoredStageTheme(theme: KaraokeStageTheme): void {
  safeSetItem(STORAGE_KEYS.KARAOKE_STAGE_THEME, theme);
}

export type RealSheetTheme = 'light' | 'dark';

export function getStoredRealSheetTheme(defaultVal: RealSheetTheme = 'dark'): RealSheetTheme {
  const val = safeGetItem(STORAGE_KEYS.REAL_SHEET_THEME);
  if (val === 'light' || val === 'dark') return val;
  return defaultVal;
}

export function setStoredRealSheetTheme(theme: RealSheetTheme): void {
  safeSetItem(STORAGE_KEYS.REAL_SHEET_THEME, theme);
}

export function getStoredShowNotation(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.KARAOKE_SHOW_NOTATION);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredShowNotation(show: boolean): void {
  safeSetItem(STORAGE_KEYS.KARAOKE_SHOW_NOTATION, String(show));
}

export function getStoredLayoutMode(defaultVal: KaraokeLayoutMode = 'two_line'): KaraokeLayoutMode {
  const val = safeGetItem(STORAGE_KEYS.KARAOKE_LAYOUT_MODE);
  if (val === 'two_line' || val === 'single_line') return val;
  return defaultVal;
}

export function setStoredLayoutMode(mode: KaraokeLayoutMode): void {
  safeSetItem(STORAGE_KEYS.KARAOKE_LAYOUT_MODE, mode);
}

export function getStoredLyricAlign(defaultVal: KaraokeLyricAlign = 'center'): KaraokeLyricAlign {
  const val = safeGetItem(STORAGE_KEYS.KARAOKE_LYRIC_ALIGN);
  if (val === 'center' || val === 'left') return val;
  return defaultVal;
}

export function setStoredLyricAlign(align: KaraokeLyricAlign): void {
  safeSetItem(STORAGE_KEYS.KARAOKE_LYRIC_ALIGN, align);
}

// ============================================================================
// 9. CHORD ENABLED PREFERENCE
// ============================================================================
export function getStoredEnableChords(defaultVal = true): boolean {
  return getStoredChordEnabled(defaultVal);
}

export function setStoredEnableChords(enabled: boolean): void {
  setStoredChordEnabled(enabled);
}

// ============================================================================
// 10. NOTE INPUT MODE & RHYTHM WARNINGS PREFERENCES
// ============================================================================
export function getStoredNoteInputMode(defaultVal: NoteInputMode = 'progressive_replace'): NoteInputMode {
  const val = safeGetItem(STORAGE_KEYS.NOTE_INPUT_MODE);
  if (val === 'replace' || val === 'progressive_replace' || val === 'progressive_insert') {
    return val;
  }
  return defaultVal;
}

export function setStoredNoteInputMode(mode: NoteInputMode): void {
  safeSetItem(STORAGE_KEYS.NOTE_INPUT_MODE, mode);
}

export function getStoredShowRhythmWarnings(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.SHOW_RHYTHM_WARNINGS);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredShowRhythmWarnings(show: boolean): void {
  safeSetItem(STORAGE_KEYS.SHOW_RHYTHM_WARNINGS, String(show));
}

// ============================================================================
// 11. PIANO KEYBOARD PREFERENCES
// ============================================================================
export function getStoredPianoOctaveView(defaultVal: PianoOctaveView = 'low_mid'): PianoOctaveView {
  const val = safeGetItem(STORAGE_KEYS.PIANO_OCTAVE_VIEW);
  if (val === 'low_mid' || val === 'mid_high' || val === 'all' || val === 'mid') {
    return val;
  }
  return defaultVal;
}

export function setStoredPianoOctaveView(view: PianoOctaveView): void {
  safeSetItem(STORAGE_KEYS.PIANO_OCTAVE_VIEW, view);
}

export function getStoredPianoLabelMode(defaultVal: PianoLabelMode = 'both'): PianoLabelMode {
  const val = safeGetItem(STORAGE_KEYS.PIANO_LABEL_MODE);
  if (val === 'both' || val === 'numberedNotations' || val === 'note') {
    return val;
  }
  return defaultVal;
}

export function setStoredPianoLabelMode(mode: PianoLabelMode): void {
  safeSetItem(STORAGE_KEYS.PIANO_LABEL_MODE, mode);
}

export function getStoredPianoQuantizeGrid(defaultVal: PianoQuantizeGrid = 'eighth'): PianoQuantizeGrid {
  const val = safeGetItem(STORAGE_KEYS.PIANO_QUANTIZE_GRID);
  if (val === 'quarter' || val === 'eighth' || val === 'sixteenth' || val === 'thirtysecond') {
    return val;
  }
  return defaultVal;
}

export function setStoredPianoQuantizeGrid(grid: PianoQuantizeGrid): void {
  safeSetItem(STORAGE_KEYS.PIANO_QUANTIZE_GRID, grid);
}

export function getStoredPianoAllowTriplets(defaultVal = false): boolean {
  const val = safeGetItem(STORAGE_KEYS.PIANO_ALLOW_TRIPLETS);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredPianoAllowTriplets(allow: boolean): void {
  safeSetItem(STORAGE_KEYS.PIANO_ALLOW_TRIPLETS, String(allow));
}

export function getStoredPianoDeckMode(defaultVal: PianoDeckMode = 'step'): PianoDeckMode {
  const val = safeGetItem(STORAGE_KEYS.PIANO_DECK_MODE);
  if (val === 'step' || val === 'transcribe') return val;
  return defaultVal;
}

export function setStoredPianoDeckMode(mode: PianoDeckMode): void {
  safeSetItem(STORAGE_KEYS.PIANO_DECK_MODE, mode);
}

// ============================================================================
// 12. SCORE SHEET CANVAS ZOOM & HUD PREFERENCES
// ============================================================================
export const SHEET_ZOOM_EVENT = 'taigi_composer_sheet_zoom_change';

export function getStoredSheetZoom(defaultVal = 1.0): number {
  const val = safeGetItem(STORAGE_KEYS.SHEET_ZOOM);
  if (val !== null) {
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0.7 && num <= 1.6) {
      return Math.round(num * 10) / 10;
    }
  }
  return defaultVal;
}

export function setStoredSheetZoom(zoom: number): void {
  const clamped = Math.min(1.6, Math.max(0.7, Math.round(zoom * 10) / 10));
  safeSetItem(STORAGE_KEYS.SHEET_ZOOM, String(clamped));
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SHEET_ZOOM_EVENT, { detail: { zoom: clamped } }));
  }
}

export function getStoredHudDrawer(defaultVal: HudDrawerType = 'none'): HudDrawerType {
  const val = safeGetItem(STORAGE_KEYS.HUD_DRAWER);
  if (val === 'none' || val === 'piano' || val === 'ornaments' || val === 'chords' || val === 'edit') {
    return val;
  }
  return defaultVal;
}

export function setStoredHudDrawer(drawer: HudDrawerType): void {
  safeSetItem(STORAGE_KEYS.HUD_DRAWER, drawer);
}

// ============================================================================
// 13. SONG METADATA HEADER PREFERENCES
// ============================================================================
export function getStoredAutoTransposeChords(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.AUTO_TRANSPOSE_CHORDS);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredAutoTransposeChords(val: boolean): void {
  safeSetItem(STORAGE_KEYS.AUTO_TRANSPOSE_CHORDS, String(val));
}

export function getStoredSyncAllMeasures(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.SYNC_ALL_MEASURES);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredSyncAllMeasures(val: boolean): void {
  safeSetItem(STORAGE_KEYS.SYNC_ALL_MEASURES, String(val));
}

// ============================================================================
// 14. IMPORT / EXPORT & MIDI PREFERENCES
// ============================================================================
export function getStoredExportFormat(defaultVal: ExportFormat = 'json'): ExportFormat {
  const val = safeGetItem(STORAGE_KEYS.EXPORT_FORMAT);
  if (val === 'json' || val === 'text' || val === 'midi') return val;
  return defaultVal;
}

export function setStoredExportFormat(format: ExportFormat): void {
  safeSetItem(STORAGE_KEYS.EXPORT_FORMAT, format);
}

export function getStoredMidiLyricType(defaultVal: MidiLyricMode = 'hanlo'): MidiLyricMode {
  const val = safeGetItem(STORAGE_KEYS.MIDI_LYRIC_TYPE);
  if (val === 'hanlo' || val === 'poj' || val === 'both' || val === 'none') return val;
  return defaultVal;
}

export function setStoredMidiLyricType(type: MidiLyricMode): void {
  safeSetItem(STORAGE_KEYS.MIDI_LYRIC_TYPE, type);
}

export function getStoredMidiFormat(defaultVal: 'mid' | 'kar' = 'mid'): 'mid' | 'kar' {
  const val = safeGetItem(STORAGE_KEYS.MIDI_FORMAT);
  if (val === 'mid' || val === 'kar') return val;
  return defaultVal;
}

export function setStoredMidiFormat(format: 'mid' | 'kar'): void {
  safeSetItem(STORAGE_KEYS.MIDI_FORMAT, format);
}

export function getStoredMidiAccompaniment(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.MIDI_ACCOMPANIMENT);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredMidiAccompaniment(val: boolean): void {
  safeSetItem(STORAGE_KEYS.MIDI_ACCOMPANIMENT, String(val));
}

export function getStoredMidiKaraokeTrack(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.MIDI_KARAOKE_TRACK);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredMidiKaraokeTrack(val: boolean): void {
  safeSetItem(STORAGE_KEYS.MIDI_KARAOKE_TRACK, String(val));
}

export function getStoredMidiMelodyLyrics(defaultVal = true): boolean {
  const val = safeGetItem(STORAGE_KEYS.MIDI_MELODY_LYRICS);
  if (val !== null) return val === 'true';
  return defaultVal;
}

export function setStoredMidiMelodyLyrics(val: boolean): void {
  safeSetItem(STORAGE_KEYS.MIDI_MELODY_LYRICS, String(val));
}

// ============================================================================
// 15. SEARCH PREFERENCES
// ============================================================================
export function getStoredSearchScope(defaultVal: SearchScope = 'all'): SearchScope {
  const val = safeGetItem(STORAGE_KEYS.SEARCH_SCOPE);
  if (val === 'all' || val === 'current') {
    return val;
  }
  return defaultVal;
}

export function setStoredSearchScope(scope: SearchScope): void {
  safeSetItem(STORAGE_KEYS.SEARCH_SCOPE, scope);
}

export function getStoredSearchMatchFilter(defaultVal: SearchMatchFilter = 'all'): SearchMatchFilter {
  const val = safeGetItem(STORAGE_KEYS.SEARCH_MATCH_FILTER);
  if (val === 'all' || val === 'measure' || val === 'verse') return val;
  return defaultVal;
}

export function setStoredSearchMatchFilter(filter: SearchMatchFilter): void {
  safeSetItem(STORAGE_KEYS.SEARCH_MATCH_FILTER, filter);
}

export function getStoredInSongFilter(defaultVal: InSongFilter = 'all'): InSongFilter {
  const val = safeGetItem(STORAGE_KEYS.IN_SONG_FILTER);
  if (val === 'all' || val === 'measure' || val === 'verse') return val;
  return defaultVal;
}

export function setStoredInSongFilter(filter: InSongFilter): void {
  safeSetItem(STORAGE_KEYS.IN_SONG_FILTER, filter);
}

// ============================================================================
// 16. SHEET WRAP MODE PREFERENCE
// ============================================================================
export function getStoredSheetWrapMode(defaultVal: SheetWrapMode = 'no_wrap'): SheetWrapMode {
  const val = safeGetItem(STORAGE_KEYS.REAL_SHEET_WRAP_MODE);
  if (val === 'no_wrap' || val === 'auto_fit' || val === 'auto_wrap') return val;
  return defaultVal;
}

export function setStoredSheetWrapMode(mode: SheetWrapMode): void {
  safeSetItem(STORAGE_KEYS.REAL_SHEET_WRAP_MODE, mode);
}

// ============================================================================
// 16b. REAL SHEET ORIENTATION PREFERENCE
// ============================================================================
export function getStoredSheetOrientation(defaultVal: SheetOrientation = 'portrait'): SheetOrientation {
  const val = safeGetItem(STORAGE_KEYS.REAL_SHEET_ORIENTATION);
  if (val === 'portrait' || val === 'landscape') return val;
  return defaultVal;
}

export function setStoredSheetOrientation(orientation: SheetOrientation): void {
  safeSetItem(STORAGE_KEYS.REAL_SHEET_ORIENTATION, orientation);
}

// ============================================================================
// 17. QUICK LYRIC ALIGNER PREFERENCE
// ============================================================================
export function getStoredQuickAlignTarget(defaultVal: QuickAlignTarget = 'roman'): QuickAlignTarget {
  const val = safeGetItem(STORAGE_KEYS.QUICK_ALIGN_TARGET);
  if (val === 'roman' || val === 'hanlo' || val === 'dual') return val;
  return defaultVal;
}

export function setStoredQuickAlignTarget(target: QuickAlignTarget): void {
  safeSetItem(STORAGE_KEYS.QUICK_ALIGN_TARGET, target);
}

// ============================================================================
// 18. MIDI INSTRUMENT PREFERENCE
// ============================================================================
export function getStoredMidiInstrument(defaultVal?: InstrumentType): InstrumentType {
  const val = safeGetItem(STORAGE_KEYS.MIDI_INSTRUMENT);
  if (
    val === 'piano' ||
    val === 'flute' ||
    val === 'whistle' ||
    val === 'guitar' ||
    val === 'synth' ||
    val === 'bell' ||
    val === 'cello'
  ) {
    return val;
  }
  return defaultVal ?? getStoredInstrument();
}

export function setStoredMidiInstrument(inst: InstrumentType): void {
  safeSetItem(STORAGE_KEYS.MIDI_INSTRUMENT, inst);
}

// ============================================================================
// 19. PWA INSTALL PROMPT DISMISSAL
// ============================================================================
export function getStoredPwaDismissed(): boolean {
  const val = safeGetItem(STORAGE_KEYS.PWA_PROMPT_DISMISSED);
  return val === 'true';
}

export function setStoredPwaDismissed(dismissed: boolean): void {
  safeSetItem(STORAGE_KEYS.PWA_PROMPT_DISMISSED, String(dismissed));
}

// ============================================================================
// 20. RESTORE TO DEFAULT (Reset All User Settings to Factory Defaults)
// ============================================================================
export const SETTINGS_RESET_EVENT = 'taigi_composer_settings_reset';
export const ECO_MODE_EVENT = 'taigi_composer_eco_mode_change';

export function resetAllSettingsToDefault(): void {
  setStoredInstrument('piano');
  setStoredMelodyVolume(0.85);
  setStoredBackingVolume(0.6);
  setStoredChordEnabled(true);
  setStoredMetronomeEnabled(true);
  setStoredMetronomeVolume(0.45);
  setStoredTranspose(0);
  setStoredTempoMultiplier(1.0);
  setStoredShowMixer(false);
  setStoredUiZoom(1.0);
  setStoredNoteZoom(1.0);
  setStoredLyricZoom(1.0);
  setStoredSheetZoom(1.0);
  setStoredAutosaveInterval(0);
  setStoredDisplayMode('roman_major_hanlo');
  setStoredRealSheetTheme('dark');
  setStoredSheetWrapMode('no_wrap');
  setStoredSheetOrientation('portrait');
  setStoredNoteInputMode('progressive_replace');
  setStoredShowRhythmWarnings(true);
  setStoredAutoStepAdvance(false);
  setStoredDeckTab('numpad');
  setStoredLeadInEnabled(true);
  setStoredStageTheme('dark');
  setStoredShowNotation(true);
  setStoredLayoutMode('two_line');
  setStoredLyricAlign('center');
  setStoredPianoOctaveView('low_mid');
  setStoredPianoLabelMode('both');
  setStoredPianoQuantizeGrid('eighth');
  setStoredPianoAllowTriplets(false);
  setStoredPianoDeckMode('step');
  setStoredHudDrawer('none');
  setStoredAutoTransposeChords(true);
  setStoredSyncAllMeasures(true);
  setStoredQuickAlignTarget('roman');
  setStoredExportFormat('json');
  setStoredMidiInstrument('piano');
  setStoredMidiLyricType('hanlo');
  setStoredMidiFormat('mid');
  setStoredMidiAccompaniment(true);
  setStoredMidiKaraokeTrack(true);
  setStoredMidiMelodyLyrics(true);
  setStoredSearchScope('all');
  setStoredSearchMatchFilter('all');
  setStoredInSongFilter('all');

  // Reset Eco Mode
  safeSetItem(STORAGE_KEYS.POWER_SAVE_MODE, 'false');

  // Reset DOM font scaling immediately
  if (typeof document !== 'undefined') {
    document.documentElement.style.fontSize = '100%';
    document.documentElement.style.setProperty('--ui-text-zoom', '1');
    document.documentElement.setAttribute('data-ui-zoom', '100');
    document.documentElement.style.setProperty('--note-zoom', '1');
    document.documentElement.setAttribute('data-note-zoom', '100');
    document.documentElement.style.setProperty('--lyric-zoom', '1');
    document.documentElement.setAttribute('data-lyric-zoom', '100');
    document.documentElement.classList.remove('eco-mode');
  }

  // Notify listeners that global settings have been reset
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ECO_MODE_EVENT));
    window.dispatchEvent(new CustomEvent(SETTINGS_RESET_EVENT));
  }
}
