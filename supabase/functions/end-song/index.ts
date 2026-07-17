import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { requireLobbyPlayer } from "../_shared/lobby-state.ts";

type EndSongRequest = {
  player_id?: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: EndSongRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.player_id || typeof body.player_id !== "string") {
    return jsonResponse({ error: "Missing player_id" }, 400);
  }

  if (!isValidPlayerId(body.player_id)) {
    return jsonResponse({ error: "Invalid player_id format" }, 400);
  }

  const auth = await requireLobbyPlayer(body.player_id);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  const { supabase, player, lobby } = auth;

  if (!player.is_host) {
    return jsonResponse({ error: "Only the host can end the song" }, 403);
  }

  if (!lobby.selected_youtube_video_id) {
    return jsonResponse({ error: "No song is currently selected" }, 400);
  }

  const now = new Date();

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      status: "waiting",
      song_selection_started: true,
      selected_youtube_video_id: null,
      countdown_start_at: null,
      playback_start_at: null,
      playback_elapsed_ms: 0,
      updated_at: now.toISOString(),
    })
    .eq("id", lobby.id);

  if (updateError) {
    return jsonResponse({ error: "Failed to end song" }, 500);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    status: "waiting",
    song_selection_started: true,
    server_now: now.toISOString(),
  });
});
