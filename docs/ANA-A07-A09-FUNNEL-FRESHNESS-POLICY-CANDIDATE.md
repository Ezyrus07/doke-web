# ANA-A07/A09 — Funnel freshness policy candidate

This repository-only lot defines revision 1 of the freshness policy for the eight canonical ANA-A09 funnel metrics. No policy is active, no policy row is persisted, no snapshot is published and no scheduler is created.

## Candidate values

- policy set: `ana-a07-a09-funnel-v1-r1`
- metric version: `v1`
- metrics: **8**
- candidate window reference: **300 seconds**
- candidate projection-delay budget: **60 seconds**
- proposed `maxLagSeconds`: **360 seconds**
- effectiveFrom: **unset until explicit activation authorization**
- effectiveUntil: **unset until explicit activation authorization**

The value is derived as `300 + 60 = 360`. The five-minute + one-minute budget is the only already-certified operational ANA cadence. It is reused as a candidate baseline to avoid inventing a second arbitrary cadence, but ANA-A11 authority is not inherited by A09.

All eight metrics are computed by the same A09 RPC. The cross-domain final transition already uses the minimum behavior/ORD watermark, so dependency lag is represented by `dataThrough`; adding an extra ORD allowance would double-count lag.

## Fail-closed semantics

No implicit default exists. Before activation, the eight metrics still have no effective threshold and therefore remain unavailable for authoritative publication.

After a future separately authorized activation:

- lag > 360 seconds => stale;
- missing policy => unavailable;
- dependency unavailable => unavailable;
- dependency stale => stale;
- partial window coverage => stale;
- no coverage => unavailable;
- overlapping policy windows => activation rejected;
- older healthy snapshots cannot replace the latest canonical closed window.

Policy activation alone will **not** authorize snapshot publication. Complete/orphan/empty-window/late-fact staging canaries remain separate gates.

## Runtime candidate

The repository includes:

- `supabase/migrations/20260924004500_ana_a07_a09_funnel_freshness_policy_activation.sql`
- `supabase/tests/043_ana_a07_a09_funnel_freshness_policy_activation_validation.sql`

Applying the migration only installs the postgres-only activation function. Validation 043 is rollback-only and proves atomic insertion of exactly eight transient policies plus overlap rejection. A later explicit authorization is still required to invoke activation with an effective window.
