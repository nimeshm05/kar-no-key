import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

export type RateLimitResult =
  | { ok: true }
  | { ok: false; retryAfterSec: number };

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
    return { ok: true };
  }

  if (!existing) {
    const { error: insertError } = await supabase.from("rate_limits").insert({
      key,
      count: 1,
      window_start: new Date(now).toISOString(),
    });

    if (insertError) {
      return { ok: true };
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
      return { ok: true };
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
    return { ok: true };
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
