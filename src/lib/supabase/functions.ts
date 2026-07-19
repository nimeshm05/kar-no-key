import { loadLobbySession } from "@/lib/player/session";
import { getSupabaseClient } from "./client";

export type ValidateLobbyCodeResult =
  | { valid: true; exists: true; status: string }
  | { valid: true; exists: false }
  | { valid: false; error: string };

export type GenerateLobbyCodeResult =
  | { code: string }
  | { error: string };

export type CreateLobbyResult =
  | {
      code: string;
      lobby_id: string;
      player_id: string;
      display_name: string;
      session_token: string;
    }
  | { error: string };

export type JoinLobbyResult =
  | {
      code: string;
      lobby_id: string;
      player_id: string;
      display_name: string;
      is_host: boolean;
      session_token: string;
    }
  | { error: string };

export type LeaveLobbyResult =
  | {
      player_id: string;
      lobby_id?: string;
      left: true;
      lobby_closed: boolean;
      new_host_player_id: string | null;
    }
  | { error: string };

export type LobbyPlayer = {
  player_id: string;
  display_name: string;
  is_host: boolean;
  is_connected: boolean;
  score?: number;
  phrases_completed?: number;
};

export type GetLobbyPlayersResult =
  | {
      lobby_id: string;
      code: string;
      status: string;
      max_players: number;
      song_selection_started: boolean;
      players: LobbyPlayer[];
    }
  | { error: string };

export type StartSongSelectionResult =
  | {
      lobby_id: string;
      code: string;
      song_selection_started: boolean;
    }
  | { error: string };

export type SongResult = {
  id: string;
  title: string;
  artist?: string;
  channel?: string;
  thumbnail_url?: string;
  duration_sec?: number;
  has_lyrics?: boolean;
};

export type SearchSongsResult =
  | { songs: SongResult[]; has_more: boolean; next_page_token?: string }
  | { error: string };

export type GetRecommendedSongsResult =
  | { songs: SongResult[]; has_more: boolean }
  | { error: string };

export type LyricPhrase = {
  index: number;
  text: string;
  start_ms: number;
  end_ms: number;
};

export type LobbySong = {
  youtube_video_id: string;
  title: string;
  channel?: string | null;
  thumbnail_url?: string | null;
  duration_sec: number;
  lyrics_phrases: LyricPhrase[];
  lyrics_source: string;
};

export type SelectSongResult =
  | {
      lobby_id: string;
      code: string;
      status: string;
      song: LobbySong;
    }
  | { error: string; has_lyrics?: boolean };

export type StartCountdownResult =
  | {
      lobby_id: string;
      code: string;
      status: string;
      countdown_start_at: string;
      playback_start_at: string;
      playback_elapsed_ms: number;
      server_now: string;
    }
  | { error: string };

export type PausePlaybackResult =
  | {
      lobby_id: string;
      code: string;
      status: string;
      playback_elapsed_ms: number;
      server_now: string;
    }
  | { error: string };

export type EndSongResult =
  | {
      lobby_id: string;
      code: string;
      status: string;
      song_selection_started: boolean;
      server_now: string;
    }
  | { error: string };

export type SubmitPhraseProgressResult =
  | {
      score: number;
      phrases_completed: number;
      points_awarded: number;
      phrase_bonus_awarded: boolean;
    }
  | { error: string };

export type GetLobbyStateResult =
  | {
      lobby_id: string;
      code: string;
      status: string;
      max_players: number;
      song_selection_started: boolean;
      selected_youtube_video_id: string | null;
      countdown_start_at: string | null;
      playback_start_at: string | null;
      playback_elapsed_ms: number;
      server_now: string;
      song: LobbySong | null;
      players: LobbyPlayer[];
    }
  | { error: string };

export type FunctionInvokeResult<T> = {
  data: T | null;
  error: Error | null;
};

async function invokeFunction<T>(
  functionName: string,
  body: Record<string, unknown>,
  options?: { includeSessionToken?: boolean },
): Promise<FunctionInvokeResult<T>> {
  const payload = { ...body };

  if (options?.includeSessionToken !== false) {
    const session = loadLobbySession();
    if (session?.sessionToken) {
      payload.session_token = session.sessionToken;
    }
  }

  const { data, error } = await getSupabaseClient().functions.invoke(functionName, {
    body: payload,
  });

  return {
    data: (data as T | null) ?? null,
    error: error ?? null,
  };
}

