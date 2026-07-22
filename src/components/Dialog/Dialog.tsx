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
};

export default function Dialog({
  title,
  onClose,
  children,
  footer,
  ariaBusy,
  className,
}: DialogProps) {
  const titleId = useId();

  useEffect(() => {
    const unlockBodyScroll = lockBodyScroll();

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
  }, [onClose]);

  const panelClassName = ["dialog__panel", className].filter(Boolean).join(" ");

  return (
    <div className="dialog">
      <button
        type="button"
        className="dialog__overlay"
        onClick={onClose}
        aria-label="Close"
      />
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
        </div>
        <div className="dialog__body">{children}</div>
        {footer ? <div className="dialog__footer">{footer}</div> : null}
      </div>
    </div>
  );
}
