import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";

type StartSongSelectionRequest = {
  player_id?: string;
  session_token?: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: StartSongSelectionRequest;
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
    return jsonResponse(
      { error: "Only the host can start song selection" },
      403,
      req,
    );
  }

  if (lobby.status !== "waiting") {
    return jsonResponse(
      { error: "Song selection can only be started from the waiting state" },
      403,
      req,
    );
  }

  if (lobby.song_selection_started) {
    return jsonResponse({
      lobby_id: lobby.id,
      code: lobby.code,
      song_selection_started: true,
    }, 200, req);
  }

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      song_selection_started: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lobby.id);

  if (updateError) {
    return jsonResponse({ error: "Failed to start song selection" }, 500, req);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    song_selection_started: true,
  }, 200, req);
});
