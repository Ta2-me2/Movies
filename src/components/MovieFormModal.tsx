import { useCallback, useEffect, useRef, useState } from "react";
import {
  deletePosterFile,
  deleteTrailerFile,
  pickMovieFile,
  pickPoster,
  pickTrailer,
  posterSrc,
  trailerSrc,
} from "../lib/db";
import { useLibrary } from "../lib/store";
import type { MovieInput } from "../types";
import GenrePicker from "./GenrePicker";
import { CloseIcon, FilmIcon, ImageIcon } from "./Icons";

const field =
  "mat-control focus-ring w-full rounded-[6px] px-2.5 py-[6px] text-[13px] text-[var(--text-1)] placeholder-[var(--text-3)] outline-none transition-shadow duration-150";
const label =
  "mb-1.5 block text-[11px] font-semibold tracking-[0.02em] text-[var(--text-2)]";

export default function MovieFormModal() {
  const { formState, closeForm, addMovie, updateMovie } = useLibrary();
  const editing = formState.editing;

  const [title, setTitle] = useState(editing?.title ?? "");
  const [year, setYear] = useState(editing?.year ? String(editing.year) : "");
  const [rating, setRating] = useState(editing ? editing.rating.toFixed(1) : "");
  const [genres, setGenres] = useState<string[]>(editing?.genres ?? []);
  const [posterPath, setPosterPath] = useState<string | null>(editing?.posterPath ?? null);
  const [trailerPath, setTrailerPath] = useState<string | null>(editing?.trailerPath ?? null);
  const [moviePath, setMoviePath] = useState<string | null>(editing?.moviePath ?? null);
  const [description, setDescription] = useState(editing?.description ?? "");
  const [note, setNote] = useState(editing?.note ?? "");
  const [dateWatched, setDateWatched] = useState(editing?.dateWatched ?? "");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [copyingTrailer, setCopyingTrailer] = useState(false);
  // Media files copied into the app folder during this form session but not yet
  // saved to the database — deleted again if the form is cancelled.
  const copiedPosters = useRef<Set<string>>(new Set());
  const copiedTrailers = useRef<Set<string>>(new Set());
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const cleanupAndClose = useCallback(() => {
    for (const p of copiedPosters.current) {
      if (p !== editing?.posterPath) void deletePosterFile(p);
    }
    for (const t of copiedTrailers.current) {
      if (t !== editing?.trailerPath) void deleteTrailerFile(t);
    }
    closeForm();
  }, [closeForm, editing]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") cleanupAndClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cleanupAndClose]);

  const choosePoster = async () => {
    const saved = await pickPoster();
    if (!saved) return;
    if (posterPath && copiedPosters.current.has(posterPath)) {
      void deletePosterFile(posterPath);
      copiedPosters.current.delete(posterPath);
    }
    copiedPosters.current.add(saved);
    setPosterPath(saved);
  };

  const removePoster = () => {
    if (posterPath && copiedPosters.current.has(posterPath)) {
      void deletePosterFile(posterPath);
      copiedPosters.current.delete(posterPath);
    }
    setPosterPath(null);
  };

  const chooseTrailer = async () => {
    setCopyingTrailer(true);
    try {
      const saved = await pickTrailer();
      if (!saved) return;
      if (trailerPath && copiedTrailers.current.has(trailerPath)) {
        void deleteTrailerFile(trailerPath);
        copiedTrailers.current.delete(trailerPath);
      }
      copiedTrailers.current.add(saved);
      setTrailerPath(saved);
    } finally {
      setCopyingTrailer(false);
    }
  };

  const removeTrailer = () => {
    if (trailerPath && copiedTrailers.current.has(trailerPath)) {
      void deleteTrailerFile(trailerPath);
      copiedTrailers.current.delete(trailerPath);
    }
    setTrailerPath(null);
  };

  const validate = (): MovieInput | null => {
    const errs: Record<string, string> = {};
    const t = title.trim();
    if (!t) errs.title = "Title is required";

    const r = Number(rating.replace(",", "."));
    if (rating.trim() === "" || Number.isNaN(r)) {
      errs.rating = "Enter a rating from 0.0 to 10.0";
    } else if (r < 0 || r > 10) {
      errs.rating = "Rating must be between 0.0 and 10.0";
    }

    let y: number | null = null;
    if (year.trim() !== "") {
      const yn = Number(year);
      if (!Number.isInteger(yn) || yn < 1888 || yn > 2100) {
        errs.year = "Invalid year";
      } else {
        y = yn;
      }
    }

    setErrors(errs);
    if (Object.keys(errs).length > 0) return null;

    return {
      title: t,
      year: y,
      genres,
      rating: Math.round(r * 10) / 10,
      posterPath,
      trailerPath,
      moviePath,
      description: description.trim() || null,
      note: note.trim() || null,
      dateWatched: dateWatched || null,
    };
  };

  const save = async () => {
    const input = validate();
    if (!input || saving) return;
    setSaving(true);
    try {
      if (editing) {
        await updateMovie(editing.id, input);
        if (editing.posterPath && editing.posterPath !== input.posterPath) {
          void deletePosterFile(editing.posterPath);
        }
        if (editing.trailerPath && editing.trailerPath !== input.trailerPath) {
          void deleteTrailerFile(editing.trailerPath);
        }
      } else {
        await addMovie(input);
      }
      copiedPosters.current.clear();
      copiedTrailers.current.clear();
      closeForm();
    } catch (e) {
      console.error("Save failed:", e);
      setErrors({ form: "Could not save. Please try again." });
    } finally {
      setSaving(false);
    }
  };

  const chooseMovie = async () => {
    const picked = await pickMovieFile();
    if (picked) setMoviePath(picked);
  };

  const posterPreview = posterSrc(posterPath);
  const trailerPreview = trailerSrc(trailerPath);

  return (
    <div
      className="anim-overlay fixed inset-0 z-[80] flex items-center justify-center bg-[var(--scrim)] p-6 backdrop-blur-sm"
      onMouseDown={cleanupAndClose}
    >
      <div
        className="anim-pop mat-sheet thin-scrollbar max-h-[86vh] w-[560px] overflow-y-auto rounded-[12px]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pb-2 pt-5">
          <h2 className="text-[15px] font-semibold tracking-tight">
            {editing ? "Edit Movie" : "New Movie"}
          </h2>
          <button
            onClick={cleanupAndClose}
            aria-label="Close"
            className="mat-control focus-ring flex size-[22px] items-center justify-center rounded-full text-[var(--text-2)] transition-colors duration-150 hover:bg-[var(--fill-emphasis)] hover:text-[var(--text-1)]"
          >
            <CloseIcon width={14} height={14} strokeWidth={2.2} />
          </button>
        </div>

        <div className="flex flex-col gap-4 px-6 py-4">
          <div>
            <label className={label}>Title *</label>
            <input
              ref={titleRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Movie title"
              className={field}
            />
            {errors.title && <p className="mt-1 text-[12px] text-[var(--danger)]">{errors.title}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={label}>Year</label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value.replace(/[^\d]/g, "").slice(0, 4))}
                placeholder="2026"
                inputMode="numeric"
                className={field}
              />
              {errors.year && <p className="mt-1 text-[12px] text-[var(--danger)]">{errors.year}</p>}
            </div>
            <div>
              <label className={label}>My Rating (0.0–10.0) *</label>
              <input
                value={rating}
                onChange={(e) => setRating(e.target.value.replace(/[^\d.,]/g, ""))}
                placeholder="8.5"
                inputMode="decimal"
                className={field}
              />
              {errors.rating && (
                <p className="mt-1 text-[12px] text-[var(--danger)]">{errors.rating}</p>
              )}
            </div>
          </div>

          <div>
            <label className={label}>Genres</label>
            <GenrePicker selected={genres} onChange={setGenres} />
          </div>

          <div>
            <label className={label}>Poster (vertical, 2:3)</label>
            <div className="flex items-start gap-4">
              <div className="relative h-[132px] w-[88px] shrink-0 overflow-hidden rounded-[8px] bg-[var(--fill-subtle)] shadow-[inset_0_0_0_0.5px_var(--hairline)]">
                {posterPreview ? (
                  <img src={posterPreview} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--text-3)]">
                    <ImageIcon width={26} height={26} />
                  </div>
                )}
              </div>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={choosePoster}
                  className="mat-control focus-ring w-fit rounded-[6px] px-3 py-[5px] text-[12px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
                >
                  {posterPath ? "Replace File…" : "Choose File…"}
                </button>
                {posterPath && (
                  <button
                    onClick={removePoster}
                    className="w-fit rounded-[5px] px-1 py-0.5 text-[12px] text-[var(--text-2)] transition-colors duration-150 hover:text-[var(--text-1)]"
                  >
                    Remove poster
                  </button>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={label}>Trailer (video file)</label>
            <div className="flex items-start gap-4">
              <div className="relative h-[80px] w-[142px] shrink-0 overflow-hidden rounded-[8px] bg-[var(--fill-subtle)] shadow-[inset_0_0_0_0.5px_var(--hairline)]">
                {trailerPreview ? (
                  <video
                    src={trailerPreview}
                    muted
                    playsInline
                    className="h-full w-full bg-black object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-[var(--text-3)]">
                    <FilmIcon width={24} height={24} />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-col gap-2 pt-1">
                <button
                  onClick={() => void chooseTrailer()}
                  disabled={copyingTrailer}
                  className="mat-control focus-ring w-fit rounded-[6px] px-3 py-[5px] text-[12px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)] disabled:opacity-50"
                >
                  {copyingTrailer
                    ? "Copying…"
                    : trailerPath
                      ? "Replace File…"
                      : "Choose File…"}
                </button>
                {trailerPath ? (
                  <button
                    onClick={removeTrailer}
                    className="w-fit rounded-[5px] px-1 py-0.5 text-[12px] text-[var(--text-2)] transition-colors duration-150 hover:text-[var(--text-1)]"
                  >
                    Remove trailer
                  </button>
                ) : (
                  <p className="text-[11px] leading-snug text-[var(--text-3)]">
                    The video is copied into the library, so it keeps playing even if the
                    original file is deleted.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={label}>Movie file (optional)</label>
            <div className="flex items-start gap-3">
              <button
                onClick={() => void chooseMovie()}
                className="mat-control focus-ring w-fit shrink-0 rounded-[6px] px-3 py-[5px] text-[12px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
              >
                {moviePath ? "Replace File…" : "Choose File…"}
              </button>
              <div className="min-w-0 pt-[3px]">
                {moviePath ? (
                  <div className="flex items-baseline gap-2">
                    <span className="truncate text-[12px] text-[var(--text-1)]" title={moviePath}>
                      {moviePath.split("/").pop()}
                    </span>
                    <button
                      onClick={() => setMoviePath(null)}
                      className="shrink-0 rounded-[5px] px-1 text-[12px] text-[var(--text-2)] transition-colors duration-150 hover:text-[var(--text-1)]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <p className="text-[11px] leading-snug text-[var(--text-3)]">
                    Played from where it is, not copied — so the library stays small.
                    Moving or deleting the file will break playback.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div>
            <label className={label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Short description of the movie"
              className={`${field} resize-none`}
            />
          </div>

          <div>
            <label className={label}>Note — why this rating</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Personal impression"
              className={`${field} resize-none`}
            />
          </div>

          <div className="w-1/2 pr-2">
            <label className={label}>Date watched</label>
            <input
              type="date"
              value={dateWatched}
              onChange={(e) => setDateWatched(e.target.value)}
              className={field}
            />
          </div>

          {errors.form && <p className="text-[13px] text-[var(--danger)]">{errors.form}</p>}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--hairline)] px-6 py-3.5">
          <button
            onClick={cleanupAndClose}
            className="mat-control focus-ring rounded-[7px] px-4 py-[6px] text-[13px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="btn-solid focus-ring rounded-[7px] px-4 py-[6px] text-[13px] font-semibold transition-opacity duration-150 hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
