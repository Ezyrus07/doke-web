# Mobile Input Alignment / Focus Fix — 2026-05-01

## Objetivo
Corrigir o alinhamento vertical do placeholder/texto do input mobile do `index.html`, remover a borda/anel visual indevido ao focar o input no `resultados.html` e subir levemente o header mobile de resultados para alinhar melhor com a referência do index.

## Arquivos alterados
- `index.html`
- `resultados.html`
- `assets/css/components/navigation/mobile-search-header-shared.css`

## Decisão técnica
A correção foi feita no contrato compartilhado de busca/header mobile, não no CSS local da página. Isso mantém `index.html` e `resultados.html` consumindo a mesma regra de input, foco, altura e comportamento visual.

## Regras aplicadas
- Input com `appearance: none` e `-webkit-appearance: none` para neutralizar estilo nativo do browser.
- `focus`, `focus-visible` e `focus-within` sem borda/outline no campo de busca mobile.
- Campo e input com altura integral e alinhamento vertical consistente.
- Header mobile do `resultados.html` com margem superior menor para aproximar da posição do `index.html`.
