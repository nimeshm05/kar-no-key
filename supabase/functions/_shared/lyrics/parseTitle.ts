export type ParsedTrack = {
  artist: string;
  track: string;
};

const SUFFIX_PATTERNS = [
  /\s*\(official\s*(lyric|music)?\s*video[^)]*\)/gi,
  /\s*\[official\s*(lyric|music)?\s*video[^\]]*\]/gi,
  /\s*\(lyrics?[^)]*\)/gi,
  /\s*\(with\s+chords[^)]*\)/gi,
  /\s*-\s*lyrics?$/gi,
  /\s*\|.*$/g,
];

export function parseYouTubeTitle(title: string): ParsedTrack {
  let cleaned = title.trim();

  for (const pattern of SUFFIX_PATTERNS) {
    cleaned = cleaned.replace(pattern, "").trim();
  }

  const dashSplit = cleaned.split(/\s+[-–—]\s+/);
  if (dashSplit.length >= 2) {
    const artist = dashSplit[0].trim();
    const track = dashSplit.slice(1).join(" - ").trim();
    if (artist && track) {
      return { artist, track };
    }
  }

  const colonSplit = cleaned.split(/\s*:\s+/);
  if (colonSplit.length >= 2) {
    const artist = colonSplit[0].trim();
    const track = colonSplit.slice(1).join(": ").trim();
    if (artist && track) {
      return { artist, track };
    }
  }

  return { artist: "", track: cleaned };
}
