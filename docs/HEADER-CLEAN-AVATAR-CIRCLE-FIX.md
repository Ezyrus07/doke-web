# Header clean + avatar circle fix

## Objetivo
Corrigir dois vazamentos visuais observados no mobile:

1. Avatares `DK`/iniciais ainda aparecendo como quadrado arredondado no header.
2. Header mobile criando uma faixa/card com fundo e sombra, quando o padrão desejado é header sem fundo próprio.

## Arquivos alterados

- `assets/css/components/navigation/header-mobile.css`
- `assets/css/components/avatar.css`

## Decisões

- Header mobile não deve ter `background`, `box-shadow` nem `backdrop-filter` no container principal.
- Os botões/controles do header podem manter superfície própria quando forem botões de ação.
- Avatar de usuário/perfil/profissional/fallback com iniciais deve ser circular em todos os headers.
- Não foi usado `!important`.

## Validação esperada

- `index.html` mobile: avatar `DK` circular e header sem faixa branca/sombra.
- `pedidos.html` mobile: avatar `DK` circular e header sem fundo próprio.
- Páginas internas mobile: header transparente, mantendo botões de ação visíveis.
