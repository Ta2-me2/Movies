import { useEffect } from "react";
import iconDark from "../assets/app-icon-dark.png";
import iconLight from "../assets/app-icon-light.png";
import authorLogo from "../assets/author-logo.png";
import { useSystemAccent } from "../lib/accent";
import {
  APP_NAME,
  APP_TAGLINE,
  AUTHOR_NAME,
  REPO_LABEL,
  fitWindowToContent,
  useAppVersion,
  usePreferences,
} from "../lib/panels";
import { REPO_URL, openExternal } from "../lib/updates";

/** Width of the panel; its height comes from the content. */
const WIDTH = 380;

/**
 * The window behind "About Movies".
 *
 * The panel AppKit gives away for free lists a bundle identifier and a
 * copyright line, which is what a company wants said about its product. This
 * one says what the application is for and who wrote it, which is what a
 * person opening it actually wanted to know.
 */
export default function AboutPanel() {
  const version = useAppVersion();
  // The panel is about how the application presents itself, so it shows the
  // icon the user actually chose rather than the one in the bundle.
  const { preferences } = usePreferences();
  useSystemAccent();

  // Measured on mount and again when the version lands. The version line is
  // there either way, so the height does not move between the two — the panel
  // is never held back from appearing by an answer that has not arrived.
  useEffect(() => {
    void fitWindowToContent(WIDTH);
  }, [version]);

  return (
    <div className="flex flex-col">
      {/* No title bar, so the panel is dragged by its own background. Tauri
          only starts a drag from the element carrying the attribute, which
          leaves the icon, the text and the link clickable. */}
      <div
        data-tauri-drag-region
        className="flex flex-col items-center gap-[14px] px-8 pb-[26px] pt-[34px]"
      >
        <img
          src={preferences.icon === "light" ? iconLight : iconDark}
          alt=""
          width={104}
          height={104}
          className="size-[104px]"
          draggable={false}
        />

        <div className="flex flex-col items-center gap-[5px]">
          <h1 className="text-[26px] font-semibold leading-[1.15] tracking-[-0.015em] text-[var(--text-1)]">
            {APP_NAME}
          </h1>
          <p className="text-[12px] tabular-nums text-[var(--text-2)]">
            Version {version}
          </p>
        </div>

        <p className="text-center text-[12px] leading-[1.45] text-[var(--text-2)]">
          {APP_TAGLINE}
        </p>
      </div>

      <div className="h-px bg-[var(--hairline)]" />

      <div className="flex items-center gap-[10px] px-[26px] py-4">
        <img
          src={authorLogo}
          alt=""
          className="size-[30px] shrink-0 rounded-full border-[0.5px] border-[var(--hairline-strong)] object-cover"
          draggable={false}
        />
        <div className="flex min-w-0 flex-col gap-px">
          <span className="text-[11px] font-medium text-[var(--text-1)]">
            {AUTHOR_NAME}
          </span>
          <button
            onClick={() => void openExternal(REPO_URL)}
            className="w-fit text-left text-[10px] text-[var(--accent)] hover:underline"
          >
            {REPO_LABEL}
          </button>
        </div>
      </div>
    </div>
  );
}
