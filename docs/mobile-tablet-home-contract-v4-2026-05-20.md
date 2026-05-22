# Mobile/Tablet Home Contract v4 — 2026-05-20

## Escopo

Correção dedicada para `index.html` no tablet compacto, principalmente na faixa `561px–680px`.

Não houve alteração em desktop, sidebar global, bottom-nav global, JS ou estrutura HTML de componentes globais.

## Problema corrigido

O tablet compacto ainda estava parecendo um desktop reduzido:

- hero/search alto demais;
- caixa branca excessiva antes das categorias;
- categorias muito grandes;
- conteúdo útil aparecendo tarde demais na dobra;
- header com excesso de ações em larguras como `575px` e `617px`.

## Correção aplicada

Arquivo alterado:

- `assets/css/pages/home-tablet.css`

Também foi atualizado o cache-busting do CSS em:

- `index.html`

### Regras principais

Na faixa `561px–680px`:

- header compactado para 56px;
- topbar reduzida para menu, busca, localização, notificação e avatar;
- identidade textual do perfil ocultada no tablet compacto;
- atalhos extras do topo ocultados para evitar compressão;
- hero/search transformado em bloco compacto, sem shell branco oversized;
- campo de busca com 44px de altura;
- CTAs em duas colunas com 38px de altura;
- categorias compactadas para 66px de altura;
- setas de categorias ocultadas no tablet compacto;
- destaque sobe na dobra, evitando área morta.

## Validação

Validação local via Playwright com interceptação de assets:

- `575x767` — overflow horizontal: 0px;
- `617x876` — overflow horizontal: 0px;
- `768x1024` — overflow horizontal: 0px;
- `390x844` — overflow horizontal: 0px.

## Critérios de aceite

- Tablet compacto não deve exibir hero gigante.
- Em `575x767`, os cards de destaque devem aparecer na primeira dobra.
- Header não deve mostrar todos os atalhos da direita no tablet compacto.
- Desktop não deve ser afetado.
- Mobile abaixo de `561px` não deve ser recontratado por esta correção.
