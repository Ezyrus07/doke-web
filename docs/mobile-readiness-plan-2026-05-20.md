# Plano técnico de prontidão mobile — 2026-05-20

## Escopo

Este documento prepara a próxima fase mobile sem implementar layout, sem escrever CSS mobile novo e sem alterar aparência visual. A análise foi feita sobre os HTMLs principais da raiz do projeto e os CSS carregados por eles.

Objetivo técnico: reduzir risco de regressão antes de iniciar mobile, definindo ordem de execução, dependências, conflitos prováveis e critérios mínimos de QA.

---

## Resumo executivo

O projeto já possui CSS responsivo em praticamente todas as páginas principais, mas a base mobile ainda não deve ser tratada como pronta para expansão sem controle. O risco principal não é ausência de media queries; é excesso de camadas, múltiplos breakpoints, uso elevado de `!important` em páginas críticas e recriação local de componentes que já existem em `assets/css/components`.

Conclusão técnica: iniciar mobile diretamente por página, sem padronizar contratos de shell, header, bottom-nav, cards, composer, overlays e chat, tende a criar regressões em cascata. A fase mobile deve começar por páginas internas simples e só depois avançar para páginas densas como `index.html`, `detalhe-anuncio.html`, `perfil.html`, `mensagens.html`, `comunidade-interna.html`, `pedidos.html` e `carteira.html`.

---

## HTMLs principais analisados

- `ajuda.html`
- `anunciar-servico.html`
- `avaliacao-profissional.html`
- `avaliacao.html`
- `carteira.html`
- `comunidade-interna.html`
- `comunidade.html`
- `configuracoes.html`
- `detalhe-anuncio.html`
- `index.html`
- `mensagens.html`
- `notificacoes.html`
- `novidades.html`
- `pagamento-profissional.html`
- `pedidos.html`
- `perfil.html`
- `resultados.html`
- `tornar-profissional.html`

---

## 1. Páginas com CSS mobile e páginas sem CSS mobile

Critério usado: presença de `@media` com `max-width` ou `min-width` em CSS de página carregado pelo HTML. CSS global como `app-shell.css` foi tratado separadamente porque não representa prontidão mobile específica da página.

| Página | Status mobile | CSS responsivo relevante | Observação técnica |
|---|---:|---|---|
| `index.html` | Parcial/alto risco | `home.css`, `home/mobile-feed-rails.css`, `home-desktop-rail-parity.css`, `stable-desktop-rail.css` | Tem responsividade, mas `home.css` é grande e muito agressivo em overrides. Não iniciar mobile por aqui. |
| `pedidos.html` | Parcial/alto risco | `pedidos.css`, `pedidos/mobile-longterm-normalization.css`, `orders-details.css`, `orders-chat.css`, `orders-command-center.css` | Muitos módulos por responsabilidade. Risco de conflito entre agenda, detalhes, chat e command center. |
| `mensagens.html` | Parcial/alto risco | `mensagens/desktop-redesign.css`, `message-boot.css`, `internal-list-pages.css` | Usa CSS de chat pesado e também serve como referência para `comunidade-interna.html`. Padronizar antes de mexer. |
| `comunidade.html` | Parcial/médio risco | `comunidade/mobile-shell.css`, `comunidade/mobile-layout-contract.css`, `internal-list-pages.css` | Boa candidata para mobile depois de congelar shell/list pages. |
| `comunidade-interna.html` | Parcial/alto risco | `comunidade-interna.css`, `mensagens/desktop-redesign.css`, `chat-workspace-contract.css` | Depende do padrão de chat/composer. Não deve evoluir isolada. |
| `notificacoes.html` | Sim/baixo-médio risco | `notificacoes.css`, `internal-list-pages.css` | Página simples; boa candidata inicial após shell/bottom-nav. |
| `carteira.html` | Parcial/alto risco | `carteira.css` | Muita lógica visual de modais/painéis/financeiro. Não começar por ela. |
| `perfil.html` | Parcial/alto risco | `perfil.css`, `perfil-reference-hero.css`, `perfil-publications.css`, `perfil/mobile-public-profile.css`, `perfil/mobile-owner-media-polish.css` | Vários contratos sobrepostos. Precisa congelar hero, publicações, avaliações e modais antes de mobile. |
| `configuracoes.html` | Sim/baixo risco | `configuracoes.css` | Boa página piloto para validar shell interno e navegação mobile. |
| `detalhe-anuncio.html` | Parcial/alto risco | `detalhe-anuncio.css`, `detalhe-anuncio-rail-parity.css` | Página mais perigosa: sticky/rail, orçamento, workers, publicações, avaliações e anúncios semelhantes. |
| `anunciar-servico.html` | Sim/baixo-médio risco | `anunciar-servico.css` | Boa candidata depois de `configuracoes` e `notificacoes`, por ser formulário. |
| `resultados.html` | Sim/médio risco | `search-results.css` | Depende de filtros, cards e listagem. Mobile deve esperar padronização de card/filtro. |
| `ajuda.html` | Sim/baixo risco | `ajuda.css` | Página simples; pode entrar cedo se fizer parte da experiência mobile. |
| `novidades.html` | Sim/baixo risco | `novidades.css` | Página simples; pode entrar cedo. |
| `avaliacao.html` | Sim/médio risco | `post-service.css` | Formulário/avaliação; depende de padrão de inputs, cards e ações. |
| `avaliacao-profissional.html` | Sim/médio risco | `avaliacao-profissional.css` | Tem mobile, mas não deve ser prioridade se o fluxo ainda estiver em evolução. |
| `pagamento-profissional.html` | Sim/médio risco | `pagamento-profissional.css` | Fluxo sensível; só iniciar quando forms e payment cards estiverem padronizados. |
| `tornar-profissional.html` | Sim/baixo-médio risco | `tornar-profissional.css` | Boa candidata após padronização de formulário e shell. |

