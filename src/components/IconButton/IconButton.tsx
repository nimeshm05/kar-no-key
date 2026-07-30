"use client";

import { playClickSound } from "@/lib/ui/playClickSound";
import "./IconButton.css";

type IconButtonProps = {
  iconSrc: string;
  iconAlt: string;
  onClick?: () => void;
  type?: "button" | "submit" | "reset";
  variant?: "primary" | "secondary";
  size?: "default" | "sm";
  className?: string;
  disabled?: boolean;
};

export default function IconButton({
  iconSrc,
  iconAlt,
  onClick,
  type = "button",
  variant = "primary",
  size = "default",
  className,
  disabled = false,
}: IconButtonProps) {
  const classes = [
    "icon-button",
    `icon-button--${variant}`,
    size === "sm" ? "icon-button--sm" : null,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  function handleClick() {
    if (disabled) {
      return;
    }
    playClickSound();
    onClick?.();
  }

  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      disabled={disabled}
      aria-label={iconAlt}
    >
      <img className="icon-button__icon" src={iconSrc} alt="" aria-hidden="true" />
    </button>
  );
}
