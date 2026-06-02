# Higiene de documentação e relatórios

A documentação de fase e os relatórios de auditoria foram úteis para conter a dívida técnica, mas não devem virar arquitetura permanente.

## Estado desejado

A documentação viva deve convergir para poucos arquivos oficiais:

- `AGENTS.md`
- `docs/DOKE_AGENT_CONSTITUTION.md`
- `docs/ARCHITECTURE.md`
- `docs/CSS_AUTHORITY_MAP.md`
- `docs/VALIDATION.md`
- `docs/BASELINE-VISUAL-APPROVED.md`
- `docs/DATA-READY-CONTRACTS.md`

## O que não deve crescer indefinidamente

Evitar criar novos documentos permanentes do tipo:

- `*-PHASE*.md`
- `PHASE*-REMOVED-FILES.txt`
- relatórios JSON gigantes versionados
- documentos de tentativa que repetem decisões já consolidadas

## Regra para novos relatórios

Scripts de auditoria devem preferir relatórios resumidos e estáveis. Relatórios grandes, detalhados ou temporários devem ir para `reports/generated/` e não devem ser tratados como documentação fonte de verdade.

## Próxima consolidação

Quando a reforma CSS da home estabilizar, consolidar os documentos de fase relevantes em:

- `docs/ARCHITECTURE.md`
- `docs/CSS_AUTHORITY_MAP.md`
- `docs/VALIDATION.md`

Depois disso, os documentos de fase podem ser movidos para histórico ou removidos, desde que suas decisões importantes já estejam preservadas na documentação viva.

## Phase 21 — generated report removal

Generated reports and historical report artifacts were removed from the active tree. The project now keeps only placeholder README files in `reports/` and `docs/reports/`.

Rules:

- generated evidence goes to `reports/generated/`;
- generated evidence is ignored by Git;
- durable decisions must be consolidated into living docs;
- generated JSON/CSV/PNG/MD reports must not become architecture.
