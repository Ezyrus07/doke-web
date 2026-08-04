# UX-FOUNDATION-003 — contrato unificado de filtros desktop/mobile e URL

## Status

- fase: `DISCOVERY_AND_SPECIFICATION`;
- branch: `ux/ux-foundation-001`;
- base lógica observada: `pay/pay-001-baseline-audit`;
- head lógico observado: `26608c8acd8153daec8ed09540c59a5ecd1e9cc4`;
- alteração de runtime: zero;
- alteração em HTML/CSS/JS: zero;
- staging e produção: não acessados;
- merge e auto-merge: não autorizados.

Este sublote define o contrato de produto, UX, estado, acessibilidade e QA dos filtros de `resultados.html`. Ele não autoriza implementação. Seu objetivo é impedir que o mesmo formulário represente simultaneamente filtros em edição, filtros aplicados e parâmetros persistidos sem uma fronteira explícita.

## 1. Decisão central

A experiência de filtros deve possuir três estados independentes:

```text
FilterExperienceState
├── appliedFilters
├── draftFilters
└── filterUiState
```

Definições:

- `appliedFilters`: filtros que produziram a URL e a coleção atualmente comunicada ao usuário;
- `draftFilters`: alterações ainda não confirmadas dentro do painel;
- `filterUiState`: painel aberto, fechado, colapsado, modal, dirty, applying ou error.

Regra obrigatória:

> O formulário visível não pode ser tratado automaticamente como estado aplicado.

Enquanto existir um botão explícito `Aplicar`, mudanças em checkbox, categoria, select ou CEP devem atualizar apenas o rascunho. Uma única ação de aplicação deve validar, persistir a URL e iniciar uma única busca.

## 2. Escopo

Incluído:

1. botão e painel de filtros em `resultados.html`;
2. comportamento desktop e mobile;
3. categorias;
4. estado, cidade e bairro;
5. preenchimento por CEP;
6. avaliação mínima;
7. garantia;
8. atendimento emergencial;
9. serviço online/remoto;
10. disponibilidade no dia;
11. filtros compatíveis por modo;
12. filtros aplicados versus rascunho;
13. URL, refresh, navegação interna e botão Voltar;
14. aplicar, limpar, cancelar e fechar;
15. chips ativos e contagem;
16. foco, teclado, backdrop e scroll lock;
17. concorrência com busca e paginação;
18. estados vazio, loading e erro;
19. matriz de QA;
20. handoffs futuros de implementação.

Fora do escopo:

1. alterar ranking;
2. criar novos filtros de domínio;
3. alterar contratos da Edge Function ou RPC;
4. aplicar migration;
5. ativar staging ou produção;
6. redesenhar visualmente o painel;
7. criar autoridade remota para users, workers ou publicações;
8. alterar cards;
9. implementar geolocalização automática;
10. armazenar CEP bruto como dado de perfil.

## 3. Autoridades observadas

| Responsabilidade | Autoridade atual observada | Classificação |
|---|---|---|
| estrutura do painel | `resultados.html` | composição de página |
| orquestração | `assets/js/pages/search-results.js` | controller de página |
| dados locais de opções | `assets/js/pages/search-data.js` | apoio local/fixture |
| request de serviços | `assets/js/pages/search/server-results-surface.js` | autoridade canônica de consulta |
| anatomia visual dos filtros | `assets/css/pages/results/filters.css` | estilo de filtros |
| shell/drawer responsivo | `assets/css/pages/results/shell.css` | composição responsiva |
| parâmetros persistíveis | `URLSearchParams` | estado reproduzível da rota |
| selects customizados | `DokeUiSelect` | componente compartilhado |

A implementação futura deve manter a separação:

- página controla posicionamento e composição;
- componente compartilhado controla anatomia de controles;
- controller controla estado e transições;
- serviço de busca controla consulta canônica;
- URL representa apenas filtros efetivamente aplicados.

## 4. Inventário dos controles atuais

| ID | Controle | Nome canônico | Tipo | Compatibilidade |
|---|---|---|---|---|
| F01 | modo de resultado | `type` | enum | todos, com autoridades distintas |
| F02 | categorias | `category[]` | multi-select | somente `services` |
| F03 | estado | `state` | select | somente `services` |
| F04 | cidade | `city` | select dependente | somente `services` |
| F05 | bairro | `neighborhood` | select dependente | somente `services` |
| F06 | CEP | transitório | input auxiliar | somente `services` |
| F07 | avaliação mínima | `minRating` | select | somente `services` |
| F08 | garantia | `guaranteed` | boolean | somente `services` |
| F09 | emergência | `emergency` | boolean | somente `services` |
| F10 | online/remoto | `online` | boolean | somente `services` |
| F11 | disponível hoje | `availableToday` | boolean | somente `services` |

