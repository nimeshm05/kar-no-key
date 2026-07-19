function resolveAllowOrigin(req?: Request): string {
  const configured = Deno.env.get("CORS_ALLOWED_ORIGINS")?.trim();
  if (!configured) {
    return "*";
  }

  const allowed = configured
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (allowed.length === 0) {
    return "*";
  }

  const requestOrigin = req?.headers.get("Origin");
  if (requestOrigin && allowed.includes(requestOrigin)) {
    return requestOrigin;
  }

  // Single configured origin works for production without echoing a disallowed Origin.
  return allowed[0]!;
}

export function corsHeadersFor(req?: Request): Record<string, string> {
  const allowOrigin = resolveAllowOrigin(req);
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
  };

  if (Deno.env.get("CORS_ALLOWED_ORIGINS")?.trim()) {
    headers.Vary = "Origin";
  }

  return headers;
}

/** @deprecated Prefer corsHeadersFor(req) so Origin matching works with CORS_ALLOWED_ORIGINS. */
export const corsHeaders: Record<string, string> = corsHeadersFor();

export function jsonResponse(
  body: unknown,
  status = 200,
  req?: Request,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeadersFor(req), "Content-Type": "application/json" },
  });
}

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeadersFor(req) });
  }
  return null;
}
