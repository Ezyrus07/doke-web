# CSS Cleanup Stage 37 — detalhe-anuncio.html

## Objetivo

Remover a dependência do detalhe do anúncio de contratos antigos de shell/tablet/mobile e zerar `!important` ativo na cascata da página.

## Arquivos alterados

- `detalhe-anuncio.html`
- `assets/css/pages/detalhe-anuncio.css`

## Ações executadas

1. Removidas importações diretas de contratos antigos e agressivos no `detalhe-anuncio.html`, incluindo shell contract, app-header legado, contratos tablet, mobile shell e guards responsivos antigos.
2. Adicionado `assets/css/layout/header.css` como contrato limpo de header.
3. Mantido `assets/css/pages/detalhe-anuncio.css` como CSS de composição da página.
4. Removido `!important` do CSS específico da página.

## Resultado estático

- CSS ativo transitivo em `detalhe-anuncio.html`: 57
- `!important` ativo em `detalhe-anuncio.html`: 0
- CSS com chaves desbalanceadas: 0

## Risco

Alto risco visual no detalhe do anúncio, principalmente em tablet/mobile, sticky CTA, rails, workers, publicações e avaliações. O objetivo desta etapa é reduzir dependência de prioridade artificial e contratos concorrentes; refinamento visual deve vir depois.
