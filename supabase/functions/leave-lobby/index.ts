import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { removePlayerFromLobby } from "../_shared/player-leave.ts";
import {
  readSessionToken,
  verifyPlayerSessionToken,
} from "../_shared/player-session.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

type LeaveLobbyRequest = {
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

  let body: LeaveLobbyRequest;
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

  const sessionToken = readSessionToken(body);
  if (!sessionToken) {
    return jsonResponse({ error: "Missing session token" }, 401, req);
  }

  let claims;
  try {
    claims = await verifyPlayerSessionToken(sessionToken);
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500, req);
  }

  if (!claims || claims.playerId !== body.player_id) {
    return jsonResponse(
      { error: "Invalid or expired session token" },
      401,
      req,
    );
  }

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500, req);
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, lobby_id, is_host")
    .eq("id", body.player_id)
    .maybeSingle();

  if (playerError) {
    return jsonResponse({ error: "Failed to check player session" }, 500, req);
  }

  if (!player) {
    return jsonResponse({
      player_id: body.player_id,
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
    }, 200, req);
  }

  if (player.lobby_id !== claims.lobbyId) {
    return jsonResponse(
      { error: "Session token does not match lobby" },
      401,
      req,
    );
  }

  const result = await removePlayerFromLobby(
    supabase,
    body.player_id,
    player.lobby_id,
  );

  if (result.error) {
    return jsonResponse({ error: result.error }, 500, req);
  }

  return jsonResponse({
    player_id: body.player_id,
    lobby_id: player.lobby_id,
    left: result.left,
    lobby_closed: result.lobby_closed,
    new_host_player_id: result.new_host_player_id,
  }, 200, req);
});
