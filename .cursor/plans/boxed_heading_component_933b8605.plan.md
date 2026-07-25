---
name: Boxed Heading Component
overview: Add a reusable neo-brutalist Heading component matching the Figma design, then replace product screen titles and design-system gallery headings. Game song titles stay unchanged.
todos:
  - id: tokens
    content: Add emerald + semantic heading color tokens
    status: completed
  - id: heading-component
    content: Create Heading component (TSX + CSS) with size 1/2/3
    status: completed
  - id: product-screens
    content: Replace Landing, Lobby, Songs, Results titles with Heading
    status: completed
  - id: design-system
    content: Update design-system gallery/unlock headings + add Heading demo
    status: completed
  - id: cleanup
    content: Remove obsolete per-screen title color CSS
    status: completed
isProject: false
---

# Boxed Heading Component

## Design (from Figma `2273:5318`)

White label with emerald border, solid bottom-right emerald offset shadow, emerald text, mono semibold, centered, uppercase.

- Border + shadow: `#34d399`
- Text: `#059669`
- Background: white
- Offset: ~8px right / ~9px down (hard shadow, no blur)
- Padding: `12px` vertical; width hugs content
- Sizes: `text-heading-1` (landing, lobby, design-system page title) and `text-heading-2` (songs, results, design-system section titles). Design-system subtitles keep `text-heading-3` inside the same chrome.

## Approach

### 1. Color tokens

Add emerald primitives and semantic heading colors in [`src/styles/tokens/colors.css`](src/styles/tokens/colors.css) and [`src/styles/semantic/colors.css`](src/styles/semantic/colors.css):

- `--emerald-400: #34d399`
- `--emerald-600: #059669`
- `--color-heading-border` / `--color-heading-shadow` → emerald-400
- `--color-heading-text` → emerald-600

### 2. Shared `Heading` component

Create [`src/components/Heading/Heading.tsx`](src/components/Heading/Heading.tsx) + [`Heading.css`](src/components/Heading/Heading.css) following existing component patterns (e.g. `Button`):

```tsx
type HeadingProps = {
  children: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  size?: "1" | "2" | "3"; // maps to text-heading-*
  className?: string;
};
```

CSS structure: outer wrapper for the offset shadow layer + inner white bordered box. Apply `text-transform: uppercase`, heading text color, and the size utility class on the text element. Prefer a pseudo-element or layered sibling for the solid shadow (match Figma’s dual-layer layout).

### 3. Wire into product screens

| Screen | File | Change |
|--------|------|--------|
| Landing | [`LandingFlow.tsx`](src/components/LandingFlow/LandingFlow.tsx) | `<Heading as="h1" size="1">kar-no-key</Heading>`; drop obsolete `.landing-title` color rule |
| Lobby | [`LobbyScreen.tsx`](src/components/LobbyScreen/LobbyScreen.tsx) | `<Heading as="h1" size="1">{lobbyCode}</Heading>`; remove green color from `.lobby-screen__code` |
| Songs | [`SearchScreen.tsx`](src/components/SearchScreen/SearchScreen.tsx) | `<Heading as="h1" size="2">Song?</Heading>` |
| Results | [`AwardsScreen.tsx`](src/components/AwardsScreen/AwardsScreen.tsx) | `<Heading as="h1" size="2">Race Leaderboard</Heading>` (was `text-heading-3`); keep trophy beside the heading |

**Out of scope:** Game song title / marquee ([`GameScreen.tsx`](src/components/GameScreen/GameScreen.tsx)) — leave as-is. Countdown number also unchanged.

### 4. Design system gallery

In [`DesignSystemGallery.tsx`](src/app/design-system/DesignSystemGallery.tsx) and [`DesignSystemUnlock.tsx`](src/app/design-system/DesignSystemUnlock.tsx):

- Page title → `Heading as="h1" size="1"`
- Section titles → `Heading as="h2" size="2"`
- Subtitles → `Heading as="h3" size="3"`
- Add a Heading demo section in the gallery (like other components)

### 5. Cleanup

Remove screen-local title color rules that conflict with the new component (`landing-title`, `lobby-screen__code` accent green, `search-screen__title` / `awards-screen__title` color if only used for the old flat title). Keep layout/spacing wrappers around headings.