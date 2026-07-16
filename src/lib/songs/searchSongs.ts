import { searchSongs as searchSongsApi, type SongResult } from "@/lib/supabase/functions";

function getErrorMessage(error: unknown, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error: unknown }).error;
    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export async function searchSongs(
  query: string,
  limit = 10,
): Promise<{ songs: SongResult[] } | { error: string }> {
  const { data, error } = await searchSongsApi(query, limit);

  if (error || !data || "error" in data) {
    return { error: getErrorMessage(error, data) };
  }

  return { songs: data.songs };
}

export type { SongResult };
