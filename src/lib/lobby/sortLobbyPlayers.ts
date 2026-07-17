import type { LobbyPlayer } from "@/lib/supabase/functions";

type SortLobbyPlayersOptions = {
  sortByScore?: boolean;
};

export function sortLobbyPlayers(
  players: LobbyPlayer[],
  options: SortLobbyPlayersOptions = {},
): LobbyPlayer[] {
  return [...players].sort((left, right) => {
    if (options.sortByScore) {
      const scoreDiff = (right.score ?? 0) - (left.score ?? 0);
      if (scoreDiff !== 0) {
        return scoreDiff;
      }
    }

    if (left.is_host !== right.is_host) {
      return left.is_host ? -1 : 1;
    }

    return 0;
  });
}
