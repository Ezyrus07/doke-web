# Agent reform protocol for ChatGPT and Codex

Use this protocol before asking ChatGPT, Codex, or any coding agent to modify Doke. The purpose is to prevent repeated CSS/router regressions caused by symptom patches.

## Required pre-flight

Before changing HTML, CSS, JS, shell, router, header, rail, scroll, or mobile layout, the agent must read:

0. `docs/DOKE_AGENT_CONSTITUTION.md`
1. `AGENTS.md`
2. `docs/ACTIVE-LEGACY-STRUCTURES-AUDIT.md`
3. `docs/validation/active-legacy-structures-report.json`
4. `docs/PAGE-ASSET-AUTHORITY-MATRIX.md`
5. `docs/validation/page-asset-authority-matrix.json`

The agent must state the authority layer it is changing:

- core
- shell
- header
- rail/content
- component
- pattern
- page
- router/controller

## Forbidden behavior

The agent must not:

- create files with remediation names such as `fix`, `hotfix`, `match`, `parity`, `final`, `rescue`, `adjustment`, `cleanup`, `polish`, `normalization`, or `redesign`;
- use `!important` as the first solution;
- increase selector specificity to hide an unresolved conflict;
- duplicate width/header/sidebar/card contracts;
- solve CSS authority conflicts with JS;
- replace the entire `body` in the router;
- remove old files without proving that they are inactive or safely replaced;
- alter multiple HTML files without a validation plan.

## Required response format for agents

Every implementation response must include:

1. Business/UX objective.
2. Cause root, not just symptom.
3. Authority layer changed.
4. Files changed.
5. Why no new CSS file was needed, or why a new file is architecturally justified.
6. Validation run.
7. Pages/viewports tested.
8. Risks remaining.
9. Tests not executed.

## Required command before structural work

```bash
npm run audit:agent-governance
```

For shell/header/rail/scroll/router/global CSS work, also run the existing project audits that match the touched layer.

## Safe first tasks

1. Inventory first; do not delete.
2. Consolidate one page or one authority at a time.
3. Prefer reducing active links/imports over adding later override layers.
4. Preserve the approved visual baseline.
5. Only after proof, remove or stop loading replaced legacy contracts.
