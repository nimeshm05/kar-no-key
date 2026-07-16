"use client";

import { useEffect, useMemo, useState } from "react";
import Button from "@/components/Button/Button";
import LobbyRoster from "@/components/LobbyRoster/LobbyRoster";
import MusicNoteDecorations from "@/components/MusicNoteDecorations/MusicNoteDecorations";
import Navbar from "@/components/Navbar/Navbar";
import type { LobbyPlayer, LobbySong } from "@/lib/supabase/functions";
import "./CountdownScreen.css";

const COUNTDOWN_SECONDS = 3;

type CountdownScreenProps = {
  displayName: string;
  isHost: boolean;
  players: LobbyPlayer[];
  song: LobbySong | null;
  countdownStartAt: string | null;
  playbackStartAt: string | null;
  serverNow: string;
  isRosterLoading: boolean;
  rosterError: string | null;
  isStarting: boolean;
  startError: string | null;
  audioUnlocked: boolean;
  onAudioUnlock: () => void;
  onStartCountdown: () => void;
  onExitLobby: () => void;
};

function getServerOffsetMs(serverNow: string): number {
  return new Date(serverNow).getTime() - Date.now();
}

export default function CountdownScreen({
  displayName,
  isHost,
  players,
  song,
  countdownStartAt,
  playbackStartAt,
  serverNow,
  isRosterLoading,
  rosterError,
  isStarting,
  startError,
  audioUnlocked,
  onAudioUnlock,
  onStartCountdown,
  onExitLobby,
}: CountdownScreenProps) {
  const [countdownValue, setCountdownValue] = useState<number | null>(null);

  const serverOffsetMs = useMemo(
    () => getServerOffsetMs(serverNow),
    [serverNow],
  );

  useEffect(() => {
    if (!countdownStartAt || !playbackStartAt) {
      setCountdownValue(null);
      return;
    }

    const countdownStartMs = new Date(countdownStartAt).getTime();
    const playbackStartMs = new Date(playbackStartAt).getTime();

    function tick() {
      const now = Date.now() + serverOffsetMs;
      const remainingMs = playbackStartMs - now;

      if (remainingMs <= 0) {
        setCountdownValue(0);
        return;
      }

      const elapsedSinceCountdown = now - countdownStartMs;
      const secondsLeft = Math.ceil(
        (COUNTDOWN_SECONDS * 1000 - elapsedSinceCountdown) / 1000,
      );
      setCountdownValue(Math.max(1, Math.min(COUNTDOWN_SECONDS, secondsLeft)));
    }

    tick();
    const intervalId = window.setInterval(tick, 100);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [countdownStartAt, playbackStartAt, serverOffsetMs]);

  const showCountdown = countdownValue !== null && countdownValue > 0;
  const waitingForHost = !countdownStartAt && !isHost;

  return (
    <main className="countdown-screen">
      <Navbar displayName={displayName} onExitLobby={onExitLobby} />

      <div className="countdown-screen__body">
        <div className="countdown-screen__anchor">
          <section className="countdown-screen__main">
            {song ? (
              <div className="countdown-screen__song">
                {song.thumbnail_url ? (
                  <img
                    className="countdown-screen__thumbnail"
                    src={song.thumbnail_url}
                    alt=""
                  />
                ) : null}
                <p className="countdown-screen__song-title text-heading-3">
                  {song.title}
                </p>
              </div>
            ) : null}

            {!audioUnlocked ? (
              <div className="countdown-screen__unlock">
                <MusicNoteDecorations variant="search" />
                <p className="countdown-screen__unlock-message text-body">
                  TAP TO ENABLE AUDIO
                </p>
                <Button
                  variant="primary"
                  type="button"
                  className="countdown-screen__unlock-button"
                  onClick={onAudioUnlock}
                >
                  ready
                </Button>
              </div>
            ) : showCountdown ? (
              <p className="countdown-screen__number text-heading-1" aria-live="polite">
                {countdownValue}
              </p>
            ) : waitingForHost ? (
              <p className="countdown-screen__message text-body">
                WAITING FOR THE HOST TO START
              </p>
            ) : isHost && !countdownStartAt ? (
              <div className="countdown-screen__start">
                <Button
                  variant="primary"
                  type="button"
                  className="countdown-screen__start-button"
                  onClick={onStartCountdown}
                  disabled={isStarting}
                >
                  {isStarting ? "starting..." : "start countdown"}
                </Button>
                {startError ? (
                  <p className="countdown-screen__error text-body" role="alert">
                    {startError}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="countdown-screen__message text-body">
                GET READY...
              </p>
            )}
          </section>

          <LobbyRoster
            className="countdown-screen__roster"
            players={players}
            isLoading={isRosterLoading}
            error={rosterError}
          />
        </div>
      </div>
    </main>
  );
}
