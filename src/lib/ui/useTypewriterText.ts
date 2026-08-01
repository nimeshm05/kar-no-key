"use client";

import { useEffect, useRef, useState } from "react";

export type TypewriterPhase = "typing" | "deleting" | "settled";

/** `default` is slower for brand/screen titles; `brisk` for short-lived title swaps. */
export type TypewriterPace = "default" | "brisk";

type UseTypewriterTextOptions = {
  /** When false, show the full target immediately. Default true. */
  enabled?: boolean;
  /** Typing speed. Default `default` (slower). */
  pace?: TypewriterPace;
  /** Called when forward typing finishes and phase becomes settled. */
  onSettle?: () => void;
};

function charDelayMs(
  length: number,
  mode: "typing" | "deleting",
  pace: TypewriterPace,
): number {
  if (pace === "brisk") {
    if (mode === "deleting") {
      return Math.max(22, Math.min(36, 30 - Math.floor(length / 40)));
    }

    return Math.max(36, Math.min(64, 52 - Math.floor(length / 30)));
  }

  if (mode === "deleting") {
    return Math.max(40, Math.min(60, 52 - Math.floor(length / 40)));
  }

  return Math.max(70, Math.min(110, 90 - Math.floor(length / 30)));
}

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Character-by-character typewriter with reverse-delete when the target changes.
 */
export function useTypewriterText(
  target: string,
  options: UseTypewriterTextOptions = {},
) {
  const { enabled = true, pace = "default", onSettle } = options;
  const [displayText, setDisplayText] = useState("");
  const [phase, setPhase] = useState<TypewriterPhase>("typing");

  const displayTextRef = useRef(displayText);
  const phaseRef = useRef(phase);
  const targetRef = useRef(target);
  const paceRef = useRef(pace);
  const onSettleRef = useRef(onSettle);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  displayTextRef.current = displayText;
  phaseRef.current = phase;
  targetRef.current = target;
  paceRef.current = pace;
  onSettleRef.current = onSettle;

  useEffect(() => {
    const clearTimer = () => {
      if (timerRef.current !== null) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };

    const settle = (text: string) => {
      clearTimer();
      displayTextRef.current = text;
      phaseRef.current = "settled";
      setDisplayText(text);
      setPhase("settled");
      onSettleRef.current?.();
    };

    const runTyping = () => {
      const nextTarget = targetRef.current;
      const current = displayTextRef.current;

      if (current === nextTarget) {
        settle(nextTarget);
        return;
      }

      // Target changed mid-type — reverse out, then type the new target.
      if (!nextTarget.startsWith(current) && current.length > 0) {
        phaseRef.current = "deleting";
        setPhase("deleting");
        runDeleting();
        return;
      }

      phaseRef.current = "typing";
      setPhase("typing");

      const nextText = nextTarget.slice(0, current.length + 1);
      displayTextRef.current = nextText;
      setDisplayText(nextText);

      const delay = charDelayMs(nextTarget.length, "typing", paceRef.current);

      // Hold the final character + caret for one beat before settling.
      if (nextText === nextTarget) {
        timerRef.current = setTimeout(() => {
          settle(nextTarget);
        }, delay);
        return;
      }

      timerRef.current = setTimeout(runTyping, delay);
    };

    const runDeleting = () => {
      const current = displayTextRef.current;
      const nextTarget = targetRef.current;

      if (current.length === 0) {
        runTyping();
        return;
      }

      // Already a prefix of the new target — type forward from here.
      if (nextTarget.startsWith(current)) {
        runTyping();
        return;
      }

      phaseRef.current = "deleting";
      setPhase("deleting");

      const nextText = current.slice(0, -1);
      displayTextRef.current = nextText;
      setDisplayText(nextText);

      timerRef.current = setTimeout(
        runDeleting,
        charDelayMs(current.length, "deleting", paceRef.current),
      );
    };

    clearTimer();

    if (!enabled || prefersReducedMotion()) {
      settle(target);
      return clearTimer;
    }

    const current = displayTextRef.current;

    if (current === target && phaseRef.current === "settled") {
      return clearTimer;
    }

    if (current === target) {
      settle(target);
      return clearTimer;
    }

    if (current.length === 0 || target.startsWith(current)) {
      runTyping();
    } else {
      runDeleting();
    }

    return clearTimer;
  }, [target, enabled]);

  const isAnimating = phase !== "settled";

  return { displayText, phase, isAnimating };
}
