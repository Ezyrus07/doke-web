# Anexos transacionais no Supabase Storage

## Objetivo

A migration `012_transaction_attachments_storage.sql` cria a autoridade privada para anexos de pedidos e conversas.

## Dependências

Aplique antes:

1. `009_service_catalog_shared_runtime.sql`
2. `010_orders_shared_runtime.sql`
3. `011_messages_shared_runtime.sql`

## Estrutura dos caminhos

- Pedido: `orders/<order_uuid>/<uploader_uuid>/<arquivo>`
- Conversa: `conversations/<conversation_uuid>/<uploader_uuid>/<arquivo>`

O bucket é privado. URLs públicas não são utilizadas. O frontend solicita URLs assinadas de curta duração.

## Segurança

- somente cliente e profissional participantes podem ler;
- somente um participante autenticado pode enviar;
- o terceiro segmento do caminho deve ser o `auth.uid()` do remetente;
- somente quem enviou pode atualizar ou excluir o objeto;
- tipos executáveis e SVG não são aceitos;
- limite por arquivo: 10 MB.

## Aplicação

Pelo CLI:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

Ou execute integralmente a migration no SQL Editor do Supabase.

## Validação manual

1. Crie um pedido com imagem e PDF.
2. Confirme `data-doke-attachments-provider="supabase"` no `<html>`.
3. Entre como profissional em outro navegador.
4. Abra o pedido e confira preview/download.
5. Envie uma imagem e um PDF pela conversa.
6. Entre como cliente e confirme os mesmos anexos.
7. Tente abrir a URL assinada após expirar; a aplicação deve solicitar outra URL ao recarregar.
8. Confirme que um terceiro usuário não consegue listar nem abrir os objetos.
