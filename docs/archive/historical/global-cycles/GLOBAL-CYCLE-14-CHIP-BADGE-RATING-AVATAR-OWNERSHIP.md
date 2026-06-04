# Ciclo Global 14 — Chip, Badge, Rating e Avatar Ownership

## Objetivo

Consolidar contratos globais de baixa especificidade para elementos pequenos e recorrentes do Doke:

- chips/status;
- badges/verificação;
- ratings/notas;
- avatars e avatar + meta.

Esses elementos aparecem em home, resultados, perfil, detalhe do anúncio, pedidos, carteira, comunidade, mensagens e notificações. O objetivo deste ciclo não é redesenhar páginas, mas impedir que cada HTML continue criando variações próprias para a mesma coisa.

## Arquivos criados

```txt
assets/css/components/status/chips-badges.css
assets/css/components/rating/rating.css
assets/css/components/identity/avatar.css
```

## Manifest atualizado

```txt
assets/css/core/components.css
```

## Contratos principais

```txt
.doke-chip
.doke-badge
.doke-rating
.doke-avatar
.doke-avatar-meta
```

Também foram incluídos hooks preparados para dados/scripts:

```txt
[data-chip]
[data-badge]
[data-rating]
[data-rating-value]
[data-rating-count]
[data-avatar]
[data-avatar-meta]
```

## Decisão arquitetural

O arquivo legado `assets/css/components/avatar.css` ainda existe e não foi removido neste ciclo, porque contém compatibilidade com muitas páginas antigas e ainda possui regras fortes. A partir de agora, novas implementações devem preferir `.doke-avatar` e `.doke-avatar-meta`.

## Critérios de aceite

- Nenhum `!important` nos contratos novos.
- Nenhum `style=""` novo.
- Nenhuma alteração visual intencional nas páginas.
- Contratos importados pelo manifest global.
- Componentes preparados para dados reais via hooks `data-*`.
