import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { requireLobbyPlayer } from "../_shared/lobby-state.ts";

const COUNTDOWN_SECONDS = 3;

type StartCountdownRequest = {
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

  let body: StartCountdownRequest;
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

  const auth = await requireLobbyPlayer(body.player_id);
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status);
  }

  const { supabase, player, lobby } = auth;

  if (!player.is_host) {
    return jsonResponse({ error: "Only the host can start the countdown" }, 403);
  }

  if (lobby.status !== "ready" && lobby.status !== "countdown") {
    return jsonResponse(
      { error: "Countdown can only start when lobby is ready" },
      403,
    );
  }

  if (!lobby.selected_youtube_video_id) {
    return jsonResponse({ error: "No song selected" }, 400);
  }

  if (lobby.countdown_start_at && lobby.playback_start_at) {
    return jsonResponse({
      lobby_id: lobby.id,
      code: lobby.code,
      status: "countdown",
      countdown_start_at: lobby.countdown_start_at,
      playback_start_at: lobby.playback_start_at,
      server_now: new Date().toISOString(),
    });
  }

  const now = new Date();
  const playbackStart = new Date(now.getTime() + COUNTDOWN_SECONDS * 1000);

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      status: "countdown",
      countdown_start_at: now.toISOString(),
      playback_start_at: playbackStart.toISOString(),
      updated_at: now.toISOString(),
    })
    .eq("id", lobby.id);

  if (updateError) {
    return jsonResponse({ error: "Failed to start countdown" }, 500);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    status: "countdown",
    countdown_start_at: now.toISOString(),
    playback_start_at: playbackStart.toISOString(),
    server_now: now.toISOString(),
  });
});
