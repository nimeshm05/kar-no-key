export const AnalyticsEvent = {
  NameEntered: "Name Entered",
  LobbyCreated: "Lobby Created",
  LobbyJoined: "Lobby Joined",
  LobbyLeft: "Lobby Left",
  LobbyCreateFailed: "Lobby Create Failed",
  LobbyJoinFailed: "Lobby Join Failed",
  SongSelectionStarted: "Song Selection Started",
  SongSearched: "Song Searched",
  SongSearchFailed: "Song Search Failed",
  SongsLoadedMore: "Songs Loaded More",
  SongSelected: "Song Selected",
  SongSelectionFailed: "Song Selection Failed",
  PlaybackStarted: "Playback Started",
  PlaybackPaused: "Playback Paused",
  SongEnded: "Song Ended",
  PhraseFinalized: "Phrase Finalized",
} as const;

export type AnalyticsEventName =
  (typeof AnalyticsEvent)[keyof typeof AnalyticsEvent];

export type SourceScreen = "landing" | "lobby" | "search" | "game" | "results";

export type SharedEventProps = {
  lobby_id?: string;
  is_host?: boolean;
  player_count?: number;
  lobby_status?: string;
  source_screen?: SourceScreen;
};

export type EventPropertiesMap = {
  [AnalyticsEvent.NameEntered]: SharedEventProps & {
    name_length: number;
  };
  [AnalyticsEvent.LobbyCreated]: SharedEventProps & {
    lobby_id: string;
  };
  [AnalyticsEvent.LobbyJoined]: SharedEventProps & {
    lobby_id: string;
    join_code_length: number;
  };
  [AnalyticsEvent.LobbyLeft]: SharedEventProps & {
    lobby_id?: string;
    source_screen: SourceScreen;
    lobby_closed?: boolean;
  };
  [AnalyticsEvent.LobbyCreateFailed]: SharedEventProps & {
    error_message: string;
  };
  [AnalyticsEvent.LobbyJoinFailed]: SharedEventProps & {
    error_message: string;
  };
  [AnalyticsEvent.SongSelectionStarted]: SharedEventProps & {
    lobby_id: string;
    player_count: number;
    is_solo: boolean;
  };
  [AnalyticsEvent.SongSearched]: SharedEventProps & {
    query_length: number;
    result_count: number;
    has_more: boolean;
  };
  [AnalyticsEvent.SongSearchFailed]: SharedEventProps & {
    query_length: number;
  };
  [AnalyticsEvent.SongsLoadedMore]: SharedEventProps & {
    mode: "search" | "recommended";
    result_count: number;
  };
  [AnalyticsEvent.SongSelected]: SharedEventProps & {
    song_id: string;
    song_title: string;
    duration_sec?: number;
    lyrics_source?: string;
  };
  [AnalyticsEvent.SongSelectionFailed]: SharedEventProps & {
    song_id: string;
    has_lyrics?: boolean;
  };
  [AnalyticsEvent.PlaybackStarted]: SharedEventProps & {
    lobby_id: string;
    song_id: string;
    player_count: number;
  };
  [AnalyticsEvent.PlaybackPaused]: SharedEventProps & {
    lobby_id: string;
    playback_elapsed_ms: number;
  };
  [AnalyticsEvent.SongEnded]: SharedEventProps & {
    lobby_id: string;
    song_id: string;
    final_score: number;
    phrases_completed: number;
    player_count: number;
  };
  [AnalyticsEvent.PhraseFinalized]: SharedEventProps & {
    phrase_index: number;
    points_awarded: number;
    score: number;
    phrases_completed: number;
  };
};
