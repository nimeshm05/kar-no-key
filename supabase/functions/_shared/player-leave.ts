import type { SupabaseClient } from "npm:@supabase/supabase-js@2";
import { clearPlayerGameData } from "./scoring/reset.ts";

/** Missed-poll grace before a player is treated as gone (~5 × 3s polls). */
export const PLAYER_STALE_MS = 15_000;

/** Longer grace during an active race so brief background/sleep is less harsh. */
export const PLAYER_STALE_IN_RACE_MS = 45_000;

const RACE_STATUSES = new Set(["countdown", "playing", "ready"]);

/** Grace window based on lobby status (waiting vs in-race). */
export function staleMsForLobbyStatus(status: string | null | undefined): number {
  if (status && RACE_STATUSES.has(status)) {
    return PLAYER_STALE_IN_RACE_MS;
  }

  return PLAYER_STALE_MS;
}

/** True when last_seen_at is missing or older than the presence grace window. */
export function isPresenceStale(
  lastSeenAt: string | null | undefined,
  now: Date = new Date(),
  staleMs: number = PLAYER_STALE_MS,
): boolean {
  if (!lastSeenAt) {
    return true;
  }

  const seenAt = Date.parse(lastSeenAt);
  if (Number.isNaN(seenAt)) {
    return true;
  }

  return now.getTime() - seenAt > staleMs;
}

export type RemovePlayerFromLobbyResult = {
  left: true;
  lobby_closed: boolean;
  new_host_player_id: string | null;
  error?: string;
};

async function deletePlayerRow(
  supabase: SupabaseClient,
  playerId: string,
): Promise<string | null> {
  try {
    await clearPlayerGameData(supabase, playerId);
  } catch {
    return "Failed to clear player game data";
  }

  const { error: deletePlayerError } = await supabase
    .from("players")
    .delete()
    .eq("id", playerId);

  if (deletePlayerError) {
    return "Failed to leave lobby";
  }

  return null;
}

/**
 * Remove a player from their lobby: transfer host if needed, or delete an
 * empty lobby. Mirrors leave-lobby semantics for voluntary leave and prune.
 */
export async function removePlayerFromLobby(
  supabase: SupabaseClient,
  playerId: string,
  lobbyId: string,
): Promise<RemovePlayerFromLobbyResult> {
  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, lobby_id, is_host")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) {
    return {
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
      error: "Failed to check player session",
    };
  }

  if (!player || player.lobby_id !== lobbyId) {
    return {
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
    };
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select("id, status, host_player_id")
    .eq("id", lobbyId)
    .maybeSingle();

  if (lobbyError) {
    return {
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
      error: "Failed to check lobby",
    };
  }

  if (!lobby || lobby.status === "closed") {
    const removeError = await deletePlayerRow(supabase, playerId);
    if (removeError) {
      return {
        left: true,
        lobby_closed: lobby?.status === "closed",
        new_host_player_id: null,
        error: removeError,
      };
    }

    return {
      left: true,
      lobby_closed: lobby?.status === "closed",
      new_host_player_id: null,
    };
  }

  if (player.is_host) {
    const { data: otherPlayers, error: otherPlayersError } = await supabase
      .from("players")
      .select("id")
      .eq("lobby_id", lobby.id)
      .neq("id", playerId)
      .order("joined_at", { ascending: true });

    if (otherPlayersError) {
      return {
        left: true,
        lobby_closed: false,
        new_host_player_id: null,
        error: "Failed to check lobby players",
      };
    }

    if (!otherPlayers || otherPlayers.length === 0) {
      try {
        await clearPlayerGameData(supabase, playerId);
      } catch {
        return {
          left: true,
          lobby_closed: false,
          new_host_player_id: null,
          error: "Failed to clear player game data",
        };
      }

      const { error: deleteLobbyError } = await supabase
        .from("lobbies")
        .delete()
        .eq("id", lobby.id);

      if (deleteLobbyError) {
        return {
          left: true,
          lobby_closed: false,
          new_host_player_id: null,
          error: "Failed to close lobby",
        };
      }

      return {
        left: true,
        lobby_closed: true,
        new_host_player_id: null,
      };
    }

    const successor = otherPlayers[0];

    const { error: updateLobbyError } = await supabase
      .from("lobbies")
      .update({ host_player_id: successor.id })
      .eq("id", lobby.id);

    if (updateLobbyError) {
      return {
        left: true,
        lobby_closed: false,
        new_host_player_id: null,
        error: "Failed to transfer host",
      };
    }

    const { error: clearHostFlagsError } = await supabase
      .from("players")
      .update({ is_host: false })
      .eq("lobby_id", lobby.id);

    if (clearHostFlagsError) {
      return {
        left: true,
        lobby_closed: false,
        new_host_player_id: null,
        error: "Failed to transfer host",
      };
    }

    const { error: promoteError } = await supabase
      .from("players")
      .update({ is_host: true, is_connected: true })
      .eq("id", successor.id);

    if (promoteError) {
      return {
        left: true,
        lobby_closed: false,
        new_host_player_id: null,
        error: "Failed to transfer host",
      };
    }

    const removeError = await deletePlayerRow(supabase, playerId);
    if (removeError) {
      return {
        left: true,
        lobby_closed: false,
        new_host_player_id: null,
        error: removeError,
      };
    }

    return {
      left: true,
      lobby_closed: false,
      new_host_player_id: successor.id,
    };
  }

  const removeError = await deletePlayerRow(supabase, playerId);
  if (removeError) {
    return {
      left: true,
      lobby_closed: false,
      new_host_player_id: null,
      error: removeError,
    };
  }

  return {
    left: true,
    lobby_closed: false,
    new_host_player_id: null,
  };
}

