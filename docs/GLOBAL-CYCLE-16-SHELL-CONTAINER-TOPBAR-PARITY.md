# Ciclo Global 16 — Shell, Container e Topbar Parity
## Objetivo
Mapear a paridade de shell, largura, container e topbar por página antes de aplicar correções visuais. Este ciclo não redesenha páginas e não consolida visual provisório.
## Resultado da auditoria
- HTMLs auditados: 21
- Páginas estáveis verificadas: 7
- Problemas bloqueantes em páginas estáveis: 0
- Páginas em evolução verificadas: 8
- Achados registrados em páginas em evolução: 16

## Páginas estáveis protegidas
Estas páginas já passam no contrato mínimo de shell/container/topbar e devem ser tratadas com mais cautela para não quebrar baseline visual:
- `comunidade.html`
- `index.html`
- `mensagens.html`
- `notificacoes.html`
- `pedidos.html`
- `perfil.html`
- `resultados.html`

## Páginas em evolução
Estas páginas ainda serão redesenhadas ou ajustadas com mais força. Por isso, os achados são registrados como mapa técnico, não como falha bloqueante neste ciclo.

### `adicionar-cartao.html`
- a página em evolução ainda não usa `body.doke-app-shell-page`
- a página em evolução ainda não carrega `responsive-boundary.css` pela árvore de CSS
- a página em evolução ainda não carrega `desktop-base-stability.css` pela árvore de CSS

### `avaliacao.html`
- a página em evolução ainda não usa `body.doke-app-shell-page`
- a página em evolução ainda não carrega `responsive-boundary.css` pela árvore de CSS
- a página em evolução ainda não carrega `desktop-base-stability.css` pela árvore de CSS

### `carteira.html`
- Sem achados relevantes neste contrato.

### `comunidade-interna.html`
- Sem achados relevantes neste contrato.

### `configuracoes.html`
- Sem achados relevantes neste contrato.

### `detalhe-anuncio.html`
- a página em evolução ainda não usa `body.doke-app-shell-page`
- a página em evolução ainda não usa `.page__content-inner` de forma consistente
- a página em evolução ainda não carrega `responsive-boundary.css` pela árvore de CSS
- a página em evolução ainda não carrega `desktop-base-stability.css` pela árvore de CSS

### `finalizar-pedido.html`
- a página em evolução ainda não usa `body.doke-app-shell-page`
- a página em evolução ainda não carrega `responsive-boundary.css` pela árvore de CSS
- a página em evolução ainda não carrega `desktop-base-stability.css` pela árvore de CSS

### `pagamento.html`
- a página em evolução ainda não usa `body.doke-app-shell-page`
- a página em evolução ainda não carrega `responsive-boundary.css` pela árvore de CSS
- a página em evolução ainda não carrega `desktop-base-stability.css` pela árvore de CSS

## Decisão técnica
- Não aplicar correções visuais automáticas nas páginas em evolução.
- Usar o relatório para corrigir largura/topbar/container quando cada página entrar em ciclo próprio.
- Manter `index.html`, `resultados.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `comunidade.html` e `notificacoes.html` como páginas estáveis de referência.
- Evitar criar novo CSS local para resolver diferença de header/largura. Primeiro checar se a página está fora do contrato global.

## Arquivos criados/alterados
- `scripts/audit-shell-container-topbar-parity.js`
- `package.json`
- `docs/GLOBAL-CYCLE-16-SHELL-CONTAINER-TOPBAR-PARITY.md`
- `docs/validation/global-cycle-16-shell-container-topbar-parity-report.json`

## Validações executadas
- `npm run audit:desktop-base`
- `npm run audit:desktop-shell`
- `npm run audit:shell-container-topbar-parity`
