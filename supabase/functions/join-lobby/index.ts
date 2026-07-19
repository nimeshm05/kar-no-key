import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { validateDisplayName } from "../_shared/display-name.ts";
import {
  isValidLobbyCodeFormat,
  normalizeLobbyCode,
} from "../_shared/lobby-code.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { mintPlayerSessionToken } from "../_shared/player-session.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

type JoinLobbyRequest = {
  player_id?: string;
  display_name?: string;
  code?: string;
};

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 60_000;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: JoinLobbyRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  if (!body.player_id || typeof body.player_id !== "string") {
    return jsonResponse({ error: "Missing player_id" }, 400, req);
  }

  if (!body.display_name || typeof body.display_name !== "string") {
    return jsonResponse({ error: "Missing display_name" }, 400, req);
  }

  if (!body.code || typeof body.code !== "string") {
    return jsonResponse({ error: "Missing lobby code" }, 400, req);
  }

  if (!isValidPlayerId(body.player_id)) {
    return jsonResponse({ error: "Invalid player_id format" }, 400, req);
  }

  const nameResult = validateDisplayName(body.display_name);
  if (!nameResult.valid) {
    return jsonResponse({ error: nameResult.error }, 400, req);
  }

  const normalizedCode = normalizeLobbyCode(body.code);
  if (!isValidLobbyCodeFormat(normalizedCode)) {
    return jsonResponse({ error: "Invalid lobby code format" }, 400, req);
  }

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500, req);
  }

  const clientIp = getClientIp(req) ?? "unknown";
  const rateLimit = await checkRateLimit(
    supabase,
    `join-lobby:${clientIp}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );
  if (!rateLimit.ok) {
    return jsonResponse(
      { error: "Too many requests. Please try again shortly." },
      429,
      req,
    );
  }

  const { data: existingPlayer, error: existingPlayerError } = await supabase
    .from("players")
    .select("id, lobby_id")
    .eq("id", body.player_id)
    .maybeSingle();

  if (existingPlayerError) {
    return jsonResponse({ error: "Failed to check player session" }, 500, req);
  }

  if (existingPlayer) {
    const { data: existingLobby, error: existingLobbyError } = await supabase
      .from("lobbies")
      .select("status, code")
      .eq("id", existingPlayer.lobby_id)
      .maybeSingle();

    if (existingLobbyError) {
      return jsonResponse({ error: "Failed to check player session" }, 500, req);
    }

    if (existingLobby && existingLobby.status !== "closed") {
      if (existingLobby.code === normalizedCode) {
        const { data: playerRow } = await supabase
          .from("players")
          .select("is_host, display_name")
          .eq("id", body.player_id)
          .single();

        let sessionToken: string;
        try {
          sessionToken = await mintPlayerSessionToken(
            body.player_id,
            existingPlayer.lobby_id,
          );
        } catch {
          return jsonResponse({ error: "Server configuration error" }, 500, req);
        }

        return jsonResponse({
          code: normalizedCode,
          lobby_id: existingPlayer.lobby_id,
          player_id: body.player_id,
          display_name: playerRow?.display_name ?? nameResult.name,
          is_host: playerRow?.is_host ?? false,
          session_token: sessionToken,
        }, 200, req);
      }

      return jsonResponse(
        { error: "Player is already in an active lobby" },
        409,
        req,
      );
    }
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, code, status, max_players")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (lobbyError) {
    return jsonResponse({ error: "Failed to find lobby" }, 500, req);
  }

  if (!lobby) {
    return jsonResponse({ error: "Lobby not found" }, 404, req);
  }

  if (lobby.status !== "waiting") {
    return jsonResponse({ error: "Lobby is not accepting players" }, 403, req);
  }

  const { count: playerCount, error: countError } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("lobby_id", lobby.id);

  if (countError) {
    return jsonResponse({ error: "Failed to check lobby capacity" }, 500, req);
  }

  if ((playerCount ?? 0) >= lobby.max_players) {
    return jsonResponse({ error: "Lobby is full" }, 409, req);
  }

  const { data: duplicateName, error: duplicateNameError } = await supabase
    .from("players")
    .select("id")
    .eq("lobby_id", lobby.id)
    .ilike("display_name", nameResult.name)
    .maybeSingle();

  if (duplicateNameError) {
    return jsonResponse({ error: "Failed to check display name" }, 500, req);
  }

  if (duplicateName) {
    return jsonResponse(
      { error: "Display name is already taken in this lobby" },
      409,
      req,
    );
  }

  if (existingPlayer) {
    const { error: updatePlayerError } = await supabase
      .from("players")
      .update({
        display_name: nameResult.name,
        lobby_id: lobby.id,
        is_host: false,
        is_connected: true,
        last_seen_at: new Date().toISOString(),
      })
      .eq("id", body.player_id);

    if (updatePlayerError) {
      return jsonResponse({ error: "Failed to join lobby" }, 500, req);
    }
  } else {
    const { error: insertPlayerError } = await supabase.from("players").insert({
      id: body.player_id,
      display_name: nameResult.name,
      lobby_id: lobby.id,
      is_host: false,
      is_connected: true,
    });

    if (insertPlayerError) {
      if (insertPlayerError.code === "23505") {
        return jsonResponse(
          { error: "Display name is already taken in this lobby" },
          409,
          req,
        );
      }

      return jsonResponse({ error: "Failed to join lobby" }, 500, req);
    }
  }

  let sessionToken: string;
  try {
    sessionToken = await mintPlayerSessionToken(body.player_id, lobby.id);
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500, req);
  }

  return jsonResponse({
    code: lobby.code,
    lobby_id: lobby.id,
    player_id: body.player_id,
    display_name: nameResult.name,
    is_host: false,
    session_token: sessionToken,
  }, 200, req);
});
