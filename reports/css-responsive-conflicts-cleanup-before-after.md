# Doke — Conflitos CSS responsivos: relatório e limpeza conservadora

## Resumo antes/depois

| Métrica | Antes | Depois | Diferença |
|---|---:|---:|---:|
| Arquivos CSS varridos | 409 | 409 | 0 |
| Definições nas classes alvo | 16292 | 16284 | -8 |
| Pares classe/propriedade conflitantes | 333 | 333 | 0 |

## Limpeza de baixo risco aplicada

- `assets/css/pages/home-desktop-rail-parity.css`: removida a posse de `width/max-width/inline-size` do workspace da home; essa responsabilidade ficou no contrato canônico `assets/css/components/shell/shared-page-width-contract.css`.
- `assets/css/pages/perfil-header-rail-parity.css`: substituído rail fixo `min(529px, calc(100vw - 36px))` por `var(--doke-shared-page-width)`.
- `assets/css/pages/app-shell-polish.css`: removidas largura e padding inline duplicados de `.shell-home__workspace--clean`; mantido apenas espaçamento vertical específico da home.
- `assets/css/pages/desktop-cleanup.css`: removida regra vencida `width: 100%` de `.shell-home__workspace`; largura agora vem do contrato compartilhado.

## Por classe

| Classe | Def. antes | Def. depois | Δ def. | Conflitos antes | Conflitos depois | Δ conflitos | Canônico |
|---|---:|---:|---:|---:|---:|---:|---|
| `.app-header` | 3612 | 3612 | 0 | 49 | 49 | 0 | `assets/css/components/shell/app-header-canonical-contract.css` |
| `.app-header__inner` | 500 | 500 | 0 | 15 | 15 | 0 | `assets/css/components/shell/app-header-canonical-contract.css` |
| `.home-side-meta__profile` | 993 | 993 | 0 | 24 | 24 | 0 | `assets/css/components/shell/app-header-canonical-contract.css` |
| `.home-side-meta__location` | 510 | 510 | 0 | 24 | 24 | 0 | `assets/css/components/shell/app-header-canonical-contract.css` |
| `.publication-card` | 1242 | 1242 | 0 | 33 | 33 | 0 | `assets/css/components/cards/publication-card.css + assets/css/components/cards/marketplace-card-contract.css` |
| `.doke-ad-card` | 1718 | 1718 | 0 | 42 | 42 | 0 | `assets/css/components/cards/ad-card.css + assets/css/components/cards/marketplace-card-contract.css` |
| `.video-card` | 1804 | 1804 | 0 | 32 | 32 | 0 | `assets/css/components/cards/worker-card.css + assets/css/components/cards/marketplace-card-contract.css` |
| `.service-card` | 3112 | 3112 | 0 | 40 | 40 | 0 | `assets/css/components/cards/service-card.css + assets/css/components/cards/marketplace-card-contract.css` |
| `.doke-reviews-panel` | 45 | 45 | 0 | 8 | 8 | 0 | `assets/css/components/cards/review-card.css ou assets/css/patterns/reviews-section.css se for composição de seção` |
| `.page__content-inner` | 1340 | 1336 | -4 | 22 | 22 | 0 | `assets/css/components/shell/shared-page-width-contract.css` |
| `.shell-home__workspace` | 802 | 798 | -4 | 21 | 21 | 0 | `assets/css/components/shell/shared-page-width-contract.css` |
| `.ad-detail-shell` | 217 | 217 | 0 | 8 | 8 | 0 | `assets/css/components/shell/shared-page-width-contract.css` |
| `.profile-shell-content` | 397 | 397 | 0 | 15 | 15 | 0 | `assets/css/components/shell/shared-page-width-contract.css` |

## Arquivos reduzidos pela limpeza

| Arquivo | Def. antes | Def. depois | Δ |
|---|---:|---:|---:|
| `assets/css/pages/app-shell-polish.css` | 14 | 8 | -6 |
| `assets/css/pages/desktop-cleanup.css` | 2 | 0 | -2 |

## Interpretação técnica

A limpeza foi deliberadamente conservadora: ela removeu apenas duplicações claramente vencidas de rail/workspace ou substituiu medidas locais por token global. O total de pares conflitantes não caiu porque ainda existem conflitos estruturais reais em headers, cards e shells antigos. Esses pontos exigem uma etapa separada de migração, não remoção agressiva em massa.