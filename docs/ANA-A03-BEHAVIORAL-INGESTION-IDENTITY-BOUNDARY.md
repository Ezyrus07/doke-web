# ANA-A03 — Behavioral Ingestion and Identity Boundary

Defines a server-owned analytics ingestion boundary using the existing Doke Edge security patterns.

Anonymous sessions are ephemeral and server-issued. Authenticated actor identity comes from server authentication. Cross-session, cross-device and anonymous-to-authenticated stitching remain disabled while LEGAL-B03 is open.

Search impression/click events require signed exposure proofs. Transport idempotency, semantic deduplication and rate limiting are independent controls. Browser roles never receive direct canonical event-ledger write authority.

This repository-only lot includes deterministic synthetic signing helpers for conformance testing only; it does not configure a real signing secret or runtime endpoint.
