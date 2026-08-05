# UX-SEARCH-001 — máquina de estados, latest-wins e autoridade da busca

## Status

- frente: `UX-IMPLEMENTATION`;
- sublote: `UX-SEARCH-001`;
- branch: `ux/ux-search-001-latest-wins`;
- base empilhada: `ux/ux-cards-001-card-authority`;
- base head: `8e3ff87c0f159a7e989cb5ae06d34194b4472738`;
- issue: `#65`;
- runtime alterado: sim, somente busca em Resultados e autoridade transversal associada;
- Home visual: não alterada;
- ranking e catálogo: não alterados;
- backend, migrations, staging e produção: não acessados;
- merge, ready-for-review e auto-merge: não autorizados.

---

## 1. Objetivo

Consolidar uma autoridade única para:

- intenção de busca;
- geração de requisição;
- concorrência latest-wins;
- descarte de respostas obsoletas;
- paginação ligada à busca atual;
- retry explícito;
- URL canônica;
- estados de loading, vazio, fallback e erro;
- divulgação da autoridade e cobertura de cada escopo;
- eventos sanitizados.

A implementação não altera ranking, consulta server-side, pesos, catálogo, RLS, RPCs ou Edge Functions.

---

## 2. Causa raiz

A surface remota possuía o seguinte comportamento:

```text
if uma requisição está carregando
→ devolver state.inFlight
```

Isso era válido para deduplicar uma paginação idêntica, mas incorreto para uma nova busca inicial.

Sequência possível:

```text
1. usuário pesquisa A;
2. requisição A permanece em andamento;
3. usuário pesquisa B;
4. campo e URL passam a comunicar B;
5. surface devolve a Promise de A;
6. resposta A pode preencher a coleção de B.
```

Também existia equivalência visual entre autoridades diferentes:

```text
services
→ catálogo canônico remoto

users / workers / before-after
→ amostras locais ou editoriais
```

Sem disclosure, a pessoa poderia interpretar todos os modos como cobertura completa da plataforma.

---

## 3. Autoridade criada

```text
Doke.searchExperience
version: 20260804-ux-search-001-v1
contract: search-experience-v1
```

A API pública e seus enums são congelados.

### 3.1 Estados

```text
IDLE
PREPARING
LOADING
PAGINATING
READY
EMPTY
FALLBACK
ERROR
STALE
CANCELLED
```

### 3.2 Operações

```text
INITIAL
PAGINATION
RETRY
```

### 3.3 Modos

```text
SERVICES
USERS
WORKERS
BEFORE_AFTER
```

### 3.4 Autoridades

```text
REMOTE_CATALOG
FIXTURE_CATALOG
LOCAL_EDITORIAL
UNKNOWN
```

### 3.5 Cobertura

```text
CATALOG
CURRENT_ENVIRONMENT
EDITORIAL_SAMPLE
UNKNOWN
```

---

## 4. Intenção normalizada

Cada execução produz uma intent imutável com:

```text
mode
operation
query
filters
cursor
contract
searchFingerprint
pageFingerprint
```

O `searchFingerprint` identifica semanticamente:

```text
mode + query + filtros aplicados
```

O `pageFingerprint` acrescenta:

```text
cursor + operação
```

Esses fingerprints usam hash local não criptográfico e não são mecanismos de segurança. Servem apenas para concorrência, deduplicação e telemetry sem conteúdo bruto.

---

## 5. Latest-wins

Uma nova busca inicial sempre cria uma geração nova.

```text
A loading
→ inicia B
→ generation B substitui A
→ AbortSignal de A é sinalizado
→ somente B permanece aplicável
```

Se A responder depois:

```text
receipt.applied = false
receipt.status = stale
DOM não é alterado
estado atual de B não é substituído
```

O descarte por geração é obrigatório mesmo quando o transporte não consome `AbortSignal`.

### 5.1 Cancelamento cooperativo

O controller fornece `AbortSignal` ao executor. O repository atual não recebe esse signal em sua API pública. Portanto, neste sublote:

