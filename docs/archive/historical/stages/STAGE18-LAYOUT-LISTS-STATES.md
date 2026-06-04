# Stage 18 — Layout, listas, grids e estados canônicos

## Objetivo

A Stage 18 fecha a próxima camada da reforma estrutural: depois do App Shell, UI System e Domain Cards, o projeto passa a ter contratos globais para ritmo de página, seções, grids, listas, rails horizontais e estados de carregamento/vazio/erro.

A regra passa a ser: página controla conteúdo e ordem; o sistema global controla espaçamento, largura, grid/lista e estados reutilizáveis.

## Arquivo criado

```txt
assets/css/components/layout/doke-layout-system.css
```

## Contratos adicionados

```txt
.doke-page
.doke-page-shell
.doke-page-container
.doke-page-stack
.doke-page-section
.doke-section-header
.doke-section-title
.doke-section-description
.doke-grid
.doke-list
.doke-cluster
.doke-split
.doke-scroll-rail
.doke-empty-state
.doke-loading-state
.doke-error-state
```

## Páginas migradas

```txt
index.html
resultados.html
pedidos.html
mensagens.html
comunidade.html
comunidade-interna.html
perfil.html
carteira.html
notificacoes.html
configuracoes.html
```

## Auditoria

Foi criada uma auditoria específica:

```txt
scripts/audit-layout-contracts.js
```

Ela verifica se as páginas principais carregam o contrato global e se possuem contratos mínimos de página, shell e seção.

Resultado atual:

```txt
Layout contracts passed.
```

## Por que isso importa

Sem essa camada, cada HTML ainda poderia criar seu próprio ritmo de página: uma lista com espaçamento diferente, um grid com quebra diferente, uma seção com largura própria ou um empty state visualmente solto.

Com a Stage 18, mudanças futuras como “deixar cards mais compactos”, “reduzir espaçamento das seções” ou “mudar largura máxima mobile/desktop” passam a ser feitas em um contrato único, não página por página.
