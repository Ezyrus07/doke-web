# Doke — Roadmap de reforma estrutural

## Objetivo
Levar o projeto de um conjunto de HTMLs ajustados individualmente para um sistema de interface com contrato claro, menos duplicação e manutenção previsível.

## Prioridade 1 — Fundação
1. consolidar tokens em `assets/css/core/tokens.css`;
2. manter apenas uma shell oficial (`layout-shell.css`, `layout-topbar.css`, `layout-responsive.css`);
3. usar `ui-kit.html` como catálogo oficial de componentes;
4. migrar componentes grandes e reaproveitáveis para `assets/css/components/` e `assets/js/components/`;
5. documentar qualquer novo componente antes de espalhar variações em páginas.

## Prioridade 2 — Migração das telas-chave
- `index.html`
- `pedidos.html`
- `mensagens.html`
- `detalhe-anuncio.html`
- `perfil.html`
- `resultados.html`

Essas telas definem a maior parte do sistema visual: shell, cards, hero, overlays, busca, galerias e comportamento mobile.

## Prioridade 3 — Consolidação
- `notificacoes.html`
- `pagamento.html`

## Regras operacionais
- nenhum HTML cria sua própria sidebar;
- nenhum overlay deixa o fundo scrollável;
- nenhum input mobile fica abaixo de 16px;
- nenhum card principal ganha variação sem entrar antes no `ui-kit.html`;
- alterações globais precisam acontecer primeiro em `core/` ou `components/`, nunca só em `pages/` quando o problema é sistêmico.
