# Doke — Pages Map

Este mapa define a função de cada HTML principal e quais camadas CSS ele deve consumir. O objetivo é evitar que páginas recriem componentes globais.

## Contratos globais recomendados

Toda página principal deve preferir estes contratos compartilhados quando aplicável:

```txt
assets/css/core/tokens.css
assets/css/components/shell/app-shell.css
assets/css/components/navigation/header-desktop.css
assets/css/components/navigation/header-mobile.css
assets/css/components/navigation/bottom-nav.css
assets/css/components/actions/action-button.css
assets/css/components/panels/mobile-panel.css
assets/css/components/cards/card-system.css
assets/css/core/responsive-audit.css
```

## index.html

Função: home, busca principal, categorias, recomendações e descoberta.

CSS de página permitido:

```txt
assets/css/pages/home*.css
```

Componentes esperados:

```txt
header desktop/mobile
bottom nav
cards de serviço
botões de ação
painéis de busca/filtro
shell global
```

Atenção: `index.html` é referência visual para header e ritmo geral.

## resultados.html

Função: listagem de resultados e filtros.

CSS de página permitido:

```txt
assets/css/pages/search-results*.css
assets/css/pages/resultados*.css
```

Componentes esperados:

```txt
cards de serviço
painel mobile de filtros
botões de filtro/busca
bottom nav
header
```

Regra: cards de resultado não devem ter contrato visual próprio fora de `card-system.css`.

## pedidos.html

Função: gestão de pedidos, filtros, seleção e agenda.

CSS de página permitido:

```txt
assets/css/pages/pedidos.css
```

Componentes esperados:

```txt
cards de pedido
botões de busca/filtros/selecionar/agenda
painéis mobile
header
bottom nav
```

Atenção: não recriar toolbar mobile local se `action-button.css` já cobre o caso.

## mensagens.html

Função: lista/thread de mensagens.

CSS de página permitido:

```txt
assets/css/pages/mensagens*.css
```

Componentes esperados:

```txt
cards de mensagem
botões de ação
header
bottom nav
painéis contextuais quando houver
```

Regra: cards de mensagem devem herdar base de `doke-card--message`.

## perfil.html

Função: perfil público/privado, avaliações, serviços e informações do usuário.

CSS de página permitido:

```txt
assets/css/pages/perfil*.css
```

Componentes esperados:

```txt
cards de perfil
cards de serviço
modais/painéis de orçamento quando aplicável
header
bottom nav
```

Regra: não recriar visual de avaliação se já existir pattern compartilhável.

## comunidade.html

Função: descoberta/lista de comunidades.

CSS de página permitido:

```txt
assets/css/pages/comunidade*.css
```

Componentes esperados:

```txt
cards de comunidade/perfil
busca mobile
menus de seleção
bottom nav
header
```

Regra: menus mobile devem usar `mobile-panel.css`.

## comunidade-interna.html

Função: área interna da comunidade, feed/chat/conteúdo.

CSS de página permitido:

```txt
assets/css/pages/comunidade-interna*.css
```

Componentes esperados:

```txt
header interno
cards de conteúdo
botões de ação
bottom nav
painéis contextuais
```

Atenção: arquivos com `legacy`, `rescue` ou versões antigas devem ser migrados gradualmente.

## notificacoes.html

Função: lista e filtros de notificações.

CSS de página permitido:

```txt
assets/css/pages/notificacoes*.css
```

Componentes esperados:

```txt
cards/listas de notificação
botões de filtro/seleção
painéis mobile
header
bottom nav
```

Regra: filtros e seleção devem seguir o mesmo contrato de `pedidos.html`.

## configuracoes.html

Função: preferências, conta e opções do usuário.

CSS de página permitido:

```txt
assets/css/pages/configuracoes*.css
```

Componentes esperados:

```txt
header
bottom nav
botões de ação
busca mobile quando houver
cards/linhas de configuração
```

Regra: botões locais devem migrar para `action-button.css` sempre que possível.

## carteira.html

Função: saldo, transações, saques e métodos financeiros.

CSS de página permitido:

```txt
assets/css/pages/carteira.css
```

Componentes esperados:

```txt
cards financeiros
modais/painéis
botões de ação
header
bottom nav
```

Atenção: modais financeiros precisam respeitar viewport e scroll interno.

## detalhe-anuncio.html

Função: detalhe de serviço/anúncio e mídia.

CSS de página permitido:

```txt
assets/css/pages/detalhe-anuncio*.css
```

Componentes esperados:

```txt
cards/mídias
botões de ação
modais/lightboxes
header
bottom nav
```

Regra: previews e lightboxes devem usar contratos de overlay/painel, não CSS local isolado.

## finalizar-pedido.html

Função: fluxo de finalização de pedido.

CSS de página permitido:

```txt
assets/css/pages/finalizar-pedido*.css
```

Componentes esperados:

```txt
cards de resumo
botões de ação
header
bottom nav
```

## pagamento.html

Função: pagamento e estado financeiro do pedido.

CSS de página permitido:

```txt
assets/css/pages/pagamento*.css
```

Componentes esperados:

```txt
cards/resumos
modais/overlays
botões de ação
header
bottom nav
```

## avaliacao.html

Função: avaliação de serviço/pedido.

CSS de página permitido:

```txt
assets/css/pages/avaliacao*.css
```

Componentes esperados:

```txt
card/painel de avaliação
botões de ação
header
bottom nav
```

## adicionar-cartao.html

Função: cadastro/gestão de cartão.

CSS de página permitido:

```txt
assets/css/pages/adicionar-cartao*.css
```

Componentes esperados:

```txt
form controls
cards financeiros
botões de ação
header
bottom nav
```

## Auth

Arquivos:

```txt
auth/login.html
auth/cadastro.html
auth/esqueci-senha.html
```

Função: autenticação.

CSS de página permitido:

```txt
assets/css/pages/auth*.css
```

Componentes esperados:

```txt
cards/formulários
botões
inputs
responsividade base
```

Regra: auth pode ter layout próprio, mas ainda deve usar tokens globais.
