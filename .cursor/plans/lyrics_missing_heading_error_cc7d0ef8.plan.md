---
name: Lyrics missing heading error
overview: When select-song fails because lyrics are unavailable, replace the search screen "Song?" Heading with the Figma unsuccessful (rose) boxed heading showing "No synced lyrics found for this song." instead of the generic Edge Function error string.
todos:
  - id: update-linear-nim-57
    content: Update existing Linear NIM-57 with Figma unsuccessful-heading scope and AC (do not create a duplicate)
    status: completed
  - id: rose-heading-tokens
    content: Add rose tokens + Heading tone=error CSS/API + gallery sample
    status: completed
  - id: parse-fn-error-body
    content: Parse FunctionsHttpError context JSON in invokeFunction
    status: completed
  - id: search-lyrics-title
    content: Wire SearchFlow/SearchScreen to swap Song? for unsuccessful lyrics title
    status: completed
isProject: false
---

# No-lyrics unsuccessful heading

## Linear

Existing issue (do **not** create a duplicate): [NIM-57](https://linear.app/nimeshs-company/issue/NIM-57/fe-surface-clear-no-lyrics-error-when-song-selection-fails) — `[FE] Surface clear "no lyrics" error when song selection fails`.

On execute, **update NIM-57** description to match this plan:

- **Summary:** Replace generic Edge Function non-2xx copy with Figma unsuccessful Heading (rose) showing **"No synced lyrics found for this song."** instead of **"Song?"**
- **Figma:** [2273:5324](https://www.figma.com/design/xvOrhZZAqLqapwAtYD5GEq/kara-no-key?node-id=2273-5324)
- **Scope:** Heading `tone="error"`, rose tokens, parse function error body in `invokeFunction`, SearchFlow/SearchScreen title swap; suppress under-list confirmError for lyrics-unavailable
- **Related:** NIM-44 (lyrics fallback catalog) stays separate / backend
- Keep labels: Frontend, Bug, area:search; project kar-no-key

## Problem

`select-song` returns **422** with `{ error: "...", has_lyrics: false }`. Supabase `functions.invoke` treats non-2xx as an error, so the UI usually falls back to **"Edge Function returned a non-2xx status code"** via [`getErrorMessage`](src/lib/lobby/lobbyRoute.ts) and shows that under the song list. The page title stays **"Song?"**.

## Target (Figma [2273:5324](https://www.figma.com/design/xvOrhZZAqLqapwAtYD5GEq/kara-no-key?node-id=2273-5324))

Same boxed Heading chrome as today, but **unsuccessful** colors:

- Border + solid offset shadow: rose-400 (`#fb7185`)
- Text: rose-600 (`#e11d48`)
- Label: **No synced lyrics found for this song.** (existing `text-transform: uppercase` on Heading will render it in caps)

When this happens: swap the title; **do not** show the generic `confirmError` message for the lyrics-unavailable case.

## Implementation

### 1. Tokens

Add rose primitives in [`src/styles/tokens/colors.css`](src/styles/tokens/colors.css):

- `--rose-400: #fb7185`
- `--rose-600: #e11d48`

Add semantic heading error colors in [`src/styles/semantic/colors.css`](src/styles/semantic/colors.css):

- `--color-heading-error-border` / `--color-heading-error-shadow` → rose-400
- `--color-heading-error-text` → rose-600

### 2. Heading `tone="error"`

Extend [`Heading.tsx`](src/components/Heading/Heading.tsx) with `tone?: "default" | "error"` (default unchanged).

In [`Heading.css`](src/components/Heading/Heading.css):

```css
.heading--error {
  border-color: var(--color-heading-error-border);
  box-shadow: 8px 9px 0 0 var(--color-heading-error-shadow);
  color: var(--color-heading-error-text);
}
```

Add a gallery sample for the error tone in [`DesignSystemGallery.tsx`](src/app/design-system/DesignSystemGallery.tsx).

### 3. Parse Edge Function error bodies

In [`invokeFunction`](src/lib/supabase/functions.ts), when `error` is set and `data` is null/empty, try to read JSON from `error.context` (FunctionsHttpError `Response`) and return that as `data`. That surfaces `{ error, has_lyrics: false }` so lyrics failures are detectable and other errors can show server messages instead of the generic non-2xx string.

### 4. Search flow + screen

In [`SearchFlow.tsx`](src/components/SearchFlow/SearchFlow.tsx) confirm handler:

- If response indicates lyrics unavailable (`has_lyrics === false` or server error text about lyrics):
  - Mark song `lyricsStatus` unavailable (existing)
  - Set a dedicated flag/message for the title (e.g. `lyricsTitleError = "No synced lyrics found for this song."`)
  - **Do not** set `confirmError` for this case
- Other failures: clear the lyrics title error; keep `setConfirmError(getErrorMessage(...))` as today
- Clear the lyrics title error when starting a new confirm (`setConfirmError(null)` already runs)

In [`SearchScreen.tsx`](src/components/SearchScreen/SearchScreen.tsx):

```tsx
<Heading as="h1" size="2" tone={lyricsTitleError ? "error" : "default"} ...>
  {lyricsTitleError ?? "Song?"}
</Heading>
```

Suppress the under-list `confirmError` block when the lyrics title error is active (recommended + YouTube tabs). Keep card `"no lyrics"` badge behavior.

## Out of scope

- Changing `select-song` status codes
- Pre-checking lyrics before confirm
- Rewording other Edge Function errors beyond body-parsing improvement

## Acceptance

- Confirm a song with no synced lyrics → title becomes rose boxed **"No synced lyrics found for this song."**; no "Edge Function returned a non-2xx…" under the list
- Other select failures still show a message under the list; title stays "Song?"
- Selecting/confirming again clears the unsuccessful title
- Default emerald Heading unchanged on other screens
