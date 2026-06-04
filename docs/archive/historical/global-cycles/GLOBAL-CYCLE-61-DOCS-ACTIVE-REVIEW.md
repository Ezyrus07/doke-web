# Ciclo Global 61 — Docs active-review

## Objetivo

Classificar a documentação que ainda está em revisão para separar contratos ativos, documentos que continuam ambíguos e candidatos a arquivo histórico.

## Escopo

Este ciclo não altera produto, HTML, CSS ou JS visual. Ele só cria auditoria e relatório de documentação.

## Arquivos criados/alterados

- `package.json`
- `scripts/audit-docs-active-review.js`
- `docs/DOCS-ACTIVE-REVIEW-DECISION-MAP.md`
- `docs/GLOBAL-CYCLE-61-DOCS-ACTIVE-REVIEW.md`
- `docs/validation/global-cycle-61-docs-active-review.json`

## Resultado

A auditoria atual encontrou:

- 224 documentos Markdown analisados fora de `docs/archive`, `docs/validation` e `docs/removals`.
- 34 documentos recomendados para virar/continuar como contrato ativo.
- 48 documentos mantidos em revisão.
- 126 candidatos a arquivo histórico.
- 16 relatórios/índices gerados.

## Decisão técnica

Nenhum documento foi movido ou removido. A próxima etapa segura é consolidar o índice de contratos ativos antes de arquivar documentos históricos.

## Comando

```bash
npm run audit:docs-active-review
```

## Critérios de aceite

- Auditoria executa sem erro.
- Nenhum arquivo de produto é alterado.
- Nenhum documento é removido neste ciclo.
- Documentos ambíguos continuam em revisão.
