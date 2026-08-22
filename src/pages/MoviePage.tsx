import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ConfirmDialog from "../components/ConfirmDialog";
import PlayButton from "../components/PlayButton";
import TrailerModal from "../components/TrailerModal";
import VideoBackground from "../components/VideoBackground";
import {
  ChevronLeftIcon,
  FullscreenIcon,
  PencilIcon,
  SpeakerOffIcon,
  SpeakerOnIcon,
  TrashIcon,
} from "../components/Icons";
import { movieFileExists, movieSrc, posterSrc, trailerSrc } from "../lib/db";
import { usePlayback } from "../lib/playback";
import { useLibrary } from "../lib/store";
import { formatDate, formatRating } from "../lib/utils";

export default function MoviePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { movies, ready, removeMovie, openForm } = useLibrary();
  const { muted, setMuted, getMoviePosition, reportMoviePosition } = usePlayback();
  const [confirming, setConfirming] = useState(false);
  const [watching, setWatching] = useState<"trailer" | "movie" | null>(null);
  const [missingFile, setMissingFile] = useState(false);

  const movie = movies.find((m) => m.id === Number(id));
  if (!movie) {
    if (ready) {
      // deleted movie or a bad id
      return (
        <div className="flex h-screen items-center justify-center pl-[var(--sidebar-w)] text-[var(--text-2)]">
          Movie not found
        </div>
      );
    }
    return null;
  }

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

  const meta = [
    movie.year ? String(movie.year) : null,
    movie.genres.length ? movie.genres.join(", ") : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const del = async () => {
    setConfirming(false);
    await removeMovie(movie);
    navigate("/");
  };

  return (
    <div className="anim-page min-h-screen pb-20">
      {/* Top block with background */}
      <div className="relative h-[52vh] min-h-[380px] max-h-[600px] overflow-hidden">
        {video ? (
          <VideoBackground movieId={movie.id} src={video} />
        ) : (
          <div className="absolute inset-0 bg-[#161618]">
            {poster && (
              <img
                src={poster}
                alt=""
                draggable={false}
                className="absolute inset-0 h-full w-full scale-125 object-cover opacity-50 blur-[70px]"
              />
            )}
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/25 via-transparent to-[#0f0f0f]" />

        {/* Back */}
        <button
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          aria-label="Back"
          className="absolute left-[calc(var(--sidebar-w)+16px)] top-9 z-30 flex size-10 items-center justify-center mat-hud rounded-full text-white/90 transition-colors duration-200 hover:bg-black/55 hover:text-white"
        >
          <ChevronLeftIcon width={19} height={19} strokeWidth={2.1} />
        </button>

        {video && (
          <div className="absolute right-5 top-9 z-30 flex gap-2.5">
            <button
              onClick={() => setMuted(!muted)}
              aria-label={muted ? "Unmute" : "Mute"}
              className="flex size-10 items-center justify-center mat-hud rounded-full text-white/90 transition-colors duration-200 hover:bg-black/55 hover:text-white"
            >
              {muted ? (
                <SpeakerOffIcon width={18} height={18} />
              ) : (
                <SpeakerOnIcon width={18} height={18} />
              )}
            </button>
            <button
              onClick={() => setWatching("trailer")}
              aria-label="Play trailer fullscreen"
              className="flex size-10 items-center justify-center mat-hud rounded-full text-white/90 transition-colors duration-200 hover:bg-black/55 hover:text-white"
            >
              <FullscreenIcon width={16} height={16} strokeWidth={2} />
            </button>
          </div>
        )}
      </div>

      {/* Content: poster + info */}
      <div className="relative z-10 -mt-40 flex items-end gap-9 pl-[var(--gutter-l)] pr-[var(--gutter-r)]">
        <div className="w-[218px] shrink-0 overflow-hidden rounded-[10px] bg-[#232326] shadow-[0_18px_50px_rgba(0,0,0,0.55),inset_0_0_0_0.5px_var(--hairline)]">
          {poster ? (
            <img src={poster} alt="" draggable={false} className="aspect-[2/3] w-full object-cover" />
          ) : (
            <div className="flex aspect-[2/3] w-full items-end bg-gradient-to-b from-[#2b2b2f] to-[#1a1a1d] p-3">
              <span className="text-[14px] font-semibold text-[var(--text-2)]">{movie.title}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 pb-1">
          <h1 className="text-[40px] font-bold leading-tight tracking-tight drop-shadow-[0_2px_14px_rgba(0,0,0,0.6)]">
            {movie.title}
          </h1>
          {meta && <div className="mt-1.5 text-[15px] font-medium text-[var(--text-2)]">{meta}</div>}

          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-[44px] font-bold leading-none tabular-nums">
              {formatRating(movie.rating)}
            </span>
            <span className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--text-3)]">
              my rating
            </span>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-2.5">
            {video && (
              <PlayButton
                size="small"
                hasMovie={!!movieFile}
                onTrailer={() => setWatching("trailer")}
                onMovie={() => void openMovie()}
              />
            )}
            <button
              onClick={() => openForm(movie)}
              className="mat-control focus-ring flex items-center gap-2 rounded-full px-4 py-[7px] text-[13px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
            >
              <PencilIcon width={14} height={14} />
              Edit
            </button>
            <button
              onClick={() => setConfirming(true)}
              className="mat-control focus-ring flex items-center gap-2 rounded-full px-4 py-[7px] text-[13px] font-medium text-[#ff6961] transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
            >
              <TrashIcon width={14} height={14} />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Description, note, dates */}
      <div className="mt-10 max-w-[760px] pl-[var(--gutter-l)] pr-[var(--gutter-r)]">
        {movie.description && (
          <p className="text-[13px] leading-relaxed text-[var(--text-1)]/85">{movie.description}</p>
        )}

        {/* card = quiet fill + hairline, no shadow */}
        {movie.note && (
          <div className="mt-6 rounded-[10px] bg-[var(--fill-subtle)] p-4 shadow-[inset_0_0_0_0.5px_var(--hairline)]">
            <div className="mb-1.5 text-[11px] font-semibold text-[var(--text-2)]">Note</div>
            <p className="text-[13px] leading-relaxed text-[var(--text-1)]/85">{movie.note}</p>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-1 text-[12px] text-[var(--text-3)]">
          <span>Added: {formatDate(movie.dateAdded)}</span>
          {movie.dateWatched && <span>Watched: {formatDate(movie.dateWatched)}</span>}
        </div>
      </div>

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

      {confirming && (
        <ConfirmDialog
          title={`Delete “${movie.title}”?`}
          message="The movie with its poster and trailer will be removed from your library. This can't be undone."
          confirmLabel="Delete"
          onConfirm={() => void del()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
