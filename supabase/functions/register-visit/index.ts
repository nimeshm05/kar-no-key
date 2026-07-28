import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { isValidPlayerId } from "../_shared/player-id.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

type RegisterVisitRequest = {
  player_id?: string;
};

const RATE_LIMIT_MAX = 60;
const RATE_LIMIT_WINDOW_MS = 60_000;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: RegisterVisitRequest;
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

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500, req);
  }

  const clientIp = getClientIp(req) ?? "unknown";
  const rateLimit = await checkRateLimit(
    supabase,
    `register-visit:${clientIp}`,
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

  const now = new Date().toISOString();

  const { data: existingVisitor, error: existingError } = await supabase
    .from("app_visitors")
    .select("visit_count, first_seen_at")
    .eq("id", body.player_id)
    .maybeSingle();

  if (existingError) {
    return jsonResponse({ error: "Failed to register visit" }, 500, req);
  }

  if (!existingVisitor) {
    const { data, error: insertError } = await supabase
      .from("app_visitors")
      .insert({
        id: body.player_id,
        first_seen_at: now,
        last_seen_at: now,
        visit_count: 1,
      })
      .select("visit_count, first_seen_at")
      .single();

    if (insertError || !data) {
      return jsonResponse({ error: "Failed to register visit" }, 500, req);
    }

    return jsonResponse(
      {
        player_id: body.player_id,
        visit_count: data.visit_count,
        first_seen_at: data.first_seen_at,
        is_new_visitor: true,
      },
      200,
      req,
    );
  }

  const { data, error: updateError } = await supabase
    .from("app_visitors")
    .update({
      last_seen_at: now,
      visit_count: existingVisitor.visit_count + 1,
    })
    .eq("id", body.player_id)
    .select("visit_count, first_seen_at")
    .single();

  if (updateError || !data) {
    return jsonResponse({ error: "Failed to register visit" }, 500, req);
  }

  return jsonResponse(
    {
      player_id: body.player_id,
      visit_count: data.visit_count,
      first_seen_at: data.first_seen_at,
      is_new_visitor: false,
    },
    200,
    req,
  );
});
