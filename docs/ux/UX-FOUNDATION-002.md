# UX-FOUNDATION-002 — máquina de estados da busca Home → Resultados

## Status

- fase: `DISCOVERY_AND_SPECIFICATION`;
- branch: `ux/ux-foundation-001`;
- base lógica observada: `pay/pay-001-baseline-audit`;
- head lógico observado: `26608c8acd8153daec8ed09540c59a5ecd1e9cc4`;
- alteração de runtime: zero;
- alteração em HTML/CSS/JS: zero;
- staging e produção: não acessados;
- merge e auto-merge: não autorizados.

Este sublote define o contrato de produto, UX e QA da busca entre `index.html` e `resultados.html`. Ele não autoriza implementação. Seu objetivo é impedir que dropdown, URL, requisição, coleção e hidratação sejam tratados como um único estado implícito.

## 1. Escopo

Incluído:

1. busca principal da Home;
2. dropdown da Home;
3. navegação Home → Resultados;
4. busca principal de Resultados;
5. busca rápida do header de Resultados;
6. parâmetros de URL;
7. modos `services`, `users`, `workers` e `before-after`;
8. filtros de serviços;
9. carregamento inicial e paginação;
10. fallback editorial `Outros anúncios`;
11. histórico local de pesquisas;
12. concorrência, cancelamento e resposta obsoleta;
13. estados vazio, erro e retry;
14. teclado, foco e leitores de tela;
15. comportamento anônimo e autenticado.

Fora do escopo:

1. alterar algoritmo de ranking;
2. ativar `search-rank-v1`;
3. criar nova autoridade para usuários, workers ou publicações;
4. instrumentar sinais comportamentais;
5. alterar RLS, migrations, Edge Functions ou staging;
6. redesenhar cards, filtros ou shell;
7. implementar autocomplete remoto;
8. modificar favoritos.

## 2. Autoridades observadas

| Responsabilidade | Autoridade atual observada | Classificação UX |
|---|---|---|
| navegação Home → Resultados | `assets/js/pages/home/search.js` | runtime local de navegação |
| autocomplete e histórico | `assets/js/pages/search-data.js` | apoio local do navegador |
| controller de Resultados | `assets/js/pages/search-results.js` | orquestração da página |
| serviços públicos | `assets/js/pages/search/server-results-surface.js` + serviço de busca | autoridade canônica server-side |
| cards de serviços | `assets/js/components/public-service-card.js` | componente compartilhado |
| usuários | pool local em `search-data.js` | demonstração, não canônico |
| workers | pool local em `search-data.js` | demonstração, não canônico |
| publicações | pool local em `search-data.js` | demonstração, não canônico |
| filtros persistíveis | `URLSearchParams` + formulário de Resultados | estado reproduzível da rota |
| hidratação da página | `DokePageHydration` + controller de Resultados | estado estrutural da página |

### 2.1 Regra de autoridade

A interface não pode apresentar `users`, `workers` ou `before-after` como resultados remotos completos enquanto essas superfícies continuarem alimentadas por pools locais. A UI pode tratá-las como demonstração ou conteúdo editorial, mas não como catálogo canônico da plataforma.

A busca de `services` deve permanecer fail-closed quando a autoridade canônica não estiver disponível. Não é permitido reativar filtragem do catálogo completo no navegador como fallback técnico.

## 3. Causa raiz do risco de UX

O runtime atual possui estados corretos isoladamente, porém distribuídos entre quatro camadas:

1. dropdown/autocomplete;
2. URL e formulário;
3. requisição e paginação;
4. hidratação e coleção renderizada.

Sem um contrato explícito, essas camadas podem divergir. Exemplos:

- dropdown fechado enquanto uma busca ainda está carregando;
- URL atualizada para a consulta B enquanto a resposta da consulta A ainda pode vencer;
- erro de próxima página tratado como erro total;
- estado vazio direto substituído por fallback editorial sem indicar a diferença;
- busca local de users/workers/publicações parecendo equivalente à busca canônica de serviços;
- histórico local contendo consultas sensíveis sem política de retenção claramente visível.

## 4. Achados da inspeção

### 4.1 Comportamentos positivos existentes

