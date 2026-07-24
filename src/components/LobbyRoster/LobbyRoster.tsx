"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { sortLobbyPlayers } from "@/lib/lobby/sortLobbyPlayers";
import { LOBBY_MAX_PLAYERS } from "@/lib/lobby/lobbyConstants";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import "./LobbyRoster.css";

const LEADER_CELEBRATE_MS = 1500;

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
  const isGameVariant = variant === "game";
  const sortedPlayers = sortLobbyPlayers(players, { sortByScore: isGameVariant });
  const playerCount = sortedPlayers.length;
  const showRosterList = playerCount > 0 && !isLoading;
  const prefersReducedMotion = useReducedMotion();
  const scoreBoardSignature = sortedPlayers
    .map((player) => `${player.player_id}:${player.score ?? 0}`)
    .join("|");

  const [celebratingPlayerId, setCelebratingPlayerId] = useState<string | null>(
    null,
  );
  const previousLeaderIdRef = useRef<string | null>(null);
  const previousLeaderScoreRef = useRef<number | null>(null);
  const hasMountedLeaderRef = useRef(false);
  const celebrateTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isGameVariant || sortedPlayers.length === 0) {
      return;
    }

    const leader = sortedPlayers[0];
    const leaderScore = leader.score ?? 0;
    const secondScore = sortedPlayers[1]?.score ?? -1;
    const isSoleFirst = leaderScore > secondScore;

    if (!hasMountedLeaderRef.current) {
      hasMountedLeaderRef.current = true;
      previousLeaderIdRef.current = leader.player_id;
      previousLeaderScoreRef.current = leaderScore;
      return;
    }

    const previousLeaderId = previousLeaderIdRef.current;
    const previousLeaderScore = previousLeaderScoreRef.current ?? 0;
    const tookLead =
      isSoleFirst &&
      previousLeaderId !== null &&
      leader.player_id !== previousLeaderId &&
      leaderScore > previousLeaderScore;

    previousLeaderIdRef.current = leader.player_id;
    previousLeaderScoreRef.current = leaderScore;

    if (!tookLead) {
      return;
    }

    setCelebratingPlayerId(leader.player_id);

    if (celebrateTimeoutRef.current !== null) {
      window.clearTimeout(celebrateTimeoutRef.current);
    }

    celebrateTimeoutRef.current = window.setTimeout(() => {
      setCelebratingPlayerId(null);
      celebrateTimeoutRef.current = null;
    }, LEADER_CELEBRATE_MS);
    // sortedPlayers is derived; scoreBoardSignature captures rank/score changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional signature dep
  }, [isGameVariant, scoreBoardSignature]);

  useEffect(() => {
    return () => {
      if (celebrateTimeoutRef.current !== null) {
        window.clearTimeout(celebrateTimeoutRef.current);
      }
    };
  }, []);

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
        <>
          <div className="lobby-roster__score-header">
            <p className="lobby-roster__title text-button-label">Score Card</p>
          </div>
          <div className="lobby-roster__game-table">
            <div className="lobby-roster__header lobby-roster__header--game text-body">
              <span>players</span>
              <span>score</span>
            </div>

            {error ? (
              <p className="lobby-roster__error text-body" role="alert">
                {error}
              </p>
            ) : null}

            {showRosterList ? (
              <ul className="lobby-roster__list">
                {sortedPlayers.map((player) => {
                  const isCelebrating = player.player_id === celebratingPlayerId;
                  const playerClasses = [
                    "lobby-roster__player",
                    "text-button-label",
                    isCelebrating && "lobby-roster__player--celebrate",
                    isCelebrating &&
                      prefersReducedMotion &&
                      "lobby-roster__player--celebrate-reduced",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <motion.li
                      key={player.player_id}
                      className={playerClasses}
                      layout={!prefersReducedMotion}
                      transition={
                        prefersReducedMotion
                          ? { duration: 0 }
                          : { type: "spring", stiffness: 420, damping: 36 }
                      }
                    >
                      <span className="lobby-roster__name">
                        {player.display_name.toLowerCase()}
                      </span>
                      <span
                        key={`${player.player_id}-${player.score ?? 0}`}
                        className="lobby-roster__score lobby-roster__score--updated"
                      >
                        {player.score ?? 0}
                      </span>
                    </motion.li>
                  );
                })}
              </ul>
            ) : null}
          </div>
        </>
      ) : (
        <>
          <div className="lobby-roster__header text-body">
            <span>players</span>
            <span>
              {playerCount}/{LOBBY_MAX_PLAYERS}
            </span>
          </div>

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
                  <span className="lobby-roster__role">
                    {player.is_host ? "host" : "player"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </aside>
  );
}
