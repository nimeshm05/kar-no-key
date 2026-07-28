---
name: UI Click Sound
overview: Play the shared interface click MP3 from Button, IconButton, and Tabs (not text fields), via a small reusable audio helper that supports rapid overlapping clicks.
todos:
  - id: click-helper
    content: Add playClickSound helper with audio pool
    status: completed
  - id: wire-primitives
    content: Play click sound from Button, IconButton, and Tabs
    status: completed
isProject: false
---

# UI Click Sound

## Recommendation (text fields)

**Do not add a text-field sound.** Norm for web: clickables get feedback; typing relies on the OS keyboard. Focus/key sounds fatigue quickly. Optional later: a quiet typewriter tick for brand flavor — out of scope now.

## Approach

Central helper + wire into the three interactive primitives so every usage site gets the sound automatically.

### 1. Audio helper

Add [`src/lib/ui/playClickSound.ts`](src/lib/ui/playClickSound.ts):

- Path: `/click-effects/universfield-interface-click-124476.mp3`
- Use a small **Audio pool** (clone/`new Audio` per play, or 3–4 reused elements) so rapid clicks don’t cut each other off
- No-op on failure (missing file, autoplay edge cases)
- Export `playClickSound()`

### 2. Wire into components

Call `playClickSound()` on successful activate (not when disabled):

| Component | File | When |
|-----------|------|------|
| `Button` | [`Button.tsx`](src/components/Button/Button.tsx) | `onClick` for `<button>`; `onClick` on `<Link>` for `href` |
| `IconButton` | [`IconButton.tsx`](src/components/IconButton/IconButton.tsx) | `onClick` |
| `Tabs` | [`Tabs.tsx`](src/components/Tabs/Tabs.tsx) | tab `onClick` before `onChange` |

Mark `Button` / `IconButton` as `"use client"` if needed once they call browser `Audio` (Tabs already is).

Wrap existing handlers so sound plays then the consumer `onClick` runs:

```ts
function handleClick() {
  if (disabled) return;
  playClickSound();
  onClick?.();
}
```

### 3. Out of scope

- `InputField` / text inputs
- Song cards, dropdown rows, dialog overlay (unless they use Button/IconButton/Tabs already)
- Mute preference UI (can add later if needed)