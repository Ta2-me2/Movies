import { convertFileSrc, invoke, isTauri } from "@tauri-apps/api/core";
import type { Movie, MovieInput } from "../types";
import { normalizeGenre, sameGenre } from "./utils";

export const inTauri = isTauri();

// ---------------------------------------------------------------------------
// Tauri: SQLite via tauri-plugin-sql. Posters and trailers are copied into the
// library folder (~/Library/Application Support/Movie); a movie file is only
// referenced where it already lives, since those run to many gigabytes.
// Browser (debug via `npm run dev` only): localStorage.
// ---------------------------------------------------------------------------

type SqlDatabase = {
  select<T>(query: string, bindValues?: unknown[]): Promise<T>;
  execute(
    query: string,
    bindValues?: unknown[]
  ): Promise<{ lastInsertId?: number; rowsAffected: number }>;
};

let db: SqlDatabase | null = null;
let libraryDir = "";

interface MovieRow {
  id: number;
  title: string;
  year: number | null;
  genres: string;
  rating: number;
  poster_path: string | null;
  trailer_path: string | null;
  movie_path: string | null;
  description: string | null;
  note: string | null;
  date_added: string;
  date_watched: string | null;
}

function rowToMovie(r: MovieRow): Movie {
  let genres: string[] = [];
  try {
    const parsed = JSON.parse(r.genres);
    if (Array.isArray(parsed)) genres = parsed.filter((g) => typeof g === "string");
  } catch {
    // corrupted field — treat as no genres
  }
  return {
    id: r.id,
    title: r.title,
    year: r.year,
    genres,
    rating: r.rating,
    posterPath: r.poster_path,
    trailerPath: r.trailer_path,
    moviePath: r.movie_path,
    description: r.description,
    note: r.note,
    dateAdded: r.date_added,
    dateWatched: r.date_watched,
  };
}

export async function initDb(): Promise<void> {
  if (!inTauri) return;
  const Database = (await import("@tauri-apps/plugin-sql")).default;
  const [url, dir] = await Promise.all([
    invoke<string>("db_url"),
    invoke<string>("library_path"),
  ]);
  db = (await Database.load(url)) as unknown as SqlDatabase;
  libraryDir = dir;
  // make sure genres already used by movies are present in the genres table
  const movies = await listMovies();
  for (const m of movies) {
    for (const g of m.genres) {
      await db.execute("INSERT OR IGNORE INTO genres (name) VALUES ($1)", [g]);
    }
  }
}

export async function listMovies(): Promise<Movie[]> {
  if (!inTauri) return memoryList();
  const rows = await db!.select<MovieRow[]>(
    "SELECT * FROM movies ORDER BY date_added DESC"
  );
  return rows.map(rowToMovie);
}

