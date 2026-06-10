# CSS Cleanup Stage 42 — configuracoes.html

## Objetivo

Remover a página de configurações da dependência direta de contratos antigos de shell, tablet, mobile, header e rail, alinhando o carregamento à estrutura nova: core + layout + components/patterns necessários + page CSS.

## Alterações

- Atualizado `configuracoes.html`.
- Removidos links diretos para contratos antigos de alta prioridade, incluindo `doke-shell-contract.css`, `mobile-app-shell.css`, `responsive-page-contract.css`, `responsive-priority-contract.css`, `responsive-priority-cards.css`, `tablet-internal-rail-contract.css`, `ipad-safari-scroll.css`, `doke-domain-cards.css`, `doke-layout-system.css`, `page-container-contract.css`, `mobile-base-stability.css` e similares.
- Adicionado `assets/css/layout/header.css` como autoridade limpa de header.
- Mantido `assets/css/pages/configuracoes.css` como dono da composição específica da página.

## Métricas

- CSS direto em `configuracoes.html`: 44 -> 21
- CSS transitivo ativo: 92 -> 72
- `!important` ativo na cascata: 4843 -> 0
- `!important` total em `assets/css`: 10891
- CSS com chaves desbalanceadas: 0

## Risco

Alto risco visual em `configuracoes.html`, especialmente drawer/header mobile, container, espaçamento lateral e superfícies internas. O objetivo desta fase é reduzir cascata artificial, não preservar acabamento pixel-perfect.
