"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import Button from "@/components/Button/Button";
import IconButton from "@/components/IconButton/IconButton";
import LobbyRoster from "@/components/LobbyRoster/LobbyRoster";
import Navbar from "@/components/Navbar/Navbar";
import YouTubePlayer from "@/components/YouTubePlayer/YouTubePlayer";
import PhraseTypingArea from "@/components/PhraseTypingArea/PhraseTypingArea";
import { useCountdownTick } from "@/lib/game/useCountdownTick";
import { usePhraseScoring } from "@/lib/game/usePhraseScoring";
import { usePlaybackSync } from "@/lib/game/usePlaybackSync";
import type { LobbyPlayer, LobbySong } from "@/lib/supabase/functions";
import "./GameScreen.css";

type PlayerHandle = {
  seekTo: (seconds: number) => void;
  play: () => void;
  pause: () => void;
  getCurrentTime: () => number;
};

type GameScreenProps = {
  playerId: string | null;
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
  onScoreUpdate: (
    playerId: string,
    score: number,
    phrasesCompleted: number,
  ) => void;
  onPlay: () => void;
  onPause: () => void;
  onEndSong: () => void;
  onExitLobby: () => void;
};

const SONG_TITLE_MARQUEE_GAP_PX = 40;
const SONG_TITLE_MARQUEE_SPEED_PX_PER_SEC = 40;
const SONG_TITLE_MARQUEE_MIN_DURATION_SEC = 6;
const DRIFT_THRESHOLD_MS = 800;
const DRIFT_CHECK_INTERVAL_MS = 1000;

function computeServerElapsedSec(
  playbackStartAt: string,
  playbackElapsedMs: number,
  serverNow: string,
): number {
  const playbackStartMs = new Date(playbackStartAt).getTime();
  const serverTime = new Date(serverNow).getTime();
  const offset = serverTime - Date.now();
  const segmentElapsed = Math.max(0, Date.now() + offset - playbackStartMs);
  return (playbackElapsedMs + segmentElapsed) / 1000;
}

