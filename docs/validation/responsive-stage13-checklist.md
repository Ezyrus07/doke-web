# Checklist Stage 13 — QA Responsivo

## Páginas prioritárias

- [ ] `index.html`
- [ ] `resultados.html`
- [ ] `perfil.html`
- [ ] `comunidade.html`
- [ ] `comunidade-interna.html`
- [ ] `pedidos.html`
- [ ] `mensagens.html`
- [ ] `notificacoes.html`
- [ ] `carteira.html`
- [ ] `configuracoes.html`
- [ ] `detalhe-anuncio.html`
- [ ] `finalizar-pedido.html`
- [ ] `pagamento.html`
- [ ] `adicionar-cartao.html`
- [ ] `avaliacao.html`
- [ ] `auth/login.html`
- [ ] `auth/cadastro.html`
- [ ] `auth/esqueci-senha.html`

## Breakpoints obrigatórios

- [ ] 320px
- [ ] 342px
- [ ] 360px
- [ ] 375px
- [ ] 390px
- [ ] 414px
- [ ] 768px
- [ ] 1024px
- [ ] 1366px

## Verificações por página

- [ ] Não existe scroll horizontal.
- [ ] Nenhum card invade a lateral da tela.
- [ ] Bottom nav não cobre o último conteúdo.
- [ ] Header/topbar não sobrepõe o conteúdo.
- [ ] Botões principais têm alvo confortável.
- [ ] Modais e overlays cabem na viewport.
- [ ] Inputs não causam zoom visual no mobile.
- [ ] Desktop não foi reduzido por regra mobile.
- [ ] Layout em 1024px não quebra com sidebar/topbar.
- [ ] Página mantém identidade visual do Doke.

## Regra de correção após QA

Corrigir por componente ou por página com escopo controlado. Evitar seletores globais amplos. Quando a correção for mobile, usar `@media (max-width: 760px)` ou uma classe de shell mobile existente.