- Home preserva a query na navegação para `resultados.html?q=...`;
- Home oferece histórico, recomendações, sugestões e estado sem correspondência;
- Resultados preserva query, tipo e filtros na URL;
- refresh reproduz parâmetros persistidos;
- serviços usam autoridade canônica e falham fechados;
- busca direta sem anúncios pode executar fallback editorial explícito;
- paginação usa cursor, deduplica IDs e preserva cards existentes;
- respostas de epoch antiga são ignoradas após cancelamento de rota;
- skeleton de hidratação é separado do estado inline da coleção;
- alteração de rota executa cleanup do controller.

### 4.2 Risco P0 — nova busca durante requisição em andamento

No `server-results-surface`, `execute(...)` retorna `state.inFlight` quando `state.loading` já é verdadeiro. A nova busca não cria novo epoch, não cancela a operação anterior e não inicia nova requisição.

Sequência de falha possível:

1. usuário pesquisa A;
2. requisição A entra em andamento;
3. usuário pesquisa B antes de A terminar;
4. URL e campo passam a mostrar B;
5. `execute(...)` devolve a Promise de A;
6. resposta A pode preencher a coleção enquanto a interface comunica B.

Contrato obrigatório futuro: para carregamentos iniciais, a busca mais recente deve vencer. A implementação deverá abortar a anterior quando possível ou criar um novo generation/epoch antes de avaliar `inFlight`.

### 4.3 Risco P0 — equivalência falsa entre autoridades

`services` é remoto e canônico. `users`, `workers` e `before-after` são filtrados em pools locais. A troca de escopo ocorre no mesmo componente visual, o que pode sugerir ao usuário que todos os modos têm cobertura equivalente.

Contrato obrigatório futuro: o modo e sua cobertura precisam ser semanticamente honestos. Enquanto não houver autoridade remota, esses escopos não podem receber linguagem como “todos os usuários”, “resultados oficiais” ou contagens que pareçam globais.

### 4.4 Risco P1 — erro de paginação sem feedback localizado

Quando `load more` falha, os itens existentes são preservados, mas o botão é ocultado e o evento de erro é emitido. O contrato visual de erro parcial não está explícito.

Contrato obrigatório futuro: falha de próxima página não pode substituir o conteúdo já carregado por erro total. Deve existir feedback inline com retry seguro.

### 4.5 Risco P1 — semântica do dropdown

Na Home, o campo declara `aria-haspopup="dialog"`, embora o conteúdo funcione como autocomplete/lista de opções. A navegação por teclado considera apenas `.search-suggestion`, enquanto chips também são clicáveis.

Contrato obrigatório futuro: escolher uma semântica única, preferencialmente combobox/listbox quando a implementação atender integralmente ao padrão. Todas as opções acionáveis visíveis devem participar do mesmo modelo de teclado.

### 4.6 Risco P1 — histórico local e privacidade

O histórico salva até quatro consultas brutas em `localStorage`. Consultas podem conter endereço, nome ou texto pessoal.

Contrato obrigatório futuro:

- histórico permanece device-local;
- não é sincronizado com a conta sem consentimento explícito;
- ação “Limpar” remove todo o histórico local;
- produto não deve incentivar envio de senha, documento, telefone ou dado financeiro no campo;
- uma futura política de retenção/sensibilidade deverá ser aprovada antes de telemetria de query.

## 5. Modelo de estado composto

A busca deve ser modelada por cinco máquinas independentes e coordenadas.

```text
SearchExperienceState
├── routeState
├── dropdownState
├── requestState
├── collectionState
└── filtersState
```

Nenhuma propriedade visual deve tentar substituir as cinco dimensões por um único valor genérico.

## 6. Máquina A — estado da rota

Estados:

- `HOME_IDLE` — Home carregada, nenhuma navegação iniciada;
- `HOME_QUERY_EDITING` — campo contém texto ainda não submetido;
- `NAVIGATING_TO_RESULTS` — navegação iniciada com URL canônica;
- `RESULTS_BOOTSTRAPPING` — Resultados lendo URL e montando controles;
- `RESULTS_ACTIVE` — rota pronta para novas interações;
- `LEAVING_RESULTS` — cleanup iniciado.

Transições:

