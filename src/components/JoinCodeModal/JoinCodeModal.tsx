"use client";

import { useEffect } from "react";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import { isLobbyCodeMinLength } from "@/lib/lobby/lobbyCode";
import "./JoinCodeModal.css";

type JoinCodeModalProps = {
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  isLoading: boolean;
  error: string | null;
};

export default function JoinCodeModal({
  joinCode,
  onJoinCodeChange,
  onClose,
  onSubmit,
  isLoading,
  error,
}: JoinCodeModalProps) {
  const canSubmit = isLobbyCodeMinLength(joinCode) && !isLoading;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isLoading) {
        onClose();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose, isLoading]);

  return (
    <div className="join-code-modal">
      <button
        type="button"
        className="join-code-modal__overlay"
        onClick={onClose}
        disabled={isLoading}
        aria-label="Close"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="join-code-modal-title"
        className="join-code-modal__panel"
      >
        <h2 id="join-code-modal-title" className="join-code-modal__title">
          Enter lobby code
        </h2>
        <InputField
          value={joinCode}
          onChange={(event) => onJoinCodeChange(event.target.value)}
          placeholder="enter your code"
          align="center"
          aria-label="Lobby code"
          autoFocus
          disabled={isLoading}
        />
        {error ? (
          <p className="join-code-modal__error text-body" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          variant="primary"
          type="button"
          className="join-code-modal__submit"
          disabled={!canSubmit}
          onClick={onSubmit}
        >
          {isLoading ? "joining..." : "let&apos;s gooo"}
        </Button>
      </div>
    </div>
  );
}
