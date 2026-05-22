# Mobile/tablet — Home tablet contract v3 — 2026-05-20

## Escopo
Correção dedicada do `index.html` em tablet compacto/largo, sem alterar desktop e sem aplicar mudanças nas demais páginas.

## Problema encontrado
Mesmo após o tablet contract v2, a faixa de `561px–680px` ainda mantinha uma estrutura alta demais para o tablet:

- header com controles demais competindo na mesma linha;
- hero/search com dupla superfície branca e excesso de altura;
- categorias grandes demais;
- destaques começavam tarde demais na dobra;
- havia um bug objetivo no HTML das categorias: abertura duplicada do link de `Encanador`.

## Correções feitas

### CSS
Arquivo alterado:

- `assets/css/pages/home-tablet.css`

Correções:

- compactação do header tablet compacto;
- redução objetiva da altura do hero/search;
- flatten controlado do card interno do hero para remover a dupla superfície alta;
- CTAs continuam lado a lado, porém mais baixos;
- categorias compactadas para tablet;
- setas das categorias reduzidas;
- cards de destaque compactados no tablet compacto para aparecerem antes na dobra.

### HTML
Arquivo alterado:

- `index.html`

Correção objetiva:

- removida abertura duplicada do `<a>` da categoria `Encanador`, que gerava marcação inválida no rail de categorias.

## Critérios de aceite

- `575x767`: header, hero e categorias não devem consumir toda a dobra.
- `608x926`: destaques devem aparecer sem sensação de carrossel quebrado.
- `617x876`: mesma lógica visual do tablet compacto.
- `768x1024`: tablet largo mantém aproveitamento horizontal sem voltar ao desktop completo.
- Sem alteração intencional no desktop.
- Sem alteração intencional em mobile abaixo de `561px`.
