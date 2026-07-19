import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import {
  readSessionToken,
  verifyPlayerSessionToken,
} from "../_shared/player-session.ts";
import { clearPlayerGameData } from "../_shared/scoring/reset.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";
import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

type LeaveLobbyRequest = {
  player_id?: string;
  session_token?: string;
};

async function removePlayer(
  supabase: SupabaseClient,
  playerId: string,
): Promise<string | null> {
  try {
    await clearPlayerGameData(supabase, playerId);
  } catch {
    return "Failed to clear player game data";
  }

  const { error: deletePlayerError } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (deletePlayerError) {
    return "Failed to leave lobby";
  }

  return null;
}

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

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, status, host_player_id")
    .eq("id", player.lobby_id)
    .maybeSingle();

  if (lobbyError) {
    return jsonResponse({ error: "Failed to check lobby" }, 500, req);
  }

  if (!lobby) {
    const removeError = await removePlayer(supabase, body.player_id);
    if (removeError) {
      return jsonResponse({ error: removeError }, 500, req);
    }

    return jsonResponse({
      player_id: body.player_id,
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
    }, 200, req);
  }

  if (lobby.status === "closed") {
    const removeError = await removePlayer(supabase, body.player_id);
    if (removeError) {
      return jsonResponse({ error: removeError }, 500, req);
    }

    return jsonResponse({
      player_id: body.player_id,
      lobby_id: lobby.id,
      left: true,
      lobby_closed: true,
      new_host_player_id: null,
    }, 200, req);
  }

  if (player.is_host) {
    const { data: otherPlayers, error: otherPlayersError } = await supabase
      .from("players")
      .select("id")
      .eq("lobby_id", lobby.id)
      .neq("id", body.player_id)
      .order("joined_at", { ascending: true });

    if (otherPlayersError) {
      return jsonResponse({ error: "Failed to check lobby players" }, 500, req);
    }

    if (!otherPlayers || otherPlayers.length === 0) {
      try {
        await clearPlayerGameData(supabase, body.player_id);
      } catch {
        return jsonResponse({ error: "Failed to clear player game data" }, 500, req);
      }

      const { error: deleteLobbyError } = await supabase
        .from("lobbies")
        .delete()
        .eq("id", lobby.id);

      if (deleteLobbyError) {
        return jsonResponse({ error: "Failed to close lobby" }, 500, req);
      }

      return jsonResponse({
        player_id: body.player_id,
        lobby_id: lobby.id,
        left: true,
        lobby_closed: true,
        new_host_player_id: null,
      }, 200, req);
    }

    const successor = otherPlayers[0];

    const { error: updateLobbyError } = await supabase
      .from("lobbies")
      .update({ host_player_id: successor.id })
      .eq("id", lobby.id);

    if (updateLobbyError) {
      return jsonResponse({ error: "Failed to transfer host" }, 500, req);
    }

    const { error: clearHostFlagsError } = await supabase
      .from("players")
      .update({ is_host: false })
      .eq("lobby_id", lobby.id);

    if (clearHostFlagsError) {
      return jsonResponse({ error: "Failed to transfer host" }, 500, req);
    }

    const { error: promoteError } = await supabase
      .from("players")
      .update({ is_host: true, is_connected: true })
      .eq("id", successor.id);

    if (promoteError) {
      return jsonResponse({ error: "Failed to transfer host" }, 500, req);
    }

    const removeError = await removePlayer(supabase, body.player_id);
    if (removeError) {
      return jsonResponse({ error: removeError }, 500, req);
    }

    return jsonResponse({
      player_id: body.player_id,
      lobby_id: lobby.id,
      left: true,
      lobby_closed: false,
      new_host_player_id: successor.id,
    }, 200, req);
  }

  const removeError = await removePlayer(supabase, body.player_id);
  if (removeError) {
    return jsonResponse({ error: removeError }, 500, req);
  }

  return jsonResponse({
    player_id: body.player_id,
    lobby_id: lobby.id,
    left: true,
    lobby_closed: false,
    new_host_player_id: null,
  }, 200, req);
});
