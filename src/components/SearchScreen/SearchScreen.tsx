"use client";

import { useState } from "react";
import AnimatedEllipsis from "@/components/AnimatedEllipsis/AnimatedEllipsis";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import Navbar from "@/components/Navbar/Navbar";
import SongCard from "@/components/SongCard/SongCard";
import type { SongResult } from "@/lib/songs/searchSongs";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import "./SearchScreen.css";

type SearchScreenProps = {
  displayName: string;
  isHost: boolean;
  players: LobbyPlayer[];
  isRosterLoading: boolean;
  rosterError: string | null;
  displaySongs: SongResult[];
  hasSearched: boolean;
  isSearching: boolean;
  searchError: string | null;
  isLoadingRecommendations: boolean;
  recommendationsError: string | null;
  hasMoreSongs: boolean;
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
  displaySongs,
  hasSearched,
  isSearching,
  searchError,
  isLoadingRecommendations,
  recommendationsError,
  hasMoreSongs,
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
    if (isSearching) {
      return;
    }

    setSelectedSong(null);
    await onSearch(query);
  }

  function handleQueryKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && !isSearching) {
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

  const showRecommendationsLoading = !hasSearched && isLoadingRecommendations;
  const showSongGrid =
    !showRecommendationsLoading && displaySongs.length > 0;
  const showLoadMore = isHost && showSongGrid && hasMoreSongs;
  const subtitle =
    players.length > 1
      ? "Your frens are waiting for you to select a song."
      : "Select song and start racing.";

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
              <div className="search-screen__search-header">
                <div className="search-screen__heading">
                  <h2 className="search-screen__title text-heading-2">Select a song</h2>
                  {/* <p className="search-screen__subtitle">{subtitle}</p> */}
                </div>
                <div className="search-screen__search-bar">
                  <InputField
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleQueryKeyDown}
                    placeholder="search for artists or songs"
                    aria-label="search for artists or songs"
                    className="search-screen__search-input"
                    disabled={isSearching}
                  />
                  <Button
                    variant="primary"
                    type="button"
                    className="search-screen__search-button"
                    onClick={() => void handleSearch()}
                    disabled={isSearching}
                  >
                    {isSearching ? (
                      <AnimatedEllipsis label="searching" />
                    ) : (
                      "search"
                    )}
                  </Button>
                </div>
              </div>

              {searchError ? (
                <p className="search-screen__message text-body" role="alert">
                  {searchError}
                </p>
              ) : null}

              {!hasSearched && recommendationsError ? (
                <p className="search-screen__message text-body" role="alert">
                  {recommendationsError}
                </p>
              ) : null}

              {showRecommendationsLoading ? (
                <AnimatedEllipsis
                  label="loading recommendations"
                  className="search-screen__message text-body"
                  live
                  as="p"
                />
              ) : null}

              {!searchError && hasSearched && !isSearching && displaySongs.length === 0 ? (
                <p className="search-screen__message text-body">
                  no songs found. try a different search.
                </p>
              ) : null}

              {showSongGrid ? (
                <div className="search-screen__results-section">
                  <div
                    className={[
                      "search-screen__results",
                      isSearching ? "search-screen__results--searching" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {displaySongs.map((song) => (
                      <SongCard
                        key={song.id}
                        song={song}
                        isSelected={selectedSong?.id === song.id}
                        onSelect={isConfirming ? undefined : handleSongSelect}
                        durationLabel={formatDuration(song.duration_sec)}
                        lyricsStatus={lyricsStatusBySongId[song.id] ?? null}
                      />
                    ))}
                  </div>

                  {confirmError ? (
                    <p className="search-screen__message text-body" role="alert">
                      {confirmError}
                    </p>
                  ) : null}

                  {loadMoreError ? (
                    <p className="search-screen__message text-body" role="alert">
                      {loadMoreError}
                    </p>
                  ) : null}

                  {showLoadMore ? (
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
            </section>
          ) : (
            <section className="search-screen__main search-screen__main--player-waiting">
              <p className="search-screen__waiting-message text-body">
                WAITING FOR THE HOST TO SELECT A SONG...
              </p>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}
