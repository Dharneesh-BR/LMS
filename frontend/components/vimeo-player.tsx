"use client";

import { Play, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const VIMEO_PLAYER_SCRIPT = "https://player.vimeo.com/api/player.js";

declare global {
  interface Window {
    Vimeo?: {
      Player: new (element: HTMLIFrameElement) => VimeoPlayerApi;
    };
  }
}

type VimeoPlayerApi = {
  play: () => Promise<void>;
  pause: () => Promise<void>;
  getCurrentTime: () => Promise<number>;
  setCurrentTime: (seconds: number) => Promise<number>;
  getDuration: () => Promise<number>;
  on: (event: string, callback: (data?: { seconds?: number; duration?: number }) => void) => void;
  off: (event: string, callback: (data?: { seconds?: number; duration?: number }) => void) => void;
  destroy: () => Promise<void>;
};

export type VideoProgressUpdate = {
  watchedSeconds: number;
  durationSeconds: number;
  completed?: boolean;
  completionSource?: "video-ended";
};

type VimeoPlayerProps = {
  url: string;
  initialSeconds?: number;
  onProgressSave?: (progress: VideoProgressUpdate) => void | Promise<void>;
};

let scriptPromise: Promise<void> | null = null;

function loadVimeoScript() {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Vimeo?.Player) return Promise.resolve();
  if (scriptPromise) return scriptPromise;

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${VIMEO_PLAYER_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("Unable to load Vimeo player")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.src = VIMEO_PLAYER_SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Unable to load Vimeo player"));
    document.head.appendChild(script);
  });

  return scriptPromise;
}

function buildIframeUrl(url: string) {
  const iframeUrl = new URL(url);
  iframeUrl.searchParams.set("title", "0");
  iframeUrl.searchParams.set("byline", "0");
  iframeUrl.searchParams.set("portrait", "0");
  iframeUrl.searchParams.set("controls", "0");
  iframeUrl.searchParams.set("keyboard", "0");
  iframeUrl.searchParams.set("pip", "0");
  iframeUrl.searchParams.set("dnt", "1");
  return iframeUrl.toString();
}

