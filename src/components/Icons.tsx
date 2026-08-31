import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps): IconProps => ({
  width: 20,
  height: 20,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
  ...props,
});

export const SearchIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="11" cy="11" r="7" />
    <path d="m20.5 20.5-4.3-4.3" />
  </svg>
);

export const HomeIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 10.7 12 3.8l8.5 6.9" />
    <path d="M5.5 9.5V20h13V9.5" />
  </svg>
);

export const FilmIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
    <path d="M7.5 4.5v15M16.5 4.5v15M3 9.5h4.5M3 14.5h4.5M16.5 9.5H21M16.5 14.5H21" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m9 5.5 6.5 6.5L9 18.5" />
  </svg>
);

export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M15 5.5 8.5 12 15 18.5" />
  </svg>
);

export const PlayIcon = (p: IconProps) => (
  <svg {...{ ...base(p), fill: "currentColor", stroke: "none" }}>
    <path d="M7.5 5.1c0-.9 1-1.5 1.8-1L19.6 11c.8.4.8 1.6 0 2L9.3 19.9c-.8.5-1.8-.1-1.8-1V5.1Z" />
  </svg>
);

export const SpeakerOnIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11 5.5 7 9H4v6h3l4 3.5v-13Z" fill="currentColor" stroke="currentColor" />
    <path d="M15 9.3a4 4 0 0 1 0 5.4M17.6 6.8a7.5 7.5 0 0 1 0 10.4" />
  </svg>
);

export const SpeakerOffIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M11 5.5 7 9H4v6h3l4 3.5v-13Z" fill="currentColor" stroke="currentColor" />
    <path d="m15.5 9.5 5 5M20.5 9.5l-5 5" />
  </svg>
);

export const PencilIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14.5 5.5 18.5 9.5 8.5 19.5H4.5v-4L14.5 5.5Z" />
    <path d="m12.8 7.2 4 4" />
  </svg>
);

export const TrashIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.5 6.5h15M9.5 6.5V4.8c0-.7.6-1.3 1.3-1.3h2.4c.7 0 1.3.6 1.3 1.3v1.7M7 6.5l.8 12.2c.05.7.6 1.3 1.3 1.3h5.8c.7 0 1.25-.6 1.3-1.3L17 6.5" />
    <path d="M10.2 10v6M13.8 10v6" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 6 12 12M18 6 6 18" />
  </svg>
);

export const FullscreenIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13.5 4h6.5v6.5" />
    <path d="M20 4 12.5 11.5" />
    <path d="M10.5 20H4v-6.5" />
    <path d="M4 20l7.5-7.5" />
  </svg>
);

/** An archive box: what a library becomes when it is written to a zip. */
export const ArchiveIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 7.5h17v11.5a1 1 0 0 1-1 1h-15a1 1 0 0 1-1-1V7.5Z" />
    <path d="M2.5 5.2a1 1 0 0 1 1-1h17a1 1 0 0 1 1 1v2.3h-19V5.2Z" />
    <path d="M9.8 11.5h4.4" />
  </svg>
);

/** A document with an arrow coming into it: restoring from a backup. */
export const RestoreIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13.5 3.5H6.5a1.5 1.5 0 0 0-1.5 1.5v14a1.5 1.5 0 0 0 1.5 1.5h11a1.5 1.5 0 0 0 1.5-1.5V9l-5.5-5.5Z" />
    <path d="M13.5 3.5V9H19" />
    <path d="M12 11.8v5.4M9.7 14.9 12 17.2l2.3-2.3" />
  </svg>
);

/** Books on a shelf: the list of libraries. */
export const LibrariesIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 4.5h3v15H4zM9 4.5h3v15H9z" />
    <path d="m14.6 5.4 2.9-.8 3 14.5-2.9.8z" />
  </svg>
);

/** An arrow leaving a box: opening the folder in the Finder. */
export const RevealIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M13.5 4.5H19V10" />
    <path d="M19 4.5 11.5 12" />
    <path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-10A1.5 1.5 0 0 1 5 18.5v-10A1.5 1.5 0 0 1 6.5 7H11" />
  </svg>
);

