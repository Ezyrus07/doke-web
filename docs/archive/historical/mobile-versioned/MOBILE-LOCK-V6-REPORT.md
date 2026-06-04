# Mobile Lock v6 — header/search contract

## Objetivo
Corrigir somente o chrome mobile compartilhado entre `index.html` e `resultados.html`:

- mesma posição vertical do header;
- mesma largura e gutter;
- mesma searchbar;
- placeholder centralizado por wrapper flexível;
- remoção real do espaço visual das tabs antigas em `resultados.html`;
- cache atualizado para `v6`.

## Arquivos alterados

- `index.html`
- `resultados.html`
- `assets/css/components/navigation/mobile-chrome-lock.css`

## Decisão técnica
O arquivo foi reescrito de forma limpa, sem manter blocos incrementais v3/v4/v5 no final. Ele continua sendo uma trava transitória porque o projeto ainda tem CSS legado competindo com o contrato mobile.

## Critério de aceite visual

Testar em:

- iPhone 13: 380px
- iPhone 14: 427px

A busca do `index.html` e do `resultados.html` deve ter a mesma geometria. O `resultado.html` não deve exibir faixa/tabs azuis no topo mobile.
