# Mobile Tablet Home Contract v5 — 2026-05-20

## Objetivo
Melhorar o tablet compacto da `index.html` sem redesenhar o desktop e sem alterar outras páginas.

## Problemas atacados
- header tablet com excesso de ações e pouco respiro;
- hero/search com dupla caixa branca e altura exagerada;
- CTAs altos demais para a altura útil do tablet;
- trilho de categorias grande demais;
- primeiros cards relevantes aparecendo tarde demais na dobra.

## Ajustes aplicados
### Header (`561px–680px`)
- compactação de paddings e controls;
- ocultação de dois atalhos secundários no topo do tablet compacto;
- perfil reduzido para avatar + nome curto.

### Hero/search
- colapso da dupla caixa branca em um único módulo visual;
- redução de paddings;
- redução de altura do campo de busca e botões;
- CTAs em grid de 2 colunas mais baixo.

### Categorias
- cards menores e mais densos;
- redução de gaps e setas.

### Destaques
- tentativa de antecipar conteúdo útil no tablet compacto com grid de 2 colunas na área de destaque.

## Arquivos alterados
- `assets/css/pages/home-tablet.css`
- `assets/css/pages/home.css`
