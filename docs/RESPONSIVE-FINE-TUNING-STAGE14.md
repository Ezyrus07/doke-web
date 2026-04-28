# Stage 14 — Correções finas responsivas

## Estratégia

Esta etapa corrige problemas reais página por página, sem repetir o erro do Stage 10. O arquivo novo é mobile/tablet e escopado por `body` class.

## Arquivo criado

- `assets/css/patterns/fine-tuning-stage14.css`

## HTMLs conectados

- `index.html`
- `resultados.html`
- `perfil.html`
- `pedidos.html`
- `comunidade.html`
- `comunidade-interna.html`
- `mensagens.html`
- `notificacoes.html`
- `carteira.html`
- `configuracoes.html`
- `detalhe-anuncio.html`
- `finalizar-pedido.html`
- `pagamento.html`
- `adicionar-cartao.html`
- `avaliacao.html`

## Correções principais

- Esconde topbars desktop em páginas transacionais no mobile.
- Corrige fluxo mobile de `mensagens.html`, evitando lista e conversa espremidas lado a lado.
- Corrige `comunidade-interna.html`, removendo layout de múltiplas colunas no mobile.
- Ajusta galeria e booking de `detalhe-anuncio.html`.
- Estabiliza grids de pedido, pagamento e cartão.
- Reduz risco de overflow horizontal em configurações, carteira, notificações, resultados e perfil.

## Garantia de segurança

- Não há regra desktop global.
- A maior parte das regras está dentro de `@media (max-width: 760px)`.
- Os seletores usam `body.nome-da-pagina` para evitar vazamento para outras áreas.
