import { parsePlainLyricsToPhrases, parseLrcToPhrases } from "./parseLrc.ts";
import { parseYouTubeTitle } from "./parseTitle.ts";
import type { LyricPhrase } from "./types.ts";

const LRCLIB_BASE = "https://lrclib.net/api";

type LrclibRecord = {
  trackName?: string;
  artistName?: string;
  duration?: number;
  plainLyrics?: string;
  syncedLyrics?: string;
};

export type ResolvedSongLyrics = {
  artist: string;
  track: string;
  phrases: LyricPhrase[];
  lyrics_source: "lrclib";
};

async function fetchLrclibGet(
  trackName: string,
  artistName: string,
  durationSec: number,
): Promise<LrclibRecord | null> {
  const params = new URLSearchParams({
    track_name: trackName,
    artist_name: artistName,
    duration: String(durationSec),
  });

  const response = await fetch(`${LRCLIB_BASE}/get?${params.toString()}`, {
    headers: {
      "User-Agent": "kar-no-key/1.0 (https://github.com/kar-no-key)",
    },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(`LRCLIB request failed with status ${response.status}`);
  }

  return (await response.json()) as LrclibRecord;
}

async function fetchLrclibSearch(
  query: string,
): Promise<LrclibRecord[]> {
  const params = new URLSearchParams({ q: query });
  const response = await fetch(`${LRCLIB_BASE}/search?${params.toString()}`, {
    headers: {
      "User-Agent": "kar-no-key/1.0 (https://github.com/kar-no-key)",
    },
  });

  if (!response.ok) {
    return [];
  }

  const data = await response.json();
  return Array.isArray(data) ? (data as LrclibRecord[]) : [];
}

function recordToPhrases(
  record: LrclibRecord,
  durationSec: number,
): LyricPhrase[] {
  if (record.syncedLyrics) {
    const phrases = parseLrcToPhrases(record.syncedLyrics);
    if (phrases.length > 0) {
      return phrases;
    }
  }

  if (record.plainLyrics) {
    return parsePlainLyricsToPhrases(record.plainLyrics, durationSec);
  }

  return [];
}

export async function resolveLyricsForVideo(
  title: string,
  durationSec: number,
): Promise<ResolvedSongLyrics | null> {
  const parsed = parseYouTubeTitle(title);
  const candidates: { artist: string; track: string }[] = [];

  if (parsed.artist && parsed.track) {
    candidates.push(parsed);
  }
  candidates.push({ artist: "", track: parsed.track || title });

  for (const candidate of candidates) {
    try {
      const record = await fetchLrclibGet(
        candidate.track,
        candidate.artist,
        durationSec,
      );

      if (record) {
        const phrases = recordToPhrases(record, durationSec);
        if (phrases.length > 0) {
          return {
            artist: record.artistName ?? candidate.artist,
            track: record.trackName ?? candidate.track,
            phrases,
            lyrics_source: "lrclib",
          };
        }
      }
    } catch {
      // try next candidate
    }
  }

  const searchQuery = parsed.artist
    ? `${parsed.artist} ${parsed.track}`
    : title;

  const searchResults = await fetchLrclibSearch(searchQuery);
  for (const record of searchResults.slice(0, 3)) {
    const phrases = recordToPhrases(record, durationSec);
    if (phrases.length > 0) {
      return {
        artist: record.artistName ?? parsed.artist,
        track: record.trackName ?? parsed.track,
        phrases,
        lyrics_source: "lrclib",
      };
    }
  }

  return null;
}

export async function checkLyricsAvailable(
  title: string,
  durationSec: number,
): Promise<boolean> {
  const resolved = await resolveLyricsForVideo(title, durationSec);
  return resolved !== null && resolved.phrases.length > 0;
}
