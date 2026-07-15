import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

type GetLobbyPlayersRequest = {
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

  let body: GetLobbyPlayersRequest;
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

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, lobby_id")
    .eq("id", body.player_id)
    .maybeSingle();

  if (playerError) {
    return jsonResponse({ error: "Failed to check player session" }, 500);
  }

  if (!player) {
    return jsonResponse({ error: "Player is not in a lobby" }, 404);
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, code, status, max_players")
    .eq("id", player.lobby_id)
    .maybeSingle();

  if (lobbyError) {
    return jsonResponse({ error: "Failed to load lobby" }, 500);
  }

  if (!lobby) {
    return jsonResponse({ error: "Lobby not found" }, 404);
  }

  if (lobby.status === "closed") {
    return jsonResponse({ error: "Lobby is closed" }, 403);
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, display_name, is_host, is_connected, joined_at")
    .eq("lobby_id", lobby.id)
    .order("joined_at", { ascending: true });

  if (playersError) {
    return jsonResponse({ error: "Failed to load lobby players" }, 500);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    max_players: lobby.max_players,
    players: (players ?? []).map((row) => ({
      player_id: row.id,
      display_name: row.display_name,
      is_host: row.is_host,
      is_connected: row.is_connected,
    })),
  });
});
