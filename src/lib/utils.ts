export const formatRating = (r: number) => r.toFixed(1);

export function formatDate(value: string): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "9" → movies rated 9.0–9.9 inclusive, "10" → exactly 10.0 */
export function matchesRatingBucket(rating: number, bucket: number): boolean {
  if (bucket === 10) return rating === 10;
  return rating >= bucket && rating < bucket + 1;
}

export function normalizeGenre(g: string): string {
  return g.trim().replace(/\s+/g, " ");
}

export const sameGenre = (a: string, b: string) =>
  a.toLocaleLowerCase() === b.toLocaleLowerCase();

/** Unique genres used by movies (case-insensitive dedupe), alphabetical. */
export function collectGenres(movies: { genres: string[] }[]): string[] {
  const seen = new Map<string, string>();
  for (const m of movies) {
    for (const g of m.genres) {
      const key = g.toLocaleLowerCase();
      if (!seen.has(key)) seen.set(key, g);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}
