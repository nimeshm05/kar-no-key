---
name: Awards Figma Parity
overview: Bring the End of Race Awards main column in line with Figma node 2223:441 — 600px max-width, one shared left text edge for all copy, stars in a left gutter, plus typography parity.
todos:
  - id: awards-max-width
    content: Set awards main container max-width 600px in AwardsScreen.css
    status: completed
  - id: awards-gutter-type
    content: One shared text left-edge + typography fixes in AwardSection/AwardsScreen
    status: completed
  - id: awards-star-assets
    content: Replace star SVGs with Figma-exported assets
    status: completed
isProject: false
---

# Awards screen Figma parity (600px + layout)

## Design source

[Figma Main Container `2223:441`](https://www.figma.com/design/xvOrhZZAqLqapwAtYD5GEq/kara-no-key?node-id=2223-441) — fixed **600px** column, `py: 60`, section stack `gap: 60`, each award block `gap: 20`.

## Critical: one shared text alignment line

All **text** shares a single vertical left edge (Figma `x ≈ 36` = 24px rank slot + 12px gap):

- “End of Race Awards”
- Section titles (“Champions”, “Sharpshooters”, “Speed Demons”)
- Descriptions (“Overall points…”)
- Column header “Players”
- Every player name (top-3 and muted ranks)

Stars sit in a **24px gutter to the left of that line** — they must not shift names. Ranks 4+ keep an empty 24px slot so names stay on the same edge as “john” / “alice”.

Scores stay right-aligned on the opposite edge.

```text
|★| john     10     ← star in gutter, name on text line
| | sara     30     ← empty gutter, name on SAME text line
 ^text edge
```

Do **not** left-align titles flush with the stars; titles must align with **names**, not with the star icons.

## Gaps vs current UI

| Spec (Figma) | Current |
|--------------|---------|
| Main column **600px** | [`70vw`](src/styles/tokens/spacing.css) on [`.awards-screen__container`](src/components/AwardsScreen/AwardsScreen.css) |
| One text left-edge for title / section / description / Players / names | Title flush left; section headers not on the same grid as rows |
| Section title **20px semibold** | `text-heading-2` (24px) |
| “Players” / “Score” **20px semibold** accent green | `text-body` (14px) |
| Row text **14px medium** | `text-body-regular` (18px); top-3 semibold |
| Star assets from design | Hand-authored `/public/icons/star-*.svg` |

Navbar keeps existing layout width; only the awards content column is 600px.

## Changes

### 1. Container width — [AwardsScreen.css](src/components/AwardsScreen/AwardsScreen.css)

```css
.awards-screen__container {
  width: 100%;
  max-width: 600px;
}
```

Center with existing `__body` flex. Mobile: side padding + `max-width: 600px`.

### 2. Shared text grid — AwardSection + page title

Use one row pattern everywhere: `[24px slot][12px gap][text grows][score]`.

- Page title: empty 24px slot + “End of Race Awards”
- Section title + description: empty 24px slot + copy (same left edge as names)
- Table header: empty 24px slot + “Players” + “Score” (drop `padding-left: 36px` hack)
- Rows: star or empty 24px slot + name + metric (unchanged structure; verify muted ranks keep the empty slot)

### 3. Typography — [AwardSection.tsx](src/components/AwardSection/AwardSection.tsx) + CSS

- Section title: 20px semibold (heading-3 size + semibold weight)
- Table headers: 20px semibold, `var(--color-accent-green)`
- Rows: `text-button-label` (14px medium); top-3 black medium; others muted

### 4. Star icons

Replace hand-drawn SVGs with Figma-exported gold/silver/bronze into `public/icons/`.

### 5. Out of scope

- Navbar / restart chrome
- Global `--layout-content-width` for search/game
- Backend / ranking

## Verify

- Red-line check: page title, section titles, descriptions, “Players”, and all names sit on one vertical line.
- Stars sit left of that line; muted rows don’t indent names differently.
- Column max-width 600px centered; mobile padded, no overflow.
