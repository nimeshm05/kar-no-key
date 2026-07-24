"use client";

import AwardSection from "@/components/AwardSection/AwardSection";
import Navbar from "@/components/Navbar/Navbar";
import type { AwardsSnapshot, LobbyPlayer } from "@/lib/supabase/functions";
import "./AwardsScreen.css";

type AwardsScreenProps = {
  displayName: string;
  players: LobbyPlayer[];
  awards: AwardsSnapshot | null;
  isHost: boolean;
  isRosterLoading?: boolean;
  rosterError?: string | null;
  restartError?: string | null;
  isRestartPending?: boolean;
  onExitLobby: () => void;
  onRestartGame: () => void;
};

function formatPoints(metric: number): string {
  return Math.round(metric).toLocaleString("en-US");
}

function formatPhrases(metric: number): string {
  return String(Math.round(metric));
}

function formatWpm(metric: number): string {
  return Number.isInteger(metric) ? String(metric) : metric.toFixed(1);
}

export default function AwardsScreen({
  displayName,
  players,
  awards,
  isHost,
  isRosterLoading = false,
  rosterError = null,
  restartError = null,
  isRestartPending = false,
  onExitLobby,
  onRestartGame,
}: AwardsScreenProps) {
  return (
    <div className="awards-screen">
      <Navbar
        displayName={displayName}
        players={players}
        isRosterLoading={isRosterLoading}
        rosterError={rosterError}
        onExitLobby={onExitLobby}
        primaryAction={
          isHost
            ? {
                label: "restart game",
                onClick: onRestartGame,
                disabled: isRestartPending,
              }
            : null
        }
      />

      <main className="awards-screen__body">
        <div className="awards-screen__container">
          <div className="awards-screen__panel">
            <header className="awards-screen__heading">
              <h1 className="awards-screen__title text-heading-3">
                Race Leaderboard
              </h1>
              <img
                className="awards-screen__trophy"
                src="/icons/trophies.svg"
                alt=""
                width={24}
                height={24}
              />
            </header>

            {restartError ? (
              <p className="awards-screen__error text-body" role="alert">
                {restartError}
              </p>
            ) : null}

            {!awards ? (
              <p className="awards-screen__loading text-body">
                loading awards...
              </p>
            ) : (
              <div className="awards-screen__sections">
                <AwardSection
                  title="Champions"
                  description="Overall points earned by each player"
                  entries={awards.champions}
                  formatMetric={formatPoints}
                />
                <AwardSection
                  title="Sharpshooters"
                  description="Players who completed most phrases correctly"
                  entries={awards.sharpshooters}
                  formatMetric={formatPhrases}
                />
                <AwardSection
                  title="Speed Demons"
                  description="The fastest typers"
                  entries={awards.speed_demons}
                  formatMetric={formatWpm}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