| Origem | Evento | Destino | Efeito obrigatório |
|---|---|---|---|
| `HOME_IDLE` | foco/input | `HOME_QUERY_EDITING` | sincronizar dropdown, sem requisição canônica |
| `HOME_QUERY_EDITING` | submit válido | `NAVIGATING_TO_RESULTS` | persistir histórico e montar URL |
| `NAVIGATING_TO_RESULTS` | documento/route swap | `RESULTS_BOOTSTRAPPING` | ler URL como fonte inicial |
| `RESULTS_BOOTSTRAPPING` | DOM + controller prontos | `RESULTS_ACTIVE` | iniciar busca inicial |
| `RESULTS_ACTIVE` | route leaving/pagehide | `LEAVING_RESULTS` | invalidar geração e limpar overlays |

Regra: submissão vazia na Home não navega. Em Resultados, submissão vazia representa catálogo em destaque e deve ser uma decisão explícita, não consequência acidental.

## 7. Máquina B — estado do dropdown

Estados:

- `CLOSED`;
- `OPEN_RECENTS`;
- `OPEN_RECOMMENDATIONS`;
- `OPEN_TYPING`;
- `OPEN_MATCHES`;
- `OPEN_NO_MATCHES`.

Prioridade de conteúdo:

1. query com 2 ou mais caracteres: matches ou no-matches;
2. query vazia: recentes e recomendações;
3. query com 1 caractere: fechado, salvo decisão explícita futura.

Transições:

| Evento | Estado esperado |
|---|---|
| foco com campo vazio e conteúdo disponível | `OPEN_RECENTS` ou `OPEN_RECOMMENDATIONS` |
| digitação com menos de 2 caracteres | `CLOSED` |
| digitação com 2+ caracteres e matches | `OPEN_MATCHES` |
| digitação com 2+ caracteres sem matches | `OPEN_NO_MATCHES` na Home |
| `Escape` | `CLOSED` |
| clique fora | `CLOSED` |
| seleção de opção | `CLOSED` + navegação/carregamento |
| route leaving | `CLOSED` |

Regras:

- abrir/fechar não deve deslocar o layout;
- nenhuma opção ativa pode permanecer marcada após fechamento;
- ao reabrir, o índice ativo começa em `-1`;
- chips e linhas acionáveis devem ser navegáveis de maneira consistente;
- `Escape` fecha sem apagar a query;
- clique fora não deve submeter o formulário.

## 8. Máquina C — estado da requisição

Estados:

- `IDLE`;
- `INITIAL_LOADING`;
- `INITIAL_SUCCESS`;
- `INITIAL_EMPTY`;
- `INITIAL_ERROR`;
- `FALLBACK_LOADING`;
- `FALLBACK_SUCCESS`;
- `LOAD_MORE_LOADING`;
- `LOAD_MORE_SUCCESS`;
- `LOAD_MORE_ERROR`;
- `CANCELLED`;
- `STALE_IGNORED`.

### 8.1 Identidade de operação

Toda busca inicial deve possuir:

```text
requestId = generation + fingerprint(query, mode, filters)
```

Apenas o requestId ativo pode alterar:

- grid;
- título;
- descrição;
- contagem;
- estado vazio/erro;
- cursor;
- botão de próxima página;
- hidratação inicial.

### 8.2 Política de concorrência

Busca inicial:

- estratégia: `LATEST_WINS`;
- nova submissão invalida a anterior imediatamente;
- abortar rede quando suportado;
- resposta obsoleta não produz DOM, mensagem ou evento de sucesso visível.

Paginação:

- estratégia: `SINGLE_FLIGHT_PER_FINGERPRINT`;
- clique repetido durante a mesma página reutiliza ou ignora a operação atual;
- mudança de query/filtro invalida cursor anterior;
- não anexar página de fingerprint diferente.

### 8.3 Retry

- `INITIAL_ERROR`: retry repete exatamente o fingerprint visível;
- `LOAD_MORE_ERROR`: retry repete somente a próxima página e preserva itens;
- cursor inválido: não repetir indefinidamente; reiniciar busca inicial com mensagem controlada;
- erro de autoridade: não usar dados locais como fallback silencioso.

## 9. Máquina D — estado da coleção

