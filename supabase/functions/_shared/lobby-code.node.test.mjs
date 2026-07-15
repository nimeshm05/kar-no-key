/**
 * Node-runnable tests for lobby code format logic.
 * Run with: node --experimental-strip-types supabase/functions/_shared/lobby-code.node.test.mjs
 *
 * Integration tests against local Supabase require Docker:
 *   npm run supabase:start
 *   npm run supabase:reset
 *   npm run supabase:functions
 */

import { strict as assert } from "node:assert";

const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const CODE_FORMAT_REGEX = /^[A-HJ-KM-NP-Z2-9]{6}$/;

function generateLobbyCode() {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => CODE_ALPHABET[byte % CODE_ALPHABET.length]).join("");
}

function normalizeLobbyCode(code) {
  return code.trim().toUpperCase();
}

function isValidLobbyCodeFormat(code) {
  return CODE_FORMAT_REGEX.test(code);
}

// --- tests ---

for (let i = 0; i < 50; i++) {
  const code = generateLobbyCode();
  assert.equal(code.length, CODE_LENGTH);
  assert.match(code, CODE_FORMAT_REGEX);
}

assert.equal(isValidLobbyCodeFormat("ABX92K"), true);
assert.equal(isValidLobbyCodeFormat("HJK234"), true);

assert.equal(isValidLobbyCodeFormat(""), false);
assert.equal(isValidLobbyCodeFormat("abc"), false);
assert.equal(isValidLobbyCodeFormat("ABX92"), false);
assert.equal(isValidLobbyCodeFormat("ABX92KL"), false);
assert.equal(isValidLobbyCodeFormat("ABX92O"), false);
assert.equal(isValidLobbyCodeFormat("ABX920"), false);
assert.equal(isValidLobbyCodeFormat("ABX92I"), false);
assert.equal(isValidLobbyCodeFormat("ABX921"), false);
assert.equal(isValidLobbyCodeFormat("ABX92L"), false);

assert.equal(normalizeLobbyCode("  abx92k  "), "ABX92K");
assert.equal(normalizeLobbyCode("hjk234"), "HJK234");

const ambiguous = /[0OIL1]/;
for (let i = 0; i < 100; i++) {
  const code = generateLobbyCode();
  assert.equal(ambiguous.test(code), false);
}

console.log("All lobby code format tests passed.");