/** The three dots macOS puts on a menu button. */
export const EllipsisIcon = (p: IconProps) => (
  <svg {...{ ...base(p), fill: "currentColor", stroke: "none" }}>
    <circle cx="6" cy="12" r="1.55" />
    <circle cx="12" cy="12" r="1.55" />
    <circle cx="18" cy="12" r="1.55" />
  </svg>
);

/** A folder, for a library in the list. */
export const FolderIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 7a1.5 1.5 0 0 1 1.5-1.5h3.6c.4 0 .79.16 1.07.44l1.26 1.25h7.57A1.5 1.5 0 0 1 20 8.7v9.3a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18V7Z" />
  </svg>
);

/** Matches AppKit's `gearshape`: eight teeth around a ring, hub in the middle. */
export const GearIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M9.70 5.50 10.38 3.25 13.62 3.25 14.30 5.50 14.64 5.63 14.97 5.77 17.04 4.67 19.33 6.96 18.23 9.03 18.37 9.36 18.50 9.70 20.75 10.38 20.75 13.62 18.50 14.30 18.37 14.64 18.23 14.97 19.33 17.04 17.04 19.33 14.97 18.23 14.64 18.37 14.30 18.50 13.62 20.75 10.38 20.75 9.70 18.50 9.36 18.37 9.03 18.23 6.96 19.33 4.67 17.04 5.77 14.97 5.63 14.64 5.50 14.30 3.25 13.62 3.25 10.38 5.50 9.70 5.63 9.36 5.77 9.03 4.67 6.96 6.96 4.67 9.03 5.77 9.36 5.63Z" />
    <circle cx="12" cy="12" r="3.05" />
  </svg>
);

/** Matches AppKit's `sidebar.leading` toggle glyph. */
export const SidebarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="2.75" y="5" width="18.5" height="14" rx="2.6" />
    <path d="M9.25 5v14" />
  </svg>
);

export const FullscreenExitIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M14 5.5V10h4.5" />
    <path d="M20 4l-6 6" />
    <path d="M10 18.5V14H5.5" />
    <path d="M4 20l6-6" />
  </svg>
);

export const PauseIcon = (p: IconProps) => (
  <svg {...{ ...base(p), fill: "currentColor", stroke: "none" }}>
    <path d="M7.6 4.5h2.6a.7.7 0 0 1 .7.7v13.6a.7.7 0 0 1-.7.7H7.6a.7.7 0 0 1-.7-.7V5.2a.7.7 0 0 1 .7-.7Z" />
    <path d="M13.8 4.5h2.6a.7.7 0 0 1 .7.7v13.6a.7.7 0 0 1-.7.7h-2.6a.7.7 0 0 1-.7-.7V5.2a.7.7 0 0 1 .7-.7Z" />
  </svg>
);

export const Replay10Icon = (p: IconProps) => (
  <svg {...{ ...base(p), strokeWidth: 1.6 }}>
    {/* circle with a gap at the top; arrow tab points counter-clockwise (left) */}
    <path d="M14.5 6.2A7.3 7.3 0 1 1 9.5 6.2" />
    <path d="M10.6 3.6 6.7 6.4l4.1 2.6z" fill="currentColor" stroke="none" />
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fontSize="7"
      fontWeight="700"
      fill="currentColor"
      stroke="none"
      fontFamily="inherit"
    >
      10
    </text>
  </svg>
);

export const Forward10Icon = (p: IconProps) => (
  <svg {...{ ...base(p), strokeWidth: 1.6 }}>
    {/* circle with a gap at the top; arrow tab points clockwise (right) */}
    <path d="M9.5 6.2A7.3 7.3 0 1 0 14.5 6.2" />
    <path d="M13.4 3.6 17.3 6.4l-4.1 2.6z" fill="currentColor" stroke="none" />
    <text
      x="12"
      y="15.5"
      textAnchor="middle"
      fontSize="7"
      fontWeight="700"
      fill="currentColor"
      stroke="none"
      fontFamily="inherit"
    >
      10
    </text>
  </svg>
);

export const InfoIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 11.2v5" />
    <circle cx="12" cy="8.1" r="0.9" fill="currentColor" stroke="none" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5.5 9 6.5 6.5L18.5 9" />
  </svg>
);

export const ImageIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="14" rx="2" />
    <circle cx="9" cy="10" r="1.6" />
    <path d="m5 17.5 4.5-4 3 2.5 3.5-3.5 3.5 3.5" />
  </svg>
);
