import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import {
  getEffectiveLobbyStatus,
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";

type GetLobbyStateRequest = {
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

  let body: GetLobbyStateRequest;
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

  const { supabase, lobby } = auth;
  const serverNow = new Date();
  const effectiveStatus = getEffectiveLobbyStatus(lobby, serverNow.getTime());

  if (
    effectiveStatus === "playing" &&
    lobby.status === "countdown"
  ) {
    await supabase
      .from("lobbies")
      .update({
        status: "playing",
        updated_at: serverNow.toISOString(),
      })
      .eq("id", lobby.id);
  }

  const { data: players, error: playersError } = await supabase
    .from("players")
    .select("id, display_name, is_host, is_connected, score, phrases_completed")
    .eq("lobby_id", lobby.id)
    .order("joined_at", { ascending: true });

  if (playersError) {
    return jsonResponse({ error: "Failed to load lobby players" }, 500, req);
  }

  let song = null;
  if (lobby.selected_youtube_video_id) {
    const { data: songRow } = await supabase
      .from("songs")
      .select(
        "youtube_video_id, title, channel, thumbnail_url, duration_sec, lyrics_phrases, lyrics_source",
      )
      .eq("youtube_video_id", lobby.selected_youtube_video_id)
      .maybeSingle();

    if (songRow) {
      song = {
        youtube_video_id: songRow.youtube_video_id,
        title: songRow.title,
        channel: songRow.channel,
        thumbnail_url: songRow.thumbnail_url,
        duration_sec: songRow.duration_sec,
        lyrics_phrases: songRow.lyrics_phrases,
        lyrics_source: songRow.lyrics_source,
      };
    }
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    status: effectiveStatus,
    max_players: lobby.max_players,
    song_selection_started: lobby.song_selection_started,
    selected_youtube_video_id: lobby.selected_youtube_video_id,
    countdown_start_at: lobby.countdown_start_at,
    playback_start_at: lobby.playback_start_at,
    playback_elapsed_ms: lobby.playback_elapsed_ms ?? 0,
    server_now: serverNow.toISOString(),
    song,
    players: (players ?? []).map((row) => ({
      player_id: row.id,
      display_name: row.display_name,
      is_host: row.is_host,
      is_connected: row.is_connected,
      score: row.score,
      phrases_completed: row.phrases_completed,
    })),
  }, 200, req);
});
