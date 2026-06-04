# Stage 61A — Data-ready Frontend Architecture Foundation

Esta stage prepara o frontend estático do Doke para lógica dinâmica futura sem alterar visual, HTML ou CSS.

## Fluxo alvo

```txt
service / adapter -> repository -> controller -> renderer -> DOM
```

## Responsabilidades

- `assets/js/config`: configuração e flags de runtime.
- `assets/js/state`: estado mínimo de página, incluindo loading, empty e error.
- `assets/js/services`: contratos de dados e adapters/mock enquanto não existe API real.
- `assets/js/repositories`: isolamento da fonte de dados usada pelos controllers.
- `assets/js/controllers`: orquestra carregamento, estado e renderização por dependências recebidas.
- `assets/js/renderers`: recebe root/data/state e renderiza DOM sem buscar dados.
- `assets/js/mocks`: dados e delay controlados para desenvolvimento futuro.

## Limite técnico desta stage

Alguns serviços runtime já existiam como scripts clássicos baseados em `window`, por exemplo `auth-service.js`, `wallet-service.js`, `profile-service.js` e `community-service.js`. Eles não foram convertidos para ES module nesta stage para evitar quebra de páginas existentes.

Os repositories novos funcionam como fronteira segura para que a migração futura aconteça de forma gradual.

## Como usar no futuro

Uma página futura deve criar um repository, passar suas dependências para um controller e usar renderers puros. Nenhum renderer deve buscar dados e nenhum controller deve depender de singleton global obrigatório.

## O que esta stage não faz

- Não conecta Supabase, Firebase ou API real.
- Não importa módulos novos nos HTMLs.
- Não altera CSS.
- Não altera shell, router, header ou sidebar.
- Não muda comportamento visual atual.