### Páginas sem CSS mobile específico

Entre os HTMLs principais da raiz, não foi encontrada página totalmente sem CSS responsivo. O problema é outro: há responsividade fragmentada e, em várias páginas, acoplada a arquivos grandes de página.

---

## 2. Breakpoints encontrados no projeto

A base usa muitos breakpoints. Os mais recorrentes nos `@media` são:

| Breakpoint | Frequência aproximada em arquivos CSS | Interpretação |
|---:|---:|---|
| `max-width: 760px` | 178 arquivos/ocorrências por arquivo | Principal corte mobile usado no projeto. Deve ser o breakpoint canônico inicial. |
| `min-width: 761px` | 63 | Par desktop/tablet complementar ao `760px`. Deve ser preservado. |
| `max-width: 1180px` | 59 | Tablet/desktop estreito. Risco de conflitar com desktop 1366 se mal aplicado. |
| `max-width: 1024px` | 52 | Tablet/shell interno. Deve ser tratado como transição, não como mobile final. |
| `max-width: 560px` | 35 | Ajustes de celular menor. |
| `min-width: 1025px` | 35 | Contrato desktop. Não mexer sem validar desktop. |
| `max-width: 640px` | 30 | Mobile médio. |
| `max-width: 420px` | 21 | Celular pequeno. |
| `max-width: 900px` | 21 | Tablet/intermediário. |
| `min-width: 1181px` | 18 | Desktop largo. |
| `max-width: 767px` | 14 | Variante concorrente de mobile; deve ser evitada em novos contratos se `760px` for o padrão. |
| `max-width: 860px` | 14 | Tablet intermediário. |
| `max-width: 1100px` | 13 | Desktop estreito/tablet. |
| `max-width: 360px` | 13 | Celular muito pequeno. |
| `max-width: 380px` | 13 | Celular pequeno. |

### Recomendação de contrato de breakpoint

Não criar novos breakpoints agora. Para a fase mobile, usar como referência:

- **Mobile canônico:** `max-width: 760px`
- **Desktop/tablet positivo:** `min-width: 761px`
- **Tablet/shell:** `max-width: 1024px` / `min-width: 1025px`
- **Desktop estreito:** `max-width: 1180px`
- **Celular pequeno:** `max-width: 420px`, `390px`, `360px` somente quando houver bug real de overflow.

