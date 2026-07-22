import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import {
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { clearLobbyGameData } from "../_shared/scoring/reset.ts";

type RestartGameRequest = {
  player_id?: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: RestartGameRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  if (!body.player_id || typeof body.player_id !== "string") {
    return jsonResponse({ error: "Missing player_id" }, 400, req);
  }

  if (!isValidPlayerId(body.player_id)) {
    return jsonResponse({ error: "Invalid player_id format" }, 400, req);
  }

  const auth = await requireLobbyPlayer(
    body.player_id,
    getSessionTokenFromBody(body),
  );
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status, req);
  }

  const { supabase, player, lobby } = auth;

  if (!player.is_host) {
    return jsonResponse({ error: "Only the host can restart the game" }, 403, req);
  }

  if (lobby.status !== "finished") {
    return jsonResponse({ error: "Race is not finished" }, 400, req);
  }

  const endedVideoId = lobby.selected_youtube_video_id;
  const now = new Date();

  try {
    await clearLobbyGameData(supabase, lobby.id, endedVideoId);
  } catch {
    return jsonResponse({ error: "Failed to reset game scores" }, 500, req);
  }

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      status: "waiting",
      song_selection_started: true,
      selected_youtube_video_id: null,
      countdown_start_at: null,
      playback_start_at: null,
      playback_elapsed_ms: 0,
      awards_snapshot: null,
      updated_at: now.toISOString(),
    })
    .eq("id", lobby.id);

  if (updateError) {
    return jsonResponse({ error: "Failed to restart game" }, 500, req);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    status: "waiting",
    song_selection_started: true,
    server_now: now.toISOString(),
  }, 200, req);
});
