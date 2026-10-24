# EDGE-CORS-002 ? Hosted compatibility and rollback readiness (read-only inventory)

**Date:** 2026-10-23. **State:** NO-GO for hosted deployment. Evidence-only, isolated local follow-up to PR #555. No remote application writes or network canaries.

## Identity and authority

- Repository: Ezyrus07/doke-web.
- Candidate security patch: PR #555, HEAD 982444ffecc74620c64d8e3074d0728ee5ed489f, Draft, based on PR #554 at f054ae405d33246d101419896039c76781b7a657.
- PR #555 GitHub Actions: 38/38 completed/success, including focused EDGE-CORS-001 (50/50 offline assertions, eight source consumers).
- This document does not authorize merge, promotion, staging function deploy, Supabase secret changes, migrations, hosted write tests, Control Center writes, or changes to P31. P31_HOLD and STAGING_NOT_CERTIFIED persist.

## Read-only provider inventory

Two Supabase projects were found ACTIVE_HEALTHY at inspection:

- doke-web-staging (zwkczgewzbsorbrjuzpb, us-west-2): 11 active Edge Functions; 8 bundle copies of the old shared CORS module covered by PR #555.
- doke-prof-b05-g4-e2e (bqmmbopwfgwffkbtheab, sa-east-1): 2 active Edge Functions; both also embed the old shared module.
- Other active functions outside the eight source consumers are OUT OF SCOPE (e.g., workers, analytics or canary/operator functions). Do not redeploy them incidentally.

The deployed shared _shared/http-security.ts source was equal across all ten inspected bundle instances and still had the previous rules: literal configured HTTP origins accepted, and loopback permitted unless DOKE_ALLOW_LOCAL_ORIGINS was "false". No evidence establishes that any live DOKE_ALLOWED_ORIGINS *value* currently contains an insecure origin.

### Function-instance registry (recheck immediately before any permitted release)

| Project | Function | Deployed version | verify_jwt | Entrypoint vs repo HEAD 982444ff |
|---|---|---:|---|---|
| staging | quote-template-ai | 11 | true | Equal |
| staging | order-event-operations | 13 | true | Equal |
| staging | professional-verification-operations | 6 | true | Equal |
| staging | financial-operations | 6 | true | Equal |
| staging | service-moderation-operations | 8 | true | Equal |
| staging | self-service-operations | 12 | true | **DRIFT / NO-GO** |
| staging | staging-finance-sandbox | 6 | true | Equal |
| staging | search-public-services-v2 | 10 | false | **DRIFT / NO-GO** |
| e2e | professional-verification-operations | 2 | true | Equal |
| e2e | self-service-operations | 2 | true | Equal |

Only **entrypoint** equality has been established for eight instances. Full-bundle parity (dependency files, import maps, configuration and production data semantics) is NOT certified for those instances.

### Concrete source drift

- staging/self-service-operations: the repo has additional transaction-attachment rate-limit and request branches not present in the hosted index.ts. Its hosted self-service-operations/operations.mjs also differs from the repo copy (1,923 hosted bytes vs 2,046 repo bytes). A direct deploy would change business behavior, not only CORS.
- staging/search-public-services-v2: hosted index.ts includes analytics search execution events and exposure-proof integration beyond the repo version. Hosted bundle references _shared/analytics-proof.ts (4,753 bytes), which was **not found in this PR's repository tree**. A repo-only deployment could remove telemetry, proofs or fail to bundle.
- e2e/self-service-operations entrypoint and operations.mjs were identical to the repo when read. This is NOT proof of whole-bundle equality.
- **Mandatory:** reconcile the two divergent function sources and their dependencies in a separately reviewed change; do not "fix" them by overwriting the deployed copy with Git code.

## Secrets/configuration metadata: presence only, not values

Read-only Supabase CLI v2.109.0 secrets list, inspecting only variable **names**, produced:

| Project | DOKE_ALLOWED_ORIGINS | DOKE_ALLOW_LOCAL_ORIGINS | Compatibility certified? |
|---|---|---|---|
| staging | Present | Absent | **NO ? configured list value not inspected** |
| e2e | Absent | Absent | **NO ? origin-dependent client tests pending** |

The new PR #555 policy rejects the *entire browser allowlist*, including the fixed secure default, if any configured entry is malformed, non-loopback HTTP, duplicated or an unauthorized local origin. The hosted staging allowlist therefore requires operator-owned evaluation before deployment. Do not display, copy into chat, commit or log environment variable values.

DOKE_ALLOW_LOCAL_ORIGINS absent means the current deployed policy implicitly permits loopback while the new policy disallows it, potentially affecting development browser clients. No-origin clients retain separate authentication and authorization responsibilities; CORS is never an authorization mechanism.

### Sealed operator compatibility gate (not run)

