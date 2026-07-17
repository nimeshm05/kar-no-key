"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/Button/Button";
import IconButton from "@/components/IconButton/IconButton";
import LobbyRoster from "@/components/LobbyRoster/LobbyRoster";
import Navbar from "@/components/Navbar/Navbar";
import YouTubePlayer from "@/components/YouTubePlayer/YouTubePlayer";
import PhraseTypingArea from "@/components/PhraseTypingArea/PhraseTypingArea";
import { useCountdownTick } from "@/lib/game/useCountdownTick";
import { usePlaybackSync } from "@/lib/game/usePlaybackSync";
import type { LobbyPlayer, LobbySong } from "@/lib/supabase/functions";
import "./GameScreen.css";

type PlayerHandle = {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
};

type GameScreenProps = {
  displayName: string;
  isHost: boolean;
  lobbyStatus: string;
  players: LobbyPlayer[];
  song: LobbySong;
  countdownStartAt: string | null;
  playbackStartAt: string | null;
  playbackElapsedMs: number;
  serverNow: string;
  isRosterLoading: boolean;
  rosterError: string | null;
  controlError: string | null;
  isControlPending: boolean;
  onPlay: () => void;
  onPause: () => void;
  onEndSong: () => void;
  onExitLobby: () => void;
};

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function GameScreen({
  displayName,
  isHost,
  lobbyStatus,
  players,
  song,
  countdownStartAt,
  playbackStartAt,
  playbackElapsedMs,
  serverNow,
  isRosterLoading,
  rosterError,
  controlError,
  isControlPending,
  onPlay,
  onPause,
  onEndSong,
  onExitLobby,
}: GameScreenProps) {
  const [typedText, setTypedText] = useState("");
  const [lockedPhraseIndex, setLockedPhraseIndex] = useState(-1);
  const playerHandleRef = useRef<PlayerHandle | null>(null);
  const lastPlaybackStateRef = useRef<string | null>(null);

  const isPlaying = lobbyStatus === "playing";
  const isCountdown = lobbyStatus === "countdown";
  const isReady = lobbyStatus === "ready";

  const phrases = useMemo(
    () => song.lyrics_phrases ?? [],
    [song.lyrics_phrases],
  );

  const handleSeek = useMemo(
    () => (elapsedSec: number) => {
      if (isPlaying && playerHandleRef.current) {
        playerHandleRef.current.seekTo(elapsedSec);
      }
    },
    [isPlaying],
  );

  const { elapsedMs, activePhraseIndex, activePhrase } = usePlaybackSync({
    phrases,
    playbackStartAt: isPlaying ? playbackStartAt : null,
    playbackElapsedMs,
    serverNow,
    enabled: isPlaying,
    onSeek: handleSeek,
  });

  const countdownValue = useCountdownTick({
    countdownStartAt,
    playbackStartAt,
    serverNow,
    enabled: isCountdown,
  });

  useEffect(() => {
    setTypedText("");
  }, [activePhraseIndex]);

  useEffect(() => {
    if (
      activePhraseIndex >= 0 &&
      activePhraseIndex !== lockedPhraseIndex &&
      activePhraseIndex > lockedPhraseIndex
    ) {
      const previousPhrase = phrases[activePhraseIndex - 1];
      if (previousPhrase && activePhraseIndex - 1 > lockedPhraseIndex) {
        setLockedPhraseIndex(activePhraseIndex - 1);
      }
    }
  }, [activePhraseIndex, lockedPhraseIndex, phrases]);

  useEffect(() => {
    const handle = playerHandleRef.current;
    if (!handle) {
      return;
    }

    if (lobbyStatus === lastPlaybackStateRef.current) {
      return;
    }

    lastPlaybackStateRef.current = lobbyStatus;

    if (isPlaying && playbackStartAt) {
      const playbackStartMs = new Date(playbackStartAt).getTime();
      const serverTime = new Date(serverNow).getTime();
      const offset = serverTime - Date.now();
      const segmentElapsed = Math.max(0, (Date.now() + offset - playbackStartMs) / 1000);
      const elapsedSec = (playbackElapsedMs + segmentElapsed * 1000) / 1000;
      handle.seekTo(elapsedSec);
      handle.play();
      return;
    }

    if (isReady) {
      handle.pause();
    }
  }, [isPlaying, isReady, lobbyStatus, playbackElapsedMs, playbackStartAt, serverNow]);

  function handlePlayerReady(handle: PlayerHandle) {
    playerHandleRef.current = handle;

    if (isPlaying && playbackStartAt) {
      const playbackStartMs = new Date(playbackStartAt).getTime();
      const serverTime = new Date(serverNow).getTime();
      const offset = serverTime - Date.now();
      const segmentElapsed = Math.max(0, (Date.now() + offset - playbackStartMs) / 1000);
      const elapsedSec = (playbackElapsedMs + segmentElapsed * 1000) / 1000;
      handle.seekTo(elapsedSec);
      handle.play();
    }
  }

  function handleTransportClick() {
    if (isControlPending || isCountdown) {
      return;
    }

    if (isPlaying) {
      onPause();
      return;
    }

    onPlay();
  }

  const isPhraseLocked =
    activePhraseIndex >= 0 && activePhraseIndex <= lockedPhraseIndex;

  const elapsedSeconds = elapsedMs / 1000;
  const durationSeconds = song.duration_sec ?? 0;
  const showCountdown = isCountdown && countdownValue !== null && countdownValue > 0;

  return (
    <main className="game-screen">
      <Navbar displayName={displayName} onExitLobby={onExitLobby} />

      <YouTubePlayer
        videoId={song.youtube_video_id}
        onReady={handlePlayerReady}
      />

      <div className="game-screen__body">
        <div className="game-screen__container">
          <section className="game-screen__main">
            <div className="game-screen__control-bar">
              <div className="game-screen__song-card">
                {song.thumbnail_url ? (
                  <img
                    className="game-screen__thumbnail"
                    src={song.thumbnail_url}
                    alt=""
                  />
                ) : (
                  <div className="game-screen__thumbnail-placeholder" aria-hidden="true" />
                )}
                <p className="game-screen__song-title text-heading-3">{song.title}</p>
              </div>

              <div className="game-screen__controls">
                <p className="game-screen__timer text-button-label">
                  {formatTime(elapsedSeconds)} / {formatTime(durationSeconds)}
                </p>

                {isHost ? (
                  <div className="game-screen__host-controls">
                    <IconButton
                      variant="secondary"
                      type="button"
                      iconSrc={isPlaying ? "/icons/pause.svg" : "/icons/play_arrow.svg"}
                      iconAlt={isPlaying ? "pause" : "play"}
                      onClick={handleTransportClick}
                      disabled={isControlPending || isCountdown}
                    />
                    <Button
                      variant="primary"
                      type="button"
                      className="game-screen__end-song-button"
                      onClick={onEndSong}
                      disabled={isControlPending}
                    >
                      end song
                    </Button>
                  </div>
                ) : null}
              </div>
            </div>

            {controlError ? (
              <p className="game-screen__control-error text-body" role="alert">
                {controlError}
              </p>
            ) : null}

            <div className="game-screen__panel">
              {showCountdown ? (
                <p className="game-screen__countdown text-heading-1" aria-live="polite">
                  {countdownValue}
                </p>
              ) : isPlaying && activePhrase ? (
                <PhraseTypingArea
                  phraseText={activePhrase.text}
                  typedText={typedText}
                  onTypedTextChange={setTypedText}
                  isLocked={isPhraseLocked}
                />
              ) : (
                <p className="game-screen__ready-message text-heading-2">
                  get ready...
                </p>
              )}
            </div>
          </section>

          <LobbyRoster
            className="game-screen__roster"
            variant="game"
            players={players}
            isLoading={isRosterLoading}
            error={rosterError}
          />
        </div>
      </div>
    </main>
  );
}
