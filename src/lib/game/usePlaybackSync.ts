import { useCallback, useEffect, useRef, useState } from "react";
import type { LyricPhrase } from "./types";

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

function computeElapsedMs(
  playbackStartMs: number,
  playbackElapsedMs: number,
  serverOffsetMs: number,
): number {
  const now = Date.now() + serverOffsetMs;
  const segmentElapsed = Math.max(0, now - playbackStartMs);
  return playbackElapsedMs + segmentElapsed;
}

type UsePlaybackSyncOptions = {
  phrases: LyricPhrase[];
  playbackStartAt: string | null;
  playbackElapsedMs: number;
  serverNow: string | null;
  enabled: boolean;
};

export function usePlaybackSync({
  phrases,
  playbackStartAt,
  playbackElapsedMs,
  serverNow,
  enabled,
}: UsePlaybackSyncOptions) {
  const [elapsedMs, setElapsedMs] = useState(playbackElapsedMs);
  const [activePhraseIndex, setActivePhraseIndex] = useState(-1);
  const serverOffsetRef = useRef(0);
  const playbackStartMsRef = useRef(0);
  const playbackElapsedMsRef = useRef(playbackElapsedMs);
  const serverNowRef = useRef(serverNow);

  serverNowRef.current = serverNow;

  useEffect(() => {
    if (!enabled || !playbackStartAt) {
      return;
    }

    const latestServerNow = serverNowRef.current;
    if (!latestServerNow) {
      return;
    }

    serverOffsetRef.current = new Date(latestServerNow).getTime() - Date.now();
    playbackStartMsRef.current = new Date(playbackStartAt).getTime();
    playbackElapsedMsRef.current = playbackElapsedMs;
  }, [enabled, playbackStartAt, playbackElapsedMs]);

  const getServerElapsedSec = useCallback((): number => {
    if (!enabled || !playbackStartAt) {
      return playbackElapsedMsRef.current / 1000;
    }

    return (
      computeElapsedMs(
        playbackStartMsRef.current,
        playbackElapsedMsRef.current,
        serverOffsetRef.current,
      ) / 1000
    );
  }, [enabled, playbackStartAt]);

  useEffect(() => {
    if (!enabled || !playbackStartAt) {
      playbackElapsedMsRef.current = playbackElapsedMs;
      setElapsedMs(playbackElapsedMs);
      setActivePhraseIndex(
        playbackElapsedMs > 0
          ? getActivePhraseIndex(phrases, playbackElapsedMs)
          : -1,
      );
      return;
    }

    const playbackStartMs = new Date(playbackStartAt).getTime();
    playbackStartMsRef.current = playbackStartMs;
    playbackElapsedMsRef.current = playbackElapsedMs;
    let animationFrameId = 0;
    let lastDisplayedSecond = -1;
    let lastPhraseIndex = -1;

    function tick() {
      const elapsed = computeElapsedMs(
        playbackStartMsRef.current,
        playbackElapsedMsRef.current,
        serverOffsetRef.current,
      );
      const phraseIndex = getActivePhraseIndex(phrases, elapsed);
      const displayedSecond = Math.floor(elapsed / 1000);

      if (
        phraseIndex !== lastPhraseIndex ||
        displayedSecond !== lastDisplayedSecond
      ) {
        lastPhraseIndex = phraseIndex;
        lastDisplayedSecond = displayedSecond;
        setElapsedMs(elapsed);
        setActivePhraseIndex(phraseIndex);
      }

      animationFrameId = window.requestAnimationFrame(tick);
    }

    const initialElapsed = computeElapsedMs(
      playbackStartMsRef.current,
      playbackElapsedMsRef.current,
      serverOffsetRef.current,
    );
    const initialPhraseIndex = getActivePhraseIndex(phrases, initialElapsed);
    lastDisplayedSecond = Math.floor(initialElapsed / 1000);
    lastPhraseIndex = initialPhraseIndex;
    setElapsedMs(initialElapsed);
    setActivePhraseIndex(initialPhraseIndex);

    animationFrameId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
    };
  }, [enabled, playbackElapsedMs, playbackStartAt, phrases]);

  const activePhrase =
    activePhraseIndex >= 0 ? phrases[activePhraseIndex] ?? null : null;

  return {
    elapsedMs,
    activePhraseIndex,
    activePhrase,
    getServerElapsedSec,
  };
}
