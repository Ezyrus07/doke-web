# Desktop Phase Entry Contract

## Status

Contrato de entrada para a próxima fase visual desktop. Este documento não declara desktop concluído; ele define condições mínimas para iniciar a validação visual com segurança.

## Critérios de entrada

- Manter `index.html` como baseline aprovado para densidade visual, rails, cards e ritmo.
- Não alterar shell, sidebar, header ou rail global para corrigir componente local sem prova de causa raiz.
- Rodar os gates globais antes de qualquer mudança visual ampla.
- Validar cada alteração em 1366x768, 820x1180 e 390x844 antes de consolidar.

## Guardrails

- Não usar `!important` como primeira solução.
- Não criar CSS universal para apagar variantes legítimas.
- Não remover CSS ativo sem prova de substituição e rollback definido.
- Preservar acessibilidade, áreas de toque e navegação por teclado.

## Próximo uso

Usar este contrato como gate antes de consolidar desktop/header/cards com browser real.

## Fase autorizada

A próxima fase é **desktop-first HTML/CSS reform**. Ela deve corrigir estrutura, densidade e contratos visuais primeiro no desktop aprovado, antes de qualquer expansão responsiva.

Responsive implementation starts only after the desktop version is approved by screenshot, computed style, and direct-load/internal-navigation checks.

## Proibições da fase

- Do not introduce inline styles.
- Do not duplicate reusable CSS/JS.
- Não criar novas autoridades locais para card, botão, modal, header, shell, rail, drawer ou formulário quando já existir owner compartilhado.
- Não iniciar reforma responsiva antes de fechar o contrato desktop da família em andamento.

## Famílias de produto

- Marketplace: `index.html`, `resultados.html`, `perfil.html`, `detalhe-anuncio.html`.
- Operational: `pedidos.html`, `carteira.html`, `pagamento-profissional.html`, `configuracoes.html`, `notificacoes.html`.
- Communication: `mensagens.html`, `comunidade.html`.

## Páginas alvo obrigatórias

- `index.html`
- `resultados.html`
- `perfil.html`
- `detalhe-anuncio.html`
- `pedidos.html`
- `carteira.html`
- `pagamento-profissional.html`
- `configuracoes.html`
- `notificacoes.html`
- `mensagens.html`
- `comunidade.html`
