import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * Shared playback state. Each screen owns its own <video> element, but they
 * hand the "stopwatch" to each other through this context: the hero preview
 * and the movie-page background resume from the same position, the sound
 * state is global (and persisted), and background videos pause while the
 * fullscreen player is open.
 */

interface PlaybackContextValue {
  /**
   * Shared sound state for all preview videos. Global for the session, but
   * every launch starts muted: the OS blocks autoplaying video WITH sound
   * before the first click, so persisting "unmuted" across launches would
   * leave the hero stuck on a black frame until the user interacts.
   */
  muted: boolean;
  setMuted(m: boolean): void;
  /** Fullscreen player visibility — background videos pause while open */
  playerOpen: boolean;
  setPlayerOpen(open: boolean): void;
  /** Last known preview position per movie */
  getPosition(movieId: number): number | undefined;
  reportPosition(movieId: number, t: number): void;
  clearPosition(movieId: number): void;
  /**
   * Where the full movie was stopped, kept for this run only — reopening it
   * during the session resumes, relaunching starts from the beginning.
   */
  getMoviePosition(movieId: number): number | undefined;
  reportMoviePosition(movieId: number, t: number): void;
}

const PlaybackContext = createContext<PlaybackContextValue | null>(null);

export function PlaybackProvider({ children }: { children: ReactNode }) {
  const [muted, setMuted] = useState(true);
  const [playerOpen, setPlayerOpen] = useState(false);
  const positions = useRef(new Map<number, number>());
  const moviePositions = useRef(new Map<number, number>());

  const getPosition = useCallback((id: number) => positions.current.get(id), []);
  const reportPosition = useCallback((id: number, t: number) => {
    positions.current.set(id, t);
  }, []);
  const clearPosition = useCallback((id: number) => {
    positions.current.delete(id);
  }, []);

  const getMoviePosition = useCallback((id: number) => moviePositions.current.get(id), []);
  const reportMoviePosition = useCallback((id: number, t: number) => {
    moviePositions.current.set(id, t);
  }, []);

  return (
    <PlaybackContext.Provider
      value={{
        muted,
        setMuted,
        playerOpen,
        setPlayerOpen,
        getPosition,
        reportPosition,
        clearPosition,
        getMoviePosition,
        reportMoviePosition,
      }}
    >
      {children}
    </PlaybackContext.Provider>
  );
}

export function usePlayback(): PlaybackContextValue {
  const ctx = useContext(PlaybackContext);
  if (!ctx) throw new Error("usePlayback must be used within PlaybackProvider");
  return ctx;
}
