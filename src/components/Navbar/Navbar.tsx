"use client";

import { useEffect, useRef, useState } from "react";
import Dropdown from "@/components/Dropdown/Dropdown";
import IconButton from "@/components/IconButton/IconButton";
import { sortLobbyPlayers } from "@/lib/lobby/sortLobbyPlayers";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import "./Navbar.css";

type NavbarProps = {
  displayName: string;
  players: LobbyPlayer[];
  isRosterLoading?: boolean;
  rosterError?: string | null;
  onExitLobby: () => void;
};

type OpenMenu = "players" | "more" | null;

export default function Navbar({
  displayName,
  players,
  isRosterLoading = false,
  rosterError = null,
  onExitLobby,
}: NavbarProps) {
  const [openMenu, setOpenMenu] = useState<OpenMenu>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);
  const greetingName = displayName.toLowerCase();
  const sortedPlayers = sortLobbyPlayers(players);
  const playerCount = sortedPlayers.length;
  const countBadge = playerCount.toString().padStart(2, "0");

  function handlePlayersOpenChange(isOpen: boolean) {
    setOpenMenu(isOpen ? "players" : null);
  }

  function handleMoreOpenChange(isOpen: boolean) {
    setOpenMenu(isOpen ? "more" : null);
  }

  function handleLeaveLobby() {
    setOpenMenu(null);
    onExitLobby();
  }

  useEffect(() => {
    if (openMenu !== "more") {
      return;
    }

    function handlePointerDown(event: MouseEvent) {
      if (!moreMenuRef.current?.contains(event.target as Node)) {
        setOpenMenu(null);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setOpenMenu(null);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [openMenu]);

  return (
    <header className="navbar">
      <div className="navbar__content">
        <div className="navbar__section navbar__section--start">
          <p className="navbar__greeting text-body">
            hello, {greetingName}.
          </p>
        </div>

        <div className="navbar__section navbar__section--end">
          <Dropdown
            label="players joined"
            countBadge={countBadge}
            disabled={isRosterLoading && playerCount === 0}
            isOpen={openMenu === "players"}
            onOpenChange={handlePlayersOpenChange}
          >
            {rosterError ? (
              <p className="dropdown__error text-button-label" role="alert">
                {rosterError}
              </p>
            ) : null}

            {isRosterLoading && playerCount === 0 ? (
              <p className="dropdown__message text-button-label">loading...</p>
            ) : null}

            {sortedPlayers.map((player) => (
              <div
                key={player.player_id}
                className="dropdown__row text-button-label"
                role="none"
              >
                <span className="dropdown__row-name">
                  {player.display_name.toLowerCase()}
                </span>
                <span className="dropdown__row-meta">
                  {player.is_host ? "host" : "player"}
                </span>
              </div>
            ))}
          </Dropdown>

          <div className="navbar__more-menu" ref={moreMenuRef}>
            <IconButton
              variant="secondary"
              type="button"
              iconSrc="/icons/ellipsis-vertical.svg"
              iconAlt="more options"
              className={
                openMenu === "more" ? "navbar__more-button--open" : undefined
              }
              onClick={() =>
                handleMoreOpenChange(openMenu !== "more")
              }
            />

            {openMenu === "more" ? (
              <div
                className="navbar__more-panel dropdown__panel dropdown__panel--menu"
                role="menu"
              >
                <button
                  type="button"
                  className="dropdown__menu-item text-button-label"
                  role="menuitem"
                  onClick={handleLeaveLobby}
                >
                  <img
                    className="dropdown__menu-icon"
                    src="/icons/log-out.svg"
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="dropdown__menu-label">Leave Game</span>
                </button>
                <button
                  type="button"
                  className="dropdown__menu-item text-button-label"
                  role="menuitem"
                  onClick={() => setOpenMenu(null)}
                >
                  <img
                    className="dropdown__menu-icon"
                    src="/icons/message-square-quote.svg"
                    alt=""
                    aria-hidden="true"
                  />
                  <span className="dropdown__menu-label">Feedback</span>
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
