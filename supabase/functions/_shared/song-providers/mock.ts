import type {
  PaginatedSongResults,
  SongResult,
  SongSearchProvider,
} from "./types.ts";

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
  {
    id: "mock-7",
    title: "Bohemian Rhapsody (Official Video)",
    artist: "Queen",
  },
  {
    id: "mock-8",
    title: "Someone Like You",
    artist: "Adele",
  },
  {
    id: "mock-9",
    title: "Don't Stop Believin'",
    artist: "Journey",
  },
  {
    id: "mock-10",
    title: "Shape of You",
    artist: "Ed Sheeran",
  },
  {
    id: "mock-11",
    title: "Blinding Lights",
    artist: "The Weeknd",
  },
  {
    id: "mock-12",
    title: "Levitating",
    artist: "Dua Lipa",
  },
];

function paginateSongs(
  songs: SongResult[],
  offset: number,
  limit: number,
): PaginatedSongResults {
  const page = songs.slice(offset, offset + limit);
  return {
    songs: page,
    has_more: offset + page.length < songs.length,
  };
}

export const mockSongProvider: SongSearchProvider = {
  async searchSongs(
    query: string,
    limit: number,
    options: { offset?: number; pageToken?: string } = {},
  ): Promise<PaginatedSongResults> {
    const offset = options.offset ?? 0;
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return paginateSongs(MOCK_SONGS, offset, limit);
    }

    const filtered = MOCK_SONGS.filter((song) => {
      const haystack = `${song.title} ${song.artist ?? ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });

    return paginateSongs(filtered, offset, limit);
  },
};

export function getMockRecommendedSongs(
  offset = 0,
  limit = 6,
): PaginatedSongResults {
  return paginateSongs(MOCK_SONGS, offset, limit);
}
