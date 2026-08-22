import { useEffect, useState } from "react";
import { HashRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import { SidebarIcon } from "./components/Icons";
import MovieFormModal from "./components/MovieFormModal";
import { inTauri } from "./lib/db";
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

/** Adopts the user's System Settings accent colour, as a native app would. */
function SystemAccent() {
  useEffect(() => {
    if (!inTauri) return;
    let cancelled = false;
    (async () => {
      const { invoke } = await import("@tauri-apps/api/core");
      const rgb = await invoke<string | null>("accent_color");
      if (!cancelled && rgb) {
        document.documentElement.style.setProperty("--accent", `rgb(${rgb})`);
      }
    })().catch(() => {
      // stylesheet keeps its systemBlue default
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return null;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function Shell() {
  const { ready, formState } = useLibrary();
  // Collapsed state lives above the router, so it survives navigating into a
  // movie and back. It intentionally resets on relaunch.
  const [sidebarHidden, setSidebarHidden] = useState(false);

  useEffect(() => {
    const root = document.documentElement.style;
    root.setProperty("--sidebar-w", sidebarHidden ? "0px" : "240px");
    root.setProperty("--gutter-l", sidebarHidden ? "44px" : "292px");
  }, [sidebarHidden]);

  return (
    <div className="min-h-screen text-white">
      <Shortcuts />
      <SystemAccent />
      <ScrollToTop />
      {/* Drag strip along the top edge. It must sit *below* the sidebar and the
          collapse control, or it swallows clicks meant for them. */}
      <div data-tauri-drag-region className="fixed top-0 inset-x-0 h-7 z-[45]" />

      {/* Once the sidebar is collapsed its control moves beside the traffic
          lights and becomes a ringed circle — the same thing AppKit does. */}
      <button
        onClick={() => setSidebarHidden(false)}
        aria-label="Show Sidebar"
        aria-expanded={false}
        style={{
          opacity: sidebarHidden ? 1 : 0,
          transition: "opacity 260ms var(--ease-soft)",
        }}
        className={`fixed left-[100px] top-[13px] z-[60] flex size-[30px] items-center justify-center rounded-full text-[var(--text-2)] shadow-[inset_0_0_0_0.5px_var(--hairline-strong)] hover:bg-[var(--fill)] hover:text-[var(--text-1)] ${
          sidebarHidden ? "" : "pointer-events-none"
        }`}
      >
        <SidebarIcon width={17} height={17} strokeWidth={1.7} />
      </button>

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
