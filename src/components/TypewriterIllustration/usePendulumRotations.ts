"use client";

import type { SVGMotionProps } from "motion/react";
import { useEffect, useMemo, useState } from "react";
import {
  createConfigById,
  getInitialRestingAngle,
  getOppositeRestingAngle,
  type PendulumConfig,
} from "./pendulum";

type PendulumNoteProps = Pick<SVGMotionProps<SVGGElement>, "style" | "animate" | "transition">;

function createInitialAngles(configs: PendulumConfig[]) {
  return Object.fromEntries(
    configs.map((config) => [config.id, getInitialRestingAngle(config)]),
  );
}

export function usePendulumRotations(
  configs: PendulumConfig[],
  reduceMotion: boolean | null,
) {
  const configById = useMemo(() => createConfigById(configs), [configs]);
  const [angles, setAngles] = useState(() => createInitialAngles(configs));

  useEffect(() => {
    if (reduceMotion) {
      return;
    }

    const cleanups: Array<() => void> = [];

    for (const config of configs) {
      const intervalMs = (config.repeatDelay ?? 0.25) * 1000;
      const delayMs = (config.delay ?? 0) * 1000;

      const startInterval = () => {
        const intervalId = window.setInterval(() => {
          setAngles((previous) => ({
            ...previous,
            [config.id]: getOppositeRestingAngle(config, previous[config.id]),
          }));
        }, intervalMs);

        cleanups.push(() => window.clearInterval(intervalId));
      };

      if (delayMs > 0) {
        const timeoutId = window.setTimeout(startInterval, delayMs);
        cleanups.push(() => window.clearTimeout(timeoutId));
      } else {
        startInterval();
      }
    }

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [configs, reduceMotion]);

  return (id: string): PendulumNoteProps => {
    const config = configById[id];

    if (!config) {
      return {
        style: {
          transformOrigin: "center",
          transformBox: "fill-box",
          transition: "none",
        },
        animate: { rotate: 0 },
        transition: { type: false },
      };
    }

    return {
      style: {
        transformOrigin: config.origin,
        transformBox: "fill-box",
        transition: "none",
      },
      animate: { rotate: reduceMotion ? 0 : angles[id] },
      transition: { type: false },
    };
  };
}
