# Doke — Plano Global de Organização

## Objetivo

Organizar o projeto sem transformar telas ainda provisórias em contratos definitivos. A prioridade é reduzir regressões, centralizar componentes recorrentes e manter a evolução visual do Doke mais previsível.

## Regra de responsabilidade

- `assets/css/core`: tokens, reset/base, tipografia, layout base, utilitários e fundação responsiva.
- `assets/css/components`: peças reutilizáveis independentes de página, como botões, cards, chips, inputs, avatars, ratings e modais.
- `assets/css/patterns`: composições reutilizáveis maiores, como hero, galeria, painel de CTA e blocos de seção.
- `assets/css/pages`: somente layout e ajustes específicos de um HTML.

## Proibições durante a reforma

- Não criar `fix.css`, `hotfix.css`, `stage.css`, `final.css`, `novo.css`, `ajuste.css` ou equivalentes.
- Não adicionar `!important` como solução visual.
- Não usar `style=""` para corrigir layout.
- Não duplicar CSS de botões, cards, chips, inputs, modais, tabs, workers, publicações ou avaliações.
- Não mexer em `body`, shell, sidebar, header ou wrappers globais para resolver problema local de uma página.

## Páginas em evolução

Estas páginas não devem ser tratadas como contrato visual definitivo ainda:

- `carteira.html`
- `detalhe-anuncio.html`
- `resultados.html`
- `finalizar-pedido.html`
- `pagamento.html`
- `configuracoes.html`
- `comunidade-interna.html`
- `avaliacao.html`
- `adicionar-cartao.html`

Nelas, a prioridade é manter estrutura limpa, imports corretos, classes previsíveis e separação por responsabilidade.

## Ordem de trabalho

1. Segurança global: imports, scripts e auditorias.
2. Layout global: container, largura, shell, topbar, sidebar e responsividade base.
3. Componentes-base: botões, cards, chips, badges, inputs, avatars, ratings, modais e headers de seção.
4. Marketplace: index, resultados, perfil e detalhe do anúncio.
5. Páginas operacionais em evolução.
6. Comunicação/comunidade.
7. Limpeza final: redução de `!important`, remoção de CSS legado, performance e acessibilidade.
