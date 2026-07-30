# ORD-001 / ORD-A06 — Staging execution readiness

## Decision

Staging already contains the minimum **technical capacity** for the real two-context visual settlement canary:

- one confirmed client candidate;
- one distinct confirmed professional candidate;
- one active and verified professional profile;
- one published service owned by that professional;
- zero existing order-domain residue.

This does **not** authorize execution.

The current status is:

`candidate_capacity_found_authorization_blocked`

## Why execution remains blocked

Existing accounts and services are user data. Their presence proves capacity, not consent. The executor must remain fail-closed until all three resources are explicitly authorized:

1. the client candidate;
2. the professional candidate;
3. the professional's published service.

The following material must also be supplied outside the repository:

- client login and password;
- professional login and password;
- approved web, API and Supabase staging URLs;
- service reference;
- service-role secret, available only to the Node process;
- explicit network, mutation and execution flags.

## Read-only inspection result

The inspection performed no account or domain mutation.

| Capability | Result |
| --- | --- |
| Auth users | 3 |
| Client profiles | 3 |
| Professional profiles | 1 |
| Published services | 1 |
| Compatible distinct client/professional pairs | 1 |
| Eligible service owned by professional candidate | 1 |
| Orders | 0 |
| Budgets | 0 |
| Order history rows | 0 |
| Domain events | 0 |
| Metric events | 0 |
| Delivery attempts | 0 |

No e-mail, user ID, username, display name, service ID, credential or token is recorded in this document or its JSON evidence.

## Candidate constraints

### Client

The candidate is technically compatible because the account is confirmed, active, has signed in and owns a client profile. It is not also the selected professional candidate.

### Professional

The candidate is technically compatible because the account is confirmed, active, has signed in, owns an active professional profile and is verified.

### Service

The service candidate is published, has an approved version and belongs to the professional candidate.

None of these facts constitute authorization.

## Fail-closed rule

The real executor must not run merely because candidate capacity exists. It must still require:

`DOKE_ORD_A06_AUTHORIZATION_ACK=I_AUTHORIZE_ORD_A06_STAGING_TEST_ACCOUNTS`

and all remaining secrets, targets and mutation flags.

CI is limited to static evidence validation. It must not read Supabase, open a browser, use credentials or invoke the real executor.

## Next controlled action

Obtain explicit authorization for the already identified client, professional and owned service. After authorization, inject the credentials and endpoints only into the executor environment, run `--check-env`, and permit `--execute` only when every gate passes.
