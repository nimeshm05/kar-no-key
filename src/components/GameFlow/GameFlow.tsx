"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import GameScreen from "@/components/GameScreen/GameScreen";
import PageLoader from "@/components/PageLoader/PageLoader";
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
import { useLobbyScoreBroadcast } from "@/lib/lobby/useLobbyScoreBroadcast";
import { getPlayerId } from "@/lib/player/identity";
import {
  loadLobbySession,
  clearLobbySession,
  syncHostRoleFromPlayers,
} from "@/lib/player/session";
import {
  endSong,
  getLobbyState,
  leaveLobby,
  pausePlayback,
  startCountdown,
  type LobbyPlayer,
  type LobbySong,
} from "@/lib/supabase/functions";
import { useTimedPageLoader } from "@/lib/ui/useTimedPageLoader";

export default function GameFlow() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [song, setSong] = useState<LobbySong | null>(null);
  const [lobbyStatus, setLobbyStatus] = useState<string>("ready");
  const [countdownStartAt, setCountdownStartAt] = useState<string | null>(null);
  const [playbackStartAt, setPlaybackStartAt] = useState<string | null>(null);
  const [playbackElapsedMs, setPlaybackElapsedMs] = useState(0);
  const [serverNow, setServerNow] = useState<string>(new Date().toISOString());
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [controlError, setControlError] = useState<string | null>(null);
  const [isControlPending, setIsControlPending] = useState(false);
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
      const route = getRouteForLobbyStatus(status, songSelectionStarted);

      // Prefer results over search so a finish never loses to a stale waiting poll.
      if (route === "/results") {
        navigateTo("/results");
        return true;
      }

      if (route === "/search") {
        navigateTo("/search");
        return true;
      }

      if (!songSelectionStarted && status === "waiting") {
        navigateTo("/");
        return true;
      }

      return false;
    },
    [navigateTo],
  );

  const applyLobbyState = useCallback(
    (data: LobbyStateUpdate) => {
      setLobbyId(data.lobby_id);
      setPlayers(data.players);
      setSong(data.song);
      setLobbyStatus(data.status);
      setCountdownStartAt(data.countdown_start_at);
      setPlaybackStartAt(data.playback_start_at);
      setPlaybackElapsedMs(data.playback_elapsed_ms);
      setServerNow(data.server_now);
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
          return false;
        }

        if (
          data.status !== "ready" &&
          data.status !== "countdown" &&
          data.status !== "playing"
        ) {
          handleRouteFromStatus(data.status, data.song_selection_started);
          return false;
        }

        if (!data.song) {
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
    [applyLobbyState, handleRouteFromStatus],
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

  const handleScoreUpdate = useCallback(
    (updatedPlayerId: string, score: number, phrasesCompleted: number) => {
      setPlayers((current) =>
        current.map((player) =>
          player.player_id === updatedPlayerId
            ? { ...player, score, phrases_completed: phrasesCompleted }
            : player,
        ),
      );
    },
    [],
  );

  // Realtime broadcasts are untrusted hints; only apply monotonic updates for known players.
  // Authoritative scores arrive via get-lobby-state polling (~1s).
  const handleBroadcastScoreUpdate = useCallback(
    (payload: {
      player_id: string;
      score: number;
      phrases_completed: number;
    }) => {
      setPlayers((current) => {
        const existing = current.find(
          (player) => player.player_id === payload.player_id,
        );
        if (!existing) {
          return current;
        }

        const currentScore = existing.score ?? 0;
        const currentPhrases = existing.phrases_completed ?? 0;
        if (
          payload.score < currentScore ||
          payload.phrases_completed < currentPhrases
        ) {
          return current;
        }

        if (
          payload.score === currentScore &&
          payload.phrases_completed === currentPhrases
        ) {
          return current;
        }

        return current.map((player) =>
          player.player_id === payload.player_id
            ? {
                ...player,
                score: payload.score,
                phrases_completed: payload.phrases_completed,
              }
            : player,
        );
      });
    },
    [],
  );

  useLobbyStatePolling({
    playerId,
    enabled: isReady,
    pollIntervalMs: 1000,
    onUpdate: handleStateUpdate,
    onError: handleStatePollError,
  });

  useLobbyScoreBroadcast({
    lobbyId,
    enabled: isReady,
    knownPlayerIds: players.map((player) => player.player_id),
    onScoreUpdate: handleBroadcastScoreUpdate,
  });

  useEffect(() => {
    const id = getPlayerId();
    const session = loadLobbySession();

    if (!session) {
      navigateTo("/");
      return;
    }

    setPlayerId(id);
    setDisplayName(session.displayName);
    setIsHost(session.isHost);
    startPageLoader();

    void fetchLobbyState(id).then((success) => {
      if (isNavigatingAwayRef.current) {
        return;
      }

      if (success) {
        setIsReady(true);
        finishPageLoader();
        return;
      }

      // Game data missing / wrong status — recover to search instead of spinning forever.
      navigateTo("/search");
    });
  }, [fetchLobbyState, finishPageLoader, navigateTo, startPageLoader]);

  async function handleExitLobby() {
    if (playerId) {
      try {
        const { data, error: invokeError } = await leaveLobby(playerId);

        if (invokeError || !data || "error" in data) {
          setRosterError(getErrorMessage(invokeError, data));
          return;
        }

        trackEvent(AnalyticsEvent.LobbyLeft, {
          lobby_id: lobbyId ?? undefined,
          source_screen: "game",
          lobby_closed: data.lobby_closed,
          is_host: isHost,
          player_count: players.length,
          lobby_status: lobbyStatus,
        });
        identifyPlayer(playerId, { has_active_lobby: false, is_host: false });
        setLobbyGroup(null);
      } catch (caughtError) {
        setRosterError(getErrorMessage(caughtError, null));
        return;
      }
    }

    clearLobbySession();
    navigateTo("/");
  }

  async function handlePlay() {
    if (!playerId || !isHost || !lobbyId || !song) {
      return;
    }

    setIsControlPending(true);
    setControlError(null);

    try {
      const { data, error: invokeError } = await startCountdown(playerId);

      if (invokeError || !data || "error" in data) {
        setControlError(getErrorMessage(invokeError, data));
        return;
      }

      trackEvent(AnalyticsEvent.PlaybackStarted, {
        lobby_id: lobbyId,
        song_id: song.youtube_video_id,
        player_count: players.length,
        is_host: true,
        source_screen: "game",
        lobby_status: data.status,
      });
      setLobbyStatus(data.status);
      setCountdownStartAt(data.countdown_start_at);
      setPlaybackStartAt(data.playback_start_at);
      setPlaybackElapsedMs(data.playback_elapsed_ms);
      setServerNow(data.server_now);
    } catch (caughtError) {
      setControlError(getErrorMessage(caughtError, null));
    } finally {
      setIsControlPending(false);
    }
  }

  async function handlePause() {
    if (!playerId || !isHost || !lobbyId) {
      return;
    }

    setIsControlPending(true);
    setControlError(null);

    try {
      const { data, error: invokeError } = await pausePlayback(playerId);

      if (invokeError || !data || "error" in data) {
        setControlError(getErrorMessage(invokeError, data));
        return;
      }

      trackEvent(AnalyticsEvent.PlaybackPaused, {
        lobby_id: lobbyId,
        playback_elapsed_ms: data.playback_elapsed_ms,
        is_host: true,
        source_screen: "game",
        lobby_status: data.status,
        player_count: players.length,
      });
      setLobbyStatus(data.status);
      setCountdownStartAt(null);
      setPlaybackStartAt(null);
      setPlaybackElapsedMs(data.playback_elapsed_ms);
      setServerNow(data.server_now);
    } catch (caughtError) {
      setControlError(getErrorMessage(caughtError, null));
    } finally {
      setIsControlPending(false);
    }
  }

  async function handleEndSong() {
    if (!playerId || !isHost || !lobbyId || !song) {
      return;
    }

    setIsControlPending(true);
    startPageLoader();
    setControlError(null);

    const currentPlayer = players.find((player) => player.player_id === playerId);

    try {
      const { data, error: invokeError } = await endSong(playerId);

      if (invokeError || !data || "error" in data) {
        setControlError(getErrorMessage(invokeError, data));
        cancelPageLoader();
        return;
      }

      if (data.status !== "finished") {
        setControlError("Race did not finish correctly. Please try ending the song again.");
        cancelPageLoader();
        return;
      }

      trackEvent(AnalyticsEvent.SongEnded, {
        lobby_id: lobbyId,
        song_id: song.youtube_video_id,
        final_score: currentPlayer?.score ?? 0,
        phrases_completed: currentPlayer?.phrases_completed ?? 0,
        player_count: players.length,
        is_host: true,
        source_screen: "game",
      });
      navigateTo("/results");
    } catch (caughtError) {
      setControlError(getErrorMessage(caughtError, null));
      cancelPageLoader();
    } finally {
      setIsControlPending(false);
    }
  }

  if (!isReady || !song || isPageLoading) {
    return <PageLoader label="Loading game" />;
  }

  return (
    <GameScreen
      playerId={playerId}
      displayName={displayName}
      isHost={isHost}
      lobbyStatus={lobbyStatus}
      players={players}
      song={song}
      countdownStartAt={countdownStartAt}
      playbackStartAt={playbackStartAt}
      playbackElapsedMs={playbackElapsedMs}
      serverNow={serverNow}
      isRosterLoading={isRosterLoading}
      rosterError={rosterError}
      controlError={controlError}
      isControlPending={isControlPending}
      onScoreUpdate={handleScoreUpdate}
      onPlay={() => void handlePlay()}
      onPause={() => void handlePause()}
      onEndSong={() => void handleEndSong()}
      onExitLobby={handleExitLobby}
    />
  );
}
