import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";

type SubmitFeedbackRequest = {
  player_id?: string;
  message?: string;
  rating?: number;
  session_token?: string;
};

const RATE_LIMIT_MAX = 5;
const RATE_LIMIT_WINDOW_MS = 60_000;
const MAX_MESSAGE_LENGTH = 2000;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: SubmitFeedbackRequest;
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

  if (typeof body.message !== "string") {
    return jsonResponse({ error: "Missing message" }, 400, req);
  }

  const message = body.message.trim();
  if (message.length < 1 || message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse(
      { error: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters` },
      400,
      req,
    );
  }

  if (
    typeof body.rating !== "number" ||
    !Number.isInteger(body.rating) ||
    body.rating < 1 ||
    body.rating > 5
  ) {
    return jsonResponse({ error: "Rating must be an integer from 1 to 5" }, 400, req);
  }

  const auth = await requireLobbyPlayer(
    body.player_id,
    getSessionTokenFromBody(body),
  );

  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status, req);
  }

  const rateLimit = await checkRateLimit(
    auth.supabase,
    `submit-feedback:${body.player_id}`,
    RATE_LIMIT_MAX,
    RATE_LIMIT_WINDOW_MS,
  );

  if (!rateLimit.ok) {
    return jsonResponse(
      { error: "Too many feedback submissions. Please try again later." },
      429,
      req,
    );
  }

  const { error: insertError } = await auth.supabase.from("player_feedback").insert({
    player_id: body.player_id,
    lobby_id: auth.lobby.id,
    message,
    rating: body.rating,
  });

  if (insertError) {
    console.error("submit-feedback insert failed", insertError.message);
    return jsonResponse({ error: "Failed to submit feedback" }, 500, req);
  }

  return jsonResponse({ ok: true }, 200, req);
});
