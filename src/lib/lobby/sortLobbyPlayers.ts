import type { LobbyPlayer } from "@/lib/supabase/functions";

export function sortLobbyPlayers(players: LobbyPlayer[]): LobbyPlayer[] {
  return [...players].sort((left, right) => {
    if (left.is_host !== right.is_host) {
      return left.is_host ? -1 : 1;
    }

    return 0;
  });
}
