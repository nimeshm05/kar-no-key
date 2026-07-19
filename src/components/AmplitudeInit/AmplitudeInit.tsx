"use client";

import { useEffect } from "react";
import { identifyPlayer, initAmplitude } from "@/lib/analytics/amplitude";
import { getPlayerId } from "@/lib/player/identity";
import { loadLobbySession } from "@/lib/player/session";

export default function AmplitudeInit() {
  useEffect(() => {
    void initAmplitude().then(() => {
      try {
        const playerId = getPlayerId();
        const session = loadLobbySession();
        identifyPlayer(playerId, {
          is_host: session?.isHost,
          has_active_lobby: Boolean(session),
          last_lobby_id: session?.lobbyId,
          has_display_name: Boolean(session?.displayName),
        });
      } catch {
        // getPlayerId can throw outside the browser; ignore on edge cases.
      }
    });
  }, []);

  return null;
}
