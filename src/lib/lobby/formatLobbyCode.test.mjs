import { strict as assert } from "node:assert";

function formatLobbyCode(code) {
  const normalized = code.trim().toUpperCase().replace(/-/g, "");
  return normalized.split("").join("-");
}

assert.equal(formatLobbyCode("SMK6MD"), "S-M-K-6-M-D");
assert.equal(formatLobbyCode("smk6md"), "S-M-K-6-M-D");
assert.equal(formatLobbyCode("S-M-K-6-M-D"), "S-M-K-6-M-D");
assert.equal(formatLobbyCode("  abx92k  "), "A-B-X-9-2-K");

console.log("All formatLobbyCode tests passed.");
