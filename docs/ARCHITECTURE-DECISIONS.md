# Architecture Decision Records

## ADR-001 — App Shell mobile global
Status: aprovado.
Decisão: header, search e bottom nav mobile devem ser gerados por uma fonte única.
Motivo: evitar microdiferenças entre páginas e reduzir manutenção manual.

## ADR-002 — Página não redesenha componente global
Status: aprovado.
Decisão: páginas podem controlar espaçamento externo e layout local, mas não altura, cor, padding interno, radius, sombra ou estrutura de componentes globais.
Motivo: preservar consistência visual, acessibilidade e manutenção.
