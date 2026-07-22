"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AwardsScreen from "@/components/AwardsScreen/AwardsScreen";
import {
  identifyPlayer,
  setLobbyGroup,
  trackEvent,
} from "@/lib/analytics/amplitude";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getRouteForLobbyStatus, getErrorMessage } from "@/lib/lobby/lobbyRoute";
import {
  useLobbyStatePolling,
  type LobbyStateUpdate,
} from "@/lib/lobby/useLobbyStatePolling";
import { getPlayerId } from "@/lib/player/identity";
import {
  loadLobbySession,
  clearLobbySession,
  syncHostRoleFromPlayers,
} from "@/lib/player/session";
import {
  getLobbyState,
  leaveLobby,
  restartGame,
  type AwardsSnapshot,
  type LobbyPlayer,
} from "@/lib/supabase/functions";

export default function ResultsFlow() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [awards, setAwards] = useState<AwardsSnapshot | null>(null);
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [restartError, setRestartError] = useState<string | null>(null);
  const [isRestartPending, setIsRestartPending] = useState(false);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [lobbyId, setLobbyId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  const handleRouteFromStatus = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      const route = getRouteForLobbyStatus(status, songSelectionStarted);

      if (route && route !== "/results") {
        router.replace(route);
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
      setLobbyId(data.lobby_id);
      setPlayers(data.players);
      setAwards(data.awards);
      setRosterError(null);

      const nextIsHost = syncHostRoleFromPlayers(
        data.players,
        playerId ?? getPlayerId(),
      );
      if (nextIsHost !== null) {
        setIsHost(nextIsHost);
      }

      handleRouteFromStatus(data.status, data.song_selection_started);
    },
    [handleRouteFromStatus, playerId],
  );

  const fetchLobbyState = useCallback(
    async (activePlayerId: string) => {
      setIsRosterLoading(true);
      setRosterError(null);

      try {
        const { data, error: invokeError } = await getLobbyState(activePlayerId);

        if (invokeError || !data || "error" in data) {
          setRosterError(getErrorMessage(invokeError, data));
          return;
        }

        applyLobbyState(data as LobbyStateUpdate);
      } catch (caughtError) {
        setRosterError(getErrorMessage(caughtError, null));
      } finally {
        setIsRosterLoading(false);
      }
    },
    [applyLobbyState],
  );

  useEffect(() => {
    const session = loadLobbySession();
    const activePlayerId = getPlayerId();

    if (!session || !activePlayerId) {
      router.replace("/");
      return;
    }

    setPlayerId(activePlayerId);
    setDisplayName(session.displayName);
    setIsHost(session.isHost);
    setLobbyId(session.lobbyId);
    identifyPlayer(activePlayerId, {
      has_display_name: true,
      has_active_lobby: true,
      is_host: session.isHost,
      last_lobby_id: session.lobbyId,
    });
    setLobbyGroup(session.lobbyId);
    setIsReady(true);
    void fetchLobbyState(activePlayerId);
  }, [fetchLobbyState, router]);

  useLobbyStatePolling({
    playerId,
    enabled: isReady,
    onUpdate: applyLobbyState,
    onError: setRosterError,
  });

  async function handleExitLobby() {
    if (!playerId) {
      return;
    }

    trackEvent(AnalyticsEvent.LobbyLeft, {
      lobby_id: lobbyId ?? undefined,
      is_host: isHost,
      source_screen: "results",
    });

    try {
      await leaveLobby(playerId);
    } catch {
      // Clear local session even if leave fails.
    }

    clearLobbySession();
    router.replace("/");
  }

  async function handleRestartGame() {
    if (!playerId || !isHost) {
      return;
    }

    setIsRestartPending(true);
    setRestartError(null);

    try {
      const { data, error: invokeError } = await restartGame(playerId);

      if (invokeError || !data || "error" in data) {
        setRestartError(getErrorMessage(invokeError, data));
        return;
      }

      router.replace("/search");
    } catch (caughtError) {
      setRestartError(getErrorMessage(caughtError, null));
    } finally {
      setIsRestartPending(false);
    }
  }

  if (!isReady) {
    return null;
  }

  return (
    <AwardsScreen
      displayName={displayName}
      players={players}
      awards={awards}
      isHost={isHost}
      isRosterLoading={isRosterLoading}
      rosterError={rosterError}
      restartError={restartError}
      isRestartPending={isRestartPending}
      onExitLobby={() => void handleExitLobby()}
      onRestartGame={() => void handleRestartGame()}
    />
  );
}