function formatTime(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safeSeconds / 60);
  const seconds = safeSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export default function GameScreen({
  playerId,
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
  onScoreUpdate,
  onPlay,
  onPause,
  onEndSong,
  onExitLobby,
}: GameScreenProps) {
  const [typedText, setTypedText] = useState("");
  const [lockedPhraseIndex, setLockedPhraseIndex] = useState(-1);
  const prevActivePhraseIndexRef = useRef(-1);
  const [isMarqueeActive, setIsMarqueeActive] = useState(false);
  const [marqueeDistance, setMarqueeDistance] = useState(0);
  const [marqueeDuration, setMarqueeDuration] = useState(0);
  const playerHandleRef = useRef<PlayerHandle | null>(null);
  const lastPlaybackStateRef = useRef<string | null>(null);
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const titleTrackRef = useRef<HTMLDivElement>(null);
  const titleTextRef = useRef<HTMLSpanElement>(null);

  const isPlaying = lobbyStatus === "playing";
  const isCountdown = lobbyStatus === "countdown";
  const isReady = lobbyStatus === "ready";

  const phrases = useMemo(
    () => song.lyrics_phrases ?? [],
    [song.lyrics_phrases],
  );

  const { elapsedMs, activePhraseIndex, activePhrase, getServerElapsedSec } =
    usePlaybackSync({
      phrases,
      playbackStartAt: isPlaying ? playbackStartAt : null,
      playbackElapsedMs,
      serverNow,
      enabled: isPlaying,
    });

  const countdownValue = useCountdownTick({
    countdownStartAt,
    playbackStartAt,
    serverNow,
    enabled: isCountdown,
  });

  usePhraseScoring({
    playerId,
    isPlaying,
    activePhraseIndex,
    typedText,
    onScoreUpdate,
  });

  useEffect(() => {
    const container = titleContainerRef.current;
    const track = titleTrackRef.current;
    const text = titleTextRef.current;

    if (!container || !track || !text) {
      return;
    }

    function measureTitleOverflow() {
      const textElement = titleTextRef.current;
      const containerElement = titleContainerRef.current;

      if (!textElement || !containerElement) {
        return;
      }

      const containerStyles = getComputedStyle(containerElement);
      const availableWidth =
        containerElement.clientWidth -
        parseFloat(containerStyles.paddingLeft) -
        parseFloat(containerStyles.paddingRight);
      const textWidth = textElement.scrollWidth;
      const isOverflowing = textWidth > availableWidth;

      if (!isOverflowing) {
        setIsMarqueeActive(false);
        return;
      }

      const distance = textWidth + SONG_TITLE_MARQUEE_GAP_PX;
      const duration = Math.max(
        SONG_TITLE_MARQUEE_MIN_DURATION_SEC,
        distance / SONG_TITLE_MARQUEE_SPEED_PX_PER_SEC,
      );

      setMarqueeDistance(distance);
      setMarqueeDuration(duration);
      setIsMarqueeActive(true);
    }

    const runMeasure = () => {
      window.requestAnimationFrame(measureTitleOverflow);
    };

    runMeasure();

    const resizeObserver = new ResizeObserver(runMeasure);
    resizeObserver.observe(container);
    resizeObserver.observe(track);

    return () => {
      resizeObserver.disconnect();
    };
  }, [song.title]);

  useEffect(() => {
    const previousPhraseIndex = prevActivePhraseIndexRef.current;

    if (
      previousPhraseIndex >= 0 &&
      activePhraseIndex > previousPhraseIndex
    ) {
      setLockedPhraseIndex(previousPhraseIndex);
      setTypedText("");
    }

    prevActivePhraseIndexRef.current = activePhraseIndex;
  }, [activePhraseIndex]);

  useEffect(() => {
    if (!isPlaying || !playbackStartAt) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const handle = playerHandleRef.current;
      if (!handle) {
        return;
      }

      const serverElapsedSec = getServerElapsedSec();
      const youtubeElapsedSec = handle.getCurrentTime();
      const driftMs = Math.abs(serverElapsedSec - youtubeElapsedSec) * 1000;

      if (driftMs > DRIFT_THRESHOLD_MS) {
        handle.seekTo(serverElapsedSec);
      }
    }, DRIFT_CHECK_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [getServerElapsedSec, isPlaying, playbackStartAt]);

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
      const elapsedSec = computeServerElapsedSec(
        playbackStartAt,
        playbackElapsedMs,
        serverNow,
      );
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
      const elapsedSec = computeServerElapsedSec(
        playbackStartAt,
        playbackElapsedMs,
        serverNow,
      );
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

  const marqueeStyle: CSSProperties | undefined = isMarqueeActive
    ? ({
        "--marquee-distance": `${marqueeDistance}px`,
        "--marquee-duration": `${marqueeDuration}s`,
      } as CSSProperties)
    : undefined;

  return (
    <main className="game-screen">
      <Navbar
        displayName={displayName}
        players={players}
        isRosterLoading={isRosterLoading}
        rosterError={rosterError}
        onExitLobby={onExitLobby}
      />

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
                <div className="game-screen__song-info">
                  <div
                    ref={titleContainerRef}
                    className="game-screen__song-title"
                    title={song.title}
                  >
                    <div
                      ref={titleTrackRef}
                      className={[
                        "game-screen__song-title-track",
                        isMarqueeActive ? "game-screen__song-title-track--marquee" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={marqueeStyle}
                    >
                      <span
                        ref={titleTextRef}
                        className="game-screen__song-title-text text-heading-3"
                      >
                        {song.title}
                      </span>
                      {isMarqueeActive ? (
                        <>
                          <span
                            className="game-screen__song-title-gap"
                            aria-hidden="true"
                          />
                          <span
                            className="game-screen__song-title-text text-heading-3"
                            aria-hidden="true"
                          >
                            {song.title}
                          </span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <p className="game-screen__timer text-button-label">
                    {formatTime(elapsedSeconds)} / {formatTime(durationSeconds)}
                  </p>
                </div>
              </div>

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

            {controlError ? (
              <p className="game-screen__control-error text-body" role="alert">
                {controlError}
              </p>
            ) : null}

            <div className="game-screen__content">
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
                  <p className="game-screen__ready-message text-body">
                    {isHost
                      ? "click play to start the race"
                      : "get ready..."}
                  </p>
                )}
              </div>

              <LobbyRoster
                className="game-screen__roster"
                variant="game"
                players={players}
                isLoading={isRosterLoading}
                error={rosterError}
              />
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
