import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PosterCard from "../components/PosterCard";
import { ChevronLeftIcon } from "../components/Icons";
import { useLibrary } from "../lib/store";

/** Full-deck page opened by clicking a row title on Home (like Apple TV). */
export default function CollectionPage() {
  const { kind, genre } = useParams();
  const navigate = useNavigate();
  const { movies } = useLibrary();

  const { title, list, numbered } = useMemo(() => {
    const byRating = [...movies].sort(
      (a, b) => b.rating - a.rating || a.title.localeCompare(b.title)
    );
    if (genre !== undefined) {
      const name = decodeURIComponent(genre);
      return {
        title: name,
        numbered: false,
        list: byRating.filter((m) =>
          m.genres.some((g) => g.toLocaleLowerCase() === name.toLocaleLowerCase())
        ),
      };
    }
    if (kind === "recent") {
      return {
        title: "Recently Added",
        numbered: false,
        list: [...movies].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded)),
      };
    }
    return { title: "My Top", numbered: true, list: byRating };
  }, [movies, kind, genre]);

  return (
    <div className="anim-page min-h-screen pb-20 pl-[var(--gutter-l)] pr-[var(--gutter-r)] pt-12">
      <button
        onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        aria-label="Back"
        className="mat-control focus-ring flex size-[26px] items-center justify-center rounded-full text-[var(--text-1)] transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
      >
        <ChevronLeftIcon width={15} height={15} strokeWidth={2.2} />
      </button>

      <h1 className="mt-4 text-[26px] font-semibold tracking-tight">{title}</h1>

      {list.length === 0 ? (
        <p className="mt-28 text-center text-[13px] text-[var(--text-2)]">Nothing found</p>
      ) : (
        <div className="mt-7 grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-5 gap-y-8">
          {list.map((m, i) => (
            <PosterCard key={m.id} movie={m} fluid number={numbered ? i + 1 : undefined} />
          ))}
        </div>
      )}
    </div>
  );
}
