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
  onScoreUpdate: (payload: ScoreBroadcastPayload) => void;
};

export function useLobbyScoreBroadcast({
  lobbyId,
  enabled,
  onScoreUpdate,
}: UseLobbyScoreBroadcastOptions) {
  const onScoreUpdateRef = useRef(onScoreUpdate);

  useEffect(() => {
    onScoreUpdateRef.current = onScoreUpdate;
  }, [onScoreUpdate]);

  useEffect(() => {
    if (!enabled || !lobbyId) {
      return;
    }

    const supabase = getSupabaseClient();
    const channel = supabase.channel(`lobby:${lobbyId}`);

    channel.on("broadcast", { event: "score_update" }, ({ payload }) => {
      if (!payload || typeof payload !== "object") {
        return;
      }

      const update = payload as ScoreBroadcastPayload;

      if (
        typeof update.player_id !== "string" ||
        typeof update.score !== "number"
      ) {
        return;
      }

      onScoreUpdateRef.current(update);
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [enabled, lobbyId]);
}
