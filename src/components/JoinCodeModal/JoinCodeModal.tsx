"use client";

import { useEffect } from "react";
import AnimatedEllipsis from "@/components/AnimatedEllipsis/AnimatedEllipsis";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { lockBodyScroll } from "@/lib/dom/bodyScrollLock";
import { isLobbyCodeMinLength } from "@/lib/lobby/lobbyCode";
import "./JoinCodeModal.css";

export type JoinModalPhase = "enter-code" | "joining" | "error" | "waiting-for-host";

type JoinCodeModalProps = {
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  phase: JoinModalPhase;
};

function getDialogTitle(phase: JoinModalPhase): string {
  switch (phase) {
    case "joining":
      return "Joining lobby";
    case "error":
      return "Unable to connect";
    case "waiting-for-host":
      return "Waiting for host";
    default:
      return "Enter lobby code";
  }
}

export default function JoinCodeModal({
  joinCode,
  onJoinCodeChange,
  onClose,
  onSubmit,
  onRetry,
  phase,
}: JoinCodeModalProps) {
  const canDismiss = phase === "enter-code" || phase === "error";
  const canSubmit = isLobbyCodeMinLength(joinCode);
  const isBusy = phase === "joining" || phase === "waiting-for-host";

  useEffect(() => {
    const unlockBodyScroll = lockBodyScroll();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && canDismiss) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      unlockBodyScroll();
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, canDismiss]);

  const panelClassName = [
    "join-code-modal__panel",
    isBusy ? "join-code-modal__panel--centered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="join-code-modal">
      <button
        type="button"
        className="join-code-modal__overlay"
        onClick={canDismiss ? onClose : undefined}
        disabled={!canDismiss}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-code-modal-title"
        aria-busy={isBusy || undefined}
        className={panelClassName}
      >
        <h2 id="join-code-modal-title" className="join-code-modal__title">
          {getDialogTitle(phase)}
        </h2>

        {phase === "enter-code" ? (
          <>
            <InputField
              value={joinCode}
              onChange={(event) => onJoinCodeChange(event.target.value)}
              placeholder="enter the code"
              align="center"
              aria-label="Lobby code"
              autoFocus
              className="join-code-modal__input"
            />
            <div className="join-code-modal__actions">
              <Button
                variant="secondary"
                type="button"
                className="join-code-modal__action"
                onClick={onClose}
              >
                cancel
              </Button>
              <Button
                variant="primary"
                type="button"
                className="join-code-modal__action join-code-modal__action--submit"
                disabled={!canSubmit}
                onClick={onSubmit}
              >
                let&apos;s gooo
              </Button>
            </div>
          </>
        ) : null}

        {phase === "joining" ? (
          <AnimatedEllipsis
            label="wait"
            className="join-code-modal__message"
            live
            as="p"
          />
        ) : null}

        {phase === "error" ? (
          <>
            <p className="join-code-modal__message">
              unable to connect. please enter the correct code.
            </p>
            <Button
              variant="primary"
              type="button"
              className="join-code-modal__retry"
              onClick={onRetry}
            >
              retry
            </Button>
          </>
        ) : null}

        {phase === "waiting-for-host" ? (
          <div className="join-code-modal__message">
            <p>waiting for the host to start the race.</p>
            <p className="join-code-modal__message-secondary">patience my humble fren.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
