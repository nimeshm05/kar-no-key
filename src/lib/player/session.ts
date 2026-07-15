const SESSION_KEY = "lobby_session";

export type LobbySession = {
  displayName: string;
  lobbyCode: string;
  lobbyId: string;
  isHost: boolean;
};

export function saveLobbySession(session: LobbySession): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function loadLobbySession(): LobbySession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as LobbySession & { screen?: string };
    if (
      typeof parsed.displayName === "string" &&
      typeof parsed.lobbyCode === "string" &&
      typeof parsed.lobbyId === "string" &&
      typeof parsed.isHost === "boolean"
    ) {
      return {
        displayName: parsed.displayName,
        lobbyCode: parsed.lobbyCode,
        lobbyId: parsed.lobbyId,
        isHost: parsed.isHost,
      };
    }
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
  }

  return null;
}

export function clearLobbySession(): void {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.removeItem(SESSION_KEY);
}
