"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import TypewriterIllustration from "@/components/TypewriterIllustration/TypewriterIllustration";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import LobbyScreen from "@/components/LobbyScreen/LobbyScreen";
import PageLoader from "@/components/PageLoader/PageLoader";
import type { JoinModalPhase } from "@/components/JoinCodeModal/JoinCodeModal";
import {
  identifyPlayer,
  sanitizeErrorMessage,
  setLobbyGroup,
  trackEvent,
} from "@/lib/analytics/amplitude";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getRouteForLobbyStatus } from "@/lib/lobby/lobbyRoute";
import { normalizeLobbyCodeInput } from "@/lib/lobby/lobbyCode";
import { useLobbyRosterPolling } from "@/lib/lobby/useLobbyRosterPolling";
import { getPlayerId } from "@/lib/player/identity";
import {
  loadLobbySession,
  saveLobbySession,
  clearLobbySession,
  syncHostRoleFromPlayers,
} from "@/lib/player/session";
import {
  createLobby,
  getLobbyPlayers,
  joinLobby,
  leaveLobby,
  startSongSelection,
  validateLobbyCode,
  type LobbyPlayer,
} from "@/lib/supabase/functions";
import { useTimedPageLoader } from "@/lib/ui/useTimedPageLoader";
import "./LandingFlow.css";

type Step = "landing" | "lobby";

