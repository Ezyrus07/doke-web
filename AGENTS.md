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
9. `docs/DOKE-PLANO-MESTRE-CONCLUSAO-PLATAFORMA.md`
10. `config/domain-completion-matrix.json`
11. `docs/DOMAIN-COMPLETION-MATRIX.md`
12. `docs/ACTIVE-CONTRACTS-INDEX.md`
13. Relevant validation docs under `docs/validation/`

## Mandatory master-plan alignment

Every agent working on Doke must treat `docs/DOKE-PLANO-MESTRE-CONCLUSAO-PLATAFORMA.md` as the strategic source of truth and `config/domain-completion-matrix.json` as its operational, machine-readable projection.

Before starting or concluding any sublot, the agent must:

- verify that the proposed work follows the mandatory sequence, scope, gates, and exclusions of the Master Plan;
- read the current domain entry, dependencies, blockers, authority classification, evidence, and next actions in the completion matrix;
- inspect the active Pull Request, branch head, latest checkpoint, relevant contracts, and consumed or pending authorizations;
- preserve one canonical authority per domain and avoid creating parallel contracts, repositories, services, renderers, or state owners;
- update the canonical governance artifacts when the verified state changes;
- explicitly report any conflict between the Master Plan, matrix, implementation, PR description, or observed runtime instead of silently choosing one.

Maturity claims must remain precise and must not be collapsed into a generic “complete” status:

```text
repository contract complete
!= runtime integrated
!= migration applied
!= staging structurally verified
!= authenticated staging operational
!= frontend connected
!= end-to-end flow complete
!= private beta ready
!= production ready
```

A repository-only audit, contract, conformance suite, prepared migration, local E2E, or green CI run does not by itself prove that the domain is operational. A domain may only be promoted when the exact evidence required by the Master Plan and completion matrix exists for that maturity level.

When reporting progress, agents must distinguish at minimum:

- contract and business-rule readiness;
- server runtime integration;
- migration and remote infrastructure state;
- staging evidence level;
- frontend connection and real data authority;
- authenticated multi-account or multi-device E2E evidence;
- unresolved external, legal, commercial, provider, operational, security, and production blockers.

The target is not to maximize documentation or audit volume. The target is to convert approved contracts into safe, integrated, observable, rollback-capable, end-to-end operation without skipping gates.

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
npm run audit:domain-completion-matrix
npm run audit:agent-governance
node --check <changed-js-files>
git diff --check
```

When touching shell, header, rail, global layout, router, responsive contracts, or multiple HTML pages, also validate desktop, tablet, and mobile viewports according to `docs/DOKE_AGENT_CONSTITUTION.md`.
