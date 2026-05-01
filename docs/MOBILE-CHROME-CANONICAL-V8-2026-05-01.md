# Mobile chrome canonical v8

Correção estrutural para o header/search mobile do Doke.

## Decisão

O `resultado.html` agora usa aliases das mesmas classes `home-mobile-hero*` e `home-search-hero*` usadas pelo `index.html`. Isso elimina um segundo contrato visual paralelo para header e input de busca no mobile.

## Correções

- Header do resultado passa a consumir o mesmo contrato visual do index.
- Searchbar do resultado usa as mesmas classes-base da searchbar do index.
- Tabs `Serviços / Usuários / Workers` seguem ocultas no mobile para não funcionarem como um header azul paralelo.
- Overflow horizontal foi travado no shell mobile sem depender de `100dvw`, que pode gerar largura instável em alguns navegadores/devtools.
- Containers principais recebem `max-width: 100%`, `min-width: 0` e overflow-x protegido.

## Critério de aceite

- `index.html` e `resultado.html` devem ter o mesmo topo mobile em 342px, 380px e 427px.
- Não deve haver scroll horizontal da página.
- Carrosséis podem continuar exibindo preview lateral do próximo card, mas a página inteira não pode deslocar para a direita.
