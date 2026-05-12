# Ciclo Global 29 — List state contracts

## Objetivo

Criar uma base global para listas dinâmicas suportarem estados de carregamento, vazio, erro e pronto antes da integração com dados reais.

## Arquivos criados/alterados

- `assets/css/components/states/list-states.css`
- `assets/css/core/components.css`
- `assets/js/core/list-state.js`
- `scripts/audit-list-state-contracts.js`
- `docs/LIST-STATE-CONTRACTS.md`
- `docs/validation/global-cycle-29-list-state-contracts-report.json`
- `package.json`

## Critérios de aceite

- contrato CSS importado pelo manifest global;
- helpers JS não buscam dados diretamente;
- suporte a `loading`, `empty`, `error`, `ready`;
- zero `!important` novo;
- zero alteração visual intencional;
- pronto para ser usado em listas de serviços, workers, publicações, avaliações, pedidos, carteira e notificações.
