import { useEffect, useRef } from "react";
import {
  getLobbyState,
  type GetLobbyStateResult,
  type LobbyPlayer,
  type LobbySong,
} from "@/lib/supabase/functions";

export const LOBBY_STATE_POLL_INTERVAL_MS = 3000;

export type LobbyStateUpdate = {
  lobby_id: string;
  code: string;
  status: string;
  max_players: number;
  song_selection_started: boolean;
  selected_youtube_video_id: string | null;
  countdown_start_at: string | null;
  playback_start_at: string | null;
  playback_elapsed_ms: number;
  server_now: string;
  song: LobbySong | null;
  players: LobbyPlayer[];
};

type UseLobbyStatePollingOptions = {
  playerId: string | null;
  enabled: boolean;
  pollIntervalMs?: number;
  onUpdate: (data: LobbyStateUpdate) => void;
  onError: (message: string) => void;
};

function getPollErrorMessage(error: unknown, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error: unknown }).error;
    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function toLobbyStateUpdate(data: GetLobbyStateResult & { error?: never }): LobbyStateUpdate {
  return {
    lobby_id: data.lobby_id,
    code: data.code,
    status: data.status,
    max_players: data.max_players,
    song_selection_started: data.song_selection_started,
    selected_youtube_video_id: data.selected_youtube_video_id,
    countdown_start_at: data.countdown_start_at,
    playback_start_at: data.playback_start_at,
    playback_elapsed_ms: data.playback_elapsed_ms,
    server_now: data.server_now,
    song: data.song,
    players: data.players,
  };
}

export function useLobbyStatePolling({
  playerId,
  enabled,
  pollIntervalMs = LOBBY_STATE_POLL_INTERVAL_MS,
  onUpdate,
  onError,
}: UseLobbyStatePollingOptions) {
  const onUpdateRef = useRef(onUpdate);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onUpdateRef.current = onUpdate;
    onErrorRef.current = onError;
  }, [onUpdate, onError]);

  useEffect(() => {
    if (!enabled || !playerId) {
      return;
    }

    const activePlayerId = playerId;
    let cancelled = false;

    async function poll() {
      try {
        const { data, error: invokeError } = await getLobbyState(activePlayerId);

        if (cancelled) {
          return;
        }

        if (invokeError || !data || "error" in data) {
          onErrorRef.current(getPollErrorMessage(invokeError, data));
          return;
        }

        onUpdateRef.current(toLobbyStateUpdate(data));
      } catch (caughtError) {
        if (!cancelled) {
          onErrorRef.current(getPollErrorMessage(caughtError, null));
        }
      }
    }

    void poll();

    const intervalId = window.setInterval(() => {
      void poll();
    }, pollIntervalMs);

    function handleVisibilityChange() {
      if (document.visibilityState === "visible") {
        void poll();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [playerId, enabled, pollIntervalMs]);
}
