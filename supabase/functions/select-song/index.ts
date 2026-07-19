import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import {
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { resolveLyricsForVideo } from "../_shared/lyrics/lrclib.ts";
import {
  fetchYouTubeVideoMetadata,
} from "../_shared/song-providers/youtube.ts";

type SelectSongRequest = {
  player_id?: string;
  youtube_video_id?: string;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: SelectSongRequest;
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

  if (!body.youtube_video_id || typeof body.youtube_video_id !== "string") {
    return jsonResponse({ error: "Missing youtube_video_id" }, 400, req);
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
    return jsonResponse({ error: "Only the host can select a song" }, 403, req);
  }

  if (!lobby.song_selection_started) {
    return jsonResponse({ error: "Song selection has not started" }, 403, req);
  }

  if (lobby.status !== "waiting" && lobby.status !== "ready") {
    return jsonResponse(
      { error: "Song can only be selected before the game starts" },
      403,
      req,
    );
  }

  const videoId = body.youtube_video_id.trim();

  const { data: cachedSong } = await supabase
    .from("songs")
    .select(
      "youtube_video_id, title, channel, thumbnail_url, duration_sec, lyrics_phrases, lyrics_source",
    )
    .eq("youtube_video_id", videoId)
    .maybeSingle();

  let song = cachedSong;

  if (!song) {
    const metadata = await fetchYouTubeVideoMetadata(videoId);
    if (!metadata || !metadata.duration_sec) {
      return jsonResponse({ error: "Could not load video metadata" }, 404, req);
    }

    const lyrics = await resolveLyricsForVideo(
      metadata.title,
      metadata.duration_sec,
    );

    if (!lyrics || lyrics.phrases.length === 0) {
      return jsonResponse(
        {
          error: "Lyrics unavailable for this video — pick another result",
          has_lyrics: false,
        },
        422,
        req,
      );
    }

    const { data: insertedSong, error: insertError } = await supabase
      .from("songs")
      .insert({
        youtube_video_id: videoId,
        title: metadata.title,
        channel: metadata.channel ?? null,
        thumbnail_url: metadata.thumbnail_url ?? null,
        duration_sec: metadata.duration_sec,
        lyrics_phrases: lyrics.phrases,
        lyrics_source: lyrics.lyrics_source,
      })
      .select(
        "youtube_video_id, title, channel, thumbnail_url, duration_sec, lyrics_phrases, lyrics_source",
      )
      .single();

    if (insertError || !insertedSong) {
      return jsonResponse({ error: "Failed to cache song" }, 500, req);
    }

    song = insertedSong;
  } else if (
    !Array.isArray(song.lyrics_phrases) ||
    song.lyrics_phrases.length === 0
  ) {
    return jsonResponse(
      {
        error: "Lyrics unavailable for this video — pick another result",
        has_lyrics: false,
      },
      422,
      req,
    );
  }

  const { error: updateError } = await supabase
    .from("lobbies")
    .update({
      selected_youtube_video_id: videoId,
      status: "ready",
      countdown_start_at: null,
      playback_start_at: null,
      playback_elapsed_ms: 0,
      updated_at: new Date().toISOString(),
    })
    .eq("id", lobby.id);

  if (updateError) {
    return jsonResponse({ error: "Failed to update lobby" }, 500, req);
  }

  return jsonResponse({
    lobby_id: lobby.id,
    code: lobby.code,
    status: "ready",
    song: {
      youtube_video_id: song.youtube_video_id,
      title: song.title,
      channel: song.channel,
      thumbnail_url: song.thumbnail_url,
      duration_sec: song.duration_sec,
      lyrics_phrases: song.lyrics_phrases,
      lyrics_source: song.lyrics_source,
    },
  }, 200, req);
});