Evitar novos `767px`, `768px`, `820px`, `900px`, `980px`, `1100px`, `1120px`, `1180px`, `1199px`, `1200px`, `1280px`, `1360px` sem justificar por componente. A fragmentação atual já é alta.

---

## 3. Conflitos prováveis entre desktop e mobile

### 3.1 Shell / largura / sidebar

Arquivos envolvidos:

- `assets/css/pages/app-shell.css`
- `assets/css/pages/internal-shell.css`
- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/components/shell/desktop-sidebar.css`
- `assets/css/components/shell/mobile-app-shell.css`
- `assets/css/components/navigation/bottom-nav.css`
- `assets/css/components/navigation/mobile-bottom-nav-system.css`

Risco:

- Páginas internas misturam `app-shell`, `internal-shell`, contratos de shell em components e ajustes locais.
- Qualquer alteração em `body`, `.app-shell`, `.page`, `.page__content`, `.app-sidebar`, `.app-header` ou wrappers globais pode corrigir uma tela e quebrar várias.

Regra para mobile:

- Não resolver overflow local mexendo em shell global.
- Primeiro validar se a página usa `app-shell/sidebar/page/page__content` corretamente.
- Ajustes mobile de shell devem ficar em contrato compartilhado, não em CSS específico de página.

### 3.2 Header desktop vs header mobile

Arquivos/componentes envolvidos:

- `assets/css/components/navigation/app-header.css`
- `assets/css/components/navigation/header-desktop.css`
- `assets/css/components/navigation/header-mobile.css`
- `assets/css/components/navigation/app-mobile-header-contract.css`
- `assets/css/components/navigation/mobile-internal-header.css`
- CSS locais com `header`, `topbar`, `app-header`.

Risco:

- Header aparece recriado em páginas e em componentes.
- No mobile, a tendência é cada página tentar resolver seu próprio topo, gerando desalinhamento, duplicação e bugs de transição.

Regra para mobile:

- Definir um contrato único para header interno mobile antes de ajustar páginas.
- Não alterar altura/posição do header desktop para resolver problema mobile.

### 3.3 Bottom-nav / navegação principal

Arquivos envolvidos:

- `assets/css/components/navigation/bottom-nav.css`
- `assets/css/components/navigation/mobile-bottom-nav.css`
- `assets/css/components/navigation/mobile-bottom-nav-system.css`
- JS de navegação em `assets/js/core`.

Risco:

- Bottom-nav precisa apontar para o mesmo conjunto de páginas principais da sidebar.
- Mobile não pode introduzir destinos diferentes ou rotas que não existem.

Regra para mobile:

- Antes de estilizar, congelar lista oficial de destinos: home, pedidos, mensagens, comunidade, notificações, perfil/carteira/configurações conforme decisão de produto.
- Qualquer diferença entre sidebar e bottom-nav deve ser decisão de IA/UX documentada, não inconsistência acidental.

### 3.4 Cards duplicados

Componentes existentes:

- `assets/css/components/cards/service-card.css`
- `assets/css/components/cards/worker-card.css`
- `assets/css/components/cards/publication-card.css`
- `assets/css/components/cards/review-card.css`
- `assets/css/components/cards/mobile-card-contract.css`
- `assets/css/components/cards/mobile-list-card-system.css`

Páginas com risco:

- `index.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `perfil.html`
- `comunidade.html`
- `pedidos.html`

Risco:

- Cards são recriados em CSS de página, especialmente home, detalhe, perfil, pedidos e comunidade.
- Mobile vai exigir empilhamento, densidade e toque. Se cada página recriar card, o sistema fica impossível de manter.

Regra para mobile:

- Antes de mobile, definir quais cards são componentes: serviço, worker, publicação, avaliação, pedido, comunidade.
- CSS de página deve apenas posicionar cards, não redefinir seu visual base.

### 3.5 Composer / chat / comunidade interna

Componentes e páginas envolvidos:

- `assets/css/components/chat-composer.css`
- `assets/css/components/internal/chat-workspace-contract.css`
- `assets/css/components/internal/chat-workspace.css`
- `assets/css/pages/mensagens/desktop-redesign.css`
- `assets/css/pages/comunidade-interna.css`
- `assets/css/pages/pedidos/orders-chat.css`

