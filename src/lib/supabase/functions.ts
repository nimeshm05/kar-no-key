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
    }
  | { error: string };

export type JoinLobbyResult =
  | {
      code: string;
      lobby_id: string;
      player_id: string;
      display_name: string;
      is_host: boolean;
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
};

export type GetLobbyPlayersResult =
  | {
      lobby_id: string;
      code: string;
      max_players: number;
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
): Promise<FunctionInvokeResult<T>> {
  const { data, error } = await getSupabaseClient().functions.invoke(functionName, {
    body,
  });

  return {
    data: (data as T | null) ?? null,
    error: error ?? null,
  };
}

export async function validateLobbyCode(
  code: string,
): Promise<FunctionInvokeResult<ValidateLobbyCodeResult>> {
  return invokeFunction<ValidateLobbyCodeResult>("validate-lobby-code", { code });
}

export async function generateLobbyCode(): Promise<FunctionInvokeResult<GenerateLobbyCodeResult>> {
  return invokeFunction<GenerateLobbyCodeResult>("generate-lobby-code", {});
}

export async function createLobby(
  playerId: string,
  displayName: string,
): Promise<FunctionInvokeResult<CreateLobbyResult>> {
  return invokeFunction<CreateLobbyResult>("create-lobby", {
    player_id: playerId,
    display_name: displayName,
  });
}

export async function joinLobby(
  playerId: string,
  displayName: string,
  code: string,
): Promise<FunctionInvokeResult<JoinLobbyResult>> {
  return invokeFunction<JoinLobbyResult>("join-lobby", {
    player_id: playerId,
    display_name: displayName,
    code,
  });
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
