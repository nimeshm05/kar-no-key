import { useEffect, useRef } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";

export type ScoreBroadcastPayload = {
  player_id: string;
  score: number;
  phrases_completed: number;
  delta: number;
};

type UseLobbyScoreBroadcastOptions = {
  lobbyId: string | null;
  enabled: boolean;
  /** Known roster player IDs — updates for unknown IDs are ignored (anti-spoof). */
  knownPlayerIds?: ReadonlySet<string> | readonly string[];
  onScoreUpdate: (payload: ScoreBroadcastPayload) => void;
};

function isValidScorePayload(payload: unknown): payload is ScoreBroadcastPayload {
  if (!payload || typeof payload !== "object") {
    return false;
  }

  const update = payload as Partial<ScoreBroadcastPayload>;

  return (
    typeof update.player_id === "string" &&
    update.player_id.length > 0 &&
    typeof update.score === "number" &&
    Number.isFinite(update.score) &&
    update.score >= 0 &&
    typeof update.phrases_completed === "number" &&
    Number.isFinite(update.phrases_completed) &&
    update.phrases_completed >= 0 &&
    Number.isInteger(update.phrases_completed)
  );
}

export function useLobbyScoreBroadcast({
  lobbyId,
  enabled,
  knownPlayerIds,
  onScoreUpdate,
}: UseLobbyScoreBroadcastOptions) {
  const onScoreUpdateRef = useRef(onScoreUpdate);
  const knownPlayerIdsRef = useRef(knownPlayerIds);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    knownPlayerIdsRef.current = knownPlayerIds;
  }, [knownPlayerIds]);

  useEffect(() => {
    if (!enabled || !lobbyId) {
      return;
    }

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`lobby:${lobbyId}`);

    channel.on("broadcast", { event: "score_update" }, ({ payload }) => {
      if (!isValidScorePayload(payload)) {
        return;
      }

      const known = knownPlayerIdsRef.current;
      if (known) {
        const knownSet =
          known instanceof Set ? known : new Set(known);
        if (!knownSet.has(payload.player_id)) {
          return;
        }
      }

      // Broadcast is a hint only — authoritative scores come from get-lobby-state polling.
      onScoreUpdateRef.current(payload);
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, lobbyId]);
}
