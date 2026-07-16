"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Button from "@/components/Button/Button";
import LobbyRoster from "@/components/LobbyRoster/LobbyRoster";
import MusicNoteDecorations from "@/components/MusicNoteDecorations/MusicNoteDecorations";
import Navbar from "@/components/Navbar/Navbar";
import YouTubePlayer from "@/components/YouTubePlayer/YouTubePlayer";
import PhraseTypingArea from "@/components/PhraseTypingArea/PhraseTypingArea";
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
  players: LobbyPlayer[];
  song: LobbySong;
  playbackStartAt: string;
  serverNow: string;
  isRosterLoading: boolean;
  rosterError: string | null;
  onExitLobby: () => void;
};

export default function GameScreen({
  displayName,
  players,
  song,
  playbackStartAt,
  serverNow,
  isRosterLoading,
  rosterError,
  onExitLobby,
}: GameScreenProps) {
  const [audioUnlocked, setAudioUnlocked] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [lockedPhraseIndex, setLockedPhraseIndex] = useState(-1);
  const playerHandleRef = useRef<PlayerHandle | null>(null);

  const phrases = useMemo(
    () => song.lyrics_phrases ?? [],
    [song.lyrics_phrases],
  );

  const handleSeek = useMemo(
    () => (elapsedSec: number) => {
      if (audioUnlocked && playerHandleRef.current) {
        playerHandleRef.current.seekTo(elapsedSec);
      }
    },
    [audioUnlocked],
  );

  const { activePhraseIndex, activePhrase } = usePlaybackSync({
    phrases,
    playbackStartAt,
    serverNow,
    enabled: audioUnlocked,
    onSeek: handleSeek,
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

  function handleAudioUnlock() {
    setAudioUnlocked(true);
    if (playerHandleRef.current) {
      const playbackStartMs = new Date(playbackStartAt).getTime();
      const serverTime = new Date(serverNow).getTime();
      const offset = serverTime - Date.now();
      const elapsedSec = Math.max(0, (Date.now() + offset - playbackStartMs) / 1000);
      playerHandleRef.current.seekTo(elapsedSec);
      playerHandleRef.current.play();
    }
  }

  function handlePlayerReady(handle: PlayerHandle) {
    playerHandleRef.current = handle;
    if (audioUnlocked) {
      const playbackStartMs = new Date(playbackStartAt).getTime();
      const serverTime = new Date(serverNow).getTime();
      const offset = serverTime - Date.now();
      const elapsedSec = Math.max(0, (Date.now() + offset - playbackStartMs) / 1000);
      handle.seekTo(elapsedSec);
      handle.play();
    }
  }

  const isPhraseLocked =
    activePhraseIndex >= 0 && activePhraseIndex <= lockedPhraseIndex;

  return (
    <main className="game-screen">
      <Navbar displayName={displayName} onExitLobby={onExitLobby} />

      <YouTubePlayer
        videoId={song.youtube_video_id}
        onReady={handlePlayerReady}
      />

      <div className="game-screen__body">
        <div className="game-screen__anchor">
          <section className="game-screen__main">
            <div className="game-screen__song-info">
              <p className="game-screen__song-title text-heading-3">{song.title}</p>
              {song.channel ? (
                <p className="game-screen__song-channel text-body">{song.channel}</p>
              ) : null}
            </div>

            {!audioUnlocked ? (
              <div className="game-screen__unlock">
                <MusicNoteDecorations variant="search" />
                <p className="game-screen__unlock-message text-body">
                  TAP TO ENABLE AUDIO AND START TYPING
                </p>
                <Button
                  variant="primary"
                  type="button"
                  className="game-screen__unlock-button"
                  onClick={handleAudioUnlock}
                >
                  ready
                </Button>
              </div>
            ) : activePhrase ? (
              <PhraseTypingArea
                phraseText={activePhrase.text}
                typedText={typedText}
                onTypedTextChange={setTypedText}
                isLocked={isPhraseLocked}
              />
            ) : (
              <p className="game-screen__waiting text-body">
                get ready...
              </p>
            )}
          </section>

          <LobbyRoster
            className="game-screen__roster"
            players={players}
            isLoading={isRosterLoading}
            error={rosterError}
          />
        </div>
      </div>
    </main>
  );
}