Estados:

- `UNRESOLVED`;
- `SKELETON`;
- `RESULTS_DIRECT`;
- `RESULTS_FALLBACK`;
- `EMPTY_DIRECT`;
- `ERROR_BLOCKING`;
- `RESULTS_WITH_APPEND_ERROR`;
- `END_OF_COLLECTION`.

### 9.1 Busca direta

Quando a query retorna itens:

- título comunica a query;
- descrição comunica origem oficial;
- cards representam apenas resposta aceita da geração ativa;
- contagem corresponde aos itens atualmente renderizados, não ao total global quando indisponível.

### 9.2 Fallback editorial

Quando a busca direta não retorna itens e o catálogo secundário retorna itens:

- estado: `RESULTS_FALLBACK`;
- título: `Outros anúncios`;
- mensagem deve explicar que não houve correspondência exata;
- query original permanece visível no campo e URL;
- chips não podem sugerir que os cards correspondem exatamente à query;
- paginação continua vinculada ao request de fallback, não ao request direto.

### 9.3 Vazio real

Quando busca direta e fallback não retornam itens:

- estado: `EMPTY_DIRECT`;
- explicar o que não foi encontrado;
- oferecer limpar filtros, ajustar localização ou reformular a busca;
- não renderizar trilho, paginação ou setas sem função;
- foco permanece em contexto previsível, sem salto automático para o topo.

### 9.4 Erro bloqueante

Quando a primeira página falha:

- estado: `ERROR_BLOCKING`;
- não exibir cards obsoletos como atuais;
- título e descrição não devem continuar descrevendo sucesso;
- oferecer retry quando seguro;
- não executar fallback editorial em falha técnica.

### 9.5 Erro de append

Quando próxima página falha:

- estado: `RESULTS_WITH_APPEND_ERROR`;
- preservar cards e scroll;
- mostrar erro inline próximo ao controle de paginação;
- permitir retry;
- não transformar a página em `ERROR_BLOCKING`.

## 10. Máquina E — filtros e URL

### 10.1 Fonte de verdade

Na entrada direta e refresh:

```text
URL → controles → request
```

Durante interação ativa:

```text
controles validados → URL → request
```

Não deve existir estado persistível apenas no DOM sem representação definida na URL.

### 10.2 Parâmetros canônicos

| Parâmetro | Tipo | Regra |
|---|---|---|
| `q` | string | trim; removido quando vazio |
| `type` | enum | `services`, `users`, `workers`, `before-after` |
| `category` | repetível | até 10 valores normalizados |
| `state` | string | unidade federativa validada |
| `city` | string | dependente do estado |
| `neighborhood` | string | dependente da cidade |
| `minRating` | número | faixa aprovada pelo domínio |
| `guaranteed` | boolean | `1` quando ativo |
| `emergency` | boolean | `1` quando ativo |
| `online` | boolean | `1` quando ativo |
| `availableToday` | boolean | `1` quando ativo |

Aliases históricos com acento podem ser lidos para compatibilidade, mas uma futura implementação deve escrever apenas nomes canônicos sem acento.

### 10.3 `replaceState` versus `pushState`

Contrato recomendado:

- digitação não altera URL;
- submit de nova query: `pushState` quando representa nova intenção que deve participar do histórico;
- ajuste contínuo dentro do painel antes de aplicar: não altera URL;
- aplicar filtros: `pushState` ou navegação controlada única;
- normalização técnica da mesma intenção: `replaceState`;
- paginação não precisa criar entrada no histórico quando cards são anexados na mesma rota.

A escolha final deve ser validada com comportamento do botão Voltar. O runtime atual usa predominantemente `replaceState`, portanto mudanças futuras exigem teste de regressão do stable router.

### 10.4 Dependências de filtro

- limpar estado limpa cidade e bairro;
- mudar estado invalida cidade incompatível;
- mudar cidade invalida bairro incompatível;
- CEP preenche localização, mas o CEP bruto não precisa permanecer na URL;
- filtros de serviços não podem contaminar modos locais de users/workers/publicações;
- ao trocar para modo não-service, filtros incompatíveis devem ser ignorados ou preservados como rascunho, nunca aplicados silenciosamente.