- o cancelamento de rede é cooperativo quando suportado pelo executor;
- o descarte de resposta obsoleta é determinístico e independente do transporte;
- nenhuma alteração de backend foi necessária;
- uma evolução futura pode propagar o signal até fetch/RPC sem mudar a semântica desta autoridade.

---

## 6. Paginação

Paginação não pode mudar a busca ativa.

Antes de executar `loadMore`, a autoridade compara:

```text
intent.searchFingerprint
===
currentSearchFingerprint
```

Caso a query, modo ou filtro tenha mudado:

```text
DOKE_SEARCH_CONTEXT_CHANGED
```

A paginação idêntica em andamento pode compartilhar a mesma Promise. Essa deduplicação não se aplica a novas buscas iniciais.

Regras:

- cursor não entra na URL reproduzível;
- itens anteriores são preservados em erro de próxima página;
- resposta de geração antiga não é anexada;
- ranking e ordem recebida do servidor permanecem intactos.

---

## 7. Retry

O controller preserva somente a última intent que falhou na geração atual.

```text
ERROR
→ retryAvailable = true
→ retry()
→ nova geração com operação RETRY
```

O retry:

- não reutiliza receipt obsoleto;
- não restaura dados de outra query;
- não inventa sucesso;
- não executa automaticamente;
- permanece indisponível quando não existe falha elegível.

Na página Resultados, o piloto cria o botão:

```text
Tentar novamente
```

Ele aparece somente após erro remoto elegível.

---

## 8. URL canônica

A autoridade serializa apenas estado reproduzível:

```text
q
type
category
state
city
neighborhood
minRating
guaranteed
emergency
online
availableToday
```

Aliases históricos são removidos:

```text
busca
categoria
catégory
catégorie
estado
staté
cidade
bairro
```

Parâmetros efêmeros também não persistem:

```text
cursor
pageSize
```

Parâmetros não pertencentes à busca são preservados.

A substituição usa `history.replaceState`, evitando uma entrada extra no histórico para a normalização da mesma busca aplicada.

---

## 9. Divulgação de autoridade

### 9.1 Serviços remotos

```text
Anúncios carregados do catálogo oficial da Doke.
```

Contrato interno:

```text
authority: remote_catalog
coverage: catalog
canonical: true
```

### 9.2 Fixture de ambiente

```text
Anúncios disponíveis no catálogo deste ambiente.
```

Contrato interno:

```text
authority: fixture_catalog
coverage: current_environment
canonical: false
```

### 9.3 Perfis, workers e publicações

Esses modos continuam consumindo amostras locais/editoriais existentes.

A interface comunica explicitamente:

```text
Amostra local/editorial
→ pode não representar todo o conteúdo da plataforma
```

Contrato interno:

```text
authority: local_editorial
coverage: editorial_sample
canonical: false
```

Nenhum novo endpoint remoto foi criado.

---

## 10. Integração com Resultados

Runtime entregue como static delivery bundle:

```text
assets/js/pages/search/server-results-surface.js
```

O arquivo já declarado estaticamente por `resultados.html` publica, em ordem, `Doke.searchExperience`, `Doke.searchResultsAuthorityPilot` e `Doke.searchResultsServerSurface`. Isso evita injeção de scripts ou styles em runtime e mantém uma única cópia executável da autoridade.

O static delivery bundle de `server-results-surface` passa a:

- publicar a autoridade de busca antes da surface;
- criar um controller exclusivo para serviços;
- delegar concorrência ao controller;
- aplicar DOM somente quando `receipt.applied === true`;
- sincronizar URL na busca inicial;
- expor `retry`;
- manter fallback editorial explícito após vazio direto;
- preservar repository, service, renderer e ranking existentes.

O piloto de Resultados:

- adiciona disclosure de autoridade;
- reflete authority, coverage e canonical em datasets;
- cria retry acessível;
- acompanha troca de escopo;
- não lê nem emite query bruta.

---

## 11. Estados da surface

