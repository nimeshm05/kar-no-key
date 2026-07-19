import { getMockRecommendedSongs, mockSongProvider } from "./mock.ts";
import { getYouTubeRecommendedSongs, youtubeSongProvider } from "./youtube.ts";
import type {
  PaginatedSongResults,
  SongResult,
  SongSearchProvider,
} from "./types.ts";

function getProvider(): SongSearchProvider {
  const provider = Deno.env.get("SONG_SEARCH_PROVIDER") ?? "mock";

  switch (provider) {
    case "mock":
      return mockSongProvider;
    case "youtube":
      return youtubeSongProvider;
    default:
      throw new Error(`Unsupported song search provider: ${provider}`);
  }
}

function getProviderName(): string {
  return Deno.env.get("SONG_SEARCH_PROVIDER") ?? "mock";
}

export async function searchSongs(
  query: string,
  limit = 10,
  options: { offset?: number; pageToken?: string } = {},
): Promise<PaginatedSongResults> {
  const provider = getProvider();
  const clampedLimit = Math.min(Math.max(limit, 1), 25);
  return provider.searchSongs(query, clampedLimit, options);
}

export async function getRecommendedSongs(
  offset = 0,
  limit = 6,
): Promise<PaginatedSongResults> {
  const provider = getProviderName();
  const clampedLimit = Math.min(Math.max(limit, 1), 25);
  const clampedOffset = Math.max(offset, 0);

  switch (provider) {
    case "mock":
      return getMockRecommendedSongs(clampedOffset, clampedLimit);
    case "youtube":
      return getYouTubeRecommendedSongs(clampedOffset, clampedLimit);
    default:
      throw new Error(`Unsupported song search provider: ${provider}`);
  }
}

export type { SongResult, PaginatedSongResults };
