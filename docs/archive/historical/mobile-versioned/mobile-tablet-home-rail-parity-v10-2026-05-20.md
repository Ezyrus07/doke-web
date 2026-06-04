# Mobile Tablet Home Rail Parity v10 — 2026-05-20

## Objetivo
Padronizar o eixo e a densidade visual entre search/hero e categorias no tablet compacto da `index.html`.

## Correções
- Search pill simplificada para duas colunas: input + submit.
- Áudio ocultado no tablet compacto para evitar compressão/duplicação visual.
- Removida a aparência de borda dupla interna.
- Hero, categorias e seções principais passam a obedecer o mesmo rail da página.
- Categorias deixam de usar setas sobrepostas no tablet compacto.
- Track de categorias vira grid horizontal fluido, com cards uniformes.

## Escopo
- Afeta apenas `561px–680px` e regras gerais de rail para `561px–1024px`.
- Não altera desktop acima de `1024px`.
- Não altera mobile real abaixo de `561px`.

## Arquivos
- `index.html`
- `assets/css/pages/home-tablet.css`