## 11. Modos de resultado

### 11.1 `services`

- autoridade: server-side canônica;
- suporta filtros geográficos e operacionais;
- suporta cursor e fallback editorial;
- erro técnico falha fechado;
- cards usam componente público compartilhado.

### 11.2 `users`

- autoridade atual: pool local;
- sem paginação canônica;
- contagem representa apenas pool carregado;
- linguagem deve indicar demonstração/conteúdo disponível, não cobertura global.

### 11.3 `workers`

- autoridade atual: pool local;
- preview de mídia é local;
- sem inferir disponibilidade, identidade ou métricas remotas;
- não misturar filtros de serviços.

### 11.4 `before-after`

- autoridade atual: pool local;
- preview de publicação é local;
- não apresentar likes, saves ou comentários como métricas canônicas se forem fixtures;
- não misturar filtros de serviços.

## 12. Comportamento Home → Resultados

### 12.1 Submit por teclado ou botão

1. trim da query;
2. se vazio: permanecer na Home e manter foco;
3. fechar dropdown;
4. adicionar ao histórico local conforme política;
5. construir URL com `q` codificada;
6. navegar uma única vez por `DokeNavigate(...)` ou fallback nativo;
7. Resultados lê a URL e inicia bootstrap.

### 12.2 Seleção de sugestão

- valor semântico da sugestão, não `textContent` concatenado, deve ser usado;
- histórico recebe o valor escolhido uma única vez;
- resultado não deve executar busca duplicada por submit e click simultâneos;
- seleção por teclado e mouse produz a mesma URL.

### 12.3 Tags e atalhos

- tag remove `#` apenas quando esse caractere for decorativo;
- atalhos devem declarar modo quando necessário;
- link estático e navegação controlada precisam convergir para a mesma URL canônica.

## 13. Busca dentro de Resultados

### 13.1 Campo principal e header

Os dois campos representam a mesma intenção ativa. Regras:

- valores sincronizados após submit;
- digitar em um campo não deve apagar silenciosamente o outro antes do submit;
- submit de qualquer origem usa o mesmo pipeline;
- dropdown pertence somente ao campo principal, salvo especificação futura;
- loading e erro não podem desabilitar permanentemente o campo;
- nova busca durante loading aplica `LATEST_WINS`.

### 13.2 Troca de modo

- atualiza `type`;
- cancela/invalida requisição incompatível;
- limpa cursor;
- não mantém cards do modo anterior durante o estado final;
- skeleton ou transição deve evitar flash de contrato errado;
- preview local é remontado apenas após renderização aceita.

## 14. Hidratação

Estados estruturais:

- `document-preloader`;
- `results hydration skeleton`;
- `ready layout`;
- estado inline da coleção.

Regras:

- skeleton inicial não reaparece integralmente para toda interação subsequente;
- nova busca dentro da página pode usar loading contextual sem desmontar shell;
- empty inline não deve ser interpretado como empty da página inteira;
- `DokePageHydration` encerra somente após a primeira renderização aceita da geração ativa;
- falha inicial encerra hidratação em erro;
- resposta obsoleta não pode marcar hidratação como pronta.

## 15. Acessibilidade

### 15.1 Combobox/listbox

Uma futura correção deve adotar integralmente um padrão, sem mistura parcial:

- campo com `role="combobox"` quando necessário;
- `aria-expanded` sincronizado;
- `aria-controls` apontando para lista existente;
- lista com semântica compatível;
- opção ativa comunicada por `aria-activedescendant` ou foco real consistente;
- `ArrowDown` e `ArrowUp` percorrem todas as opções acionáveis visíveis;
- `Enter` seleciona a opção ativa ou submete a query;
- `Escape` fecha e mantém foco no campo;
- leitor de tela recebe quantidade/estado sem anúncio excessivo.

### 15.2 Loading, erro e resultados

- loading usa `aria-busy` no escopo correto;
- título/contagem atualizados não devem ser anunciados repetidamente a cada tecla;
- resultado de submit pode usar região `aria-live="polite"`;
- erro possui mensagem textual, não apenas cor;
- retry tem rótulo específico;
- foco não salta automaticamente para cards após cada busca;
- botão carregar mais preserva posição e informa estado.

