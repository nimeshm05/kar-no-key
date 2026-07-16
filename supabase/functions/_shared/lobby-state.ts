import { createSupabaseAdmin } from "./supabase-admin.ts";

type PlayerRow = {
  id: string;
  lobby_id: string;
  is_host: boolean;
};

type LobbyRow = {
  id: string;
  code: string;
  status: string;
  max_players: number;
  song_selection_started: boolean;
  selected_youtube_video_id: string | null;
  countdown_start_at: string | null;
  playback_start_at: string | null;
};

export type LobbyAuthResult =
  | { ok: true; supabase: ReturnType<typeof createSupabaseAdmin>; player: PlayerRow; lobby: LobbyRow }
  | { ok: false; status: number; error: string };

export async function requireLobbyPlayer(
  playerId: string,
): Promise<LobbyAuthResult> {
  let supabase;
  try {
    supabase = createSupabaseAdmin();
  } catch {
    return { ok: false, status: 500, error: "Server configuration error" };
  }

  const { data: player, error: playerError } = await supabase
    .from("players")
    .select("id, lobby_id, is_host")
    .eq("id", playerId)
    .maybeSingle();

  if (playerError) {
    return { ok: false, status: 500, error: "Failed to check player session" };
  }

  if (!player) {
    return { ok: false, status: 404, error: "Player is not in a lobby" };
  }

  const { data: lobby, error: lobbyError } = await supabase
    .from("lobbies")
    .select(
      "id, code, status, max_players, song_selection_started, selected_youtube_video_id, countdown_start_at, playback_start_at",
    )
    .eq("id", player.lobby_id)
    .maybeSingle();

  if (lobbyError) {
    return { ok: false, status: 500, error: "Failed to load lobby" };
  }

  if (!lobby) {
    return { ok: false, status: 404, error: "Lobby not found" };
  }

  if (lobby.status === "closed") {
    return { ok: false, status: 403, error: "Lobby is closed" };
  }

  return {
    ok: true,
    supabase,
    player: player as PlayerRow,
    lobby: lobby as LobbyRow,
  };
}

export function getEffectiveLobbyStatus(
  lobby: LobbyRow,
  now = Date.now(),
): string {
  if (
    lobby.status === "countdown" &&
    lobby.playback_start_at &&
    now >= new Date(lobby.playback_start_at).getTime()
  ) {
    return "playing";
  }

  return lobby.status;
}
