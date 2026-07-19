import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  isValidLobbyCodeFormat,
  normalizeLobbyCode,
} from "../_shared/lobby-code.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

const RATE_LIMIT_MAX = 30;
const RATE_LIMIT_WINDOW_MS = 60_000;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, req);
  }

  if (!body.code || typeof body.code !== "string") {
    return jsonResponse(
      { valid: false, error: "Missing lobby code" },
      400,
      req,
    );
  }

  const normalizedCode = normalizeLobbyCode(body.code);

  if (!isValidLobbyCodeFormat(normalizedCode)) {
    return jsonResponse(
      { valid: false, error: "Invalid lobby code format" },
      400,
      req,
    );
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
    `validate-lobby-code:${clientIp}`,
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

  const { data, error } = await supabase
    .from("lobbies")
    .select("status")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: "Failed to validate lobby code" }, 500, req);
  }

  if (!data) {
    return jsonResponse({ valid: true, exists: false }, 200, req);
  }

  return jsonResponse({
    valid: true,
    exists: true,
    status: data.status,
  }, 200, req);
});
