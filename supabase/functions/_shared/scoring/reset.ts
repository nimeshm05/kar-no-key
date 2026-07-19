import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export async function clearPlayerGameData(
  supabase: SupabaseClient,
  playerId: string,
): Promise<void> {
  const { error } = await supabase
    .from("player_phrase_progress")
    .delete()
    .eq("player_id", playerId);

  if (error) {
    throw error;
  }
}

export async function resetLobbyPlayerScores(
  supabase: SupabaseClient,
  lobbyId: string,
): Promise<void> {
  const { error } = await supabase
    .from("players")
    .update({ score: 0, phrases_completed: 0 })
    .eq("lobby_id", lobbyId);

  if (error) {
    throw error;
  }
}

export async function clearLobbyGameData(
  supabase: SupabaseClient,
  lobbyId: string,
  youtubeVideoId?: string | null,
): Promise<void> {
  let deleteQuery = supabase
    .from("player_phrase_progress")
    .delete()
    .eq("lobby_id", lobbyId);

  if (youtubeVideoId) {
    deleteQuery = deleteQuery.eq("youtube_video_id", youtubeVideoId);
  }

  const { error: deleteError } = await deleteQuery;

  if (deleteError) {
    throw deleteError;
  }

  await resetLobbyPlayerScores(supabase, lobbyId);
}
