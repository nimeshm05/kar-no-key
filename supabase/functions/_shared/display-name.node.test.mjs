/**
 * Node-runnable tests for display name validation.
 * Run with: npm run test:display-name
 */

import { strict as assert } from "node:assert";

const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 20;
const MAX_REPEATED_CHAR_COUNT = 5;

const RESERVED_NAMES = new Set(["admin", "host"]);

const PROFANITY_PATTERNS = [
  "fuck",
  "shit",
  "bitch",
  "asshole",
  "damn",
  "cunt",
  "nigger",
  "faggot",
  "retard",
];

function normalizeDisplayName(name) {
  return name.trim();
}

function validateDisplayName(rawName) {
  const name = normalizeDisplayName(rawName);

  if (name.length === 0) {
    return { valid: false, error: "Display name cannot be empty" };
  }

  if (name.length < DISPLAY_NAME_MIN_LENGTH) {
    return { valid: false, error: `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters` };
  }

  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return { valid: false, error: `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters` };
  }

  if (hasExcessiveRepeatedChars(name)) {
    return { valid: false, error: "Display name has too many repeated characters" };
  }

  if (RESERVED_NAMES.has(name.toLowerCase())) {
    return { valid: false, error: "Display name is reserved" };
  }

  if (containsProfanity(name)) {
    return { valid: false, error: "Display name is not allowed" };
  }

  return { valid: true, name };
}

function hasExcessiveRepeatedChars(name) {
  let count = 1;

  for (let i = 1; i < name.length; i++) {
    if (name[i] === name[i - 1]) {
      count++;
      if (count > MAX_REPEATED_CHAR_COUNT) {
        return true;
      }
    } else {
      count = 1;
    }
  }

  return false;
}

function containsProfanity(name) {
  const lower = name.toLowerCase();
  return PROFANITY_PATTERNS.some((pattern) => lower.includes(pattern));
}

assert.deepEqual(validateDisplayName("  Nimesh  "), {
  valid: true,
  name: "Nimesh",
});

assert.equal(validateDisplayName("").valid, false);
assert.equal(validateDisplayName(" ").valid, false);
assert.equal(validateDisplayName("A").valid, false);
assert.equal(validateDisplayName("Admin").valid, false);
assert.equal(validateDisplayName("host").valid, false);
assert.equal(validateDisplayName("AAAAAAAAAAAAAA").valid, false);
assert.equal(validateDisplayName("a".repeat(21)).valid, false);

console.log("All display name tests passed.");
