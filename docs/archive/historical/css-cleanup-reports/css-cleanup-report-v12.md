# CSS cleanup report v12 — Search results split

## Status

- Organização estrutural: 81 / 100
- Risco de regressão visual: médio-baixo
- Risco de CSS duplicado/morto: médio
- Risco de acoplamento entre páginas: médio-baixo

## Alvo

- `assets/css/pages/search-results.css`

## Alteração realizada

O arquivo `search-results.css` foi convertido em manifesto de imports e dividido em módulos menores dentro de `assets/css/pages/search-results/`.

A ordem original da cascata foi preservada para evitar mudança visual perceptível.

## Nova estrutura

```txt
assets/css/pages/search-results.css
assets/css/pages/search-results/
  base-layout.css
  desktop-envelope.css
  responsive-pass.css
  preview-parity.css
  final-parity.css
  compact-services.css
  mobile-polish.css
  mobile-density.css
  mobile-card-contract.css
  workers-desktop-fix.css
  rhythm-refinement.css
  final-normalization.css
```

## Responsabilidades

- `base-layout.css`: estrutura base, workspace, grids, cards e filtros iniciais.
- `desktop-envelope.css`: clamp/envelope desktop e largura canônica.
- `responsive-pass.css`: ajustes tablet/mobile iniciais.
- `preview-parity.css`: paridade visual de workers e antes/depois com os previews da home.
- `final-parity.css`: escala final de cards por modo no desktop.
- `compact-services.css`: compactação dos cards de serviço em resultados.
- `mobile-polish.css`: refinamentos mobile gerais.
- `mobile-density.css`: densidade mobile, usuários em colunas e paridade com index.
- `mobile-card-contract.css`: contrato mobile de cards.
- `workers-desktop-fix.css`: correção desktop de workers.
- `rhythm-refinement.css`: ritmo e espaçamento dos cards.
- `final-normalization.css`: normalização final dos tamanhos no resultado.

## Resultado técnico

Antes:

```txt
search-results.css: ~69 KB monolítico
```

Depois:

```txt
search-results.css: ~1.5 KB manifesto
search-results/*.css: módulos auditáveis por responsabilidade
```

## Observação

Esta etapa não removeu CSS em massa. Ela tornou o arquivo auditável para que a próxima etapa possa identificar duplicações reais entre resultados, home e cards compartilhados.
