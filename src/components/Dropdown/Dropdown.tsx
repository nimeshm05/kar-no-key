"use client";

import { useEffect, useId, useRef } from "react";
import "./Dropdown.css";

type DropdownProps = {
  label: string;
  countBadge?: string;
  disabled?: boolean;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  panelClassName?: string;
  children: React.ReactNode;
};

export default function Dropdown({
  label,
  countBadge,
  disabled = false,
  isOpen,
  onOpenChange,
  panelClassName,
  children,
}: DropdownProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        onOpenChange(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onOpenChange]);

  function handleToggle() {
    if (disabled) {
      return;
    }

    onOpenChange(!isOpen);
  }

  const panelClasses = ["dropdown__panel", panelClassName]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="dropdown" ref={rootRef}>
      <button
        type="button"
        className="dropdown__trigger text-button-label"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-controls={panelId}
        disabled={disabled}
        onClick={handleToggle}
      >
        {countBadge ? (
          <span className="dropdown__badge text-button-label">{countBadge}</span>
        ) : null}
        <span className="dropdown__label">{label}</span>
        <span className="dropdown__arrow" aria-hidden="true" />
      </button>

      {isOpen ? (
        <div
          id={panelId}
          className={panelClasses}
          role="menu"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}