`q` não é filtro lateral. É a intenção de busca principal.

## 5. Comportamentos positivos existentes

A inspeção confirmou pontos que devem ser preservados:

1. desktop e mobile consomem o mesmo formulário;
2. o breakpoint funcional principal é `961px`;
3. estado, cidade e bairro possuem dependência explícita;
4. categorias são serializadas como parâmetros repetíveis;
5. aliases históricos podem ser lidos;
6. filtros são incluídos no request canônico de serviços;
7. chips ativos não duplicam a query;
8. o painel mobile possui backdrop;
9. o layout desktop pode manter o painel aberto ou colapsado;
10. a URL permite reconstrução inicial dos controles;
11. CEP não é enviado como campo do request; ele resolve localização;
12. `DokeUiSelect` é reutilizado em vez de criar select local novo.

Esses pontos não eliminam os problemas de estado descritos abaixo.

## 6. Achados críticos da inspeção

### 6.1 P0 — o botão `Aplicar` não representa aplicação real

O formulário possui botão `Aplicar`, porém o controller registra `change` no formulário e executa `loadResults()` após qualquer alteração.

Consequências:

1. marcar um checkbox já consulta antes do clique em `Aplicar`;
2. escolher categoria já consulta;
3. mudar estado já consulta;
4. mudar cidade já consulta;
5. mudar avaliação já consulta;
6. resultados atrás do drawer podem mudar enquanto o usuário ainda edita;
7. clicar `Aplicar` pode executar outra consulta equivalente;
8. fechar o drawer não cancela nem reverte alterações;
9. não existe distinção real entre rascunho e aplicado.

Causa raiz:

```text
DOM do formulário = draft = applied = request input
```

Contrato obrigatório futuro:

```text
change → draft only
Apply → validate + commit URL + one request
Close/Cancel → restore applied state
```

### 6.2 P0 — o botão `Limpar` do painel não possui autoridade de reset

O HTML declara `data-results-filters-reset`, mas o mapa de elementos e os listeners inspecionados não registram handler específico para esse atributo.

Como o botão é `type="button"`, ele não executa reset nativo.

Resultado provável:

- o botão visível `Limpar` dentro do painel não altera os filtros.

Contrato obrigatório futuro:

- o botão deve operar sobre `draftFilters`;
- não deve iniciar request automaticamente enquanto o contrato possuir `Aplicar`;
- após limpar, o painel permanece aberto e marcado como dirty;
- `Aplicar` confirma o conjunto vazio/default.

### 6.3 P0 — o reset do estado vazio pode reconstruir os filtros antigos

O handler de `data-results-empty-reset` executa, em sequência:

1. `filtersForm.reset()`;
2. `renderCategoryFilters()`;
3. `bootstrapLocationSelects()`;
4. `loadResults()`.

Entretanto, `renderCategoryFilters()` e `bootstrapLocationSelects()` usam os parâmetros ainda presentes em `params`.

Isso permite a seguinte sequência:

```text
URL ainda contém filtros antigos
↓
form.reset()
↓
controles são reconstruídos a partir da mesma URL
↓
loadResults() persiste os filtros antigos novamente
```

Além disso, checkboxes de categoria gerados com `checked` podem ter o estado inicial antigo restaurado por `form.reset()`.

Contrato obrigatório futuro para reset externo:

1. construir `DEFAULT_FILTERS`;
2. substituir `appliedFilters` e `draftFilters` por defaults;
3. remover parâmetros canônicos da URL;
4. renderizar controles a partir dos defaults;
5. iniciar uma única busca;
6. anunciar a remoção dos filtros.

### 6.4 P0 — filtros de serviços aparecem em modos que não os aplicam

`users`, `workers` e `before-after` usam pools locais e não consomem os filtros laterais de serviços. Mesmo assim, o formulário pode permanecer visível e `renderActiveChips(...)` recebe esses filtros.

Riscos:

- usuário acredita que categoria/localização/garantia filtraram usuários ou workers;
- chips exibem condições que não alteraram a coleção;
- URL carrega parâmetros sem efeito;
- contagem e empty state parecem resultado de filtros inexistentes.

Contrato obrigatório futuro:

- filtros laterais atuais são `service-only`;
- em modos incompatíveis, o trigger deve ficar oculto ou desabilitado com explicação;
- filtros incompatíveis não entram em chips, request ou URL ativa;
- nenhuma linguagem pode sugerir que pools locais foram filtrados remotamente.

### 6.5 P1 — URL usa `replaceState` para todas as alterações

O controller persiste query e filtros com `replaceState`.

Consequências:

