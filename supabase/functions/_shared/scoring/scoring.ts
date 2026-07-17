import type { LyricPhrase, PhraseProgressRow, ScorePhraseResult } from "./types.ts";

export const POINTS_PER_CHAR = 1;
export const PHRASE_BONUS_POINTS = 10;

export function normalizeChar(char: string): string {
  return char.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
}

export function normalizeForMatch(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .trim();
}

export function phrasesMatch(typed: string, expected: string): boolean {
  return normalizeForMatch(typed) === normalizeForMatch(expected);
}

export function charMatches(expectedChar: string, typedChar: string | undefined): boolean {
  if (typedChar === undefined) {
    return false;
  }

  if (expectedChar === " ") {
    return typedChar === " ";
  }

  return normalizeChar(typedChar) === normalizeChar(expectedChar);
}

export function getActivePhraseIndex(
  phrases: LyricPhrase[],
  elapsedMs: number,
): number {
  if (phrases.length === 0) {
    return -1;
  }

  for (let index = phrases.length - 1; index >= 0; index -= 1) {
    if (elapsedMs >= phrases[index].start_ms) {
      return index;
    }
  }

  return 0;
}

export function computePlaybackElapsedMs(
  playbackStartAt: string | null,
  playbackElapsedMs: number,
  nowMs: number,
  isPlaying: boolean,
): number {
  let elapsed = playbackElapsedMs ?? 0;

  if (isPlaying && playbackStartAt) {
    const playbackStartMs = new Date(playbackStartAt).getTime();
    elapsed += Math.max(0, nowMs - playbackStartMs);
  }

  return elapsed;
}

export function scorePhraseProgress(
  expected: string,
  typed: string,
  progress: PhraseProgressRow,
  canScoreChars: boolean,
  finalize: boolean,
): ScorePhraseResult {
  const scoredCharIndices = [...progress.scored_char_indices];
  let pointsAwarded = 0;
  let phraseBonusAwarded = false;
  let finalized = progress.finalized;
  let phrasesCompletedDelta = 0;

  if (canScoreChars && !progress.finalized) {
    for (let index = 0; index < expected.length; index += 1) {
      if (scoredCharIndices.includes(index)) {
        continue;
      }

      if (charMatches(expected[index], typed[index])) {
        scoredCharIndices.push(index);
        pointsAwarded += POINTS_PER_CHAR;
      }
    }
  }

  if (finalize && !progress.finalized) {
    finalized = true;

    if (phrasesMatch(typed, expected) && !progress.phrase_bonus_awarded) {
      phraseBonusAwarded = true;
      pointsAwarded += PHRASE_BONUS_POINTS;
      phrasesCompletedDelta = 1;
    }
  }

  return {
    scoredCharIndices,
    pointsAwarded,
    phraseBonusAwarded,
    finalized,
    phrasesCompletedDelta,
  };
}
