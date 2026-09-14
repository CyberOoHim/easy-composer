import type { Song } from '../types/song.ts';

const MAX_HISTORY_LENGTH = 150;
const COALESCE_WINDOW_MS = 1000;

export type CursorLocation = [number, number] | null;

export interface HistoryEntry {
  song: Song;
  undoCursor: CursorLocation;
  redoCursor: CursorLocation;
}

export interface SongHistoryReducerState {
  past: HistoryEntry[];
  present: Song;
  presentCursor: CursorLocation;
  future: HistoryEntry[];
  contentRevision: number;
  lastCoalesceKey?: string;
  lastActionTimestamp?: number;
}

export interface SetSongActionOptions {
  coalesce?: boolean;
  coalesceKey?: string;
  cursor?: CursorLocation;
  undoCursor?: CursorLocation;
}

export type SongHistoryAction =
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | {
      type: 'SET_SONG';
      payload: Song | ((current: Song) => Song);
      coalesce?: boolean;
      coalesceKey?: string;
      cursor?: CursorLocation;
      undoCursor?: CursorLocation;
    }
  | {
      type: 'SET_CURSOR';
      payload: CursorLocation | ((prev: CursorLocation) => CursorLocation);
    }
  | {
      type: 'LOAD_SONG';
      payload: Song;
      unsaved?: boolean;
      cursor?: CursorLocation;
    };

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
        present: previous.song,
        presentCursor: previous.undoCursor,
        future: [
          {
            song: state.present,
            undoCursor: previous.undoCursor,
            redoCursor: previous.redoCursor,
          },
          ...state.future,
        ],
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
        past: [
          ...state.past,
          {
            song: state.present,
            undoCursor: next.undoCursor,
            redoCursor: next.redoCursor,
          },
        ],
        present: next.song,
        presentCursor: next.redoCursor,
        future: newFuture,
        contentRevision: state.contentRevision + 1,
        lastCoalesceKey: undefined,
        lastActionTimestamp: undefined,
      };
    }
    case 'SET_SONG': {
      const nextSong = typeof action.payload === 'function' ? action.payload(state.present) : action.payload;
      if (state.present === nextSong) {
        if (
          action.cursor !== undefined &&
          (state.presentCursor === null ||
            action.cursor === null ||
            state.presentCursor[0] !== action.cursor[0] ||
            state.presentCursor[1] !== action.cursor[1])
        ) {
          return {
            ...state,
            presentCursor: action.cursor,
          };
        }
        return state;
      }

      const now = Date.now();
      const shouldCoalesce =
        Boolean(action.coalesce) &&
        Boolean(action.coalesceKey) &&
        state.lastCoalesceKey === action.coalesceKey &&
        state.lastActionTimestamp !== undefined &&
        now - state.lastActionTimestamp < COALESCE_WINDOW_MS;

      const undoCursor = action.undoCursor !== undefined ? action.undoCursor : state.presentCursor;
      const redoCursor = action.cursor !== undefined ? action.cursor : state.presentCursor;

      if (shouldCoalesce) {
        // Group rapid continuous updates into the current edit
        const updatedPast = [...state.past];
        if (updatedPast.length > 0) {
          const lastIdx = updatedPast.length - 1;
          updatedPast[lastIdx] = {
            ...updatedPast[lastIdx],
            redoCursor,
          };
        }
        return {
          ...state,
          past: updatedPast,
          present: nextSong,
          presentCursor: redoCursor,
          lastActionTimestamp: now,
          contentRevision: state.contentRevision + 1,
        };
      }

      const newPast: HistoryEntry[] = [
        ...state.past,
        {
          song: state.present,
          undoCursor,
          redoCursor,
        },
      ];

      return {
        past:
          newPast.length > MAX_HISTORY_LENGTH
            ? newPast.slice(newPast.length - MAX_HISTORY_LENGTH)
            : newPast,
        present: nextSong,
        presentCursor: redoCursor,
        future: [],
        contentRevision: state.contentRevision + 1,
        lastCoalesceKey: action.coalesce ? action.coalesceKey : undefined,
        lastActionTimestamp: action.coalesce ? now : undefined,
      };
    }
    case 'SET_CURSOR': {
      const nextCursor =
        typeof action.payload === 'function'
          ? action.payload(state.presentCursor)
          : action.payload;

      if (
        (state.presentCursor === null && nextCursor === null) ||
        (state.presentCursor !== null &&
          nextCursor !== null &&
          state.presentCursor[0] === nextCursor[0] &&
          state.presentCursor[1] === nextCursor[1])
      ) {
        return state;
      }
      return {
        ...state,
        presentCursor: nextCursor,
      };
    }
    case 'LOAD_SONG': {
      const initialCursor = action.cursor ?? [0, 0];
      return {
        past: [],
        present: action.payload,
        presentCursor: initialCursor,
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

export function createSongHistoryState(
  present: Song,
  initialCursor: CursorLocation = [0, 0]
): SongHistoryReducerState {
  return {
    past: [],
    present,
    presentCursor: initialCursor,
    future: [],
    contentRevision: 0,
  };
}