- aplicar filtros não cria uma etapa navegável;
- botão Voltar pode não restaurar a combinação anterior;
- duas intenções distintas podem ocupar a mesma entrada do histórico;
- comportamento difere da expectativa de filtros compartilháveis e reversíveis.

Contrato recomendado:

- bootstrap e normalização técnica: `replaceState`;
- nova query submetida: `pushState`;
- aplicação explícita de filtros: `pushState`;
- remoção de chip aplicado: `pushState`;
- paginação incremental: sem nova entrada;
- correção de aliases/ordem: `replaceState`.

### 6.6 P1 — CEP ignora a fronteira de aplicação

O CEP atual:

- aplica quando chega a oito dígitos;
- aplica em `blur`;
- pode aplicar em `Enter`;
- chama `loadResults()` dentro de `applyCepValue(...)`.

Isso faz o CEP possuir semântica diferente dos demais filtros e contornar o botão `Aplicar`.

Contrato obrigatório futuro:

- CEP resolve apenas `draftFilters.location`;
- sucesso preenche estado/cidade/bairro no rascunho;
- nenhum request ocorre até `Aplicar`;
- CEP inválido mostra mensagem textual associada ao campo;
- CEP bruto não entra na URL;
- limpar CEP não deve limpar localização aplicada até confirmação.

### 6.7 P1 — drawer mobile não possui contrato completo de modal

O painel torna-se fixed abaixo de `961px`, mas o controller observado controla apenas classes, backdrop e `aria-expanded` do acionador.

Não foi identificado no controller:

- captura do elemento que abriu;
- foco inicial;
- focus trap;
- fechamento global por `Escape`;
- retorno de foco;
- `aria-modal`/role condicional;
- `inert` ou bloqueio de interação do conteúdo de fundo;
- anúncio de abertura;
- preservação explícita de draft em mudança de breakpoint.

Contrato obrigatório futuro está detalhado na seção de acessibilidade.

### 6.8 P1 — resize pode fechar o painel sem política de rascunho

Ao sair do desktop, o controller chama `syncFilterUi(false)`. Como hoje não existe draft separado, alterações já foram aplicadas. Em uma correção futura, fechar automaticamente sem política poderia descartar trabalho silenciosamente.

Contrato:

- mudança de breakpoint nunca aplica nem descarta filtros;
- `draftFilters` persiste em memória;
- semântica modal é adicionada/removida conforme viewport;
- se o painel estava aberto/dirty, a composição equivalente deve permanecer acessível.

### 6.9 P1 — chips ativos não são controles removíveis

Os chips atuais são spans informativos. Eles não permitem remover individualmente um filtro aplicado.

Contrato recomendado:

- chip aplicado deve ser botão removível quando a remoção individual for suportada;
- rótulo inclui valor e ação;
- remoção atualiza URL e consulta uma única vez;
- foco segue para o próximo chip ou para o trigger;
- query não aparece duplicada como chip.

### 6.10 P1 — não existe contagem canônica de filtros ativos

O trigger mostra apenas `Filtros`, sem uma contagem derivada do estado aplicado.

Contrato:

- badge deriva de `appliedFilterChips.length`;
- não usa quantidade de campos preenchidos no DOM;
- não conta `q`;
- não conta `type`;
- localização hierárquica conta como um chip;
- filtros incompatíveis não contam.

## 7. Modelo de dados canônico

### 7.1 Tipo conceitual

```text
ServiceFilters {
  categories: string[]
  location: {
    state: string
    city: string
    neighborhood: string
  }
  minRating: number | null
  guaranteed: boolean
  emergency: boolean
  online: boolean
  availableToday: boolean
}
```

### 7.2 Defaults

```text
DEFAULT_SERVICE_FILTERS = {
  categories: [],
  location: {
    state: "",
    city: "",
    neighborhood: ""
  },
  minRating: null,
  guaranteed: false,
  emergency: false,
  online: false,
  availableToday: false
}
```

Não usar o estado inicial do DOM como definição de default. Defaults devem ser dados explícitos.

### 7.3 Normalização

Antes de comparar, persistir ou consultar:

1. trim de strings;
2. categorias deduplicadas;
3. categorias limitadas à allowlist;
4. no máximo 10 categorias;
5. ordem canônica baseada na lista oficial;
6. state validado;
7. city validada dentro do state;
8. neighborhood validado dentro da city;
9. `minRating` limitado aos valores aceitos;
10. booleans estritos;
11. aliases convertidos para nomes sem acento;
12. campos incompatíveis removidos pelo modo.

### 7.4 Fingerprint

```text
filterFingerprint = stableSerialize(normalizedFilters)
```

Usos:

- dirty check;
- request fingerprint;
- deduplicação de aplicação;
- bloqueio de submit repetido;
- invalidação de cursor;
- comparação aplicada versus rascunho.

