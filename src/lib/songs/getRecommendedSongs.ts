import {
  getRecommendedSongs as getRecommendedSongsApi,
  type SongResult,
} from "@/lib/supabase/functions";

const DEFAULT_PAGE_SIZE = 6;

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
  options: { offset?: number; limit?: number } = {},
): Promise<
  { songs: SongResult[]; hasMore: boolean } | { error: string }
> {
  const { data, error } = await getRecommendedSongsApi(playerId, {
    offset: options.offset ?? 0,
    limit: options.limit ?? DEFAULT_PAGE_SIZE,
  });

  if (error || !data || "error" in data) {
    return { error: getErrorMessage(error, data) };
  }

  return { songs: data.songs, hasMore: data.has_more };
}

export type { SongResult };
