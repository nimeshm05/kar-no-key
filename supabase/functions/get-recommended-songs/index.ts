import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { getRecommendedSongs } from "../_shared/song-providers/index.ts";

const PLAYER_LIMIT = 10;
const PLAYER_WINDOW_MS = 60_000;
const DEFAULT_PAGE_SIZE = 6;
const MAX_PAGE_SIZE = 25;

type GetRecommendedSongsRequest = {
  player_id?: string;
  offset?: number;
  limit?: number;
};

function clampLimit(limit: number | undefined): number {
  if (limit === undefined) {
    return DEFAULT_PAGE_SIZE;
  }

  return Math.min(Math.max(limit, 1), MAX_PAGE_SIZE);
}

function clampOffset(offset: number | undefined): number {
  if (offset === undefined) {
    return 0;
  }

  return Math.max(offset, 0);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: GetRecommendedSongsRequest;
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

  if (body.offset !== undefined && typeof body.offset !== "number") {
    return jsonResponse({ error: "offset must be a number" }, 400, req);
  }

  if (body.limit !== undefined && typeof body.limit !== "number") {
    return jsonResponse({ error: "limit must be a number" }, 400, req);
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
    return jsonResponse({ error: "Only the host can view recommended songs" }, 403, req);
  }

  if (!lobby.song_selection_started) {
    return jsonResponse({ error: "Song selection has not started" }, 403, req);
  }

  if (lobby.status !== "waiting") {
    return jsonResponse(
      { error: "Recommended songs are only available during song selection" },
      403,
      req,
    );
  }

  const playerRateLimit = await checkRateLimit(
    supabase,
    `get-recommended-songs:player:${body.player_id}`,
    PLAYER_LIMIT,
    PLAYER_WINDOW_MS,
  );

  if (!playerRateLimit.ok) {
    return jsonResponse(
      {
        error: `Too many requests. Try again in ${playerRateLimit.retryAfterSec} seconds.`,
      },
      429,
      req,
    );
  }

  const offset = clampOffset(body.offset);
  const limit = clampLimit(body.limit);

  try {
    const result = await getRecommendedSongs(offset, limit);
    return jsonResponse(result, 200, req);
  } catch (error) {
    console.error("get-recommended-songs failed", error);
    return jsonResponse(
      { error: "Failed to load recommended songs" },
      500,
      req,
    );
  }
});
