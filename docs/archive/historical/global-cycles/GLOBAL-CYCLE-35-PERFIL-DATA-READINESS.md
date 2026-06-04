# Ciclo Global 35 — Perfil data-readiness map

## Objetivo

Mapear o `perfil.html` para futura integração com dados reais, sem alterar visual, HTML ou CSS da página.

## Decisão técnica

O perfil não deve receber integração real nem refatoração visual antes de um baseline por modo:

- owner
- visitor
- client
- mobile

Neste ciclo, a página foi apenas mapeada para identificar áreas de dados, dependências de CSS/JS, riscos e próximos passos.

## Entregas

- `scripts/audit-perfil-data-readiness.js`
- `docs/PERFIL-DATA-READINESS-MAP.md`
- `docs/validation/global-cycle-35-perfil-data-readiness-report.json`

## Próxima recomendação

Ciclo Global 36 — adicionar data-hooks mínimos no `perfil.html` sem alterar visual, ou mapear `pedidos.html` antes, caso a prioridade seja uma página operacional.
