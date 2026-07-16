import { useEffect, useRef, useState } from "react";
import type { LyricPhrase } from "./types";

const RESYNC_INTERVAL_MS = 5000;

function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function phrasesMatch(typed: string, expected: string): boolean {
  return normalizeForMatch(typed) === normalizeForMatch(expected);
}

export function getActivePhraseIndex(
  phrases: LyricPhrase[],
  elapsedMs: number,
): number {
  if (phrases.length === 0) {
    return -1;
  }

  for (let index = phrases.length - 1; index >= 0; index -= 1) {
    if (elapsedMs >= phrases[index].start_ms) {
      return index;
    }
  }

  return 0;
}

type UsePlaybackSyncOptions = {
  phrases: LyricPhrase[];
  playbackStartAt: string | null;
  serverNow: string | null;
  enabled: boolean;
  onSeek?: (elapsedSec: number) => void;
};

export function usePlaybackSync({
  phrases,
  playbackStartAt,
  serverNow,
  enabled,
  onSeek,
}: UsePlaybackSyncOptions) {
  const [elapsedMs, setElapsedMs] = useState(0);
  const [activePhraseIndex, setActivePhraseIndex] = useState(-1);
  const serverOffsetRef = useRef(0);
  const onSeekRef = useRef(onSeek);

  useEffect(() => {
    onSeekRef.current = onSeek;
  }, [onSeek]);

  useEffect(() => {
    if (!serverNow) {
      return;
    }

    const serverTime = new Date(serverNow).getTime();
    const clientTime = Date.now();
    serverOffsetRef.current = serverTime - clientTime;
  }, [serverNow]);

  useEffect(() => {
    if (!enabled || !playbackStartAt) {
      setElapsedMs(0);
      setActivePhraseIndex(-1);
      return;
    }

    const playbackStartMs = new Date(playbackStartAt).getTime();
    let animationFrameId = 0;
    let lastSeekAt = 0;

    function tick() {
      const now = Date.now() + serverOffsetRef.current;
      const elapsed = Math.max(0, now - playbackStartMs);
      setElapsedMs(elapsed);
      setActivePhraseIndex(getActivePhraseIndex(phrases, elapsed));

      if (
        onSeekRef.current &&
        now - lastSeekAt >= RESYNC_INTERVAL_MS
      ) {
        lastSeekAt = now;
        onSeekRef.current(elapsed / 1000);
      }

      animationFrameId = window.requestAnimationFrame(tick);
    }

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, playbackStartAt, phrases]);

  const activePhrase =
    activePhraseIndex >= 0 ? phrases[activePhraseIndex] ?? null : null;

  return {
    elapsedMs,
    activePhraseIndex,
    activePhrase,
  };
}
