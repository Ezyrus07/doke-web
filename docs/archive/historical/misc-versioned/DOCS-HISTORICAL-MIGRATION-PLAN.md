# Plano de migração histórica — Ciclo Global 67

Este documento registra a migração segura executada dos candidatos históricos classificados no registry.

## Objetivo

Separar fisicamente documentação histórica em `docs/archive/historical/`, reduzindo ruído na raiz de `docs/` sem perder rastreabilidade.

## Fonte de verdade preservada

- Fonte primária atual: [`docs/ACTIVE-CONTRACTS-INDEX.md`](ACTIVE-CONTRACTS-INDEX.md).
- Este plano não promove documentos.
- Este plano registra movimentação física controlada, sem remover conteúdo histórico.
- Este plano não altera produto visual, HTML, CSS ou JS de página.

## Regras usadas para executar a migração

1. Validar que cada origem ainda existe.
2. Validar que nenhuma origem aparece no índice primário de contratos ativos.
3. Mover apenas para `docs/archive/historical/`.
4. Atualizar referências internas apenas se necessário para rastreabilidade.
5. Rodar auditoria antes e depois da migração.
6. Não misturar migração documental com refatoração de produto.

## Movimentação executada

| Status | Origem anterior | Destino atual | Motivo |
| --- | --- | --- | --- |
| moved | `docs/CARD-GRID-CONTRACT-STAGE3.md` | `docs/archive/historical/CARD-GRID-CONTRACT-STAGE3.md` | Contrato de stage antigo; revisar antes de qualquer promoção. |
| moved | `docs/FORM-ACTION-CONTRACT-STAGE10.md` | `docs/archive/historical/FORM-ACTION-CONTRACT-STAGE10.md` | Contrato de stage antigo; revisar contra componentes/forms ativos antes de reaproveitar. |
| moved | `docs/GLOBAL-CYCLE-12-DATA-READY-CONTRACTS.md` | `docs/archive/historical/GLOBAL-CYCLE-12-DATA-READY-CONTRACTS.md` | Relatório de ciclo supersedido pelo contrato ativo de data-ready. |
| moved | `docs/GLOBAL-CYCLE-29-LIST-STATE-CONTRACTS.md` | `docs/archive/historical/GLOBAL-CYCLE-29-LIST-STATE-CONTRACTS.md` | Relatório de ciclo; comparar com `LIST-STATE-CONTRACTS.md` antes de reaproveitar. |
| moved | `docs/GLOBAL-CYCLE-30-REPOSITORY-BOUNDARY.md` | `docs/archive/historical/GLOBAL-CYCLE-30-REPOSITORY-BOUNDARY.md` | Relatório de ciclo; comparar com contratos/referências de repository boundary. |
| moved | `docs/OVERLAY-CONTRACT-STAGE9.md` | `docs/archive/historical/OVERLAY-CONTRACT-STAGE9.md` | Contrato de stage antigo; revisar contra contratos ativos de modal/dropdown/overlay. |
| moved | `docs/reports/frontend-stage2-tokens-and-contracts.md` | `docs/archive/historical/reports/frontend-stage2-tokens-and-contracts.md` | Relatório de stage; provável evidência histórica. |
| moved | `docs/reports/frontend-stage3-search-filter-contract.md` | `docs/archive/historical/reports/frontend-stage3-search-filter-contract.md` | Relatório de stage; revisar contra contratos atuais de busca/filtro. |
| moved | `docs/reports/frontend-stage6-chat-contract-important-reduction.md` | `docs/archive/historical/reports/frontend-stage6-chat-contract-important-reduction.md` | Relatório de redução técnica; não contrato ativo. |
| moved | `docs/STAGE17-DOMAIN-CARD-CONTRACTS.md` | `docs/archive/historical/STAGE17-DOMAIN-CARD-CONTRACTS.md` | Stage antigo; revisar contra contratos ativos de cards/componentes. |
| moved | `docs/STAGE18-LAYOUT-LISTS-STATES.md` | `docs/archive/historical/STAGE18-LAYOUT-LISTS-STATES.md` | Stage antigo; revisar contra `GLOBAL-LAYOUT-CONTRACT.md` e `LIST-STATE-CONTRACTS.md`. |
| moved | `docs/STAGE19-PRODUCT-FLOW-CONTRACTS.md` | `docs/archive/historical/STAGE19-PRODUCT-FLOW-CONTRACTS.md` | Stage antigo; revisar antes de qualquer promoção. |
| moved | `docs/STAGE21-BACKEND-DATA-CONTRACTS.md` | `docs/archive/historical/STAGE21-BACKEND-DATA-CONTRACTS.md` | Stage antigo; comparar com `DATA-BACKEND-CONTRACTS.md`. |
| moved | `docs/STAGE26-MOBILE-DESKTOP-BOUNDARY-GUARD.md` | `docs/archive/historical/STAGE26-MOBILE-DESKTOP-BOUNDARY-GUARD.md` | Stage antigo; revisar contra contratos responsivos ativos. |
| moved | `docs/STAGE27-DESKTOP-SHELL-CONTRACTS.md` | `docs/archive/historical/STAGE27-DESKTOP-SHELL-CONTRACTS.md` | Stage antigo; revisar contra contrato ativo de layout/shell. |

## Critérios de aceite deste ciclo

- Migração física executada e auditável.
- Nenhum candidato histórico movido aparece no índice primário.
- Origens antigas não permanecem duplicadas fora de `docs/archive/historical/`.
- Destinos atuais existem dentro de `docs/archive/historical/`.
- Auditoria gera relatório em `docs/validation/`.
