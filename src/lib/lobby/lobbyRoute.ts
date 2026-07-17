import type { GetLobbyStateResult } from "@/lib/supabase/functions";

export function getErrorMessage(error: unknown, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error: unknown }).error;
    if (typeof message === "string") {
      return message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

export function getRouteForLobbyStatus(
  status: string,
  songSelectionStarted: boolean,
): string | null {
  if (status === "waiting" && songSelectionStarted) {
    return "/search";
  }

  if (status === "ready" || status === "countdown" || status === "playing") {
    return "/game";
  }

  return null;
}

export function isLobbyStateData(
  data: GetLobbyStateResult | null,
): data is GetLobbyStateResult & { error?: never } {
  return Boolean(data && !("error" in data));
}
