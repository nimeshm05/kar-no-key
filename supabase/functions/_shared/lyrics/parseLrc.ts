import type { LyricPhrase } from "./types.ts";

function parseTimestampToMs(timestamp: string): number {
  const match = timestamp.match(/^(\d+):(\d{2})(?:\.(\d{1,3}))?$/);
  if (!match) {
    return 0;
  }

  const minutes = Number(match[1]);
  const seconds = Number(match[2]);
  const fraction = match[3] ? Number(match[3].padEnd(3, "0")) : 0;
  return minutes * 60_000 + seconds * 1_000 + fraction;
}

export function parseLrcToPhrases(syncedLyrics: string): LyricPhrase[] {
  const lines = syncedLyrics.split(/\r?\n/);
  const timedLines: { start_ms: number; text: string }[] = [];

  for (const line of lines) {
    const matches = [...line.matchAll(/\[(\d+:\d{2}(?:\.\d{1,3})?)\]/g)];
    if (matches.length === 0) {
      continue;
    }

    const lastMatch = matches[matches.length - 1];
    const start_ms = parseTimestampToMs(lastMatch[1]);
    const text = line
      .replace(/\[\d+:\d{2}(?:\.\d{1,3})?\]/g, "")
      .trim();

    if (!text) {
      continue;
    }

    timedLines.push({ start_ms, text });
  }

  if (timedLines.length === 0) {
    return [];
  }

  return timedLines.map((line, index) => {
    const nextStart = timedLines[index + 1]?.start_ms;
    const end_ms = nextStart ?? line.start_ms + 8_000;

    return {
      index,
      text: line.text,
      start_ms: line.start_ms,
      end_ms,
    };
  });
}

export function parsePlainLyricsToPhrases(
  plainLyrics: string,
  durationSec: number,
): LyricPhrase[] {
  const lines = plainLyrics
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return [];
  }

  const phraseDurationMs = Math.floor((durationSec * 1000) / lines.length);

  return lines.map((text, index) => ({
    index,
    text,
    start_ms: index * phraseDurationMs,
    end_ms: (index + 1) * phraseDurationMs,
  }));
}
