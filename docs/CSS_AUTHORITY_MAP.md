# CSS Authority Map — Doke

Este mapa define autoridade antes de novas correções visuais. Ele deve ser usado para evitar cascata, duplicação e remendos.

## Autoridades

| Área | Dono permitido | Proibido em |
|---|---|---|
| Tokens, reset, tipografia base | `assets/css/core` | `pages` |
| Rail/largura global | `core/layout` ou contrato global existente | CSS de página sem escopo |
| Header compartilhado | `assets/css/layout/header.css` | páginas isoladas, `components/shell` e patterns criando anatomia concorrente |
| Shell, sidebar, bottom-nav | `components/shell` / `patterns/navigation` | páginas isoladas |
| Cards de anúncio | `components/cards/ad-card.css` e contrato card compartilhado | `pages/*` alterando anatomia |
| Workers/vídeos | `components/cards/worker-card.css` ou pattern canônico | `pages/home` alterando anatomia |
| Publicações | `components/cards/publication-card.css` | `pages/*` alterando mídia/body/footer |
| Botões | `components/buttons` | CSS por página duplicando estilo |
| Inputs/busca | `components/forms`/`components/search` | CSS local duplicado |
| Modais | `components/modals` | CSS local por modal |
| Layout específico da página | `pages/<page>` | componentes internos |

## Regra de fronteira

CSS de página pode controlar: `display`, `grid-template-columns`, `gap`, `overflow`, `margin-block`, `rail`, `max-width` da composição local.

CSS de página não pode controlar: `height`/`min-height` de mídia interna, `padding` interno, `border-radius`, `box-shadow`, tipografia interna, CTA, tags, badges, footer e avatar de componentes compartilhados.

## Processo obrigatório

1. Encontrar regra vencedora no DevTools/Computed.
2. Classificar a regra como componente, pattern, core ou page.
3. Remover/consolidar conflito antes de adicionar regra nova.
4. Validar primeiro paint, `DOMContentLoaded` e `load`.
5. Registrar riscos e arquivos alterados.

## Contratos visuais desktop em fechamento

Esta seção registra a auditoria entre `index.html`, `resultados.html`, `detalhe-anuncio.html` e `perfil.html`. O relatório completo está em `reports/generated/desktop-visual-authority-audit.md`.

| Componente/padrão | Autoridade correta | Páginas consumidoras | Status | Regra de fronteira |
|---|---|---|---|---|
| Header global | `assets/css/layout/header.css` | todas | compartilhado | páginas não devem redesenhar altura, rail ou ações globais do header |
| Rail/largura desktop | `assets/css/layout/page-rail-authority.css` | todas | compartilhado | páginas só podem definir composição interna após o rail |
| Input grande de busca | `assets/css/components/search/search-bar.css` | `index.html`, `resultados.html` | parcialmente compartilhado | page CSS pode posicionar/medir o slot, mas não reinventar borda, raio, botão ou sombra |
| CTAs da busca | `assets/css/components/search/search-bar.css` | `index.html` | compartilhado inicial | não misturar `doke-search-cta` e `doke-btn` no mesmo elemento |
| Abas/chips de escopo | `assets/css/components/search/search-scope.css` e `assets/css/components/ui/doke-ui-system.css` | `resultados.html` e páginas futuras | compartilhado inicial | tabs locais devem consumir classes compartilhadas antes de criar classes de página |
| Botões genéricos | `assets/css/components/ui/doke-ui-system.css` e `assets/css/components/buttons.css` | múltiplas páginas | parcial | CSS de página não deve redefinir cor, borda, altura, radius, sombra ou tipografia do botão |
| Cards de anúncio/resultado | `assets/css/components/cards/ad-card.css` e `assets/css/components/cards/marketplace-card-contract.css` | `index.html`, `resultados.html`, `detalhe-anuncio.html` | parcial | page CSS controla grid/rail; anatomia do card fica em components |
| Hero e cards do perfil | `assets/css/pages/perfil.css` e módulos `pages/perfil/*` | `perfil.html` | page-owned temporário | fechar visualmente antes de extrair para componentes compartilhados |

### Ordem segura para fechar visual

1. Não fazer novo polish solto em `index.html`; home é régua visual.
2. Fechar `resultados.html` consumindo contratos compartilhados já existentes.
3. Fechar `detalhe-anuncio.html` migrando CTAs, reviews e cards relacionados por família.
4. Fechar `perfil.html` antes de extrair hero/tabs/actions para `components` ou `patterns`.
5. Só depois limpar colisões antigas de cards/rails apontadas pelos auditores.

