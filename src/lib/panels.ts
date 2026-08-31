import { invoke, isTauri } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";
import { REPO_URL } from "./updates";

/**
 * Everything the auxiliary windows — About and Settings — are made of: who
 * the application says it is, how a panel sizes its own window, and how the
 * rest of the app asks for one.
 *
 * They are separate macOS windows rather than sheets over the library, which
 * is what a native application does with both: About is a panel, and Settings
 * outlives whatever the main window happens to be showing.
 */

export const APP_NAME = "Movies";

export const APP_TAGLINE =
  "A personal movie library for macOS. Your films, your ratings — kept on your own machine.";

export const AUTHOR_NAME = "Ta2";

/** The repository, written the way a link is read rather than typed. */
export const REPO_LABEL = REPO_URL.replace(/^https?:\/\//, "");

/**
 * The version out of the bundle rather than a string kept here, so the number
 * in the window and the number in the build cannot drift apart.
 */
export function useAppVersion(): string {
  const [version, setVersion] = useState("");
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!isTauri()) {
        if (!cancelled) setVersion("1.0.0");
        return;
      }
      const { getVersion } = await import("@tauri-apps/api/app");
      const found = await getVersion();
      if (!cancelled) setVersion(found);
    })().catch(() => {
      // an empty version is better than an empty window
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return version;
}

// ---------------------------------------------------------------------------
// Preferences
// ---------------------------------------------------------------------------

/** Follow macOS, or hold one appearance whatever macOS is doing. */
export type ThemeChoice = "system" | "light" | "dark";

/** Which of the two app icons the application wears. */
export type IconChoice = "dark" | "light";

export interface Preferences {
  theme: ThemeChoice;
  icon: IconChoice;
}

const DEFAULTS: Preferences = { theme: "system", icon: "dark" };

/**
 * The stored preferences, with the two ways to change them.
 *
 * Writing goes through the application rather than the page: the appearance is
 * a property of the process, not of any one window, and the icon is drawn by
 * AppKit. The local copy is updated first so the control answers the click at
 * once, and the file is the record.
 */
export function usePreferences() {
  const [preferences, setPreferences] = useState<Preferences>(DEFAULTS);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    void invoke<Preferences>("preferences")
      .then((loaded) => {
        if (!cancelled) setPreferences({ ...DEFAULTS, ...loaded });
      })
      .catch(() => {
        // the defaults are already on screen
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const chooseTheme = useCallback(async (theme: ThemeChoice) => {
    setPreferences((current) => ({ ...current, theme }));
    if (isTauri()) await invoke("set_theme", { theme });
  }, []);

  const chooseIcon = useCallback(async (icon: IconChoice) => {
    setPreferences((current) => ({ ...current, icon }));
    if (isTauri()) await invoke("set_app_icon", { icon });
  }, []);

  return { preferences, chooseTheme, chooseIcon };
}

/** Resolves once a resize has actually reached the page, or shortly after. */
function afterResize(): Promise<void> {
  return new Promise((resolve) => {
    const settle = () => {
      window.removeEventListener("resize", settle);
      clearTimeout(timer);
      requestAnimationFrame(() => resolve());
    };
    const timer = setTimeout(settle, 150);
    window.addEventListener("resize", settle);
  });
}

/**
 * Sizes a panel's own window to the content it has just laid out, re-centres
 * it and shows it.
 *
 * Both panels are built hidden, because one that appears at a guessed height
 * and then snaps to the right one looks broken.
 *
 * The height is corrected rather than calculated: the number handed to the
 * window and the viewport the page ends up with are not the same number, and
 * they differ by whatever chrome the window is wearing — About wears none,
 * Settings wears a title bar. Measuring the viewport that actually resulted
 * and adjusting by the difference gets both right without either of them
 * having to know what it is wearing.
 *
 * Anything that goes wrong still ends with a visible window: an About nobody
 * can see would be worse than one an inch too tall.
 */
export async function fitWindowToContent(width: number, max = 720): Promise<void> {
  if (!isTauri()) return;
  const { getCurrentWindow } = await import("@tauri-apps/api/window");
  const panel = getCurrentWindow();
  try {
    const { LogicalSize } = await import("@tauri-apps/api/dpi");
    const content = document.getElementById("root");
    if (!content) throw new Error("nothing to measure");

    await document.fonts.ready;
    let target = (await panel.innerSize()).toLogical(await panel.scaleFactor()).height;
    let resized = false;

    for (let attempt = 0; attempt < 3; attempt++) {
      const needed = Math.min(max, Math.ceil(content.getBoundingClientRect().height));
      const error = needed - document.documentElement.clientHeight;
      if (Math.abs(error) < 1) break;
      target += error;
      await panel.setSize(new LogicalSize(width, Math.round(target)));
      await afterResize();
      resized = true;
    }
    // Only a window that actually changed size is re-centred; otherwise every
    // re-measure would walk the panel back to the middle of the screen after
    // the user had put it somewhere else.
    if (resized) await panel.center();
  } catch {
    // fall through to showing it at the size it was created with
  }
  await panel.show().catch(() => {});
}

/** Opens About, or raises it when it is already on screen. */
export async function openAbout(): Promise<void> {
  if (!isTauri()) return;
  await invoke("open_about");
}

/** Opens Settings, or raises it when it is already on screen. */
export async function openSettings(): Promise<void> {
  if (!isTauri()) return;
  await invoke("open_settings");
}
