import { useEffect, useRef, useState } from "react";
import { ChevronDownIcon, PlayIcon } from "./Icons";

interface Props {
  /** Whether a full movie file is attached, which is what adds the chevron. */
  hasMovie: boolean;
  onTrailer(): void;
  onMovie(): void;
  size?: "large" | "small";
}

/**
 * The trailer button, and — only when a movie file is attached — a split
 * control whose chevron reveals "Play Movie". A film with no movie file keeps
 * the plain single button, so the extra affordance never appears emptily.
 */
export default function PlayButton({ hasMovie, onTrailer, onMovie, size = "large" }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  const big = size === "large";
  const pad = big ? "px-7 py-[9px] text-[15px]" : "px-5 py-[7px] text-[13px]";
  const glyph = big ? 14 : 13;

  return (
    <div ref={root} className="pointer-events-auto relative inline-flex">
      <button
        onClick={onTrailer}
        className={`flex items-center gap-2 bg-white font-semibold text-black transition-opacity duration-200 hover:opacity-90 active:opacity-80 ${pad} ${
          hasMovie ? "rounded-l-full" : "rounded-full"
        }`}
      >
        <PlayIcon width={glyph} height={glyph} />
        Trailer
      </button>

      {hasMovie && (
        <>
          <span className="w-px shrink-0 bg-black/15" aria-hidden />
          <button
            onClick={() => setOpen((o) => !o)}
            aria-label="More playback options"
            aria-expanded={open}
            className={`flex items-center rounded-r-full bg-white text-black transition-opacity duration-200 hover:opacity-90 active:opacity-80 ${
              big ? "px-2.5" : "px-2"
            }`}
          >
            <ChevronDownIcon
              width={13}
              height={13}
              strokeWidth={2.4}
              className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
            />
          </button>
        </>
      )}

      {open && (
        <div className="anim-pop mat-popover absolute left-0 top-[calc(100%+6px)] z-40 min-w-[170px] rounded-[8px] p-1">
          <button
            onClick={() => {
              setOpen(false);
              onMovie();
            }}
            className="flex w-full items-center gap-2 rounded-[6px] px-2.5 py-[6px] text-left text-[13px] font-medium text-[var(--text-1)] transition-colors duration-100 hover:bg-[var(--fill)]"
          >
            <PlayIcon width={12} height={12} />
            Play Movie
          </button>
        </div>
      )}
    </div>
  );
}
