"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import "./Loader.css";

const CELL_COUNT = 16;
const COLS = 4;

/** Indices that light up for the Frame 15 X pattern (row-major). */
const CORNER_INDICES = new Set([0, 3, 12, 15]);
const INNER_INDICES = new Set([5, 6, 9, 10]);

type LoaderProps = {
  className?: string;
  /** Cell edge length in px. Ignored when `boxSize` is set. Default 8. */
  size?: number;
  /** Overall grid edge length in px (e.g. 40). Derives cell from `gap`. */
  boxSize?: number;
  gap?: number;
  speed?: number;
  label?: string;
  paused?: boolean;
};

type LoaderStyle = CSSProperties & {
  "--loader-cell": string;
  "--loader-gap": string;
  "--loader-duration": string;
};

function cellRole(index: number): "idle" | "corner" | "inner" {
  if (CORNER_INDICES.has(index)) return "corner";
  if (INNER_INDICES.has(index)) return "inner";
  return "idle";
}

export default function Loader({
  className,
  size = 8,
  boxSize,
  gap = 2,
  speed = 1,
  label = "Loading",
  paused = false,
}: LoaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const safeSpeed = speed > 0 ? speed : 1;
  const durationSec = 1.4 / safeSpeed;
  const cellSize =
    boxSize != null
      ? Math.max(1, (boxSize - gap * (COLS - 1)) / COLS)
      : size;

  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;

    if (paused) {
      node.dataset.paused = "true";
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        node.dataset.paused = entry.isIntersecting ? "false" : "true";
      },
      { threshold: 0 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [paused]);

  const classes = ["loader", className].filter(Boolean).join(" ");
  const style: LoaderStyle = {
    "--loader-cell": `${cellSize}px`,
    "--loader-gap": `${gap}px`,
    "--loader-duration": `${durationSec}s`,
    gridTemplateColumns: `repeat(${COLS}, var(--loader-cell))`,
  };

  return (
    <div
      ref={rootRef}
      className={classes}
      role="status"
      aria-label={label}
      data-paused={paused ? "true" : "false"}
      style={style}
    >
      {Array.from({ length: CELL_COUNT }, (_, index) => (
        <span
          key={index}
          className="loader__cell"
          data-role={cellRole(index)}
          aria-hidden="true"
        />
      ))}
    </div>
  );
}