function getErrorMessage(error: unknown, data: unknown): string {
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

export default function LandingFlow() {
  const router = useRouter();
  const prefersReducedMotion = useReducedMotion();
  const [step, setStep] = useState<Step>("landing");
  const [displayName, setDisplayName] = useState("");
  const [lobbyCode, setLobbyCode] = useState("");
  const [lobbyId, setLobbyId] = useState("");
  const [isHost, setIsHost] = useState(true);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRosterLoading, setIsRosterLoading] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lobbyRosterError, setLobbyRosterError] = useState<string | null>(null);
  const [startGameError, setStartGameError] = useState<string | null>(null);
  const [joinModalPhase, setJoinModalPhase] = useState<JoinModalPhase>("enter-code");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const isNavigatingAwayRef = useRef(false);
  const {
    isLoading: isPageLoading,
    start: startPageLoader,
    finish: finishPageLoader,
    cancel: cancelPageLoader,
  } = useTimedPageLoader();

  const navigateToLobbyRoute = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      const route = getRouteForLobbyStatus(status, songSelectionStarted);
      if (route) {
        isNavigatingAwayRef.current = true;
        startPageLoader();
        router.push(route);
        return true;
      }
      return false;
    },
    [router, startPageLoader],
  );

  const navigateToSearch = useCallback(() => {
    isNavigatingAwayRef.current = true;
    startPageLoader();
    router.push("/search");
  }, [router, startPageLoader]);

  const applyRosterData = useCallback(
    (data: {
      lobby_id: string;
      code: string;
      max_players: number;
      status: string;
      song_selection_started: boolean;
      players: LobbyPlayer[];
    }) => {
      setLobbyCode(data.code);
      setLobbyId(data.lobby_id);
      setPlayers(data.players);
      setLobbyRosterError(null);

      const nextIsHost = syncHostRoleFromPlayers(
        data.players,
        playerId ?? getPlayerId(),
      );
      if (nextIsHost !== null) {
        setIsHost(nextIsHost);
      }

      if (data.song_selection_started) {
        if (!navigateToLobbyRoute(data.status, data.song_selection_started)) {
          navigateToSearch();
        }
      }
    },
    [navigateToLobbyRoute, navigateToSearch, playerId],
  );

  const fetchLobbyRoster = useCallback(
    async (activePlayerId: string, showInitialSpinner = false) => {
      if (showInitialSpinner) {
        setIsRosterLoading(true);
      }
      setLobbyRosterError(null);

      try {
        const { data, error: invokeError } = await getLobbyPlayers(activePlayerId);

        if (invokeError || !data || "error" in data) {
          setLobbyRosterError(getErrorMessage(invokeError, data));
          if (showInitialSpinner) {
            setPlayers([]);
          }
          return false;
        }

        if (data.song_selection_started) {
          if (!navigateToLobbyRoute(data.status, data.song_selection_started)) {
            navigateToSearch();
          }
          return true;
        }

        applyRosterData(data);
        return true;
      } catch (caughtError) {
        setLobbyRosterError(getErrorMessage(caughtError, null));
        if (showInitialSpinner) {
          setPlayers([]);
        }
        return false;
      } finally {
        if (showInitialSpinner) {
          setIsRosterLoading(false);
        }
      }
    },
    [applyRosterData, navigateToLobbyRoute, navigateToSearch],
  );

  const handleRosterUpdate = useCallback(
    (data: {
      lobby_id: string;
      code: string;
      max_players: number;
      status: string;
      song_selection_started: boolean;
      players: LobbyPlayer[];
    }) => {
      applyRosterData(data);
    },
    [applyRosterData],
  );

  const handleRosterPollError = useCallback(
    (message: string, hasExistingRoster: boolean) => {
      if (!hasExistingRoster) {
        setLobbyRosterError(message);
      }
    },
    [],
  );

  useLobbyRosterPolling({
    playerId,
    enabled: step === "lobby" || joinModalPhase === "waiting-for-host",
    existingPlayerCount: players.length,
    onUpdate: handleRosterUpdate,
    onError: handleRosterPollError,
  });

  useEffect(() => {
    const id = getPlayerId();
    setPlayerId(id);

    const session = loadLobbySession();
    if (!session) {
      return;
    }

    startPageLoader();
    setDisplayName(session.displayName);
    setLobbyCode(session.lobbyCode);
    setLobbyId(session.lobbyId);
    setIsHost(session.isHost);
    setStep("lobby");

    void fetchLobbyRoster(id, true).then((success) => {
      if (isNavigatingAwayRef.current) {
        return;
      }

      if (success) {
        finishPageLoader();
        return;
      }

      // Stay on lobby with error UI rather than an infinite loader.
      cancelPageLoader();
    });
  }, [cancelPageLoader, fetchLobbyRoster, finishPageLoader, startPageLoader]);

  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.4, ease: [0.4, 0, 0.2, 1] as const };

  async function handleGetStarted() {
    if (!playerId) {
      return;
    }

    const trimmedName = displayName.trim();
    if (!trimmedName) {
      setError("Please enter your name");
      return;
    }

    trackEvent(AnalyticsEvent.NameEntered, {
      name_length: trimmedName.length,
      source_screen: "landing",
    });
    identifyPlayer(playerId, { has_display_name: true });

    setIsLoading(true);
    startPageLoader();
    setError(null);

    try {
      const { data, error: invokeError } = await createLobby(playerId, trimmedName);

      if (invokeError || !data || "error" in data) {
        trackEvent(AnalyticsEvent.LobbyCreateFailed, {
          error_message: sanitizeErrorMessage(invokeError, data),
          source_screen: "landing",
        });
        setError(getErrorMessage(invokeError, data));
        cancelPageLoader();
        return;
      }

      if (!data.session_token) {
        trackEvent(AnalyticsEvent.LobbyCreateFailed, {
          error_message: "Server did not return a session token",
          source_screen: "landing",
        });
        setError("Server did not return a session token");
        cancelPageLoader();
        return;
      }

      setDisplayName(data.display_name);
      setLobbyCode(data.code);
      setLobbyId(data.lobby_id);
      setIsHost(true);
      saveLobbySession({
        displayName: data.display_name,
        lobbyCode: data.code,
        lobbyId: data.lobby_id,
        isHost: true,
        sessionToken: data.session_token,
      });
      identifyPlayer(playerId, {
        is_host: true,
        has_active_lobby: true,
        last_lobby_id: data.lobby_id,
        has_display_name: true,
      });
      setLobbyGroup(data.lobby_id);
      trackEvent(AnalyticsEvent.LobbyCreated, {
        lobby_id: data.lobby_id,
        is_host: true,
        source_screen: "landing",
      });
      setStep("lobby");
      const success = await fetchLobbyRoster(playerId, true);
      if (isNavigatingAwayRef.current) {
        return;
      }

      if (success) {
        finishPageLoader();
      } else {
        cancelPageLoader();
      }
    } catch (caughtError) {
      trackEvent(AnalyticsEvent.LobbyCreateFailed, {
        error_message: sanitizeErrorMessage(caughtError, null),
        source_screen: "landing",
      });
      setError(getErrorMessage(caughtError, null));
      cancelPageLoader();
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExitLobby() {
    const previousLobbyId = lobbyId;

    if (playerId) {
      try {
        const { data, error: invokeError } = await leaveLobby(playerId);

        if (invokeError || !data || "error" in data) {
          setError(getErrorMessage(invokeError, data));
          return;
        }

        trackEvent(AnalyticsEvent.LobbyLeft, {
          lobby_id: previousLobbyId || undefined,
          source_screen: "lobby",
          lobby_closed: data.lobby_closed,
          is_host: isHost,
          player_count: players.length,
        });
        identifyPlayer(playerId, { has_active_lobby: false, is_host: false });
        setLobbyGroup(null);
      } catch (caughtError) {
        setError(getErrorMessage(caughtError, null));
        return;
      }
    }

    clearLobbySession();
    setLobbyCode("");
    setLobbyId("");
    setJoinCode("");
    setPlayers([]);
    setIsHost(true);
    setError(null);
    setLobbyRosterError(null);
    setStartGameError(null);
    setJoinModalPhase("enter-code");
    setStep("landing");
  }

  async function handleStartGame() {
    if (!playerId || !isHost || isLoading || isRosterLoading || isPageLoading) {
      return;
    }

    setIsLoading(true);
    startPageLoader();
    setStartGameError(null);

    try {
      const { data, error: invokeError } = await startSongSelection(playerId);

      if (invokeError || !data || "error" in data) {
        setStartGameError(getErrorMessage(invokeError, data));
        cancelPageLoader();
        return;
      }

      trackEvent(AnalyticsEvent.SongSelectionStarted, {
        lobby_id: lobbyId,
        player_count: players.length,
        is_solo: players.length <= 1,
        is_host: true,
        source_screen: "lobby",
      });
      navigateToSearch();
    } catch (caughtError) {
      setStartGameError(getErrorMessage(caughtError, null));
      cancelPageLoader();
    } finally {
      setIsLoading(false);
    }
  }

  async function restoreOwnLobbyAfterFailedJoin(
    activePlayerId: string,
    name: string,
  ): Promise<void> {
    const { data, error: invokeError } = await createLobby(activePlayerId, name);

    if (invokeError || !data || "error" in data || !data.session_token) {
      clearLobbySession();
      setLobbyCode("");
      setLobbyId("");
      setPlayers([]);
      setIsHost(true);
      identifyPlayer(activePlayerId, { has_active_lobby: false, is_host: false });
      setLobbyGroup(null);
      return;
    }

    setDisplayName(data.display_name);
    setLobbyCode(data.code);
    setLobbyId(data.lobby_id);
    setIsHost(true);
    saveLobbySession({
      displayName: data.display_name,
      lobbyCode: data.code,
      lobbyId: data.lobby_id,
      isHost: true,
      sessionToken: data.session_token,
    });
    identifyPlayer(activePlayerId, {
      is_host: true,
      has_active_lobby: true,
      last_lobby_id: data.lobby_id,
      has_display_name: true,
    });
    setLobbyGroup(data.lobby_id);
    await fetchLobbyRoster(activePlayerId, false);
  }

  async function handleJoinLobby(): Promise<boolean> {
    if (!playerId) {
      return false;
    }

    const normalizedJoinCode = normalizeLobbyCodeInput(joinCode);
    const normalizedCurrentCode = normalizeLobbyCodeInput(lobbyCode);
    const needsLobbySwitch =
      Boolean(lobbyId) && normalizedCurrentCode !== normalizedJoinCode;
    let leftCurrentLobby = false;

    setIsLoading(true);
    setError(null);

    try {
      if (!lobbyId || normalizedCurrentCode !== normalizedJoinCode) {
        const { data: validation, error: validationError } =
          await validateLobbyCode(normalizedJoinCode);

        if (
          validationError ||
          !validation ||
          "error" in validation ||
          !validation.valid ||
          !validation.exists ||
          validation.status !== "waiting"
        ) {
          trackEvent(AnalyticsEvent.LobbyJoinFailed, {
            error_message: sanitizeErrorMessage(validationError, validation),
            source_screen: "lobby",
          });
          return false;
        }
      }

      if (needsLobbySwitch) {
        const { data: leaveData, error: leaveError } = await leaveLobby(playerId);

        if (leaveError || !leaveData || "error" in leaveData) {
          trackEvent(AnalyticsEvent.LobbyJoinFailed, {
            error_message: sanitizeErrorMessage(leaveError, leaveData),
            source_screen: "lobby",
          });
          return false;
        }

        leftCurrentLobby = true;
      }

      if (!lobbyId || normalizedCurrentCode !== normalizedJoinCode) {
        const { data: joinData, error: joinInvokeError } = await joinLobby(
          playerId,
          displayName,
          normalizedJoinCode,
        );

        if (joinInvokeError || !joinData || "error" in joinData) {
          trackEvent(AnalyticsEvent.LobbyJoinFailed, {
            error_message: sanitizeErrorMessage(joinInvokeError, joinData),
            source_screen: "lobby",
          });
          if (leftCurrentLobby) {
            await restoreOwnLobbyAfterFailedJoin(playerId, displayName);
          }
          return false;
        }

        if (!joinData.session_token) {
          trackEvent(AnalyticsEvent.LobbyJoinFailed, {
            error_message: "Server did not return a session token",
            source_screen: "lobby",
          });
          if (leftCurrentLobby) {
            await restoreOwnLobbyAfterFailedJoin(playerId, displayName);
          }
          return false;
        }

        setDisplayName(joinData.display_name);
        setLobbyCode(joinData.code);
        setLobbyId(joinData.lobby_id);
        setIsHost(joinData.is_host);
        saveLobbySession({
          displayName: joinData.display_name,
          lobbyCode: joinData.code,
          lobbyId: joinData.lobby_id,
          isHost: joinData.is_host,
          sessionToken: joinData.session_token,
        });
        identifyPlayer(playerId, {
          is_host: joinData.is_host,
          has_active_lobby: true,
          last_lobby_id: joinData.lobby_id,
          has_display_name: true,
        });
        setLobbyGroup(joinData.lobby_id);
        trackEvent(AnalyticsEvent.LobbyJoined, {
          lobby_id: joinData.lobby_id,
          join_code_length: normalizedJoinCode.length,
          is_host: joinData.is_host,
          source_screen: "lobby",
        });
      }

      const success = await fetchLobbyRoster(playerId, false);
      if (success) {
        setJoinCode("");
        setStep("lobby");
        return true;
      }

      trackEvent(AnalyticsEvent.LobbyJoinFailed, {
        error_message: "Failed to load lobby roster",
        source_screen: "lobby",
      });
      if (leftCurrentLobby) {
        await restoreOwnLobbyAfterFailedJoin(playerId, displayName);
      }
      return false;
    } catch (caughtError) {
      trackEvent(AnalyticsEvent.LobbyJoinFailed, {
        error_message: sanitizeErrorMessage(caughtError, null),
        source_screen: "lobby",
      });
      if (leftCurrentLobby) {
        await restoreOwnLobbyAfterFailedJoin(playerId, displayName);
      }
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  if (isPageLoading) {
    return <PageLoader label="Loading" />;
  }

  return (
    <div className="landing-flow">
      <AnimatePresence mode="wait">
        {step === "landing" ? (
          <motion.main
            key="landing"
            className="landing-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <div className="typewriter-container">
              <TypewriterIllustration
                className="typewriter-image"
                role="img"
                aria-label="Illustration of a typewriter surrounded by music notes"
              />
              <div className="text-container">
                <h1 className="landing-title text-heading-1">kar-no-key</h1>
                <p className="landing-tagline text-body">
                  race your frens, one lyric at a time :)
                </p>
              </div>
            </div>
            <form
              className="landing-form"
              onSubmit={(event) => {
                event.preventDefault();
                void handleGetStarted();
              }}
            >
              <InputField
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="give yourself a name"
                align="center"
                aria-label="Your name"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !displayName.trim()}
              >
                get started
              </Button>
              {error ? (
                <p className="landing-form__error text-body" role="alert">
                  {error}
                </p>
              ) : null}
            </form>
          </motion.main>
        ) : (
          <motion.div
            key="lobby"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={transition}
          >
            <LobbyScreen
              displayName={displayName}
              lobbyCode={lobbyCode}
              isHost={isHost}
              players={players}
              joinCode={joinCode}
              onJoinCodeChange={setJoinCode}
              onExitLobby={handleExitLobby}
              onStartGame={handleStartGame}
              onJoinLobby={handleJoinLobby}
              isLoading={isLoading}
              isRosterLoading={isRosterLoading}
              rosterError={lobbyRosterError}
              joinModalPhase={joinModalPhase}
              onJoinModalPhaseChange={setJoinModalPhase}
              startGameError={startGameError}
            />
            {error ? (
              <p className="landing-form__error text-body" role="alert">
                {error}
              </p>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
