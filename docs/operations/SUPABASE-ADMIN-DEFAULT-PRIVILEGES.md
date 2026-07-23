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
