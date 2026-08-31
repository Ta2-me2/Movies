import { useCallback, useEffect, useState, type ReactNode } from "react";
import iconDark from "../assets/app-icon-dark.png";
import iconLight from "../assets/app-icon-light.png";
import {
  ArchiveIcon,
  ChevronRightIcon,
  LibrariesIcon,
  RestoreIcon,
  RevealIcon,
} from "../components/Icons";
import { useSystemAccent } from "../lib/accent";
import {
  describeContents,
  exportLibrary,
  importLibrary,
  listLibraries,
  revealLibrary,
  type LibraryInfo,
} from "../lib/libraries";
import LibrariesView from "./LibrariesView";
import {
  APP_NAME,
  fitWindowToContent,
  openAbout,
  useAppVersion,
  usePreferences,
  type IconChoice,
  type ThemeChoice,
} from "../lib/panels";

/** Width of the window; its height comes from the sections below. */
const WIDTH = 520;

const THEMES: [ThemeChoice, string][] = [
  ["system", "System"],
  ["light", "Light"],
  ["dark", "Dark"],
];

const ICONS: [IconChoice, string, string][] = [
  ["dark", "Dark icon", iconDark],
  ["light", "Light icon", iconLight],
];

/**
 * A grouped list, the way macOS lays settings out: a quiet label, then the
 * rows inside one rounded well, separated by hairlines.
 */
function Section({ title, children }: { title?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[7px]">
      {title && (
        <h2 className="px-1 text-[11px] font-medium text-[var(--text-2)]">
          {title}
        </h2>
      )}
      <div className="overflow-hidden rounded-[8px] bg-[var(--well)] shadow-[inset_0_0_0_0.5px_var(--hairline)] [&>*+*]:border-t [&>*+*]:border-[var(--hairline)]">
        {children}
      </div>
    </section>
  );
}

/** A setting: what it is on the left, what it is set to on the right. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-[10px]">
      <span className="text-[13px] text-[var(--text-1)]">{label}</span>
      {children}
    </div>
  );
}

/** A fact about the library: what it is on the left, what it says on the right. */
function InfoRow({
  label,
  value,
  onAction,
  actionLabel,
  plain,
}: {
  label: string;
  value: string;
  onAction?: () => void;
  actionLabel?: string;
  /** Short enough to read as it is, so it needs no hover tooltip. */
  plain?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-[7px]">
      <span className="shrink-0 text-[12px] text-[var(--text-1)]">{label}</span>
      <span
        className="min-w-0 flex-1 truncate text-right text-[12px] text-[var(--text-2)]"
        title={plain ? undefined : value}
      >
        {value}
      </span>
      {onAction && (
        <button
          onClick={onAction}
          aria-label={actionLabel}
          className="focus-ring -mr-1 flex size-[20px] shrink-0 items-center justify-center rounded-[5px] transition-colors duration-150 hover:bg-[var(--fill)]"
          style={{ color: "var(--accent)" }}
        >
          <RevealIcon width={14} height={14} />
        </button>
      )}
    </div>
  );
}

/** The pill buttons along the bottom of the library card. */
function PillButton({
  icon: Icon,
  label,
  onClick,
  disabled,
}: {
  icon: typeof ArchiveIcon;
  label: string;
  onClick(): void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="mat-control focus-ring flex items-center gap-1.5 rounded-full px-3 py-[5px] text-[12px] font-medium text-[var(--text-1)] transition-colors duration-150 hover:bg-[var(--fill-emphasis)] disabled:opacity-40"
    >
      <Icon width={14} height={14} />
      {label}
    </button>
  );
}

/** A row that leads somewhere, marked by the disclosure chevron macOS uses. */
function LinkRow({ label, onClick }: { label: string; onClick(): void }) {
  return (
    <button
      onClick={onClick}
      className="focus-ring flex w-full items-center justify-between gap-3 px-3.5 py-[9px] text-left text-[13px] text-[var(--text-1)] transition-colors duration-150 hover:bg-[var(--fill-subtle)]"
    >
      {label}
      <ChevronRightIcon
        width={14}
        height={14}
        strokeWidth={2}
        className="shrink-0 text-[var(--text-3)]"
      />
    </button>
  );
}