## 8. Máquina de estados dos filtros

Estados:

- `CLOSED_SYNCED`;
- `OPEN_CLEAN`;
- `OPEN_DIRTY`;
- `VALIDATING`;
- `APPLYING`;
- `APPLIED`;
- `APPLY_ERROR`;
- `CANCELLING`;
- `DISABLED_FOR_MODE`.

### 8.1 Abertura

```text
openFilters():
  draftFilters = clone(appliedFilters)
  filterUiState = OPEN_CLEAN
```

Efeitos:

- controles recebem draft;
- contador continua mostrando applied;
- nenhuma URL muda;
- nenhum request começa.

### 8.2 Alteração

```text
onControlChange(nextDraft):
  draftFilters = normalizeDraft(nextDraft)
  filterUiState = fingerprints equal ? OPEN_CLEAN : OPEN_DIRTY
```

Efeitos permitidos:

- atualizar dependências internas;
- atualizar preview textual opcional no painel;
- habilitar/desabilitar `Aplicar`.

Efeitos proibidos:

- request;
- URL;
- chips aplicados;
- contagem aplicada;
- cursor;
- coleção.

### 8.3 Aplicação

```text
applyFilters():
  validate draft
  appliedFilters = normalized draft
  persist canonical URL once
  invalidate previous request/cursor
  start latest-wins request once
```

Regras:

- botão fica loading;
- submit repetido é ignorado;
- mobile fecha após commit seguro da intenção;
- desktop pode permanecer aberto;
- controles continuam mostrando applied;
- erro de rede não reverte a URL; retry usa a intenção visível;
- erro de validação mantém painel aberto e move foco ao campo.

### 8.4 Cancelamento/fechamento

Eventos equivalentes no mobile:

- botão fechar;
- `Escape`;
- backdrop;
- gesto de voltar do drawer quando suportado.

Comportamento:

```text
cancelFilters():
  draftFilters = clone(appliedFilters)
  render controls from applied
  close panel
  restore focus
```

Nenhum request ou alteração de URL.

### 8.5 Limpar dentro do painel

```text
clearDraft():
  draftFilters = DEFAULT_SERVICE_FILTERS
  render controls from draft
  state = OPEN_DIRTY when applied is not default
```

Não consulta até `Aplicar`.

### 8.6 Limpar fora do painel

Ações de empty state ou toolbar representam commit direto:

```text
clearAppliedFilters():
  applied = defaults
  draft = defaults
  push canonical URL
  request once
```

## 9. Dependência estado → cidade → bairro

### 9.1 Regras de consistência

- sem estado: cidade e bairro vazios/desabilitados;
- estado alterado: cidade incompatível é removida;
- estado alterado: bairro sempre é removido;
- sem cidade: bairro vazio/desabilitado;
- cidade alterada: bairro incompatível é removido;
- opção inválida de URL é descartada na normalização;
- controles dependentes devem explicar por que estão desabilitados.

### 9.2 Alteração no rascunho

Mudar estado ou cidade atualiza apenas opções e draft. Não consulta.

### 9.3 URL inválida

Exemplo:

```text
?state=MG&city=São%20Paulo&neighborhood=Moema
```

Resultado canônico:

```text
state=MG
city removida
neighborhood removido
```

A normalização usa `replaceState`, pois corrige a mesma intenção inválida, não cria nova intenção.

## 10. Contrato do CEP

### 10.1 Função

CEP é um resolvedor transitório de localização, não filtro persistível.

### 10.2 Estados

- `CEP_IDLE`;
- `CEP_EDITING`;
- `CEP_RESOLVING`;
- `CEP_RESOLVED`;
- `CEP_INVALID`;
- `CEP_UNAVAILABLE`.

### 10.3 Regras

- máscara não altera valor semântico;
- oito dígitos habilitam resolução;
- `Enter` resolve, não aplica filtros;
- `blur` não deve iniciar efeito remoto inesperado;
- sucesso atualiza draft de state/city/neighborhood;
- erro usa texto associado por `aria-describedby`;
- `aria-invalid` acompanha estado;
- botão `Aplicar` continua sendo a única confirmação;
- CEP bruto não entra na URL, analytics ou perfil;
- CEP resolvido pode ser descartado ao cancelar o painel.

## 11. Compatibilidade por modo

| Filtro | services | users | workers | before-after |
|---|---:|---:|---:|---:|
| categorias de serviço | sim | não | não | não |
| localização | sim | não | não | não |
| avaliação mínima | sim | não | não | não |
| garantia | sim | não | não | não |
| emergência | sim | não | não | não |
| online | sim | não | não | não |
| disponível hoje | sim | não | não | não |