## Home CSS structure gate

`npm run audit:index-css-structure` maps the active CSS reachable from `index.html` before any home CSS consolidation. Use it with `docs/HOME-AUTHORITY-CLASSIFICATION.md` and `reports/generated/index-css-structure-audit.md`.

Current reading from the 2026-06-13 audit:

- `index.html` correctly has a single direct page CSS entry.
- The reachable cascade is still large: 146 CSS files and 4159 parsed rules.
- Home still has significant page-owned visual pressure over shared component families.
- The next cleanup must be family-by-family, not a broad import deletion.

Boundary rule: home page CSS may keep page-specific composition, responsive slot sizing and section order. It must not remain the final visual authority for reusable search, button, card, rail, avatar, overlay, shell or header anatomy.

## Passo estrutural — search/input/actions

Data: 2026-06-13.

Escopo aplicado sem polish visual solto no `index.html`:

- `doke-search-pill--toolbar` agora é o modificador compartilhado para o input grande compacto da home e do topo de `resultados.html` em desktop/tablet.
- `doke-search-cta--compact` mantém a densidade aprovada dos CTAs da busca dentro da autoridade `components/search/search-bar.css`.
- `doke-filter-pill` passou a ser a autoridade visual do botão de filtros ao lado das abas de escopo; `pages/search-results/filter-toggle-density.css` ficou restrito a encaixe e densidade do grid.

Regra de fronteira reforçada: `pages/home-search-chrome.css` e `pages/search-results/index-rail-alignment.css` podem posicionar, medir o slot e organizar o grid, mas não devem redefinir borda, sombra, raio, botão interno ou tipografia do search pill.

Leitura pós-passo via `npm run audit:index-css-structure`:

- CSS alcançáveis pela home: 146.
- `!important` alcançáveis: 1683.
- pressão visual page-owned sobre componentes compartilhados: 1581, reduzida de 1595.

Próxima família recomendada: cards/CTAs de cards, sem alterar novamente o visual congelado da home.

## Passo estrutural — cards/CTAs de cards

Data: 2026-06-13.

Escopo aplicado sem reabrir o polish visual do `index.html`:

- CTAs de `doke-ad-card` agora carregam a mesma semântica compartilhada de botão do baseline: `doke-ad-card__cta doke-btn doke-btn--success`.
- CTAs de `professional-showcase-card` renderizados em resultados agora carregam `professional-showcase-card__cta doke-btn doke-btn--primary`, alinhando a saída dinâmica ao HTML estático aprovado da home.
- `assets/js/pages/search-results.js`, `assets/js/pages/results/index.js`, `assets/js/pages/perfil.js` e os cards relacionados de `detalhe-anuncio.html` passaram a consumir o mesmo contrato de CTA usado pelo `index.html`.
- O novo guard `npm run test:card-cta-contract` bloqueia novas renderizações de card CTA sem as classes compartilhadas.

Regra de fronteira reforçada: cards continuam pertencendo a `assets/css/components/cards/*`; páginas podem organizar grid, rail e quantidade visível, mas não devem criar CTA paralelo para anúncios ou profissionais.

## Passo estrutural — resultados/cards de anúncio desktop

Data: 2026-06-13.

Escopo aplicado sem mexer no visual congelado do `index.html`:

- Os anúncios renderizados por `assets/js/pages/search-results.js` agora entram com o modificador `doke-ad-card--results`.
- A anatomia desktop específica dos cards de anúncio em resultados deixou de ser definida por seletores de página em `assets/css/pages/search-results/filter-toggle-density.css`.
- `assets/css/components/cards/ad-card.css` passou a consumir os tokens `--doke-ad-results-*` para mídia, padding do corpo, gap do footer e largura mínima do CTA.
- `filter-toggle-density.css` continua podendo controlar colunas, gaps e densidade do grid, mas agora só expõe tokens de composição para o componente.
- O novo guard `npm run test:results-card-density-contract` bloqueia regressões em que CSS de página volte a mirar `.doke-ad-card__media`, `.doke-ad-card__body`, `.doke-ad-card__footer` ou `.doke-ad-card__cta`.

Regra de fronteira reforçada: `resultados.html` pode decidir quantas colunas e quanta densidade a listagem precisa ter; a anatomia visual do anúncio continua pertencendo a `components/cards/ad-card.css`.
