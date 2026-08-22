import { useEffect, useMemo, useRef, useState } from "react";
import PosterCard from "../components/PosterCard";
import { SearchIcon } from "../components/Icons";
import { useLibrary } from "../lib/store";

export default function SearchPage() {
  const { movies } = useLibrary();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    const focus = () => inputRef.current?.focus();
    window.addEventListener("kinoteka:focus-search", focus);
    return () => window.removeEventListener("kinoteka:focus-search", focus);
  }, []);

  const q = query.trim().toLocaleLowerCase();
  // empty query shows the whole library as a browsable deck;
  // typing narrows it down, with matches fading in smoothly
  const results = useMemo(() => {
    const deck = [...movies].sort((a, b) => a.title.localeCompare(b.title));
    if (!q) return deck;
    return deck.filter((m) => m.title.toLocaleLowerCase().includes(q));
  }, [movies, q]);

  return (
    <div className="anim-page min-h-screen pb-20 pl-[var(--gutter-l)] pr-[var(--gutter-r)] pt-12">
      <div className="flex justify-center">
        <div className="relative w-full max-w-[560px]">
          <SearchIcon
            width={14}
            height={14}
            className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 text-[var(--text-3)]"
          />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search"
            className="mat-control focus-ring w-full rounded-[7px] py-[6px] pl-9 pr-3 text-[13px] text-[var(--text-1)] placeholder-[var(--text-3)] outline-none transition-shadow duration-150"
          />
        </div>
      </div>

      {results.length === 0 ? (
        <p className="mt-32 text-center text-[13px] text-[var(--text-2)]">
          {movies.length === 0 ? "Your library is empty" : "Nothing found"}
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-[repeat(auto-fill,minmax(168px,1fr))] gap-x-5 gap-y-8">
          {results.map((m) => (
            <div key={m.id} className="anim-in">
              <PosterCard movie={m} fluid />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