export async function validateLobbyCode(
  code: string,
): Promise<FunctionInvokeResult<ValidateLobbyCodeResult>> {
  return invokeFunction<ValidateLobbyCodeResult>(
    "validate-lobby-code",
    { code },
    { includeSessionToken: false },
  );
}

export async function generateLobbyCode(): Promise<FunctionInvokeResult<GenerateLobbyCodeResult>> {
  return invokeFunction<GenerateLobbyCodeResult>(
    "generate-lobby-code",
    {},
    { includeSessionToken: false },
  );
}

export async function createLobby(
  playerId: string,
  displayName: string,
): Promise<FunctionInvokeResult<CreateLobbyResult>> {
  return invokeFunction<CreateLobbyResult>(
    "create-lobby",
    {
      player_id: playerId,
      display_name: displayName,
    },
    { includeSessionToken: false },
  );
}

export async function joinLobby(
  playerId: string,
  displayName: string,
  code: string,
): Promise<FunctionInvokeResult<JoinLobbyResult>> {
  return invokeFunction<JoinLobbyResult>(
    "join-lobby",
    {
      player_id: playerId,
      display_name: displayName,
      code,
    },
    { includeSessionToken: false },
  );
}

export async function leaveLobby(
  playerId: string,
): Promise<FunctionInvokeResult<LeaveLobbyResult>> {
  return invokeFunction<LeaveLobbyResult>("leave-lobby", {
    player_id: playerId,
  });
}

export async function getLobbyPlayers(
  playerId: string,
): Promise<FunctionInvokeResult<GetLobbyPlayersResult>> {
  return invokeFunction<GetLobbyPlayersResult>("get-lobby-players", {
    player_id: playerId,
  });
}

export async function getLobbyState(
  playerId: string,
): Promise<FunctionInvokeResult<GetLobbyStateResult>> {
  return invokeFunction<GetLobbyStateResult>("get-lobby-state", {
    player_id: playerId,
  });
}

export async function startSongSelection(
  playerId: string,
): Promise<FunctionInvokeResult<StartSongSelectionResult>> {
  return invokeFunction<StartSongSelectionResult>("start-song-selection", {
    player_id: playerId,
  });
}

export async function searchSongs(
  playerId: string,
  query: string,
  options?: {
    limit?: number;
    offset?: number;
    pageToken?: string;
  },
): Promise<FunctionInvokeResult<SearchSongsResult>> {
  return invokeFunction<SearchSongsResult>("search-songs", {
    player_id: playerId,
    query,
    limit: options?.limit,
    offset: options?.offset,
    page_token: options?.pageToken,
  });
}

export async function getRecommendedSongs(
  playerId: string,
  options?: {
    offset?: number;
    limit?: number;
  },
): Promise<FunctionInvokeResult<GetRecommendedSongsResult>> {
  return invokeFunction<GetRecommendedSongsResult>("get-recommended-songs", {
    player_id: playerId,
    offset: options?.offset,
    limit: options?.limit,
  });
}

export async function selectSong(
  playerId: string,
  youtubeVideoId: string,
): Promise<FunctionInvokeResult<SelectSongResult>> {
  return invokeFunction<SelectSongResult>("select-song", {
    player_id: playerId,
    youtube_video_id: youtubeVideoId,
  });
}

export async function startCountdown(
  playerId: string,
): Promise<FunctionInvokeResult<StartCountdownResult>> {
  return invokeFunction<StartCountdownResult>("start-countdown", {
    player_id: playerId,
  });
}

export async function pausePlayback(
  playerId: string,
): Promise<FunctionInvokeResult<PausePlaybackResult>> {
  return invokeFunction<PausePlaybackResult>("pause-playback", {
    player_id: playerId,
  });
}

export async function endSong(
  playerId: string,
): Promise<FunctionInvokeResult<EndSongResult>> {
  return invokeFunction<EndSongResult>("end-song", {
    player_id: playerId,
  });
}

export async function submitPhraseProgress(
  playerId: string,
  payload: {
    phrase_index: number;
    typed_text: string;
    finalize?: boolean;
  },
): Promise<FunctionInvokeResult<SubmitPhraseProgressResult>> {
  return invokeFunction<SubmitPhraseProgressResult>("submit-phrase-progress", {
    player_id: playerId,
    phrase_index: payload.phrase_index,
    typed_text: payload.typed_text,
    finalize: payload.finalize ?? false,
  });
}
