import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { inTauri } from "../lib/db";
import { usePlayback } from "../lib/playback";
import {
  Forward10Icon,
  FullscreenExitIcon,
  PauseIcon,
  PlayIcon,
  Replay10Icon,
  SpeakerOffIcon,
  SpeakerOnIcon,
} from "./Icons";

interface Props {
  src: string;
  title: string;
  /** Second to resume from, and a sink for the position as it plays. */
  startAt?: number;
  onProgress?(seconds: number): void;
  onClose(): void;
}

function fmt(t: number): string {
  const s = Number.isFinite(t) ? Math.max(0, Math.floor(t)) : 0;
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/**
 * Apple TV-style trailer player. Takes the whole window and, in the app,
 * switches the window into real macOS fullscreen while it is open.
 */
export default function TrailerModal({ src, title, startAt, onProgress, onClose }: Props) {
  const { setPlayerOpen } = usePlayback();
  const video = useRef<HTMLVideoElement>(null);
  const hideTimer = useRef(0);
  const [playing, setPlaying] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [visible, setVisible] = useState(true);

  // pause the shared background video while the player is open
  useEffect(() => {
    setPlayerOpen(true);
    return () => setPlayerOpen(false);
  }, [setPlayerOpen]);

  // system-level fullscreen while the player is open (Tauri only)
  useEffect(() => {
    if (!inTauri) return;
    let wasFullscreen = false;
    (async () => {
      const { getCurrentWindow } = await import("@tauri-apps/api/window");
      const win = getCurrentWindow();
      wasFullscreen = await win.isFullscreen();
      if (!wasFullscreen) await win.setFullscreen(true);
    })().catch(console.warn);
    return () => {
      (async () => {
        const { getCurrentWindow } = await import("@tauri-apps/api/window");
        if (!wasFullscreen) await getCurrentWindow().setFullscreen(false);
      })().catch(console.warn);
    };
  }, []);

  // controls auto-hide while playing
  const poke = useCallback(() => {
    setVisible(true);
    window.clearTimeout(hideTimer.current);
    hideTimer.current = window.setTimeout(() => {
      if (video.current && !video.current.paused) setVisible(false);
    }, 2600);
  }, []);

  useEffect(() => {
    poke();
    return () => window.clearTimeout(hideTimer.current);
  }, [poke]);

  const togglePlay = useCallback(() => {
    const v = video.current;
    if (!v) return;
    if (v.paused) void v.play();
    else v.pause();
  }, []);

  const skip = useCallback(
    (d: number) => {
      const v = video.current;
      if (v) {
        const max = Number.isFinite(v.duration) ? v.duration : Number.MAX_SAFE_INTEGER;
        v.currentTime = Math.min(Math.max(0, v.currentTime + d), max);
      }
      poke();
    },
    [poke]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        togglePlay();
      } else if (e.key === "ArrowLeft") skip(-10);
      else if (e.key === "ArrowRight") skip(10);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, togglePlay, skip]);

  const setVol = (v: number) => {
    setVolume(v);
    setMuted(v === 0);
    if (video.current) {
      video.current.volume = v;
      video.current.muted = v === 0;
    }
  };

  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    if (video.current) video.current.muted = next;
  };

  const dur = Number.isFinite(duration) && duration > 0 ? duration : Math.max(time, 0.1);
  const progress = Math.min(100, (time / dur) * 100);
  const volLevel = muted ? 0 : volume;

  const iconBtn =
    "mat-hud flex size-10 items-center justify-center rounded-full text-white/85 transition-colors duration-200 hover:bg-black/50 hover:text-white";

  return createPortal(
    <div
      className={`anim-overlay fixed inset-0 z-[85] bg-black ${visible ? "" : "cursor-none"}`}
      onMouseMove={poke}
    >
      <video
        ref={video}
        src={src}
        autoPlay
        playsInline
        aria-label={`${title} trailer`}
        className="absolute inset-0 h-full w-full object-contain outline-none"
        onClick={togglePlay}
        onPlay={() => {
          setPlaying(true);
          poke();
        }}
        onPause={() => {
          setPlaying(false);
          window.clearTimeout(hideTimer.current);
          setVisible(true);
        }}
        onEnded={() => setVisible(true)}
        onTimeUpdate={(e) => {
          setTime(e.currentTarget.currentTime);
          onProgress?.(e.currentTarget.currentTime);
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          setDuration(v.duration);
          v.volume = volume;
          // resume where this session left off, unless that is the very end
          if (startAt && (!Number.isFinite(v.duration) || startAt < v.duration - 1)) {
            v.currentTime = startAt;
          }
        }}
        onDurationChange={(e) => setDuration(e.currentTarget.duration)}
      />

      <div
        className={`absolute inset-0 transition-opacity duration-300 ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        {/* exit fullscreen — top left */}
        <button onClick={onClose} aria-label="Close player" className={`absolute left-5 top-9 ${iconBtn}`}>
          <FullscreenExitIcon width={17} height={17} strokeWidth={1.9} />
        </button>

        {/* volume — top right */}
        <div className="mat-hud absolute right-6 top-9 flex h-10 items-center gap-3 rounded-full px-4">
          <input
            type="range"
            min={0}
            max={1}
            step={0.02}
            value={volLevel}
            onChange={(e) => setVol(Number(e.target.value))}
            aria-label="Volume"
            className="player-range w-[110px]"
            style={{
              background: `linear-gradient(to right, #fff ${volLevel * 100}%, rgba(255,255,255,0.25) ${volLevel * 100}%)`,
            }}
          />
          <button
            onClick={toggleMute}
            aria-label={muted ? "Unmute" : "Mute"}
            className="text-white/85 transition-colors duration-200 hover:text-white"
          >
            {muted || volume === 0 ? (
              <SpeakerOffIcon width={17} height={17} />
            ) : (
              <SpeakerOnIcon width={17} height={17} />
            )}
          </button>
        </div>

        {/* center transport controls */}
        <div className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-10">
          <button
            onClick={() => skip(-10)}
            aria-label="Back 10 seconds"
            className="mat-hud flex size-14 items-center justify-center rounded-full text-white/90 transition-colors duration-200 hover:bg-black/50 hover:text-white"
          >
            <Replay10Icon width={27} height={27} />
          </button>
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            className="mat-hud flex size-[84px] items-center justify-center rounded-full text-white transition-colors duration-200 hover:bg-black/50"
          >
            {playing ? (
              <PauseIcon width={34} height={34} />
            ) : (
              <PlayIcon width={34} height={34} />
            )}
          </button>
          <button
            onClick={() => skip(10)}
            aria-label="Forward 10 seconds"
            className="mat-hud flex size-14 items-center justify-center rounded-full text-white/90 transition-colors duration-200 hover:bg-black/50 hover:text-white"
          >
            <Forward10Icon width={27} height={27} />
          </button>
        </div>

        {/* bottom: title + timeline */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-8 pb-6 pt-16">
          <h2 className="text-[22px] font-semibold tracking-tight">{title}</h2>
          <div className="mt-2.5 flex items-center gap-3 text-[12px] font-medium tabular-nums text-white/70">
            <span className="w-10">{fmt(time)}</span>
            <input
              type="range"
              min={0}
              max={dur}
              step={0.05}
              value={time}
              onChange={(e) => {
                const t = Number(e.target.value);
                if (video.current) video.current.currentTime = t;
                setTime(t);
                poke();
              }}
              aria-label="Seek"
              className="player-range flex-1"
              style={{
                background: `linear-gradient(to right, #fff ${progress}%, rgba(255,255,255,0.25) ${progress}%)`,
              }}
            />
            <span className="w-12 text-right">-{fmt(dur - time)}</span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
