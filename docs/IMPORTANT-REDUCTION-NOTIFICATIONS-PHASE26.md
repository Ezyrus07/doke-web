# Phase 26 — Notificações: superfície sem borda pesada e remoção de CSS morto

## Objetivo

Corrigir a regressão visual percebida nos cards de notificações no desktop, onde a borda voltou a aparecer como contorno forte, e remover um CSS local de seleção que não era importado pela página.

## Alterações

- `assets/css/pages/notificacoes/base-layout.css`
  - manteve a anatomia dos cards;
  - trocou a borda visível padrão por `1px solid transparent`;
  - manteve a borda transparente em hover e estado não lido para evitar contorno visual sem mudar dimensões.
- `assets/css/pages/notificacoes/selection-cleanup.css`
  - removido do projeto limpo por não ser importado em `assets/css/pages/notificacoes.css`;
  - esse arquivo continha uma camada antiga de seleção com `!important` e não fazia parte da cascata ativa.

## Fora de escopo

- Home, cards da home, shell, sidebar, header global, roteador, mensagens e perfil.
- Estados funcionais de seleção ativa continuam no CSS de estado correto.

## Validação

- `npm run audit:agent-governance`
- `npm run audit:unused-asset-candidates`
- brace balance em `base-layout.css`
- `git diff --no-index --check`

