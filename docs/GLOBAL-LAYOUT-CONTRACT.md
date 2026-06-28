# Contrato global de layout

Este contrato protege shell, sidebar, header, rail, largura e scroll. Essas áreas são sensíveis porque afetam várias páginas ao mesmo tempo.

## Autoridades

### Shell global

Responsável por:

- `.app-shell`
- `.sidebar`
- `.page`
- `.page__content`
- estrutura desktop/tablet/mobile compartilhada
- comportamento de scroll global

Arquivos típicos:

```txt
assets/css/components/shell/
assets/css/pages/app-shell.css
assets/js/core/stable-shell-router.js
```

### Header/topbar

Responsável por:

- alinhamento entre header e conteúdo;
- altura e respiro do topo;
- ações globais;
- search/header quando compartilhados.

Não resolver problema de uma página alterando header global sem provar impacto em todas as páginas principais.

#### Contrato compartilhado do app header

A autoridade ativa da anatomia e geometria compartilhadas de `.app-header` é:

```txt
assets/css/layout/header.css
```

O HTML escolhe conteúdo e variante por hooks declarativos, sem redefinir a anatomia:

```html
<header class="app-header ..." data-app-header data-header-contract="app-header" data-header-variant="standard">
  <div class="app-header__inner" data-header-inner>
    <div data-header-slot="primary">...</div>
    <div data-header-slot="actions">...</div>
  </div>
</header>
```

Variantes permitidas:

| variante | responsabilidade |
| --- | --- |
| `standard` | mantém busca e localização como controles globais fixos, além das ações compartilhadas |
| `contextual` | mantém busca e adiciona exatamente um `[data-header-context]` para voltar, filtros ou ações próprias, sem herdar localização |

Classes `home-side-meta__*` e modificadores como `app-header--home`, `app-header--profile` e `app-header--orders` permanecem temporariamente como compatibilidade visual. Elas não são permissão para criar uma nova anatomia global por página.

Quando um header `contextual` renderiza pílulas de ação compartilhadas (`.page-header-context__action`), o wrapper `[data-header-context]` deve manter também a classe `.page-header-context`. Isso garante que `assets/css/components/internal/page-header.css` continue sendo a autoridade da anatomia das ações, enquanto `assets/css/layout/header.css` controla o encaixe do slot no app header.

A busca permanece disponível nos dois tipos de header. A localização pertence somente ao header `standard`, visualmente equivalente ao `index`; sem endereço salvo, ele exibe o fallback compartilhado `Belo Horizonte, MG`.

Toda página ativa que renderiza `.app-header` deve participar da matriz verificada por `npm run audit:shared-app-header-contract`. Páginas sem header global, como autenticação ou workspaces especializados, não devem receber esse contrato artificialmente.

Exceção ativa aprovada:

| página | motivo |
| --- | --- |
| `comunidade-interna.html` | workspace de conversa em tela inteira, com headers próprios de lista e thread |

### Rail/conteúdo

Variáveis preferenciais:

```txt
--doke-shared-page-width
--doke-desktop-page-available
--doke-current-page-rail
--doke-desktop-page-max
```

Não criar nova variável de largura se uma dessas resolve.

## Proibições

- Não duplicar contrato de largura em CSS de página.
- Não corrigir scroll com JS quando a causa é CSS.
- Não alterar shell para resolver card local.
- Não substituir `body` inteiro no roteador.
- Não usar reload completo para esconder bug de navegação interna.

## Critério de aceite

Toda alteração nessa área exige teste em:

```txt
index.html
perfil.html
pedidos.html
mensagens.html
notificacoes.html
comunidade.html
resultados.html
detalhe-anuncio.html
ajuda.html
```

Viewports mínimos:

```txt
1366x768
820x1180
390x844
```

## Reforma responsiva controlada

A primeira responsabilidade antes de consolidar largura/header/rail é manter o gate de validação alinhado ao protocolo ativo. Nenhuma consolidação global de `.app-shell`, `.page`, `.page__content`, `.page__content-inner`, `.app-header` ou `.app-header__inner` deve avançar sem validar os viewports 1366x768, 1280x802, 820x1180, 608x926 e 390x844 nas páginas prioritárias.

Autoridade primária para largura/eixo das páginas internas:

```txt
assets/css/components/shell/desktop-page-rail-authority.css
assets/css/components/shell/shared-page-width-contract.css
assets/css/layout/header.css
```

Arquivos de página só podem consumir esse contrato ou fazer exceções escopadas por `body[data-page="..."]`, sem redefinir anatomia de cards, header global ou sidebar.

Arquivos antigos em `components/shell` ainda podem consumir tokens ou preservar compatibilidade de páginas não migradas, mas não são autoridade final para a anatomia compartilhada do header.

