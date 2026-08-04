"use client";

import { useReducedMotion } from "motion/react";
import "./DoodleBackground.css";

type DoodleBackgroundProps = {
  /** When true, color pulse runs (game screen only). Frozen when false. */
  isAnimating?: boolean;
};

export default function DoodleBackground({
  isAnimating = false,
}: DoodleBackgroundProps) {
  const reduceMotion = useReducedMotion();
  const shouldAnimate = isAnimating && !reduceMotion;

  const className = [
    "doodle-background",
    shouldAnimate && "doodle-background--animating",
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={className} aria-hidden="true" />;
}
