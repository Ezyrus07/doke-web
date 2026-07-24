# SEC-B05 — Supabase Auth password hardening

## Objective

Close the remaining Supabase Security Advisor warning for leaked-password protection without changing unrelated authentication behavior in the same operation.

## Required dashboard change

Project: `doke-web-staging` (`zwkczgewzbsorbrjuzpb`)

1. Open **Authentication → Providers → Email**.
2. Enable **Leaked password protection**.
3. Save the Auth configuration.
4. Re-open **Security Advisor** and confirm that `auth_leaked_password_protection` no longer appears.

Supabase uses the Have I Been Pwned Pwned Passwords API to reject passwords known to have leaked. This setting is available on Pro plans and above.

## Change boundary

This SEC-B05 operation does not:

- alter existing user password hashes;
- force an immediate password reset;
- change MFA or social providers;
- change the minimum password length;
- deploy Edge Functions or apply database migrations.

Any broader password-complexity or reauthentication policy belongs to `AUTH-001`, where client error handling and user communication can be validated together.

## Evidence required before closure

- timestamp of the dashboard change;
- Security Advisor result with zero `auth_leaked_password_protection` warnings;
- sign-up or password-change canary proving a known leaked password is rejected;
- normal strong-password canary proving valid authentication remains functional.

## Rollback

Disable leaked-password protection in the same Email provider settings only if it causes a confirmed authentication incident. Record the incident, affected flow and rollback timestamp before reopening `SEC-B05`.