## Responsive reform Stage 02 — rail alias bridge

`assets/css/components/shell/desktop-page-rail-authority.css` is the active authority for internal desktop/tablet page rails. Stage 02 keeps older shell/header aliases (`--doke-app-shell-max`, `--doke-internal-page-rail`, `--doke-shared-internal-rail`) pointed at the canonical rail tokens instead of letting those older variables keep an independent width contract.

This does not change card anatomy, sidebar visuals, router behavior, or page-specific composition. It only makes existing consumers resolve to the same page rail.

## Responsive reform Stage 03 — header/content rail consumption

`assets/css/components/shell/app-header.css`, `assets/css/components/shell/app-header-canonical-contract.css` and `assets/css/components/shell/doke-shell-contract.css` must consume the canonical rail tokens instead of recalculating their own independent header/content width.

The canonical source remains:

```txt
--doke-header-rail
--doke-current-page-rail
--doke-page-rail
```

Older local formulas are kept only as fallbacks for pages that have not fully loaded the shared rail contract yet. The header outer element owns vertical flow; `.app-header__inner` owns horizontal alignment and must resolve to the same rail used by `.page__content-inner`.
## Responsive reform notes

### Stage 04 — tablet portrait header rail

- `assets/css/components/shell/tablet-internal-rail-contract.css` no longer defines the 768–899px portrait header rail with an isolated hard-coded calculation.
- The tablet internal header now consumes `--doke-current-page-rail` / `--doke-page-rail` and keeps the old `min(calc(100vw - 48px), 760px)` only as fallback.
- Authority remains split correctly: `desktop-page-rail-authority.css` defines the rail tokens; `tablet-internal-rail-contract.css` composes tablet header behavior from those tokens.
### Stage 05 — tablet rail aliases consume the canonical page rail

`assets/css/components/shell/doke-shell-contract.css` still contained several tablet-only `--doke-tablet-rail` definitions with local calculations. Those definitions now consume `--doke-current-page-rail` / `--doke-page-rail` first and keep the old calculation only as fallback. This reduces tablet rail/header/content divergence without changing card anatomy or page-specific composition.
### Stage 06 — large-mobile internal rail fallback

`assets/css/components/shell/tablet-internal-rail-contract.css` still had a 561–760px internal-page rail formula that could bypass the shared page width token. That block now consumes `--doke-shared-page-width` first and keeps the old `min(calc(100vw - gutter), max)` formula only as fallback. This keeps large mobile/compact tablet internal pages aligned with the canonical page rail without changing card anatomy, header markup, sidebar behavior or page-specific layouts.


### Stage 07 — default page containers consume canonical rail

`assets/css/components/shell/page-container-contract.css` no longer lets the default `--doke-page-max-default` container width stand as an independent `1220px` contract when a canonical page rail is already available. The default page/container helper now resolves through `--doke-current-page-rail` / `--doke-page-rail` first and keeps the old shell default only as fallback. Width variants such as `narrow`, `wide` and `fluid` remain explicit opt-ins.


## Stage 08 — Active responsive-page contract consumes canonical rail

`assets/css/components/layout/responsive-page-contract.css` still contained active desktop formulas for `.page__content-inner` and `.app-header__inner` based directly on `--doke-app-shell-gutter` / `--doke-app-shell-max`. Stage 08 keeps those formulas only as fallback and makes the active contract consume `--doke-current-page-rail` and `--doke-page-rail` first, so header and content converge to the same rail authority.


## Stage 09 — Header rail alignment consumes canonical rail

`assets/css/components/shell/header-rail-alignment-contract.css` still had active high-specificity header rules with hard-coded desktop formulas such as `min(calc(100vw - 280px), 1000px)`. Stage 09 keeps those formulas only as fallback and makes the outer header rail consume `--doke-header-rail`, `--doke-current-page-rail` and `--doke-page-rail` first. Header inner rules now resolve through the same canonical page rail before falling back to the older shared width calculation. No new selectors, files, `!important`, card anatomy, JS or HTML changes were introduced.

## Configurações — contrato responsivo fechado

`configuracoes.html` é uma página de workspace de configurações com comportamento responsivo próprio, mas deve consumir o rail/header global sem criar eixo local independente.

Autoridade ativa da composição da página:

```txt
assets/css/pages/settings-workspace-contract.css
assets/css/pages/configuracoes-foundation.css
assets/js/pages/configuracoes.js
```

Contrato aprovado:

