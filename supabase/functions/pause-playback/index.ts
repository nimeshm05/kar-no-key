import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import {
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";

type PausePlaybackRequest = {
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

  let body: PausePlaybackRequest;
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
    return jsonResponse({ error: "Only the host can pause playback" }, 403, req);
  }

  if (lobby.status !== "playing" && lobby.status !== "countdown") {
    return jsonResponse(
      { error: "Playback can only be paused while playing or counting down" },
      403,
      req,
    );
  }

  const now = Date.now();
  let elapsedMs = lobby.playback_elapsed_ms ?? 0;

  if (
    lobby.status === "playing" &&
    lobby.playback_start_at
  ) {
    const playbackStartMs = new Date(lobby.playback_start_at).getTime();
    elapsedMs += Math.max(0, now - playbackStartMs);
  }

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      status: "ready",
      playback_elapsed_ms: elapsedMs,
      countdown_start_at: null,
      playback_start_at: null,
      updated_at: new Date(now).toISOString(),
    })
    .eq("id", lobby.id);

  if (updateError) {
    return jsonResponse({ error: "Failed to pause playback" }, 500, req);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    status: "ready",
    playback_elapsed_ms: elapsedMs,
    server_now: new Date(now).toISOString(),
  }, 200, req);
});
