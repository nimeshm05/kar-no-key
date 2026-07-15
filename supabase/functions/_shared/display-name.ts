export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 20;
export const MAX_REPEATED_CHAR_COUNT = 5;

const RESERVED_NAMES = new Set(["admin", "host"]);

/** Minimal blocklist; expand as needed without external deps in Edge Functions. */
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

export type DisplayNameValidationResult =
  | { valid: true; name: string }
  | { valid: false; error: string };

export function normalizeDisplayName(name: string): string {
  return name.trim();
}

export function validateDisplayName(
  rawName: string,
): DisplayNameValidationResult {
  const name = normalizeDisplayName(rawName);

  if (name.length === 0) {
    return { valid: false, error: "Display name cannot be empty" };
  }

  if (name.length < DISPLAY_NAME_MIN_LENGTH) {
    return {
      valid: false,
      error: `Display name must be at least ${DISPLAY_NAME_MIN_LENGTH} characters`,
    };
  }

  if (name.length > DISPLAY_NAME_MAX_LENGTH) {
    return {
      valid: false,
      error: `Display name must be at most ${DISPLAY_NAME_MAX_LENGTH} characters`,
    };
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

function hasExcessiveRepeatedChars(name: string): boolean {
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

function containsProfanity(name: string): boolean {
  const lower = name.toLowerCase();

  return PROFANITY_PATTERNS.some((pattern) => lower.includes(pattern));
}