Risco:

- `comunidade-interna.html` reaproveita padrões de mensagens, mas ainda tem CSS próprio.
- Composer fixo, listas roláveis e altura de viewport são pontos críticos no mobile.

Regra para mobile:

- Não fazer mobile de `comunidade-interna.html` separado de `mensagens.html`.
- Primeiro padronizar contrato de chat: header, lista, composer fixo, safe area, scroll container e estados vazios.

### 3.6 Modais, drawers e painéis

Componentes existentes:

- `assets/css/components/overlays/modal.css`
- `assets/css/components/overlays/mobile-overlay-system.css`
- `assets/css/components/overlays/mobile-action-surface-contract.css`
- `assets/css/components/overlays/financial-modal-system.css`
- `assets/css/components/panels/mobile-panel.css`
- `assets/css/components/ui-surface/modal-alignment.css`

Páginas com risco:

- `carteira.html`
- `perfil.html`
- `pedidos.html`
- `detalhe-anuncio.html`
- `pagamento-profissional.html`

Risco:

- Se mobile criar modal por página, haverá conflito de z-index, scroll lock, foco, altura e fechamento.

Regra para mobile:

- Definir um contrato único: modal central desktop, bottom sheet mobile, drawer quando for navegação/filtro.
- Não recriar overlay em CSS de página sem necessidade funcional comprovada.

---

## 4. Componentes compartilhados que devem ser padronizados antes do mobile

Prioridade alta:

1. **Shell base**
   - `app-shell`, `sidebar`, `page`, `page__content`, header e limites de largura.
   - Sem isso, cada página vai corrigir mobile mexendo em wrapper global.

2. **Header interno mobile**
   - Título, voltar, ações, busca/filtro, área de toque e estado sticky.
   - Deve servir para pedidos, mensagens, comunidade, notificações, carteira, perfil e configurações.

3. **Bottom-nav**
   - Rotas oficiais, estado ativo, safe area e comportamento com teclado aberto.

4. **Cards principais**
   - Serviço, worker, publicação, avaliação, pedido, comunidade, notificação.
   - Mobile precisa de densidade e consistência. Não aceitar card redesenhado por página.

5. **Composer de chat/postagem**
   - Mensagens e comunidade interna devem usar o mesmo contrato de área fixa.

6. **Filtros e busca**
   - Resultados, pedidos, comunidade, index e notificações precisam de padrão de abrir/fechar.

7. **Modais/painéis/sheets**
   - Carteira, perfil, pedido, orçamento, pagamento e avaliação dependem disso.

8. **Form controls**
   - Inputs, selects, textareas, uploads, campos monetários e validação.
   - Essencial para `anunciar-servico`, `tornar-profissional`, `avaliacao`, `pagamento-profissional` e configurações.

---

## 5. Ordem recomendada para iniciar mobile

A ordem abaixo prioriza baixo risco, valida contratos globais e evita começar pelas páginas mais frágeis.

### Fase 0 — Preparação obrigatória, sem redesign

1. Congelar screenshots desktop já criados como baseline.
2. Definir contrato oficial de breakpoints: `760px`, `761px`, `1024px`, `1025px`, `1180px`.
3. Congelar destinos oficiais de sidebar e bottom-nav.
4. Definir contrato de `app-shell/page/page__content` para mobile.
5. Definir QA mínimo por viewport: 390x844, 430x932, 768x1024 e desktop regressivo 1366x768.

### Fase 1 — Páginas internas simples

1. `configuracoes.html`
2. `notificacoes.html`
3. `ajuda.html`
4. `novidades.html`

Motivo: menor densidade visual e menor número de componentes críticos. Elas validam shell, header interno, listas, bottom-nav e estados básicos.

### Fase 2 — Formulários e fluxos controlados

5. `anunciar-servico.html`
6. `tornar-profissional.html`
7. `avaliacao.html`
8. `avaliacao-profissional.html`
9. `pagamento-profissional.html`

Motivo: validam inputs, botões, uploads, grupos de formulário, estados de erro e teclado mobile.

### Fase 3 — Listagens e discovery

