import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { validateDisplayName } from "../_shared/display-name.ts";
import {
  generateUniqueCode,
  LobbyCodeGenerationError,
} from "../_shared/lobby-code.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

type CreateLobbyRequest = {
  player_id?: string;
  display_name?: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: CreateLobbyRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.player_id || typeof body.player_id !== "string") {
    return jsonResponse({ error: "Missing player_id" }, 400);
  }

  if (!body.display_name || typeof body.display_name !== "string") {
    return jsonResponse({ error: "Missing display_name" }, 400);
  }

  if (!isValidPlayerId(body.player_id)) {
    return jsonResponse({ error: "Invalid player_id format" }, 400);
  }

  const nameResult = validateDisplayName(body.display_name);
  if (!nameResult.valid) {
    return jsonResponse({ error: nameResult.error }, 400);
  }

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const { data: existingPlayer, error: existingPlayerError } = await supabase
    .from("players")
    .select("id, lobby_id")
    .eq("id", body.player_id)
    .maybeSingle();

  if (existingPlayerError) {
    return jsonResponse({ error: "Failed to check player session" }, 500);
  }

  if (existingPlayer) {
    const { data: existingLobby, error: existingLobbyError } = await supabase
      .from("lobbies")
      .select("status")
      .eq("id", existingPlayer.lobby_id)
      .maybeSingle();

    if (existingLobbyError) {
      return jsonResponse({ error: "Failed to check player session" }, 500);
    }

    if (existingLobby && existingLobby.status !== "closed") {
      return jsonResponse(
        { error: "Player is already in an active lobby" },
        409,
      );
    }
  }

  let code: string;
  try {
    code = await generateUniqueCode(supabase);
  } catch (error) {
    if (error instanceof LobbyCodeGenerationError) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ error: "Failed to generate lobby code" }, 500);
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .insert({ code, max_players: 8 })
    .select("id")
    .single();

  if (lobbyError || !lobby) {
    return jsonResponse({ error: "Failed to create lobby" }, 500);
  }

  if (existingPlayer) {
    const { error: updatePlayerError } = await supabase
      .from("players")
      .update({
        display_name: nameResult.name,
        lobby_id: lobby.id,
        is_host: true,
        is_connected: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", body.player_id);

    if (updatePlayerError) {
      await supabase.from("lobbies").delete().eq("id", lobby.id);
      return jsonResponse({ error: "Failed to create host player" }, 500);
    }
  } else {
    const { error: insertPlayerError } = await supabase.from("players").insert({
      id: body.player_id,
      display_name: nameResult.name,
      lobby_id: lobby.id,
      is_host: true,
      is_connected: true,
    });

    if (insertPlayerError) {
      await supabase.from("lobbies").delete().eq("id", lobby.id);
      return jsonResponse({ error: "Failed to create host player" }, 500);
    }
  }

  const { error: updateLobbyError } = await supabase
    .from("lobbies")
    .update({ host_player_id: body.player_id })
    .eq("id", lobby.id);

  if (updateLobbyError) {
    return jsonResponse({ error: "Failed to assign lobby host" }, 500);
  }

  return jsonResponse({
    code,
    lobby_id: lobby.id,
    player_id: body.player_id,
    display_name: nameResult.name,
  });
});
