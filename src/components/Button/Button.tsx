"use client";

import Link from "next/link";
import { playClickSound } from "@/lib/ui/playClickSound";
import "./Button.css";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
  className?: string;
  disabled?: boolean;
};

export default function Button({
  children,
  href,
  onClick,
  type = "button",
  variant = "primary",
  className,
  disabled = false,
}: ButtonProps) {
  const classes = ["button", `button--${variant}`, "text-button-label", className]
    .filter(Boolean)
    .join(" ");

  function handleClick() {
    if (disabled) {
      return;
    }
    playClickSound();
    onClick?.();
  }

  if (href) {
    return (
      <Link href={href} className={classes} onClick={handleClick}>
        {children}
      </Link>
    );
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
