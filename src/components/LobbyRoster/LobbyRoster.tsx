import { sortLobbyPlayers } from "@/lib/lobby/sortLobbyPlayers";
import { LOBBY_MAX_PLAYERS } from "@/lib/lobby/lobbyConstants";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import "./LobbyRoster.css";

type LobbyRosterProps = {
  players: LobbyPlayer[];
  isLoading?: boolean;
  error?: string | null;
  className?: string;
  variant?: "lobby" | "game";
};

export default function LobbyRoster({
  players,
  isLoading = false,
  error = null,
  className,
  variant = "lobby",
}: LobbyRosterProps) {
  const sortedPlayers = sortLobbyPlayers(players);
  const playerCount = sortedPlayers.length;
  const showRosterList = playerCount > 0 && !isLoading;
  const isGameVariant = variant === "game";

  const rosterClasses = [
    "lobby-roster",
    playerCount <= 1 ? "lobby-roster--solo" : "lobby-roster--multi",
    isGameVariant && "lobby-roster--game",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <aside className={rosterClasses}>
      {isGameVariant ? (
        <div className="lobby-roster__header lobby-roster__header--game text-body">
          <span>players</span>
          <span>score</span>
        </div>
      ) : (
        <div className="lobby-roster__header text-body">
          <span>players joined</span>
          <span>
            {playerCount}/{LOBBY_MAX_PLAYERS}
          </span>
        </div>
      )}

      {error ? (
        <p className="lobby-roster__error text-body" role="alert">
          {error}
        </p>
      ) : null}

      {showRosterList ? (
        <ul className="lobby-roster__list">
          {sortedPlayers.map((player) => (
            <li
              key={player.player_id}
              className="lobby-roster__player text-button-label"
            >
              <span className="lobby-roster__name">
                {player.display_name.toLowerCase()}
              </span>
              {isGameVariant ? (
                <span className="lobby-roster__score">
                  {player.score ?? 0}
                </span>
              ) : (
                <span className="lobby-roster__role">
                  {player.is_host ? "host" : "player"}
                </span>
              )}
            </li>
          ))}
        </ul>
      ) : null}
    </aside>
  );
}
