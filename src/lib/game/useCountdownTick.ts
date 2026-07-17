import { useEffect, useMemo, useState } from "react";

const COUNTDOWN_SECONDS = 3;

function getServerOffsetMs(serverNow: string): number {
  return new Date(serverNow).getTime() - Date.now();
}

type UseCountdownTickOptions = {
  countdownStartAt: string | null;
  playbackStartAt: string | null;
  serverNow: string;
  enabled: boolean;
};

export function useCountdownTick({
  countdownStartAt,
  playbackStartAt,
  serverNow,
  enabled,
}: UseCountdownTickOptions) {
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  const serverOffsetMs = useMemo(
    () => getServerOffsetMs(serverNow),
    [serverNow],
  );

  useEffect(() => {
    if (!enabled || !countdownStartAt || !playbackStartAt) {
      setCountdownValue(null);
      return;
    }

    const countdownStartMs = new Date(countdownStartAt).getTime();
    const playbackStartMs = new Date(playbackStartAt).getTime();

    function tick() {
      const now = Date.now() + serverOffsetMs;
      const remainingMs = playbackStartMs - now;

      if (remainingMs <= 0) {
        setCountdownValue(0);
        return;
      }

      const elapsedSinceCountdown = now - countdownStartMs;
      const secondsLeft = Math.ceil(
        (COUNTDOWN_SECONDS * 1000 - elapsedSinceCountdown) / 1000,
      );
      setCountdownValue(Math.max(1, Math.min(COUNTDOWN_SECONDS, secondsLeft)));
    }

    tick();
    const intervalId = window.setInterval(tick, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [countdownStartAt, enabled, playbackStartAt, serverOffsetMs]);

  return countdownValue;
}
