"use client";

import { useEffect, useId } from "react";
import { lockBodyScroll } from "@/lib/dom/bodyScrollLock";
import "./Dialog.css";

type DialogProps = {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  ariaBusy?: boolean;
  className?: string;
  dismissible?: boolean;
};

export default function Dialog({
  title,
  onClose,
  children,
  footer,
  ariaBusy,
  className,
  dismissible = true,
}: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    const unlockBodyScroll = lockBodyScroll();

    if (!dismissible) {
      return unlockBodyScroll;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [dismissible, onClose]);

  const panelClassName = ["dialog__panel", className].filter(Boolean).join(" ");

  return (
    <div className="dialog">
      {dismissible ? (
        <button
          type="button"
          className="dialog__overlay"
          onClick={onClose}
          aria-label="Close"
        />
      ) : (
        <div className="dialog__overlay" aria-hidden="true" />
      )}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-busy={ariaBusy || undefined}
        className={panelClassName}
      >
        <div className="dialog__header">
          <h2 id={titleId} className="dialog__title">
            {title}
          </h2>
          {dismissible ? (
            <button
              type="button"
              className="dialog__close"
              onClick={onClose}
              aria-label="Close"
            >
              <img
                className="dialog__close-icon"
                src="/icons/x.svg"
                alt=""
                aria-hidden="true"
              />
            </button>
          ) : null}
        </div>
        <div className="dialog__body">{children}</div>
        {footer ? <div className="dialog__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
