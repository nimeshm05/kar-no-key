import { createClient } from "npm:@supabase/supabase-js@2";
import { handleCors, jsonResponse } from "../_shared/cors.ts";
import {
  generateUniqueCode,
  LobbyCodeGenerationError,
} from "../_shared/lobby-code.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return jsonResponse({ error: "Server configuration error" }, 500);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const code = await generateUniqueCode(supabase);
    return jsonResponse({ code });
  } catch (error) {
    if (error instanceof LobbyCodeGenerationError) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ error: "Failed to generate lobby code" }, 500);
  }
});
