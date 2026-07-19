import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  generateUniqueCode,
  LobbyCodeGenerationError,
} from "../_shared/lobby-code.ts";
import { checkRateLimit, getClientIp } from "../_shared/rate-limit.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
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
    `generate-lobby-code:${clientIp}`,
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

  try {
    const code = await generateUniqueCode(supabase);
    return jsonResponse({ code }, 200, req);
  } catch (error) {
    if (error instanceof LobbyCodeGenerationError) {
      return jsonResponse({ error: error.message }, 500, req);
    }

    return jsonResponse({ error: "Failed to generate lobby code" }, 500, req);
  }
});