### Busca inicial

```text
LOADING
→ READY | EMPTY | FALLBACK | ERROR
```

### Próxima página

```text
READY
→ PAGINATING
→ READY | ERROR localizado
```

### Nova intenção concorrente

```text
A LOADING
→ B LOADING
→ A STALE receipt não aplicado
→ B READY/EMPTY/ERROR
```

### Cancelamento de rota

```text
cancel/deactivate
→ geração invalidada
→ resposta tardia não aplicada
```

---

## 11.1 Static delivery bundle

A página já declara `server-results-surface.js` por markup estático. Para preservar CSP e evitar execução dinâmica, o arquivo entrega três IIFEs isolados na ordem:

```text
Doke.searchExperience
→ Doke.searchResultsAuthorityPilot
→ Doke.searchResultsServerSurface
```

O bundle não usa `createElement('script')`, atribuição de `script.src`, `eval`, `new Function` ou injeção de styles. A separação lógica entre autoridade, piloto e consumer permanece explícita, mas existe apenas uma cópia executável no runtime sem bundler.

## 12. Privacidade e telemetry

Eventos publicam somente:

- controller ID sanitizado;
- generation;
- state;
- operation;
- mode;
- authority;
- coverage;
- fingerprints opacos;
- contagem de itens;
- código de erro sanitizado.

Não são publicados:

- query bruta;
- filtros brutos;
- nomes;
- IDs de contas;
- títulos de anúncios;
- URLs completas;
- cursor bruto;
- payload do servidor.

Nenhum endpoint de analytics foi criado.

---

## 13. Testes determinísticos

```text
scripts/test-ux-search-001-search-experience.js
```

Cobertura:

- API e enums congelados;
- disclosure remote/fixture/local;
- busca B abortando e substituindo A;
- resposta A tardia não aplicada;
- A não sobrescrevendo o loading de B;
- paginação idêntica single-flight;
- paginação de contexto divergente rejeitada;
- retry após falha;
- URL canônica;
- aliases e cursor removidos;
- parâmetros externos preservados;
- eventos sem query bruta;
- integração estática da surface e do piloto;
- ausência do guard legado que reutilizava `state.inFlight`.

---

## 14. CI

```text
.github/workflows/ux-search-001-search-experience.yml
```

O gate executa:

- sintaxe JavaScript;
- testes UX-SEARCH-001;
- catálogo público sem dívida nova;
- loading baseline sem dívida nova;
- UX-CARDS-001;
- UX-PERF-001;
- UX-RESP-001;
- UX-A11Y-001;
- UX-NAV-001;
- navigation lifecycle;
- auth/session;
- UX-PRIV-001;
- UX-CONT-001;
- UX-CORE-002;
- UX-CORE-001;
- whitespace do diff.

Dívidas preexistentes continuam rastreadas:

```text
#60 — loading de perfis
#64 — versões obsoletas no teste do catálogo público
```

O gate de delta falha caso este PR introduza qualquer assinatura nova.

---

## 15. Limitações conscientes

Este sublote não:

- altera o algoritmo de ranking;
- altera a consulta server-side;
- cria autocomplete remoto;
- torna users/workers/publicações catálogos canônicos;
- migra o modelo draft/applied dos filtros;
- redesenha a página;
- altera Home;
- implementa analytics remoto;
- corrige as dívidas #60 ou #64;
- toca pagamentos, carteira, pedidos, mensagens, KYC ou Trust & Safety.

O modelo `appliedFilters` versus `draftFilters` pertence ao próximo sublote.

---

## 16. Rollback

1. restaurar `server-results-surface.js` ao head de UX-CARDS-001;
2. remover teste, workflow e documento.

Nenhum dado remoto, schema, storage persistente ou deployment precisa ser revertido.

---

## 17. Próximo sublote

```text
UX-FILTERS-001
— appliedFilters versus draftFilters
— paridade desktop/mobile
— aplicação atômica na URL
— cancelar, limpar e fechar sem mutação implícita
```
