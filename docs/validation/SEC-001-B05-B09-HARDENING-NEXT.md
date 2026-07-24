# Next sublot

1. Regenerate `docs/DOMAIN-COMPLETION-MATRIX.md` from the current branch and restore the governed CI gate.
2. Review the complete seven-function source diff and the migration 145 privilege boundary.
3. Apply migration 145 to staging and execute `supabase/tests/014_edge_function_abuse_guard_validation.sql` plus the platform ACL validation.
4. Deploy the seven hardened browser-facing function bundles to staging without changing `order-event-worker`.
5. Execute authenticated HTTP/browser canaries for CORS, oversized bodies, invalid JSON, unauthorized requests, allowed origins and action-specific rate limits.
6. Reconcile deployed source/version metadata and retain rollback evidence.
7. Enable leaked-password protection and repeat the Supabase Security Advisor plus leaked/strong-password canaries.
8. Close SEC-B05 and SEC-B09 only after all evidence is attached to the draft PR.
