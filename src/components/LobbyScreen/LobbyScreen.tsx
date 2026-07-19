"use client";

import { useState } from "react";
import AnimatedEllipsis from "@/components/AnimatedEllipsis/AnimatedEllipsis";
import Button from "@/components/Button/Button";
import JoinCodeModal from "@/components/JoinCodeModal/JoinCodeModal";
import type { JoinModalPhase } from "@/components/JoinCodeModal/JoinCodeModal";
import Navbar from "@/components/Navbar/Navbar";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import { normalizeLobbyCodeInput } from "@/lib/lobby/lobbyCode";
import "./LobbyScreen.css";

type LobbyScreenProps = {
  displayName: string;
  lobbyCode: string;
  isHost: boolean;
  players: LobbyPlayer[];
  joinCode: string;
  onJoinCodeChange: (value: string) => void;
  onExitLobby: () => void;
  onStartGame: () => void;
  onJoinLobby: () => Promise<boolean>;
  isLoading: boolean;
  isRosterLoading: boolean;
  rosterError: string | null;
  joinModalPhase: JoinModalPhase;
  onJoinModalPhaseChange: (phase: JoinModalPhase) => void;
  startGameError: string | null;
};

export default function LobbyScreen({
  displayName,
  lobbyCode,
  isHost,
  players,
  joinCode,
  onJoinCodeChange,
  onExitLobby,
  onStartGame,
  onJoinLobby,
  isLoading,
  isRosterLoading,
  rosterError,
  joinModalPhase,
  onJoinModalPhaseChange,
  startGameError,
}: LobbyScreenProps) {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const playerCount = players.length;
  const isSolo = playerCount <= 1;

  const instructions = isSolo
    ? "invite your friends by sharing this code, or start the race on your own."
    : "share this code with your frens to begin the race.";

  function handleCloseModal() {
    setIsJoinModalOpen(false);
    onJoinModalPhaseChange("enter-code");
  }

  function handleRetry() {
    onJoinModalPhaseChange("enter-code");
  }

  function handleOwnCodeStartGame() {
    setIsJoinModalOpen(false);
    onJoinModalPhaseChange("enter-code");
    onStartGame();
  }

  async function handleJoinSubmit() {
    if (
      isHost &&
      normalizeLobbyCodeInput(joinCode) === normalizeLobbyCodeInput(lobbyCode)
    ) {
      onJoinModalPhaseChange("own-code");
      return;
    }

    onJoinModalPhaseChange("joining");
    const success = await onJoinLobby();
    if (success) {
      onJoinModalPhaseChange("waiting-for-host");
    } else {
      onJoinModalPhaseChange("error");
    }
  }

  const isModalOpen =
    isJoinModalOpen ||
    joinModalPhase === "joining" ||
    joinModalPhase === "error" ||
    joinModalPhase === "waiting-for-host" ||
    joinModalPhase === "own-code";

  return (
    <main
      className={`lobby-screen${isModalOpen ? " lobby-screen--modal-open" : ""}`}
    >
      <Navbar
        displayName={displayName}
        players={players}
        isRosterLoading={isRosterLoading}
        rosterError={rosterError}
        onExitLobby={onExitLobby}
      />

      <div className="lobby-screen__body">
        <div className="lobby-screen__align">
          <div className="lobby-screen__content">
            <section className="lobby-screen__main">
              <div className="lobby-screen__hero">
                <h1 className="lobby-screen__code text-heading-1">
                  {lobbyCode.toUpperCase()}
                </h1>
                <p className="lobby-screen__instructions text-body">
                  {isRosterLoading && playerCount === 0 ? (
                    <AnimatedEllipsis label="loading lobby" live />
                  ) : (
                    instructions
                  )}
                </p>
                {isHost ? (
                  <Button
                    variant="primary"
                    type="button"
                    className="lobby-screen__start-button"
                    onClick={onStartGame}
                    disabled={isLoading || isRosterLoading}
                  >
                    let&apos;s gooo
                  </Button>
                ) : null}
                {startGameError ? (
                  <p className="lobby-screen__start-error text-body" role="alert">
                    {startGameError}
                  </p>
                ) : null}
              </div>

              <div className="lobby-screen__divider">
                <hr className="lobby-screen__divider-line" />
                <p className="lobby-screen__divider-label text-button-label">or</p>
                <hr className="lobby-screen__divider-line" />
              </div>

              <div className="lobby-screen__join">
                <p className="lobby-screen__join-label text-body">
                  did your fren give you a code?
                </p>
                <Button
                  variant="secondary"
                  type="button"
                  className="lobby-screen__join-button"
                  onClick={() => setIsJoinModalOpen(true)}
                  disabled={isLoading}
                >
                  my fren gave me a code
                </Button>
              </div>
            </section>
          </div>
        </div>
      </div>

      {isModalOpen ? (
        <JoinCodeModal
          joinCode={joinCode}
          onJoinCodeChange={onJoinCodeChange}
          onClose={handleCloseModal}
          onSubmit={handleJoinSubmit}
          onRetry={handleRetry}
          onOwnCodeStartGame={handleOwnCodeStartGame}
          phase={joinModalPhase}
        />
      ) : null}
    </main>
  );
}
