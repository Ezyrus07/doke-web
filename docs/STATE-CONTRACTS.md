# State contracts — Doke

Este contrato define a base mínima para estados de UI em páginas que ainda podem mudar visualmente. Ele não consolida layout, não define responsivo e não substitui a reforma desktop futura.

## Objetivo

Preparar páginas, controllers e renderers para dados reais sem acoplar backend ao HTML mockado atual.

## Estados obrigatórios de listas e regiões dinâmicas

Toda região que renderiza dados externos, mocks ou repositórios deve conseguir representar:

- `idle`: estado inicial antes da busca/renderização.
- `loading`: operação em andamento.
- `empty`: resposta válida sem itens.
- `error`: falha de carregamento ou renderização.
- `ready`: dados carregados e renderizados.

## Contrato de atributos recomendado

Use estes hooks quando uma área for dinâmica:

```html
<section data-list-region data-state="idle" aria-busy="false">
  <div data-list></div>
  <div data-list-loading hidden aria-live="polite"></div>
  <div data-list-empty hidden></div>
  <div data-list-error hidden role="alert"></div>
</section>
```

Para regiões que não são listas, use:

```html
<section data-view-state="idle" aria-busy="false">
  <p data-view-state-message aria-live="polite"></p>
</section>
```

## Regras

- Não usar `style=""` para alternar estados.
- Não usar `!important` novo para esconder/mostrar estados.
- Não acoplar mensagens de erro ao backend definitivo.
- Não tratar HTML/CSS provisório como contrato visual final.
- Manter a semântica acessível: `aria-busy`, `aria-live` e `role="alert"` quando fizer sentido.
- Controllers devem acionar estado; renderers devem renderizar conteúdo; services/repositories devem retornar dados/erro.