10. `comunidade.html`
11. `resultados.html`
12. `index.html`

Motivo: exigem padronização de cards, filtros, busca, rails e listagens. `index.html` deve entrar depois de `resultados.html` porque é mais sensível para identidade visual e performance.

### Fase 4 — Áreas densas/interativas

13. `pedidos.html`
14. `mensagens.html`
15. `comunidade-interna.html`
16. `carteira.html`
17. `perfil.html`
18. `detalhe-anuncio.html`

Motivo: páginas com maior risco de regressão por chat, composer fixo, sticky, modais, cards densos, publicações, avaliações e painéis.

---

## 6. Riscos por página

| Página | Risco mobile | Motivo | Dependência antes de mexer |
|---|---:|---|---|
| `configuracoes.html` | Baixo | Estrutura interna simples. | Shell/header/bottom-nav. |
| `notificacoes.html` | Baixo-médio | Lista e filtros simples. | List page + cards/notificações. |
| `ajuda.html` | Baixo | Conteúdo estático. | Shell mobile. |
| `novidades.html` | Baixo | Conteúdo/listagem simples. | Shell + cards simples. |
| `anunciar-servico.html` | Médio | Formulário longo. | Form controls + teclado mobile. |
| `tornar-profissional.html` | Médio | Formulário/fluxo. | Form controls + steps. |
| `avaliacao.html` | Médio | Avaliação, campos e ações. | Form controls + rating + cards. |
| `avaliacao-profissional.html` | Médio | Avaliação detalhada e comentários por tópico. | Form controls + rating + perfil avaliado. |
| `pagamento-profissional.html` | Médio | Fluxo sensível. | Form controls + cards de pagamento + modais. |
| `comunidade.html` | Médio | Cards e entrada em comunidade. | Cards comunidade + bottom-nav. |
| `resultados.html` | Médio-alto | Busca, filtros e cards. | Search/filter contract + service cards. |
| `index.html` | Alto | Home concentra rails, busca, cards e feed. | Cards, busca, bottom-nav e performance. |
| `pedidos.html` | Alto | Abas, agenda, detalhes, chat e command center. | Tabs/list/detail/chat. |
| `mensagens.html` | Alto | Chat workspace, composer fixo e scroll. | Chat contract + safe area + keyboard. |
| `comunidade-interna.html` | Alto | Similar a chat/feed, composer fixo. | Mesmo contrato de mensagens. |
| `carteira.html` | Alto | Cards financeiros, modais e painéis. | Overlay/sheet + cards financeiros. |
| `perfil.html` | Alto | Hero, abas, publicações, avaliações, modais. | Profile components + cards + overlays. |
| `detalhe-anuncio.html` | Muito alto | Sticky orçamento, workers, publicações, avaliações, rail e cards. | Service detail contract + cards + sticky/sheet. |

---

## 7. O que não mexer sem aprovação visual

Não alterar sem aprovação explícita:

- Largura global do site no desktop.
- `body`, `.app-shell`, `.page`, `.page__content`, `.app-sidebar`, `.app-header` para resolver bug local de uma página.
- Padrão visual aprovado do header desktop.
- Padrão visual aprovado da sidebar desktop.
- Cards principais de serviço, worker, publicação, avaliação e pedido.
- Área de mensagens/comunidade interna com composer fixo, sem validar contra `mensagens.html`.
- Sticky de orçamento em `detalhe-anuncio.html`.
- Hero do perfil e áreas de avaliações/publicações sem screenshot antes/depois.
- Modais financeiros da carteira sem testar abertura, fechamento, scroll lock e foco.
- Cores, sombras, radius, espaçamentos e densidade por gosto.
- Arquivos globais ou de componentes para corrigir apenas uma página, salvo quando a causa raiz for realmente global.

---

## 8. Recomendações de consolidação antes de mobile

### 8.1 Criar contratos, não remendos

Antes de escrever CSS mobile novo, decidir onde cada responsabilidade mora:

- `core`: tokens, reset, tipografia, layout base e utilitários.
- `components`: botões, inputs, cards, modal, bottom-nav, header, sidebar, avatar, rating.
- `patterns`: composições como chat workspace, perfil público, list page, service detail, payment form.
- `pages`: apenas layout específico e exceções inevitáveis da tela.

