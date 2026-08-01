---
name: Host disconnect edge cases doc
overview: "Add a simple-language markdown doc under plan/ that lists host tab-close edge cases, what happens today, and the fix options we discussed (especially the hybrid: keep lobby if friends remain, delete only if empty)."
todos:
  - id: write-doc
    content: Write plan/host-tab-close-edge-cases.md in simple language
    status: completed
isProject: false
---

# Host tab-close edge cases doc

Create [`plan/host-tab-close-edge-cases.md`](plan/host-tab-close-edge-cases.md) in simple language. No code changes.

## File contents (structure)

1. **The problem** — Host closes the tab instead of Leave game; lobby can linger or friends get stuck.
2. **What we do today (short)** — 15s = “stale,” not “delete lobby.” Friends polling can remove the host and promote someone. Alone = lobby may sit forever until reclaim.
3. **The rule we want** — Wait ~15s for host to come back. If they don’t: if friends are still there, keep lobby and make someone else host; if empty, delete lobby.
4. **Edge cases table** — Each case in plain English: within 15s / after 15s / friend already joined / refresh / sleep / mid-game / two tabs / host returns after promote / old invite code.
5. **Options A/B/C** — Delete always vs promote vs hybrid (recommend hybrid).
6. **What we still need later** — Cron/expiration for abandoned lobbies; no browser “exit?” popup as the real fix.

Tone: short sentences, no jargon where possible; when a term is needed (stale, reclaim), one-line definition.