---
name: Song Card Hover State
overview: "Add Figma 2083:1714 hover treatment to SongCard: neutral-100 background, swap duration/badge row for \"select song\" + arrow icon, and 12px info gap — CSS-driven on hover and keyboard focus."
todos:
  - id: song-card-hover-tsx
    content: Add hover action row and ArrowRightIcon to SongCard.tsx
    status: completed
  - id: song-card-hover-css
    content: "Update SongCard.css: neutral-100 hover bg, swap meta/hover-action, 12px gap, focus-visible parity"
    status: completed
  - id: arrow-right-icon
    content: Add ArrowRightIcon component (20px SVG from Figma)
    status: completed
isProject: false
---

# Song Card Hover State (Figma 2083:1714)

## Design diff: Default vs Hover

| Property | Default ([2083:1712](https://www.figma.com/design/xvOrhZZAqLqapwAtYD5GEq/kara-no-key?node-id=2083-1712)) | Hover ([2083:1714](https://www.figma.com/design/xvOrhZZAqLqapwAtYD5GEq/kara-no-key?node-id=2083-1714)) |
|---|---|---|
| Background | white (`--color-background`) | `--neutral-100` (#f5f5f5) |
| Border | 1px `--neutral-200` | same (unchanged) |
| Info column gap | 8px (details → bottom row) | **12px** |
| Bottom row | duration (+ lyrics badge in app) | **select song** + 20px arrow-right, 8px gap |
| Title / artist | unchanged | unchanged |

```mermaid
stateDiagram-v2
  default: Default
  hover: Hover

  default --> hover: mouseenter_or_focus
  hover --> default: mouseleave_or_blur

  note right of default
    meta row visible
    duration plus badge
  end note

  note right of hover
    meta row hidden
    select song plus arrow
    neutral-100 background
  end note
```

## Gaps vs current code

[`SongCard.css`](src/components/SongCard/SongCard.css) today:

```14:16:src/components/SongCard/SongCard.css
.song-card--interactive:hover {
  border-color: var(--neutral-300);
}
```

Figma hover does **not** darken the border — only the fill changes. Replace with `background: var(--neutral-100)` and keep border `--neutral-200`.

No hover action row exists in [`SongCard.tsx`](src/components/SongCard/SongCard.tsx); duration/badge always show.

## Implementation

### 1. JSX — [`SongCard.tsx`](src/components/SongCard/SongCard.tsx)

Add a hover action row inside `.song-card__info`, after `.song-card__meta`:

```tsx
<div className="song-card__hover-action" aria-hidden="true">
  <span className="song-card__hover-label text-button-label">select song</span>
  <ArrowRightIcon className="song-card__hover-icon" />
</div>
```

- Only render when `onSelect` is set (interactive cards only)
- `aria-hidden` on the decorative CTA; the card already has `role="button"` and `aria-pressed`

### 2. Arrow icon — new [`ArrowRightIcon.tsx`](src/components/SongCard/ArrowRightIcon.tsx) + CSS

- 20×20px SVG matching Figma `lucide/arrow-right` (stroke, black)
- Follow project pattern: small dedicated icon component with CSS class (no Tailwind, no icon library install)
- On implement: export asset from Figma MCP or use equivalent lucide arrow-right path committed to repo

### 3. CSS — [`SongCard.css`](src/components/SongCard/SongCard.css)

**Replace** current hover border rule:

```css
.song-card--interactive:hover,
.song-card--interactive:focus-visible {
  background: var(--neutral-100);
  border-color: var(--neutral-200);
}

.song-card--interactive:hover .song-card__info,
.song-card--interactive:focus-visible .song-card__info {
  gap: 12px;
}

.song-card__hover-action {
  display: none;
  align-items: center;
  gap: 8px;
}

.song-card--interactive:hover .song-card__meta,
.song-card--interactive:focus-visible .song-card__meta {
  display: none;
}

.song-card--interactive:hover .song-card__hover-action,
.song-card--interactive:focus-visible .song-card__hover-action {
  display: flex;
}
```

**Selected state:** keep `.song-card--selected { border-color: var(--solid-black); }` — black border + gray hover background can coexist.

**Non-interactive cards:** no hover styles (no `song-card--interactive` class).

### 4. No SearchScreen changes

Hover is purely presentational inside `SongCard`; selection logic unchanged.

## Test plan

1. Host `/search` → hover a card: gray background, border stays light gray, bottom shows **select song →**
2. Default (no hover): white background, duration + lyrics badge visible
3. Keyboard Tab + focus on card: same visual as hover (`:focus-visible`)
4. Selected card + hover: black border + gray background
5. Click still selects song; hover CTA is visual only (no extra click target)
