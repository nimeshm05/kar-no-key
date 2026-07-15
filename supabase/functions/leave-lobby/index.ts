import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

type LeaveLobbyRequest = {
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

  let body: LeaveLobbyRequest;
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
    return jsonResponse({
      player_id: body.player_id,
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
    });
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, status, host_player_id")
    .eq("id", player.lobby_id)
    .maybeSingle();

  if (lobbyError) {
    return jsonResponse({ error: "Failed to check lobby" }, 500);
  }

  if (!lobby) {
    const { error: deletePlayerError } = await supabase
      .from("players")
      .delete()
      .eq("id", body.player_id);

    if (deletePlayerError) {
      return jsonResponse({ error: "Failed to leave lobby" }, 500);
    }

    return jsonResponse({
      player_id: body.player_id,
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
    });
  }

  if (lobby.status === "closed") {
    const { error: deletePlayerError } = await supabase
      .from("players")
      .delete()
      .eq("id", body.player_id);

    if (deletePlayerError) {
      return jsonResponse({ error: "Failed to leave lobby" }, 500);
    }

    return jsonResponse({
      player_id: body.player_id,
      lobby_id: lobby.id,
      left: true,
      lobby_closed: true,
      new_host_player_id: null,
    });
  }

  if (player.is_host) {
    const { data: otherPlayers, error: otherPlayersError } = await supabase
      .from("players")
      .select("id")
      .eq("lobby_id", lobby.id)
      .neq("id", body.player_id)
      .order("joined_at", { ascending: true });

    if (otherPlayersError) {
      return jsonResponse({ error: "Failed to check lobby players" }, 500);
    }

    if (!otherPlayers || otherPlayers.length === 0) {
      const { error: deleteLobbyError } = await supabase
        .from("lobbies")
        .delete()
        .eq("id", lobby.id);

      if (deleteLobbyError) {
        return jsonResponse({ error: "Failed to close lobby" }, 500);
      }

      return jsonResponse({
        player_id: body.player_id,
        lobby_id: lobby.id,
        left: true,
        lobby_closed: true,
        new_host_player_id: null,
      });
    }

    const successor = otherPlayers[0];

    const { error: updateLobbyError } = await supabase
      .from("lobbies")
      .update({ host_player_id: successor.id })
      .eq("id", lobby.id);

    if (updateLobbyError) {
      return jsonResponse({ error: "Failed to transfer host" }, 500);
    }

    const { error: clearHostFlagsError } = await supabase
      .from("players")
      .update({ is_host: false })
      .eq("lobby_id", lobby.id);

    if (clearHostFlagsError) {
      return jsonResponse({ error: "Failed to transfer host" }, 500);
    }

    const { error: promoteError } = await supabase
      .from("players")
      .update({ is_host: true, is_connected: true })
      .eq("id", successor.id);

    if (promoteError) {
      return jsonResponse({ error: "Failed to transfer host" }, 500);
    }

    const { error: deleteHostError } = await supabase
      .from("players")
      .delete()
      .eq("id", body.player_id);

    if (deleteHostError) {
      return jsonResponse({ error: "Failed to leave lobby" }, 500);
    }

    return jsonResponse({
      player_id: body.player_id,
      lobby_id: lobby.id,
      left: true,
      lobby_closed: false,
      new_host_player_id: successor.id,
    });
  }

  const { error: deletePlayerError } = await supabase
    .from("players")
    .delete()
    .eq("id", body.player_id);

  if (deletePlayerError) {
    return jsonResponse({ error: "Failed to leave lobby" }, 500);
  }

  return jsonResponse({
    player_id: body.player_id,
    lobby_id: lobby.id,
    left: true,
    lobby_closed: false,
    new_host_player_id: null,
  });
});
