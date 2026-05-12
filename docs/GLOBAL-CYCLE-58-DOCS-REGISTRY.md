# Ciclo Global 58 — Registro e organização da documentação

## Objetivo

Organizar a documentação do projeto sem mover ou apagar arquivos históricos neste ciclo.

## O que foi feito

- Criado `docs/README.md` com regra de leitura e governança do diretório.
- Criado `docs/DOCS-REGISTRY.md` como índice operacional dos documentos existentes.
- Criados READMEs para `docs/archive/`, `docs/validation/`, `docs/removals/` e `docs/reports/`.
- Criada auditoria `scripts/audit-docs-registry.js`.
- Adicionado comando `npm run audit:docs-registry`.

## O que não foi feito

- Nenhum documento antigo foi removido.
- Nenhum documento antigo foi movido.
- Nenhum HTML, CSS ou JS de produto foi alterado.
- Nenhum visual foi alterado.

## Decisão técnica

A documentação atual mistura contratos ativos, relatórios de ciclo, validações e histórico. Mover tudo de uma vez seria arriscado porque alguns documentos ainda podem estar referenciados por scripts, auditorias ou contexto do projeto.

Este ciclo cria um índice e uma regra de organização antes da limpeza física.

## Validação

```bash
npm run audit:docs-registry
```

## Próximo passo recomendado

Ciclo Global 59 — classificar documentação ativa x histórica e preparar uma primeira migração controlada para `docs/archive/`, sem alterar código de produto.
