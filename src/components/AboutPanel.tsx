import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import authorLogo from "../assets/author-logo.jpg";
import appIcon from "../assets/app-icon.png";
import { inTauri } from "../lib/db";
import { REPO_URL, openExternal } from "../lib/updates";
import { CloseIcon } from "./Icons";

/** The About panel: what this is, which version, and who made it. */
export default function AboutPanel({ onClose }: { onClose(): void }) {
  const [version, setVersion] = useState("");

  useEffect(() => {
    if (!inTauri) return;
    void import("@tauri-apps/api/app")
      .then(({ getVersion }) => getVersion())
      .then(setVersion)
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="anim-overlay fixed inset-0 z-[88] flex items-center justify-center bg-black/55 p-6 backdrop-blur-sm"
      onMouseDown={onClose}
    >
      <div
        className="anim-pop mat-sheet w-[330px] rounded-[12px] px-6 pb-5 pt-6 text-center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="mat-control focus-ring absolute right-4 top-4 flex size-[22px] items-center justify-center rounded-full text-[var(--text-2)] transition-colors duration-150 hover:bg-[var(--fill-emphasis)] hover:text-[var(--text-1)]"
        >
          <CloseIcon width={13} height={13} strokeWidth={2.2} />
        </button>

        {/* The app, and the person behind it, side by side */}
        <div className="flex items-center justify-center gap-3">
          <img
            src={appIcon}
            alt=""
            className="size-[76px] rounded-[17px] shadow-[0_6px_18px_rgba(0,0,0,0.45)]"
          />
          <span className="text-[15px] text-[var(--text-3)]">×</span>
          <img
            src={authorLogo}
            alt=""
            className="size-[60px] rounded-full object-cover shadow-[0_6px_18px_rgba(0,0,0,0.45)] ring-1 ring-[var(--hairline-strong)]"
          />
        </div>

        <h2 className="mt-4 text-[19px] font-semibold tracking-tight">Movie</h2>
        <p className="mt-0.5 text-[12px] tabular-nums text-[var(--text-2)]">
          {version ? `Version ${version}` : " "}
        </p>

        <p className="mt-3 text-[12px] leading-relaxed text-[var(--text-2)]">
          A personal movie library for macOS. Your films, your ratings — kept on
          your own machine.
        </p>

        <p className="mt-4 text-[13px] font-medium">
          by <span className="text-[var(--text-1)]">Ta2</span>
        </p>

        <button
          onClick={() => void openExternal(REPO_URL)}
          className="mat-control focus-ring mt-4 w-full rounded-[7px] py-[6px] text-[12px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
        >
          View on GitHub
        </button>
      </div>
    </div>,
    document.body
  );
}
