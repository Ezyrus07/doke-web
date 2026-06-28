# Shared Mobile Drawer Migration Plan

## Status

Plano de migração para reduzir drawers móveis locais sem assumir que todas as composições são equivalentes.

## Escopo

- Drawer de filtros.
- Drawer de ações contextuais.
- Drawer de ajuda.
- Painéis móveis equivalentes a bottom sheets.

## Critérios de equivalência

Unificar apenas quando a função, hierarquia, comportamento responsivo, foco, fechamento, backdrop e área de toque forem equivalentes.

## Ordem recomendada

1. Inventariar drawers ativos e seus consumidores.
2. Validar comportamento em 390x844 e 820x1180.
3. Migrar somente surface/header/body/footer/actions.
4. Remover aliases locais apenas depois de screenshot aprovado.

## Guardrails

- Não alterar shell mobile global sem prova.
- Não fundir drawer com modal comum quando o gesto/posição for diferente.
- Não remover classes locais enquanto houver JS ou CSS dependente delas.