### 8.2 Priorizar consolidação por família

Ordem recomendada:

1. Shell/header/sidebar/bottom-nav.
2. Form controls.
3. Cards.
4. Search/filter/action panels.
5. Chat/composer.
6. Modals/sheets/drawers.
7. Perfil/service detail.

### 8.3 Não consolidar tudo de uma vez

A base tem muitos arquivos grandes e muitos `!important`. Uma refatoração ampla antes do mobile tende a quebrar desktop. O caminho seguro é:

1. Escolher uma família de componente.
2. Criar contrato mínimo.
3. Aplicar em uma página piloto.
4. Comparar contra baseline desktop.
5. Só então expandir para outras páginas.

---

## 9. Checklist de QA mobile

### Viewports mínimos

- 390x844 — iPhone comum/compacto.
- 430x932 — iPhone maior.
- 360x800 — Android pequeno quando houver risco de overflow.
- 768x1024 — tablet portrait.
- 1024x768 — tablet landscape.
- 1366x768 — regressão desktop estreito.
- 1920x1080 — regressão desktop amplo.

### QA estrutural

- Página carrega sem tela branca.
- Sem erro relevante no console.
- Sem scroll horizontal em `body`.
- `app-shell`, `sidebar`, `page` e `page__content` preservados.
- Header não sobrepõe conteúdo.
- Bottom-nav não cobre CTA/composer/campo.
- Safe area respeitada em iOS.

### QA de navegação

- Sidebar desktop continua funcional.
- Bottom-nav mobile aponta para rotas existentes.
- Botão voltar funciona quando existir.
- Links internos apontam para HTML existente.
- Rotas JS não chamam página inexistente.

### QA de interação

- Busca abre e fecha.
- Filtro abre e fecha.
- Dropdown abre, fecha e não fica preso atrás de overlay.
- Modal/sheet abre, fecha, trava scroll corretamente e devolve foco.
- Campo aceita input.
- Teclado mobile não cobre campo ativo em formulários e chat.
- Botões principais não geram exceção JS.

### QA de conteúdo

- Cards não cortam texto essencial.
- Avatares continuam circulares onde o padrão exige.
- Badges/verificados não ficam cortados.
- Imagens usam `object-fit` adequado e não distorcem.
- Listas longas mantêm performance aceitável.

### QA de acessibilidade

- Alvos de toque com área mínima razoável.
- Foco visível em navegação por teclado.
- Modais com fechamento claro.
- Inputs com label/placeholder suficiente.
- Contraste não piora em relação ao desktop.

### QA de performance

- Não adicionar CSS mobile duplicado por página se componente já existe.
- Evitar novos `!important`.
- Evitar seletor profundo/acoplado ao HTML mockado.
- Não carregar arquivos mobile pesados em páginas que não usam o componente.
- Validar layout shift em header, cards, imagens e composer.

---

## 10. Critérios de aceite para iniciar implementação mobile

A fase de implementação mobile só deve começar quando estes pontos estiverem aceitos:

- Breakpoints canônicos definidos.
- Lista oficial de rotas da bottom-nav definida.
- Contrato de shell mobile aprovado.
- Contrato de header interno mobile aprovado.
- Contrato de cards principais definido.
- Contrato de modal/sheet/drawer definido.
- Baseline desktop preservado para comparação.
- Primeira página piloto escolhida: recomendação técnica é `configuracoes.html` ou `notificacoes.html`.
- Proibição mantida: sem redesign, sem CSS temporário, sem mexer em wrappers globais para resolver bug local.

---

## Recomendação final

Começar mobile por `configuracoes.html` e `notificacoes.html`, não por `index.html`, `perfil.html`, `detalhe-anuncio.html`, `mensagens.html` ou `comunidade-interna.html`.

O caminho tecnicamente mais seguro é validar primeiro o contrato mobile do shell, header e bottom-nav em páginas simples. Depois disso, avançar para formulários, listagens e, por último, páginas densas com chat, composer, sticky, modais e cards complexos.
