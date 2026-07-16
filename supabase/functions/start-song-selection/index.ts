import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

type StartSongSelectionRequest = {
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

  let body: StartSongSelectionRequest;
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
    .select("id, lobby_id, is_host")
    .eq("id", body.player_id)
    .maybeSingle();

  if (playerError) {
    return jsonResponse({ error: "Failed to check player session" }, 500);
  }

  if (!player) {
    return jsonResponse({ error: "Player is not in a lobby" }, 404);
  }

  if (!player.is_host) {
    return jsonResponse({ error: "Only the host can start song selection" }, 403);
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, code, status, song_selection_started")
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

  if (lobby.status !== "waiting") {
    return jsonResponse(
      { error: "Song selection can only be started from the waiting state" },
      403,
    );
  }

  if (lobby.song_selection_started) {
    return jsonResponse({
      lobby_id: lobby.id,
      code: lobby.code,
      song_selection_started: true,
    });
  }

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      song_selection_started: true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lobby.id);

  if (updateError) {
    return jsonResponse({ error: "Failed to start song selection" }, 500);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    song_selection_started: true,
  });
});
