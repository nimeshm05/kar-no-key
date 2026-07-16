---
name: Navbar 80% Width
overview: Wrap navbar sections in a centered inner container set to 80% of the viewport width, keeping the existing three-column flex layout unchanged inside that container.
todos:
  - id: navbar-tsx-wrapper
    content: Add navbar__content wrapper around the three sections in Navbar.tsx
    status: completed
  - id: navbar-css-80vw
    content: "Update Navbar.css: center outer navbar, set navbar__content to 80vw with flex row layout"
    status: completed
isProject: false
---

# Navbar 80% Viewport Width

## Current state

[`Navbar.tsx`](src/components/Navbar/Navbar.tsx) renders three flex sections directly inside a full-width `<header>`:

```13:31:src/components/Navbar/Navbar.tsx
    <header className="navbar">
      <div className="navbar__section navbar__section--start">...</div>
      <div className="navbar__section navbar__section--center">...</div>
      <div className="navbar__section navbar__section--end">...</div>
    </header>
```

[`Navbar.css`](src/components/Navbar/Navbar.css) applies the flex row layout and `padding: 0 40px` on the outer header. The navbar is reused on Lobby, Search, Countdown, and Game screens — no per-screen overrides exist.

## Approach

Add an inner content wrapper so the **header stays full width** (useful if you ever add a background/border spanning the viewport) while the **interactive content is constrained to 80vw and centered**.

```mermaid
flowchart TB
  navbar["header.navbar full width"]
  content["div.navbar__content 80vw centered"]
  start["section--start"]
  center["section--center"]
  end["section--end"]

  navbar --> content
  content --> start
  content --> center
  content --> end
```

## Changes

### 1. [`src/components/Navbar/Navbar.tsx`](src/components/Navbar/Navbar.tsx)

Wrap the three existing sections in a new container:

```tsx
<header className="navbar">
  <div className="navbar__content">
    {/* existing navbar__section blocks unchanged */}
  </div>
</header>
```

No prop or behavior changes.

### 2. [`src/components/Navbar/Navbar.css`](src/components/Navbar/Navbar.css)

Split responsibilities between outer shell and inner content:

| Selector | Role |
|----------|------|
| `.navbar` | Full-width shell: `display: flex`, `justify-content: center`, `align-items: center`, `height: 92px`, `width: 100%` |
| `.navbar__content` | Constrained row: `width: 80vw`, `display: flex`, `align-items: center` |
| `.navbar__section*` | Unchanged (still `flex: 1` three-column layout) |

Remove `padding: 0 40px` from `.navbar` — horizontal spacing comes from the 10% viewport margin on each side of the 80vw container.

Optional safety (only if needed after visual check): `max-width: 100%` on `.navbar__content` to avoid overflow on very narrow viewports.

## Scope

- **In scope:** Navbar markup + CSS only
- **Out of scope:** Aligning screen body content (580px anchors, roster offsets) to the new navbar width — not requested

## Verification

1. Open Lobby, Search, Game, and Countdown screens at desktop width — exit button, greeting, and feedback should sit within a centered band at 80% viewport width
2. Resize to mobile — content should remain centered with ~10% margin on each side; no horizontal overflow
3. Confirm three-column alignment (start / center / end) is unchanged relative to the inner container