### 15.3 Filtros mobile

- foco inicial no título ou primeiro controle útil;
- foco contido enquanto drawer/modal estiver aberto;
- `Escape` fecha;
- fechar retorna foco ao acionador;
- backdrop não entra na ordem de tabulação;
- aplicar filtros comunica atualização.

## 16. Sessão anônima e autenticada

Busca:

- mesma autoridade e cobertura para anônimo e autenticado;
- nenhuma diferença de ranking baseada em identidade sem contrato server-authoritative;
- histórico continua local ao dispositivo;
- query não deve ser anexada automaticamente ao perfil.

Favorito, fora deste sublote:

- sessão anônima pode receber fluxo de autenticação;
- falha de favorito não altera estado da busca;
- login concluído não deve repetir ou perder a query atual.

## 17. Mensagens de produto

### Sem correspondência exata com fallback

```text
Não encontramos anúncios exatamente para “{query}”. Veja outros serviços disponíveis.
```

### Vazio real

```text
Nenhum serviço corresponde à sua busca e aos filtros atuais.
```

Ações possíveis:

- limpar filtros;
- ampliar localização;
- reformular busca.

### Falha inicial

```text
Não foi possível consultar o catálogo oficial agora.
```

Ação:

- tentar novamente.

### Falha de próxima página

```text
Não foi possível carregar mais anúncios. Os resultados já exibidos foram preservados.
```

Ação:

- tentar carregar novamente.

## 18. Telemetria futura — limites

Este documento não autoriza instrumentação. Quando `ANA-001` existir, eventos permitidos deverão ser server-authoritative ou estritamente operacionais.

Possíveis eventos de UX, sem query bruta:

- dropdown aberto/fechado;
- submit realizado;
- modo selecionado;
- filtro aplicado;
- empty direto;
- fallback editorial usado;
- erro inicial;
- erro de append;
- retry;
- tempo até primeira renderização aceita.

Proibido sem aprovação específica:

- armazenar query bruta;
- IP + query;
- endereço exato;
- score interno;
- sinais manipuláveis entrando em ranking;
- sincronizar histórico local com conta.

## 19. Matriz de casos de QA

### P0 — autoridade e concorrência

1. A termina antes de B;
2. B é submetida enquanto A carrega;
3. A responde depois de B;
4. troca de modo durante requisição;
5. troca de filtro durante requisição;
6. saída da rota durante requisição;
7. cursor usado após mudança de fingerprint;
8. autoridade canônica ausente;
9. falha técnica sem fallback local;
10. resposta obsoleta não altera DOM nem hidratação.

### P0 — URL e navegação

1. Home → Resultados com caracteres especiais;
2. seleção de sugestão por teclado;
3. seleção por mouse;
4. refresh com query e filtros;
5. botão Voltar após duas buscas;
6. navegação interna versus carregamento direto;
7. aliases históricos normalizados;
8. query vazia;
9. modo inferido versus `type` explícito;
10. troca de modo remove cursor anterior.

### P1 — coleção

1. sucesso direto;
2. zero direto + sucesso fallback;
3. zero direto + zero fallback;
4. falha direta;
5. próxima página com novos IDs;
6. próxima página com duplicados;
7. fim da coleção;
8. falha da próxima página;
9. retry de próxima página;
10. texto longo e mídia ausente.

### P1 — dropdown e acessibilidade

1. foco com histórico;
2. foco sem histórico;
3. 1 caractere;
4. 2 caracteres com matches;
5. 2 caracteres sem matches;
6. ArrowDown/ArrowUp;
7. Enter sem opção ativa;
8. Enter com opção ativa;
9. Escape;
10. clique fora;
11. leitor de tela;
12. retorno de foco de filtros mobile.

### P1 — privacidade

1. limpar histórico;
2. storage indisponível;
3. storage corrompido;
4. query com endereço;
5. query com dado potencialmente sensível;
6. sessão muda e histórico continua apenas device-local.

## 20. Handoff de implementação recomendado

A correção futura deve ser dividida, não aplicada nesta branch documental.

### SEARCH-UX-H01 — concorrência latest-wins

Problema:

- requisição em andamento pode ser reutilizada após nova intenção.