/** Stamp presence for an active poller. */
export async function touchPlayerPresence(
  supabase: SupabaseClient,
  playerId: string,
  now: Date = new Date(),
): Promise<void> {
  await supabase
    .from("players")
    .update({
      last_seen_at: now.toISOString(),
      is_connected: true,
    })
    .eq("id", playerId);
}

/**
 * Remove players in this lobby whose last_seen_at is older than the grace
 * window for this lobby status. Non-hosts first, then hosts, so host transfer
 * sees remaining live players. Re-checks last_seen_at before each remove so a
 * reconnect at the boundary wins.
 */
export async function pruneStalePlayers(
  supabase: SupabaseClient,
  lobbyId: string,
  now: Date = new Date(),
  lobbyStatus?: string | null,
): Promise<void> {
  let status = lobbyStatus;

  if (status === undefined) {
    const { data: lobby } = await supabase
      .from("lobbies")
      .select("status")
      .eq("id", lobbyId)
      .maybeSingle();
    status = lobby?.status ?? null;
  }

  const staleMs = staleMsForLobbyStatus(status);
  const cutoff = new Date(now.getTime() - staleMs).toISOString();

  const { data: stalePlayers, error } = await supabase
    .from("players")
    .select("id, is_host, last_seen_at")
    .eq("lobby_id", lobbyId)
    .lt("last_seen_at", cutoff)
    .order("joined_at", { ascending: true });

  if (error || !stalePlayers || stalePlayers.length === 0) {
    return;
  }

  const nonHosts = stalePlayers.filter((player) => !player.is_host);
  const hosts = stalePlayers.filter((player) => player.is_host);

  for (const player of [...nonHosts, ...hosts]) {
    const { data: freshRow } = await supabase
      .from("players")
      .select("last_seen_at")
      .eq("id", player.id)
      .maybeSingle();

    if (!freshRow || !isPresenceStale(freshRow.last_seen_at, now, staleMs)) {
      continue;
    }

    await removePlayerFromLobby(supabase, player.id, lobbyId);
  }
}

/** Delete lobbies that have no players left. */
export async function deleteEmptyLobbies(
  supabase: SupabaseClient,
): Promise<number> {
  const { data: lobbies, error } = await supabase.from("lobbies").select("id");

  if (error || !lobbies || lobbies.length === 0) {
    return 0;
  }

  let deleted = 0;

  for (const lobby of lobbies) {
    const { count, error: countError } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("lobby_id", lobby.id);

    if (countError || (count ?? 0) > 0) {
      continue;
    }

    const { error: deleteError } = await supabase
      .from("lobbies")
      .delete()
      .eq("id", lobby.id);

    if (!deleteError) {
      deleted += 1;
    }
  }

  return deleted;
}
