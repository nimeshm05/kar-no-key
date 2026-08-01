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

### Closing a tab is not leaving the party (hybrid presence)

- **Tradeoff:** We walked through several ways to handle “host closed the tab instead of Leave game”:
  1. **Leave on unload** — call `leaveLobby` from `pagehide` / `beforeunload` when the tab dies.
  2. **Always delete the lobby after grace if the host is gone** (Option A) — simple cleanup, room vanishes for everyone.
  3. **Never delete; only promote** (Option B) — friends keep playing, but empty rooms linger.
  4. **Browser “exit game?” dialog** — try to force an intentional leave on close.
  5. **What we shipped (Option C — hybrid)** — server-owned presence with a short grace: resume if they come back in time; promote if friends remain; delete when the room is empty/all-stale (poll prune + cron). Within grace, get started resumes the same code; after grace, create starts a new lobby.
- **Assessment:** Most people will close the tab, not click Leave. The first instinct — leave on unload — is the worst UX for this product: refresh, accidental close, and “I meant to come right back” all look like abandon, so you eject someone mid-setup or mid-race and burn the invite code. Hard-deleting whenever the host goes stale (Option A) punishes friends already in the room. Promote-only (Option B) is kind to the party but leaves alone-host ghost lobbies forever until something else cleans them. A custom close popup is unreliable (especially on mobile) and is not a real leave path. We also hit a practical trap after poll presence alone: if the host was alone, nobody left polls, so prune never ran — and create returned **409 already in an active lobby**, blocking get started even though they had clearly abandoned.
- **Stance:** A short disconnect must not feel like punishment; a closed tab must not ghost forever; friends already in the room outrank an empty code. Presence belongs on the server, not in browser teardown.
- **Tuning:** Lobby polls stamp `last_seen_at` and prune with status-aware grace (**15s** waiting / song selection, **45s** in race states). Prune re-checks presence before remove so a reconnect at the boundary wins. Within grace, create **resumes** the same lobby (same code, still host if still host). After grace, stale membership is **reclaimed** and create makes a new lobby. Friends remaining → keep lobby and **promote**. Empty / all-stale → delete via `cleanup-stale-lobbies` (cron). Old host after promote may rejoin with the code as a normal player. No unload leave; no custom close dialog.
- **Effect:** Refresh and brief blinks feel safe; friends keep the party when the host drops; alone-host abandons clear on reclaim or cron; get started is never permanently stuck on a ghost seat; mid-race backgrounding is less harsh.

---

## Case study: host closes the tab

### 1. Problem

Most players do not click **Leave game**. They close the browser tab or the window.

When that happens, the server can still think they are in the lobby. Friends may keep seeing a ghost host. Empty lobbies can sit in the database for a long time. If the host was alone and comes back later, create lobby can fail with “already in an active lobby,” even though they clearly left.

Refresh makes this harder. Closing a tab and reloading the page look similar to the browser, so a harsh leave rule can punish people who only meant to reload.

### 2. Alternative approaches we thought about

**Leave on unload.** Call leave lobby as soon as the tab closes. The rationale was simple: if the tab is gone, remove the player right away. We rejected this from a UX point of view. Refresh also fires unload events, so a reload would kick someone out of their own lobby and burn the invite code. Accidental closes and “I will be right back” would feel the same as quitting.

**Always delete the lobby after a short wait if the host is gone (Option A).** The rationale was cleanup: after about fifteen seconds, the room disappears so ghost lobbies do not linger. We rejected this because it is harsh on friends. If someone already joined and the host accidentally closed the tab, the whole party would get kicked.

**Never delete; only promote another player (Option B).** The rationale was to protect the party. Friends stay in the room, and someone else becomes host. We liked this for multiplayer, but it does not solve the alone-host case. If the host was alone, nobody is left to clean up, so empty lobbies and stale player rows can linger forever.

**Browser “Do you want to exit the game?” dialog.** The rationale was to force an intentional choice before close. We rejected this because browsers do not let us control that dialog reliably, especially on phones. It is not a solid leave path.

**Poll presence only, without reclaim or cron.** We did ship heartbeat and prune first. Friends who stay in the lobby can remove a stale host and promote someone else. That helped the multiplayer case. The remaining UX problem was the alone host: with nobody left polling, prune never ran, and get started could stay blocked on a ghost membership.

### 3. The final solution we chose

We chose a **hybrid** model (Option C).

Presence lives on the server. Lobby polls stamp `last_seen_at`. After a grace window, stale players are pruned. The grace is about **fifteen seconds** while waiting or picking a song, and about **forty-five seconds** during an active race so a short background or sleep is less harsh.

If the host comes back **within grace** and hits get started, they **resume the same lobby and the same code**. They stay host if they are still host.

If they come back **after grace**, we reclaim the stale seat and create a **new lobby with a new code**. The old invite should fail with a clear “lobby not found or has closed” message.

If **friends are still there** after grace, we keep the lobby and promote the earliest remaining player. The old host may later join again with the code as a normal player, not as host automatically.

If the lobby is **empty or everyone is stale**, we delete it. Poll prune handles this when someone is still online. A scheduled cleanup job handles the alone-host case when nobody is left to poll.

We do not leave on unload, and we do not rely on a custom close popup.

**Rationale.** A short disconnect should not feel like punishment. Friends already in the room matter more than keeping an empty invite code alive. Closing a tab should not ghost forever, and get started should not stay stuck on an abandoned seat. Hybrid presence gives reconnect safety, protects the party, and still cleans up empty rooms.
