import { getMockRecommendedSongs, mockSongProvider } from "./mock.ts";
import { getYouTubeRecommendedSongs, youtubeSongProvider } from "./youtube.ts";
import type { SongResult, SongSearchProvider } from "./types.ts";

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
): Promise<SongResult[]> {
  const provider = getProvider();
  const clampedLimit = Math.min(Math.max(limit, 1), 25);
  return provider.searchSongs(query, clampedLimit);
}

export async function getRecommendedSongs(): Promise<SongResult[]> {
  const provider = getProviderName();

  switch (provider) {
    case "mock":
      return getMockRecommendedSongs();
    case "youtube":
      return getYouTubeRecommendedSongs();
    default:
      throw new Error(`Unsupported song search provider: ${provider}`);
  }
}
