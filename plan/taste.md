# TASTE

Taste in kar-no-key means choosing what serves a short, fair race with friends — and cutting what does not.

Each decision below uses this shape:

- **T — Tradeoff:** What competing options existed?
- **A — Assessment:** What did you notice that others might miss?
- **S — Stance:** What opinion or principle guided your decision?
- **T — Tuning:** What details did you refine to elevate the experience?
- **E — Effect:** How did that decision improve the product?

---

## 1. Interaction design

### No accounts

- **Tradeoff:** We could have required signup and login, or we could have let people join with only a display name.
- **Assessment:** Friends are already waiting in the same room, so an account wall feels heavier than the game itself.
- **Stance:** Getting into a party race should be almost instant.
- **Tuning:** Players only type a name, and the app quietly remembers them on that device for reconnects.
- **Effect:** A lobby can start in seconds instead of after an auth flow.

### Lobby codes that are easy to say

- **Tradeoff:** We could have used every letter and number for more unique codes, or we could have removed the confusing ones.
- **Assessment:** These codes are spoken out loud across a room, so characters like O and 0 are real failure points.
- **Stance:** A join code should be easy for friends to share and hear.
- **Tuning:** We removed look-alike characters such as O, 0, I, 1, and L, kept codes at six characters, and normalized input to uppercase.
- **Effect:** Friends reach the right lobby more often on the first try.

### Score the race, not perfect typing

- **Tradeoff:** We could have graded every comma and capital letter, or we could have scored the lyric race itself.
- **Assessment:** Punctuation and case punish attention to the song without making the match more fun.
- **Stance:** This is a music race, not a typing exam.
- **Tuning:** We ignore punctuation and case, score each character once, and lock a phrase when the lyric moves on.
- **Effect:** Players stay with the music instead of fighting the keyboard.

### More than one way to win

- **Tradeoff:** We could have crowned a single winner, or we could have celebrated a few different strengths.
- **Assessment:** In a friend lobby, most people finish outside first place and still want a reason to feel proud.
- **Stance:** Different skills deserve different praise.
- **Tuning:** End-of-race awards cover total score, accuracy, and speed, each with its own ranking and tie-breakers.
- **Effect:** More players leave happy, not only the person who finished first.

### Turn mistakes into help

- **Tradeoff:** We could have shown a hard error when someone does the wrong thing, or we could have guided them toward what they meant.
- **Assessment:** When a host types their own lobby code, they usually want to start playing, not join a second room.
- **Stance:** When intent is obvious, the product should help instead of blocking.
- **Tuning:** The join modal asks if they want to play themselves and offers a path to start, while page loaders stay visible long enough to avoid a flashy transition.
- **Effect:** Small mistakes feel friendly, and moving between screens still feels smooth.

---

## 2. Technical decisions

### The server decides who wins

- **Tradeoff:** We could have let the browser write scores and lobby state, or we could have kept that power on the server.
- **Assessment:** If the client controls the score, fairness becomes a hope instead of a guarantee.
- **Stance:** The browser is a terminal, and the server is the source of truth.
- **Tuning:** Direct database access is denied to clients, and every important change goes through Edge Functions.
- **Effect:** Everyone plays under the same enforceable rules.

### Live updates are hints, not the final answer

- **Tradeoff:** We could have trusted realtime score broadcasts alone, polled only on a timer, or combined both carefully.
- **Assessment:** Live updates feel great, but a broadcast on the wire is easy to spoof or get out of order.
- **Stance:** Feeling fast matters, and being correct matters more.
- **Tuning:** The client may apply only safe, forward-moving score hints for known players, then confirms state with the server about once a second.
- **Effect:** The race feels lively while the final scores stay honest.

### Identity without accounts

- **Tradeoff:** We could have built full user accounts, or we could have used a lightweight local identity.
- **Assessment:** The product needs a stable player id for reconnects, but that does not mean players need to manage a login.
- **Stance:** Identity should support the race without becoming a product surface.
- **Tuning:** A UUID is stored in local storage and sent with lobby actions so the same device can rejoin cleanly.
- **Effect:** Players can drop and come back without creating an account.

### Reject songs that cannot be raced

- **Tradeoff:** We could have allowed any YouTube result, or we could have required timed lyrics before a song can start.
- **Assessment:** A lyric race with no timed phrases is broken from the first beat, no matter how good the video is.
- **Stance:** It is better to say no than to ship a race that cannot work.
- **Tuning:** Song selection checks LRCLIB for usable timed lyrics and rejects results that have none.
- **Effect:** Every started match has phrases to type in sync with the track.

### Phrase progress is locked to the lyric clock

- **Tradeoff:** We could have let players keep scoring on old lines, or we could have advance the race with the song.
- **Assessment:** Unlimited retries on past phrases would turn the game into farming instead of racing.
- **Stance:** Scoring should follow the music forward.
- **Tuning:** Progress submits are validated on the server, characters count once, and a phrase stops accepting work once the lyric moves on.
- **Effect:** Points reflect racing the current line, not grinding history.

### Presence is server-owned (not tab teardown)

- **Tradeoff:** We could call `leaveLobby` on tab close/unload, or we could treat presence as a server TTL with a reconnect grace window.
- **Assessment:** `pagehide` / unload also fires on refresh, so an immediate leave would eject players who are only reloading. Clearing `sessionStorage` also does not delete the Postgres player row, so ghosts linger if nothing else removes them. `last_seen_at` / `is_connected` already existed but were unused after join.
- **Stance:** A short disconnect must not eject someone; a closed tab must not ghost forever when other players remain.
- **Tuning:** Lobby polls stamp the caller's `last_seen_at`, prune players older than 15 seconds, and reuse the same leave/host-transfer path. We do not leave on unload. Empty lobbies left by a sole closer still need expiration cleanup (NIM-42).
- **Effect:** Refresh reconnects cleanly; closed tabs drop out of the roster after the grace window when anyone else is still polling.
