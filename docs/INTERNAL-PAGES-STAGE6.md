# Stage 6 — Internal Pages Responsive Contract

## Escopo

Esta etapa padroniza a fundação responsiva das páginas internas:

- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `carteira.html`
- `configuracoes.html`

## Arquivo criado

```txt
assets/css/patterns/internal-pages-stage6.css
```

## Decisão arquitetural

A correção foi feita como contrato compartilhado de shell interno. A página continua dona do seu conteúdo específico, mas deixa de controlar comportamentos globais como gutter mobile, safe area inferior, sticky mobile header, largura útil e geometria dos botões de cabeçalho.

## O que foi padronizado

- largura máxima e gutter das páginas internas no desktop;
- ocultação consistente da topbar desktop no mobile;
- sticky header mobile compartilhado;
- avatar, título, contador, busca e chips do cabeçalho mobile;
- área segura inferior para evitar conteúdo escondido pelo bottom nav;
- prevenção de overflow horizontal em páginas internas;
- alvos clicáveis mínimos de 42–44px;
- base comum para controles de filtros, seleção e busca.

## O que não foi alterado

- JS de busca, filtros, seleção, agenda, carteira e configurações;
- lógica de drawers, modais ou sidepanels;
- cards específicos de pedidos, mensagens, notificações, carteira ou configurações;
- estrutura HTML dos componentes.

## Critério de aceite

Em mobile entre 320px e 430px:

- nenhuma página interna deve gerar scroll horizontal;
- topbar desktop não deve aparecer junto do header mobile;
- header mobile deve manter alinhamento e botões do mesmo tamanho;
- conteúdo não deve ficar escondido atrás do bottom nav;
- filtros e busca devem abrir dentro da largura útil da tela.
