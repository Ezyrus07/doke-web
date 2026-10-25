# MSG-A05 and Message Update Guard ? Synthetic integration

Date: 2026-10-24. Source: PR #559, commit 8f8bd33d. Decision: **NO-GO for hosted SQL**.

## Staging-derived schema facts (read-only)

The staging `public.messages` table has 11 columns: id, conversation_id, sender_id, body, status, created_at, external_id, message_type, attachments, metadata, read_at. It has RLS with message_participants_select, message_participants_update, and message_sender_insert. The status constraint includes removed and there is currently no noninternal message trigger. The fixture reproduces these relevant contracts but does **not** reproduce the full staging schema, REST API, JWT gateway or other migrations.

## PostgreSQL 17 integration results

On an isolated SCRAM-authenticated cluster bound to 127.0.0.1:55495, using synthetic actors, orders, conversations, messages and Storage records, both source migrations compiled together. Both migration orders passed: MSG-A05 then Message Update Guard; and Message Update Guard then MSG-A05. Two BEFORE/AFTER message triggers coexist.

Confirmed that authorized recipient read leaves the attachment attached; rejected recipient removal does not orphan; authorized sender removal marks the attachment orphaned with 30-day retention. The test cluster is automatically stopped and removed.

## Confirmed blocker ? source not safe for rollout

MSG-A05 as currently reachable from PR #559 grants authenticated EXECUTE on private.transaction_attachment_from_path(text). It is SECURITY DEFINER and returns a complete private lifecycle record. In the synthetic database, an unrelated actor with authenticated role passed their unrelated auth.uid(), called this function with another actor's attachment path and received the private attachment ID. **The vulnerability was reproduced only in the synthetic database; MSG-A05 is not deployed on inspected staging.**

The integration regression intentionally reports PASS for functional behavior and an explicit **security NO-GO**. Its row-access check should be inverted to assert denial **after** incorporating the independently prepared, not-yet-published MSG-A05 security correction. This is not a deployment certification.

## Remaining release gates

- Reconcile and review the separate local MSG-A05 privilege/actor-binding patch with the PR #559 source, before deployment.
- Re-test the combined suite with a denial assertion and run remote GitHub Actions. The workflow in this branch is not yet published.
- Use a real-schema-faithful synthetic staging clone and test REST/PostgREST with user JWT; capture exact policy DDL and a rollback rehearsal.
- No change to hosted staging, E2E, Supabase migrations, secrets, production, Control Center or P31 is authorized.

State: LOCAL_SYNTHETIC_COMPOSITE_PASS / SECURITY_EXPOSURE_REPRODUCED / HOSTED_NO_GO / NO_PUSH / NO_DEPLOY / P31_HOLD.
