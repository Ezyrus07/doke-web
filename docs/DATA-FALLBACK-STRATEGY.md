# Data fallback strategy — Doke

Este documento define a estratégia de fallback para a transição do Doke de HTML estático/mockado para dados reais, preservando visual atual e evitando acoplamento prematuro ao backend.

## Ordem de resolução de dados

1. Backend/repository real, quando disponível e autorizado.
2. Repository boundary do domínio ou página.
3. Mock data service controlado.
4. Fallback `empty` para resposta válida sem itens.
5. Fallback `error` para falha normalizada.

## Backend/repository real

A integração futura com Supabase, Firebase ou API própria deve ficar isolada em services/repositories. Páginas e renderers não devem conhecer cliente Supabase, Firestore, endpoints, RLS ou formato bruto da resposta.

## Repository boundary

O Repository boundary é a fronteira entre a UI e a fonte de dados. Ele deve:

- escolher backend real ou mock conforme flag/configuração;
- normalizar formato de resposta;
- nunca expor segredo, token sensível ou dados financeiros completos;
- retornar estrutura previsível para controllers.

## Mock data service

O Mock data service existe apenas para desenvolvimento e preparação de UI. Ele deve simular listas, estados vazios, erro e latência sem virar fonte definitiva de verdade.

## Estados obrigatórios

Toda operação assíncrona deve mapear para:

- `loading`: carregamento em andamento.
- `ready`: dados carregados com sucesso.
- `empty`: sucesso sem itens.
- `error`: falha técnica, autorização, parse ou regra de negócio.

## Contrato esperado de retorno

```js
{
  status: 'ready' | 'empty' | 'error',
  items: [],
  meta: {},
  error: null
}
```

## Restrições

- Não usar `style=""` para fallback visual.
- Não criar `!important` para estado dinâmico.
- Não armazenar CVV, número completo de cartão ou credenciais em estado client-side.
- Não fazer renderer buscar dados.
- Não fazer página acessar backend direto quando houver repository/service disponível.
