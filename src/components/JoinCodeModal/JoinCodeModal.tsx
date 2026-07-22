"use client";

import Button from "@/components/Button/Button";
import Dialog from "@/components/Dialog/Dialog";
import InputField from "@/components/InputField/InputField";
import { isLobbyCodeMinLength } from "@/lib/lobby/lobbyCode";
import "./JoinCodeModal.css";

export type JoinModalPhase =
  | "enter-code"
  | "joining"
  | "error"
  | "waiting-for-host"
  | "own-code";

type JoinCodeModalProps = {
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  onRetry: () => void;
  onOwnCodeStartGame: () => void;
  phase: JoinModalPhase;
};

function getDialogTitle(phase: JoinModalPhase): string {
  switch (phase) {
    case "joining":
      return "Hold on :)";
    case "error":
      return "Error";
    case "waiting-for-host":
      return "Patience :)";
    case "own-code":
      return "Cannot join own lobby";
    default:
      return "Enter Code";
  }
}

export default function JoinCodeModal({
  joinCode,
  onJoinCodeChange,
  onClose,
  onSubmit,
  onRetry,
  onOwnCodeStartGame,
  phase,
}: JoinCodeModalProps) {
  const canSubmit = isLobbyCodeMinLength(joinCode);
  const isBusy = phase === "joining" || phase === "waiting-for-host";

  let body: React.ReactNode = null;
  let footer: React.ReactNode = null;

  if (phase === "enter-code") {
    body = (
      <InputField
        value={joinCode}
        onChange={(event) => onJoinCodeChange(event.target.value)}
        placeholder="code"
        align="center"
        aria-label="Lobby code"
        autoFocus
        className="join-code-modal__input"
      />
    );
    footer = (
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
    );
  }

  if (phase === "joining") {
    body = <p className="join-code-modal__status">wait...</p>;
  }

  if (phase === "error") {
    body = (
      <p className="join-code-modal__message">
        unable to connect. please enter the correct code.
      </p>
    );
    footer = (
      <Button
        variant="primary"
        type="button"
        className="join-code-modal__retry"
        onClick={onRetry}
      >
        retry
      </Button>
    );
  }

  if (phase === "own-code") {
    body = (
      <p className="join-code-modal__message">
        you cannot input your own code. wanna play the game yourself?
      </p>
    );
    footer = (
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
          className="join-code-modal__action"
          onClick={onOwnCodeStartGame}
        >
          let&apos;s go
        </Button>
      </div>
    );
  }

  if (phase === "waiting-for-host") {
    body = (
      <div className="join-code-modal__message">
        <p>waiting for the host to start the race.</p>
        <p>patience my humble fren.</p>
      </div>
    );
  }

  return (
    <Dialog
      title={getDialogTitle(phase)}
      onClose={onClose}
      ariaBusy={isBusy || undefined}
      footer={footer}
    >
      {body}
    </Dialog>
  );
}
