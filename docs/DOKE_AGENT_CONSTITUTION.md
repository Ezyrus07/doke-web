# Doke Agent Constitution

This document is the highest-level operating contract for ChatGPT, Codex, and any automated coding agent working on Doke. If this document conflicts with a quick visual request, this document wins.

## Mission

Protect the Doke frontend from new structural debt while preserving the approved visual baseline. Agents must act as responsible maintainers, not as screenshot patchers.

## Non-negotiable principles

1. Fix root causes, not isolated symptoms.
2. Preserve the approved visual baseline unless the user explicitly approves a visual change.
3. Do not create new override layers when an existing authority should be consolidated.
4. Do not use JavaScript to solve CSS ownership problems.
5. Do not change shell, header, rail, scroll, router, or global CSS without a validation plan.
6. Direct URL load and internal `DokeNavigate(...)` navigation must converge to the same final state.
7. Every production file name must describe responsibility, not a failed attempt or temporary phase.

## Authority model

Before editing, classify the issue into exactly one primary authority and any secondary authorities:

- `core`: tokens, reset, typography, base layout, utilities.
- `shell`: `.app-shell`, `.sidebar`, `.page`, `.page__content`, global page frame.
- `rail/content`: shared page width, desktop rail, tablet rail, internal page alignment.
- `header`: app header, internal topbar, mobile topbar, search/header actions.
- `component`: buttons, cards, inputs, modals, dropdowns, tabs, avatars.
- `pattern`: rails, feeds, lists, reusable compositions.
- `page`: page-specific section layout and spacing only.
- `router/controller`: internal navigation, route state, page controller initialization.

If the authority is unclear, stop and run the audits before changing files.

## Forbidden production file naming

Do not create or keep active production CSS/JS files with these remediation names:

- `fix`
- `hotfix`
- `match`
- `parity`
- `final`
- `rescue`
- `adjustment`
- `cleanup`
- `polish`
- `normalization`
- `legacy`
- `redesign`
- `standardization`
- `repair`

Exception: audit/documentation files may use words such as `legacy` when they are not loaded by the product runtime.

## Forbidden implementation behavior

Agents must not:

- add `!important` as the first solution;
- increase selector specificity to hide unresolved conflicts;
- create `html body ...` selector chains to overpower existing CSS;
- duplicate header, sidebar, shell, rail, or card contracts across unrelated files;
- alter `body`, shell, sidebar, header, or wrappers globally to solve a single page issue;
- replace the entire `body` in `stable-shell-router.js` when a narrower swap is possible;
- remove old CSS/JS only because the filename looks bad;
- change many HTML files without viewport validation;
- create new CSS files without explaining why no existing authority file is correct.

## Required pre-flight for structural changes

Before touching CSS, shell, header, rail, scroll, router, global links, or multiple HTML files, run:

```bash
npm run audit:agent-governance
```

Then inspect:

- `docs/validation/active-legacy-structures-report.json`
- `docs/validation/page-asset-authority-matrix.json`
- `docs/PAGE-ASSET-AUTHORITY-MATRIX.md`
- `docs/HOME-AUTHORITY-CLASSIFICATION.md` when touching `index.html` or home CSS

## Required planning statement

Before implementation, the agent must state:

1. Business/UX objective.
2. Root cause hypothesis.
3. Primary authority layer.
4. Files allowed to change.
5. Files explicitly forbidden for this patch.
6. Validation command plan.
7. Rollback/containment plan.

## Required validation

Minimum static validation for any patch:

```bash
node --check <changed-js-files>
git diff --check
npm run audit:agent-governance
```

When shell, header, rail, scroll, router, CSS global, or multi-HTML CSS links are changed, also validate at least:

- desktop `1366x768`
- tablet `820x1180`
- mobile `390x844`

Minimum pages:

- `index.html`
- `perfil.html`
- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `comunidade.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `ajuda.html`

Required runtime checks when router/shell/mobile first paint is involved:

```js
window.__reloadProbe = Math.random();
window.__loadCount = 1;
addEventListener('load', () => window.__loadCount++);

DokeNavigate('/perfil.html');
DokeNavigate('/pedidos.html');
DokeNavigate('/mensagens.html');
DokeNavigate('/resultados.html');
DokeNavigate('/index.html');

window.__loadCount === 1;
document.body.dataset.page;
document.documentElement.scrollWidth <= document.documentElement.clientWidth;
window.scrollTo(0, 500);
window.scrollY > 0;
```

## Cleanup rules

A legacy/remediation file may stop being loaded only after the patch proves:

1. where it was loaded from;
2. what responsibility it had;
3. where that responsibility now lives;
4. which pages/viewports were checked;
5. that removing it does not change approved visual behavior unless the change is intentional.

## Delivery format

Every implementation handoff must include:

- root cause found;
- authority changed;
- files altered;
- conflicts removed;
- pages/viewports tested;
- commands run;
- risks remaining;
- tests not executed and why.

If any required validation cannot run, the agent must say so explicitly and treat the patch as requiring local verification.