export async function addMovie(input: MovieInput): Promise<void> {
  const dateAdded = new Date().toISOString();
  if (!inTauri) return memoryAdd(input, dateAdded);
  await db!.execute(
    `INSERT INTO movies (title, year, genres, rating, poster_path, trailer_path, movie_path, description, note, date_added, date_watched)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
    [
      input.title,
      input.year,
      JSON.stringify(input.genres),
      input.rating,
      input.posterPath,
      input.trailerPath,
      input.moviePath,
      input.description,
      input.note,
      dateAdded,
      input.dateWatched,
    ]
  );
}

export async function updateMovie(id: number, input: MovieInput): Promise<void> {
  if (!inTauri) return memoryUpdate(id, input);
  await db!.execute(
    `UPDATE movies SET title = $1, year = $2, genres = $3, rating = $4, poster_path = $5,
       trailer_path = $6, movie_path = $7, description = $8, note = $9, date_watched = $10
     WHERE id = $11`,
    [
      input.title,
      input.year,
      JSON.stringify(input.genres),
      input.rating,
      input.posterPath,
      input.trailerPath,
      input.moviePath,
      input.description,
      input.note,
      input.dateWatched,
      id,
    ]
  );
}

export async function deleteMovie(movie: Movie): Promise<void> {
  if (!inTauri) return memoryDelete(movie.id);
  await db!.execute("DELETE FROM movies WHERE id = $1", [movie.id]);
  if (movie.posterPath) await deletePosterFile(movie.posterPath);
  if (movie.trailerPath) await deleteTrailerFile(movie.trailerPath);
}

// -------------------------------- Genres -----------------------------------

export async function listGenres(): Promise<string[]> {
  if (!inTauri) return memoryGenres();
  const rows = await db!.select<{ name: string }[]>(
    "SELECT name FROM genres ORDER BY name COLLATE NOCASE"
  );
  return rows.map((r) => r.name);
}

/** Adds a genre to the global list; returns the canonical (stored) name. */
export async function addGenre(name: string): Promise<string> {
  const g = normalizeGenre(name);
  const existing = (await listGenres()).find((x) => sameGenre(x, g));
  if (existing) return existing;
  if (!inTauri) {
    memoryWriteGenres([...memoryGenres(), g]);
    return g;
  }
  await db!.execute("INSERT OR IGNORE INTO genres (name) VALUES ($1)", [g]);
  return g;
}

/** Removes a genre from the global list and from every movie that has it. */
export async function deleteGenre(name: string): Promise<void> {
  const movies = await listMovies();
  for (const m of movies) {
    if (m.genres.some((g) => sameGenre(g, name))) {
      await updateMovie(m.id, {
        ...m,
        genres: m.genres.filter((g) => !sameGenre(g, name)),
      });
    }
  }
  if (!inTauri) {
    memoryWriteGenres(memoryGenres().filter((g) => !sameGenre(g, name)));
    return;
  }
  await db!.execute("DELETE FROM genres WHERE name = $1", [name]);
}

// ----------------------------- Poster files --------------------------------

function mediaSrc(sub: string, fileName: string | null): string | null {
  if (!fileName) return null;
  if (/^(data|blob|https?):/.test(fileName)) return fileName;
  if (!libraryDir) return null;
  return convertFileSrc(`${libraryDir}/${sub}/${fileName}`);
}

/** URL for displaying a poster in <img>. */
export const posterSrc = (posterPath: string | null) => mediaSrc("posters", posterPath);

/** URL for playing a trailer in <video>. */
export const trailerSrc = (trailerPath: string | null) => mediaSrc("trailers", trailerPath);

/**
 * Opens a file picker and copies the chosen image into the app's data folder.
 * Returns the stored file name (or a data: URL in browser mode), null if cancelled.
 */
export async function pickPoster(): Promise<string | null> {
  if (!inTauri) return browserPickFile("image/*", true);
  const { open } = await import("@tauri-apps/plugin-dialog");
  const file = await open({
    multiple: false,
    directory: false,
    filters: [
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp", "heic", "gif", "bmp", "tiff"] },
    ],
  });
  if (!file) return null;
  return invoke<string>("save_poster", { srcPath: file });
}

/**
 * Opens a file picker and copies the chosen video into the app's data folder,
 * so the trailer keeps working even if the original file is deleted.
 */
export async function pickTrailer(): Promise<string | null> {
  if (!inTauri) return browserPickFile("video/*", false);
  const { open } = await import("@tauri-apps/plugin-dialog");
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Video", extensions: ["mp4", "mov", "m4v", "webm"] }],
  });
  if (!file) return null;
  return invoke<string>("save_trailer", { srcPath: file });
}

/**
 * Picks a movie file and returns its absolute path. The file stays where it
 * is — only permission to read it is granted, since full movies are far too
 * large to duplicate into the library.
 */
export async function pickMovieFile(): Promise<string | null> {
  if (!inTauri) return browserPickFile("video/*", false);
  const { open } = await import("@tauri-apps/plugin-dialog");
  const file = await open({
    multiple: false,
    directory: false,
    filters: [{ name: "Video", extensions: ["mp4", "mov", "m4v", "webm", "mkv", "avi"] }],
  });
  if (!file) return null;
  await invoke("allow_movie_file", { path: file });
  return file as string;
}

/** Re-grants access to every referenced movie file, after a restart. */
export async function allowMovieFiles(paths: string[]): Promise<void> {
  if (!inTauri || paths.length === 0) return;
  try {
    await invoke("allow_movie_files", { paths });
  } catch {
    // a missing file simply stays unplayable
  }
}

/** URL for playing a referenced movie file. */
export function movieSrc(moviePath: string | null): string | null {
  if (!moviePath) return null;
  if (/^(data|blob|https?):/.test(moviePath)) return moviePath;
  if (!inTauri) return null;
  return convertFileSrc(moviePath);
}

/** Whether the referenced movie file is still on disk. */
export async function movieFileExists(moviePath: string): Promise<boolean> {
  if (!inTauri || /^(data|blob|https?):/.test(moviePath)) return true;
  try {
    return await invoke<boolean>("movie_file_exists", { path: moviePath });
  } catch {
    return false;
  }
}

export async function deletePosterFile(posterPath: string): Promise<void> {
  await deleteMediaFile("delete_poster", posterPath);
}

export async function deleteTrailerFile(trailerPath: string): Promise<void> {
  await deleteMediaFile("delete_trailer", trailerPath);
}

async function deleteMediaFile(command: string, fileName: string): Promise<void> {
  if (!inTauri || /^(data|blob|https?):/.test(fileName)) return;
  try {
    await invoke(command, { fileName });
  } catch (e) {
    console.warn(`${command} failed:`, e);
  }
}

// --------------- Browser fallback (not used in the .app) --------------------

const LS_MOVIES = "kinoteka.movies";
const LS_GENRES = "kinoteka.genres";

function memoryRead(): Movie[] {
  try {
    return JSON.parse(localStorage.getItem(LS_MOVIES) ?? "[]");
  } catch {
    return [];
  }
}

function memoryWrite(movies: Movie[]) {
  localStorage.setItem(LS_MOVIES, JSON.stringify(movies));
}

function memoryList(): Movie[] {
  return memoryRead();
}

function memoryAdd(input: MovieInput, dateAdded: string) {
  const movies = memoryRead();
  const id = movies.reduce((m, x) => Math.max(m, x.id), 0) + 1;
  movies.push({ ...input, id, dateAdded });
  memoryWrite(movies);
}

function memoryUpdate(id: number, input: MovieInput) {
  memoryWrite(
    memoryRead().map((m) => (m.id === id ? { ...m, ...input, id, dateAdded: m.dateAdded } : m))
  );
}

function memoryDelete(id: number) {
  memoryWrite(memoryRead().filter((m) => m.id !== id));
}

function memoryGenres(): string[] {
  try {
    return JSON.parse(localStorage.getItem(LS_GENRES) ?? "[]");
  } catch {
    return [];
  }
}

function memoryWriteGenres(genres: string[]) {
  localStorage.setItem(LS_GENRES, JSON.stringify([...genres].sort((a, b) => a.localeCompare(b))));
}

function browserPickFile(accept: string, asDataUrl: boolean): Promise<string | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (!asDataUrl) return resolve(URL.createObjectURL(file));
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(file);
    };
    input.oncancel = () => resolve(null);
    input.click();
  });
}
