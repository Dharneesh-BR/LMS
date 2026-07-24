"use client";

import dynamic from "next/dynamic";
import { Play, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const ReactPlayer = dynamic(() => import("react-player/vimeo"), { ssr: false });

export type VideoProgressUpdate = {
  watchedSeconds: number;
  durationSeconds: number;
  completed?: boolean;
};

type VimeoPlayerProps = {
  url: string;
  initialSeconds?: number;
  onProgressSave?: (progress: VideoProgressUpdate) => void;
};

export function VimeoPlayer({ url, initialSeconds = 0, onProgressSave }: VimeoPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [hasEnded, setHasEnded] = useState(false);
  const watchedSeconds = useRef(initialSeconds);
  const durationSeconds = useRef(0);
  const lastSavedSeconds = useRef(initialSeconds);
  const restoredPosition = useRef(false);

  useEffect(() => {
    watchedSeconds.current = initialSeconds;
    lastSavedSeconds.current = initialSeconds;
    restoredPosition.current = false;
    setPlaying(false);
    setHasEnded(false);
  }, [initialSeconds, url]);

  function saveProgress(completed = false) {
    if (!onProgressSave || durationSeconds.current <= 0) return;

    const update = {
      watchedSeconds: completed ? durationSeconds.current : watchedSeconds.current,
      durationSeconds: durationSeconds.current,
      ...(completed ? { completed: true } : {})
    };
    lastSavedSeconds.current = update.watchedSeconds;
    onProgressSave(update);
  }

  function startPlayback() {
    setHasEnded(false);
    setPlaying(true);
  }

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
      <ReactPlayer
        url={url}
        width="100%"
        height="100%"
        controls
        playing={playing}
        progressInterval={5000}
        onReady={(player) => {
          if (!restoredPosition.current && initialSeconds > 0) {
            player.seekTo(initialSeconds, "seconds");
            restoredPosition.current = true;
          }
        }}
        onDuration={(duration) => {
          durationSeconds.current = duration;
        }}
        onProgress={({ playedSeconds }) => {
          watchedSeconds.current = playedSeconds;
          if (playedSeconds - lastSavedSeconds.current >= 5) {
            saveProgress();
          }
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          saveProgress();
        }}
        onEnded={() => {
          setPlaying(false);
          setHasEnded(true);
          saveProgress(true);
        }}
        config={{ playerOptions: { responsive: true } }}
      />
      {!playing ? (
        <button
          type="button"
          onClick={startPlayback}
          className="absolute inset-0 flex items-center justify-center bg-black/10 text-white transition hover:bg-black/20 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-white"
          aria-label={hasEnded ? "Replay video" : "Play video"}
          title={hasEnded ? "Replay video" : "Play video"}
        >
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/75 shadow-lg transition-transform hover:scale-105">
            {hasEnded ? <RotateCcw className="h-7 w-7" /> : <Play className="ml-1 h-7 w-7 fill-current" />}
          </span>
        </button>
      ) : null}
    </div>
  );
}
