---
name: Dialog Figma Parity
overview: "Align the Dialog shell and JoinCodeModal content with Figma Modal Container (2116:3002): medium-weight titles and 14px muted body/status text, without changing the Dialog API or global Button styles."
todos: []
isProject: false
---

# Dialog Figma parity (Modal Container 2116:3002)

## Context

Figma node [2116:3002](https://www.figma.com/design/xvOrhZZAqLqapwAtYD5GEq/kara-no-key?node-id=2116-3002) is the **Modal Container** component set (Default / Error / Waiting / network delay). In code that maps to:

- Shell: [`src/components/Dialog/Dialog.tsx`](src/components/Dialog/Dialog.tsx) + [`Dialog.css`](src/components/Dialog/Dialog.css)
- Content/phases: [`src/components/JoinCodeModal/JoinCodeModal.tsx`](src/components/JoinCodeModal/JoinCodeModal.tsx) + [`JoinCodeModal.css`](src/components/JoinCodeModal/JoinCodeModal.css)

Layout already matches Figma (340px panel, 20px gap, header with border-bottom + 20px padding, X close, body/footer slots). The previous [dialog redesign](.cursor/plans/dialog_redesign_e264f6b8.plan.md) used older type specs; current Figma differs on typography.

## Visual diffs to fix

| Area | Current | Figma |
|------|---------|-------|
| Dialog title | `.text-body` — 14px **regular** | Body Medium — 14px **medium**, line-18 |
| Status `wait...` | 20px medium, primary color | 14px regular, `--neutral-400` / `--color-text-muted` |
| Error / waiting / own-code messages | `.text-body-regular` — **18px**, primary | Body Regular — **14px**, muted |

Out of scope (shared primitives, not Dialog-specific): global Button padding 14px vs Figma 16px; InputField placeholder `neutral-300` vs Figma `neutral-200`.

## Changes

### 1. Dialog title weight — [`Dialog.tsx`](src/components/Dialog/Dialog.tsx) / [`Dialog.css`](src/components/Dialog/Dialog.css)

- Keep title class on the `h2`, but style it as Body Medium in CSS:
  - `font-family: var(--family-mono)`
  - `font-size: var(--size-14)`
  - `font-weight: var(--weight-medium)`
  - `line-height: var(--line-18)`
- Remove reliance on `.text-body` for the title (or override weight in `.dialog__title` so gallery/consumers pick up medium automatically).

### 2. Join modal body typography — [`JoinCodeModal.tsx`](src/components/JoinCodeModal/JoinCodeModal.tsx) / [`JoinCodeModal.css`](src/components/JoinCodeModal/JoinCodeModal.css)

Unify status + message styles to Figma Body Regular muted:

```css
.join-code-modal__status,
.join-code-modal__message {
  font-family: var(--family-mono);
  font-size: var(--size-14);
  font-weight: var(--weight-regular);
  line-height: var(--line-18);
  color: var(--color-text-muted);
  text-align: center;
  margin: 0;
  width: 100%;
}
```

- Drop `text-body-regular` from message nodes in JSX (that utility is 18px and wrong here).
- Keep the two-line waiting copy and existing `p + p` spacing.
- Keep phase titles (`Enter Code`, `Error`, `Patience :)`, `Hold on :)`) as-is — they already match Figma.

### 3. Spot-check

- Design system gallery Dialog still looks correct (title medium).
- Join modal phases: enter-code, joining (`wait...`), error, waiting-for-host — muted 14px body; header titles medium.

No Dialog prop API changes. No Tailwind.