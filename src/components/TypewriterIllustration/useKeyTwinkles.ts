"use client";

import type { SVGMotionProps } from "motion/react";
import { useEffect, useState } from "react";
import {
  KEY_CIRCLE_IDS,
  KEY_FILL,
  randomFlashMs,
  randomWaitMs,
  TWINKLE_FILL,
  type KeyCircleId,
} from "./twinkle";

type KeyTwinkleProps = Pick<SVGMotionProps<SVGPathElement>, "animate" | "transition">;

function createInitialLitState() {
  return Object.fromEntries(KEY_CIRCLE_IDS.map((id) => [id, false]));
}

export function useKeyTwinkles(reduceMotion: boolean | null) {
  const [litKeys, setLitKeys] = useState(createInitialLitState);

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const timeoutIds: number[] = [];
    let cancelled = false;

    const scheduleTwinkle = (id: KeyCircleId) => {
      const waitTimeoutId = window.setTimeout(() => {
        if (cancelled) {
          return;
        }

        setLitKeys((previous) => ({ ...previous, [id]: true }));

        const flashTimeoutId = window.setTimeout(() => {
          if (cancelled) {
            return;
          }

          setLitKeys((previous) => ({ ...previous, [id]: false }));
          scheduleTwinkle(id);
        }, randomFlashMs());

        timeoutIds.push(flashTimeoutId);
      }, randomWaitMs());

      timeoutIds.push(waitTimeoutId);
    };

    for (const id of KEY_CIRCLE_IDS) {
      scheduleTwinkle(id);
    }

    return () => {
      cancelled = true;
      timeoutIds.forEach((timeoutId) => window.clearTimeout(timeoutId));
    };
  }, [reduceMotion]);

  return (id: string): KeyTwinkleProps => {
    const isLit = !reduceMotion && litKeys[id as KeyCircleId] === true;

    return {
      animate: { fill: isLit ? TWINKLE_FILL : KEY_FILL },
      transition: { type: false },
    };
  };
}
