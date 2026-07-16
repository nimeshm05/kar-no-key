import {
  getRecommendedSongs as getRecommendedSongsApi,
  type SongResult,
} from "@/lib/supabase/functions";

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

export async function getRecommendedSongs(
  playerId: string,
): Promise<{ songs: SongResult[] } | { error: string }> {
  const { data, error } = await getRecommendedSongsApi(playerId);

  if (error || !data || "error" in data) {
    return { error: getErrorMessage(error, data) };
  }

  return { songs: data.songs };
}

export type { SongResult };
