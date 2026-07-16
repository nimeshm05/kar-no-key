import { handleCors, jsonResponse } from "../_shared/cors.ts";
import { searchSongs } from "../_shared/song-providers/index.ts";

type SearchSongsRequest = {
  query?: string;
  limit?: number;
};

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) {
    return corsResponse;
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  let body: SearchSongsRequest;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  if (body.query !== undefined && typeof body.query !== "string") {
    return jsonResponse({ error: "query must be a string" }, 400);
  }

  if (body.limit !== undefined && typeof body.limit !== "number") {
    return jsonResponse({ error: "limit must be a number" }, 400);
  }

  const query = body.query ?? "";
  const limit = body.limit ?? 10;

  try {
    const songs = await searchSongs(query, limit);
    return jsonResponse({ songs });
  } catch (error) {
    if (error instanceof Error) {
      return jsonResponse({ error: error.message }, 500);
    }

    return jsonResponse({ error: "Failed to search songs" }, 500);
  }
});
