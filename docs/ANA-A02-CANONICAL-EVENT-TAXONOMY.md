# ANA-A02 — Canonical Event Taxonomy

Defines ana-event-taxonomy-v1 with four classes: behavior, domain fact, operational observability and derived projection.

Key boundaries:

- quote.submitted never substitutes for order.requested.
- CTA clicks are behavior, not transaction facts.
- ORD owns order facts; PAY owns payment facts.
- Search observability is not product conversion analytics.
- Browser clients cannot emit transaction outcomes.
- Raw search text, quote answers and sensitive identity/payment fields are prohibited.

Legacy service and quote metric names map to canonical semantic aliases without upgrading their trust level.
