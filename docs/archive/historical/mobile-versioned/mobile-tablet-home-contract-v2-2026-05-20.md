# Mobile/tablet — contrato v2 da home (2026-05-20)

## Escopo

Página afetada: `index.html`.

Arquivos alterados:

- `assets/css/pages/home-tablet.css`
- `docs/mobile-tablet-home-contract-v2-2026-05-20.md`

Não houve alteração de HTML, JS, desktop global, sidebar global, bottom-nav global ou componentes compartilhados.

## Problema corrigido

O tablet da home ainda estava em estado híbrido: parte do comportamento era mobile esticado e parte era tablet/desktop. Isso gerava:

- header comprimido com excesso de ações simultâneas;
- hero/search alto demais para a dobra do tablet;
- categorias grandes demais;
- cards de destaque em trilho horizontal com cortes laterais;
- baixa consistência entre 575px, 617px e 768px.

## Implementação

Foi adicionada uma camada final de contrato em `home-tablet.css` para `561px–1024px`, com ajustes específicos para:

- header tablet compacto;
- hero/search reduzido;
- categorias em rail mais denso;
- destaques em grade real de tablet;
- breakpoint compacto `561px–680px`;
- breakpoint largo `681px–1024px`.

## Decisões técnicas

- Em tablet compacto, os atalhos extras do header são reduzidos para evitar compressão.
- O perfil no tablet compacto mostra apenas avatar para preservar espaço útil.
- Os cards de destaque deixam de ser carrossel horizontal no tablet e passam para grade: 2 colunas no tablet compacto e 3 colunas no tablet largo.
- O desktop acima de 1024px e o mobile abaixo de 561px permanecem fora do escopo.

## Critérios de aceite

- Sem overflow horizontal em 575px, 617px e 768px.
- Tablet não usa mais visual de mobile esticado.
- Header não fica comprimido.
- Hero ocupa menos altura.
- Categorias ficam mais densas.
- Destaques aparecem em grade de tablet, sem corte lateral.
