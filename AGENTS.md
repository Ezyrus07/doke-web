# Doke Agent Entry Point

This file is the required entry point for automated agents working on Doke.

Before making changes, read and follow these authority documents:

1. `docs/DOKE_AGENT_CONSTITUTION.md`
2. `PROJECT-RULES.md`
3. `ARCHITECTURE.md`
4. `docs/CSS_AUTHORITY_MAP.md`
5. `docs/GLOBAL-LAYOUT-CONTRACT.md`
6. `docs/DESIGN-SYSTEM-GUIDE.md`
7. `docs/PAGE-ASSET-AUTHORITY-MATRIX.md`
8. `docs/BASELINE-VISUAL-APPROVED.md`
9. Relevant validation docs under `docs/validation/`

Core rules:

- Diagnose root cause before editing.
- Preserve the approved visual baseline unless the user explicitly asks for a visual redesign.
- Use existing component, pattern, layout, and core authorities before creating new contracts.
- Do not use `!important` as a first solution.
- Do not create active production files with remediation names such as `fix`, `hotfix`, `match`, `parity`, `final`, `rescue`, `adjustment`, `cleanup`, `polish`, `normalization`, `legacy`, `redesign`, `standardization`, or `repair`.
- Do not change shell, sidebar, header, rail, router, or global CSS to solve a local component issue without a validation plan.
- Direct URL load and internal `DokeNavigate(...)` navigation must converge to the same final state.

Minimum validation for patches:

```bash
npm run audit:agent-governance
node --check <changed-js-files>
git diff --check
```

When touching shell, header, rail, global layout, router, responsive contracts, or multiple HTML pages, also validate desktop, tablet, and mobile viewports according to `docs/DOKE_AGENT_CONSTITUTION.md`.
