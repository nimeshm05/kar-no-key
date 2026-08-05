"use client";

import { useEffect, useState } from "react";
import { useReducedMotion } from "motion/react";
import "./DoodleBackground.css";

type DoodleBackgroundProps = {
  /** When true, each doodle pulses its fill (game playing). Layout stays the same. */
  isAnimating?: boolean;
};

const DOODLE_MASK_URL = "/doodle-mask.svg";
const DOODLE_VIEWBOX = "0 0 1440 2960";
const DOODLE_ASPECT = 1440 / 2960;

let cachedPaths: string[] | null = null;
let pathsPromise: Promise<string[]> | null = null;

function parseDoodlePaths(svgText: string): string[] {
  return [...svgText.matchAll(/<path\s+d="([^"]+)"/g)].map((match) => match[1]);
}

function loadDoodlePaths(): Promise<string[]> {
  if (cachedPaths) {
    return Promise.resolve(cachedPaths);
  }

  if (!pathsPromise) {
    pathsPromise = fetch(DOODLE_MASK_URL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load doodle mask");
        }
        return response.text();
      })
      .then((text) => {
        cachedPaths = parseDoodlePaths(text);
        return cachedPaths;
      })
      .catch((error) => {
        pathsPromise = null;
        throw error;
      });
  }

  return pathsPromise;
}

/** Stable pseudo-random delay (0–3.5s) from path index. */
function delayFor(index: number): string {
  return `${((index * 41) % 100) / 28.5}s`;
}

/** Stable pseudo-random duration (1.2–2.8s) from path index. */
function durationFor(index: number): string {
  return `${1.2 + ((index * 59) % 100) / 62.5}s`;
}

function useTileCount(): number {
  const [tileCount, setTileCount] = useState(2);

  useEffect(() => {
    const update = () => {
      const tileWidth = window.innerHeight * DOODLE_ASPECT;
      setTileCount(Math.max(2, Math.ceil(window.innerWidth / tileWidth) + 2));
    };

    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  return tileCount;
}

export default function DoodleBackground({
  isAnimating = false,
}: DoodleBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const shouldPulse = Boolean(isAnimating) && reduceMotion !== true;
  const tileCount = useTileCount();
  const [paths, setPaths] = useState<string[]>(cachedPaths ?? []);

  useEffect(() => {
    if (paths.length > 0) {
      return;
    }

    let cancelled = false;
    void loadDoodlePaths()
      .then((loaded) => {
        if (!cancelled) {
          setPaths(loaded);
        }
      })
      .catch(() => {
        /* Keep mask fallback if SVG fails to load. */
      });

    return () => {
      cancelled = true;
    };
  }, [paths.length]);

  const isReady = paths.length > 0;

  const className = [
    "doodle-background",
    isReady && "doodle-background--ready",
    shouldPulse && isReady && "doodle-background--animating",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={className} aria-hidden="true">
      <div className="doodle-background__base" />
      {isReady ? (
        <div className="doodle-background__tiles">
          {Array.from({ length: tileCount }, (_, tileIndex) => (
            <svg
              key={tileIndex}
              className="doodle-background__tile"
              viewBox={DOODLE_VIEWBOX}
              xmlns="http://www.w3.org/2000/svg"
              focusable="false"
            >
              {paths.map((d, pathIndex) => (
                <path
                  key={pathIndex}
                  d={d}
                  style={
                    shouldPulse
                      ? {
                          ["--doodle-delay" as string]: delayFor(
                            pathIndex * 3 + tileIndex,
                          ),
                          ["--doodle-duration" as string]: durationFor(
                            pathIndex + tileIndex * 17,
                          ),
                        }
                      : undefined
                  }
                />
              ))}
            </svg>
          ))}
        </div>
      ) : null}
    </div>
  );
}
