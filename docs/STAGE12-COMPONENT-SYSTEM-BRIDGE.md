# Stage 12 — Component System Bridge

Data: 2026-05-01

## Objetivo

Reduzir variações visuais futuras em cards, botões, inputs, filtros, modais, drawers, popovers, badges/chips e avatares sem iniciar ainda a lógica do produto.

A reforma anterior centralizou o chrome mobile no App Shell. Esta etapa cria uma camada de transição para componentes internos que ainda usam classes antigas espalhadas pelas páginas.

## Arquivos adicionados/alterados

- `assets/css/components/ui/doke-legacy-bridge.css`
- `assets/css/components/ui/doke-ui-system.css`
- `scripts/audit-frontend-contracts.js`
- `docs/validation/frontend-contract-audit-report.md`
- HTMLs principais com carregamento da bridge após o UI System

## Contrato

Novos componentes devem usar classes `.doke-*` do `doke-ui-system.css`.

Classes antigas continuam funcionando por compatibilidade, mas passam pela bridge visual para reduzir divergência entre páginas.

## O que a bridge cobre

- Cards: service, worker, order, request, message, notification, profile, wallet, community, settings
- Botões: `button`, wallet, budget, order, service CTA e actions antigas
- Forms: fields, labels, inputs, selects, textareas e composer
- Overlays: modais, drawers, panels, filters e sidepanels
- Badges/chips/pills
- Avatares
- Dropdowns/popovers/drawers de navegação

## Regra importante

`doke-legacy-bridge.css` é temporário. Ele existe para impedir divergência visual enquanto o HTML legado é migrado.

A direção correta é substituir gradualmente classes antigas por componentes canônicos:

- `.doke-btn`
- `.doke-icon-btn`
- `.doke-input`
- `.doke-card`
- `.doke-modal`
- `.doke-drawer`
- `.doke-chip`
- `.doke-avatar`

## Validação

Auditoria atual:

```txt
Críticos: 0
Avisos: 0
```
