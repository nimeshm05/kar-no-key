"use client";

import { useState } from "react";
import AnimatedEllipsis from "@/components/AnimatedEllipsis/AnimatedEllipsis";
import Button from "@/components/Button/Button";
import InputField from "@/components/InputField/InputField";
import LobbyRoster from "@/components/LobbyRoster/LobbyRoster";
import Navbar from "@/components/Navbar/Navbar";
import SongCard from "@/components/SongCard/SongCard";
import { searchSongs, type SongResult } from "@/lib/songs/searchSongs";
import type { LobbyPlayer } from "@/lib/supabase/functions";
import "./SearchScreen.css";

type SearchScreenProps = {
  displayName: string;
  isHost: boolean;
  playerId: string;
  players: LobbyPlayer[];
  isRosterLoading: boolean;
  rosterError: string | null;
  recommendedSongs: SongResult[];
  isLoadingRecommendations: boolean;
  recommendationsError: string | null;
  isConfirming: boolean;
  confirmError: string | null;
  lyricsStatusBySongId?: Record<string, "available" | "unavailable">;
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
  playerId,
  players,
  isRosterLoading,
  rosterError,
  recommendedSongs,
  isLoadingRecommendations,
  recommendationsError,
  isConfirming,
  confirmError,
  lyricsStatusBySongId = {},
  onConfirmSelection,
  onExitLobby,
}: SearchScreenProps) {
  const [query, setQuery] = useState("");
  const [songs, setSongs] = useState<SongResult[]>([]);
  const [selectedSong, setSelectedSong] = useState<SongResult | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);

  async function handleSearch() {
    setIsSearching(true);
    setSearchError(null);
    setSelectedSong(null);

    const result = await searchSongs(playerId, query);

    setIsSearching(false);
    setHasSearched(true);

    if ("error" in result) {
      setSearchError(result.error);
      setSongs([]);
      return;
    }

    setSongs(result.songs);
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

  const displaySongs = hasSearched ? songs : recommendedSongs;
  const showRecommendationsLoading = !hasSearched && isLoadingRecommendations;
  const showSongGrid =
    !showRecommendationsLoading && displaySongs.length > 0;

  return (
    <main className="search-screen">
      <Navbar displayName={displayName} onExitLobby={onExitLobby} />

      <div className="search-screen__body">
        <div className="search-screen__container">
          {isHost ? (
            <section className="search-screen__main">
              <div className="search-screen__search-header">
                <h2 className="search-screen__title text-heading-2">
                  SEARCH A SONG
                </h2>
                <div className="search-screen__search-bar">
                  <InputField
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleQueryKeyDown}
                    placeholder="artists or songs"
                    aria-label="artists or songs"
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

              {!searchError && hasSearched && !isSearching && songs.length === 0 ? (
                <p className="search-screen__message text-body">
                  no songs found. try a different search.
                </p>
              ) : null}

              {showSongGrid ? (
                <>
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
                </>
              ) : null}
            </section>
          ) : (
            <section className="search-screen__main search-screen__main--player-waiting">
              <p className="search-screen__waiting-message text-body">
                WAITING FOR THE HOST TO SELECT A SONG...
              </p>
            </section>
          )}

          <LobbyRoster
            className="search-screen__roster"
            players={players}
            isLoading={isRosterLoading}
            error={rosterError}
          />
        </div>
      </div>
    </main>
  );
}
