import { useEffect } from "react";
import { createPortal } from "react-dom";

interface Props {
  title: string;
  message: string;
  confirmLabel: string;
  /** Red confirm text. Off for plain notices that destroy nothing. */
  destructive?: boolean;
  /** Hides Cancel, for a notice with nothing to decline. */
  hideCancel?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export default function ConfirmDialog({
  title,
  message,
  confirmLabel,
  destructive = true,
  hideCancel = false,
  onConfirm,
  onCancel,
}: Props) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onCancel]);

  // portal into <body> so page/modal stacking contexts can't trap the dialog
  return createPortal(
    <div
      className="anim-overlay fixed inset-0 z-[90] flex items-center justify-center bg-[var(--scrim)] backdrop-blur-sm"
      onMouseDown={onCancel}
    >
      <div
        className="anim-pop mat-sheet w-[280px] rounded-[12px] p-5 text-center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h3 className="text-[13px] font-semibold leading-snug">{title}</h3>
        <p className="mt-1.5 text-[12px] leading-snug text-[var(--text-2)]">{message}</p>
        <div className="mt-4 flex flex-col gap-2">
          <button
            onClick={onConfirm}
            className={`mat-control focus-ring w-full rounded-[7px] py-[6px] text-[13px] font-semibold transition-colors duration-150 hover:bg-[var(--fill-emphasis)] ${
              destructive ? "text-[var(--danger)]" : "text-[var(--text-1)]"
            }`}
          >
            {confirmLabel}
          </button>
          {!hideCancel && (
            <button
              onClick={onCancel}
              className="mat-control focus-ring w-full rounded-[7px] py-[6px] text-[13px] font-medium transition-colors duration-150 hover:bg-[var(--fill-emphasis)]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
