"use client";

import { useEffect, useRef } from "react";
import "./YouTubePlayer.css";

type YouTubePlayerHandle = {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
};

type YouTubePlayerProps = {
  videoId: string;
  onReady?: (handle: YouTubePlayerHandle) => void;
  className?: string;
};

declare global {
  interface Window {
    YT?: {
      Player: new (
        elementId: string,
        options: {
          height?: string;
          width?: string;
          videoId: string;
          playerVars?: Record<string, string | number>;
          events?: {
            onReady?: (event: { target: YTPlayer }) => void;
            onError?: (event: { data: number }) => void;
          };
        },
      ) => YTPlayer;
      PlayerState: {
        PLAYING: number;
        PAUSED: number;
      };
    };
    onYouTubeIframeAPIReady?: () => void;
  }
}

type YTPlayer = {
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  playVideo: () => void;
  pauseVideo: () => void;
  getPlayerState: () => number;
  getCurrentTime: () => number;
};

let apiLoadPromise: Promise<void> | null = null;

function loadYouTubeApi(): Promise<void> {
  if (window.YT?.Player) {
    return Promise.resolve();
  }

  if (apiLoadPromise) {
    return apiLoadPromise;
  }

  apiLoadPromise = new Promise((resolve) => {
    const existingScript = document.getElementById("youtube-iframe-api");

    if (!existingScript) {
      const script = document.createElement("script");
      script.id = "youtube-iframe-api";
      script.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(script);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      previousReady?.();
      resolve();
    };
  });

  return apiLoadPromise;
}

export default function YouTubePlayer({
  videoId,
  onReady,
  className,
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const elementIdRef = useRef(`youtube-player-${Math.random().toString(36).slice(2)}`);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  }, [onReady]);

  useEffect(() => {
    let destroyed = false;

    async function initPlayer() {
      await loadYouTubeApi();

      if (destroyed || !containerRef.current) {
        return;
      }

      playerRef.current = new window.YT!.Player(elementIdRef.current, {
        height: "1",
        width: "1",
        videoId,
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            onReadyRef.current?.({
              seekTo: (seconds: number) => {
                event.target.seekTo(seconds, true);
              },
              play: () => {
                event.target.playVideo();
              },
              pause: () => {
                event.target.pauseVideo();
              },
              getCurrentTime: () => {
                return event.target.getCurrentTime();
              },
            });
          },
        },
      });
    }

    void initPlayer();

    return () => {
      destroyed = true;
      playerRef.current = null;
    };
  }, [videoId]);

  const playerClasses = ["youtube-player", className].filter(Boolean).join(" ");

  return (
    <div className={playerClasses} ref={containerRef} aria-hidden="true">
      <div id={elementIdRef.current} className="youtube-player__iframe" />
    </div>
  );
}
