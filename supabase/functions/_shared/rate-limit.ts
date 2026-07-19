import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

const FAIL_CLOSED_RETRY_SEC = 60;

export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  maxRequests: number,
  windowMs: number,
): Promise<RateLimitResult> {
  const now = Date.now();

  const { data: existing, error: selectError } = await supabase
    .from("rate_limits")
    .select("key, count, window_start")
    .eq("key", key)
    .maybeSingle();

  if (selectError) {
    console.error("rate_limit select failed", selectError.message);
    return { ok: false, retryAfterSec: FAIL_CLOSED_RETRY_SEC };
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("rate_limits").insert({
      key,
      count: 1,
      window_start: new Date(now).toISOString(),
    });

    if (insertError) {
      console.error("rate_limit insert failed", insertError.message);
      return { ok: false, retryAfterSec: FAIL_CLOSED_RETRY_SEC };
    }

    return { ok: true };
  }

  const windowStartMs = new Date(existing.window_start).getTime();
  const elapsedMs = now - windowStartMs;

  if (elapsedMs >= windowMs) {
    const { error: resetError } = await supabase
      .from("rate_limits")
      .update({
        count: 1,
        window_start: new Date(now).toISOString(),
      })
      .eq("key", key);

    if (resetError) {
      console.error("rate_limit reset failed", resetError.message);
      return { ok: false, retryAfterSec: FAIL_CLOSED_RETRY_SEC };
    }

    return { ok: true };
  }

  if (existing.count >= maxRequests) {
    const retryAfterMs = windowMs - elapsedMs;
    return {
      ok: false,
      retryAfterSec: Math.max(1, Math.ceil(retryAfterMs / 1000)),
    };
  }

  const { error: updateError } = await supabase
    .from("rate_limits")
    .update({ count: existing.count + 1 })
    .eq("key", key);

  if (updateError) {
    console.error("rate_limit update failed", updateError.message);
    return { ok: false, retryAfterSec: FAIL_CLOSED_RETRY_SEC };
  }

  return { ok: true };
}

export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const firstIp = forwarded.split(",")[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  return req.headers.get("x-real-ip");
}
