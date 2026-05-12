# Page Data Orchestration Map — Doke

## Objetivo

Mapear como cada HTML deve evoluir de conteúdo estático/mockado para dados reais, sem acoplar cards, listas, galerias e estados visuais diretamente ao backend.

## Resumo

- HTMLs mapeados: 19
- Páginas estáveis/operacionais: 10
- Páginas em evolução: 9
- Páginas com controller dedicado: 10
- Páginas com JS em assets/js/pages: 12

## Contrato criado

- `assets/js/services/page-data-orchestrator.js` centraliza o plano de dados por página.
- Ele usa `Doke.repositoryBoundary.getPageData()` quando a página estiver pronta para consumir dados.
- Ele não manipula DOM, não busca dados diretamente e não conhece Supabase/Firebase.

## Mapa por HTML

| HTML | Status | Scripts | Controller | Page JS | Data hooks | Recomendação |
|---|---:|---:|---:|---:|---:|---|
| `adicionar-cartao.html` | evolving | 4 | não | não | 3 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `auth/cadastro.html` | stable-or-operational | 4 | não | não | 11 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `auth/esqueci-senha.html` | stable-or-operational | 4 | não | não | 8 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `auth/login.html` | stable-or-operational | 4 | sim | não | 4 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `avaliacao.html` | evolving | 4 | não | sim | 62 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `carteira.html` | evolving | 31 | não | sim | 37 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `comunidade-interna.html` | evolving | 31 | sim | sim | 30 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `comunidade.html` | stable-or-operational | 32 | sim | sim | 143 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `configuracoes.html` | evolving | 33 | sim | sim | 37 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `detalhe-anuncio.html` | evolving | 3 | não | sim | 2 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `finalizar-pedido.html` | evolving | 4 | não | sim | 23 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `index.html` | stable-or-operational | 43 | sim | não | 184 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `mensagens.html` | stable-or-operational | 33 | sim | sim | 74 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `notificacoes.html` | stable-or-operational | 32 | sim | sim | 97 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `pagamento.html` | evolving | 4 | não | sim | 48 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `pedidos.html` | stable-or-operational | 47 | sim | sim | 134 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `perfil.html` | stable-or-operational | 38 | sim | sim | 150 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |
| `resultados.html` | evolving | 36 | sim | não | 78 | prepare structure/data hooks, but do not freeze provisional visual as a global contract |
| `teste.html` | stable-or-operational | 0 | não | não | 0 | prefer controller/page orchestration through repository boundary before adding new static mock blocks |

## Próxima regra

Ao mexer em qualquer página daqui para frente, identificar primeiro se o bloco será dinâmico. Se for lista/card/galeria/avaliação, usar `data-*` hooks previsíveis e preparar estado `loading`, `empty`, `error` e `ready`.

## Próximos passos recomendados

1. Conectar primeiro uma página de baixo risco ao boundary de dados, sem mudar visual.
2. Priorizar listas de marketplace: serviços, workers, publicações e avaliações.
3. Não congelar visual provisório de páginas em evolução como contrato global.
