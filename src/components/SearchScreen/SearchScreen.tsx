"use client";

import { useState } from "react";
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
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
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
    setSelectedSong(song);
  }

  function handleConfirm() {
    if (selectedSong) {
      onConfirmSelection(selectedSong);
    }
  }

  const displaySongs = hasSearched ? songs : recommendedSongs;
  const isGridLoading = hasSearched ? isSearching : isLoadingRecommendations;

  return (
    <main className="search-screen">
      <Navbar displayName={displayName} onExitLobby={onExitLobby} />

      <div className="search-screen__body">
        <div className="search-screen__container">
          {isHost ? (
            <section className="search-screen__main">
              <div className="search-screen__search-header">
                <h1 className="search-screen__title text-heading-1">
                  SEARCH A SONG
                </h1>
                <div className="search-screen__search-bar">
                  <InputField
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    onKeyDown={handleQueryKeyDown}
                    placeholder="search for artists or songs"
                    aria-label="Search for artists or songs"
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
                    {isSearching ? "searching..." : "search"}
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

              {isGridLoading ? (
                <p className="search-screen__message text-body">
                  {hasSearched ? "searching..." : "loading recommendations..."}
                </p>
              ) : null}

              {!searchError && hasSearched && songs.length === 0 ? (
                <p className="search-screen__message text-body">
                  no songs found. try a different search.
                </p>
              ) : null}

              {!isGridLoading && displaySongs.length > 0 ? (
                <div className="search-screen__results">
                  {displaySongs.map((song) => (
                    <SongCard
                      key={song.id}
                      song={song}
                      isSelected={selectedSong?.id === song.id}
                      onSelect={handleSongSelect}
                      durationLabel={formatDuration(song.duration_sec)}
                      lyricsStatus={lyricsStatusBySongId[song.id] ?? null}
                    />
                  ))}
                </div>
              ) : null}

              {selectedSong ? (
                <div className="search-screen__confirm">
                  <Button
                    variant="primary"
                    type="button"
                    className="search-screen__confirm-button"
                    onClick={handleConfirm}
                    disabled={isConfirming}
                  >
                    {isConfirming ? "confirming..." : "confirm selection"}
                  </Button>
                  {confirmError ? (
                    <p className="search-screen__message text-body" role="alert">
                      {confirmError}
                    </p>
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
