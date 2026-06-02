# Mapa de autoridade CSS

Este documento define onde cada responsabilidade deve viver. Ele substitui decisões espalhadas em documentos de fase quando houver conflito.

## Core

Responsável por:

- tokens;
- reset;
- tipografia;
- layout base;
- utilitários genéricos.

Não deve conter regras específicas de `index`, `perfil`, `mensagens`, `pedidos` ou cards específicos.

## Shell / rail / header

Responsável por:

- `.app-shell`, `.sidebar`, `.page`, `.page__content`;
- largura compartilhada;
- alinhamento entre header e conteúdo;
- scroll global;
- mobile shell e topbar.

Variáveis preferenciais:

```txt
--doke-shared-page-width
--doke-desktop-page-available
--doke-current-page-rail
--doke-desktop-page-max
```

## Components

Responsável por anatomia e estados internos de:

- cards;
- botões;
- inputs;
- modais;
- dropdowns;
- tabs;
- avatars.

Exemplo: `marketplace-card-contract.css` controla a anatomia do card; a página apenas define contexto/tokens.

## Patterns

Responsável por composições reutilizáveis:

- horizontal rails;
- feeds;
- listas;
- seções reutilizáveis.

## Pages

Responsável por:

- ordem das seções;
- espaçamento específico;
- quantidade visível por rail;
- contexto mobile/tablet/desktop da página;
- exceções escopadas por `body[data-page="..."]` quando necessárias.

## Regra para `!important`

`!important` é dívida técnica tolerada apenas onde já existe conflito legado. Novos usos exigem justificativa explícita e plano de remoção.
