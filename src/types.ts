export interface Movie {
  id: number;
  title: string;
  year: number | null;
  genres: string[];
  /** Rating 0.0–10.0, one decimal place */
  rating: number;
  /** Poster file name inside the app data dir (or a data:/blob: URL in browser mode) */
  posterPath: string | null;
  /** Trailer video file name inside the library folder (or a data:/blob: URL in browser mode) */
  trailerPath: string | null;
  /** Absolute path to the full movie file, referenced in place rather than copied */
  moviePath: string | null;
  description: string | null;
  note: string | null;
  /** ISO string, set automatically on add */
  dateAdded: string;
  /** YYYY-MM-DD, picked manually */
  dateWatched: string | null;
}

export type MovieInput = Omit<Movie, "id" | "dateAdded">;
