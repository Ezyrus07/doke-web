# Ciclo Global 30 — Repository Boundary

## Objetivo

Preparar o Doke para dados reais sem acoplar páginas, renderers e componentes diretamente a mocks, Supabase, Firebase ou `fetch`.

## Implementação

Criados:

```txt
assets/js/services/repository-boundary.js
assets/js/services/mock-repository-provider.js
scripts/audit-repository-boundary.js
docs/REPOSITORY-BOUNDARY.md
```

Atualizado:

```txt
package.json
```

## Decisão arquitetural

Este ciclo não troca os dados das páginas ainda. Ele cria a fronteira. A migração deve ser incremental:

```txt
1. manter páginas funcionando como estão
2. criar repositories/providers
3. migrar uma seção por vez para consumir repositoryBoundary
4. substituir mock por backend sem mexer em renderers/cards
```

## Critérios de aceite

```txt
0 alteração visual
0 !important novo
0 style="" novo
repository-boundary sem DOM/storage/fetch/backend direto
mock provider registrado como provider de dados
script de auditoria criado
```

## Próximo ciclo recomendado

Ciclo Global 31 — page data orchestration map: mapear quais páginas já têm controllers/services e quais precisam consumir a fronteira de repository primeiro.
