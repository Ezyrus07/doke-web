# Next sublot

## Immediate PR action

1. Run the final `Doke Quality Gates`, `Doke Diagnostic E2E` and `Doke Staging Edge HTTP Canary` checks on the evidence-complete branch.
2. Confirm that the governed domain-completion matrix remains synchronized.
3. Mark PR #8 ready for review only after every required check passes.
4. Review the complete PR scope and merge only after explicit approval.

## Deferred paid-plan item

`SEC-B05` remains blocked by `PAID-001`: Supabase leaked-password protection requires Pro or above. Near launch:

1. upgrade the Supabase plan;
2. enable **Prevent use of leaked passwords**;
3. repeat Security Advisor;
4. verify rejection of a known compromised password;
5. verify normal operation with a strong password.

## Next architectural domain

After PR #8 is merged, decompose and begin `AUTH-001` without claiming the paid leaked-password control as complete. The first AUTH sublot must cover real session authority, recovery, reauthentication, authorization boundaries and user-facing failure handling while preserving the existing paid-plan backlog.
