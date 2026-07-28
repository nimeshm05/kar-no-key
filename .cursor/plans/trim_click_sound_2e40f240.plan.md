---
name: Trim Click Sound
overview: Trim the ~1.8s click MP3 to a short UI tap (strip leading silence, keep ~120ms of attack) so the sound feels instant on click.
todos:
  - id: install-ffmpeg
    content: Install ffmpeg via Homebrew
    status: completed
  - id: trim-mp3
    content: Trim click MP3 to ~120ms from onset; verify duration
    status: completed
isProject: false
---

# Trim Click Sound

## Cause

[`public/click-effects/universfield-interface-click-124476.mp3`](public/click-effects/universfield-interface-click-124476.mp3) is **~1.78s** long. UI clicks should be ~50–150ms; the perceived lag is almost certainly leading silence / a slow swell before the audible hit—not the `playClickSound` pool logic.

## Approach

1. Install `ffmpeg` via Homebrew (not currently on PATH).
2. Detect silence / peak onset, then re-encode a trimmed asset:
   - Strip leading (and trailing) silence
   - Keep roughly **~120ms** of the click body from onset
   - Overwrite or replace with a short file (same path so [`playClickSound.ts`](src/lib/ui/playClickSound.ts) stays unchanged), e.g. keep the filename
3. Smoke-check duration with `afinfo` / `ffprobe` (target well under 200ms).

Optional code tweak only if needed after trim: ensure pool elements `preload = "auto"` (already set). No playback `currentTime` offset hack unless trim alone isn’t enough.

## Out of scope

- Mute UI, volume control, different sounds per control type.