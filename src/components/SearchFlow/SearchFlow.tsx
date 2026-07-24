"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import PageLoader from "@/components/PageLoader/PageLoader";
import SearchScreen from "@/components/SearchScreen/SearchScreen";
import {
  identifyPlayer,
  setLobbyGroup,
  trackEvent,
} from "@/lib/analytics/amplitude";
import { AnalyticsEvent } from "@/lib/analytics/events";
import { getRouteForLobbyStatus, getErrorMessage } from "@/lib/lobby/lobbyRoute";
import {
  useLobbyStatePolling,
  type LobbyStateUpdate,
} from "@/lib/lobby/useLobbyStatePolling";
import { getPlayerId } from "@/lib/player/identity";
import {
  loadLobbySession,
  clearLobbySession,
  syncHostRoleFromPlayers,
} from "@/lib/player/session";
import type { SongResult } from "@/lib/songs/searchSongs";
import { getRecommendedSongs } from "@/lib/songs/getRecommendedSongs";
import { searchSongs } from "@/lib/songs/searchSongs";
import {
  getLobbyState,
  leaveLobby,
  selectSong,
  type LobbyPlayer,
} from "@/lib/supabase/functions";
import { useTimedPageLoader } from "@/lib/ui/useTimedPageLoader";

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
  const isNavigatingAwayRef = useRef(false);
  const {
    isLoading: isPageLoading,
    start: startPageLoader,
    finish: finishPageLoader,
    cancel: cancelPageLoader,
  } = useTimedPageLoader();
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [lyricsStatusBySongId, setLyricsStatusBySongId] = useState<
    Record<string, "available" | "unavailable">
  >({});
  const [activeTab, setActiveTab] = useState<"recommended" | "youtube">(
    "recommended",
  );
  const [recommendedSongs, setRecommendedSongs] = useState<SongResult[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [recommendationsError, setRecommendationsError] = useState<string | null>(
    null,
  );
  const [hasMoreRecommended, setHasMoreRecommended] = useState(false);
  const [recommendedOffset, setRecommendedOffset] = useState(0);
  const [searchResults, setSearchResults] = useState<SongResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasMoreSearch, setHasMoreSearch] = useState(false);
  const [searchOffset, setSearchOffset] = useState(0);
  const [searchNextPageToken, setSearchNextPageToken] = useState<
    string | undefined
  >(undefined);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState<string | null>(null);

  const navigateTo = useCallback(
    (route: string) => {
      isNavigatingAwayRef.current = true;
      startPageLoader();
      router.replace(route);
    },
    [router, startPageLoader],
  );

  const handleRouteFromStatus = useCallback(
    (status: string, songSelectionStarted: boolean) => {
      const route = getRouteForLobbyStatus(status, songSelectionStarted);

      if (route === "/game" || route === "/results") {
        navigateTo(route);
        return true;
      }

      if (!songSelectionStarted && status === "waiting") {
        navigateTo("/");
        return true;
      }

      return false;
    },
    [navigateTo],
  );

  const applyLobbyState = useCallback(
    (data: LobbyStateUpdate) => {
      setPlayers(data.players);
      setRosterError(null);

      const nextIsHost = syncHostRoleFromPlayers(
        data.players,
        playerId ?? getPlayerId(),
      );
      if (nextIsHost !== null) {
        setIsHost(nextIsHost);
      }

      handleRouteFromStatus(data.status, data.song_selection_started);
    },
    [handleRouteFromStatus, playerId],
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
      navigateTo("/");
      return;
    }

    setPlayerId(id);
    setDisplayName(session.displayName);
    setIsHost(session.isHost);
    startPageLoader();

    void fetchLobbyState(id).then((success) => {
      if (isNavigatingAwayRef.current) {
        return;
      }

      if (success) {
        setIsReady(true);
        finishPageLoader();
        return;
      }

      // Stay on search with error UI rather than an infinite loader.
      setIsReady(true);
      cancelPageLoader();
    });
  }, [cancelPageLoader, fetchLobbyState, finishPageLoader, navigateTo, startPageLoader]);

  useEffect(() => {
    if (!isReady || !isHost || !playerId) {
      return;
    }

    let cancelled = false;

    const activePlayerId = playerId;

    async function fetchRecommendations() {
      setIsLoadingRecommendations(true);
      setRecommendationsError(null);
      setLoadMoreError(null);

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
        setRecommendedSongs([]);
        setHasMoreRecommended(false);
        setRecommendedOffset(0);
        return;
      }

      setRecommendedSongs(result.songs);
      setHasMoreRecommended(result.hasMore);
      setRecommendedOffset(result.songs.length);
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

        trackEvent(AnalyticsEvent.LobbyLeft, {
          source_screen: "search",
          lobby_closed: data.lobby_closed,
          is_host: isHost,
          player_count: players.length,
        });
        identifyPlayer(playerId, { has_active_lobby: false, is_host: false });
        setLobbyGroup(null);
      } catch (caughtError) {
        setRosterError(getErrorMessage(caughtError, null));
        return;
      }
    }

    clearLobbySession();
    navigateTo("/");
  }

  async function handleSearch(query: string) {
    if (!playerId || !isHost) {
      return;
    }

    setActiveTab("youtube");
    setIsSearching(true);
    setSearchError(null);
    setLoadMoreError(null);
    setConfirmError(null);
    setHasSearched(true);
    setSearchQuery(query);
    setSearchNextPageToken(undefined);
    setSearchOffset(0);

    const result = await searchSongs(playerId, query, {
      limit: PAGE_SIZE,
      offset: 0,
    });

    setIsSearching(false);

    if ("error" in result) {
      trackEvent(AnalyticsEvent.SongSearchFailed, {
        query_length: query.trim().length,
        is_host: true,
        source_screen: "search",
        player_count: players.length,
      });
      setSearchError(result.error);
      setSearchResults([]);
      setHasMoreSearch(false);
      return;
    }

    trackEvent(AnalyticsEvent.SongSearched, {
      query_length: query.trim().length,
      result_count: result.songs.length,
      has_more: result.hasMore,
      is_host: true,
      source_screen: "search",
      player_count: players.length,
    });
    setSearchResults(result.songs);
    setHasMoreSearch(result.hasMore);
    setSearchNextPageToken(result.nextPageToken);
    setSearchOffset(result.songs.length);
  }

  async function handleLoadMore() {
    if (!playerId || !isHost || isLoadingMore) {
      return;
    }

    const loadingRecommended =
      activeTab === "recommended" && hasMoreRecommended;
    const loadingSearch = activeTab === "youtube" && hasMoreSearch;

    if (!loadingRecommended && !loadingSearch) {
      return;
    }

    setIsLoadingMore(true);
    setLoadMoreError(null);

    if (loadingSearch) {
      const result = await searchSongs(playerId, searchQuery, {
        limit: PAGE_SIZE,
        offset: searchNextPageToken ? undefined : searchOffset,
        pageToken: searchNextPageToken,
      });

      setIsLoadingMore(false);

      if ("error" in result) {
        setLoadMoreError(result.error);
        return;
      }

      trackEvent(AnalyticsEvent.SongsLoadedMore, {
        mode: "search",
        result_count: result.songs.length,
        is_host: true,
        source_screen: "search",
        player_count: players.length,
      });
      setSearchResults((current) => appendSongs(current, result.songs));
      setHasMoreSearch(result.hasMore);
      setSearchNextPageToken(result.nextPageToken);
      setSearchOffset((current) => current + result.songs.length);
      return;
    }

    const result = await getRecommendedSongs(playerId, {
      offset: recommendedOffset,
      limit: PAGE_SIZE,
    });

    setIsLoadingMore(false);

    if ("error" in result) {
      setLoadMoreError(result.error);
      return;
    }

    trackEvent(AnalyticsEvent.SongsLoadedMore, {
      mode: "recommended",
      result_count: result.songs.length,
      is_host: true,
      source_screen: "search",
      player_count: players.length,
    });
    setRecommendedSongs((current) => appendSongs(current, result.songs));
    setHasMoreRecommended(result.hasMore);
    setRecommendedOffset((current) => current + result.songs.length);
  }

  async function handleConfirmSelection(song: SongResult) {
    if (!playerId || !isHost) {
      return;
    }

    setIsConfirming(true);
    startPageLoader();
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

        trackEvent(AnalyticsEvent.SongSelectionFailed, {
          song_id: song.id,
          has_lyrics: hasLyrics,
          is_host: true,
          source_screen: "search",
          player_count: players.length,
        });
        setConfirmError(getErrorMessage(invokeError, data));
        cancelPageLoader();
        return;
      }

      setLyricsStatusBySongId((current) => ({
        ...current,
        [song.id]: "available",
      }));

      trackEvent(AnalyticsEvent.SongSelected, {
        song_id: song.id,
        song_title: data.song.title,
        duration_sec: data.song.duration_sec,
        lyrics_source: data.song.lyrics_source,
        lobby_id: data.lobby_id,
        is_host: true,
        source_screen: "search",
        player_count: players.length,
      });
      navigateTo("/game");
    } catch (caughtError) {
      trackEvent(AnalyticsEvent.SongSelectionFailed, {
        song_id: song.id,
        is_host: true,
        source_screen: "search",
        player_count: players.length,
      });
      setConfirmError(getErrorMessage(caughtError, null));
      cancelPageLoader();
    } finally {
      setIsConfirming(false);
    }
  }

  if (!isReady || isPageLoading) {
    return <PageLoader label="Loading search" />;
  }

  return (
    <SearchScreen
      displayName={displayName}
      isHost={isHost}
      players={players}
      isRosterLoading={isRosterLoading}
      rosterError={rosterError}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      recommendedSongs={recommendedSongs}
      searchResults={searchResults}
      hasSearched={hasSearched}
      isSearching={isSearching}
      searchError={searchError}
      isLoadingRecommendations={isLoadingRecommendations}
      recommendationsError={recommendationsError}
      hasMoreRecommended={hasMoreRecommended}
      hasMoreSearch={hasMoreSearch}
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
