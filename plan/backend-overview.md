Multiplayer Lobby Backend Specification
Overview

The multiplayer typing game does not require users to create an account or authenticate.

Every player joins anonymously by entering a display name.

The backend is responsible for managing lobby creation, lobby discovery, player membership, lobby lifecycle, reconnects, validation, and all multiplayer state.

The backend should always be considered the source of truth.

User Journey

The multiplayer experience begins on the landing page.

The user enters a display name.

Example:

Name

Nimesh

After clicking Get Started, the user enters the multiplayer flow.

At this point, two possibilities exist.

Create a Lobby

The backend generates a unique lobby code.

Example:

ABX92K

The user becomes the host of this lobby.

The lobby remains open while waiting for players.

The host may share the code with friends.

Join a Lobby

Another player enters:

Display name
Lobby code

Example:

Name

Alex

Lobby Code

ABX92K

If validation succeeds, the player joins the existing lobby.

All players using the same code should enter the same lobby.

Lobby Rules

A lobby may contain a maximum of 10 players.

Players remain inside the lobby until:

they leave
the host closes the lobby
the lobby expires
the game finishes and the lobby is destroyed

Every lobby has exactly one host.

The host is responsible for:

selecting the song
starting the game
ending the game

No other player may perform these actions.

Player Identity

Although there is no authentication, every browser should have a persistent anonymous identity.

On first visit:

Generate a unique anonymous player identifier.
Store it locally.
Reuse it on future visits.

This identifier is not visible to the player.

The player only sees their display name.

The anonymous identifier exists solely to allow reconnection and prevent accidental duplicate identities after refreshes.

Lobby Lifecycle

Every lobby moves through the following states.

Waiting

↓

Ready

↓

Countdown

↓

Playing

↓

Finished

↓

Closed

Only the backend may change lobby state.

Clients must never determine lobby state themselves.

Lobby Code Generation

Every lobby receives a randomly generated invite code.

Requirements:

uppercase letters and numbers
easy to read
reasonably short
unique

The backend must verify uniqueness before creating the lobby.

If a collision occurs, another code must be generated.

Players should never encounter duplicate lobby codes.

Display Name Validation

Display names should satisfy the following rules.

cannot be empty
minimum length
maximum length
leading and trailing whitespace removed
duplicate names inside the same lobby are not allowed
profanity should be rejected
extremely long repeated characters should be rejected

Examples of invalid names:

AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA

" "

🤬

Admin

Host

Display names only need to be unique within a lobby.

Different lobbies may contain players with identical names.

Joining a Lobby

When a player attempts to join a lobby, the backend should validate the request.

The player may only join if:

the lobby exists
the lobby has not reached capacity
the lobby is accepting players
the display name is available
the player is not already connected to that lobby

If any validation fails, the backend should return a meaningful error.

Lobby Capacity

Maximum players:

10

Once the lobby reaches capacity:

additional players cannot join
existing players remain unaffected

If a player leaves before the game starts, another player may join.

Reconnecting

Players may accidentally:

refresh
close the browser
lose internet
restart the device

The backend should support reconnecting whenever possible.

If the player reconnects using the same anonymous identifier while the lobby is still active:

Restore:

display name
score
player state
lobby membership

The player should not become a new player.

Host Migration

The host may disconnect unexpectedly.

Different situations require different behavior.

Waiting

Promote another connected player to host.

The lobby should continue.

Countdown

Pause or cancel the countdown.

Assign a new host.

Return the lobby to Waiting if necessary.

Playing

The game should continue.

A new host should be assigned.

The game should not end simply because the host disconnected.

Lobby Expiration

Empty lobbies should not exist forever.

If:

everyone leaves
the lobby remains inactive
the game has finished

The backend should automatically destroy the lobby after an appropriate timeout.

Lobby codes should eventually become reusable.

Edge Cases

The backend must correctly handle the following situations.

Invalid lobby code

Player enters a code that does not exist.

Return:

Lobby not found.

Lobby is full

An eleventh player attempts to join.

Reject the request.

Duplicate display name

Another player already has that name.

Reject the request.

Player joins after game started

Late joining is not permitted.

Reject the request.

Player refreshes during gameplay

The player should reconnect to the existing session rather than creating a second player.

Host refreshes

Refreshing should not create a new host.

The host should resume ownership.

Network interruption

Temporary connection loss should not immediately remove the player.

Allow a short reconnection window.

Browser opened twice

The same anonymous player opens two browser tabs.

Only one active session should be allowed.

The backend should decide whether to:

disconnect the previous session
reject the new session

Both should never control the same player simultaneously.

Simultaneous joins

Multiple players attempt to join the last remaining slot simultaneously.

Only one player should receive the final position.

The backend must prevent overfilling the lobby.

Lobby code collision

Generated invite code already exists.

Generate another code.

Player leaves voluntarily

The player should immediately leave the lobby.

Their slot becomes available if the game has not started.

Everyone leaves

If every player disconnects or leaves:

Destroy the lobby after a timeout.

Host leaves before game starts

Assign a new host automatically.

Host leaves during gameplay

Assign a new host.

Continue the game.

Song not selected

The host attempts to start the game without selecting a song.

Reject the request.

Song unavailable

The selected song cannot be loaded.

The game should not start.

Duplicate join requests

A player accidentally presses Join multiple times.

The backend should ensure only one player record is created.

Slow network

One player's network is significantly slower than everyone else's.

The backend remains authoritative.

The player's client should synchronize to the current game state after reconnecting.

Lobby destroyed while joining

A player attempts to join while the lobby is simultaneously being deleted.

Return an appropriate error rather than allowing inconsistent state.

Invalid requests

The backend should gracefully reject malformed requests, including:

missing player name
missing lobby code
invalid lobby code format
invalid player identifier
corrupted client state
Backend Responsibilities

The backend is responsible for:

creating lobbies
generating invite codes
validating joins
managing lobby membership
assigning hosts
handling reconnects
enforcing lobby capacity
validating display names
cleaning up expired lobbies
preventing duplicate players
managing lobby state transitions
ensuring consistency during concurrent requests

At no point should the frontend be trusted to determine lobby membership or lobby state.

The backend should always be considered the single source of truth.