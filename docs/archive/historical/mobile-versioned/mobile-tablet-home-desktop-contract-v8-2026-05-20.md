# Mobile Tablet Home Desktop Contract v8 — 2026-05-20

## Escopo
Refinamento específico do contrato tablet da `index.html`, sem alterar desktop, sidebar global, bottom-nav global ou outras páginas.

## Problemas corrigidos
- Search pill com aparência de input duplicado / bordas sobrepostas.
- Botões de áudio e submit grudados na borda direita do campo.
- Categorias muito pesadas para tablet compacto.
- Setas do rail invadindo os cards de categoria.

## Ajustes aplicados
- Simplificação visual do campo de busca no tablet compacto.
- Remoção de pseudo-bordas internas do search pill.
- Botões do search estabilizados em `36px` e sem posicionamento absoluto.
- Cards de categoria reduzidos para `76px` de largura e `64px` de altura mínima.
- Rail de categorias ganhou padding lateral para as setas não sobreporem os cards.
- Setas reposicionadas de forma absoluta nas bordas do rail.

## Arquivos alterados
- `index.html`
- `assets/css/pages/home-tablet.css`
- `docs/mobile-tablet-home-desktop-contract-v8-2026-05-20.md`
