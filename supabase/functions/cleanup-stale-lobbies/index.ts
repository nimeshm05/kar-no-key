import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  deleteEmptyLobbies,
  pruneStalePlayers,
} from "../_shared/player-leave.ts";
import { createSupabaseAdmin } from "../_shared/supabase-admin.ts";

/**
 * Scheduled cleanup for abandoned lobbies (Option C hybrid host disconnect).
 *
 * Schedule in Supabase Dashboard → Edge Functions → cleanup-stale-lobbies →
 * Cron: every minute (`* * * * *`), with header:
 *   Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>
 *
 * verify_jwt should be disabled for this function; auth is the service role bearer.
 */
Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, req);
  }

  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const authHeader = req.headers.get("Authorization") ?? "";
  const expected = serviceRoleKey ? `Bearer ${serviceRoleKey}` : "";

  if (!serviceRoleKey || authHeader !== expected) {
    return jsonResponse({ error: "Unauthorized" }, 401, req);
  }

  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return jsonResponse({ error: "Server configuration error" }, 500, req);
  }

  const now = new Date();

  const { data: lobbies, error: lobbiesError } = await supabase
    .from("lobbies")
    .select("id, status");

  if (lobbiesError) {
    return jsonResponse({ error: "Failed to list lobbies" }, 500, req);
  }

  let prunedLobbies = 0;

  for (const lobby of lobbies ?? []) {
    await pruneStalePlayers(supabase, lobby.id, now, lobby.status);
    prunedLobbies += 1;
  }

  const emptyDeleted = await deleteEmptyLobbies(supabase);

  return jsonResponse({
    ok: true,
    lobbies_checked: prunedLobbies,
    empty_lobbies_deleted: emptyDeleted,
    ran_at: now.toISOString(),
  }, 200, req);
});
