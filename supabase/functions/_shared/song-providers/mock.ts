import type { SongResult, SongSearchProvider } from "./types.ts";

export const MOCK_SONGS: SongResult[] = [
  {
    id: "mock-1",
    title: "More than friends (with Honne) Audio Only",
    artist: "Honne",
  },
  {
    id: "mock-2",
    title: "Coldplay Fix You (Official Video)",
    artist: "Coldplay",
  },
  {
    id: "mock-3",
    title: "My Way (2008 Remastered)",
    artist: "Frank Sinatra",
  },
  {
    id: "mock-4",
    title: "My Way (2008 Remastered)",
    artist: "Frank Sinatra",
  },
  {
    id: "mock-5",
    title: "My Way (2008 Remastered)",
    artist: "Frank Sinatra",
  },
  {
    id: "mock-6",
    title: "My Way (2008 Remastered)",
    artist: "Frank Sinatra",
  },
];

export const mockSongProvider: SongSearchProvider = {
  async searchSongs(query: string, limit: number): Promise<SongResult[]> {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return MOCK_SONGS.slice(0, limit);
    }

    return MOCK_SONGS.filter((song) => {
      const haystack = `${song.title} ${song.artist ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    }).slice(0, limit);
  },
};

export function getMockRecommendedSongs(): SongResult[] {
  return [...MOCK_SONGS];
}
