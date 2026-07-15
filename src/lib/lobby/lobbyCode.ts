export const LOBBY_CODE_LENGTH = 6;

export function normalizeLobbyCodeInput(code: string): string {
  return code.trim().toUpperCase().replace(/-/g, "");
}

export function isLobbyCodeMinLength(code: string): boolean {
  return normalizeLobbyCodeInput(code).length >= LOBBY_CODE_LENGTH;
}
