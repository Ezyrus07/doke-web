# Doke — Mensagens Authority Cleanup Phase 6

## Scope

This phase only removes the last active CSS file whose production name still described a temporary redesign phase.
It does not redesign `mensagens.html`, does not change selectors, and does not alter the chat layout contract.

## Root cause

`assets/css/pages/mensagens/desktop-redesign.css` was still loaded by `mensagens.html` and registered in the route asset map.
The file is no longer a temporary redesign layer: it is the page-level visual contract for the messages workspace.
Keeping `redesign` in an active production filename made the active authority map misleading and kept one remediation-style CSS file in the build.

## Change

| Previous active file | New active file |
| --- | --- |
| `assets/css/pages/mensagens/desktop-redesign.css` | `assets/css/pages/mensagens/page-visual-contract.css` |

The CSS content was preserved. Only the production authority name and references changed.

## Authority decision

- `assets/css/pages/mensagens/page-visual-contract.css`: page-level visual contract for the current messages workspace.
- `assets/css/pages/mensagens/desktop-layout-contract.css`: desktop full-bleed/page layout boundary already present in the project.
- `assets/css/components/internal/chat-workspace-contract.css`: shared chat workspace component contract.

This phase does not merge those contracts yet. That must be a separate visual-baseline phase because `mensagens.html` is high-risk.

## Validation

Required after applying:

```bash
npm run audit:agent-governance
```

Manual validation recommended:

- Open `mensagens.html` directly on desktop, tablet, and mobile.
- Navigate to `mensagens.html` through `DokeNavigate` from `index.html` and another internal page.
- Confirm the chat list/thread behavior is unchanged.

## Next step

The active remediation CSS count should now be zero. The remaining active remediation item is JS-related: `assets/js/core/ipad-safari-scroll-rescue.js`.
That file is loaded across many pages and should not be renamed or removed without a dedicated shell/scroll validation phase.
