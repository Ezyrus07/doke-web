# Notifications border and remnant cleanup — Phase 27

## Scope

Phase 27 uses `dokee-web(180).zip` as the baseline and stays inside the notifications page scope.

## Root cause

After the local `!important` reduction, notification cards fell back to the generic `--border-soft` token. On desktop this rendered as a dark outline around each notification card, which was visually heavier than the approved card surface.

## Change

- Added a notifications-scoped card border token in `assets/css/pages/notificacoes/base-layout.css`.
- Changed `.notification-card` to consume `--notifications-card-border` instead of the generic `--border-soft`.
- Removed inactive notification remnants from the complete project ZIP:
  - `assets/css/pages/notificacoes/selection-cleanup.css`
  - `assets/css/pages/notificacoes/pedidos-parity.css`
  - `assets/css/pages/notificacoes/selection-parity.css`

## Patch ZIP note

ZIP patches cannot delete existing files by themselves. If applying the small patch ZIP over an existing project copy, run:

```bash
npm run maintenance:phase27-cleanup
```

The complete project ZIP already has these files removed.

## Non-goals

- No home changes.
- No shell/router/header/sidebar changes.
- No card component contract changes.
- No resultados/pedidos/perfil/mensagens changes.
