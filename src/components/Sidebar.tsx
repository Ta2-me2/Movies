import { NavLink } from "react-router-dom";
import { useLibrary } from "../lib/store";
import { FilmIcon, HomeIcon, PlusIcon, SearchIcon, SidebarIcon } from "./Icons";

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
          carries the collapse control on the right, as AppKit does. The bare
          background here also drags the window — Tauri skips the button. */}
      <div className="flex h-13 shrink-0 items-center justify-end">
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

      <div className="mt-auto">
        <button
          onClick={() => openForm()}
          className="focus-ring flex w-full items-center justify-center gap-1.5 rounded-[7px] bg-white py-[6px] text-[13px] font-semibold text-black transition-opacity duration-150 hover:opacity-90 active:opacity-75"
        >
          <PlusIcon width={14} height={14} strokeWidth={2.6} />
          Add Movie
        </button>
      </div>
    </aside>
  );
}
