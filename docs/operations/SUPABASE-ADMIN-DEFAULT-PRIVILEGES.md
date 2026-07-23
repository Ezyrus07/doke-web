# Supabase-managed default privileges

## Status

The application-owned `postgres` default privileges in the `public` schema are fail-closed for `anon` and `authenticated` through migration `118_public_data_default_authority.sql`.

The project also exposes a platform-owned default ACL for role `supabase_admin`. A normal project migration cannot alter defaults owned by that role and staging returned:

```text
permission denied to change default privileges
```

## Impact

- Existing Doke tables are not affected: their grants were explicitly replaced and RLS is enabled.
- New tables created by Doke migrations run under the application migration role and inherit the hardened `postgres` defaults.
- Platform-created objects owned by `supabase_admin` must be reviewed through Supabase project controls/advisors.

## Operational control

After any platform feature creates a new `public` table or sequence:

1. run the security advisor;
2. inspect `information_schema.role_table_grants`;
3. enable RLS before exposing the table;
4. revoke structural privileges from `anon` and `authenticated`;
5. grant only the exact Data API contract.

Do not add an unappliable migration that attempts `ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin`.

## Reproducible validation

The read-only contract is versioned at:

```text
supabase/tests/013_platform_default_acl_validation.sql
```

It fails when a public table lacks RLS or policies, when a current public relation/sequence is owned by `supabase_admin`, when browser roles receive sequence privileges, or when the application-owned `postgres` defaults stop being fail-closed.

The 23 July 2026 staging run passed with:

- 45 public tables;
- 0 without RLS;
- 0 without policies;
- 0 `supabase_admin`-owned public relations/sequences;
- 0 browser sequence grants.

The platform-owned broad default ACL still exists, so this validation remains mandatory after migrations and after enabling Supabase features that can create public objects.
