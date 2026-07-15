import type { SupabaseClient } from "npm:@supabase/supabase-js@2";

/** Excludes ambiguous characters: 0, O, I, 1, L */
export const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;
export const CODE_FORMAT_REGEX = /^[A-HJ-KM-NP-Z2-9]{6}$/;

export function generateLobbyCode(): string {
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, (byte) => {
    return CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }).join("");
}

export function normalizeLobbyCode(code: string): string {
  return code.trim().toUpperCase();
}

export function isValidLobbyCodeFormat(code: string): boolean {
  return CODE_FORMAT_REGEX.test(code);
}

export async function isCodeAvailable(
  supabase: SupabaseClient,
  code: string,
): Promise<boolean> {
  const { data, error } = await supabase
    .from("lobbies")
    .select("id")
    .eq("code", code)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data === null;
}

export class LobbyCodeGenerationError extends Error {
  constructor(message = "Could not generate unique code") {
    super(message);
    this.name = "LobbyCodeGenerationError";
  }
}

export async function generateUniqueCode(
  supabase: SupabaseClient,
  maxRetries = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const code = generateLobbyCode();

    if (await isCodeAvailable(supabase, code)) {
      return code;
    }
  }

  throw new LobbyCodeGenerationError();
}
