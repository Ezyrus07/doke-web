# Storage privado da verificação profissional

O bucket `professional-verification-media` é privado. O fluxo autoritativo de upload **não** concede INSERT/UPDATE/DELETE genérico ao navegador: a Edge Function gera intents e signed upload tokens para paths `locked/<user-id>/<intent-id>/...`.

## Policy canônica de leitura

O staging usa uma única policy de SELECT:

`professional_verification_reference_read`

Ela permite leitura somente quando:

- o objeto pertence ao bucket `professional-verification-media`;
- a operação do Storage é `storage.object.sign` ou `storage.object.get_authenticated`;
- o path está referenciado em `public.professional_identity_verifications.documents`; e
- o caller é o dono da verificação ou um admin/moderador ativo.

Listagem genérica do bucket não é autorizada.

A expressão canônica é:

```sql
bucket_id = 'professional-verification-media'
and storage.allow_any_operation(array[
  'storage.object.sign',
  'storage.object.get_authenticated'
])
and exists (
  select 1
  from public.professional_identity_verifications piv
  cross join lateral jsonb_each(coalesce(piv.documents, '{}'::jsonb)) as doc(field, payload)
  where doc.payload ->> 'bucket' = 'professional-verification-media'
    and doc.payload ->> 'path' = name
    and (
      piv.user_id = (select auth.uid())
      or public.is_active_admin_or_moderator()
    )
)
```

## Policies proibidas

Não recriar policies owner-prefix de:

- INSERT;
- UPDATE;
- DELETE;
- SELECT por primeiro segmento UUID.

Essas policies foram removidas do staging em PROF-B05/G1. Reintroduzi-las restaura a vulnerabilidade que permitia ao browser mutar evidência KYC já referenciada.

## Upload

Uploads usam apenas:

```text
prepare_uploads
→ database-generated locked path
→ createSignedUploadUrl
→ uploadToSignedUrl
→ submit
```

O bucket deve permanecer **privado**. Documentos de identidade nunca devem usar URL pública permanente.
