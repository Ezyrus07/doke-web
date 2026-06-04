# Ciclo Global 11 — Action/Favorite Ownership

## Objetivo

Separar a responsabilidade de ação/favorito dos cards de serviço e remover a dependência do antigo `service-card-actions.css` como arquivo de correção com `!important`.

## Decisão arquitetural

- `assets/css/components/actions/favorite-action.css` passa a ser o contrato canônico para botões de salvar/favoritar sobre mídia.
- `assets/css/components/cards/service-card.css` mantém responsabilidade de card, mídia, conteúdo e metadados, mas não controla mais o botão de favorito.
- `assets/css/components/cards/service-card-actions.css` fica apenas como entrypoint de compatibilidade para imports antigos, delegando para o contrato canônico.

## Contrato canônico

Classes/aliases suportadas:

```txt
.doke-favorite-button
.service-card__favorite
.doke-ad-card__favorite
.worker-card__favorite
.favorite-button
.heart-button
```

Estados suportados:

```txt
.is-active
[aria-pressed="true"]
[data-state="saved"]
```

## Arquivos alterados

```txt
assets/css/components/actions/favorite-action.css
assets/css/components/cards/service-card-actions.css
assets/css/components/cards/service-card.css
assets/css/pages/home.css
assets/css/pages/home-sections.css
assets/css/pages/home/sections.css
assets/css/pages/perfil.css
assets/css/pages/search-results.css
assets/css/pages/results/index.css
perfil.html
resultados.html
package.json
scripts/audit-action-favorite-ownership.js
docs/validation/global-cycle-11-action-favorite-ownership-report.json
```

## Critérios de aceite

- Nenhum `!important` novo no contrato canônico.
- `service-card.css` não deve definir `.service-card__favorite`.
- Páginas/manifests que usam `service-card.css` também carregam `favorite-action.css`.
- O arquivo legado `service-card-actions.css` não contém regras visuais próprias.
