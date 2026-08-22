import { useEffect, useRef, useState } from "react";
import { useLibrary } from "../lib/store";
import { normalizeGenre, sameGenre } from "../lib/utils";
import ConfirmDialog from "./ConfirmDialog";
import { CheckIcon, ChevronDownIcon, CloseIcon, PlusIcon, TrashIcon } from "./Icons";

interface Props {
  selected: string[];
  onChange(genres: string[]): void;
}

/**
 * Genre selector: chips for the movie's genres plus a dropdown with the global
 * genre list — pick existing ones, add new ones, or delete a genre entirely.
 */
export default function GenrePicker({ selected, onChange }: Props) {
  const { genres, addGenre, deleteGenre } = useLibrary();
  const [open, setOpen] = useState(false);
  const [newGenre, setNewGenre] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const newInput = useRef<HTMLInputElement>(null);

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
    // capture phase so Escape closes only the dropdown, not the whole form
    window.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey, true);
    };
  }, [open]);

  useEffect(() => {
    if (open) newInput.current?.focus();
  }, [open]);

  const toggle = (g: string) => {
    if (selected.some((x) => sameGenre(x, g))) {
      onChange(selected.filter((x) => !sameGenre(x, g)));
    } else {
      onChange([...selected, g]);
    }
  };

  const submitNew = async () => {
    const g = normalizeGenre(newGenre);
    if (!g) return;
    const canonical = await addGenre(g);
    if (!selected.some((x) => sameGenre(x, canonical))) {
      onChange([...selected, canonical]);
    }
    setNewGenre("");
  };

  const removeEverywhere = async (g: string) => {
    setConfirmDelete(null);
    await deleteGenre(g);
    onChange(selected.filter((x) => !sameGenre(x, g)));
  };

  return (
    <div ref={root}>
      <div className="flex flex-wrap items-center gap-1.5">
        {selected.map((g) => (
          <span
            key={g}
            className="mat-control flex items-center gap-1 rounded-full py-[3px] pl-2.5 pr-1.5 text-[11px] font-medium"
          >
            {g}
            <button
              type="button"
              onClick={() => onChange(selected.filter((x) => x !== g))}
              aria-label={`Remove ${g} from this movie`}
              className="flex size-4 items-center justify-center rounded-full text-[var(--text-3)] hover:text-[var(--text-1)]"
            >
              <CloseIcon width={9} height={9} strokeWidth={2.6} />
            </button>
          </span>
        ))}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="mat-control focus-ring flex items-center gap-1.5 rounded-full px-3 py-[4px] text-[11px] font-medium text-[var(--text-1)] transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
        >
          Add genre
          <ChevronDownIcon
            width={12}
            height={12}
            strokeWidth={2.4}
            className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
      </div>

      {open && (
        <div className="anim-pop mt-2 rounded-[10px] bg-[var(--fill-subtle)] p-1.5 shadow-[inset_0_0_0_0.5px_var(--hairline)]">
          <div className="flex items-center gap-1.5 px-1 pb-2">
            <input
              ref={newInput}
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void submitNew();
                }
              }}
              placeholder="New genre…"
              className="mat-control focus-ring w-full rounded-[6px] px-2.5 py-[5px] text-[12px] text-[var(--text-1)] placeholder-[var(--text-3)] outline-none"
            />
            <button
              type="button"
              onClick={() => void submitNew()}
              aria-label="Add new genre"
              className="focus-ring flex size-[27px] shrink-0 items-center justify-center rounded-[6px] bg-white text-black transition-opacity duration-150 hover:opacity-90 disabled:opacity-40"
              disabled={!normalizeGenre(newGenre)}
            >
              <PlusIcon width={14} height={14} strokeWidth={2.6} />
            </button>
          </div>

          {genres.length === 0 ? (
            <p className="px-2 pb-1.5 pt-0.5 text-[12px] text-[var(--text-3)]">
              No genres yet — add one above
            </p>
          ) : (
            <div className="thin-scrollbar max-h-[190px] overflow-y-auto">
              {genres.map((g) => {
                const isSelected = selected.some((x) => sameGenre(x, g));
                return (
                  <div
                    key={g}
                    className="group/genre flex items-center gap-2 rounded-[6px] px-2 py-[5px] transition-colors duration-100 hover:bg-[var(--fill-subtle)]"
                  >
                    <button
                      type="button"
                      onClick={() => toggle(g)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className="flex size-4 shrink-0 items-center justify-center">
                        {isSelected && (
                          <CheckIcon
                            width={13}
                            height={13}
                            strokeWidth={2.6}
                            style={{ color: "var(--accent)" }}
                          />
                        )}
                      </span>
                      <span className="truncate text-[12px]">{g}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDelete(g)}
                      aria-label={`Delete genre ${g}`}
                      className="flex size-6 shrink-0 items-center justify-center rounded-[5px] text-transparent transition-colors duration-100 hover:bg-[var(--fill)] group-hover/genre:text-[var(--text-3)] hover:!text-[#ff6961]"
                    >
                      <TrashIcon width={13} height={13} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {confirmDelete && (
        <ConfirmDialog
          title={`Delete genre “${confirmDelete}”?`}
          message="It will be removed from the genre list and from every movie that uses it."
          confirmLabel="Delete"
          onConfirm={() => void removeEverywhere(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
