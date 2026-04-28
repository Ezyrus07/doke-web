# Etapa 8 — HTMLs restantes responsivos

## Escopo

Esta etapa aplica o contrato responsivo nas páginas que ainda não tinham recebido tratamento direto nas etapas anteriores:

- `comunidade-interna.html`
- `detalhe-anuncio.html`
- `finalizar-pedido.html`
- `pagamento.html`
- `adicionar-cartao.html`
- `avaliacao.html`

## Arquivo criado

- `assets/css/patterns/remaining-pages-stage8.css`

## Arquivos HTML atualizados

As páginas acima agora carregam os contratos globais das etapas anteriores:

- `assets/css/core/responsive-foundation.css`
- `assets/css/components/internal/topbar-standard.css`
- `assets/css/components/cards/card-grid-contract.css`
- `assets/css/patterns/internal-pages-stage6.css`
- `assets/css/patterns/remaining-pages-stage8.css`

## Decisões técnicas

1. Não houve alteração de JavaScript.
2. Não houve redesenho isolado de componente.
3. As correções foram concentradas em shell, grid, overflow, safe area e geometria de superfícies.
4. O comportamento desktop foi preservado; os overrides mais fortes ficam abaixo de `900px`, `760px` e `430px`.
5. `comunidade-interna.html` recebeu tratamento específico para impedir colunas rígidas no mobile.
6. `detalhe-anuncio.html` recebeu tratamento para galeria, resumo e aside em coluna única no mobile.
7. Fluxos transacionais (`finalizar-pedido`, `pagamento`, `adicionar-cartao`, `avaliacao`) receberam normalização de cards, botões e grids.

## Próxima etapa recomendada

Executar uma validação visual página por página em mobile real ou Playwright, priorizando:

1. `comunidade-interna.html`
2. `detalhe-anuncio.html`
3. `pagamento.html`
4. `finalizar-pedido.html`
5. `avaliacao.html`
6. `adicionar-cartao.html`

Depois disso, a próxima fase correta é limpar CSS legado duplicado, não criar novos patches visuais.
