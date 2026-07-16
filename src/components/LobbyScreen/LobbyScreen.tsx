"use client";

import { useState } from "react";
import Button from "@/components/Button/Button";
import JoinCodeModal from "@/components/JoinCodeModal/JoinCodeModal";
import type { JoinModalPhase } from "@/components/JoinCodeModal/JoinCodeModal";
import LobbyRoster from "@/components/LobbyRoster/LobbyRoster";
import Navbar from "@/components/Navbar/Navbar";
import type { LobbyPlayer } from "@/lib/supabase/functions";
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
  joinError: string | null;
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
  joinError,
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
    if (!isLoading) {
      setIsJoinModalOpen(false);
      onJoinModalPhaseChange("enter-code");
    }
  }

  async function handleJoinSubmit() {
    onJoinModalPhaseChange("joining");
    const success = await onJoinLobby();
    if (success) {
      onJoinModalPhaseChange("waiting-for-host");
    } else {
      onJoinModalPhaseChange("enter-code");
    }
  }

  const isModalOpen =
    isJoinModalOpen || joinModalPhase === "waiting-for-host";

  return (
    <main
      className={`lobby-screen${isModalOpen ? " lobby-screen--modal-open" : ""}`}
    >
      <Navbar displayName={displayName} onExitLobby={onExitLobby} />

      <div className="lobby-screen__body">
        <div className="lobby-screen__anchor">
          <section className="lobby-screen__main">
            <div className="lobby-screen__hero">
              <h1 className="lobby-screen__code text-heading-1">
                {lobbyCode.toUpperCase()}
              </h1>
              <p className="lobby-screen__instructions text-body">
                {isRosterLoading && playerCount === 0
                  ? "loading lobby..."
                  : instructions}
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

            {isSolo && !isRosterLoading ? (
              <hr className="lobby-screen__divider" />
            ) : null}

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

          <LobbyRoster
            className="lobby-screen__roster"
            players={players}
            isLoading={isRosterLoading}
            error={rosterError}
          />
        </div>
      </div>

      {isModalOpen ? (
        <JoinCodeModal
          joinCode={joinCode}
          onJoinCodeChange={onJoinCodeChange}
          onClose={handleCloseModal}
          onSubmit={handleJoinSubmit}
          isLoading={isLoading || joinModalPhase === "joining"}
          error={joinError}
          phase={joinModalPhase}
        />
      ) : null}
    </main>
  );
}