export function VimeoPlayer({ url, initialSeconds = 0, onProgressSave }: VimeoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayerApi | null>(null);
  const watchedSeconds = useRef(initialSeconds);
  const durationSeconds = useRef(0);
  const lastSavedSeconds = useRef(initialSeconds);
  const lastTrustedSeconds = useRef(initialSeconds);
  const playStartedAt = useRef<number | null>(null);
  const trustedSecondsAtPlayStart = useRef(initialSeconds);
  const restoredPosition = useRef(false);
  const completedSaved = useRef(false);
  const completionSaveInFlight = useRef(false);
  const restoringSeek = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const queuedSavedSeconds = useRef(initialSeconds);
  const onProgressSaveRef = useRef(onProgressSave);
  const [playing, setPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);

  const iframeUrl = useMemo(() => buildIframeUrl(url), [url]);
  const readyToPlay = iframeLoaded && playerReady;

  useEffect(() => {
    onProgressSaveRef.current = onProgressSave;
  }, [onProgressSave]);

  const saveProgress = useCallback((completed = false) => {
    const effectiveDuration = durationSeconds.current || (completed ? watchedSeconds.current : 0);
    if (!onProgressSaveRef.current || effectiveDuration <= 0) return;
    if (completed && (completedSaved.current || completionSaveInFlight.current)) return;

    const update = {
      watchedSeconds: completed ? effectiveDuration : watchedSeconds.current,
      durationSeconds: effectiveDuration,
      ...(completed ? { completed: true, completionSource: "video-ended" as const } : {})
    };
    if (!completed && update.watchedSeconds - queuedSavedSeconds.current < 5) return;

    if (completed) completionSaveInFlight.current = true;
    queuedSavedSeconds.current = Math.max(queuedSavedSeconds.current, update.watchedSeconds);

    saveQueue.current = saveQueue.current
      .catch(() => undefined)
      .then(() => Promise.resolve(onProgressSaveRef.current?.(update)))
      .then(() => {
        lastSavedSeconds.current = Math.max(lastSavedSeconds.current, update.watchedSeconds);
        if (completed) completedSaved.current = true;
      })
      .catch(() => undefined)
      .finally(() => {
        if (completed) completionSaveInFlight.current = false;
        if (queuedSavedSeconds.current <= update.watchedSeconds) {
          queuedSavedSeconds.current = lastSavedSeconds.current;
        }
      });
  }, []);

  const getMaximumTrustedSeconds = useCallback((bufferSeconds = 4) => {
    if (!playStartedAt.current) {
      return lastTrustedSeconds.current + bufferSeconds;
    }

    const elapsedSeconds = (Date.now() - playStartedAt.current) / 1000;
    return trustedSecondsAtPlayStart.current + elapsedSeconds + bufferSeconds;
  }, []);

  const restoreTrustedPosition = useCallback((player: VimeoPlayerApi | null) => {
    if (!player) return;
    restoringSeek.current = true;
    player.setCurrentTime(lastTrustedSeconds.current).catch(() => undefined);
  }, []);

  useEffect(() => {
    watchedSeconds.current = initialSeconds;
    lastSavedSeconds.current = initialSeconds;
    lastTrustedSeconds.current = initialSeconds;
    playStartedAt.current = null;
    trustedSecondsAtPlayStart.current = initialSeconds;
    restoredPosition.current = false;
    completedSaved.current = false;
    completionSaveInFlight.current = false;
    restoringSeek.current = false;
    saveQueue.current = Promise.resolve();
    queuedSavedSeconds.current = initialSeconds;
    setPlaying(false);
    setHasEnded(false);
    setIframeLoaded(false);
    setPlayerReady(false);
  }, [initialSeconds, url]);

  useEffect(() => {
    let cancelled = false;
    let player: VimeoPlayerApi | null = null;
    let completionPoll: number | null = null;

    async function setupPlayer() {
      await loadVimeoScript();
      if (cancelled || !iframeRef.current || !window.Vimeo?.Player) return;

      player = new window.Vimeo.Player(iframeRef.current);
      playerRef.current = player;

      const handlePlay = () => {
        playStartedAt.current = Date.now();
        trustedSecondsAtPlayStart.current = lastTrustedSeconds.current;
        setPlaying(true);
      };
      const handlePause = () => {
        setPlaying(false);
        playStartedAt.current = null;
        saveProgress();
      };
      const handleEnded = () => {
        setPlaying(false);
        setHasEnded(true);
        playStartedAt.current = null;
        saveProgress(true);
      };
      const handleSeeked = (data?: { seconds?: number }) => {
        const seekedSeconds = data?.seconds ?? watchedSeconds.current;
        if (restoringSeek.current) {
          restoringSeek.current = false;
          return;
        }
        if (seekedSeconds > getMaximumTrustedSeconds(2)) {
          restoreTrustedPosition(player);
        } else {
          lastTrustedSeconds.current = seekedSeconds;
          watchedSeconds.current = seekedSeconds;
        }
      };
      const handleTimeUpdate = (data?: { seconds?: number; duration?: number }) => {
        const nextSeconds = data?.seconds ?? watchedSeconds.current;
        durationSeconds.current = data?.duration ?? durationSeconds.current;
        if (nextSeconds > getMaximumTrustedSeconds()) {
          restoreTrustedPosition(player);
          return;
        }

        watchedSeconds.current = nextSeconds;
        lastTrustedSeconds.current = Math.max(lastTrustedSeconds.current, nextSeconds);
        if (durationSeconds.current > 0 && watchedSeconds.current >= Math.max(0, durationSeconds.current - 1)) {
          setPlaying(false);
          setHasEnded(true);
          saveProgress(true);
          return;
        }
        if (watchedSeconds.current - lastSavedSeconds.current >= 5) {
          saveProgress();
        }
      };

      player.on("play", handlePlay);
      player.on("pause", handlePause);
      player.on("ended", handleEnded);
      player.on("seeked", handleSeeked);
      player.on("timeupdate", handleTimeUpdate);

      try {
        durationSeconds.current = await player.getDuration();
        completionPoll = window.setInterval(() => {
          if (!player || completedSaved.current) return;

          Promise.all([
            player.getCurrentTime(),
            player.getDuration()
          ]).then(([currentTime, duration]) => {
            if (currentTime > getMaximumTrustedSeconds()) {
              restoreTrustedPosition(player);
              return;
            }

            watchedSeconds.current = currentTime;
            durationSeconds.current = duration;
            lastTrustedSeconds.current = Math.max(lastTrustedSeconds.current, currentTime);

            if (duration > 0 && currentTime >= Math.max(0, duration - 1)) {
              setPlaying(false);
              setHasEnded(true);
              playStartedAt.current = null;
              saveProgress(true);
            }
          }).catch(() => undefined);
        }, 1000);

        if (!restoredPosition.current && initialSeconds > 0) {
          restoringSeek.current = true;
          await player.setCurrentTime(initialSeconds);
          lastTrustedSeconds.current = initialSeconds;
          trustedSecondsAtPlayStart.current = initialSeconds;
          restoredPosition.current = true;
        }
      } finally {
        if (!cancelled) setPlayerReady(true);
      }
    }

    setupPlayer().catch(() => setPlayerReady(false));

    return () => {
      cancelled = true;
      if (completionPoll) {
        window.clearInterval(completionPoll);
      }
      if (player) {
        player.destroy().catch(() => undefined);
      }
      playerRef.current = null;
    };
  }, [getMaximumTrustedSeconds, iframeUrl, initialSeconds, restoreTrustedPosition, saveProgress]);

  function startPlayback() {
    setHasEnded(false);
    setPlaying(true);
    playerRef.current?.play().catch(() => setPlaying(false));
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        key={iframeUrl}
        ref={iframeRef}
        src={iframeUrl}
        title="Lesson video"
        allow="autoplay; fullscreen"
        onLoad={() => setIframeLoaded(true)}
        className="h-full w-full pointer-events-none"
      />
      {!playing ? (
        <button
          type="button"
          onClick={startPlayback}
          disabled={!readyToPlay}
          className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition hover:bg-black/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white disabled:cursor-wait disabled:opacity-70"
          aria-label={hasEnded ? "Replay video" : "Play video"}
          title={hasEnded ? "Replay video" : "Play video"}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/75 shadow-lg transition-transform hover:scale-105">
            {!readyToPlay ? (
              <span className="h-7 w-7 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : hasEnded ? (
              <RotateCcw className="h-7 w-7" />
            ) : (
              <Play className="ml-1 h-7 w-7 fill-current" />
            )}
          </span>
        </button>
      ) : null}
    </div>
  );
}
