# Contrato de superfícies

Superfície é qualquer bloco visual reutilizável: card, modal, painel, lista, toolbar, caixa de busca, item de chat, overlay ou container de estado.

## Responsabilidade

Componentes controlam anatomia interna. Páginas controlam contexto, ordem e densidade.

## Cards

Cards devem manter:

- borda consistente;
- raio coerente;
- respiro interno previsível;
- hierarquia entre título, descrição, metadados e ações;
- comportamento responsivo sem overflow horizontal.

## Modais e overlays

Devem manter:

- foco visível;
- fechamento previsível;
- camada visual coerente;
- sem conflito com shell/header/sidebar.

## Listas e estados

Listas devem estar preparadas para:

```txt
loading
empty
error
ready
```

Não acoplar CSS a quantidade fixa de itens mockados.

## Regra para CSS de superfície

Não criar variação visual duplicada se o mesmo resultado pode ser obtido com tokens, modifiers ou composição existente.
