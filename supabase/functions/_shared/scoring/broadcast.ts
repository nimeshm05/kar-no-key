import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type ScoreBroadcastPayload = {
  player_id: string;
  score: number;
  phrases_completed: number;
  delta: number;
};

const BROADCAST_TIMEOUT_MS = 3000;

export async function broadcastScoreUpdate(
  supabase: SupabaseClient,
  lobbyId: string,
  payload: ScoreBroadcastPayload,
): Promise<void> {
  const channel = supabase.channel(`lobby:${lobbyId}`);

  await new Promise<void>((resolve) => {
    let settled = false;

    const finish = () => {
      if (settled) {
        return;
      }

      settled = true;
      void supabase.removeChannel(channel);
      resolve();
    };

    const timeoutId = setTimeout(finish, BROADCAST_TIMEOUT_MS);

    channel.subscribe(async (status) => {
      if (status !== "SUBSCRIBED") {
        return;
      }

      clearTimeout(timeoutId);

      await channel.send({
        type: "broadcast",
        event: "score_update",
        payload,
      });

      finish();
    });
  });
}
