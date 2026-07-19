import { searchSongs as searchSongsApi, type SongResult } from "@/lib/supabase/functions";

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

export async function searchSongs(
  playerId: string,
  query: string,
  options: {
    limit?: number;
    offset?: number;
    pageToken?: string;
  } = {},
): Promise<
  | { songs: SongResult[]; hasMore: boolean; nextPageToken?: string }
  | { error: string }
> {
  const { data, error } = await searchSongsApi(playerId, query, {
    limit: options.limit ?? DEFAULT_PAGE_SIZE,
    offset: options.offset,
    pageToken: options.pageToken,
  });

  if (error || !data || "error" in data) {
    return { error: getErrorMessage(error, data) };
  }

  return {
    songs: data.songs,
    hasMore: data.has_more,
    nextPageToken: data.next_page_token,
  };
}

export type { SongResult };