- até `1180px`, incluindo tablet vertical e tablet horizontal, a página deve se comportar como lista de opções em uma única coluna;
- até `1180px`, ao selecionar uma opção, a página entra no detalhe da seção ativa e não renderiza o painel abaixo da lista;
- até `1180px`, o detalhe da seção ativa deve oferecer botão de voltar antes do painel, usando o padrão visual compartilhado já adotado em `detalhe-anuncio.html`;
- a partir de `1181px`, o workspace pode usar duas colunas, com menu lateral de configurações e painel ativo à direita;
- o header mobile deve receber o título pelo contrato global do `mobile-app-shell`, sem título duplicado dentro da área principal em mobile;
- a área de conteúdo deve consumir `--doke-page-rail`, `--doke-header-rail` ou aliases canônicos existentes, sem criar gutter local para alinhar por tentativa.

Proibições específicas:

- não importar CSS de `mensagens.html` para simular paridade visual;
- não criar regra local para `.doke-mobile-shell`, `.app-header`, `.page`, `.page__content` ou `.page__content-inner` para corrigir desalinhamento do `configuracoes.html`;
- não reativar o layout de duas colunas em tablet horizontal;
- não renderizar o formulário de `Perfil` abaixo da lista em mobile/tablet.

## Carteira — contrato responsivo fechado

`carteira.html` é uma página financeira operacional. O visual aprovado deve priorizar leitura rápida de saldo, status de repasse, KPIs, movimentações recentes e conta de recebimento, sem voltar ao padrão de hero/landing page.

Autoridade ativa da composição da página:

```txt
carteira.html
assets/css/pages/carteira.css
assets/css/pages/carteira-foundation.css
assets/css/pages/carteira/responsive-contract.css
assets/js/pages/carteira.js
assets/js/ui/mobile-drawer-standard.js
```

Contrato aprovado:

- desktop usa a estrutura operacional canônica: `wallet-hero`, `wallet-kpis`, `wallet-layout`, `wallet-transactions`, `wallet-bank-panel` e `wallet-analytics`;
- mobile e tablet devem usar a mesma estrutura canônica do desktop, adaptada por grid/stack responsivo, sem renderizar blocos mobile legados;
- `Sacar saldo` abre modal com o mesmo padrão visual do modal de cobrança: badge no topo, título grande, botão fechar, campo de valor, resumo e footer de ações;
- `Estatísticas` troca para a view analítica interna com gráficos, não abre modal compacto;
- `Voltar ao extrato` retorna para a visão principal da carteira;
- a view analítica deve manter o padrão desktop em telas menores: cards próprios, gráfico de fluxo financeiro legível, rosca de distribuição sem corte e sem fundo branco gigante atrás de toda a área;
- o drawer mobile/tablet deve exibir `Carteira` como item próprio, com rota agrupada em `carteira.html`;
- o header mobile da carteira deve usar título `Carteira` e ações alinhadas à direita conforme o número real de ações da página;
- os ícones de KPI e movimentação devem ser `stroke-only` ou consumir contrato visual equivalente, sem herdar `fill` preto bruto em mobile/tablet;
- a página deve continuar consumindo os contratos globais de shell/header/rail, sem redefinir sidebar, header global ou page shell para resolver problema local.

Proibições específicas:

- não reativar `wallet-mobile-layout`, `wallet-mobile-balance`, `wallet-mobile-strip` ou `wallet-mobile-metrics`;
- não reativar a seção antiga quebrada de estatísticas dentro do fluxo principal;
- não transformar `Estatísticas` em modal compacto;
- não voltar ao hero gigante com saldo à esquerda e três cards grandes à direita;
- não recriar a barra lateral colorida nos cards de movimentação;
- não esconder a carteira do drawer mobile/tablet nem agrupar `carteira.html` como `perfil.html`;
- não usar CSS de página para alterar `.app-shell`, `.sidebar`, `.page`, `.page__content`, `.page__content-inner` ou anatomia global do `mobile-app-shell`;
- não usar `!important`, inline style ou JS para corrigir problema de layout da carteira.


## Header/sidebar parity contract

A partir do Lote R, todo HTML ativo da raiz deve declarar explicitamente os contratos de shell, sidebar e header:

- `.app-shell[data-shell-contract="app-shell"]`;
- `.sidebar[data-shell-sidebar][data-sidebar-contract="global-sidebar"]`;
- `header.app-header[data-header-contract="app-header"][data-header-variant][data-header-family]`.

`data-header-family` deve ser igual a `data-header-variant`; a família existe para scripts/audits e para futuras medições de estilo computado sem depender de classes específicas de página.

`assets/js/core/app.js` reaplica esses atributos após navegação interna e cria `data-sidebar-scrim` quando a página carregada não trouxer o scrim estaticamente, mantendo o drawer mobile/tablet funcional entre carregamento direto e `DokeNavigate(...)`.

O comando de guarda é:

```bash
npm run audit:header-sidebar-parity-contract
```

Esse gate valida estrutura e ownership. Paridade visual final ainda exige inspeção no navegador, principalmente porque existem contratos históricos de tablet/mobile com `!important` anteriores a este lote.
