"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AwardsScreen from "@/components/AwardsScreen/AwardsScreen";
import PageLoader from "@/components/PageLoader/PageLoader";
import {
  identifyPlayer,
  setLobbyGroup,
  trackEvent,
} from "@/lib/analytics/amplitude";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getErrorMessage } from "@/lib/lobby/lobbyRoute";
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
import { useTimedPageLoader } from "@/lib/ui/useTimedPageLoader";

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
  const isNavigatingAwayRef = useRef(false);
  const {
    isLoading: isPageLoading,
    start: startPageLoader,
    finish: finishPageLoader,
    cancel: cancelPageLoader,
  } = useTimedPageLoader();

  const navigateTo = useCallback(
    (route: string) => {
      isNavigatingAwayRef.current = true;
      startPageLoader();
      router.replace(route);
    },
    [router, startPageLoader],
  );

  const handleRouteFromStatus = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      // Stay on results until host restarts (waiting + song selection) or lobby closes.
      if (status === "finished") {
        return false;
      }

      if (status === "waiting" && songSelectionStarted) {
        navigateTo("/search");
        return true;
      }

      if (status === "waiting" && !songSelectionStarted) {
        navigateTo("/");
        return true;
      }

      // Ignore stale playing/ready/countdown polls — do not bounce off results.
      return false;
    },
    [navigateTo],
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
      navigateTo("/");
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
    startPageLoader();

    void fetchLobbyState(activePlayerId).then(() => {
      if (isNavigatingAwayRef.current) {
        return;
      }
      setIsReady(true);
      finishPageLoader();
    });
  }, [fetchLobbyState, finishPageLoader, navigateTo, startPageLoader]);

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
    navigateTo("/");
  }

  async function handleRestartGame() {
    if (!playerId || !isHost) {
      return;
    }

    setIsRestartPending(true);
    startPageLoader();
    setRestartError(null);

    try {
      const { data, error: invokeError } = await restartGame(playerId);

      if (invokeError || !data || "error" in data) {
        setRestartError(getErrorMessage(invokeError, data));
        cancelPageLoader();
        return;
      }

      navigateTo("/search");
    } catch (caughtError) {
      setRestartError(getErrorMessage(caughtError, null));
      cancelPageLoader();
    } finally {
      setIsRestartPending(false);
    }
  }

  if (!isReady || isPageLoading) {
    return <PageLoader label="Loading results" />;
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