### 11.1 Troca para modo incompatível

Contrato recomendado:

1. invalidar request e cursor anteriores;
2. remover filtros service-only da URL ativa;
3. esconder/desabilitar trigger de filtros;
4. remover chips incompatíveis;
5. consultar/renderizar o modo selecionado;
6. não declarar que filtros foram aplicados.

É permitido preservar uma cópia efêmera de `lastAppliedServiceFilters` para retorno no mesmo runtime, desde que:

- não seja autoridade persistente;
- não contamine URL do modo atual;
- não seja sincronizada com conta;
- refresh permaneça reproduzível pela URL.

### 11.2 Retorno a `services`

Duas políticas são aceitáveis, desde que uma seja escolhida e testada:

A. restaurar `lastAppliedServiceFilters` apenas na sessão de runtime;
B. retornar aos defaults.

Política preferida para previsibilidade inicial: **B — defaults**, até existir justificativa de produto para retenção efêmera.

## 12. URL canônica

### 12.1 Parâmetros

| Parâmetro | Forma canônica |
|---|---|
| `q` | string trimada |
| `type` | enum explícito quando necessário |
| `category` | repetível |
| `state` | string validada |
| `city` | string validada |
| `neighborhood` | string validada |
| `minRating` | decimal aceito |
| `guaranteed` | `1` |
| `emergency` | `1` |
| `online` | `1` |
| `availableToday` | `1` |

### 12.2 Não persistíveis

- painel aberto/fechado;
- draft;
- CEP bruto;
- foco;
- scroll;
- loading;
- erro transitório;
- cursor de página anexada, salvo decisão específica futura.

O parâmetro histórico `filters=open` deve ser tratado como UI transitória/compatibilidade, não como parte do fingerprint de busca.

### 12.3 Ordem estável

Ordem recomendada:

```text
q
type
category...
state
city
neighborhood
minRating
guaranteed
emergency
online
availableToday
```

URL equivalente deve serializar de forma idêntica.

### 12.4 Histórico do navegador

| Evento | Método |
|---|---|
| bootstrap | nenhum ou `replaceState` para normalização |
| submit de query | `pushState` |
| aplicar filtros dirty | `pushState` |
| remover chip | `pushState` |
| limpar filtros aplicados | `pushState` |
| paginação | sem entrada |
| normalizar alias inválido | `replaceState` |
| reabrir/fechar painel | sem URL |

### 12.5 `popstate`

Ao voltar/avançar:

```text
URL
→ parse/normalize
→ appliedFilters
→ draftFilters
→ controles
→ invalidate cursor
→ latest-wins request
```

A coleção não pode permanecer com filtros da entrada seguinte.

## 13. Chips ativos

### 13.1 Composição

- cada categoria: um chip;
- localização: um único chip hierárquico;
- avaliação: um chip;
- cada boolean ativo: um chip;
- query excluída;
- type excluído;
- filtros incompatíveis excluídos.

### 13.2 Localização hierárquica

Exemplos:

```text
MG
Belo Horizonte - MG
Savassi, Belo Horizonte - MG
```

Não renderizar três chips redundantes para estado, cidade e bairro.

### 13.3 Remoção

Ao remover localização, remover state/city/neighborhood juntos.

Ao remover uma categoria, preservar as demais.

Ao remover chip:

1. atualizar applied;
2. sincronizar draft;
3. `pushState` uma vez;
4. invalidar cursor;
5. consultar uma vez;
6. preservar foco previsível.

### 13.4 Contagem

```text
activeFilterCount = renderedRemovableChips.length
```

Exibição recomendada:

```text
Filtros
Filtros (3)
```

O badge deve possuir texto acessível completo.

## 14. Contrato desktop

- painel inline, não modal;
- sem focus trap;
- collapse não altera applied;
- collapse com draft dirty deve descartar explicitamente ou solicitar confirmação; política preferida inicial: restaurar applied e descartar draft;
- `Aplicar` inicia uma única consulta;
- controles continuam operáveis durante resultados carregados;
- loading da coleção não desmonta painel;
- botão pode ficar desabilitado quando draft = applied;
- painel não deve deslocar cards de forma inesperada durante hydration.

## 15. Contrato mobile/tablet estreito

Breakpoint funcional observado:

```text
max-width: 960px → drawer/modal lateral
min-width: 961px → painel inline
```

### 15.1 Abertura

- salvar `returnFocusElement`;
- clonar applied para draft;
- ativar scroll lock;
- adicionar semântica de dialog/modal ao painel;
- tornar fundo não interativo;
- mover foco para título ou primeiro controle útil;
- atualizar `aria-expanded=true`.

### 15.2 Durante abertura

