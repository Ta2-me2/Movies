import { invoke, isTauri } from "@tauri-apps/api/core";
import { useEffect } from "react";

/**
 * Adopts the user's System Settings accent colour, as a native app would.
 *
 * Every window has to ask for itself: each one is its own document, so the
 * value written onto the main window's stylesheet is not visible to About or
 * Settings. Failing quietly leaves the systemBlue standby in place.
 */
export function useSystemAccent(): void {
  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;

    const read = () => {
      void invoke<string | null>("accent_color")
        .then((rgb) => {
          if (!cancelled && rgb) {
            document.documentElement.style.setProperty("--accent", `rgb(${rgb})`);
          }
        })
        .catch(() => {
          // stylesheet keeps its systemBlue default
        });
    };

    read();
    // The accent is not the same colour in the two appearances — systemBlue is
    // lighter in the dark one — so it is read again whenever the appearance
    // changes underneath us.
    const scheme = window.matchMedia("(prefers-color-scheme: dark)");
    scheme.addEventListener("change", read);
    return () => {
      cancelled = true;
      scheme.removeEventListener("change", read);
    };
  }, []);
}
