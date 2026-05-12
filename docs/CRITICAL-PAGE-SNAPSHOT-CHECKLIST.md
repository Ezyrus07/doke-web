# Ciclo Global 53 — Checklist de snapshot visual das páginas críticas

Este checklist deve ser usado antes de remover CSS sensível, reduzir `!important` em blocos de layout ou alterar cards/shell/header/topbar nas páginas críticas.

## Escopo

- Fonte: `docs/validation/global-cycle-52-critical-page-baseline-report.json`
- Páginas: **3**
- Viewports obrigatórios por página: **4**
- Snapshots por rodada: **12**
- Snapshots antes/depois por mudança sensível: **24**

## Viewports obrigatórios

| Nome | Largura | Altura | Obrigatório |
|---|---:|---:|---|
| desktop-wide | 1440px | 1100px | sim |
| desktop-standard | 1280px | 900px | sim |
| tablet | 834px | 1112px | sim |
| mobile | 390px | 844px | sim |

## index.html

Rota sugerida: `/index.html`

### Áreas protegidas

- shell/sidebar/topbar
- hero/search area
- featured service cards
- workers rail
- publication cards
- more services grid
- mobile width rhythm

### Checklist específico

- [ ] sidebar/topbar alinhados com o container principal
- [ ] hero/search sem deslocamento lateral
- [ ] cards de anúncio com largura, mídia e CTA preservados
- [ ] Workers rail com cards e setas no eixo correto
- [ ] Publicações com grid/rail sem quebra de altura
- [ ] Mais anúncios mantendo ritmo e espaçamento
- [ ] mobile sem overflow horizontal e com cards no padrão aprovado

### CSS sensíveis que exigem cuidado

- `assets/css/pages/home.css`
- `assets/css/pages/home/index-final-refinement.css`
- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/components/before-after-workers-preview.css`
- `assets/css/core/layout/responsive-shell.css`
- `assets/css/components/domain/doke-domain-cards.css`
- `assets/css/pages/home-search-chrome.css`
- `assets/css/pages/home-sections.css`

## resultados.html

Rota sugerida: `/resultados.html`

### Áreas protegidas

- shell/sidebar/topbar
- search/filter bar
- result service cards
- grid/list rhythm
- favorite actions
- empty/loading states
- mobile filters and card width

### Checklist específico

- [ ] topbar/search/filtros no mesmo eixo do index
- [ ] input de busca igual ao padrão visual aprovado
- [ ] cards de resultado preservando service-card
- [ ] favoritar/ações com tamanho e posição corretos
- [ ] grid/lista sem mudança de largura entre seções
- [ ] mobile com filtros e cards sem cortes laterais
- [ ] estado empty/loading sem quebrar altura da página

### CSS sensíveis que exigem cuidado

- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/pages/search-results.css`
- `assets/css/components/before-after-workers-preview.css`
- `assets/css/core/layout/responsive-shell.css`
- `assets/css/components/domain/doke-domain-cards.css`
- `assets/css/components/shell/mobile-app-shell.css`
- `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css`
- `assets/css/components/before-after-workers-preview/workers-mobile-fullscreen-contract.css`

## perfil.html

Rota sugerida: `/perfil.html`

### Áreas protegidas

- shell/sidebar/topbar
- profile hero/header
- owner/visitor/client state
- tabs/navigation
- services cards
- workers cards
- publication cards
- reviews/reputation
- mobile profile layout

### Checklist específico

- [ ] hero/capa/avatar preservados por modo owner/visitor/client
- [ ] tabs com ordem e largura corretas
- [ ] seções Serviços/Workers/Publicações/Avaliações sem desalinhamento
- [ ] cards reaproveitando padrão sem regressão visual
- [ ] botões principais sem mudança de padding/altura
- [ ] mobile preservando baseline aprovado do perfil
- [ ] sem reaparecimento de fundos/títulos já removidos em versões anteriores

### CSS sensíveis que exigem cuidado

- `assets/css/pages/perfil-reference-hero.css`
- `assets/css/pages/perfil/mobile-public-profile.css`
- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/components/before-after-workers-preview.css`
- `assets/css/core/layout/responsive-shell.css`
- `assets/css/components/domain/doke-domain-cards.css`
- `assets/css/components/shell/mobile-app-shell.css`
- `assets/css/components/before-after-workers-preview/mobile-comment-sheets.css`


## Regras bloqueantes

- [ ] Header/topbar e conteúdo principal continuam no mesmo eixo visual.
- [ ] Sidebar/shell não foi alterado para resolver problema local.
- [ ] Não existe overflow horizontal em tablet/mobile.
- [ ] Cards, botões, chips, avatars e ratings preservam tamanho/posição.
- [ ] Nenhum `!important` novo foi adicionado.
- [ ] Nenhum `style=""` novo foi adicionado.
- [ ] Nenhum arquivo `fix/hotfix/stage/final/novo/ajuste` foi criado.
- [ ] A alteração foi validada antes/depois em desktop, tablet e mobile.

## Decisão técnica

A partir deste ciclo, qualquer remoção de CSS sensível em `index.html`, `resultados.html` ou `perfil.html` deve passar por este checklist. Se não houver snapshot antes/depois, a alteração deve ficar bloqueada ou restrita a auditoria/documentação.