- foco contido;
- backdrop fora da ordem de tabulação;
- conteúdo atrás não recebe click/toque;
- botão fechar acessível;
- título identifica a tarefa;
- ações permanecem alcançáveis em viewport baixa;
- safe areas são respeitadas;
- scroll ocorre dentro do painel, não em duas camadas simultâneas.

### 15.3 Fechamento sem aplicar

- `Escape`, backdrop e fechar executam cancelamento;
- draft volta a applied;
- URL e coleção permanecem;
- scroll lock removido;
- foco retorna ao acionador;
- `aria-expanded=false`.

### 15.4 Aplicar

- validar;
- commit da intenção;
- fechar drawer;
- retornar foco ao acionador;
- anunciar atualização;
- request pode continuar após fechamento;
- trigger comunica loading sem ficar permanentemente desabilitado.

### 15.5 Botão Voltar do navegador com drawer aberto

Como o estado aberto não pertence à URL, política recomendada:

- primeiro Back fecha o drawer somente se a integração de history overlay for implementada conscientemente;
- caso contrário, não inserir entrada artificial apenas para o drawer;
- comportamento deve ser testado com stable router para não sair da página acidentalmente.

Não implementar interceptação parcial sem contrato global de overlays.

## 16. Mudança de breakpoint

### Mobile → desktop

- remover modal semantics;
- remover scroll lock/inert;
- preservar draft;
- manter painel visível se estava aberto ou dirty;
- não aplicar.

### Desktop → mobile

- preservar draft;
- se painel estava aberto, migrar para drawer aberto;
- se estava colapsado, permanecer fechado;
- configurar returnFocus para o trigger móvel;
- não aplicar nem descartar.

Nenhuma mudança de viewport inicia request.

## 17. Integração com UX-FOUNDATION-002

Aplicar filtros cria nova busca inicial:

- política: `LATEST_WINS`;
- cursor anterior invalidado;
- paginação em andamento cancelada/ignorada;
- fingerprint inclui query, type e applied filters;
- resposta obsoleta não altera DOM;
- draft nunca entra no fingerprint;
- paginação usa somente applied filters.

Se o usuário altera draft enquanto request aplicado carrega:

- request continua representando applied;
- UI pode mostrar draft dirty;
- clicar Apply cria nova geração;
- cancelar restaura controles sem interferir no request atual.

## 18. Loading, erro e retry

### 18.1 Aplicação

- botão `Aplicar` usa `aria-busy`;
- impedir submit duplicado;
- painel não deve anunciar sucesso antes de request aceitar a intenção;
- coleção usa loading contextual;
- skeleton inicial completo não reaparece.

### 18.2 Erro de busca

Filtros continuam aplicados e presentes na URL.

Ações:

- retry com mesmo fingerprint;
- editar filtros;
- limpar filtros.

Não restaurar resultado anterior como se correspondesse à nova URL.

### 18.3 Erro de validação

- nenhum commit;
- painel permanece aberto;
- foco vai para primeiro campo inválido;
- mensagem textual;
- URL e coleção antigas permanecem.

### 18.4 Erro de resolução de CEP

- draft de localização anterior preservado;
- CEP marcado inválido;
- nenhum request;
- usuário pode corrigir ou cancelar.

## 19. Estado vazio

O empty state deve diferenciar:

1. query sem correspondência;
2. filtros muito restritivos;
3. catálogo sem itens;
4. autoridade indisponível.

Quando filtros ativos contribuírem para vazio:

- mostrar chips aplicados;
- oferecer `Limpar filtros` como commit direto;
- não chamar o botão do painel sem abrir painel;
- ação deve efetivamente remover parâmetros antes de consultar.

## 20. Acessibilidade

### 20.1 Trigger

- `aria-controls="results-filters-panel"`;
- `aria-expanded` verdadeiro somente quando painel visível;
- nome inclui contagem quando houver;
- foco visível;
- área mínima de toque.

### 20.2 Painel mobile

- `role="dialog"` e `aria-modal="true"` somente no modo modal;
- `aria-labelledby` para título;
- foco inicial previsível;
- focus trap completo;
- `Escape` fecha;
- retorno de foco;
- fundo inert;
- scroll lock;
- leitor de tela não navega no conteúdo coberto.

### 20.3 Controles

- category checkbox mantém input semântico;
- foco visível no span associado;
- checked não depende apenas de cor;
- selects possuem label persistente;
- campos dependentes desabilitados usam `disabled` real;
- erro de CEP usa `aria-describedby`;
- grupos possuem `fieldset/legend` quando apropriado.

### 20.4 Chips removíveis

Exemplo semântico:

```html
<button type="button" aria-label="Remover filtro categoria Limpeza">
  Limpeza
  <span aria-hidden="true">×</span>
</button>
```

