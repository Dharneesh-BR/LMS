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

  scriptPromise = new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      script.remove();
      reject(new Error("Vimeo took too long to load. Check your connection and retry."));
    }, 15000);
    const loaded = () => {
      clearTimeout(timeout);
      if (window.Vimeo?.Player) resolve();
      else reject(new Error("Vimeo player could not be initialized."));
    };
    const failed = () => {
      clearTimeout(timeout);
      script.remove();
      reject(new Error("Unable to load Vimeo player. Check your connection and retry."));
    };
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${VIMEO_PLAYER_SCRIPT}"]`);
    const script = existing || document.createElement("script");
    if (existing) {
      existing.addEventListener("load", loaded, { once: true });
      existing.addEventListener("error", failed, { once: true });
      return;
    }

    script.src = VIMEO_PLAYER_SCRIPT;
    script.async = true;
    script.onload = loaded;
    script.onerror = failed;
    document.head.appendChild(script);
  }).catch((error) => {
    scriptPromise = null;
    throw error;
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
  iframeUrl.searchParams.set("loop", "0");
  return iframeUrl.toString();
}

export function VimeoPlayer(props: VimeoPlayerProps) {
  const [attempt, setAttempt] = useState(0);
  return <VimeoPlayerSession key={`${props.url}-${attempt}`} {...props} onRetry={() => setAttempt((value) => value + 1)} />;
}

function VimeoPlayerSession({ url, initialSeconds = 0, onProgressSave, onRetry }: VimeoPlayerProps & { onRetry: () => void }) {
  // Resume once per video; saved progress updates must not recreate a playing iframe.
  const resumeSeconds = useRef(initialSeconds).current;
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const playerRef = useRef<VimeoPlayerApi | null>(null);
  const watchedSeconds = useRef(resumeSeconds);
  const durationSeconds = useRef(0);
  const lastSavedSeconds = useRef(resumeSeconds);
  const lastTrustedSeconds = useRef(resumeSeconds);
  const playStartedAt = useRef<number | null>(null);
  const trustedSecondsAtPlayStart = useRef(resumeSeconds);
  const restoredPosition = useRef(false);
  const completedSaved = useRef(false);
  const completionSaveInFlight = useRef(false);
  const completionRequested = useRef(false);
  const restoringSeek = useRef(false);
  const saveQueue = useRef(Promise.resolve());
  const queuedSavedSeconds = useRef(resumeSeconds);
  const onProgressSaveRef = useRef(onProgressSave);
  const [playing, setPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const [playerReady, setPlayerReady] = useState(false);
  const [playerError, setPlayerError] = useState("");

  const iframeUrl = useMemo(() => buildIframeUrl(url), [url]);
  const readyToPlay = playerReady;

  useEffect(() => {
    onProgressSaveRef.current = onProgressSave;
  }, [onProgressSave]);

  const saveProgress = useCallback((completed = false) => {
    const effectiveDuration = durationSeconds.current || (completed ? watchedSeconds.current : 0);
    if (!onProgressSaveRef.current || effectiveDuration <= 0) return;
    if (completed) completionRequested.current = true;
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
    watchedSeconds.current = resumeSeconds;
    lastSavedSeconds.current = resumeSeconds;
    lastTrustedSeconds.current = resumeSeconds;
    playStartedAt.current = null;
    trustedSecondsAtPlayStart.current = resumeSeconds;
    restoredPosition.current = false;
    completedSaved.current = false;
    completionSaveInFlight.current = false;
    completionRequested.current = false;
    restoringSeek.current = false;
    saveQueue.current = Promise.resolve();
    queuedSavedSeconds.current = resumeSeconds;
    setPlaying(false);
    setHasEnded(false);
    setPlayerReady(false);
    setPlayerError("");
  }, [resumeSeconds, url]);

  useEffect(() => {
    let cancelled = false;
    let player: VimeoPlayerApi | null = null;
    let completionPoll: number | null = null;
    const loadingTimeout = setTimeout(() => {
      if (cancelled) return;
      cancelled = true;
      setPlayerReady(false);
      setPlayerError("Video loading timed out. Check your connection and retry.");
    }, 20000);

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
      const handleEnded = (data?: { seconds?: number; duration?: number }) => {
        if (data?.duration && data.duration > 0) durationSeconds.current = data.duration;
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
        if (cancelled) return;
        completionPoll = window.setInterval(() => {
          if (!player || completedSaved.current) return;
          // Vimeo may reset its time to zero after ending. Retry the acknowledged
          // playback-end save independently of the player's current position.
          if (completionRequested.current) {
            saveProgress(true);
            return;
          }

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

        if (!restoredPosition.current && resumeSeconds > 0) {
          restoringSeek.current = true;
          await player.setCurrentTime(resumeSeconds);
          if (cancelled) return;
          lastTrustedSeconds.current = resumeSeconds;
          trustedSecondsAtPlayStart.current = resumeSeconds;
          restoredPosition.current = true;
        }
      } finally {
        clearTimeout(loadingTimeout);
      }
      if (!cancelled) setPlayerReady(true);
    }

    setupPlayer().catch((error) => {
      clearTimeout(loadingTimeout);
      if (cancelled) return;
      setPlayerReady(false);
      setPlayerError(error instanceof Error ? error.message : "Unable to load video. Please retry.");
    });

    return () => {
      cancelled = true;
      clearTimeout(loadingTimeout);
      if (completionPoll) {
        window.clearInterval(completionPoll);
      }
      if (player) {
        player.destroy().catch(() => undefined);
      }
      playerRef.current = null;
    };
  }, [getMaximumTrustedSeconds, iframeUrl, resumeSeconds, restoreTrustedPosition, saveProgress]);

  function startPlayback() {
    setHasEnded(false);
    setPlaying(true);
    playerRef.current?.play().catch((error) => {
      setPlaying(false);
      setPlayerError(error instanceof Error ? error.message : "Unable to play video. Please retry.");
    });
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <iframe
        key={iframeUrl}
        ref={iframeRef}
        src={iframeUrl}
        title="Lesson video"
        allow="autoplay; fullscreen; encrypted-media"
        className="h-full w-full pointer-events-none"
      />
      {playerError ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80 px-6 text-center text-white">
          <p role="alert" className="text-sm">{playerError}</p>
          <button type="button" onClick={onRetry} aria-label="Retry video" title="Retry video" className="flex h-12 w-12 items-center justify-center rounded-lg border border-white/50 hover:bg-white/10">
            <RotateCcw className="h-6 w-6" />
          </button>
        </div>
      ) : !playing ? (
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
