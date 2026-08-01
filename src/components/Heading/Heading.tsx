"use client";

import { useEffect, useState } from "react";
import {
  useTypewriterText,
  type TypewriterPace,
} from "@/lib/ui/useTypewriterText";
import "./Heading.css";

type HeadingProps = {
  children: string;
  as?: "h1" | "h2" | "h3";
  size?: "1" | "2" | "3";
  tone?: "default" | "error";
  /** `default` is slower; `brisk` for ephemeral title swaps (e.g. lyrics error). */
  pace?: TypewriterPace;
  className?: string;
  onSettle?: () => void;
};

export default function Heading({
  children,
  as: Tag = "h1",
  size = "2",
  tone = "default",
  pace = "default",
  className,
  onSettle,
}: HeadingProps) {
  const { displayText, phase, isAnimating } = useTypewriterText(children, {
    pace,
    onSettle,
  });
  const [visualTone, setVisualTone] = useState(tone);

  useEffect(() => {
    // Keep the previous tone while reverse-typing out old copy; sync when
    // forward-typing the new label (or when already settled on it).
    if (phase === "typing") {
      setVisualTone(tone);
      return;
    }

    if (phase === "settled" && displayText === children) {
      setVisualTone(tone);
    }
  }, [phase, tone, displayText, children]);

  const sizerText =
    displayText.length >= children.length ? displayText : children;

  const classes = [
    "heading",
    `text-heading-${size}`,
    visualTone === "error" ? "heading--error" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <Tag className={classes} aria-label={children}>
      <span className="heading__label">
        <span className="heading__sizer" aria-hidden="true">
          {sizerText}
          {isAnimating ? (
            <span className="heading__caret heading__caret--spacer" />
          ) : null}
        </span>
        <span className="heading__typed" aria-hidden="true">
          {displayText}
          {isAnimating ? <span className="heading__caret" /> : null}
        </span>
      </span>
    </Tag>
  );
}
