import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";

type GetLobbyPlayersRequest = {
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

  let body: GetLobbyPlayersRequest;
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

  const { supabase, lobby } = auth;

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, display_name, is_host, is_connected, joined_at")
    .eq("lobby_id", lobby.id)
    .order("joined_at", { ascending: true });

  if (playersError) {
    return jsonResponse({ error: "Failed to load lobby players" }, 500, req);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    status: lobby.status,
    max_players: lobby.max_players,
    song_selection_started: lobby.song_selection_started,
    players: (players ?? []).map((row) => ({
      player_id: row.id,
      display_name: row.display_name,
      is_host: row.is_host,
      is_connected: row.is_connected,
    })),
  }, 200, req);
});
