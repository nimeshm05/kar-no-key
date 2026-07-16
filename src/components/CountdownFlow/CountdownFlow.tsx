"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import CountdownScreen from "@/components/CountdownScreen/CountdownScreen";
import { getRouteForLobbyStatus, getErrorMessage } from "@/lib/lobby/lobbyRoute";
import {
  useLobbyStatePolling,
  type LobbyStateUpdate,
} from "@/lib/lobby/useLobbyStatePolling";
import { getPlayerId } from "@/lib/player/identity";
import { loadLobbySession, clearLobbySession } from "@/lib/player/session";
import {
  getLobbyState,
  leaveLobby,
  startCountdown,
  type LobbyPlayer,
  type LobbySong,
} from "@/lib/supabase/functions";

export default function CountdownFlow() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [song, setSong] = useState<LobbySong | null>(null);
  const [countdownStartAt, setCountdownStartAt] = useState<string | null>(null);
  const [playbackStartAt, setPlaybackStartAt] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState<string>(new Date().toISOString());
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [audioUnlocked, setAudioUnlocked] = useState(false);

  const handleRouteFromStatus = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      const route = getRouteForLobbyStatus(status, songSelectionStarted);

      if (route === "/search") {
        router.replace("/search");
        return true;
      }

      if (route === "/game") {
        router.replace("/game");
        return true;
      }

      if (!songSelectionStarted && status === "waiting") {
        router.replace("/");
        return true;
      }

      return false;
    },
    [router],
  );

  const applyLobbyState = useCallback(
    (data: LobbyStateUpdate) => {
      setPlayers(data.players);
      setSong(data.song);
      setCountdownStartAt(data.countdown_start_at);
      setPlaybackStartAt(data.playback_start_at);
      setServerNow(data.server_now);
      setRosterError(null);

      if (
        data.status === "playing" ||
        (data.playback_start_at &&
          new Date(data.server_now).getTime() >=
            new Date(data.playback_start_at).getTime())
      ) {
        router.replace("/game");
        return;
      }

      handleRouteFromStatus(data.status, data.song_selection_started);
    },
    [handleRouteFromStatus, router],
  );

  const fetchLobbyState = useCallback(
    async (activePlayerId: string) => {
      setIsRosterLoading(true);
      setRosterError(null);

      try {
        const { data, error: invokeError } = await getLobbyState(activePlayerId);

        if (invokeError || !data || "error" in data) {
          setRosterError(getErrorMessage(invokeError, data));
          return false;
        }

        if (data.status === "waiting" && data.song_selection_started) {
          router.replace("/search");
          return false;
        }

        if (data.status !== "ready" && data.status !== "countdown") {
          const route = getRouteForLobbyStatus(
            data.status,
            data.song_selection_started,
          );
          if (route) {
            router.replace(route);
            return false;
          }
        }

        applyLobbyState(data);
        return true;
      } catch (caughtError) {
        setRosterError(getErrorMessage(caughtError, null));
        return false;
      } finally {
        setIsRosterLoading(false);
      }
    },
    [applyLobbyState, router],
  );

  const handleStateUpdate = useCallback(
    (data: LobbyStateUpdate) => {
      applyLobbyState(data);
    },
    [applyLobbyState],
  );

  const handleStatePollError = useCallback((message: string) => {
    setRosterError(message);
  }, []);

  useLobbyStatePolling({
    playerId,
    enabled: isReady,
    onUpdate: handleStateUpdate,
    onError: handleStatePollError,
  });

  useEffect(() => {
    const id = getPlayerId();
    const session = loadLobbySession();

    if (!session) {
      router.replace("/");
      return;
    }

    setPlayerId(id);
    setDisplayName(session.displayName);
    setIsHost(session.isHost);

    void fetchLobbyState(id).then((success) => {
      if (success) {
        setIsReady(true);
      }
    });
  }, [fetchLobbyState, router]);

  async function handleExitLobby() {
    if (playerId) {
      try {
        const { data, error: invokeError } = await leaveLobby(playerId);

        if (invokeError || !data || "error" in data) {
          setRosterError(getErrorMessage(invokeError, data));
          return;
        }
      } catch (caughtError) {
        setRosterError(getErrorMessage(caughtError, null));
        return;
      }
    }

    clearLobbySession();
    router.replace("/");
  }

  async function handleStartCountdown() {
    if (!playerId || !isHost) {
      return;
    }

    setIsStarting(true);
    setStartError(null);

    try {
      const { data, error: invokeError } = await startCountdown(playerId);

      if (invokeError || !data || "error" in data) {
        setStartError(getErrorMessage(invokeError, data));
        return;
      }

      setCountdownStartAt(data.countdown_start_at);
      setPlaybackStartAt(data.playback_start_at);
      setServerNow(data.server_now);
    } catch (caughtError) {
      setStartError(getErrorMessage(caughtError, null));
    } finally {
      setIsStarting(false);
    }
  }

  if (!isReady) {
    return null;
  }

  return (
    <CountdownScreen
      displayName={displayName}
      isHost={isHost}
      players={players}
      song={song}
      countdownStartAt={countdownStartAt}
      playbackStartAt={playbackStartAt}
      serverNow={serverNow}
      isRosterLoading={isRosterLoading}
      rosterError={rosterError}
      isStarting={isStarting}
      startError={startError}
      audioUnlocked={audioUnlocked}
      onAudioUnlock={() => setAudioUnlocked(true)}
      onStartCountdown={() => void handleStartCountdown()}
      onExitLobby={handleExitLobby}
    />
  );
}
