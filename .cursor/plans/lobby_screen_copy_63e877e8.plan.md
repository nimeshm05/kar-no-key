---
name: Lobby screen copy
overview: Update four user-facing strings on the lobby screen in LobbyScreen.tsx, and use the new instruction copy for both solo and multi-player states.
todos:
  - id: update-lobby-copy
    content: Update instruction, primary button, join label, and secondary button copy in LobbyScreen.tsx; remove isSolo branch
    status: completed
isProject: false
---

# Lobby screen copy updates

All changes are in [`src/components/LobbyScreen/LobbyScreen.tsx`](src/components/LobbyScreen/LobbyScreen.tsx).

| Location | Current | New |
|---|---|---|
| Instructions (solo and 2+) | Conditional `"invite your friends..."` / `"share this code with your frens..."` | `"Share this room code with your friends, or take the stage solo."` for both |
| Primary host button | `let's gooo` | `Take the Stage` |
| Join section label | `did your fren give you a code?` | `Got a room code?` |
| Secondary join button | `my fren gave me a code` | `join the stage` |

Implementation notes:
- Collapse the `isSolo` / `instructions` ternary into a single constant string (or inline the one string), since both branches will match.
- No CSS or behavior changes.
- Preserve existing apostrophe escaping (`&apos;` / JSX string conventions) only if needed; the new strings use none.