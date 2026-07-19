# Conversas e mensagens compartilhadas no Supabase

Aplicar depois das migrations 009 e 010:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Ou executar `supabase/migrations/011_messages_shared_runtime.sql` no SQL Editor.

Após aplicar, abra `mensagens.html` autenticado e confirme:

```js
document.documentElement.getAttribute('data-doke-messages-provider')
```

Resultado esperado: `supabase`.
