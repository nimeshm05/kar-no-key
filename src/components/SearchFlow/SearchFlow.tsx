"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import SearchScreen from "@/components/SearchScreen/SearchScreen";
import { getRouteForLobbyStatus, getErrorMessage } from "@/lib/lobby/lobbyRoute";
import {
  useLobbyStatePolling,
  type LobbyStateUpdate,
} from "@/lib/lobby/useLobbyStatePolling";
import { getPlayerId } from "@/lib/player/identity";
import { loadLobbySession, clearLobbySession } from "@/lib/player/session";
import type { SongResult } from "@/lib/songs/searchSongs";
import { getRecommendedSongs } from "@/lib/songs/getRecommendedSongs";
import { searchSongs } from "@/lib/songs/searchSongs";
import {
  getLobbyState,
  leaveLobby,
  selectSong,
  type LobbyPlayer,
} from "@/lib/supabase/functions";

const PAGE_SIZE = 6;

function appendSongs(existing: SongResult[], incoming: SongResult[]): SongResult[] {
  const seen = new Set(existing.map((song) => song.id));
  const merged = [...existing];

  for (const song of incoming) {
    if (!seen.has(song.id)) {
      merged.push(song);
      seen.add(song.id);
    }
  }

  return merged;
}

export default function SearchFlow() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<LobbyPlayer[]>([]);
  const [isRosterLoading, setIsRosterLoading] = useState(true);
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [lyricsStatusBySongId, setLyricsStatusBySongId] = useState<
    Record<string, "available" | "unavailable">
  >({});
  const [displaySongs, setDisplaySongs] = useState<SongResult[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(
    null,
  );
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasMoreSongs, setHasMoreSongs] = useState(false);
  const [paginationOffset, setPaginationOffset] = useState(0);
  const [searchNextPageToken, setSearchNextPageToken] = useState<
    string | undefined
  >(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const handleRouteFromStatus = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      const route = getRouteForLobbyStatus(status, songSelectionStarted);

      if (route === "/game") {
        router.replace("/game");
        return true;
      }

      if (!songSelectionStarted && status === "waiting") {
        router.replace("/");
        return true;
      }

      return false;
    },
    [router],
  );

  const applyLobbyState = useCallback(
    (data: LobbyStateUpdate) => {
      setPlayers(data.players);
      setRosterError(null);
      handleRouteFromStatus(data.status, data.song_selection_started);
    },
    [handleRouteFromStatus],
  );

  const fetchLobbyState = useCallback(
    async (activePlayerId: string) => {
      setIsRosterLoading(true);
      setRosterError(null);

      try {
        const { data, error: invokeError } = await getLobbyState(activePlayerId);

        if (invokeError || !data || "error" in data) {
          setRosterError(getErrorMessage(invokeError, data));
          return false;
        }

        if (
          handleRouteFromStatus(data.status, data.song_selection_started)
        ) {
          return false;
        }

        applyLobbyState(data);
        return true;
      } catch (caughtError) {
        setRosterError(getErrorMessage(caughtError, null));
        return false;
      } finally {
        setIsRosterLoading(false);
      }
    },
    [applyLobbyState, handleRouteFromStatus],
  );

  const handleStateUpdate = useCallback(
    (data: LobbyStateUpdate) => {
      applyLobbyState(data);
    },
    [applyLobbyState],
  );

  const handleStatePollError = useCallback((message: string) => {
    setRosterError(message);
  }, []);

  useLobbyStatePolling({
    playerId,
    enabled: isReady,
    onUpdate: handleStateUpdate,
    onError: handleStatePollError,
  });

  useEffect(() => {
    const id = getPlayerId();
    const session = loadLobbySession();

    if (!session) {
      router.replace("/");
      return;
    }

    setPlayerId(id);
    setDisplayName(session.displayName);
    setIsHost(session.isHost);

    void fetchLobbyState(id).then((success) => {
      if (success) {
        setIsReady(true);
      }
    });
  }, [fetchLobbyState, router]);

  useEffect(() => {
    if (!isReady || !isHost || !playerId) {
      return;
    }

    let cancelled = false;

    const activePlayerId = playerId;

    async function fetchRecommendations() {
      setIsLoadingRecommendations(true);
      setRecommendationsError(null);
      setHasSearched(false);
      setSearchQuery("");
      setSearchError(null);
      setLoadMoreError(null);
      setSearchNextPageToken(undefined);

      const result = await getRecommendedSongs(activePlayerId, {
        offset: 0,
        limit: PAGE_SIZE,
      });

      if (cancelled) {
        return;
      }

      setIsLoadingRecommendations(false);

      if ("error" in result) {
        setRecommendationsError(result.error);
        setDisplaySongs([]);
        setHasMoreSongs(false);
        setPaginationOffset(0);
        return;
      }

      setDisplaySongs(result.songs);
      setHasMoreSongs(result.hasMore);
      setPaginationOffset(result.songs.length);
    }

    void fetchRecommendations();

    return () => {
      cancelled = true;
    };
  }, [isReady, isHost, playerId]);

  async function handleExitLobby() {
    if (playerId) {
      try {
        const { data, error: invokeError } = await leaveLobby(playerId);

        if (invokeError || !data || "error" in data) {
          setRosterError(getErrorMessage(invokeError, data));
          return;
        }
      } catch (caughtError) {
        setRosterError(getErrorMessage(caughtError, null));
        return;
      }
    }

    clearLobbySession();
    router.replace("/");
  }

  async function handleSearch(query: string) {
    if (!playerId || !isHost) {
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setLoadMoreError(null);
    setConfirmError(null);
    setHasSearched(true);
    setSearchQuery(query);
    setSearchNextPageToken(undefined);
    setPaginationOffset(0);

    const result = await searchSongs(playerId, query, {
      limit: PAGE_SIZE,
      offset: 0,
    });

    setIsSearching(false);

    if ("error" in result) {
      setSearchError(result.error);
      setDisplaySongs([]);
      setHasMoreSongs(false);
      return;
    }

    setDisplaySongs(result.songs);
    setHasMoreSongs(result.hasMore);
    setSearchNextPageToken(result.nextPageToken);
    setPaginationOffset(result.songs.length);
  }

  async function handleLoadMore() {
    if (!playerId || !isHost || isLoadingMore || !hasMoreSongs) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    if (hasSearched) {
      const result = await searchSongs(playerId, searchQuery, {
        limit: PAGE_SIZE,
        offset: searchNextPageToken ? undefined : paginationOffset,
        pageToken: searchNextPageToken,
      });

      setIsLoadingMore(false);

      if ("error" in result) {
        setLoadMoreError(result.error);
        return;
      }

      setDisplaySongs((current) => appendSongs(current, result.songs));
      setHasMoreSongs(result.hasMore);
      setSearchNextPageToken(result.nextPageToken);
      setPaginationOffset((current) => current + result.songs.length);
      return;
    }

    const result = await getRecommendedSongs(playerId, {
      offset: paginationOffset,
      limit: PAGE_SIZE,
    });

    setIsLoadingMore(false);

    if ("error" in result) {
      setLoadMoreError(result.error);
      return;
    }

    setDisplaySongs((current) => appendSongs(current, result.songs));
    setHasMoreSongs(result.hasMore);
    setPaginationOffset((current) => current + result.songs.length);
  }

  async function handleConfirmSelection(song: SongResult) {
    if (!playerId || !isHost) {
      return;
    }

    setIsConfirming(true);
    setConfirmError(null);

    try {
      const { data, error: invokeError } = await selectSong(playerId, song.id);

      if (invokeError || !data || "error" in data) {
        const hasLyrics =
          data && typeof data === "object" && "has_lyrics" in data
            ? (data as { has_lyrics?: boolean }).has_lyrics
            : undefined;

        if (hasLyrics === false) {
          setLyricsStatusBySongId((current) => ({
            ...current,
            [song.id]: "unavailable",
          }));
        }

        setConfirmError(getErrorMessage(invokeError, data));
        return;
      }

      setLyricsStatusBySongId((current) => ({
        ...current,
        [song.id]: "available",
      }));

      router.replace("/game");
    } catch (caughtError) {
      setConfirmError(getErrorMessage(caughtError, null));
    } finally {
      setIsConfirming(false);
    }
  }

  if (!isReady) {
    return null;
  }

  return (
    <SearchScreen
      displayName={displayName}
      isHost={isHost}
      players={players}
      isRosterLoading={isRosterLoading}
      rosterError={rosterError}
      displaySongs={displaySongs}
      hasSearched={hasSearched}
      isSearching={isSearching}
      searchError={searchError}
      isLoadingRecommendations={isLoadingRecommendations}
      recommendationsError={recommendationsError}
      hasMoreSongs={hasMoreSongs}
      isLoadingMore={isLoadingMore}
      loadMoreError={loadMoreError}
      isConfirming={isConfirming}
      confirmError={confirmError}
      lyricsStatusBySongId={lyricsStatusBySongId}
      onSearch={handleSearch}
      onLoadMore={handleLoadMore}
      onConfirmSelection={handleConfirmSelection}
      onExitLobby={handleExitLobby}
    />
  );
}
