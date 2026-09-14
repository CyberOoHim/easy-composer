import type { Song } from '../types/song.ts';

const MAX_HISTORY_LENGTH = 150;
const COALESCE_WINDOW_MS = 1000;

export interface SongHistoryReducerState {
  past: Song[];
  present: Song;
  future: Song[];
  contentRevision: number;
  lastCoalesceKey?: string;
  lastActionTimestamp?: number;
}

export interface SetSongActionOptions {
  coalesce?: boolean;
  coalesceKey?: string;
}

export type SongHistoryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'SET_SONG';
      payload: Song | ((current: Song) => Song);
      coalesce?: boolean;
      coalesceKey?: string;
    }
  | { type: 'LOAD_SONG'; payload: Song; unsaved?: boolean };

export function songHistoryReducer(
  state: SongHistoryReducerState,
  action: SongHistoryAction
): SongHistoryReducerState {
  switch (action.type) {
    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      return {
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
        contentRevision: state.contentRevision + 1,
        lastCoalesceKey: undefined,
        lastActionTimestamp: undefined,
      };
    }
    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      return {
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
        contentRevision: state.contentRevision + 1,
        lastCoalesceKey: undefined,
        lastActionTimestamp: undefined,
      };
    }
    case 'SET_SONG': {
      const nextSong = typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      if (state.present === nextSong) {
        return state;
      }

      const now = Date.now();
      const shouldCoalesce =
        Boolean(action.coalesce) &&
        Boolean(action.coalesceKey) &&
        state.lastCoalesceKey === action.coalesceKey &&
        state.lastActionTimestamp !== undefined &&
        now - state.lastActionTimestamp < COALESCE_WINDOW_MS;

      if (shouldCoalesce) {
        // Group rapid continuous updates (e.g. typing text or dragging a slider) into the current edit
        return {
          ...state,
          present: nextSong,
          lastActionTimestamp: now,
          contentRevision: state.contentRevision + 1,
        };
      }

      const newPast = [...state.past, state.present];
      return {
        past:
          newPast.length > MAX_HISTORY_LENGTH
            ? newPast.slice(newPast.length - MAX_HISTORY_LENGTH)
            : newPast,
        present: nextSong,
        future: [],
        contentRevision: state.contentRevision + 1,
        lastCoalesceKey: action.coalesce ? action.coalesceKey : undefined,
        lastActionTimestamp: action.coalesce ? now : undefined,
      };
    }
    case 'LOAD_SONG': {
      return {
        past: [],
        present: action.payload,
        future: [],
        contentRevision: action.unsaved ? 1 : 0,
        lastCoalesceKey: undefined,
        lastActionTimestamp: undefined,
      };
    }
    default:
      return state;
  }
}

export function createSongHistoryState(present: Song): SongHistoryReducerState {
  return {
    past: [],
    present,
    future: [],
    contentRevision: 0,
  };
}
