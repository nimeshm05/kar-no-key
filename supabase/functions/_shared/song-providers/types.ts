export type SongResult = {
  id: string;
  title: string;
  artist?: string;
  channel?: string;
  thumbnail_url?: string;
  duration_sec?: number;
  has_lyrics?: boolean;
};

export type SongSearchProvider = {
  searchSongs(query: string, limit: number): Promise<SongResult[]>;
};
