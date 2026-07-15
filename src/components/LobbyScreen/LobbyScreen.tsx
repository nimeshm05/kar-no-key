"use client";

import { useState } from "react";
import Button from "@/components/Button/Button";
import JoinCodeModal from "@/components/JoinCodeModal/JoinCodeModal";
import Navbar from "@/components/Navbar/Navbar";
import { sortLobbyPlayers } from "@/lib/lobby/sortLobbyPlayers";
import { LOBBY_MAX_PLAYERS } from "@/lib/lobby/lobbyConstants";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import "./LobbyScreen.css";

type LobbyScreenProps = {
  displayName: string;
  lobbyCode: string;
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
};

export default function LobbyScreen({
  displayName,
  lobbyCode,
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
}: LobbyScreenProps) {
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const sortedPlayers = sortLobbyPlayers(players);
  const playerCount = sortedPlayers.length;
  const isSolo = playerCount <= 1;
  const showRosterList = playerCount > 0 && !isRosterLoading;

  const instructions = isSolo
    ? "invite your friends by sharing this code, or start the race on your own."
    : "share this code with your frens to begin the race.";

  function handleCloseModal() {
    if (!isLoading) {
      setIsJoinModalOpen(false);
    }
  }

  async function handleJoinSubmit() {
    const success = await onJoinLobby();
    if (success) {
      setIsJoinModalOpen(false);
    }
  }

  return (
    <main
      className={`lobby-screen${isJoinModalOpen ? " lobby-screen--modal-open" : ""}`}
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
              <Button
                variant="primary"
                type="button"
                className="lobby-screen__start-button"
                onClick={onStartGame}
                disabled={isLoading || isRosterLoading}
              >
                let&apos;s gooo
              </Button>
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

          <aside className="lobby-screen__roster">
            <div className="lobby-screen__roster-header text-body">
              <span>players joined</span>
              <span>
                {playerCount}/{LOBBY_MAX_PLAYERS}
              </span>
            </div>

            {rosterError ? (
              <p className="lobby-screen__roster-error text-body" role="alert">
                {rosterError}
              </p>
            ) : null}

            {showRosterList ? (
              <ul className="lobby-screen__roster-list">
                {sortedPlayers.map((player) => (
                  <li
                    key={player.player_id}
                    className="lobby-screen__roster-player text-button-label"
                  >
                    <span className="lobby-screen__roster-name">
                      {player.display_name.toLowerCase()}
                    </span>
                    <span className="lobby-screen__roster-role">
                      {player.is_host ? "host" : "player"}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
          </aside>
        </div>
      </div>

      {isJoinModalOpen ? (
        <JoinCodeModal
          joinCode={joinCode}
          onJoinCodeChange={onJoinCodeChange}
          onClose={handleCloseModal}
          onSubmit={handleJoinSubmit}
          isLoading={isLoading}
          error={joinError}
        />
      ) : null}
    </main>
  );
}
