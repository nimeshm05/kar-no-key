# kar-no-key

Multiplayer lyric-typing race. Create or join a lobby, pick a song, and type phrases in sync with the track — race your frens, one lyric at a time.

## How it works

1. **Landing** — enter a display name; create a lobby or join with a code
2. **Lobby** — wait for players; host starts song selection
3. **Search** — host picks a YouTube result (or recommendation) with timed lyrics
4. **Game** — countdown, synced playback, type each phrase as it lands
5. **Results** — scores and awards; host can restart

## Stack

- **Frontend:** Next.js (App Router), React, plain CSS
- **Backend:** Supabase Postgres + Edge Functions
- **Media / lyrics:** YouTube (search + playback), LRCLIB (timed lyrics)
- **Analytics:** Amplitude, Vercel Analytics

## Architecture

```text
Browser (Next.js)
  └── Edge Functions (lobby, songs, playback, scoring)
        ├── Postgres (lobbies, players, songs, scores)
        ├── YouTube API
        └── LRCLIB API
```

Client state is driven by polling lobby/roster endpoints (deny-all RLS; server is authoritative).

## Modules

### App routes (`src/app`)

| Route | Purpose |
|-------|---------|
| `/` | Landing / create or join lobby |
| `/search` | Song selection (host) / waiting (players) |
| `/game` | Countdown + race |
| `/results` | Results and awards |
| `/design-system` | Internal component gallery |

### Flows & screens (`src/components`)

- **Lobby** — `LandingFlow`, `LobbyScreen`, `JoinCodeModal`, `LobbyRoster`, `Navbar`
- **Search** — `SearchFlow`, `SearchScreen`, `SongCard`
- **Game** — `GameFlow`, `GameScreen`, `PhraseTypingArea`, `YouTubePlayer`, `MusicNoteDecorations`
- **Results** — `ResultsFlow`, `AwardsScreen`, `AwardSection`
- **Shared UI** — `Button`, `Dialog`, `Dropdown`, `InputField`, `IconButton`, `Loader`, `PageLoader`, `FeedbackDialog`, …

### Client libs (`src/lib`)

- `lobby/` — roster/state polling, route helpers, lobby code formatting
- `game/` — phrase scoring, playback sync, countdown
- `songs/` — search and recommended songs wrappers
- `player/` — local identity and session
- `supabase/` — Edge Function invoke clients
- `analytics/` — Amplitude event helpers

### Backend (`supabase/functions`)

- **Lobby** — `create-lobby`, `join-lobby`, `leave-lobby`, `generate-lobby-code`, `validate-lobby-code`, `get-lobby-players`, `get-lobby-state`, `start-song-selection`
- **Songs** — `search-songs`, `get-recommended-songs`, `select-song` (YouTube metadata + LRCLIB lyrics cache)
- **Playback** — `start-countdown`, `pause-playback`, `end-song`, `restart-game`
- **Scoring** — `submit-phrase-progress` (plus shared awards / finish-race logic)
- **Feedback** — `submit-feedback`
- **Shared** (`_shared/`) — lyrics (LRCLIB), song providers, scoring, lobby auth, CORS

### Design system (`src/styles`)

Token and semantic CSS (colors, typography, spacing). Components use dedicated `.css` files — no Tailwind.

## Known limitations

- Lyrics come from **LRCLIB only**. If a video has no usable lyrics, selection is rejected — pick another result.
- No alternate lyrics provider or curated fallback catalog yet.
