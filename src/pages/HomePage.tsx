import { useMemo } from "react";
import Hero from "../components/Hero";
import Row from "../components/Row";
import { FilmIcon } from "../components/Icons";
import { useLibrary } from "../lib/store";
import { collectGenres } from "../lib/utils";

function EmptyLibrary() {
  const { openForm } = useLibrary();
  return (
    <div className="anim-page flex h-screen flex-col items-center justify-center gap-2 pl-[var(--sidebar-w)]">
      <FilmIcon width={56} height={56} strokeWidth={1.2} className="mb-3 text-[var(--text-3)]" />
      <h2 className="text-[19px] font-semibold tracking-tight">No movies yet</h2>
      <p className="text-[13px] text-[var(--text-2)]">
        Add your first movie to start building your collection
      </p>
      <button
        onClick={() => openForm()}
        className="focus-ring mt-5 rounded-[7px] bg-white px-4 py-[6px] text-[13px] font-semibold text-black transition-opacity duration-150 hover:opacity-90"
      >
        Add Your First Movie
      </button>
    </div>
  );
}

export default function HomePage() {
  const { movies, heroMovies } = useLibrary();

  const byRating = useMemo(
    () =>
      [...movies].sort((a, b) => b.rating - a.rating || a.title.localeCompare(b.title)),
    [movies]
  );

  const byDateAdded = useMemo(
    () => [...movies].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)),
    [movies]
  );

  const genreRows = useMemo(() => {
    return collectGenres(movies).map((genre) => ({
      genre,
      movies: byRating.filter((m) =>
        m.genres.some((g) => g.toLocaleLowerCase() === genre.toLocaleLowerCase())
      ),
    }));
  }, [movies, byRating]);

  if (movies.length === 0) return <EmptyLibrary />;

  return (
    <div className="anim-page pb-20">
      {heroMovies.length > 0 ? <Hero movies={heroMovies} /> : <div className="h-16" />}

      <Row title="My Top" movies={byRating} numbered to="/collection/top" />
      <Row title="Recently Added" movies={byDateAdded} to="/collection/recent" />
      {genreRows.map(({ genre, movies: gm }) => (
        <Row
          key={genre}
          title={genre}
          movies={gm}
          to={`/collection/genre/${encodeURIComponent(genre)}`}
        />
      ))}
    </div>
  );
}
