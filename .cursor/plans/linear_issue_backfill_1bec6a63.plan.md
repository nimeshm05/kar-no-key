---
name: Linear Issue Backfill
overview: Backfill the kar-no-key Linear project with feature-level Done issues (frontend vs backend), each with detailed descriptions and met acceptance criteria, plus Todo follow-up issues for known gaps.
todos:
  - id: create-labels
    content: Create Linear labels Frontend and Backend
    status: completed
  - id: create-fe-done
    content: Create 17 Done [FE] Feature issues under kar-no-key
    status: completed
  - id: create-be-done
    content: Create 10 Done [BE] Feature issues under kar-no-key
    status: completed
  - id: create-followups
    content: Create ~10 Todo follow-up issues and relateTo parents
    status: completed
  - id: return-summary
    content: Return issue ID/URL summary table for review
    status: completed
isProject: false
---

# Linear Issue Backfill for kar-no-key

## Decisions (locked)

- **Team:** Nimesh's Company (`NIM`)
- **Project:** [kar-no-key](https://linear.app/nimeshs-company/project/kar-no-key-82d37f2610be) (already exists)
- **Granularity:** Feature-level (~17 FE + ~10 BE Done issues), not one issue per commit or CSS tweak
- **FE/BE split:** Title prefixes `[FE]` / `[BE]` plus new labels `Frontend` and `Backend` (workspace currently only has Feature / Improvement / Bug)
- **Shipped work:** Status **Done**, label **Feature**
- **Unmet acceptance criteria:** Do **not** leave open checkboxes on Done issues. Parent Done issues only list criteria that are true in the codebase today. Gaps become separate **Todo** follow-ups labeled `Improvement` (or `Bug` if broken), related to the parent via `relatedTo`
- **Issue body template** (markdown):

```markdown
## Summary
...

## Scope
- Key files / routes / edge functions

## Acceptance criteria
- [x] Met criterion...
- [x] ...

## Notes
- Links to related Cursor plans where useful
- Out of scope / deferred called out briefly
```

## Workflow (after you approve)

1. Create labels `Frontend` and `Backend` via Linear MCP
2. Create all **Done** parent issues under project `kar-no-key`
3. Create **Todo** follow-up issues; link each to its parent with `relatedTo`
4. Return a summary table of created issue IDs/URLs for your review

No code or repo changes — Linear only.

---

## Frontend Done issues

1. **[FE] Landing brand page + typewriter illustration** — Hero, pendulum notes, twinkles, gradient blob (`LandingFlow`, `TypewriterIllustration`, `GradientBlob`)
2. **[FE] Create lobby from landing** — Name submit → create lobby → session persist → lobby screen
3. **[FE] Lobby code screen** — Share code, host start, join CTA, roster polling, exit
4. **[FE] Join-code modal (multi-phase)** — Dialog shell, enter/joining/error/waiting/own-code phases, scroll lock
5. **[FE] Host own-code join error** — Intercept self-join before API
6. **[FE] Shared navbar** — Greeting, players dropdown, more menu, leave game, 80vw layout
7. **[FE] Song selection screen** — Host search/recs/load-more; player waiting; state routing
8. **[FE] Song card UI** — Metadata, hover select, lyrics badges
9. **[FE] Game screen play flow** — Ready / countdown / typing panel; host play/pause/end
10. **[FE] Synced YouTube audio playback** — Hidden player + drift correction via `usePlaybackSync`
11. **[FE] Phrase typing UI + scoring client** — Overlay textarea, debounce submit, finalize on lock
12. **[FE] In-game live leaderboard** — Score-sorted `LobbyRoster`, broadcast + poll merge, lead celebration
13. **[FE] Lobby status routing + session guards** — `lobbyRoute`, polling redirects, session gates
14. **[FE] Design tokens + UI primitives** — Token layers + Button/Input/Dropdown/Dialog/Ellipsis
15. **[FE] Password-gated design system gallery** — `/design-system` + unlock cookie flow
16. **[FE] Amplitude product analytics** — Init, taxonomy, funnel instrumentation
17. **[FE] Player identity + lobby session persistence** — localStorage UUID + sessionStorage lobby session

*(Host own-code could fold into join-modal; kept separate because it shipped as its own plan and has clear ACs.)*

## Backend Done issues

1. **[BE] Postgres schema & RLS foundation** — Migrations 001–008, deny-all RLS, core tables
2. **[BE] Lobby invite code generation & validation** — Shared alphabet + `generate-lobby-code` / `validate-lobby-code`
3. **[BE] Lobby create / join / leave lifecycle** — Membership, capacity, host transfer, display-name rules
4. **[BE] Player session tokens & lobby auth guard** — HMAC tokens, `requireLobbyPlayer`, CORS, effective status
5. **[BE] Lobby state & roster reads** — `get-lobby-players`, `get-lobby-state` for polling
6. **[BE] Song selection lifecycle** — start selection, search, recommendations, select + lyrics cache
7. **[BE] Synced playback control** — start-countdown, pause-playback, end-song clocks
8. **[BE] Realtime phrase scoring & score broadcast** — `submit-phrase-progress` + scoring shared + Realtime
9. **[BE] Shared rate limiting infrastructure** — Postgres sliding windows
10. **[BE] Design-system unlock API** — Next.js `POST /api/design-system/unlock` (non-game)

## Todo follow-ups (gaps from inventory)

### Frontend
- **[FE] Wire Navbar Feedback action** — currently closes menu only
- **[FE] Remove dead MusicNoteDecorations + empty component dirs** — unused/orphan folders
- **[FE] Restore or remove SearchScreen subtitle** — commented-out copy
- **[FE] Add design-system middleware gate** — planned defense-in-depth missing

### Backend
- **[BE] Lobby expiration & cleanup** — `expires_at` unused; no job
- **[BE] Heartbeat / disconnect detection** — `last_seen_at` / `is_connected` unused
- **[BE] Finished / results state machine** — `finished` enum unused; no auto-end
- **[BE] Atomic rate limiting** — check-then-update race under concurrency
- **[BE] Retire or document generate-lobby-code** — largely superseded by create-lobby
- **[BE] Lyrics fallback / alternate catalog** — LRCLIB-only today

## Issue count

| Type | Count |
|------|-------|
| Done FE | 17 |
| Done BE | 10 |
| Todo follow-ups | 10 |
| **Total** | **~37** |

## Out of scope for this backfill

- Creating issues for every git commit or every `.cursor/plans` file (plans will be referenced inside issue Notes)
- Rewriting product docs in the repo
- Implementing any follow-up work

## Source inventory (for description accuracy)

- FE: components under [`src/components/`](src/components/), flows/pages under [`src/app/`](src/app/), client libs under [`src/lib/`](src/lib/)
- BE: Edge Functions under [`supabase/functions/`](supabase/functions/), migrations under [`supabase/migrations/`](supabase/migrations/)
- Scoring rules: [`plan/points-strategy.md`](plan/points-strategy.md)