Autoridade provável:

- `assets/js/pages/search/server-results-surface.js`;
- eventualmente `assets/js/services/search-service.js` e repository para `AbortSignal`.

Critérios:

- requestId/generation por busca inicial;
- cancelamento quando suportado;
- stale response sem efeito;
- paginação single-flight preservada;
- testes determinísticos de ordem invertida.

### SEARCH-UX-H02 — estado de erro parcial de paginação

Autoridade provável:

- componente/pattern de paginação;
- controller de Resultados apenas para composição.

Critérios:

- cards preservados;
- retry inline;
- foco e scroll preservados;
- sem erro global.

### SEARCH-UX-H03 — semântica de combobox

Autoridade provável:

- componente compartilhado de busca;
- Home e Resultados como consumidores.

Critérios:

- um contrato ARIA completo;
- chips e sugestões no mesmo modelo de teclado;
- testes Home/Resultados;
- sem CSS duplicado de página.

### SEARCH-UX-H04 — honestidade de cobertura por modo

Dependência:

- decisão de produto e futura autoridade para usuários, workers e publicações.

Critérios:

- linguagem não sugere catálogo global;
- fixtures não aparecem como métricas reais;
- filtros incompatíveis não são aplicados.

## 21. Arquivos permitidos e proibidos no futuro

### Permitidos após abertura de branch própria

Somente conforme causa raiz comprovada:

- `assets/js/pages/search/server-results-surface.js`;
- `assets/js/pages/search-results.js`;
- `assets/js/pages/home/search.js`;
- componente compartilhado de busca existente;
- testes e scripts de auditoria específicos;
- documentação e evidência.

### Proibidos como remendo

- CSS de página para esconder erro lógico;
- novo localStorage de autoridade;
- fallback de catálogo completo no navegador;
- `!important`;
- inline style;
- duplicação do componente de busca;
- alteração de ranking;
- mistura com pagamento, pedidos, mensagens ou autenticação;
- mudança visual não aprovada do baseline da Home.

## 22. Riscos de regressão

- navegação interna iniciar controller duas vezes;
- cancelar requisição compartilhada por outro consumidor;
- quebrar load more ao introduzir abort;
- criar entradas excessivas no histórico do navegador;
- perder compatibilidade com URLs antigas;
- skeleton reaparecer em toda busca;
- filtros desktop e mobile divergirem;
- dropdown perder comportamento touch;
- leitores de tela receberem anúncios excessivos;
- fallback editorial ser confundido com correspondência direta.

## 23. Validação deste sublote

Executado:

- inspeção de `assets/js/pages/home/search.js`;
- inspeção de `assets/js/pages/search-results.js`;
- inspeção de `assets/js/pages/search/server-results-surface.js`;
- inspeção de `assets/js/pages/search-data.js`;
- inspeção de `index.html` e `resultados.html` relevante ao fluxo;
- confirmação de autoridade canônica de serviços;
- confirmação de pools locais para outros modos;
- modelagem de estados, transições e critérios de QA.

Não executado:

- alteração de runtime;
- testes automatizados;
- servidor local;
- Playwright;
- validação visual;
- requisição real de staging;
- produção.

Justificativa: este sublote é exclusivamente documental.

## 24. Resultado

`UX-FOUNDATION-002` fecha a ambiguidade conceitual da busca e produz quatro decisões centrais:

1. estado de dropdown, rota, requisição, coleção e filtros são independentes;
2. busca inicial deve seguir `LATEST_WINS`;
3. paginação deve seguir `SINGLE_FLIGHT_PER_FINGERPRINT`;
4. serviços canônicos não podem ser apresentados como equivalentes aos pools locais de outros modos.

## 25. Próximo sublote recomendado

`UX-FOUNDATION-003 — contrato unificado de filtros desktop/mobile e persistência de URL`.

O próximo documento deverá detalhar:

- inventário de controles;
- dependências estado/cidade/bairro;
- filtros compatíveis por modo;
- estado aplicado versus rascunho;
- drawer mobile e retorno de foco;
- limpar, aplicar e cancelar;
- chips ativos;
- contagem de filtros;
- comportamento do botão Voltar;
- critérios de teste nos breakpoints reais.