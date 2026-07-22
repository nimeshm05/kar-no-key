"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const PAGE_LOADER_MIN_MS = 2500;

type UseTimedPageLoaderOptions = {
  /** Minimum time the loader stays visible. Default 2500ms. */
  minMs?: number;
};

/**
 * Page-transition loader gate: visible for at least `minMs`, and until
 * `finish()` after the underlying work settles. On error, call `finish()`
 * (or `cancel()`) so the previous screen + error can show.
 */
export function useTimedPageLoader(options: UseTimedPageLoaderOptions = {}) {
  const minMs = options.minMs ?? PAGE_LOADER_MIN_MS;
  const [isLoading, setIsLoading] = useState(false);
  const startedAtRef = useRef<number | null>(null);
  const workDoneRef = useRef(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current !== null) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }
  }, []);

  const tryHide = useCallback(() => {
    if (!workDoneRef.current || startedAtRef.current === null) {
      return;
    }

    const elapsed = Date.now() - startedAtRef.current;
    const remaining = Math.max(0, minMs - elapsed);

    clearHideTimer();

    if (remaining === 0) {
      startedAtRef.current = null;
      workDoneRef.current = false;
      setIsLoading(false);
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      hideTimerRef.current = null;
      startedAtRef.current = null;
      workDoneRef.current = false;
      setIsLoading(false);
    }, remaining);
  }, [clearHideTimer, minMs]);

  const start = useCallback(() => {
    clearHideTimer();
    workDoneRef.current = false;
    startedAtRef.current = Date.now();
    setIsLoading(true);
  }, [clearHideTimer]);

  const finish = useCallback(() => {
    if (startedAtRef.current === null) {
      setIsLoading(false);
      return;
    }
    workDoneRef.current = true;
    tryHide();
  }, [tryHide]);

  /** Immediate hide (e.g. hard cancel). Prefer `finish()` for the min-duration UX. */
  const cancel = useCallback(() => {
    clearHideTimer();
    startedAtRef.current = null;
    workDoneRef.current = false;
    setIsLoading(false);
  }, [clearHideTimer]);

  useEffect(() => () => clearHideTimer(), [clearHideTimer]);

  return { isLoading, start, finish, cancel };
}
