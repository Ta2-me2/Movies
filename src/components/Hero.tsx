import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { movieFileExists, movieSrc, posterSrc, trailerSrc } from "../lib/db";
import { usePlayback } from "../lib/playback";
import { formatRating } from "../lib/utils";
import type { Movie } from "../types";
import ConfirmDialog from "./ConfirmDialog";
import PlayButton from "./PlayButton";
import TrailerModal from "./TrailerModal";
import VideoBackground from "./VideoBackground";
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  SpeakerOffIcon,
  SpeakerOnIcon,
} from "./Icons";

const MAX_DOTS = 8;

/** Active slide survives navigation within the session (bug: coming back from
 *  a movie page used to reset the carousel to the first slide). */
let savedHeroIndex = 0;

export default function Hero({ movies }: { movies: Movie[] }) {
  const [index, setIndex] = useState(savedHeroIndex);
  const { muted, setMuted, clearPosition, getMoviePosition, reportMoviePosition } =
    usePlayback();
  // which of the two sources the fullscreen player is showing
  const [watching, setWatching] = useState<"trailer" | "movie" | null>(null);
  const [missingFile, setMissingFile] = useState(false);
  const navigate = useNavigate();
  // one physical swipe = one slide: once triggered, ignore the rest of the
  // gesture (including trackpad momentum) until it clearly ends. Momentum can
  // keep re-arriving for a couple of seconds on a strong flick, so on top of
  // the idle-gap check there is a hard ceiling — the lock never outlives it,
  // so a long inertia tail can never block the next real swipe indefinitely.
  const wheelAccum = useRef(0);
  const gestureActive = useRef(false);
  const wheelIdleTimer = useRef(0);
  const lastAbsDelta = useRef(0);

  const count = movies.length;
  const current = Math.min(index, count - 1);
  const movie = movies[current];
  const video = trailerSrc(movie.trailerPath);
  const poster = posterSrc(movie.posterPath);
  const movieFile = movieSrc(movie.moviePath);

  const openMovie = async () => {
    if (!movie.moviePath) return;
    if (!(await movieFileExists(movie.moviePath))) {
      setMissingFile(true);
      return;
    }
    setWatching("movie");
  };

  const changeSlide = (next: number) => {
    const target = ((next % count) + count) % count;
    const prev = movies[current];
    const nextMovie = movies[target];
    // switching slides restarts the previous trailer next time it is shown
    if (prev && nextMovie && prev.id !== nextMovie.id) clearPosition(prev.id);
    savedHeroIndex = target;
    setIndex(target);
  };

  const go = (dir: 1 | -1) => changeSlide(current + dir);

  const endGesture = () => {
    gestureActive.current = false;
    wheelAccum.current = 0;
    lastAbsDelta.current = 0;
    window.clearTimeout(wheelIdleTimer.current);
  };

  /**
   * One physical swipe = one slide, at any strength.
   *
   * After a slide is triggered the gesture is locked, because a trackpad keeps
   * sending decaying momentum events for up to a couple of seconds and those
   * must not count as further swipes. The lock is released by whichever comes
   * first: the event stream going quiet, or a delta that is clearly *larger*
   * than the one before it — momentum only ever decays, so a rise means the
   * user's fingers are back on the trackpad starting a new swipe. That second
   * rule is what keeps a deliberate second swipe responsive without a fixed
   * timeout, which would either feel sticky or let momentum through as an
   * unwanted extra slide.
   */
  const onWheel = (e: React.WheelEvent) => {
    if (count < 2) return;
    if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.2) return;

    const abs = Math.abs(e.deltaX);
    window.clearTimeout(wheelIdleTimer.current);
    wheelIdleTimer.current = window.setTimeout(endGesture, 180);

    if (gestureActive.current) {
      const isNewSwipe = abs > lastAbsDelta.current * 1.6 && abs > 12;
      lastAbsDelta.current = abs;
      if (!isNewSwipe) return;
      gestureActive.current = false;
      wheelAccum.current = 0;
    }

    lastAbsDelta.current = abs;
    wheelAccum.current += e.deltaX;
    if (Math.abs(wheelAccum.current) > 60) {
      gestureActive.current = true;
      go(wheelAccum.current > 0 ? 1 : -1);
      wheelAccum.current = 0;
    }
  };

  const metaParts = [
    formatRating(movie.rating),
    movie.genres.length ? movie.genres.join(", ") : null,
    movie.year ? String(movie.year) : null,
  ].filter(Boolean);

  const blurb = movie.description || movie.note;

  // sliding window of at most MAX_DOTS page indicators (like iOS page controls)
  let dotsStart = 0;
  if (count > MAX_DOTS) {
    dotsStart = Math.min(
      Math.max(current - Math.floor(MAX_DOTS / 2), 0),
      count - MAX_DOTS
    );
  }
  const dots = movies.slice(dotsStart, dotsStart + MAX_DOTS);

  return (
    <section
      onWheel={onWheel}
      className="group/hero relative h-[66vh] min-h-[460px] max-h-[780px] overflow-hidden"
    >
      {/* Background: trailer video or blurred poster, crossfading per slide */}
      <div key={movie.id} className="anim-fade absolute inset-0">
        {video ? (
          <VideoBackground movieId={movie.id} src={video} />
        ) : (
          <div className="absolute inset-0 overflow-hidden bg-[#161618]">
            {poster && (
              <>
                <img
                  src={poster}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 h-full w-full scale-125 object-cover opacity-55 blur-[70px]"
                />
                <img
                  src={poster}
                  alt=""
                  draggable={false}
                  className="absolute right-[7%] top-1/2 h-[68%] -translate-y-1/2 rounded-2xl object-cover shadow-[0_24px_70px_rgba(0,0,0,0.7)]"
                  style={{ aspectRatio: "2 / 3" }}
                />
              </>
            )}
          </div>
        )}
      </div>

      {/* Left scrim for text legibility and a seamless fade into the page below */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/65 via-black/15 to-transparent" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-b from-transparent via-[#0f0f0f]/60 to-[#0f0f0f]" />

      {/* Clicking the video/backdrop itself opens the movie page */}
      <button
        onClick={() => navigate(`/movie/${movie.id}`)}
        aria-label={`${movie.title} — details`}
        className="absolute inset-0 z-10 focus:outline-none"
      />

      {/* Sound toggle */}
      {video && (
        <button
          onClick={() => setMuted(!muted)}
          aria-label={muted ? "Unmute" : "Mute"}
          className="absolute right-5 top-9 z-30 flex size-10 items-center justify-center mat-hud rounded-full text-white/90 transition-colors duration-300 hover:bg-black/55 hover:text-white"
        >
          {muted ? (
            <SpeakerOffIcon width={18} height={18} />
          ) : (
            <SpeakerOnIcon width={18} height={18} />
          )}
        </button>
      )}

      {/* Text block (clicks pass through to the backdrop, except the Play button) */}
      <div
        key={`content-${movie.id}`}
        className="anim-in pointer-events-none absolute bottom-20 left-[var(--gutter-l)] z-20 max-w-[560px] pr-10"
      >
        <h1 className="text-[56px] font-bold leading-[1.05] tracking-tight drop-shadow-[0_2px_16px_rgba(0,0,0,0.6)]">
          {movie.title}
        </h1>
        <div className="mt-3 text-[14px] font-medium text-[var(--text-2)]">
          {metaParts.join(" · ")}
        </div>
        {blurb && (
          <p className="mt-2 max-w-[480px] text-[14px] leading-snug text-[var(--text-2)] line-clamp-2">
            {blurb}
          </p>
        )}
        {video && (
          <div className="mt-5">
            <PlayButton
              hasMovie={!!movieFile}
              onTrailer={() => setWatching("trailer")}
              onMovie={() => void openMovie()}
            />
          </div>
        )}
      </div>

      {/* Carousel arrows */}
      {count > 1 && (
        <>
          <button
            onClick={() => go(-1)}
            aria-label="Previous"
            className="absolute left-[calc(var(--sidebar-w)+14px)] top-1/2 z-30 -translate-y-1/2 p-2 text-white/85 opacity-0 drop-shadow-lg transition-opacity duration-300 group-hover/hero:opacity-100 hover:text-white"
          >
            <ChevronLeftIcon width={38} height={38} strokeWidth={1.6} />
          </button>
          <button
            onClick={() => go(1)}
            aria-label="Next"
            className="absolute right-4 top-1/2 z-30 -translate-y-1/2 p-2 text-white/85 opacity-0 drop-shadow-lg transition-opacity duration-300 group-hover/hero:opacity-100 hover:text-white"
          >
            <ChevronRightIcon width={38} height={38} strokeWidth={1.6} />
          </button>
        </>
      )}

      {/* Dot indicators, centered within the content area (window minus sidebar) */}
      {count > 1 && (
        <div className="absolute bottom-6 left-[var(--sidebar-w)] right-0 z-30 flex justify-center gap-[9px]">
          {dots.map((m, i) => {
            const realIndex = dotsStart + i;
            return (
              <button
                key={m.id}
                onClick={() => changeSlide(realIndex)}
                aria-label={`Slide ${realIndex + 1}`}
                className={`size-[7px] rounded-full transition-colors duration-300 ${
                  realIndex === current ? "bg-white" : "bg-white/30 hover:bg-white/50"
                }`}
              />
            );
          })}
        </div>
      )}

      {watching === "trailer" && video && (
        <TrailerModal src={video} title={movie.title} onClose={() => setWatching(null)} />
      )}

      {watching === "movie" && movieFile && (
        <TrailerModal
          src={movieFile}
          title={movie.title}
          startAt={getMoviePosition(movie.id)}
          onProgress={(s) => reportMoviePosition(movie.id, s)}
          onClose={() => setWatching(null)}
        />
      )}

      {missingFile && (
        <ConfirmDialog
          title="Movie file not found"
          message={`It is no longer at ${movie.moviePath}. Point the movie at the file again from Edit.`}
          confirmLabel="OK"
          destructive={false}
          hideCancel
          onConfirm={() => setMissingFile(false)}
          onCancel={() => setMissingFile(false)}
        />
      )}
    </section>
  );
}
