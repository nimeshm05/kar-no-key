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
    .update({
      score: 0,
      phrases_completed: 0,
      correct_chars: 0,
      attempted_chars: 0,
      typing_ms: 0,
      wpm: 0,
      accuracy: 0,
    })
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

  const { error: firstFinishError } = await supabase
    .from("phrase_first_finish")
    .delete()
    .eq("lobby_id", lobbyId);

  if (firstFinishError) {
    throw firstFinishError;
  }

  await resetLobbyPlayerScores(supabase, lobbyId);
}
