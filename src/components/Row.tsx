import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Movie } from "../types";
import PosterCard from "./PosterCard";
import { ChevronLeftIcon, ChevronRightIcon } from "./Icons";

interface Props {
  title: string;
  movies: Movie[];
  /** Number the cards with big digits ("Top 10" style) */
  numbered?: boolean;
  /** Route of the full-deck page opened by clicking the row title */
  to?: string;
}

export default function Row({ title, movies, numbered, to }: Props) {
  const scroller = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);

  const updateArrows = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    const onResize = () => updateArrows();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [movies.length, updateArrows]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.75, behavior: "smooth" });
  };

  if (movies.length === 0) return null;

  return (
    <section className="group/row mt-8">
      <div className="pl-[var(--gutter-l)] pr-[var(--gutter-r)]">
        <button
          onClick={to ? () => navigate(to) : undefined}
          className="group/title flex items-center gap-0.5 text-[19px] font-semibold tracking-tight focus:outline-none"
        >
          {title}
          <ChevronRightIcon
            width={17}
            height={17}
            strokeWidth={2.6}
            className="mt-[3px] text-[var(--text-3)] transition-[transform,color] duration-300 ease-[var(--ease-soft)] group-hover/title:translate-x-1 group-hover/title:text-[var(--text-1)]"
          />
        </button>
      </div>

      <div className="relative">
        {/* extra vertical padding gives the hover scale-up room, so posters
            and the big numbers are never clipped by the scroll container */}
        <div
          ref={scroller}
          onScroll={updateArrows}
          className="no-scrollbar -mb-4 flex gap-4 overflow-x-auto overscroll-x-contain pb-8 pl-[var(--gutter-l)] pr-[var(--gutter-r)] pt-4"
        >
          {movies.map((m, i) => (
            <PosterCard key={m.id} movie={m} number={numbered ? i + 1 : undefined} />
          ))}
        </div>

        {canLeft && (
          <button
            onClick={() => scrollBy(-1)}
            aria-label="Scroll left"
            className="absolute left-[calc(var(--sidebar-w)+8px)] top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center mat-hud rounded-full text-white/90 opacity-0 transition-opacity duration-300 group-hover/row:opacity-100 hover:bg-black/55"
          >
            <ChevronLeftIcon width={18} height={18} strokeWidth={2.2} />
          </button>
        )}
        {canRight && (
          <button
            onClick={() => scrollBy(1)}
            aria-label="Scroll right"
            className="absolute right-3 top-1/2 z-20 flex size-9 -translate-y-1/2 items-center justify-center mat-hud rounded-full text-white/90 opacity-0 transition-opacity duration-300 group-hover/row:opacity-100 hover:bg-black/55"
          >
            <ChevronRightIcon width={18} height={18} strokeWidth={2.2} />
          </button>
        )}
      </div>
    </section>
  );
}
