---
name: Player Waiting Heading
overview: "Update the non-host SearchScreen waiting state to match Figma: a boxed PLEASE WAIT heading above the bordered panel, with updated wait copy."
todos:
  - id: waiting-markup
    content: Add PLEASE WAIT Heading + update waiting copy in SearchScreen.tsx
    status: completed
  - id: waiting-css
    content: Tighten waiting message max-width/centering in SearchScreen.css
    status: completed
isProject: false
---

# Player Waiting Screen Update

## Design delta (Figma `2261:580`)

Current: panel only, message `WAITING FOR THE HOST TO SELECT A SONG...`

Figma:
- Centered `Heading` size `2`: **PLEASE WAIT** (above panel, same pattern as Songs / Game / Leaderboard)
- Bordered panel below with centered body copy: **WE'RE WAITING FOR THE HOST TO SELECT A SONG...**
- Layout: column, `gap: 20px`, heading + full-height panel

## Changes

### [`SearchScreen.tsx`](src/components/SearchScreen/SearchScreen.tsx)

In the non-host branch (`search-screen__main--player-waiting`):

```tsx
<section className="search-screen__main search-screen__main--player-waiting">
  <Heading as="h1" size="2" className="search-screen__title">
    Please Wait
  </Heading>
  <div className="search-screen__waiting-panel">
    <p className="search-screen__waiting-message text-body">
      WE'RE WAITING FOR THE HOST TO SELECT A SONG...
    </p>
  </div>
</section>
```

`Heading` is already imported. Uppercase comes from the component.

### [`SearchScreen.css`](src/components/SearchScreen/SearchScreen.css)

- Waiting main already inherits `gap: 20px` from `.search-screen__main` — keep that.
- Constrain waiting message width for wrap like Figma (`max-width: 336px; text-align: center`).
- No other structural CSS changes needed; `.search-screen__title` already centers the heading.