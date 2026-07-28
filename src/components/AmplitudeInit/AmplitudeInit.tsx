"use client";

import { useEffect } from "react";
import {
  identifyPlayer,
  initAmplitude,
  trackEvent,
} from "@/lib/analytics/amplitude";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getPlayerId } from "@/lib/player/identity";
import { loadLobbySession } from "@/lib/player/session";
import { registerVisitIfNewSession } from "@/lib/player/visitor";

export default function AmplitudeInit() {
  useEffect(() => {
    void (async () => {
      try {
        const playerId = getPlayerId();
        const visitResult = await registerVisitIfNewSession(playerId);
        await initAmplitude();

        const session = loadLobbySession();
        identifyPlayer(playerId, {
          is_host: session?.isHost,
          has_active_lobby: Boolean(session),
          last_lobby_id: session?.lobbyId,
          has_display_name: Boolean(session?.displayName),
          visit_count: visitResult?.visit_count,
          is_new_visitor: visitResult?.is_new_visitor,
        });

        if (visitResult) {
          trackEvent(AnalyticsEvent.AppVisitRegistered, {
            visit_count: visitResult.visit_count,
            is_new_visitor: visitResult.is_new_visitor,
            is_returning_visitor: !visitResult.is_new_visitor,
          });
        }
      } catch {
        // getPlayerId can throw outside the browser; ignore on edge cases.
      }
    })();
  }, []);

  return null;
}
