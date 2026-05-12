# Ciclo Global 17 — imports duplicados seguros

## Objetivo

Reduzir duplicação óbvia de imports CSS sem alterar visual aprovado e sem transformar páginas em evolução em contratos definitivos.

Este ciclo foca apenas em imports que já são carregados por um manifesto de página. A regra é simples: quando uma página tem um manifesto claro, o HTML não deve repetir diretamente os mesmos componentes que esse manifesto já importa.

## Alteração aplicada

### `resultados.html`

Removidos imports diretos que já são carregados por `assets/css/pages/search-results.css`:

```txt
assets/css/components/layout/doke-layout-system.css
assets/css/components/ui/doke-ui-system.css
assets/css/components/domain/doke-domain-cards.css
assets/css/components/actions/favorite-action.css
assets/css/components/cards/service-card.css
```

Mantidos no HTML:

```txt
assets/css/core/index.css
assets/css/pages/app-shell.css
assets/css/pages/search-results.css
assets/css/components/shell/doke-shell-contract.css
assets/css/components/layout/responsive-page-contract.css
```

Esses dois últimos foram preservados porque não estavam duplicados pelo manifesto da página neste ciclo e fazem parte do contrato de shell/layout usado atualmente.

## Auditoria criada

Novo comando:

```bash
npm run audit:safe-duplicate-imports
```

Arquivo:

```txt
scripts/audit-safe-duplicate-imports.js
```

A auditoria valida páginas com manifestos estáveis e bloqueia imports diretos que já são propriedade do manifesto da página.

## Resultado atual

```txt
Safe duplicate import audit passed.
HTML files audited: 19
Direct duplicate links: 0
Remaining safe duplicate candidates: 0
```

## Regras preservadas

```txt
0 redesign
0 !important novo
0 style="" novo
0 arquivo fix/hotfix/stage/final criado
0 remoção cega de CSS
```

## Próximo passo recomendado

Ciclo Global 18 — primeira redução controlada de `!important`, começando por arquivos de ownership já estabilizados e evitando páginas provisórias.
