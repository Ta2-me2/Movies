import { useNavigate } from "react-router-dom";
import { posterSrc } from "../lib/db";
import { formatRating } from "../lib/utils";
import type { Movie } from "../types";

interface Props {
  movie: Movie;
  /** Big number over the poster ("My Top" style rows) */
  number?: number;
  /** true — the card stretches to its grid cell; otherwise fixed row width */
  fluid?: boolean;
}

export default function PosterCard({ movie, number, fluid }: Props) {
  const navigate = useNavigate();
  const src = posterSrc(movie.posterPath);

  return (
    <button
      onClick={() => navigate(`/movie/${movie.id}`)}
      className={`group/card relative shrink-0 focus:outline-none ${fluid ? "w-full" : "w-[186px]"}`}
      aria-label={movie.title}
    >
      <div className="relative aspect-[2/3] w-full overflow-hidden rounded-[8px] bg-[var(--surface-2)] shadow-[inset_0_0_0_0.5px_var(--hairline)] transition-[transform,box-shadow] duration-300 ease-[var(--ease-soft)] group-hover/card:scale-[1.05] group-hover/card:shadow-[var(--shadow-card-hover)]">
        {src ? (
          <img
            src={src}
            alt=""
            draggable={false}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 flex items-end bg-gradient-to-b from-[var(--surface-3)] to-[var(--surface)] p-3">
            <span className="text-[13px] font-semibold leading-tight text-white/70 line-clamp-4 text-left">
              {movie.title}
            </span>
          </div>
        )}

        {number !== undefined && (
          <span className="pointer-events-none absolute left-2 top-0 select-none text-[62px] font-extrabold leading-none tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)]">
            {number}
          </span>
        )}

        <span className="absolute bottom-1.5 right-1.5 mat-hud rounded-[5px] px-[6px] py-[2px] text-[11px] font-semibold text-white/95">
          {formatRating(movie.rating)}
        </span>
      </div>
    </button>
  );
}
