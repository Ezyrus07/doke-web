# State contracts — Doke

Este contrato define o comportamento mínimo de estados para páginas e componentes que futuramente receberão dados de repositories/services sem acoplar backend ao HTML mockado atual.

## Estados obrigatórios

Toda região dinâmica deve suportar estes estados:

- `idle`: estado inicial antes da primeira operação.
- `loading`: dados ou ação em andamento.
- `empty`: resposta válida sem itens.
- `error`: falha de carregamento, permissão, parse ou renderização.
- `ready`: dados carregados e renderizados.

## Contrato de região de lista

Use `data-list-region` como boundary de uma lista dinâmica. A região deve expor elementos previsíveis para renderers/controladores:

```html
<section data-list-region data-state="idle" aria-busy="false">
  <div data-list></div>
  <div data-list-loading hidden aria-live="polite"></div>
  <div data-list-empty hidden></div>
  <div data-list-error hidden role="alert" aria-live="assertive"></div>
</section>
```

## Acessibilidade

- `aria-busy` deve refletir `loading`.
- `aria-live` deve comunicar carregamento, empty state e erro quando houver mudança relevante.
- Erros devem usar `role="alert"` quando a falha impedir a continuidade da ação.

## Responsabilidade por camada

- Services/repositories retornam dados normalizados ou erro.
- Controllers mudam estado e chamam renderers.
- Renderers escrevem DOM dentro do boundary recebido.
- CSS não deve depender do conteúdo mockado atual para representar estado.

## Proibições

- Não usar `style=""` para alternar estado.
- Não usar `!important` novo para esconder/mostrar estado.
- Não guardar dados sensíveis em estado global.
- Não transformar HTML provisório em contrato definitivo de backend.
