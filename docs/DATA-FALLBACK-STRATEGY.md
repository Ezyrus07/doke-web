# Data fallback strategy — Doke

Este documento define a estratégia mínima para transição de mocks para backend sem acoplar UI ao formato provisório do HTML atual.

## Ordem de fonte de dados

1. Backend/repository real, quando disponível e autorizado.
2. Repository boundary da página/domínio.
3. Mock data service controlado.
4. Fallback vazio com estado `empty`.
5. Erro normalizado com estado `error`.

## Regra de responsabilidade

- `services` buscam ou normalizam dados.
- `repositories` escondem origem real/mock.
- `controllers` orquestram estado da página.
- `renderers` transformam dados em DOM.
- HTML provisório não deve ser fonte definitiva de verdade.

## Estados obrigatórios de fallback

- Sucesso com itens: `ready`.
- Sucesso sem itens: `empty`.
- Falha de request/parse/permissão: `error`.
- Request em andamento: `loading`.

## Restrições

- Não usar dados sensíveis em estado global.
- Não depender de texto mockado como ID definitivo.
- Não usar `style=""` para fallback visual.
- Não criar controller que escreva direto em muitos seletores sem boundary.
