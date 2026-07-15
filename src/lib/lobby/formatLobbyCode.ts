export function formatLobbyCode(code: string): string {
  const normalized = code.trim().toUpperCase().replace(/-/g, "");
  return normalized.split("").join("-");
}
