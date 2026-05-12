# Ciclo Global 42 — ordem de scripts globais/data-ready

## Objetivo

Criar uma barreira de auditoria para impedir regressões na ordem de carregamento dos scripts globais, especialmente agora que o Doke está sendo preparado para dados reais, mocks, repositories, controllers e renderização dinâmica.

Este ciclo não altera visual, CSS, HTML de página, shell, sidebar, header ou wrappers globais.

## O que foi adicionado

- `scripts/audit-global-script-order.js`
- comando `npm run audit:global-script-order`
- relatório JSON em `docs/validation/global-cycle-42-script-order-report.json`

## O que a auditoria valida

Para páginas que usam o pipeline de controllers, valida a ordem mínima:

1. `controller-data.js`
2. `dom.js`
3. `events.js`
4. `view-state.js`
5. `page-bootstrap.js`
6. `page-controller-registry.js`
7. controller específico da página
8. `controller-bootstrap.js`

Também valida:

- scripts referenciados existem;
- `domain-data-service.js` vem depois dos serviços de domínio quando ambos são carregados;
- páginas que já carregarem a cadeia data-ready respeitam a ordem: mock boundary → repository boundary → provider → orchestrator → list-state → page data controller.

## Decisão técnica

A auditoria apenas bloqueia problemas objetivos de ordem/arquivo ausente. Páginas relevantes que ainda não carregam a cadeia data-ready são registradas como notas, não como erro, porque a migração será progressiva.

## Critérios de aceite

- Nenhuma alteração visual.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final` ou `novo` criado.
- Auditoria `npm run audit:global-script-order` executa com sucesso.
