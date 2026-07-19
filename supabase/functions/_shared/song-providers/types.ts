export type SongResult = {
  id: string;
  title: string;
  artist?: string;
  channel?: string;
  thumbnail_url?: string;
  duration_sec?: number;
  has_lyrics?: boolean;
};

export type PaginatedSongResults = {
  songs: SongResult[];
  has_more: boolean;
  next_page_token?: string;
};

export type SongSearchProvider = {
  searchSongs(
    query: string,
    limit: number,
    options?: { offset?: number; pageToken?: string },
  ): Promise<PaginatedSongResults>;
};
