"use client";

import * as amplitude from "@amplitude/unified";
import type { AnalyticsEventName, EventPropertiesMap } from "./events";

let initPromise: Promise<void> | null = null;
let isInitialized = false;

function getApiKey(): string | undefined {
  const apiKey = process.env.NEXT_PUBLIC_AMPLITUDE_API_KEY;
  if (!apiKey || apiKey.trim().length === 0) {
    return undefined;
  }
  return apiKey;
}

export function initAmplitude(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }

  if (isInitialized) {
    return Promise.resolve();
  }

  if (initPromise) {
    return initPromise;
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return Promise.resolve();
  }

  initPromise = amplitude
    .initAll(apiKey, {
      analytics: {
        autocapture: {
          pageViews: true,
          sessions: true,
          elementInteractions: false,
          formInteractions: false,
          fileDownloads: false,
        },
      },
      sessionReplay: {
        sampleRate: 1,
      },
    })
    .then(() => {
      isInitialized = true;
    })
    .catch((error: unknown) => {
      initPromise = null;
      console.error("Failed to initialize Amplitude", error);
    });

  return initPromise;
}

export function identifyPlayer(
  playerId: string,
  properties?: {
    is_host?: boolean;
    has_active_lobby?: boolean;
    last_lobby_id?: string;
    has_display_name?: boolean;
  },
): void {
  if (typeof window === "undefined" || !getApiKey()) {
    return;
  }

  amplitude.setUserId(playerId);

  if (!properties) {
    return;
  }

  const identify = new amplitude.Identify();
  if (properties.is_host !== undefined) {
    identify.set("is_host", properties.is_host);
  }
  if (properties.has_active_lobby !== undefined) {
    identify.set("has_active_lobby", properties.has_active_lobby);
  }
  if (properties.last_lobby_id !== undefined) {
    identify.set("last_lobby_id", properties.last_lobby_id);
  }
  if (properties.has_display_name !== undefined) {
    identify.set("has_display_name", properties.has_display_name);
  }
  amplitude.identify(identify);
}

export function setLobbyGroup(lobbyId: string | null): void {
  if (typeof window === "undefined" || !getApiKey()) {
    return;
  }

  if (lobbyId) {
    amplitude.setGroup("lobby", lobbyId);
    return;
  }

  amplitude.setGroup("lobby", []);
}

export function trackEvent<E extends AnalyticsEventName>(
  event: E,
  properties: EventPropertiesMap[E],
): void {
  if (typeof window === "undefined" || !getApiKey()) {
    return;
  }

  amplitude.track(event, properties);
}

export function sanitizeErrorMessage(error: unknown, data: unknown): string {
  if (data && typeof data === "object" && "error" in data) {
    const message = (data as { error: unknown }).error;
    if (typeof message === "string" && message.trim().length > 0) {
      return message.slice(0, 200);
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message.slice(0, 200);
  }

  return "unknown_error";
}
