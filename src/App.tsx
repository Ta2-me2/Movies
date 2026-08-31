import { useEffect, useState } from "react";
import { HashRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { GearIcon, SidebarIcon } from "./components/Icons";
import MovieFormModal from "./components/MovieFormModal";
import { useSystemAccent } from "./lib/accent";
import { openSettings } from "./lib/panels";
import { PlaybackProvider } from "./lib/playback";
import { LibraryProvider, useLibrary } from "./lib/store";
import HomePage from "./pages/HomePage";
import AllMoviesPage from "./pages/AllMoviesPage";
import SearchPage from "./pages/SearchPage";
import MoviePage from "./pages/MoviePage";
import CollectionPage from "./pages/CollectionPage";

/** Cmd+F — переход к поиску и фокус строки поиска. */
function Shortcuts() {
  const navigate = useNavigate();
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        navigate("/search");
        requestAnimationFrame(() => window.dispatchEvent(new Event("kinoteka:focus-search")));
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

/** The circle AppKit puts beside the traffic lights, on its own material. */
const COLLAPSED_CONTROL =
  "mat-float flex size-[30px] items-center justify-center rounded-full text-[var(--text-1)]";

function Shell() {
  const { ready, formState } = useLibrary();
  useSystemAccent();
  // Collapsed state lives above the router, so it survives navigating into a
  // movie and back. It intentionally resets on relaunch.
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--sidebar-w", sidebarHidden ? "0px" : "240px");
    root.setProperty("--gutter-l", sidebarHidden ? "44px" : "292px");
  }, [sidebarHidden]);

  return (
    <div className="min-h-screen text-[var(--text-1)]">
      <Shortcuts />
      <ScrollToTop />
      {/* Drag strip along the top edge. It must sit *below* the sidebar and the
          collapse control, or it swallows clicks meant for them. */}
      <div data-tauri-drag-region className="fixed top-0 inset-x-0 h-7 z-[45]" />

      {/* Once the sidebar is collapsed its controls move beside the traffic
          lights and become ringed circles — the same thing AppKit does. They
          keep the order they have inside the sidebar. */}
      <div
        style={{
          opacity: sidebarHidden ? 1 : 0,
          transition: "opacity 260ms var(--ease-soft)",
        }}
        className={`fixed left-[100px] top-[13px] z-[60] flex items-center gap-2 ${
          sidebarHidden ? "" : "pointer-events-none"
        }`}
      >
        <button
          onClick={() => void openSettings()}
          aria-label="Settings"
          className={COLLAPSED_CONTROL}
        >
          <GearIcon width={17} height={17} strokeWidth={1.7} />
        </button>
        <button
          onClick={() => setSidebarHidden(false)}
          aria-label="Show Sidebar"
          aria-expanded={false}
          className={COLLAPSED_CONTROL}
        >
          <SidebarIcon width={17} height={17} strokeWidth={1.7} />
        </button>
      </div>

      <Sidebar
        hidden={sidebarHidden}
        onToggle={() => setSidebarHidden((h) => !h)}
      />
      <main className="min-h-screen">
        {ready && (
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/all" element={<AllMoviesPage />} />
            <Route path="/search" element={<SearchPage />} />
            <Route path="/movie/:id" element={<MoviePage />} />
            <Route path="/collection/genre/:genre" element={<CollectionPage />} />
            <Route path="/collection/:kind" element={<CollectionPage />} />
          </Routes>
        )}
      </main>
      {formState.open && <MovieFormModal />}
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <PlaybackProvider>
        <HashRouter>
          <Shell />
        </HashRouter>
      </PlaybackProvider>
    </LibraryProvider>
  );
}
