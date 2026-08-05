# UX-SEARCH-001 — máquina de estados, latest-wins e autoridade da busca

## Status

- frente: `UX-IMPLEMENTATION`;
- branch: `ux/ux-search-001-latest-wins`;
- base: `ux/ux-cards-001-card-authority`;
- base head: `8e3ff87c0f159a7e989cb5ae06d34194b4472738`;
- issue: `#65`;
- runtime alterado: busca de Resultados e autoridade transversal associada;
- Home visual, ranking e catálogo: não alterados;
- backend, migrations, staging e produção: não acessados;
- merge, ready-for-review e auto-merge: não autorizados.

## 1. Objetivo

Consolidar uma autoridade única para intenção de busca, concorrência latest-wins, paginação, retry, URL canônica, estados operacionais e divulgação da autoridade de cada escopo.

A implementação não altera ranking, consulta server-side, pesos, catálogo, RLS, RPCs ou Edge Functions.

## 2. Causa raiz

A surface remota reutilizava `state.inFlight` sempre que uma requisição já estava carregando. Isso deduplicava paginação, mas também fazia uma nova busca B reutilizar a Promise da busca A.

```text
A loading
→ usuário inicia B
→ campo e URL comunicam B
→ surface devolve a Promise de A
→ A pode preencher a coleção de B
```

Também existia equivalência visual entre autoridades diferentes:

```text
services
→ catálogo canônico remoto

users / workers / before-after
→ amostras locais ou editoriais
```

## 3. Autoridade criada

```text
Doke.searchExperience
version: 20260804-ux-search-001-v1
contract: search-experience-v1
```

API e enums são congelados.

### Estados

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

### Operações

```text
INITIAL
PAGINATION
RETRY
```

### Autoridades e cobertura

```text
REMOTE_CATALOG      → CATALOG
FIXTURE_CATALOG     → CURRENT_ENVIRONMENT
LOCAL_EDITORIAL     → EDITORIAL_SAMPLE
UNKNOWN             → UNKNOWN
```

## 4. Intenção normalizada

Cada execução produz uma intent imutável:

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

`searchFingerprint` representa modo, query e filtros aplicados. `pageFingerprint` acrescenta cursor e operação. Os hashes são locais, não criptográficos e usados apenas para coordenação e telemetry sem conteúdo bruto.

## 5. Latest-wins

Uma nova busca inicial sempre cria uma geração nova.

```text
A loading
→ inicia B
→ B substitui A
→ AbortSignal de A é sinalizado
→ somente B permanece aplicável
```

Se A responder depois:

```text
receipt.applied = false
receipt.status = stale
DOM não é alterado
estado de B não é substituído
```

O descarte por geração é obrigatório mesmo quando o transporte ainda não consome `AbortSignal`.

## 6. Cancelamento cooperativo

O controller entrega `AbortSignal` ao executor. O repository atual não recebe esse signal em sua API pública. Assim:

- o cancelamento de rede ocorre quando o executor o suporta;
- o descarte de resposta obsoleta é sempre determinístico;
- nenhuma alteração de backend é necessária;
- a propagação futura do signal não muda o contrato latest-wins.

## 7. Paginação

Paginação só opera sobre a busca atual.

```text
intent.searchFingerprint
===
currentSearchFingerprint
```

Caso query, modo ou filtro tenha mudado:

```text
DOKE_SEARCH_CONTEXT_CHANGED
```

Somente uma paginação idêntica em andamento compartilha a mesma Promise. Novas buscas iniciais nunca reutilizam uma Promise antiga.

Regras adicionais:

- cursor não entra na URL reproduzível;
- erro de próxima página preserva os itens anteriores;
- resposta de geração antiga não é anexada;
- ordem recebida do servidor permanece intacta.

## 8. Retry

O controller preserva somente a última intent que falhou na geração atual.

```text
ERROR
→ retryAvailable = true
→ retry()
→ nova geração RETRY
```

O retry não é automático, não reutiliza receipt obsoleto e não restaura dados de outra query. Em Resultados, um botão `Tentar novamente` aparece apenas após erro remoto elegível.

