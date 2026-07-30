---
name: NIM-63 Linear Writeup
overview: Update Linear issue [NIM-63](https://linear.app/nimeshs-company/issue/NIM-63/fe-loading-screen-label-indicators) with a Summary / Scope / Acceptance criteria writeup for visible, transition-aware labels on the existing PageLoader.
todos:
  - id: draft-nim-63-body
    content: Write NIM-63 description (Summary, Scope, Label map, AC, Notes) via Linear save_issue
    status: completed
  - id: link-nim-54
    content: Relate NIM-63 to NIM-54 via relatedTo
    status: completed
isProject: false
---

# Update NIM-63: Loading Screen Label Indicators

## Context

[NIM-63](https://linear.app/nimeshs-company/issue/NIM-63/fe-loading-screen-label-indicators) is empty (Todo, Frontend + Improvement, Medium). It follows completed [NIM-54](https://linear.app/nimeshs-company/issue/NIM-54/fe-page-transition-loader-centered-120px-grid) (full-screen pixel-grid PageLoader + 2.5s timed gate).

Today:
- [`PageLoader`](src/components/PageLoader/PageLoader.tsx) centers the 120px grid; [`Loader`](src/components/Loader/Loader.tsx) puts `label` on **`aria-label` only** — no visible text
- Flows pass generic destination strings: `"Loading"`, `"Loading search"`, `"Loading game"`, `"Loading results"`
- In-screen progress already uses lowercase playful copy (`loading lobby`, `searching`, `wait...`) via `AnimatedEllipsis` — PageLoader should match that voice

## What we will write on NIM-63

Use the same structure as NIM-54: **Summary / Scope / Label map / Acceptance criteria / Notes**. Also set `relatedTo: ["NIM-54"]` (append-only).

### Summary (intent)

Show a **visible** status label under the page-transition loader that names the transition in progress (not a generic “Loading”). Labels stay lowercase and match app tone. Timing, cancel-on-error, and which navigations use PageLoader stay as in NIM-54.

### Scope (implementation hint for later)

- Extend [`PageLoader`](src/components/PageLoader/PageLoader.tsx) (+ CSS) so `label` renders as visible text below the grid (and remains the accessible name)
- Pass **transition-specific** labels from [`LandingFlow`](src/components/LandingFlow/LandingFlow.tsx), [`SearchFlow`](src/components/SearchFlow/SearchFlow.tsx), [`GameFlow`](src/components/GameFlow/GameFlow.tsx), [`ResultsFlow`](src/components/ResultsFlow/ResultsFlow.tsx) — including outbound `startPageLoader()` paths, not only mount/bootstrap
- Design-system gallery sample for labeled PageLoader
- Out of scope: in-screen `AnimatedEllipsis` / skeletons / join-modal wait copy; loader timing/hook behavior

### Label map (concrete defaults)

| Transition | Visible label |
|---|---|
| Landing → lobby (create) | `creating lobby` |
| Session restore → lobby / mid-flow | destination: `loading lobby` / `loading search` / `loading game` / `loading results` |
| Lobby → search (start song pick / poll) | `loading search` |
| Search → game (song confirmed / poll) | `loading game` |
| Game → results (finished) | `loading results` |
| Results → search (host restart) | `loading search` |
| Any → home (exit / lobby closed) | `leaving lobby` |

### Acceptance criteria (checkboxes for the issue)

- Visible label appears with the full-screen PageLoader (not aria-only)
- Each route transition above shows the mapped label while the loader is up
- Outbound navigations and destination mounts use consistent copy for the same hop
- Label tone matches existing lowercase loading copy
- Screen readers still get an equivalent accessible name (`role="status"` / label)
- Errors still cancel the loader immediately (unchanged NIM-54 behavior)
- In-screen loaders unchanged

### Notes

- Builds on NIM-54; no change to `useTimedPageLoader` min duration
- Prefer destination-aware labels on restore; action-aware where the hop is explicit (`creating lobby`, `leaving lobby`)

## Execution step (after plan approval)

Call Linear `save_issue` with `id: "NIM-63"`, the markdown description above, and `relatedTo: ["NIM-54"]`. No code changes in this task.