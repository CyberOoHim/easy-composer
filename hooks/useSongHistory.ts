import { useReducer, useCallback } from 'react';
import { Song } from '@/types/song';
import {
  createSongHistoryState,
  songHistoryReducer,
  SetSongActionOptions,
  CursorLocation,
} from '@/lib/songHistory';

export type { CursorLocation };

export interface SongHistoryState {
  song: Song;
  cursor: CursorLocation;
  setCursor: (
    cursorOrUpdater: CursorLocation | ((prev: CursorLocation) => CursorLocation)
  ) => void;
  setSong: (
    newSong: Song | ((current: Song) => Song),
    options?: SetSongActionOptions
  ) => void;
  loadNewSong: (
    newSong: Song,
    options?: { unsaved?: boolean; cursor?: CursorLocation }
  ) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
  pastCount: number;
  futureCount: number;
  /** Increments on SET_SONG / UNDO / REDO; resets to 0 on LOAD_SONG (unless unsaved). */
  contentRevision: number;
}

export function useSongHistory(
  initialSong: Song,
  initialCursor: CursorLocation = [0, 0]
): SongHistoryState {
  const [state, dispatch] = useReducer(
    songHistoryReducer,
    initialSong,
    (s: Song) => createSongHistoryState(s, initialCursor)
  );

  const loadNewSong = useCallback(
    (newSong: Song, options?: { unsaved?: boolean; cursor?: CursorLocation }) => {
      dispatch({
        type: 'LOAD_SONG',
        payload: newSong,
        unsaved: options?.unsaved,
        cursor: options?.cursor,
      });
    },
    []
  );

  const setCursor = useCallback(
    (cursorOrUpdater: CursorLocation | ((prev: CursorLocation) => CursorLocation)) => {
      dispatch({ type: 'SET_CURSOR', payload: cursorOrUpdater });
    },
    []
  );

  const setSong = useCallback(
    (
      newSongOrUpdater: Song | ((current: Song) => Song),
      options?: SetSongActionOptions
    ) => {
      dispatch({
        type: 'SET_SONG',
        payload: newSongOrUpdater,
        coalesce: options?.coalesce,
        coalesceKey: options?.coalesceKey,
        cursor: options?.cursor,
        undoCursor: options?.undoCursor,
      });
    },
    []
  );

  const undo = useCallback((): boolean => {
    if (state.past.length === 0) return false;
    dispatch({ type: 'UNDO' });
    return true;
  }, [state.past.length]);

  const redo = useCallback((): boolean => {
    if (state.future.length === 0) return false;
    dispatch({ type: 'REDO' });
    return true;
  }, [state.future.length]);

  return {
    song: state.present,
    cursor: state.presentCursor,
    setCursor,
    setSong,
    loadNewSong,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
    pastCount: state.past.length,
    futureCount: state.future.length,
    contentRevision: state.contentRevision,
  };
}