## 9. URL canônica

Persistidos:

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

Aliases históricos removidos:

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

Parâmetros efêmeros removidos:

```text
cursor
pageSize
```

Parâmetros externos à busca são preservados. A normalização usa `history.replaceState` e não cria uma entrada extra no histórico.

## 10. Divulgação de autoridade

### Serviços remotos

```text
Anúncios carregados do catálogo oficial da Doke.
authority: remote_catalog
coverage: catalog
canonical: true
```

### Fixture do ambiente

```text
Anúncios disponíveis no catálogo deste ambiente.
authority: fixture_catalog
coverage: current_environment
canonical: false
```

### Perfis, workers e publicações

```text
Amostra local/editorial
→ pode não representar todo o conteúdo da plataforma
```

```text
authority: local_editorial
coverage: editorial_sample
canonical: false
```

Nenhum novo endpoint remoto foi criado.

## 11. Integração com Resultados

Arquivos de runtime:

```text
assets/js/core/search-experience.js
assets/js/pages/search/server-results-surface.js
assets/js/pages/search/results-authority-pilot.js
assets/css/core/search-experience.css
```

A `server-results-surface` passa a:

- carregar a autoridade de busca;
- criar um controller exclusivo para serviços;
- delegar concorrência ao controller;
- aplicar DOM apenas quando `receipt.applied === true`;
- sincronizar a URL na busca inicial;
- expor retry;
- manter o fallback editorial explícito após vazio direto;
- preservar repository, service, renderer e ranking existentes.

O piloto adiciona disclosure de autoridade, datasets de coverage/canonical e retry acessível, sem ler ou emitir query bruta.

## 12. Privacidade

Eventos publicam somente controller sanitizado, generation, state, operation, mode, authority, coverage, fingerprints opacos, contagens e código de erro sanitizado.

Não são publicados:

- query e filtros brutos;
- nomes e IDs de conta;
- títulos de anúncios;
- URLs completas;
- cursor bruto;
- payload do servidor.

Nenhum endpoint de analytics foi criado.

## 13. Testes

```text
scripts/test-ux-search-001-search-experience.js
```

Cobertura:

- API e enums congelados;
- disclosure remote/fixture/local;
- busca B substituindo A;
- resposta A tardia não aplicada;
- A não sobrescrevendo o loading de B;
- paginação idêntica single-flight;
- paginação divergente rejeitada;
- retry após falha;
- URL canônica;
- aliases e cursor removidos;
- eventos sem query bruta;
- integração estática da surface e do piloto;
- ausência do guard legado que reutilizava `state.inFlight`.

## 14. CI

```text
.github/workflows/ux-search-001-search-experience.yml
```

O gate executa sintaxe, UX-SEARCH-001, catálogo sem dívida nova, loading sem dívida nova e regressões CARDS, PERF, RESP, A11Y, NAV, PRIV, CONT, CORE-002 e CORE-001, além dos auditores de navegação e sessão.

Dívidas preexistentes continuam rastreadas:

```text
#60 — loading de perfis
#64 — versões obsoletas no teste do catálogo público
```

## 15. Limitações

Este sublote não:

- altera ranking ou consulta server-side;
- cria autocomplete remoto;
- transforma users/workers/publicações em catálogos canônicos;
- migra o modelo draft/applied dos filtros;
- redesenha Resultados ou altera Home;
- corrige as dívidas #60 ou #64;
- toca pagamentos, carteira, pedidos, mensagens, KYC ou Trust & Safety.

## 16. Rollback

1. restaurar `server-results-surface.js` ao head de UX-CARDS-001;
2. remover autoridade, piloto e CSS;
3. remover teste, workflow e documento.

Nenhum dado remoto, schema, storage persistente ou deployment precisa ser revertido.

## 17. Próximo sublote

```text
UX-FILTERS-001
— appliedFilters versus draftFilters
— paridade desktop/mobile
— aplicação atômica na URL
— cancelar, limpar e fechar sem mutação implícita
```
