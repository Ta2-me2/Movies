import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type { Movie, MovieInput } from "../types";
import * as db from "./db";

interface LibraryContextValue {
  movies: Movie[];
  ready: boolean;
  /** All genres from the managed genre list (may include unused ones). */
  genres: string[];
  /** Movies rated above 7.0 in random order (order is fixed for the session). */
  heroMovies: Movie[];
  addMovie(input: MovieInput): Promise<void>;
  updateMovie(id: number, input: MovieInput): Promise<void>;
  removeMovie(movie: Movie): Promise<void>;
  /** Adds a genre to the global list; returns the canonical name. */
  addGenre(name: string): Promise<string>;
  /** Deletes a genre from the global list and from all movies. */
  deleteGenre(name: string): Promise<void>;
  /** Open the form for adding (no argument) or editing. */
  openForm(editing?: Movie): void;
  closeForm(): void;
  formState: { open: boolean; editing: Movie | null };
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

export function LibraryProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [genres, setGenres] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [formState, setFormState] = useState<{ open: boolean; editing: Movie | null }>({
    open: false,
    editing: null,
  });
  // Random weight per movie for the hero carousel order: assigned once per app
  // launch, so the order is reshuffled on every start.
  const heroKeys = useRef(new Map<number, number>());

  const refresh = useCallback(async () => {
    const list = await db.listMovies();
    setMovies(list);
    setGenres(await db.listGenres());
    // referenced movie files sit outside the library, so the asset protocol
    // has to be told about them again on every launch
    void db.allowMovieFiles(
      list.map((m) => m.moviePath).filter((p): p is string => !!p)
    );
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await db.initDb();
        await refresh();
      } catch (e) {
        console.error("Database init failed:", e);
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const heroMovies = useMemo(() => {
    const eligible = movies.filter((m) => m.rating > 7.0);
    for (const m of eligible) {
      if (!heroKeys.current.has(m.id)) heroKeys.current.set(m.id, Math.random());
    }
    return [...eligible].sort(
      (a, b) => heroKeys.current.get(a.id)! - heroKeys.current.get(b.id)!
    );
  }, [movies]);

  const value = useMemo<LibraryContextValue>(
    () => ({
      movies,
      ready,
      genres,
      heroMovies,
      async addMovie(input) {
        await db.addMovie(input);
        await refresh();
      },
      async updateMovie(id, input) {
        await db.updateMovie(id, input);
        await refresh();
      },
      async removeMovie(movie) {
        await db.deleteMovie(movie);
        await refresh();
      },
      async addGenre(name) {
        const canonical = await db.addGenre(name);
        await refresh();
        return canonical;
      },
      async deleteGenre(name) {
        await db.deleteGenre(name);
        await refresh();
      },
      openForm(editing) {
        setFormState({ open: true, editing: editing ?? null });
      },
      closeForm() {
        setFormState({ open: false, editing: null });
      },
      formState,
    }),
    [movies, ready, genres, heroMovies, refresh, formState]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary(): LibraryContextValue {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary must be used within LibraryProvider");
  return ctx;
}
