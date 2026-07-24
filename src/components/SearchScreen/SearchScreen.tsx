"use client";

import { useState } from "react";
import AnimatedEllipsis from "@/components/AnimatedEllipsis/AnimatedEllipsis";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import Navbar from "@/components/Navbar/Navbar";
import SongCard from "@/components/SongCard/SongCard";
import Tabs from "@/components/Tabs/Tabs";
import type { SongResult } from "@/lib/songs/searchSongs";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import "./SearchScreen.css";

const SEARCH_TABS = [
  { id: "recommended", label: "Recommended Songs" },
  { id: "youtube", label: "Search Youtube" },
] as const;

const SKELETON_COUNT = 4;

type SearchTab = "recommended" | "youtube";

type SearchScreenProps = {
  displayName: string;
  isHost: boolean;
  players: LobbyPlayer[];
  isRosterLoading: boolean;
  rosterError: string | null;
  activeTab: SearchTab;
  onTabChange: (tab: SearchTab) => void;
  recommendedSongs: SongResult[];
  searchResults: SongResult[];
  hasSearched: boolean;
  isSearching: boolean;
  searchError: string | null;
  isLoadingRecommendations: boolean;
  recommendationsError: string | null;
  hasMoreRecommended: boolean;
  hasMoreSearch: boolean;
  isLoadingMore: boolean;
  loadMoreError: string | null;
  isConfirming: boolean;
  confirmError: string | null;
  lyricsStatusBySongId?: Record<string, "available" | "unavailable">;
  onSearch: (query: string) => void | Promise<void>;
  onLoadMore: () => void | Promise<void>;
  onConfirmSelection: (song: SongResult) => void;
  onExitLobby: () => void;
};

