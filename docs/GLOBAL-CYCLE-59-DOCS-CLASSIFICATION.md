# Ciclo Global 59 — Classificação de documentação ativa x histórica

## Objetivo

Classificar a documentação atual do projeto sem mover ou apagar arquivos. O objetivo é preparar uma migração controlada futura para `docs/archive/`, evitando que documentos antigos de stage/fix/final/prompt/audit continuem sendo confundidos com contratos ativos.

## O que foi feito

- Criada a auditoria `scripts/audit-docs-classification.js`.
- Adicionado o comando `npm run audit:docs-classification`.
- Gerado o relatório `docs/DOCS-ACTIVE-HISTORICAL-CLASSIFICATION.md`.
- Gerado o JSON de validação `docs/validation/global-cycle-59-docs-classification.json`.

## Resultado

A auditoria classifica documentos em:

- `active-contract`: fonte atual de arquitetura, contratos, governança ou data-readiness.
- `active-review`: parece ativo, mas precisa revisão humana antes de virar fonte oficial.
- `archive-candidate`: documento histórico/ciclo/fix/stage/final/prompt/audit que não deve guiar decisões novas.
- `needs-review`: documento ambíguo, sem ação automática.
- `validation`, `report`, `removal-log`, `archived`: documentos já classificados pela pasta.

## Decisão técnica

Nenhum documento foi movido ou apagado neste ciclo. A classificação vem antes da limpeza para evitar perda de contexto histórico e evitar que contratos ativos sejam arquivados por engano.

## Próximo passo recomendado

Ciclo Global 60 — migração controlada de documentação histórica óbvia para `docs/archive/`, começando apenas pelos `archive-candidate` com baixo risco e mantendo auditoria de rollback/listagem.
