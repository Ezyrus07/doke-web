# Tablet home — desktop sem sidebar + header mobile

## Decisão aplicada
A home em tablet passa a seguir a lógica visual do desktop, removendo a sidebar e mantendo o header mobile/tablet.

## Escopo
- Página afetada: `index.html`
- CSS afetado: `assets/css/pages/home-tablet.css`
- Sem alteração de JS.
- Sem alteração de componentes globais.
- Sem alteração de desktop acima de 1024px.
- Sem alteração de mobile abaixo de 561px.

## Contrato responsivo
### 561px–1024px
- Sidebar e bottom-nav ocultos.
- `.page` ocupa 100% da largura.
- Header superior usa estrutura mobile/tablet: menu, busca, localização, ações compactas e perfil.
- Conteúdo mantém densidade de desktop:
  - hero/search largo;
  - CTAs lado a lado;
  - categorias em rail horizontal;
  - destaques em grid.

### 561px–680px
- Header mais compacto.
- Atalhos secundários reduzidos no topo.
- Hero reduzido.
- Categorias menores.
- Destaques em 2 colunas.

### 681px–1024px
- Estrutura desktop-like mais ampla.
- Destaques em 3 colunas.

## Arquivos alterados
- `index.html`
- `assets/css/pages/home-tablet.css`

## Observação
O `home-tablet.css` agora é carregado diretamente no final do `<head>` de `index.html` para assumir prioridade real sobre as camadas antigas da home.
