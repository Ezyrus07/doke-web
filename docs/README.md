# Documentação do Doke

Este diretório reúne contratos ativos, auditorias, relatórios históricos e validações do projeto Doke.

## Fonte primária

A primeira fonte de consulta para regras atuais é [`docs/ACTIVE-CONTRACTS-INDEX.md`](ACTIVE-CONTRACTS-INDEX.md). Ele define quais documentos ainda funcionam como contratos ativos e evita que relatórios antigos, ciclos de limpeza ou arquivos históricos virem fonte de verdade por acidente.

## Regra principal

A documentação deve ajudar a manter o projeto organizado. Ela não deve virar uma segunda fonte de verdade conflitante com o código. Quando houver dúvida entre um documento histórico e o índice ativo, priorize `ACTIVE-CONTRACTS-INDEX.md` e os contratos explicitamente listados nele.

## Estrutura recomendada

```txt
docs/
  README.md                         visão geral deste diretório
  ACTIVE-CONTRACTS-INDEX.md         fonte primária dos contratos ativos
  DOCS-REGISTRY.md                  índice operacional dos documentos ativos e históricos
  GLOBAL-*.md                       planos e ciclos globais recentes
  *CONTRACT*.md                     contratos técnicos ativos ou históricos
  validation/                       saídas JSON/MD geradas por auditorias
  removals/                         listas de remoção controlada
  reports/                          relatórios auxiliares
  archive/                          documentos antigos preservados como histórico
```

## Tipos de documento

### Contrato ativo
Define regra que o projeto deve seguir agora. Exemplo: layout global, componentes-base, data-ready, boundaries.

### Relatório de ciclo
Registra o que foi feito em um ciclo incremental. Serve como histórico e rastreabilidade.

### Relatório de auditoria
Mostra o estado detectado por scripts. Pode ficar desatualizado quando o código muda.

### Histórico/legado
Documentos com `stage`, `final`, `hotfix`, `fix`, `reference`, `parity`, `normalization`, `redesign` ou versões antigas devem ser tratados como contexto histórico, não contrato atual, salvo quando outro documento ativo disser explicitamente.

## Regra para novos documentos

Novos documentos devem informar:

```txt
Objetivo
Escopo
Arquivos impactados
O que não foi alterado
Validação
Próximo passo recomendado
```

## Fluxo recomendado de consulta

1. Comece por [`ACTIVE-CONTRACTS-INDEX.md`](ACTIVE-CONTRACTS-INDEX.md).
2. Abra apenas os contratos ativos apontados pelo índice para a área da mudança.
3. Use `DOCS-REGISTRY.md` para contexto operacional, classificação e documentos históricos.
4. Use relatórios de ciclo e auditorias como evidência, não como contrato permanente.

## Antes de remover documentos

Não apagar documentação histórica sem checar se algum script, README ou ciclo atual referencia esse arquivo. Preferir arquivar primeiro quando houver dúvida.
