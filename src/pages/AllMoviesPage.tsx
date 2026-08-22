import { useMemo, useState } from "react";
import PosterCard from "../components/PosterCard";
import { useLibrary } from "../lib/store";
import { collectGenres, matchesRatingBucket } from "../lib/utils";

type SortKey = "ratingDesc" | "ratingAsc" | "dateDesc" | "dateAsc";

const sortOptions: { value: SortKey; label: string }[] = [
  { value: "ratingDesc", label: "Rating: highest first" },
  { value: "ratingAsc", label: "Rating: lowest first" },
  { value: "dateDesc", label: "Date added: newest first" },
  { value: "dateAsc", label: "Date added: oldest first" },
];

const buckets = [10, 9, 8, 7, 6, 5, 4, 3, 2, 1] as const;

/* macOS pop-up button: quiet fill, hairline edge, chevron on the trailing side */
const selectCls =
  "mat-control focus-ring appearance-none rounded-[6px] py-[5px] pl-3 pr-7 text-[12px] font-medium text-[var(--text-1)] outline-none transition-colors duration-150 hover:bg-[var(--fill-emphasis)] bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2210%22%20height%3D%226%22%3E%3Cpath%20d%3D%22M1%201l4%204%204-4%22%20stroke%3D%22%23ffffff99%22%20stroke-width%3D%221.5%22%20fill%3D%22none%22%20stroke-linecap%3D%22round%22%2F%3E%3C%2Fsvg%3E')] bg-[position:right_10px_center] bg-no-repeat";

/* Segmented-control style rating filter: accent fill when on, quiet when off */
const pill = (active: boolean) =>
  `focus-ring rounded-[6px] px-2.5 py-[4px] text-[12px] font-medium tabular-nums transition-colors duration-150 ${
    active
      ? "bg-[var(--accent)] text-white shadow-[inset_0_0_0_0.5px_rgba(255,255,255,0.18)]"
      : "mat-control text-[var(--text-1)] hover:bg-[var(--fill-emphasis)]"
  }`;

export default function AllMoviesPage() {
  const { movies } = useLibrary();
  const [sort, setSort] = useState<SortKey>("ratingDesc");
  const [bucket, setBucket] = useState<number | "all">("all");
  const [genre, setGenre] = useState<string>("all");

  const genres = useMemo(() => collectGenres(movies), [movies]);

  const shown = useMemo(() => {
    let list = movies;
    if (bucket !== "all") list = list.filter((m) => matchesRatingBucket(m.rating, bucket));
    if (genre !== "all") {
      list = list.filter((m) =>
        m.genres.some((g) => g.toLocaleLowerCase() === genre.toLocaleLowerCase())
      );
    }
    const sorted = [...list];
    switch (sort) {
      case "ratingDesc":
        sorted.sort((a, b) => b.rating - a.rating);
        break;
      case "ratingAsc":
        sorted.sort((a, b) => a.rating - b.rating);
        break;
      case "dateDesc":
        sorted.sort((a, b) => b.dateAdded.localeCompare(a.dateAdded));
        break;
      case "dateAsc":
        sorted.sort((a, b) => a.dateAdded.localeCompare(b.dateAdded));
        break;
    }
    return sorted;
  }, [movies, sort, bucket, genre]);

  return (
    <div className="anim-page min-h-screen pb-20 pl-[var(--gutter-l)] pr-[var(--gutter-r)] pt-14">
      <h1 className="text-[26px] font-semibold tracking-tight">All Movies</h1>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          className={selectCls}
        >
          {sortOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-1">
          <button onClick={() => setBucket("all")} className={pill(bucket === "all")}>
            All
          </button>
          {buckets.map((b) => (
            <button
              key={b}
              onClick={() => setBucket(bucket === b ? "all" : b)}
              className={pill(bucket === b)}
            >
              {b}
            </button>
          ))}
        </div>

        {genres.length > 0 && (
          <select
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            className={selectCls}
          >
            <option value="all">All genres</option>
            {genres.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="mt-28 text-center text-[13px] text-[var(--text-2)]">Nothing found</p>
      ) : (
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-5 gap-y-8">
          {shown.map((m) => (
            <div key={m.id} className="anim-in">
              <PosterCard movie={m} fluid />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
