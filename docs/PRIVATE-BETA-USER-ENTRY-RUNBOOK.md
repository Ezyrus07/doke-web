# Private Beta User Entry Runbook — Sprint 133–135

## Objetivo

Definir entrada gradual de usuários reais sem abrir beta público e sem ativar produção por acidente.

## Coortes iniciais

| Coorte | Tamanho | Personas | Objetivo |
|---|---:|---|---|
| internal_admin_smoke | 2 | admin, support | validar suporte/admin e rollback |
| founder_friend_clients | 5 | client | validar busca, orçamento, pedidos e suporte |
| trusted_professionals | 5 | professional | validar perfil, anúncios, KYC e carteira |
| controlled_marketplace_pairing | 10 | client, professional | validar pareamento cliente/profissional |

## Critérios antes de convidar usuários

- mock continua padrão;
- API real só por flag;
- suporte/admin funcional;
- rollback para mock validado;
- canal de feedback definido;
- denúncia/bloqueio disponível em comunidade/publicações;
- pagamento real desativado até staging real aprovar checkout/escrow.

## Comandos

```bash
npm run audit:private-beta-user-entry-plan
npm run validate:private-beta-user-entry-plan:dry-run
npm run validate:private-beta-user-entry-plan
npm run validate:private-beta-user-entry-plan:report
```

## Status esperado

```txt
private_beta_user_entry_plan_ready_for_manual_cohort_selection
```
