"use client";

import "./AnimatedEllipsis.css";

type AnimatedEllipsisProps = {
  label: string;
  className?: string;
  live?: boolean;
  as?: "span" | "p";
};

export default function AnimatedEllipsis({
  label,
  className,
  live = false,
  as: Component = "span",
}: AnimatedEllipsisProps) {
  const classes = ["animated-ellipsis", className].filter(Boolean).join(" ");

  return (
    <Component className={classes} aria-live={live ? "polite" : undefined}>
      {label}
      <span className="animated-ellipsis__dots" aria-hidden="true">
        <span className="animated-ellipsis__dot">.</span>
        <span className="animated-ellipsis__dot">.</span>
        <span className="animated-ellipsis__dot">.</span>
      </span>
    </Component>
  );
}
