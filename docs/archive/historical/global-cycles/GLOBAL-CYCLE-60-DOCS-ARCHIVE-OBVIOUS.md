# Ciclo Global 60 — migração controlada de documentação histórica óbvia

## Objetivo

Separar documentação histórica óbvia da documentação ativa sem apagar contexto útil e sem mexer em HTML, CSS ou JS de produto.

## Escopo

Este ciclo adiciona scripts para migrar documentos claramente históricos para:

```txt
docs/archive/historical/
```

A migração preserva o caminho relativo original dentro de `docs/`, registra log em `docs/removals/` e mantém os documentos ativos na raiz de `docs/`.

## Comandos

```bash
npm run cleanup:docs-archive-obvious
npm run audit:docs-archive-obvious
```

## O que é considerado histórico óbvio

- relatórios `GLOBAL-CYCLE-*`
- documentos `*-FIX.md`, `*-HOTFIX.md`, `*-FINAL.md`
- documentos `*-STAGE*.md`
- prompts históricos
- relatórios `css-cleanup-report*`
- documentos de parity/normalization/refinement/redesign/rebuild/removal/migration/complete/summary

## O que NÃO é movido automaticamente

- contratos ativos
- guias ativos
- mapas de dados atuais
- documentação de governança
- documentos ambíguos classificados como `needs-review`
- validações em `docs/validation/`
- logs em `docs/removals/`

## Critérios de aceite

- Nenhum arquivo de produto alterado visualmente.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum documento ativo removido da raiz de `docs/`.
- Toda migração registrada em `docs/removals/global-cycle-60-docs-archive-obvious.json`.
