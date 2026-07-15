import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders, handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  isValidLobbyCodeFormat,
  normalizeLobbyCode,
} from "../_shared/lobby-code.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: { code?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (!body.code || typeof body.code !== "string") {
    return jsonResponse(
      { valid: false, error: "Missing lobby code" },
      400,
    );
  }

  const normalizedCode = normalizeLobbyCode(body.code);

  if (!isValidLobbyCodeFormat(normalizedCode)) {
    return jsonResponse(
      { valid: false, error: "Invalid lobby code format" },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data, error } = await supabase
    .from("lobbies")
    .select("status")
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error) {
    return jsonResponse({ error: "Failed to validate lobby code" }, 500);
  }

  if (!data) {
    return jsonResponse({ valid: true, exists: false });
  }

  return jsonResponse({
    valid: true,
    exists: true,
    status: data.status,
  });
});
