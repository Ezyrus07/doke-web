# REP-A03 — Review moderation, reporting, restoration and appeal lifecycle

## Purpose

`rep-a03-review-moderation-lifecycle-v1` defines a repository-only, fail-closed contract for review moderation. It does not activate database writes, remote execution, staging, production, reputation changes or real moderation.

## Separate state machines

Review state:

```text
pending_moderation
published
hidden
removed
```

Moderation-case state:

```text
none
open
under_review
resolved
appeal_pending
appeal_resolved
```

The review and its case are intentionally separate. A report may open a case while the review remains published. A case transition does not imply a reputation mutation.

## Canonical actions

```text
publish
report
triage
hide
remove
dismiss_report
appeal
restore
deny_appeal
```

Every action requires a stable `clientRequestId`, optimistic `expectedReviewRevision` and `expectedCaseRevision`, an actor identity supplied by canonical server context, and a reason code.

## Reporting boundary

A report:

- may be submitted by an authenticated user or trust system;
- opens a moderation case;
- does not automatically hide or remove the review;
- does not alter public reputation;
- carries opaque evidence references only.

Raw screenshots, private message bodies, identity documents, payment instruments, credentials and arbitrary raw payloads are prohibited from the command contract.

## Moderation boundary

Publishing, triage, hiding, removal and dismissal require moderator authority. The moderator cannot be:

- the review author;
- the reviewed user;
- the person who opened the case.

`triage` only moves the case to `under_review`. `hide` and `remove` require that authoritative state. Public visibility is derived from the resulting review state and cannot be chosen by the browser.

## Appeal and restoration boundary

Only the review author may open an appeal for a hidden or removed review.

An appeal:

- preserves the hidden or removed review state;
- does not restore visibility;
- binds to the exact prior moderation decision.

`restore` and `deny_appeal` require a `senior_moderator`, the exact prior decision event, and an actor different from the moderator who made that decision.

## Idempotency and lost-response safety

The contract derives:

- `idempotencyKey` from the stable request identity and transition subject;
- `intentFingerprint` from actor, revisions, reason and evidence references;
- `deterministicEventId` from the stable request identity and subject.

The same command returns the same outcome. Payload drift is a conflict. A ledger state of `resolution_required` fails closed.

## Immutable event history

Accepted transitions can produce an append-only event envelope containing:

- review and case identity;
- actor identity and role;
- action and reason code;
- opaque evidence references;
- previous event hash;
- resulting review and case states;
- public-visibility projection;
- deterministic event hash.

The envelope deliberately excludes raw reason summaries and raw evidence.

## Explicit non-effects

```text
moderationRuntimeAuthority: false
reviewPublicationRuntimeAuthority: false
reputationProjectionAuthority: false
fraudDecisionAuthority: false
rehireAuthority: false
stagingAuthority: false
productionAuthority: false
```

No migration, deployment, staging read, staging mutation, provider contact, credential configuration, real moderation action, real review visibility change, reputation change, user-data change, money movement or production change is authorized.

## Successor

`REP-A04 — canonical reputation projection, fraud resistance and dispute impact`.
