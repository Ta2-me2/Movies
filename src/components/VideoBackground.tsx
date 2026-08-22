import { useCallback, useEffect, useRef, useState } from "react";
import { inTauri } from "../lib/db";
import { usePlayback } from "../lib/playback";

/**
 * WebKit in this WKWebView will not start any media until the page has seen a
 * real user event — proven above, and not fixable from the web side. The
 * native side can post one harmless synthetic key press to satisfy it. Asked
 * for at most once per launch, and only if playback is actually refused.
 */
let lastGestureAt = 0;
async function requestUserGesture() {
  // WebKit's permission can lapse, so this re-arms rather than firing once —
  // throttled so a stubborn failure can't spam synthetic events.
  if (!inTauri || Date.now() - lastGestureAt < 2000) return;
  lastGestureAt = Date.now();
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("grant_user_gesture");
  } catch {
    // playback simply stays paused; the retry loop keeps trying
  }
}

interface Props {
  movieId: number;
  src: string;
}

/**
 * Looped background video for hero/movie-page. Resumes from the movie's last
 * known position, follows the global sound state and pauses while the
 * fullscreen player is open.
 */
export default function VideoBackground({ movieId, src }: Props) {
  const { muted, playerOpen, getPosition, reportPosition } = usePlayback();
  const video = useRef<HTMLVideoElement | null>(null);
  const [showing, setShowing] = useState(false);

  /**
   * Attach the source only once the element is provably muted.
   *
   * WebKit refuses `play()` with NotAllowedError unless the media is muted or
   * the page has a user gesture — and it judges "muted" by the element's
   * state when the source starts loading. React only ever assigns `muted` as a
   * DOM *property*, never as the content attribute, so a `<video muted src=…>`
   * rendered by React can still look audible to WebKit and get gated behind a
   * click. Setting the attribute first, and only then handing over the source,
   * is what makes the always-allowed muted-autoplay path apply.
   */
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.muted = true;
    v.defaultMuted = true;
    v.setAttribute("muted", "");
    if (v.getAttribute("src") !== src) {
      v.setAttribute("src", src);
      v.load();
    }
  }, [src]);

  // Kept in a ref so the callbacks below stay stable across renders.
  const mutedRef = useRef(muted);
  mutedRef.current = muted;

  /**
   * Applies the shared sound state. Deliberately a no-op while the element is
   * still paused: an unmuted element must never be what gates the start of
   * playback. It is therefore called again from `playing`, which is what makes
   * a newly shown trailer pick up sound the user already turned on — without
   * it, every fresh slide mounted muted and silently stayed that way.
   */
  const applySound = useCallback(() => {
    const v = video.current;
    if (v && !v.paused) v.muted = mutedRef.current;
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    applySound();
    if (!muted && v.paused && !playerOpen) v.play().catch(() => {});
  }, [muted, playerOpen, applySound]);

  /**
   * A stable ref callback. With an inline one React detaches and re-attaches on
   * every render, and re-muting there silenced a playing trailer whenever an
   * unrelated bit of state changed — collapsing the sidebar, for instance.
   */
  const attachVideo = useCallback((el: HTMLVideoElement | null) => {
    video.current = el;
    // mute on first attach only; the attribute marks that it has been done
    if (el && !el.hasAttribute("muted")) {
      el.muted = true;
      el.defaultMuted = true;
      el.setAttribute("muted", "");
    }
  }, []);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    if (playerOpen) v.pause();
    else if (v.paused) v.play().catch(() => {});
  }, [playerOpen]);

  // On a cold app launch the native window can still be settling focus, or
  // the local-file protocol can still be warming up, right when this element
  // tries its one built-in autoplay attempt — so it silently stays paused and
  // (unlike a normal <video> on a web page) nothing nudges it again on its
  // own. Keep retrying .play() from several independent triggers for as long
  // as this screen is shown — NEVER give up on a fixed attempt budget, since
  // whatever is delaying it (a slow window activation, a cold-start OS hiccup)
  // can occasionally take far longer than any reasonable short timeout, and a
  // budget that runs out just means the black frame gets stuck forever again.
  // The cadence backs off after the first few seconds so a rare long wait
  // doesn't spin at full speed the whole time.
  useEffect(() => {
    const v = video.current;
    if (!v) return;
    let attempts = 0;
    // declared before use (not `const`) — tryPlay() can call stop() synchronously
    // on its very first, immediate invocation below, before a `const` sibling
    // further down would have been initialized yet
    let poll = 0;
    const stop = () => {
      v.removeEventListener("canplay", tryPlay);
      v.removeEventListener("loadeddata", tryPlay);
      v.removeEventListener("playing", stop);
      window.removeEventListener("focus", tryPlay);
      document.removeEventListener("visibilitychange", tryPlay);
      window.clearInterval(poll);
    };
    const tryPlay = () => {
      if (!v.paused) {
        stop();
        return;
      }
      attempts += 1;
      if (attempts === 40) {
        // first ~14s at a brisk 350ms cadence; back off afterwards so an
        // unusually long wait doesn't poll at full speed forever
        window.clearInterval(poll);
        poll = window.setInterval(tryPlay, 1000);
      }
      v.play().catch((err: DOMException) => {
        if (err.name === "NotAllowedError") void requestUserGesture();
      });
    };
    v.addEventListener("canplay", tryPlay);
    v.addEventListener("loadeddata", tryPlay);
    v.addEventListener("playing", stop);
    window.addEventListener("focus", tryPlay);
    document.addEventListener("visibilitychange", tryPlay);
    tryPlay();
    poll = window.setInterval(tryPlay, 350);
    return stop;
  }, [src]);

  // Hand over the exact position when this screen's video goes away, and
  // force a clean teardown of the decoder. Merely removing a <video> from
  // the DOM doesn't reliably release the underlying hardware decoder right
  // away for a custom-protocol (asset://) source in WKWebView — swiping
  // through several hero slides in a row can accumulate enough still-live
  // decoders to hit a ceiling, silently failing the NEXT video's autoplay
  // until the OS reclaims them. Pausing + clearing the source + calling
  // load() is the standard way to force an immediate, deterministic release.
  useEffect(() => {
    const v = video.current;
    return () => {
      if (!v) return;
      if (v.currentTime > 0) reportPosition(movieId, v.currentTime);
      v.pause();
      v.removeAttribute("src");
      v.load();
    };
  }, [movieId, reportPosition]);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden bg-black">
      {/* No `src`/`autoPlay` here on purpose — the effect above mutes the
          element first and only then gives it a source, which is what keeps
          WebKit on its always-allowed muted-autoplay path. */}
      <video
        ref={attachVideo}
        loop
        playsInline
        /* Never fade the element itself: WebKit only lets muted media start on
           its own while it is genuinely visible, so an opacity-0 <video> can
           never begin — and it could only become visible once it began. The
           fade-in is done by the cover below instead. */
        className="absolute inset-0 h-full w-full object-cover"
        onPlaying={() => {
          setShowing(true);
          applySound();
        }}
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          const t = getPosition(movieId);
          if (t && (!Number.isFinite(v.duration) || t < v.duration - 0.5)) {
            v.currentTime = t;
          }
        }}
        onTimeUpdate={(e) => reportPosition(movieId, e.currentTarget.currentTime)}
      />
      {/* Fades away once playback actually starts, giving the same soft
          entrance the video's own opacity used to provide. */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-500 ${
          showing ? "opacity-0" : "opacity-100"
        }`}
      />
    </div>
  );
}
