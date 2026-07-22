/**
 * Node-runnable tests for scoring logic.
 * Run with: node --experimental-strip-types supabase/functions/_shared/scoring/scoring.node.test.mjs
 */

import assert from "node:assert/strict";
import {
  charMatches,
  computeAccuracy,
  computeWpm,
  getActivePhraseIndex,
  phrasesMatch,
  scorePhraseProgress,
  FIRST_FINISH_BONUS_POINTS,
  PHRASE_BONUS_POINTS,
  POINTS_PER_CHAR,
} from "./scoring.ts";
import { buildAwardsSnapshot } from "./awards.ts";

const phrases = [
  { index: 0, text: "hello world", start_ms: 0, end_ms: 1000 },
  { index: 1, text: "next line", start_ms: 1000, end_ms: 2000 },
];

assert.equal(getActivePhraseIndex(phrases, 500), 0);
assert.equal(getActivePhraseIndex(phrases, 1500), 1);

assert.equal(phrasesMatch("Hello, world!", "hello world"), true);
assert.equal(charMatches(" ", " "), true);
assert.equal(charMatches("a", "A"), true);

const firstPass = scorePhraseProgress(
  "hi",
  "h",
  {
    scored_char_indices: [],
    attempted_char_indices: [],
    phrase_bonus_awarded: false,
    finalized: false,
  },
  true,
  false,
);
assert.deepEqual(firstPass.scoredCharIndices, [0]);
assert.equal(firstPass.pointsAwarded, POINTS_PER_CHAR);
assert.equal(firstPass.correctCharsDelta, 1);
assert.equal(firstPass.attemptedCharsDelta, 1);

const wrongThenRight = scorePhraseProgress(
  "hi",
  "x",
  {
    scored_char_indices: [],
    attempted_char_indices: [],
    phrase_bonus_awarded: false,
    finalized: false,
  },
  true,
  false,
);
assert.equal(wrongThenRight.pointsAwarded, 0);
assert.equal(wrongThenRight.attemptedCharsDelta, 1);
assert.equal(wrongThenRight.correctCharsDelta, 0);

const duplicatePass = scorePhraseProgress(
  "hi",
  "hi",
  {
    scored_char_indices: firstPass.scoredCharIndices,
    attempted_char_indices: firstPass.attemptedCharIndices,
    phrase_bonus_awarded: false,
    finalized: false,
  },
  true,
  false,
);
assert.equal(duplicatePass.pointsAwarded, POINTS_PER_CHAR);
assert.deepEqual(duplicatePass.scoredCharIndices, [0, 1]);

const finalizedBonus = scorePhraseProgress(
  "hi",
  "hi",
  {
    scored_char_indices: [0, 1],
    attempted_char_indices: [0, 1],
    phrase_bonus_awarded: false,
    finalized: false,
  },
  false,
  true,
);
assert.equal(finalizedBonus.pointsAwarded, PHRASE_BONUS_POINTS);
assert.equal(finalizedBonus.phrasesCompletedDelta, 1);
assert.equal(finalizedBonus.finalized, true);
assert.equal(PHRASE_BONUS_POINTS, 50);
assert.equal(FIRST_FINISH_BONUS_POINTS, 20);

const lockedPass = scorePhraseProgress(
  "hi",
  "hix",
  {
    scored_char_indices: [0, 1],
    attempted_char_indices: [0, 1],
    phrase_bonus_awarded: true,
    finalized: true,
  },
  false,
  true,
);
assert.equal(lockedPass.pointsAwarded, 0);

assert.equal(computeWpm(850, 4 * 60_000), 42.5);
assert.equal(computeAccuracy(8, 10), 0.8);

const awards = buildAwardsSnapshot([
  {
    player_id: "a",
    display_name: "alice",
    score: 100,
    phrases_completed: 2,
    correct_chars: 50,
    attempted_chars: 50,
    typing_ms: 60_000,
    avg_phrase_completion_ms: 1000,
  },
  {
    player_id: "b",
    display_name: "bob",
    score: 200,
    phrases_completed: 1,
    correct_chars: 100,
    attempted_chars: 120,
    typing_ms: 60_000,
    avg_phrase_completion_ms: 2000,
  },
]);

assert.equal(awards.champions[0].player_id, "b");
assert.equal(awards.sharpshooters[0].player_id, "a");
assert.equal(awards.speed_demons[0].player_id, "b");

console.log("scoring.node.test.mjs passed");
