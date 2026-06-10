# CSS Cleanup Stage 13 — CSS inválido saneado

## Objetivo

Corrigir arquivos CSS estruturalmente inválidos antes de continuar removendo camadas. Chaves desbalanceadas tornam a cascata imprevisível porque o navegador pode engolir regras seguintes dentro de um bloco aberto.

## Arquivos corrigidos

- `assets/css/pages/home-shell.css`
- `assets/css/pages/comunidade/discovery-v3.css`

## Correções aplicadas

### `home-shell.css`

Havia um `@media (max-width: 767px)` aberto e, antes de ser fechado, começava outro `@media (max-width: 760px)`. Em CSS puro isso não é uma estrutura segura. Foi inserido o fechamento do bloco antes do próximo media query.

### `comunidade/discovery-v3.css`

O bloco `.community-activity-card__badge` terminava sem `;` e sem `}`. Foi finalizado corretamente.

## Validação estática

- CSS em `assets/css`: 371 arquivos
- Arquivos CSS com chaves desbalanceadas após o stage: 0
- `!important` total em `assets/css`: 19438
- CSS ativo transitivo do `index.html`: 121 arquivos
- `!important` ativo na cascata do `index.html`: 2609

## Observação

Este stage não tenta melhorar visual. Ele remove uma fonte de comportamento imprevisível para permitir as próximas limpezas com menos risco.