/** The segmented control macOS uses for a short, exclusive choice. */
function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: [T, string][];
  onChange(next: T): void;
}) {
  return (
    <div className="mat-control flex shrink-0 gap-[2px] rounded-[7px] p-[2px]">
      {options.map(([option, label]) => {
        const active = option === value;
        return (
          <button
            key={option}
            onClick={() => onChange(option)}
            aria-pressed={active}
            className={`rounded-[5px] px-2.5 py-[3px] text-[12px] font-medium transition-colors duration-150 ${
              active ? "text-white" : "text-[var(--text-1)] hover:bg-[var(--fill)]"
            }`}
            style={active ? { backgroundColor: "var(--accent)" } : undefined}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

/**
 * The Settings window.
 *
 * Sections go in the order macOS puts them: what the application looks like
 * first, what it is last. Adding another is a `Section` with rows in it.
 */
export default function SettingsPanel() {
  const version = useAppVersion();
  const { preferences, chooseTheme, chooseIcon } = usePreferences();
  const [library, setLibrary] = useState<LibraryInfo | null>(null);
  const [showLibraries, setShowLibraries] = useState(false);
  const [selectAfterImport, setSelectAfterImport] = useState<string | null>(null);
  // `busy` is an operation in flight and disables the buttons; `note` is what
  // it had to say when it finished and does not.
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useSystemAccent();

  const loadLibrary = useCallback(async () => {
    const found = await listLibraries();
    setLibrary(found.find((entry) => entry.current) ?? null);
  }, []);

  useEffect(() => {
    void loadLibrary().catch(() => setLibrary(null));
  }, [loadLibrary, showLibraries, note]);

  useEffect(() => {
    void fitWindowToContent(WIDTH);
  }, [version, preferences, library, showLibraries, busy, note, error]);

  const run = async (work: () => Promise<unknown>) => {
    setError(null);
    setNote(null);
    try {
      await work();
    } catch (e) {
      setError(typeof e === "string" ? e : ((e as Error).message ?? String(e)));
    } finally {
      setBusy(null);
    }
  };

  if (showLibraries) {
    return (
      <LibrariesView
        initialSelection={selectAfterImport}
        onDone={() => {
          setSelectAfterImport(null);
          setShowLibraries(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-5 p-5">
      <Section title="Appearance">
        <Row label="Theme">
          <Segmented
            value={preferences.theme}
            options={THEMES}
            onChange={(theme) => void chooseTheme(theme)}
          />
        </Row>
        <Row label="App Icon">
          <div className="flex shrink-0 gap-2">
            {ICONS.map(([choice, label, src]) => {
              const active = choice === preferences.icon;
              return (
                <button
                  key={choice}
                  onClick={() => void chooseIcon(choice)}
                  aria-label={label}
                  aria-pressed={active}
                  className="focus-ring rounded-[11px] p-[3px] transition-shadow duration-150"
                  style={{
                    boxShadow: active
                      ? "0 0 0 2px var(--accent)"
                      : "0 0 0 0.5px var(--hairline-strong)",
                  }}
                >
                  <img
                    src={src}
                    alt=""
                    width={38}
                    height={38}
                    className="block size-[38px]"
                    draggable={false}
                  />
                </button>
              );
            })}
          </div>
        </Row>
      </Section>

      <section className="flex flex-col gap-[7px]">
        <h2 className="px-1 text-[11px] font-medium text-[var(--text-2)]">Your Library</h2>
        <div className="flex flex-col gap-3 rounded-[8px] bg-[var(--well)] p-3.5 shadow-[inset_0_0_0_0.5px_var(--hairline)]">
          <p className="text-[12px] leading-[1.45] text-[var(--text-2)]">
            Posters, trailers and everything you have written about your films live in one
            folder. A backup is that folder, zipped — movie files are played where they
            already sit on disk, so they are not part of it.
          </p>

          <div className="overflow-hidden rounded-[7px] shadow-[inset_0_0_0_0.5px_var(--hairline)] [&>*+*]:border-t [&>*+*]:border-[var(--hairline)]">
            <InfoRow
              label="Location"
              value={library?.path ?? "—"}
              actionLabel="Show in Finder"
              onAction={
                library ? () => void run(() => revealLibrary(library.name)) : undefined
              }
            />
            <InfoRow label="Contents" value={library ? describeContents(library) : "—"} plain />
          </div>

          <div className="flex items-center gap-2">
            <PillButton
              icon={ArchiveIcon}
              label="Export Library…"
              disabled={!library || busy !== null}
              onClick={() =>
                void run(async () => {
                  if (!library) return;
                  const written = await exportLibrary(
                    library.name,
                    (percent) => setBusy(`Writing the backup — ${percent}%`),
                    () => setBusy("Writing the backup…"),
                  );
                  if (written) setNote(`Backed up “${library.name}”.`);
                })
              }
            />
            <PillButton
              icon={RestoreIcon}
              label="Restore from Backup…"
              disabled={busy !== null}
              onClick={() =>
                void run(async () => {
                  const imported = await importLibrary(
                    (percent) => setBusy(`Reading the backup — ${percent}%`),
                    () => setBusy("Reading the backup…"),
                  );
                  if (imported) {
                    setSelectAfterImport(imported);
                    setShowLibraries(true);
                  }
                })
              }
            />
            <div className="flex-1" />
            <PillButton
              icon={LibrariesIcon}
              label="Libraries…"
              onClick={() => setShowLibraries(true)}
            />
          </div>

          {(busy || note || error) && (
            <p
              className={`text-[11px] leading-snug ${
                error ? "text-[var(--danger)]" : "text-[var(--text-2)]"
              }`}
            >
              {error ?? busy ?? note}
            </p>
          )}
        </div>
      </section>

      <Section title="About">
        <div className="flex items-center gap-3 px-3.5 py-3">
          <img
            src={preferences.icon === "light" ? iconLight : iconDark}
            alt=""
            width={44}
            height={44}
            className="size-[44px] shrink-0"
            draggable={false}
          />
          <div className="flex flex-col gap-[2px]">
            <span className="text-[13px] font-semibold text-[var(--text-1)]">
              {APP_NAME}
            </span>
            <span className="text-[11px] tabular-nums text-[var(--text-2)]">
              Version {version}
            </span>
          </div>
        </div>
        <LinkRow label="About Movies" onClick={() => void openAbout()} />
      </Section>
    </div>
  );
}