### 20.5 Anúncios

- aplicação concluída: região polite informa quantidade;
- não anunciar cada alteração de draft;
- loading não deve gerar repetição excessiva;
- reset informa `Filtros removidos`.

## 21. Segurança e privacidade

- CEP bruto não persiste;
- localização de filtro não é automaticamente salva no perfil;
- URL pode expor localização selecionada; não incluir endereço exato;
- não instrumentar combinação bruta sem aprovação de analytics/privacy;
- filtros não alteram ranking por sinais client-controlled;
- não confiar em valores da URL sem validação server-side;
- UI não inventa garantia, disponibilidade ou emergência.

## 22. Matriz de QA

### P0 — aplicação versus rascunho

1. abrir painel com filtros aplicados;
2. marcar checkbox sem aplicar;
3. fechar por botão;
4. fechar por backdrop;
5. fechar por Escape;
6. confirmar coleção e URL inalteradas;
7. reabrir e confirmar controles restaurados;
8. alterar três controles e aplicar;
9. confirmar uma única requisição;
10. clicar Apply duas vezes rapidamente;
11. draft igual ao applied desabilita/no-op;
12. alterar durante request em andamento.

### P0 — limpar

1. Limpar dentro do painel;
2. confirmar que apenas draft muda;
3. cancelar após limpar;
4. confirmar applied preservado;
5. limpar e aplicar;
6. confirmar URL sem filtros;
7. empty-state limpar filtros;
8. confirmar parâmetros removidos antes da request;
9. categorias inicialmente vindas da URL;
10. location inicialmente vinda da URL.

### P0 — modos

1. services com filtros;
2. trocar para users;
3. confirmar filtros/chips/contagem incompatíveis ausentes;
4. trocar para workers;
5. trocar para before-after;
6. refresh em modo não-service sem params service-only;
7. retornar para services;
8. validar política escolhida de restauração/default.

### P0 — URL e histórico

1. aplicar conjunto A;
2. aplicar conjunto B;
3. Back restaura A;
4. Forward restaura B;
5. refresh reproduz B;
6. URL com alias acentuado;
7. URL com city incompatível;
8. URL com categoria duplicada;
9. URL com boolean inválido;
10. navegação interna versus load direto.

### P1 — localização

1. state vazio;
2. state selecionado;
3. city selecionada;
4. neighborhood selecionado;
5. mudar state;
6. mudar city;
7. cancelar alterações;
8. aplicar alterações;
9. opção inválida;
10. texto longo em select.

### P1 — CEP

1. menos de oito dígitos;
2. CEP válido;
3. CEP inválido;
4. Enter;
5. blur;
6. Escape;
7. cancelar painel após resolução;
8. aplicar após resolução;
9. storage/lookup indisponível;
10. leitor de tela recebe erro.

### P1 — responsividade

1. 959px;
2. 960px;
3. 961px;
4. 962px;
5. abrir mobile e crescer para desktop;
6. editar desktop e reduzir para mobile;
7. orientação portrait/landscape;
8. viewport baixa com teclado virtual;
9. safe area;
10. ausência de double scroll.

### P1 — acessibilidade

1. abrir por teclado;
2. foco inicial;
3. Tab/Shift+Tab;
4. Escape;
5. retorno de foco;
6. fundo inert;
7. checked perceptível sem cor;
8. disabled anunciado;
9. erro de validação;
10. remoção de chip;
11. anúncio de resultados;
12. zoom 200%.

### P1 — concorrência

1. aplicar A e rapidamente B;
2. resposta A depois de B;
3. paginação durante nova aplicação;
4. sair da rota durante aplicação;
5. service created event durante draft dirty;
6. retry após erro;
7. request duplicada por change + submit deve ser zero;
8. CEP + Apply produz uma request.

## 23. Handoffs de implementação recomendados

A implementação deve ocorrer em branches próprias, não nesta branch documental.

### SEARCH-UX-F01 — separar applied e draft

Causa raiz:

- formulário é lido diretamente por toda renderização;
- `change` dispara consulta.

Autoridade provável:

- `assets/js/pages/search-results.js`;
- utilitário de estado/fingerprint específico, se necessário.

Critérios:

- applied/draft explícitos;
- change sem request;
- Apply com uma request;
- cancel restaura;
- testes determinísticos.

### SEARCH-UX-F02 — reset canônico

Causa raiz:

- botão do painel sem handler;
- reset externo reconstrói valores a partir dos parâmetros antigos.

Critérios:

- defaults explícitos;
- clear draft e clear applied distintos;
- parâmetros removidos antes da consulta;
- categorias/location realmente limpas.

### SEARCH-UX-F03 — URL e popstate

Causa raiz:

- `replaceState` para toda intenção.

