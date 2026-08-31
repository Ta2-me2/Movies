import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import { openSettings } from "../lib/panels";
import { useLibrary } from "../lib/store";
import { checkForUpdate, openExternal, type UpdateInfo } from "../lib/updates";
import { FilmIcon, GearIcon, HomeIcon, PlusIcon, SearchIcon, SidebarIcon } from "./Icons";

const items = [
  { to: "/search", label: "Search", icon: SearchIcon },
  { to: "/", label: "Home", icon: HomeIcon },
  { to: "/all", label: "All Movies", icon: FilmIcon },
];

/**
 * A macOS sidebar, following the one AppKit draws for `NavigationSplitView`:
 * a full-height translucent column flush with the window edge, rows that are
 * filled with the accent colour when selected, and the collapse control living
 * at the top of the column itself.
 */
export default function Sidebar({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle(): void;
}) {
  const { openForm } = useLibrary();
  const [update, setUpdate] = useState<UpdateInfo | null>(null);

  // A quiet look for a newer release, once per launch. Anything that goes
  // wrong — offline, rate limited, no releases yet — simply shows nothing.
  useEffect(() => {
    let cancelled = false;
    void checkForUpdate().then((found) => {
      if (!cancelled) setUpdate(found);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <aside
      data-tauri-drag-region
      aria-hidden={hidden}
      /* Plain inline transform rather than a translate utility: Tailwind's
         drives the slide through a registered custom property, and this engine
         would not let that property take an overridden value. */
      style={{
        transform: hidden ? "translateX(-100%)" : "translateX(0)",
        transition: "transform 320ms var(--ease-soft)",
      }}
      className={`mat-sidebar fixed left-0 top-0 bottom-0 z-50 flex w-[240px] flex-col border-r border-[var(--hairline)] px-2.5 pb-3 ${
        hidden ? "pointer-events-none" : ""
      }`}
    >
      {/* Toolbar row: leaves room for the traffic lights on the left and
          carries Settings and the collapse control on the right, as AppKit
          does. The bare background here also drags the window — Tauri skips
          the buttons. */}
      <div className="flex h-13 shrink-0 items-center justify-end gap-[2px]">
        <button
          onClick={() => void openSettings()}
          aria-label="Settings"
          className="flex size-[26px] items-center justify-center rounded-[6px] text-[var(--text-2)] transition-colors duration-150 hover:bg-[var(--fill)] hover:text-[var(--text-1)]"
        >
          <GearIcon width={17} height={17} strokeWidth={1.7} />
        </button>
        <button
          onClick={onToggle}
          aria-label="Hide Sidebar"
          className="flex size-[26px] items-center justify-center rounded-[6px] text-[var(--text-2)] transition-colors duration-150 hover:bg-[var(--fill)] hover:text-[var(--text-1)]"
        >
          <SidebarIcon width={17} height={17} strokeWidth={1.7} />
        </button>
      </div>

      <nav className="flex flex-col gap-[2px]">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 rounded-[6px] px-2.5 py-[6px] text-[13px] font-medium transition-colors duration-150 ${
                isActive
                  ? "text-white"
                  : "text-[var(--text-1)] hover:bg-[var(--fill-subtle)]"
              }`
            }
            style={({ isActive }) =>
              isActive ? { backgroundColor: "var(--accent)" } : undefined
            }
          >
            {({ isActive }) => (
              <>
                <Icon
                  width={17}
                  height={17}
                  className={isActive ? "text-white" : "text-[var(--text-2)]"}
                />
                {label}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-2">
        {update && (
          <button
            onClick={() => void openExternal(update.url)}
            title={`Version ${update.version} is available on GitHub`}
            className="focus-ring flex w-full items-center gap-2 rounded-[7px] px-2.5 py-[6px] text-left text-[12px] font-medium transition-colors duration-150 hover:bg-[var(--fill-subtle)]"
          >
            <span
              className="size-[7px] shrink-0 rounded-full"
              style={{ backgroundColor: "var(--accent)" }}
              aria-hidden
            />
            <span className="min-w-0 flex-1 truncate text-[var(--text-1)]">
              Update available
            </span>
            <span className="shrink-0 tabular-nums text-[var(--text-3)]">
              {update.version}
            </span>
          </button>
        )}

        <button
          onClick={() => openForm()}
          className="btn-solid focus-ring flex w-full items-center justify-center gap-1.5 rounded-[7px] py-[6px] text-[13px] font-semibold transition-opacity duration-150 hover:opacity-90 active:opacity-75"
        >
          <PlusIcon width={14} height={14} strokeWidth={2.6} />
          Add Movie
        </button>
      </div>
    </aside>
  );
}
