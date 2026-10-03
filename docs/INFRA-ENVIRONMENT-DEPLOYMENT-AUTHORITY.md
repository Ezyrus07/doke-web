# INFRA Environment & Deployment Authority

## Status

This document is the repository-side authority introduced by **INFRA-GUARD-001** and hardened through **INFRA-CI-001**, **INFRA-CI-002**, and **INFRA-CI-003**.

It does not deploy, migrate, promote, rollback, rotate secrets, modify DNS, or mutate Vercel/Supabase configuration.

The machine-readable authority is:

`config/release-environment-authority.json`

The executable audit is:

`scripts/audit-release-environment-authority.js`

## Canonical topology

```text
GitHub branch/PR
  -> exact PR candidate provenance
  -> GitHub CI
  -> Vercel doke-web Preview
  -> Supabase staging validation (zwkczgewzbsorbrjuzpb)
  -> exact integrated release SHA freeze
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

## Provenance model

PR candidate provenance and production release provenance are separate authorities.

### PR candidate provenance

A pull request candidate is proven at workflow runtime from:

- `github.event.pull_request.head.sha`;
- the Git tree resolved locally from that exact SHA;
- the PR head branch;
- the PR base/release branch.

The workflow checks out the exact PR head SHA rather than GitHub's synthetic merge commit.

The audit requires:

```text
event candidate SHA == checked-out HEAD
event candidate SHA^{tree} == candidate tree
PR base branch == intended release branch
```

A committed manifest must not self-certify the SHA of the commit that contains that manifest. Such a design is self-referential because editing the manifest changes the commit SHA.

### Production release provenance

Production release provenance applies only to an integrated release commit.

The production manifest uses:

- `release_sha`;
- `release_tree_sha`;
- `release_branch`;
- canonical Vercel project;
- preview deployment ID and commit SHA;
- staging Supabase ref;
- staging migration head;
- Edge Function versions/hashes;
- CI run IDs;
- rollback deployment ID;
- production Supabase ref;
- explicit authorization ID.

The production audit also requires runtime authority:

- `DOKE_RELEASE_SHA`;
- `DOKE_RELEASE_TREE_SHA`;
- `DOKE_RELEASE_BRANCH`.

The manifest must match those runtime values and the local Git object database.

An internally consistent but stale manifest therefore cannot authorize another commit.

## Branch rule

Only `MAIN` is eligible as the product production release branch.

ANA, UX, Security/Backend, validation and other workstream branches may generate previews, but they have no direct production authority.

This repository rule is independent from Vercel's technical ability to manually promote a Preview deployment. External promotion remains separately governed and requires explicit authorization.

## Existing release gate integration

`scripts/validate-release-go-no-go-gate.js` always validates the repository authority contract.

For current private-beta/staging flows it runs contract-only validation.

Production validation remains fail-closed unless a distinct production Supabase authority exists and a complete production release manifest matches the exact runtime release SHA/tree/branch.

## Commands

Repository authority only:

```bash
npm run audit:release-environment-authority
```

Exact PR candidate provenance:

```bash
DOKE_CANDIDATE_SHA=<exact-pr-head-sha> \
DOKE_CANDIDATE_TREE_SHA=<exact-pr-head-tree> \
DOKE_CANDIDATE_BRANCH=<pr-head-branch> \
DOKE_RELEASE_BRANCH=MAIN \
node scripts/audit-release-environment-authority.js --require-pr-candidate
```

Production release provenance:

```bash
DOKE_RELEASE_SHA=<exact-integrated-main-sha> \
DOKE_RELEASE_TREE_SHA=<exact-integrated-main-tree> \
DOKE_RELEASE_BRANCH=MAIN \
DOKE_RELEASE_ENVIRONMENT_MANIFEST_PATH=reports/generated/release-environment-manifest.json \
npm run validate:release-environment-authority:production
```

Production remains blocked while the product production Supabase project is unassigned.

## INFRA-CI-001 — Dedicated release provenance lane

The repository has a dedicated release-provenance workflow:

`.github/workflows/infra-ci-001-release-provenance-authority.yml`

The lane is repository-only and does not perform external mutation.

It validates:

- release authority contract;
- exact PR candidate provenance;
- non-MAIN release-go/no-go integration;
- fail-closed production behavior while production Supabase is unassigned;
- diff hygiene.

## INFRA-CI-002 — MAIN enforcement model

The workflow runs on every pull request rather than using `paths:` filtering.

This avoids a future required-check deadlock where GitHub could wait forever for a workflow that was skipped because no monitored path changed.

The lane keeps workflow isolation narrow: when the Infra provenance workflow itself changes, it must not be bundled with unrelated domain workflow changes.

A pull request targeting `MAIN` is not itself treated as a production release commit. It must first pass exact PR candidate provenance.

While product production authority remains incomplete, the MAIN pre-release path intentionally remains NO_GO.

## INFRA-CI-003 — Exact candidate and release binding

INFRA-CI-003 fixes a provenance gap discovered during live PR→MAIN validation.

The previous implementation could accept a manifest whose internally consistent SHA referred to an older commit because it did not compare that SHA to the real candidate Git object.

INFRA-CI-003 corrects this by separating:

```text
PR candidate
  = GitHub event head SHA
  + exact Git tree
  + PR branch/base

production release
  = integrated MAIN release SHA
  + exact Git tree
  + runtime release authority
  + production release manifest
```

The candidate audit compares the event SHA to checked-out HEAD and resolves the tree from that SHA locally.

The production audit compares `release_sha/tree/branch` in the manifest to runtime release authority and to the local Git object.

This preserves the existing fail-closed production policy while preventing stale provenance from being reused for another commit.

## Current fail-closed state

`production.supabaseProjectRef` remains unassigned.

Therefore product production remains NO_GO even when all repository provenance checks are structurally valid.

This is intentional.

## Non-authority

This contract and CI lane do **not** authorize:

- Vercel project setting changes;
- Vercel promote/redeploy/rollback;
- branch protection or ruleset changes;
- GitHub Pages changes;
- disconnecting `doke-web-jkpw`;
- Supabase staging writes;
- Supabase production creation;
- migrations;
- Edge Function deploys;
- secrets/env-var changes;
- OAuth or SMTP changes;
- DNS/custom domain changes;
- merge or Ready for Review;
- production deployment.

Each remains a separate governed write.