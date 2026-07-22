import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  getEffectiveLobbyStatus,
  getSessionTokenFromBody,
  requireLobbyPlayer,
} from "../_shared/lobby-state.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { checkRateLimit } from "../_shared/rate-limit.ts";
import { broadcastScoreUpdate } from "../_shared/scoring/broadcast.ts";
import {
  computePlaybackElapsedMs,
  FIRST_FINISH_BONUS_POINTS,
  getActivePhraseIndex,
  scorePhraseProgress,
} from "../_shared/scoring/scoring.ts";
import type { LyricPhrase } from "../_shared/scoring/types.ts";

type SubmitPhraseProgressRequest = {
  player_id?: string;
  phrase_index?: number;
  typed_text?: string;
  finalize?: boolean;
  typing_ms_delta?: number;
};

type ProgressRow = {
  id: string;
  scored_char_indices: number[];
  attempted_char_indices: number[];
  phrase_bonus_awarded: boolean;
  finalized: boolean;
};

const RATE_LIMIT_MAX = 20;
const RATE_LIMIT_WINDOW_MS = 10_000;
const MAX_TYPING_MS_DELTA = 30_000;

function clampTypingMsDelta(value: unknown): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(Math.floor(value), MAX_TYPING_MS_DELTA);
}

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: SubmitPhraseProgressRequest;
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

  if (typeof body.phrase_index !== "number" || !Number.isInteger(body.phrase_index)) {
    return jsonResponse({ error: "Missing or invalid phrase_index" }, 400, req);
  }

  if (body.phrase_index < 0) {
    return jsonResponse({ error: "Invalid phrase_index" }, 400, req);
  }

  if (typeof body.typed_text !== "string") {
    return jsonResponse({ error: "Missing typed_text" }, 400, req);
  }

  const finalize = body.finalize === true;
  const typingMsDelta = clampTypingMsDelta(body.typing_ms_delta);

  const auth = await requireLobbyPlayer(
    body.player_id,
    getSessionTokenFromBody(body),
  );
  if (!auth.ok) {
    return jsonResponse({ error: auth.error }, auth.status, req);
  }

  const { supabase, player, lobby } = auth;

  const rateLimit = await checkRateLimit(
    supabase,
    `submit-phrase-progress:${body.player_id}`,
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

  const effectiveStatus = getEffectiveLobbyStatus(lobby);

  if (!lobby.selected_youtube_video_id) {
    return jsonResponse({ error: "No song is currently selected" }, 400, req);
  }

  if (effectiveStatus !== "playing" && !finalize) {
    return jsonResponse({ error: "Scoring is only available while playing" }, 403, req);
  }

  if (effectiveStatus === "finished") {
    return jsonResponse({ error: "Race is finished" }, 403, req);
  }

  const { data: songRow, error: songError } = await supabase
    .from("songs")
    .select("youtube_video_id, lyrics_phrases")
    .eq("youtube_video_id", lobby.selected_youtube_video_id)
    .maybeSingle();

  if (songError || !songRow) {
    return jsonResponse({ error: "Failed to load song lyrics" }, 500, req);
  }

  const phrases = (songRow.lyrics_phrases ?? []) as LyricPhrase[];

  if (body.phrase_index >= phrases.length) {
    return jsonResponse({ error: "Invalid phrase_index" }, 400, req);
  }

  const expectedPhrase = phrases[body.phrase_index];
  const nowMs = Date.now();
  const elapsedMs = computePlaybackElapsedMs(
    lobby.playback_start_at,
    lobby.playback_elapsed_ms ?? 0,
    nowMs,
    effectiveStatus === "playing",
  );
  const activePhraseIndex = getActivePhraseIndex(phrases, elapsedMs);

  if (body.phrase_index > activePhraseIndex) {
    return jsonResponse({ error: "Cannot score a future phrase" }, 403, req);
  }

  const { data: existingProgress, error: progressSelectError } = await supabase
    .from("player_phrase_progress")
    .select(
      "id, scored_char_indices, attempted_char_indices, phrase_bonus_awarded, finalized",
    )
    .eq("player_id", player.id)
    .eq("lobby_id", lobby.id)
    .eq("youtube_video_id", lobby.selected_youtube_video_id)
    .eq("phrase_index", body.phrase_index)
    .maybeSingle();

  if (progressSelectError) {
    return jsonResponse({ error: "Failed to load phrase progress" }, 500, req);
  }

  const progressRow: ProgressRow = existingProgress ?? {
    id: "",
    scored_char_indices: [],
    attempted_char_indices: [],
    phrase_bonus_awarded: false,
    finalized: false,
  };

  const canScoreChars =
    effectiveStatus === "playing" &&
    body.phrase_index === activePhraseIndex &&
    !progressRow.finalized;

  const scoreResult = scorePhraseProgress(
    expectedPhrase.text,
    body.typed_text,
    {
      scored_char_indices: progressRow.scored_char_indices ?? [],
      attempted_char_indices: progressRow.attempted_char_indices ?? [],
      phrase_bonus_awarded: progressRow.phrase_bonus_awarded,
      finalized: progressRow.finalized,
    },
    canScoreChars,
    finalize,
  );

  let firstFinishBonus = 0;

  if (scoreResult.phraseBonusAwarded) {
    const { error: claimError } = await supabase
      .from("phrase_first_finish")
      .insert({
        lobby_id: lobby.id,
        youtube_video_id: lobby.selected_youtube_video_id,
        phrase_index: body.phrase_index,
        player_id: player.id,
      });

    if (!claimError) {
      firstFinishBonus = FIRST_FINISH_BONUS_POINTS;
    }
  }

  const totalPointsAwarded = scoreResult.pointsAwarded + firstFinishBonus;

  if (
    totalPointsAwarded === 0 &&
    !scoreResult.finalized &&
    !finalize &&
    scoreResult.correctCharsDelta === 0 &&
    scoreResult.attemptedCharsDelta === 0 &&
    typingMsDelta === 0
  ) {
    const { data: playerRow } = await supabase
      .from("players")
      .select("score, phrases_completed")
      .eq("id", player.id)
      .maybeSingle();

    return jsonResponse({
      score: playerRow?.score ?? 0,
      phrases_completed: playerRow?.phrases_completed ?? 0,
      points_awarded: 0,
      phrase_bonus_awarded: false,
      first_finish_bonus_awarded: false,
    }, 200, req);
  }

  const progressUpdate = {
    player_id: player.id,
    lobby_id: lobby.id,
    youtube_video_id: lobby.selected_youtube_video_id,
    phrase_index: body.phrase_index,
    scored_char_indices: scoreResult.scoredCharIndices,
    attempted_char_indices: scoreResult.attemptedCharIndices,
    phrase_bonus_awarded:
      progressRow.phrase_bonus_awarded || scoreResult.phraseBonusAwarded,
    finalized: scoreResult.finalized,
    updated_at: new Date(nowMs).toISOString(),
  };

  if (existingProgress) {
    const { error: progressUpdateError } = await supabase
      .from("player_phrase_progress")
      .update(progressUpdate)
      .eq("id", existingProgress.id);

    if (progressUpdateError) {
      return jsonResponse({ error: "Failed to update phrase progress" }, 500, req);
    }
  } else {
    const { error: progressInsertError } = await supabase
      .from("player_phrase_progress")
      .insert(progressUpdate);

    if (progressInsertError) {
      return jsonResponse({ error: "Failed to save phrase progress" }, 500, req);
    }
  }

  const { data: playerRow, error: playerSelectError } = await supabase
    .from("players")
    .select("score, phrases_completed, correct_chars, attempted_chars, typing_ms")
    .eq("id", player.id)
    .maybeSingle();

  if (playerSelectError || !playerRow) {
    return jsonResponse({ error: "Failed to load player score" }, 500, req);
  }

  const newScore = (playerRow.score ?? 0) + totalPointsAwarded;
  const newPhrasesCompleted =
    (playerRow.phrases_completed ?? 0) + scoreResult.phrasesCompletedDelta;
  const newCorrectChars =
    (playerRow.correct_chars ?? 0) + scoreResult.correctCharsDelta;
  const newAttemptedChars =
    (playerRow.attempted_chars ?? 0) + scoreResult.attemptedCharsDelta;
  const newTypingMs = (playerRow.typing_ms ?? 0) + typingMsDelta;

  const { error: playerUpdateError } = await supabase
    .from("players")
    .update({
      score: newScore,
      phrases_completed: newPhrasesCompleted,
      correct_chars: newCorrectChars,
      attempted_chars: newAttemptedChars,
      typing_ms: newTypingMs,
    })
    .eq("id", player.id);

  if (playerUpdateError) {
    return jsonResponse({ error: "Failed to update player score" }, 500, req);
  }

  if (totalPointsAwarded > 0) {
    try {
      await broadcastScoreUpdate(supabase, lobby.id, {
        player_id: player.id,
        score: newScore,
        phrases_completed: newPhrasesCompleted,
        delta: totalPointsAwarded,
      });
    } catch {
      // Score is persisted; broadcast failure should not fail the request.
    }
  }

  return jsonResponse({
    score: newScore,
    phrases_completed: newPhrasesCompleted,
    points_awarded: totalPointsAwarded,
    phrase_bonus_awarded: scoreResult.phraseBonusAwarded,
    first_finish_bonus_awarded: firstFinishBonus > 0,
  }, 200, req);
});
