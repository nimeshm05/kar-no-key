import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import {
  getEffectiveLobbyStatus,
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { finishRace } from "../_shared/scoring/finish-race.ts";

type EndSongRequest = {
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

  let body: EndSongRequest;
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
    return jsonResponse({ error: "Only the host can end the song" }, 403, req);
  }

  const effectiveStatus = getEffectiveLobbyStatus(lobby);

  if (!lobby.selected_youtube_video_id && lobby.status !== "finished") {
    return jsonResponse({ error: "No song is currently selected" }, 400, req);
  }

  // `ready` is the paused-after-start state (see pause-playback). Hosts can still end.
  if (
    effectiveStatus !== "playing" &&
    lobby.status !== "playing" &&
    lobby.status !== "countdown" &&
    lobby.status !== "ready" &&
    lobby.status !== "finished"
  ) {
    return jsonResponse({ error: "No active race to finish" }, 400, req);
  }

  try {
    const result = await finishRace(supabase, {
      id: lobby.id,
      code: lobby.code,
      // Keep paused (`ready`) as non-playing so finishRace uses stored elapsed ms.
      status: lobby.status === "countdown" ? "playing" : lobby.status,
      selected_youtube_video_id: lobby.selected_youtube_video_id,
      playback_start_at: lobby.playback_start_at,
      playback_elapsed_ms: lobby.playback_elapsed_ms ?? 0,
      awards_snapshot: lobby.awards_snapshot ?? null,
    });

    return jsonResponse({
      lobby_id: result.lobby_id,
      code: result.code,
      status: result.status,
      awards: result.awards,
      server_now: result.server_now,
    }, 200, req);
  } catch {
    return jsonResponse({ error: "Failed to finish race" }, 500, req);
  }
});
