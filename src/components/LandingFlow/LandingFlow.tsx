"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import AnimatedEllipsis from "@/components/AnimatedEllipsis/AnimatedEllipsis";
import TypewriterIllustration from "@/components/TypewriterIllustration/TypewriterIllustration";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import LobbyScreen from "@/components/LobbyScreen/LobbyScreen";
import type { JoinModalPhase } from "@/components/JoinCodeModal/JoinCodeModal";
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
  type LobbyPlayer,
} from "@/lib/supabase/functions";
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

  const navigateToLobbyRoute = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      const route = getRouteForLobbyStatus(status, songSelectionStarted);
      if (route) {
        router.push(route);
        return true;
      }
      return false;
    },
    [router],
  );

  const navigateToSearch = useCallback(() => {
    router.push("/search");
  }, [router]);

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

    setDisplayName(session.displayName);
    setLobbyCode(session.lobbyCode);
    setLobbyId(session.lobbyId);
    setIsHost(session.isHost);
    setStep("lobby");

    void fetchLobbyRoster(id, true);
  }, [fetchLobbyRoster]);

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

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: invokeError } = await createLobby(playerId, trimmedName);

      if (invokeError || !data || "error" in data) {
        setError(getErrorMessage(invokeError, data));
        return;
      }

      if (!data.session_token) {
        setError("Server did not return a session token");
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
      setStep("lobby");
      await fetchLobbyRoster(playerId, true);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError, null));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleExitLobby() {
    if (playerId) {
      try {
        const { data, error: invokeError } = await leaveLobby(playerId);

        if (invokeError || !data || "error" in data) {
          setError(getErrorMessage(invokeError, data));
          return;
        }
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
    if (!playerId || !isHost || isLoading || isRosterLoading) {
      return;
    }

    setIsLoading(true);
    setStartGameError(null);

    try {
      const { data, error: invokeError } = await startSongSelection(playerId);

      if (invokeError || !data || "error" in data) {
        setStartGameError(getErrorMessage(invokeError, data));
        return;
      }

      navigateToSearch();
    } catch (caughtError) {
      setStartGameError(getErrorMessage(caughtError, null));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleJoinLobby(): Promise<boolean> {
    if (!playerId) {
      return false;
    }

    const normalizedJoinCode = normalizeLobbyCodeInput(joinCode);
    const normalizedCurrentCode = normalizeLobbyCodeInput(lobbyCode);

    setIsLoading(true);
    setError(null);

    try {
      if (lobbyId && normalizedCurrentCode !== normalizedJoinCode) {
        const { data: leaveData, error: leaveError } = await leaveLobby(playerId);

        if (leaveError || !leaveData || "error" in leaveData) {
          return false;
        }
      }

      if (!lobbyId || normalizedCurrentCode !== normalizedJoinCode) {
        const { data: joinData, error: joinInvokeError } = await joinLobby(
          playerId,
          displayName,
          normalizedJoinCode,
        );

        if (joinInvokeError || !joinData || "error" in joinData) {
          return false;
        }

        if (!joinData.session_token) {
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
      }

      const success = await fetchLobbyRoster(playerId, false);
      if (success) {
        setJoinCode("");
        setStep("lobby");
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
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
            exit={{ opacity: 0, y: prefersReducedMotion ? 0 : -24 }}
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
            <div className="landing-form">
              <InputField
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="give yourself a name"
                align="center"
                aria-label="Your name"
                disabled={isLoading}
              />
              <Button
                type="button"
                onClick={handleGetStarted}
                disabled={isLoading}
              >
                {isLoading ? <AnimatedEllipsis label="creating" /> : "get started"}
              </Button>
              {error ? (
                <p className="landing-form__error text-body" role="alert">
                  {error}
                </p>
              ) : null}
            </div>
          </motion.main>
        ) : (
          <motion.div
            key="lobby"
            initial={{ opacity: 0, y: prefersReducedMotion ? 0 : 24 }}
            animate={{ opacity: 1, y: 0 }}
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
