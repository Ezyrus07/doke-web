# Catálogo compartilhado de serviços no Supabase

## Objetivo

Ativar a persistência real dos anúncios de serviço entre contas, navegadores e dispositivos.

## Migration

Aplicar, em ordem, a migration:

```text
supabase/migrations/009_service_catalog_shared_runtime.sql
```

Ela adiciona:

- `services.external_id`, que preserva o ID público já usado pelo frontend;
- `services.metadata`, para o snapshot completo do anúncio;
- políticas RLS de leitura pública para anúncios publicados;
- políticas de escrita restritas ao profissional proprietário;
- políticas equivalentes para `service_media`;
- bucket público `service-media`, com upload restrito à pasta do usuário autenticado.

## Aplicação pelo Supabase CLI

```bash
supabase link --project-ref <PROJECT_REF>
supabase db push
```

## Aplicação pelo SQL Editor

Abra o SQL Editor do projeto Supabase, cole integralmente o conteúdo da migration `009_service_catalog_shared_runtime.sql` e execute uma vez.

## Teste mínimo após aplicar

1. Entrar com profissional autenticado pelo Supabase.
2. Publicar anúncio com imagem.
3. Confirmar no DOM: `data-doke-services-provider="supabase"`.
4. Sair da conta.
5. Entrar como cliente em outro navegador ou dispositivo.
6. Confirmar o anúncio na home, resultados, perfil público e detalhe.
7. Desativar como profissional e confirmar que o cliente deixa de vê-lo.
8. Reativar e confirmar retorno ao catálogo.

## Fallback

Se Supabase, migration, sessão ou rede estiverem indisponíveis, o repository preserva o anúncio localmente com `syncStatus: "pending"` e tenta sincronizar novamente quando houver sessão válida.
