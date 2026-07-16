import type { SongResult, SongSearchProvider } from "./types.ts";

const YOUTUBE_API_BASE = "https://www.googleapis.com/youtube/v3";

function getApiKey(): string {
  const key = Deno.env.get("YOUTUBE_API_KEY");
  if (!key) {
    throw new Error("YOUTUBE_API_KEY is not configured");
  }
  return key;
}

function parseIso8601Duration(duration: string): number {
  const match = duration.match(
    /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/,
  );
  if (!match) {
    return 0;
  }

  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const seconds = Number(match[3] ?? 0);
  return hours * 3600 + minutes * 60 + seconds;
}

type YouTubeSearchItem = {
  id?: { videoId?: string };
  snippet?: {
    title?: string;
    channelTitle?: string;
    thumbnails?: {
      medium?: { url?: string };
      default?: { url?: string };
    };
  };
};

type YouTubeVideoItem = {
  id?: string;
  contentDetails?: { duration?: string };
};

async function fetchVideoDurations(
  videoIds: string[],
): Promise<Map<string, number>> {
  if (videoIds.length === 0) {
    return new Map();
  }

  const params = new URLSearchParams({
    part: "contentDetails",
    id: videoIds.join(","),
    key: getApiKey(),
  });

  const response = await fetch(
    `${YOUTUBE_API_BASE}/videos?${params.toString()}`,
  );

  if (!response.ok) {
    return new Map();
  }

  const data = await response.json();
  const items = (data.items ?? []) as YouTubeVideoItem[];
  const durations = new Map<string, number>();

  for (const item of items) {
    if (item.id && item.contentDetails?.duration) {
      durations.set(item.id, parseIso8601Duration(item.contentDetails.duration));
    }
  }

  return durations;
}

export async function fetchYouTubeVideoMetadata(
  videoId: string,
): Promise<SongResult | null> {
  const params = new URLSearchParams({
    part: "snippet,contentDetails",
    id: videoId,
    key: getApiKey(),
  });

  const response = await fetch(
    `${YOUTUBE_API_BASE}/videos?${params.toString()}`,
  );

  if (!response.ok) {
    return null;
  }

  const data = await response.json();
  const item = (data.items ?? [])[0] as YouTubeVideoItem & {
    snippet?: YouTubeSearchItem["snippet"];
  };

  if (!item?.id || !item.snippet?.title) {
    return null;
  }

  const duration_sec = item.contentDetails?.duration
    ? parseIso8601Duration(item.contentDetails.duration)
    : 0;

  return {
    id: item.id,
    title: item.snippet.title,
    channel: item.snippet.channelTitle,
    thumbnail_url:
      item.snippet.thumbnails?.medium?.url ??
      item.snippet.thumbnails?.default?.url,
    duration_sec,
  };
}

export const youtubeSongProvider: SongSearchProvider = {
  async searchSongs(query: string, limit: number): Promise<SongResult[]> {
    const trimmed = query.trim();
    if (!trimmed) {
      return [];
    }

    const searchQuery = trimmed.toLowerCase().includes("lyric")
      ? trimmed
      : `${trimmed} lyrics`;

    const params = new URLSearchParams({
      part: "snippet",
      type: "video",
      videoEmbeddable: "true",
      q: searchQuery,
      maxResults: String(Math.min(limit, 25)),
      key: getApiKey(),
    });

    const response = await fetch(
      `${YOUTUBE_API_BASE}/search?${params.toString()}`,
    );

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `YouTube search failed (${response.status}): ${errorBody}`,
      );
    }

    const data = await response.json();
    const items = (data.items ?? []) as YouTubeSearchItem[];
    const videoIds = items
      .map((item) => item.id?.videoId)
      .filter((id): id is string => Boolean(id));

    const durations = await fetchVideoDurations(videoIds);

    return items
      .map((item) => {
        const videoId = item.id?.videoId;
        if (!videoId || !item.snippet?.title) {
          return null;
        }

        return {
          id: videoId,
          title: item.snippet.title,
          channel: item.snippet.channelTitle,
          thumbnail_url:
            item.snippet.thumbnails?.medium?.url ??
            item.snippet.thumbnails?.default?.url,
          duration_sec: durations.get(videoId) ?? 0,
        } satisfies SongResult;
      })
      .filter((song): song is SongResult => song !== null);
  },
};
