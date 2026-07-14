---
name: Implement Figma home page
overview: "Replace the Next.js boilerplate home page with the kar-no-key landing page from Figma: centered typewriter illustration, title, tagline, and a static \"get started\" button, styled with plain CSS."
todos:
  - id: page
    content: Rewrite src/app/page.tsx with landing page structure and page.css
    status: completed
  - id: styles
    content: Simplify globals.css and add design token variables
    status: completed
  - id: metadata
    content: Update layout.tsx metadata and clean up unused public assets
    status: completed
  - id: verify
    content: Run dev server and visually verify against Figma screenshot
    status: completed
isProject: false
---

# Implement kar-no-key Home Page from Figma

## Design summary (read from Figma node 1:8)
- Full-viewport white page, content centered vertically and horizontally in a 580px column
- Typewriter illustration (`public/typewriter.svg`, ~552x414) above a 292px text block: title "kar-no-key" (Geist Mono SemiBold 32px, black) and tagline "race your frens, one lyric at a time :)" (18px, #bababa), 20px apart
- 40px gap between illustration and text; 60px gap down to the button
- Button: black, 16px padding, square corners, "get started" in white Geist Mono SemiBold 18px; static placeholder with a subtle hover effect

## Changes

### [src/app/page.tsx](src/app/page.tsx) — rewrite
- Remove all boilerplate; render the landing page structure: main container > typewriter image (`next/image` with `/typewriter.svg`), text block (h1 + tagline), and a `<button className="get-started-button">get started</button>`
- Delete [src/app/page.module.css](src/app/page.module.css) and create `src/app/page.css` imported directly, per the styling rules (plain CSS, semantic class names like `landing-page`, `typewriter-image`, `landing-title`, `landing-tagline`, `get-started-button`)

### [src/app/globals.css](src/app/globals.css) — simplify
- Strip boilerplate dark-mode/theme styles; keep a minimal reset with white background and CSS variables for the design values (colors `#000`, `#bababa`, gaps 20/40/60px, font sizes 18/32px)
- Typography uses the existing `--font-geist-mono` variable already wired up in [src/app/layout.tsx](src/app/layout.tsx)

### [src/app/layout.tsx](src/app/layout.tsx) — metadata
- Update title to "kar-no-key" and description to the tagline

### Cleanup
- Remove unused boilerplate SVGs from `public/` (`next.svg`, `vercel.svg`, `file.svg`, `globe.svg`, `window.svg`)

## Behavior
- Button is a placeholder (no navigation) with a subtle hover effect (slight opacity/lift)
- Layout centers within the viewport (min-height 100svh flex column), responsive: illustration scales down on narrow screens via max-width 100%