function formatDuration(seconds?: number): string | null {
  if (!seconds) {
    return null;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export default function SearchScreen({
  displayName,
  isHost,
  players,
  isRosterLoading,
  rosterError,
  activeTab,
  onTabChange,
  recommendedSongs,
  searchResults,
  hasSearched,
  isSearching,
  searchError,
  isLoadingRecommendations,
  recommendationsError,
  hasMoreRecommended,
  hasMoreSearch,
  isLoadingMore,
  loadMoreError,
  isConfirming,
  confirmError,
  lyricsStatusBySongId = {},
  onSearch,
  onLoadMore,
  onConfirmSelection,
  onExitLobby,
}: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);

  async function handleSearch() {
    if (isSearching || !query.trim()) {
      return;
    }

    setSelectedSong(null);
    await onSearch(query);
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !isSearching && query.trim()) {
      void handleSearch();
    }
  }

  function handleSongSelect(song: SongResult) {
    if (isConfirming) {
      return;
    }

    setSelectedSong(song);
    onConfirmSelection(song);
  }

  function handleTabChange(id: string) {
    if (id === "recommended" || id === "youtube") {
      onTabChange(id);
    }
  }

  const canSearch = Boolean(query.trim()) && !isSearching;
  const isRecommendedTab = activeTab === "recommended";
  const showRecommendedSkeletons = isRecommendedTab && isLoadingRecommendations;
  const showRecommendedList =
    isRecommendedTab && !isLoadingRecommendations && recommendedSongs.length > 0;
  const showSearchSkeletons = !isRecommendedTab && isSearching;
  const showSearchResults =
    !isRecommendedTab && !isSearching && hasSearched && searchResults.length > 0;
  const showSearchEmpty =
    !isRecommendedTab && !isSearching && !hasSearched && !searchError;
  const showSearchNoResults =
    !isRecommendedTab &&
    !isSearching &&
    hasSearched &&
    !searchError &&
    searchResults.length === 0;
  const showLoadMoreRecommended =
    isHost && showRecommendedList && hasMoreRecommended;
  const showLoadMoreSearch = isHost && showSearchResults && hasMoreSearch;

  return (
    <main className="search-screen">
      <Navbar
        displayName={displayName}
        players={players}
        isRosterLoading={isRosterLoading}
        rosterError={rosterError}
        onExitLobby={onExitLobby}
      />

      <div className="search-screen__body">
        <div className="search-screen__container">
          {isHost ? (
            <section className="search-screen__main">
              <h1 className="search-screen__title text-heading-1">Song?</h1>

              <div className="search-screen__panel">
                <Tabs
                  aria-label="Song source"
                  value={activeTab}
                  onChange={handleTabChange}
                  items={[...SEARCH_TABS]}
                />

                {isRecommendedTab ? (
                  <div
                    className="search-screen__panel-body"
                    role="tabpanel"
                    id="tabpanel-recommended"
                    aria-labelledby="tab-recommended"
                  >
                    {recommendationsError ? (
                      <p className="search-screen__message text-body" role="alert">
                        {recommendationsError}
                      </p>
                    ) : null}

                    {showRecommendedSkeletons ? (
                      <div className="search-screen__results-section">
                        <div className="search-screen__results">
                          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                            <SongCard key={`rec-skeleton-${index}`} isLoading />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {showRecommendedList ? (
                      <div className="search-screen__results-section">
                        <div className="search-screen__results">
                          {recommendedSongs.map((song) => (
                            <SongCard
                              key={song.id}
                              song={song}
                              isSelected={selectedSong?.id === song.id}
                              onSelect={
                                isConfirming ? undefined : handleSongSelect
                              }
                              durationLabel={formatDuration(song.duration_sec)}
                              lyricsStatus={
                                lyricsStatusBySongId[song.id] ?? null
                              }
                            />
                          ))}
                        </div>

                        {confirmError && isRecommendedTab ? (
                          <p
                            className="search-screen__message text-body"
                            role="alert"
                          >
                            {confirmError}
                          </p>
                        ) : null}

                        {loadMoreError && isRecommendedTab ? (
                          <p
                            className="search-screen__message text-body"
                            role="alert"
                          >
                            {loadMoreError}
                          </p>
                        ) : null}

                        {showLoadMoreRecommended ? (
                          <Button
                            variant="secondary"
                            type="button"
                            className="search-screen__load-more"
                            onClick={() => void onLoadMore()}
                            disabled={isLoadingMore}
                          >
                            {isLoadingMore ? (
                              <AnimatedEllipsis label="loading" />
                            ) : (
                              "load more"
                            )}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div
                    className="search-screen__panel-body"
                    role="tabpanel"
                    id="tabpanel-youtube"
                    aria-labelledby="tab-youtube"
                  >
                    <div className="search-screen__search-bar">
                      <InputField
                        value={query}
                        onChange={(event) => setQuery(event.target.value)}
                        onKeyDown={handleQueryKeyDown}
                        placeholder="Search for artists or songs"
                        aria-label="Search for artists or songs"
                        className="search-screen__search-input"
                        disabled={isSearching}
                      />
                      <Button
                        variant="secondary"
                        type="button"
                        className="search-screen__search-button"
                        onClick={() => void handleSearch()}
                        disabled={!canSearch}
                      >
                        {isSearching ? (
                          <AnimatedEllipsis label="searching" />
                        ) : (
                          "search"
                        )}
                      </Button>
                    </div>

                    {searchError ? (
                      <p className="search-screen__message text-body" role="alert">
                        {searchError}
                      </p>
                    ) : null}

                    {showSearchEmpty ? (
                      <div className="search-screen__empty" aria-hidden="true" />
                    ) : null}

                    {showSearchSkeletons ? (
                      <div className="search-screen__results-section">
                        <div className="search-screen__results">
                          {Array.from({ length: SKELETON_COUNT }, (_, index) => (
                            <SongCard
                              key={`search-skeleton-${index}`}
                              isLoading
                            />
                          ))}
                        </div>
                      </div>
                    ) : null}

                    {showSearchNoResults ? (
                      <p className="search-screen__message text-body">
                        no songs found. try a different search.
                      </p>
                    ) : null}

                    {showSearchResults ? (
                      <div className="search-screen__results-section">
                        <div className="search-screen__results">
                          {searchResults.map((song) => (
                            <SongCard
                              key={song.id}
                              song={song}
                              isSelected={selectedSong?.id === song.id}
                              onSelect={
                                isConfirming ? undefined : handleSongSelect
                              }
                              durationLabel={formatDuration(song.duration_sec)}
                              lyricsStatus={
                                lyricsStatusBySongId[song.id] ?? null
                              }
                            />
                          ))}
                        </div>

                        {confirmError ? (
                          <p
                            className="search-screen__message text-body"
                            role="alert"
                          >
                            {confirmError}
                          </p>
                        ) : null}

                        {loadMoreError ? (
                          <p
                            className="search-screen__message text-body"
                            role="alert"
                          >
                            {loadMoreError}
                          </p>
                        ) : null}

                        {showLoadMoreSearch ? (
                          <Button
                            variant="secondary"
                            type="button"
                            className="search-screen__load-more"
                            onClick={() => void onLoadMore()}
                            disabled={isLoadingMore}
                          >
                            {isLoadingMore ? (
                              <AnimatedEllipsis label="loading" />
                            ) : (
                              "load more"
                            )}
                          </Button>
                        ) : null}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            </section>
          ) : (
            <section className="search-screen__main search-screen__main--player-waiting">
              <div className="search-screen__waiting-panel">
                <p className="search-screen__waiting-message text-body">
                  WAITING FOR THE HOST TO SELECT A SONG...
                </p>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
