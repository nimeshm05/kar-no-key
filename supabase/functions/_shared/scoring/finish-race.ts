import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import {
  buildAwardsSnapshot,
  playerMetricsForPersist,
  type PlayerRaceStats,
} from "./awards.ts";
import { computePlaybackElapsedMs } from "./scoring.ts";
import type { AwardsSnapshot, LyricPhrase } from "./types.ts";

type LobbyFinishRow = {
  id: string;
  code: string;
  status: string;
  selected_youtube_video_id: string | null;
  playback_start_at: string | null;
  playback_elapsed_ms: number;
  awards_snapshot: AwardsSnapshot | null;
};

export type FinishRaceResult = {
  lobby_id: string;
  code: string;
  status: "finished";
  awards: AwardsSnapshot;
  server_now: string;
  already_finished: boolean;
};

async function loadPlayerRaceStats(
  supabase: SupabaseClient,
  lobbyId: string,
  youtubeVideoId: string | null,
): Promise<PlayerRaceStats[]> {
  const { data: players, error: playersError } = await supabase
    .from("players")
    .select(
      "id, display_name, score, phrases_completed, correct_chars, attempted_chars, typing_ms",
    )
    .eq("lobby_id", lobbyId)
    .order("joined_at", { ascending: true });

  if (playersError) {
    throw playersError;
  }

  const avgByPlayer = new Map<string, number>();

  if (youtubeVideoId) {
    const { data: progressRows } = await supabase
      .from("player_phrase_progress")
      .select("player_id, updated_at, phrase_bonus_awarded, finalized")
      .eq("lobby_id", lobbyId)
      .eq("youtube_video_id", youtubeVideoId)
      .eq("phrase_bonus_awarded", true)
      .eq("finalized", true);

    const sums = new Map<string, { total: number; count: number }>();
    for (const row of progressRows ?? []) {
      const completedAt = new Date(row.updated_at).getTime();
      const current = sums.get(row.player_id) ?? { total: 0, count: 0 };
      current.total += completedAt;
      current.count += 1;
      sums.set(row.player_id, current);
    }

    for (const [playerId, value] of sums) {
      avgByPlayer.set(playerId, value.total / value.count);
    }
  }

  return (players ?? []).map((row) => ({
    player_id: row.id,
    display_name: row.display_name,
    score: row.score ?? 0,
    phrases_completed: row.phrases_completed ?? 0,
    correct_chars: row.correct_chars ?? 0,
    attempted_chars: row.attempted_chars ?? 0,
    typing_ms: row.typing_ms ?? 0,
    avg_phrase_completion_ms: avgByPlayer.get(row.id) ?? null,
  }));
}

export async function finishRace(
  supabase: SupabaseClient,
  lobby: LobbyFinishRow,
  now = new Date(),
): Promise<FinishRaceResult> {
  if (lobby.status === "finished" && lobby.awards_snapshot) {
    return {
      lobby_id: lobby.id,
      code: lobby.code,
      status: "finished",
      awards: lobby.awards_snapshot,
      server_now: now.toISOString(),
      already_finished: true,
    };
  }

  const stats = await loadPlayerRaceStats(
    supabase,
    lobby.id,
    lobby.selected_youtube_video_id,
  );
  const awards = buildAwardsSnapshot(stats);

  for (const player of stats) {
    const metrics = playerMetricsForPersist(player);
    const { error } = await supabase
      .from("players")
      .update({
        wpm: metrics.wpm,
        accuracy: metrics.accuracy,
      })
      .eq("id", player.player_id);

    if (error) {
      throw error;
    }
  }

  const elapsedMs = computePlaybackElapsedMs(
    lobby.playback_start_at,
    lobby.playback_elapsed_ms ?? 0,
    now.getTime(),
    lobby.status === "playing",
  );

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      status: "finished",
      awards_snapshot: awards,
      playback_start_at: null,
      playback_elapsed_ms: elapsedMs,
      countdown_start_at: null,
      updated_at: now.toISOString(),
    })
    .eq("id", lobby.id)
    .neq("status", "finished");

  if (updateError) {
    throw updateError;
  }

  // Re-read in case another request won the race
  const { data: latest } = await supabase
    .from("lobbies")
    .select("id, code, status, awards_snapshot")
    .eq("id", lobby.id)
    .maybeSingle();

  const snapshot = (latest?.awards_snapshot as AwardsSnapshot | null) ?? awards;

  return {
    lobby_id: lobby.id,
    code: lobby.code,
    status: "finished",
    awards: snapshot,
    server_now: now.toISOString(),
    already_finished: latest?.status === "finished" && Boolean(lobby.awards_snapshot),
  };
}

export function shouldAutoFinishRace(
  status: string,
  playbackStartAt: string | null,
  playbackElapsedMs: number,
  durationSec: number | null | undefined,
  nowMs: number,
): boolean {
  if (status !== "playing" || !durationSec || durationSec <= 0) {
    return false;
  }

  const elapsedMs = computePlaybackElapsedMs(
    playbackStartAt,
    playbackElapsedMs,
    nowMs,
    true,
  );

  return elapsedMs >= durationSec * 1000;
}

export function songDurationSecFromPhrases(
  durationSec: number | null | undefined,
  phrases: LyricPhrase[] | null | undefined,
): number | null {
  if (typeof durationSec === "number" && durationSec > 0) {
    return durationSec;
  }

  if (!phrases || phrases.length === 0) {
    return null;
  }

  const lastEndMs = Math.max(...phrases.map((phrase) => phrase.end_ms ?? 0));
  if (lastEndMs <= 0) {
    return null;
  }

  return Math.ceil(lastEndMs / 1000);
}
