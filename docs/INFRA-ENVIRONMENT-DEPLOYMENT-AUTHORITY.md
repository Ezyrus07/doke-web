# INFRA Environment & Deployment Authority

## Status

This document is the repository-side authority introduced by **INFRA-GUARD-001**.

It does not deploy, migrate, promote, rollback, rotate secrets, modify DNS, or mutate Vercel/Supabase configuration.

The machine-readable authority is:

`config/release-environment-authority.json`

The executable audit is:

`scripts/audit-release-environment-authority.js`

## Canonical topology

```text
GitHub branch/PR
  -> GitHub CI
  -> Vercel doke-web Preview
  -> Supabase staging validation (zwkczgewzbsorbrjuzpb)
  -> exact release SHA freeze
  -> explicit release authorization
  -> MAIN
  -> Vercel doke-web Production
  -> future distinct Supabase Production
  -> post-deploy health
  -> Control Center provenance
```

## Authorities

- Repository: `Ezyrus07/doke-web`
- Release branch: `MAIN`
- Canonical Vercel product project: `doke-web` / `prj_UDT0gjRcQ9J4LwRpQPHDEw1nYCqi`
- Product staging Supabase: `doke-web-staging` / `zwkczgewzbsorbrjuzpb`
- Product production Supabase: **UNASSIGNED**
- `doke-web-jkpw`: shadow duplicate; no production or rollback authority.

A Vercel deployment whose target is named `production` is not sufficient evidence of a product production release.

## Production provenance

Production release provenance must bind an exact source SHA to:

- source tree SHA;
- source branch and release branch;
- canonical Vercel project;
- preview deployment ID and commit SHA;
- staging Supabase ref;
- staging migration head;
- Edge Function versions/hashes;
- CI run IDs;
- rollback deployment ID;
- production Supabase ref;
- explicit authorization ID.

The audit intentionally fails production authorization while the production Supabase project remains unassigned.

## Branch rule

Only `MAIN` is eligible as the source branch for product production.

ANA, UX, Security/Backend, validation and other feature/workstream branches may generate previews, but they have no direct production authority.

This repository rule is independent from Vercel's technical ability to manually promote a Preview deployment. External promotion remains separately governed and requires explicit authorization.

## Existing release gate integration

`scripts/validate-release-go-no-go-gate.js` now always validates the repository authority contract.

For the current private-beta/staging flow it runs contract-only validation.

When `DOKE_RELEASE_TARGET=production`, the gate requires a production release manifest through:

`DOKE_RELEASE_ENVIRONMENT_MANIFEST_PATH`

If the manifest is missing, points to a feature branch, uses the shadow Vercel project, reuses staging as production, lacks rollback/CI/authorization provenance, or production Supabase is unassigned, the production decision is blocked.

## Commands

Repository authority only:

```bash
npm run audit:release-environment-authority
```

Production provenance validation:

```bash
DOKE_RELEASE_TARGET=production \
DOKE_RELEASE_ENVIRONMENT_MANIFEST_PATH=reports/generated/release-environment-manifest.json \
npm run validate:release-environment-authority:production
```

The second command is expected to remain blocked until a distinct production Supabase authority is created and the complete release manifest exists.

## Non-authority

This contract does **not** authorize:

- Vercel project setting changes;
- Vercel promote/redeploy/rollback;
- branch protection changes;
- GitHub Pages changes;
- disconnecting `doke-web-jkpw`;
- Supabase staging writes;
- Supabase production creation;
- migrations;
- Edge Function deploys;
- secrets/env-var changes;
- OAuth or SMTP changes;
- DNS/custom domain changes;
- production deployment.

Each remains a separate governed write.
