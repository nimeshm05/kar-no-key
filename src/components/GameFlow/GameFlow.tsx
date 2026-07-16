"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import GameScreen from "@/components/GameScreen/GameScreen";
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
  type LobbyPlayer,
  type LobbySong,
} from "@/lib/supabase/functions";

export default function GameFlow() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [song, setSong] = useState<LobbySong | null>(null);
  const [playbackStartAt, setPlaybackStartAt] = useState<string | null>(null);
  const [serverNow, setServerNow] = useState<string>(new Date().toISOString());
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleRouteFromStatus = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      const route = getRouteForLobbyStatus(status, songSelectionStarted);

      if (route === "/search") {
        router.replace("/search");
        return true;
      }

      if (route === "/countdown") {
        router.replace("/countdown");
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
      setPlaybackStartAt(data.playback_start_at);
      setServerNow(data.server_now);
      setRosterError(null);
      handleRouteFromStatus(data.status, data.song_selection_started);
    },
    [handleRouteFromStatus],
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

        if (data.status !== "countdown" && data.status !== "playing") {
          const route = getRouteForLobbyStatus(
            data.status,
            data.song_selection_started,
          );
          if (route) {
            router.replace(route);
            return false;
          }
        }

        if (!data.song || !data.playback_start_at) {
          setRosterError("Game data is not ready yet.");
          return false;
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

  if (!isReady || !song || !playbackStartAt) {
    return null;
  }

  return (
    <GameScreen
      displayName={displayName}
      players={players}
      song={song}
      playbackStartAt={playbackStartAt}
      serverNow={serverNow}
      isRosterLoading={isRosterLoading}
      rosterError={rosterError}
      onExitLobby={handleExitLobby}
    />
  );
}