An authorized operator, in a protected environment, must evaluate the effective DOKE_ALLOWED_ORIGINS value **without printing any value** and record only:
1. Config present / absent and explicit boolean opt-in state;
2. Number of effective origins (no URL or hostname listing);
3. Whether each configured origin is canonical HTTPS, or explicitly approved loopback with separate local-only opt-in;
4. Whether there are duplicates, empty entries, paths, userinfo, wildcard, noncanonical URL strings or non-loopback HTTP;
5. Overall PASS/FAIL for the exact PR #555 parser.

Preserve an access-controlled audit record without secret values. On FAIL, STOP and separately authorize a compatible secret configuration change before any function deployment.

## Release GO/NO-GO (all must be true)

- [ ] Operator expressly authorizes specific project, function, commit and release window; no blanket authorization for all functions.
- [ ] Each function bundle, including index.ts, helper scripts, import maps and shared dependencies, is compared byte-for-byte or intentionally reconciled to its deployed baseline.
- [ ] Staging self-service and search drift are reconciled with independent regression coverage; their current hosted-only logic and dependencies remain preserved.
- [ ] Sealed origin configuration gate PASS for the target project and affected clients.
- [ ] Intended JWT verification state captured and preserved. In particular search-public-services-v2 currently uses verify_jwt=false; never toggle it accidentally.
- [ ] Current complete bundled source and metadata for the exact function/project/version are backed up in protected operator-owned storage and their restore procedure is tested in an authorized isolated environment.
- [ ] Candidate bundle has real Deno/Supabase runtime packaging validation (Node 24 offline policy tests alone are insufficient).
- [ ] Explicitly authorized read-only preflight and authenticated/unauthenticated canaries are defined without real-money, PII, moderation or business mutations.
- [ ] Monitoring and rollback triggers assigned to an operator; no concurrent deployment of the same function.

Until all are satisfied, decision = **NO-GO**.

## Proposed rollout sequence ? PLAN ONLY, no execution authority

1. **Evidence freeze:** capture function bundle hashes, current version, verify_jwt, import_map/deno.json, deployment metadata, owners, and approved rollback source snapshots for each target instance.
2. **Configuration reconciliation:** have operator validate staging allowlist and intended browser origins with a no-value-reporting check; do not apply changes in this step.
3. **Source reconciliation:** resolve staging self-service and search drift in separate code review and tests. Validate analytics-proof.ts and transaction-attachment behaviors explicitly.
4. **Controlled E2E pilot:** only with separate approval, consider one lower-risk *synthetic* e2e function instance after proving bundle parity and rollback, then verify read-only CORS (allow authorized HTTPS, reject external HTTP and loopback without opt-in) plus expected JWT boundary. If pilot is unsafe, do not run it.
5. **Staging staged rollout:** deploy a single approved function instance at a time, never all functions at once; confirm deployed shared module, source fingerprint, preservation of verify_jwt and no functional regression before proceeding.
6. **High-impact/DRIFT functions last:** do not deploy staging self-service-operations or search-public-services-v2 until reconciled. Treat financial and event-writing functions as higher-risk; do not perform financial operations or business writes as canaries.
7. **Post-release review:** compare actual module, logs (without secrets), browser origin decisions and rollback readiness. Passing deployment checks alone cannot certify staged runtime or P31 readiness.

## Rollback strategy ? source-redeploy, not Git revert alone

Official Supabase guidance for its Dashboard function editor states no built-in version control or rollback of edits. A Git revert or returning to an earlier PR does not itself change a function already deployed to Supabase. Reference:
- https://supabase.com/docs/guides/functions/quickstart-dashboard
- https://supabase.com/docs/guides/functions/deploy

For a permitted release, capture a **full protected prior bundle** per function/project, not merely a commit hash, because some hosted code differs from Git. Rollback consists of a *separately authorized* redeploy of the exact prior files/import maps/configuration and preserved verify_jwt, followed by an explicit read-only health / CORS / authorization check. Do not assume selecting an old Dashboard version works. Never change project secrets as an implicit rollback step.

Rollback/STOP triggers: legitimate HTTPS browser origin rejected, unexpected auth/JWT change, 5xx/BOOT_ERROR/invalid import, missing analytic exposure proofs, missing transaction attachment workflows, unexpected mutations, elevated error rates, failed canary or version mismatch. On any trigger halt sequential rollout immediately; preserve diagnostic evidence; perform only authorized recovery.

## Independent remaining blocker

Vercel kontrat-staging-api-runtime Preview access has no Vercel platform SSO/password/IP restrictions in the observed project settings; the two web Preview projects do have SSO enabled. Changing API Preview protection without validating clients can break usage. This is outside PR #555 and does not become certified by any Supabase rollout.

**Final decision: NO-GO / NO DEPLOY / NO SECRET WRITES / NO MERGE / P31 HOLD.**
