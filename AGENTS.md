# Doke — Project Instructions for Codex

## Project role

You are working on Doke, a multi-page web platform with a custom visual system, internal navigation, reusable UI components, and future backend/data integration.

Act as a senior frontend architect, not as a passive code editor.

## Non-negotiable rules

- Diagnose root cause before editing.
- Preserve the approved visual baseline unless explicitly asked to redesign.
- Do not create files named fix, hotfix, final, stage, rescue, parity, cleanup, polish, adjustment, normalization, or temporary variants.
- Do not use `!important` unless there is an explicitly justified extreme exception.
- Do not use inline styles.
- Do not duplicate CSS/JS for buttons, cards, inputs, modals, dropdowns, filters, search, header, sidebar, avatars, workers, posts, ratings, or announcements.
- Do not change `body`, global shell, sidebar, header, or global wrappers to solve a page-specific issue.
- Do not solve CSS problems in JavaScript.
- Do not replace the entire body in the router if a smaller shell/content swap is enough.
- Preserve real folder structure when delivering changed files.

## CSS architecture

- `core` owns tokens, reset, typography, layout primitives, and utilities.
- `components` owns reusable isolated UI components.
- `patterns` owns recurring compositions.
- `pages` owns page-specific layout only.
- Page CSS must not redefine shared components.

## Before editing

Always report:

1. Root cause.
2. Files involved.
3. Correct responsibility layer.
4. Risk of regression.
5. Validation plan.

## After editing

Always report:

1. Files changed.
2. What changed and why.
3. Viewports/pages tested.
4. Remaining risks.
5. Tests not executed.

## Required visual validation when touching global layout

If changing shell, header, sidebar, width, scroll, router, global CSS, or shared CSS links, validate:

- Desktop: 1366x768
- Tablet: 820x1180
- Mobile: 390x844

Pages:

- index.html
- perfil.html
- pedidos.html
- mensagens.html
- notificacoes.html
- comunidade.html
- resultado/resultados.html
- detalhe-anuncio.html
- ajuda.html

Check:

- No horizontal overflow.
- Header/content alignment.
- Correct spacing between header and content.
- Correct `body[data-page]`.
- Internal navigation matches direct URL/F5.
- Vertical scroll works after internal navigation.
- DokeNavigate does not rely on full reload.
