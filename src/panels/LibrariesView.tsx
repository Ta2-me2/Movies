import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog";
import {
  ArchiveIcon,
  EllipsisIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  RevealIcon,
  TrashIcon,
} from "../components/Icons";
import {
  createLibrary,
  deleteLibrary,
  describeContents,
  exportLibrary,
  formatUpdated,
  listLibraries,
  openLibrary,
  renameLibrary,
  revealLibrary,
  type LibraryInfo,
} from "../lib/libraries";

/**
 * The list of libraries in the store.
 *
 * One is open; the rest are sitting there untouched, which is the whole point
 * — nothing here writes to a library except the one operation the user asked
 * for, and opening one leaves every other exactly as it was.
 */
export default function LibrariesView({
  onDone,
  initialSelection,
}: {
  onDone(): void;
  initialSelection?: string | null;
}) {
  const [libraries, setLibraries] = useState<LibraryInfo[]>([]);
  const [selected, setSelected] = useState<string | null>(initialSelection ?? null);
  /** Name being renamed, or "" while a new library is being named. */
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const menuRoot = useRef<HTMLDivElement>(null);
  const fieldRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(
    async (select?: string) => {
      const found = await listLibraries();
      setLibraries(found);
      setSelected((current) => {
        const wanted = select ?? current;
        if (wanted && found.some((library) => library.name === wanted)) return wanted;
        return found.find((library) => library.current)?.name ?? null;
      });
    },
    [],
  );

  useEffect(() => {
    void refresh().catch((e) => setError(String(e)));
  }, [refresh]);

  useEffect(() => {
    if (editing !== null) fieldRef.current?.select();
  }, [editing]);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRoot.current && !menuRoot.current.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    try {
      await work();
    } catch (e) {
      setError(typeof e === "string" ? e : (e as Error).message ?? String(e));
    }
  };

  const startCreate = () => {
    setError(null);
    setEditing("");
    setDraft("Untitled Library");
  };

  const startRename = () => {
    if (!selected) return;
    setMenuOpen(false);
    setError(null);
    setEditing(selected);
    setDraft(selected);
  };

  const commitEdit = () =>
    void run(async () => {
      const name = draft.trim();
      const wasCreating = editing === "";
      setEditing(null);
      if (!name) return;
      const saved = wasCreating ? await createLibrary(name) : await renameLibrary(editing!, name);
      await refresh(saved);
    });

  const chosen = libraries.find((library) => library.name === selected) ?? null;
  const canOpen = !!chosen && !chosen.current;

  return (
    <div className="flex h-[520px] flex-col">
      <div className="px-5 pb-3 pt-4">
        <h1 className="text-[17px] font-semibold tracking-tight text-[var(--text-1)]">
          Libraries
        </h1>
        <p className="mt-1 text-[12px] leading-snug text-[var(--text-2)]">
          One library is open at a time. Opening another leaves this one exactly as it is.
        </p>
      </div>

      <div className="h-px shrink-0 bg-[var(--hairline)]" />

      <div className="thin-scrollbar flex-1 overflow-y-auto p-2">
        {libraries.map((library) => {
          const active = library.name === selected;
          const renaming = editing === library.name;
          return (
            <button
              key={library.name}
              onClick={() => setSelected(library.name)}
              onDoubleClick={() => {
                setSelected(library.name);
                setEditing(library.name);
                setDraft(library.name);
              }}
              className={`flex w-full items-center gap-2.5 rounded-[7px] px-2.5 py-2 text-left transition-colors duration-100 ${
                active ? "text-white" : "hover:bg-[var(--fill-subtle)]"
              }`}
              style={active ? { backgroundColor: "var(--accent)" } : undefined}
            >
              <FolderIcon
                width={19}
                height={19}
                className={active ? "shrink-0 text-white/80" : "shrink-0 text-[var(--text-2)]"}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  {renaming ? (
                    <input
                      ref={fieldRef}
                      value={draft}
                      autoFocus
                      onChange={(e) => setDraft(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      onBlur={commitEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitEdit();
                        if (e.key === "Escape") setEditing(null);
                      }}
                      className="mat-control w-full rounded-[5px] px-1.5 py-[1px] text-[13px] font-semibold text-[var(--text-1)] outline-none"
                    />
                  ) : (
                    <span
                      className={`truncate text-[13px] font-semibold ${
                        active ? "text-white" : "text-[var(--text-1)]"
                      }`}
                    >
                      {library.name}
                    </span>
                  )}
                  {library.current && !renaming && (
                    <span
                      className={`shrink-0 rounded-full px-[7px] py-[1px] text-[10px] font-medium ${
                        active ? "bg-white/25 text-white" : "bg-[var(--fill)] text-[var(--text-2)]"
                      }`}
                    >
                      Open
                    </span>
                  )}
                </span>
                <span
                  className={`mt-[1px] block truncate text-[11px] ${
                    active ? "text-white/75" : "text-[var(--text-2)]"
                  }`}
                >
                  {describeContents(library)}
                </span>
              </span>
              <span
                className={`shrink-0 text-[11px] ${
                  active ? "text-white/70" : "text-[var(--text-3)]"
                }`}
              >
                {library.updated ? `Updated ${formatUpdated(library.updated)}` : ""}
              </span>
            </button>
          );
        })}

        {editing === "" && (
          <div className="flex items-center gap-2.5 rounded-[7px] px-2.5 py-2">
            <FolderIcon width={19} height={19} className="shrink-0 text-[var(--text-2)]" />
            <input
              ref={fieldRef}
              value={draft}
              autoFocus
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commitEdit();
                if (e.key === "Escape") setEditing(null);
              }}
              className="mat-control w-full rounded-[5px] px-1.5 py-[2px] text-[13px] font-semibold text-[var(--text-1)] outline-none"
            />
          </div>
        )}
      </div>

      {(error || status) && (
        <p
          className={`px-5 pb-1 text-[11px] leading-snug ${
            error ? "text-[var(--danger)]" : "text-[var(--text-2)]"
          }`}
        >
          {error ?? status}
        </p>
      )}

      <div className="h-px shrink-0 bg-[var(--hairline)]" />

      <div className="flex shrink-0 items-center gap-2 px-4 py-3">
        <button
          onClick={startCreate}
          aria-label="New Library"
          className="mat-control focus-ring flex size-[28px] items-center justify-center rounded-[7px] text-[var(--text-1)] transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
        >
          <PlusIcon width={15} height={15} strokeWidth={2.4} />
        </button>

        <div ref={menuRoot} className="relative">
          <button
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Library actions"
            disabled={!chosen}
            className="mat-control focus-ring flex size-[28px] items-center justify-center rounded-[7px] text-[var(--text-1)] transition-colors duration-150 hover:bg-[var(--fill-emphasis)] disabled:opacity-40"
          >
            <EllipsisIcon width={15} height={15} />
          </button>

          {menuOpen && chosen && (
            <div className="anim-pop mat-popover absolute bottom-[calc(100%+6px)] left-0 z-40 min-w-[190px] rounded-[8px] p-1">
              <MenuItem icon={PencilIcon} label="Rename…" onClick={startRename} />
              <MenuItem
                icon={RevealIcon}
                label="Show in Finder"
                onClick={() => {
                  setMenuOpen(false);
                  void run(() => revealLibrary(chosen.name));
                }}
              />
              <MenuItem
                icon={ArchiveIcon}
                label="Export…"
                onClick={() => {
                  setMenuOpen(false);
                  void run(async () => {
                    const done = await exportLibrary(
                      chosen.name,
                      (percent) =>
                        setStatus(`Writing a backup of “${chosen.name}” — ${percent}%`),
                      () => setStatus(`Writing a backup of “${chosen.name}”…`),
                    );
                    setStatus(done ? `Backed up “${chosen.name}”.` : null);
                  });
                }}
              />
              <MenuItem
                icon={TrashIcon}
                label="Delete…"
                destructive
                disabled={chosen.current}
                onClick={() => {
                  setMenuOpen(false);
                  setConfirming(chosen.name);
                }}
              />
            </div>
          )}
        </div>

        <div className="flex-1" />

        <button
          onClick={onDone}
          className="mat-control focus-ring rounded-[7px] px-4 py-[6px] text-[13px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
        >
          Done
        </button>
        <button
          onClick={() => chosen && void run(() => openLibrary(chosen.name))}
          disabled={!canOpen}
          className="focus-ring rounded-[7px] px-4 py-[6px] text-[13px] font-semibold text-white transition-opacity duration-150 hover:opacity-90 disabled:opacity-40"
          style={{ backgroundColor: "var(--accent)" }}
        >
          Open
        </button>
      </div>

      {confirming && (
        <ConfirmDialog
          title={`Delete “${confirming}”?`}
          message="The library folder and everything in it — the database, its posters and its trailers — is removed for good. Export a backup first if you might want it."
          confirmLabel="Delete"
          onConfirm={() => {
            const name = confirming;
            setConfirming(null);
            void run(async () => {
              await deleteLibrary(name);
              await refresh();
            });
          }}
          onCancel={() => setConfirming(null)}
        />
      )}
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  destructive,
  disabled,
}: {
  icon: typeof PencilIcon;
  label: string;
  onClick(): void;
  destructive?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2 rounded-[6px] px-2.5 py-[6px] text-left text-[13px] font-medium transition-colors duration-100 hover:bg-[var(--fill)] disabled:opacity-40 disabled:hover:bg-transparent ${
        destructive ? "text-[var(--danger)]" : "text-[var(--text-1)]"
      }`}
    >
      <Icon width={14} height={14} />
      {label}
    </button>
  );
}
