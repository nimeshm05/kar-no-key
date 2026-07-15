import {
  assertEquals,
  assertMatch,
  assertThrows,
} from "jsr:@std/assert";
import {
  CODE_FORMAT_REGEX,
  CODE_LENGTH,
  generateLobbyCode,
  isValidLobbyCodeFormat,
  normalizeLobbyCode,
} from "./lobby-code.ts";

Deno.test("generateLobbyCode returns 6 characters from allowed alphabet", () => {
  for (let i = 0; i < 50; i++) {
    const code = generateLobbyCode();
    assertEquals(code.length, CODE_LENGTH);
    assertMatch(code, CODE_FORMAT_REGEX);
  }
});

Deno.test("isValidLobbyCodeFormat accepts valid codes", () => {
  assertEquals(isValidLobbyCodeFormat("ABX92K"), true);
  assertEquals(isValidLobbyCodeFormat("HJK234"), true);
});

Deno.test("isValidLobbyCodeFormat rejects invalid codes", () => {
  assertEquals(isValidLobbyCodeFormat(""), false);
  assertEquals(isValidLobbyCodeFormat("abc"), false);
  assertEquals(isValidLobbyCodeFormat("ABX92"), false);
  assertEquals(isValidLobbyCodeFormat("ABX92KL"), false);
  assertEquals(isValidLobbyCodeFormat("ABX92O"), false);
  assertEquals(isValidLobbyCodeFormat("ABX920"), false);
  assertEquals(isValidLobbyCodeFormat("ABX92I"), false);
  assertEquals(isValidLobbyCodeFormat("ABX921"), false);
  assertEquals(isValidLobbyCodeFormat("ABX92L"), false);
});

Deno.test("normalizeLobbyCode trims and uppercases", () => {
  assertEquals(normalizeLobbyCode("  abx92k  "), "ABX92K");
  assertEquals(normalizeLobbyCode("hjk234"), "HJK234");
});

Deno.test("generated codes never contain ambiguous characters", () => {
  const ambiguous = /[0OIL1]/;
  for (let i = 0; i < 100; i++) {
    const code = generateLobbyCode();
    assertEquals(ambiguous.test(code), false);
  }
});
