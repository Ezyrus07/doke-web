# Mobile Tablet Home Cascade Fix v9 — 2026-05-20

## Escopo
Correção específica da `index.html` em tablet compacto (`561px–680px`).

## Problema
A versão anterior não alterava a tela porque o `index.html` ainda carregava o `home-tablet.css` com query string antiga e parte dos seletores mobile continuava vencendo search/categories.

## Correções
- Atualizado cache-busting do `home-tablet.css` para `20260522-tablet-cascade-fix-v9`.
- Criado cascade guard final dentro de `assets/css/pages/home-tablet.css`.
- Search pill usa grid explícito: campo + áudio + submit, removendo bordas/pseudo-elementos internos.
- Rail de categorias ganhou padding lateral real para as setas não invadirem os cards.
- Cards de categoria reduzidos e estabilizados.

## Arquivos alterados
- `index.html`
- `assets/css/pages/home-tablet.css`
- `docs/mobile-tablet-home-cascade-fix-v9-2026-05-20.md`
