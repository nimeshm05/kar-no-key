/**
 * Node-runnable tests for scoring logic.
 * Run with: node --experimental-strip-types supabase/functions/_shared/scoring/scoring.node.test.mjs
 */

import assert from "node:assert/strict";
import {
  charMatches,
  getActivePhraseIndex,
  phrasesMatch,
  scorePhraseProgress,
  PHRASE_BONUS_POINTS,
  POINTS_PER_CHAR,
} from "./scoring.ts";

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
  { scored_char_indices: [], phrase_bonus_awarded: false, finalized: false },
  true,
  false,
);
assert.deepEqual(firstPass.scoredCharIndices, [0]);
assert.equal(firstPass.pointsAwarded, POINTS_PER_CHAR);

const duplicatePass = scorePhraseProgress(
  "hi",
  "hi",
  {
    scored_char_indices: firstPass.scoredCharIndices,
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
    phrase_bonus_awarded: false,
    finalized: false,
  },
  false,
  true,
);
assert.equal(finalizedBonus.pointsAwarded, PHRASE_BONUS_POINTS);
assert.equal(finalizedBonus.phrasesCompletedDelta, 1);
assert.equal(finalizedBonus.finalized, true);

const lockedPass = scorePhraseProgress(
  "hi",
  "hix",
  {
    scored_char_indices: [0, 1],
    phrase_bonus_awarded: true,
    finalized: true,
  },
  false,
  true,
);
assert.equal(lockedPass.pointsAwarded, 0);

console.log("scoring.node.test.mjs passed");
