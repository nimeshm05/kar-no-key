const PLAYER_ID_KEY = "player_id";

export function getPlayerId(): string {
  if (typeof window === "undefined") {
    throw new Error("getPlayerId can only be called in the browser");
  }

  const existingId = localStorage.getItem(PLAYER_ID_KEY);
  if (existingId) {
    return existingId;
  }

  const newId = crypto.randomUUID();
  localStorage.setItem(PLAYER_ID_KEY, newId);
  return newId;
}