Critérios:

- push para intenções do usuário;
- replace para normalização;
- Back/Forward reproduz estados;
- stable router validado;
- aliases normalizados.

### SEARCH-UX-F04 — drawer acessível

Autoridade provável:

- controller da página para lifecycle;
- pattern/overlay compartilhado para focus trap, inert e scroll lock;
- CSS de página apenas para layout.

Critérios:

- semantics condicionais por breakpoint;
- Escape/backdrop/close equivalentes;
- foco contido e devolvido;
- draft preservado em resize;
- sem double scroll.

### SEARCH-UX-F05 — chips e contagem

Critérios:

- chips derivados de applied;
- localização consolidada;
- remoção individual;
- count igual aos chips;
- uma request por remoção;
- foco preservado.

### SEARCH-UX-F06 — compatibilidade por modo

Dependência:

- decisão de produto sobre pools locais.

Critérios:

- filtros service-only não aparecem como ativos em outros modos;
- URL limpa;
- linguagem honesta;
- refresh reproduzível.

### SEARCH-UX-F07 — CEP como resolvedor de draft

Critérios:

- sem auto-apply;
- erro textual;
- sem CEP na URL;
- cancelamento restaura location aplicada;
- uma request apenas no Apply.

## 24. Arquivos permitidos no futuro

Conforme o handoff e a causa raiz:

- `assets/js/pages/search-results.js`;
- módulo compartilhado de overlay/focus existente;
- módulo de URL/fingerprint da busca, se já houver autoridade adequada;
- `resultados.html` apenas para semântica necessária;
- `assets/css/pages/results/filters.css` apenas para layout/contexto;
- `assets/css/pages/results/shell.css` apenas para composição responsiva;
- componente compartilhado de chips/filters;
- testes e auditorias;
- documentação e evidência.

## 25. Arquivos e abordagens proibidos como remendo

- duplicar formulário desktop/mobile;
- criar estado aplicado em localStorage;
- usar CSS para esconder inconsistência lógica;
- novo listener de change que consulta;
- inline style;
- `!important`;
- reset por reload da página;
- manipular URL sem normalização;
- manter filtros incompatíveis silenciosamente;
- criar focus trap local se já houver pattern compartilhado;
- alterar Edge/ranking para corrigir UX;
- misturar este lote com pagamentos, pedidos ou mensagens.

## 26. Riscos de regressão

- stable router não reinicializar em popstate;
- pushState excessivo;
- dupla consulta em submit;
- cursor sobreviver a filtro novo;
- filtro local entrar em request remoto incorreto;
- drawer prender foco após route leaving;
- scroll lock permanecer;
- DokeUiSelect ficar dessincronizado do draft;
- category checkbox perder default/checked;
- CEP resolver após cancelamento e modificar draft obsoleto;
- chips removerem valor visual sem alterar applied;
- breakpoint descartar rascunho;
- empty reset manter parâmetros antigos;
- evento de atualização de serviço ignorar filtros aplicados.

## 27. Validação deste sublote

Executado:

- confirmação do head lógico e do PR documental;
- inspeção da estrutura de filtros em `resultados.html`;
- inspeção do controller `search-results.js`;
- inspeção de bootstrap e persistência de URL;
- inspeção de dependências state/city/neighborhood;
- inspeção do fluxo de CEP;
- inspeção dos listeners de change, submit, reset, resize e modo;
- inspeção da composição responsiva em `results/shell.css`;
- inspeção da anatomia em `results/filters.css`;
- modelagem de applied/draft/UI;
- definição de normalização, URL, chips, contagem e QA.

Não executado:

- alteração de runtime;
- servidor local;
- Playwright;
- testes automatizados;
- screenshots;
- leitor de tela;
- staging;
- produção.

Justificativa: este sublote é exclusivamente documental.

## 28. Resultado

`UX-FOUNDATION-003` fecha seis decisões:

1. filtros aplicados, rascunho e estado visual são independentes;
2. `change` não deve consultar enquanto existir `Aplicar`;
3. reset precisa substituir dados e URL antes da consulta;
4. filtros atuais são exclusivos de serviços;
5. URL aplicada deve participar corretamente do histórico;
6. drawer mobile precisa de lifecycle completo de modal e foco.

## 29. Próximo sublote recomendado

`UX-FOUNDATION-004 — estados parciais dos rails da Home`.

O próximo documento deverá definir:

- loading por rail;
- ready, empty, error e retry;
- prioridade editorial;
- skeleton por anatomia;
- setas e overflow;
- conteúdo parcial sem derrubar a Home;
- convergência pré/pós-hidratação;
- acessibilidade de rails;
- matriz desktop/tablet/mobile;
- handoffs por família de componente.
