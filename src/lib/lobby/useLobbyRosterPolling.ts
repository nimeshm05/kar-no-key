import { useEffect, useRef } from "react";
import { getLobbyPlayers, type LobbyPlayer } from "@/lib/supabase/functions";

export const POLL_INTERVAL_MS = 3000;

export type LobbyRosterUpdate = {
  lobby_id: string;
  code: string;
  max_players: number;
  players: LobbyPlayer[];
};

type UseLobbyRosterPollingOptions = {
  playerId: string | null;
  enabled: boolean;
  existingPlayerCount?: number;
  onUpdate: (data: LobbyRosterUpdate) => void;
  onError: (message: string, hasExistingRoster: boolean) => void;
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

export function useLobbyRosterPolling({
  playerId,
  enabled,
  existingPlayerCount = 0,
  onUpdate,
  onError,
}: UseLobbyRosterPollingOptions) {
  const hasRosterRef = useRef(existingPlayerCount > 0);

  useEffect(() => {
    if (!enabled || !playerId) {
      hasRosterRef.current = false;
      return;
    }

    const activePlayerId = playerId;
    hasRosterRef.current = existingPlayerCount > 0;

    let cancelled = false;

    async function poll() {
      try {
        const { data, error: invokeError } = await getLobbyPlayers(activePlayerId);

        if (cancelled) {
          return;
        }

        if (invokeError || !data || "error" in data) {
          onError(getPollErrorMessage(invokeError, data), hasRosterRef.current);
          return;
        }

        hasRosterRef.current = data.players.length > 0;
        onUpdate({
          lobby_id: data.lobby_id,
          code: data.code,
          max_players: data.max_players,
          players: data.players,
        });
      } catch (caughtError) {
        if (!cancelled) {
          onError(getPollErrorMessage(caughtError, null), hasRosterRef.current);
        }
      }
    }

    void poll();

    const intervalId = window.setInterval(() => {
      void poll();
    }, POLL_INTERVAL_MS);

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
      hasRosterRef.current = false;
    };
  }, [playerId, enabled, onUpdate, onError]);
}
