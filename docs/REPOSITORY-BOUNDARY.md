# Repository Boundary — Doke

Este contrato prepara o Doke para trocar dados mockados por backend real sem reescrever páginas, cards ou renderers.

## Objetivo

Separar quatro responsabilidades:

```txt
UI/renderers = montam HTML e atualizam DOM
pages/controllers = orquestram a tela
repositories = oferecem dados por domínio
providers = sabem de onde os dados vêm: mock, Supabase, Firebase ou API
```

## Arquivos criados

```txt
assets/js/services/repository-boundary.js
assets/js/services/mock-repository-provider.js
```

## Contrato público

`Doke.repositoryBoundary` expõe:

```txt
registerProvider(name, provider)
setProvider(name)
getProvider(name?)
getRegisteredProviders()
list(resourceName, query)
getById(resourceName, id)
getPageData(pageName, context)
createRepository(resourceName)
```

## Regra de responsabilidade

- `repository-boundary.js` não busca dados diretamente.
- `repository-boundary.js` não conhece DOM.
- `repository-boundary.js` não deve acessar Supabase, Firebase, fetch, localStorage ou sessionStorage.
- Providers podem saber a origem dos dados.
- Renderers não devem buscar dados.
- Páginas devem consumir repositories/services, não JSON estático espalhado.

## Provider mock

`mock-repository-provider.js` registra o provider `mock` e usa a camada mock existente quando disponível:

```txt
Doke.mockData.load(resourceName)
```

Isso preserva o projeto atual e cria uma ponte limpa para backend futuro.

## Migração futura

Quando Supabase/Firebase entrar, criar um provider novo:

```txt
assets/js/services/supabase-repository-provider.js
```

Ele deve implementar o mesmo contrato:

```txt
list(resourceName, query)
getById(resourceName, payload)
getPageData(pageName, context)
```

Depois a troca fica concentrada em:

```js
Doke.repositoryBoundary.setProvider('supabase');
```

sem reescrever cards, listas ou páginas inteiras.
