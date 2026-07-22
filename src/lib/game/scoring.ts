import type { LyricPhrase } from "@/lib/game/types";

export const POINTS_PER_CHAR = 1;
export const PHRASE_BONUS_POINTS = 50;
export const FIRST_FINISH_BONUS_POINTS = 20;

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
