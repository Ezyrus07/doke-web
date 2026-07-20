# Storage privado da verificação profissional

A migration `020_professional_application_shared_runtime.sql` cria o bucket privado `professional-verification-media`, mas as policies de `storage.objects` precisam ser criadas pelo Dashboard quando o projeto não permite que o SQL Editor altere essa tabela.

Crie no bucket quatro policies para o papel `authenticated`:

## Proprietário — INSERT, SELECT, UPDATE e DELETE

Use a mesma condição em cada operação:

```sql
bucket_id = 'professional-verification-media'
and (storage.foldername(name))[1] = (select auth.uid()::text)
```

## Administração — SELECT

Nome: `professional_verification_admin_select`

```sql
bucket_id = 'professional-verification-media'
and exists (
  select 1
  from public.users
  where id = auth.uid()
    and role in ('admin', 'moderator')
    and status = 'active'
)
```

O bucket deve permanecer **privado**. Documentos de identidade nunca devem usar URL pública permanente.
