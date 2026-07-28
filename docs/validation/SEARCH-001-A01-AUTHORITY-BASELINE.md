# SEARCH-001 / SEARCH-A01 — BASELINE FROZEN

## Objetivo

Congelar a divisão real de autoridade da busca, descoberta, favoritos, localização, paginação e ranking antes de qualquer alteração funcional.

## Estado observado

### Catálogo de serviços

O catálogo aprovado já pode vir da autoridade remota de serviços. Entretanto, a página de resultados carrega a coleção e executa no navegador:

- busca textual;
- categorias;
- estado, cidade e bairro;
- nota mínima;
- garantia, emergência, online e disponibilidade;
- combinação de resultados exatos e relacionados;
- pontuação heurística por texto, localização e avaliação;
- ordenação;
- limite final de cards.

Não existe endpoint canônico de busca com DTO, cursor, limite máximo ou ordenação server-side.

### Limites atuais

- serviços: 6;
- usuários: 6;
- Workers: 8;
- publicações: 8.

Esses limites são `slice()` executados no navegador e não representam paginação real.

### Usuários, Workers e publicações

Esses modos utilizam pools estáticos declarados em `assets/js/pages/search-data.js`. Portanto, não consultam autoridades canônicas de perfil, mídia ou publicações.

### Histórico e sugestões

O histórico de pesquisa é persistido em `localStorage` pela chave:

`doke.search.history`

As sugestões e opções geográficas também são estáticas no navegador.

### Favoritos

O produto ainda persiste favoritos em `localStorage` por usuário com o prefixo:

`doke.service-favorites.v1:`

O fluxo de detalhe do anúncio lê, escreve e confirma o favorito no próprio navegador. Não existe chamada do produto para `public.favorites`.

## Divergência importante da matriz

A matriz registra `SEARCH-B01` como:

> favorites has RLS disabled.

Essa descrição está desatualizada.

A inspeção read-only de staging confirmou que **a RLS já está habilitada em staging** para `public.favorites`, com três policies owner-scoped:

- `favorites_owner_select`;
- `favorites_owner_insert`;
- `favorites_owner_delete`.

Também foi confirmado:

- `anon` sem `SELECT`;
- `authenticated` com `SELECT`, `INSERT` e `DELETE`;
- zero favoritos persistidos no momento da inspeção;
- nenhuma conta ou dado alterado.

O problema real de `SEARCH-B01` é a falta de ativação dessa autoridade no produto e a permanência do `localStorage` como autoridade executável.

## Autoridades congeladas

| Área | Autoridade atual |
|---|---|
| Catálogo aprovado | Remota quando disponível |
| Filtros de serviços | Navegador |
| Ranking de serviços | Heurística no navegador |
| Paginação | Limite fixo por `slice()` |
| Busca de usuários | Pool estático |
| Busca de Workers | Pool estático |
| Busca de publicações | Pool estático |
| Sugestões | Pool estático |
| Histórico | `localStorage` |
| Favoritos do produto | `localStorage` |
| Schema de favoritos | Supabase com RLS pronta, ainda não utilizado pelo produto |
| Elegibilidade geográfica | Opções estáticas e comparação textual |
| Telemetria de ranking | Ausente |
| Antimanipulação | Ausente |

## Blockers preservados

### SEARCH-B01

Reclassificar de falso problema de RLS para ativação da autoridade remota e retirada da autoridade local de favoritos.

### SEARCH-B02

Criar busca server-side limitada e paginada, com filtros e elegibilidade geográfica determinísticos.

### SEARCH-B03

Definir sinais de ranking, telemetria, monitoramento e controles contra manipulação.

## Segurança operacional

- nenhuma implementação de produto alterada;
- staging não alterado;
- produção não alterada;
- nenhuma conta real alterada;
- nenhum favorito real alterado;
- nenhuma entidade sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PRs anteriores permanecem draft e não mesclados.

## Próximo sublote

`SEARCH-A02`: criar repository/service canônico de favoritos sobre `public.favorites`, retirar `doke.service-favorites.v1` para sessões Supabase e sujeitos UUID, manter apenas fixtures não UUID explicitamente em memória e falhar fechado quando a autoridade remota estiver indisponível.
