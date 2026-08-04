# UX-FOUNDATION-001 — preparação de produto, UX e QA

## Status

- fase: `DISCOVERY_AND_SPECIFICATION`;
- branch: `ux/ux-foundation-001`;
- base imutável inicial: `26608c8acd8153daec8ed09540c59a5ecd1e9cc4`;
- base lógica correspondente: `pay/pay-001-baseline-audit`;
- produção: bloqueada;
- staging: não acessado;
- alterações de runtime: zero;
- alterações em HTML/CSS/JS: zero;
- migrations, workflows, secrets e configurações remotas: zero.

Este lote prepara decisões de interface, critérios de aceite e uma fila de implementação sem competir com a frente lógica atual.

## 1. Contrato de não interferência

Esta branch não pode:

1. alterar arquivos de autenticação, catálogo, busca, pedidos, agenda, mensagens ou pagamentos;
2. aplicar migrations, executar canários remotos, alterar staging ou produção;
3. editar `index.html`, `resultados.html`, CSS ou JavaScript enquanto a fase estiver marcada como `DISCOVERY_AND_SPECIFICATION`;
4. reescrever componentes compartilhados antes de identificar a autoridade canônica;
5. criar um segundo design system ou duplicar contratos existentes;
6. ser mesclada sem autorização explícita do proprietário do repositório.

Esta branch pode:

1. documentar inventário de superfícies e fluxos;
2. registrar problemas, riscos e dependências;
3. definir critérios de aceite objetivos;
4. preparar handoffs para futuras branches de implementação;
5. criar matrizes de QA e checklists de validação;
6. propor mudanças sem aplicá-las ao runtime.

## 2. Autoridades existentes que devem ser preservadas

A frente UX deve consumir, e não substituir, os contratos existentes:

- `docs/BASELINE-VISUAL-APPROVED.md` — baseline congelado da Home e superfícies sensíveis;
- `docs/DOKE-UI-STANDARD-v2.md` — direção visual e padrões normativos;
- `docs/DESIGN-SYSTEM-GUIDE.md` — uso de tokens, componentes e estados;
- `docs/SURFACE-CONTRACT.md` — fronteira entre anatomia compartilhada e layout de página;
- `assets/css/core/tokens.css` — autoridade de tokens;
- `assets/css/components/**` — anatomia de componentes compartilhados;
- `assets/css/patterns/**` — composições reutilizáveis;
- `assets/css/pages/**` — apenas layout e contexto específicos de página.

Regra central: `index.html` permanece referência visual para cards, rails, busca e densidade. Páginas consumidoras não devem copiar o CSS local da Home; devem consumir a autoridade compartilhada correspondente.

## 3. Diagnóstico inicial

### 3.1 Estado positivo já presente

A inspeção do head inicial confirmou:

- Home e Resultados usam o shell global e contratos explícitos de header;
- ambas as páginas expõem estados `loading`, `empty` e `error`;
- a busca principal já consome `doke-search-pill` e classes compartilhadas;
- Resultados já possui skeleton de hidratação;
- filtros e escopos usam contratos compartilhados como `doke-tab-pill` e `doke-filter-pill`;
- a anatomia dos cards de anúncio em Resultados já possui uma fronteira documentada contra redesign local;
- a autoridade de busca e favoritos está sendo tratada pela frente lógica, não por esta branch.

### 3.2 Riscos estruturais observados

Os riscos abaixo não autorizam alteração imediata. Eles devem orientar auditoria e handoff:

1. **Duplicação semântica de busca**  
   Home e Resultados possuem busca no header e busca principal. A especificação precisa diferenciar claramente busca rápida, busca de página e abertura mobile para evitar estados divergentes.

2. **Complexidade de hidratação**  
   As páginas possuem preloaders, skeletons, shell assíncrono e navegação interna. O aceite visual precisa comparar carregamento direto, F5 e navegação por `DokeNavigate(...)`.

3. **Fronteira entre página e componente**  
   Home e Resultados combinam classes de domínio com contratos compartilhados. Qualquer implementação futura deve provar que alterações em `pages/*` tratam somente layout, densidade e posicionamento.

4. **Estados incompletos por superfície**  
   O boundary geral possui estados, mas cada rail, lista, dropdown, filtro e bloco de recomendação também precisa de comportamento definido para carregamento, vazio, erro parcial e retry.

5. **Acessibilidade operacional**  
   Elementos com dropdown, filtros, radiogroups, menus e drawers precisam de critérios explícitos para teclado, foco, `Escape`, retorno de foco e leitores de tela.

6. **Responsividade pós-hidratação**  
   O baseline já registra risco histórico de o primeiro frame estar correto e o estado final quebrar. Toda mudança futura deve validar convergência visual antes e depois da montagem do shell.

## 4. Inventário inicial de superfícies

| ID | Superfície | Página | Autoridade esperada | Estado da especificação |
|---|---|---|---|---|
| UX-S01 | shell, sidebar e header | Home/Resultados | shell global | inventariada |
| UX-S02 | busca rápida do header | Home/Resultados | componente de busca/header | pendente |
| UX-S03 | busca principal | Home/Resultados | `components/search` | inventariada |
| UX-S04 | dropdown de busca | Home/Resultados | padrão compartilhado de busca | pendente |
| UX-S05 | categorias | Home | pattern de rail + item de categoria | pendente |
| UX-S06 | cards de anúncio | Home/Resultados | `components/cards/ad-card.css` | inventariada |
| UX-S07 | favoritos | Home/Resultados | controlador lógico canônico + componente de ação | dependente de SEARCH |
| UX-S08 | workers | Home/Resultados | componente compartilhado de profissional | pendente |
| UX-S09 | publicações | Home/Resultados | componente compartilhado de publicação | pendente |
| UX-S10 | filtros | Resultados | filters/dropdowns compartilhados | inventariada |
| UX-S11 | skeleton de hidratação | Home/Resultados | estado compartilhado + composição local | pendente |
| UX-S12 | estados vazio/erro/retry | Home/Resultados | state contract | pendente |
| UX-S13 | paginação/carregamento progressivo | Resultados | domínio de busca + padrão de lista | dependente de SEARCH |
| UX-S14 | footer público | Resultados | shell/footer compartilhado | pendente |

## 5. Critérios de aceite — Home

A Home só poderá receber um lote de implementação quando os critérios abaixo estiverem associados a evidência reproduzível.

### 5.1 Estrutura e baseline

- preservar o baseline visual congelado;
- nenhuma alteração estética solta em `index.html`;
- nenhum CSS local novo para anatomia já existente;
- ausência de overflow horizontal em desktop, tablet e telefone;
- header, conteúdo, rails e footer alinhados ao grid canônico;
- primeiro frame e estado pós-hidratação visualmente convergentes.

### 5.2 Busca

- busca rápida e busca principal têm responsabilidades distintas e documentadas;
- query submetida é preservada ao navegar para Resultados;
- dropdown não desloca o layout da página;
- foco abre o conteúdo correto sem piscar;
- `Escape` fecha o dropdown e devolve foco ao acionador/campo;
- estado vazio explica que nenhum resultado foi encontrado;
- falha remota não apresenta dados antigos como atuais;
- histórico, sugestões e resultados possuem rótulos acessíveis.

### 5.3 Rails e cards

- cards não mudam de anatomia entre rails equivalentes;
- setas aparecem somente quando existe conteúdo fora da viewport;
- navegação por teclado não prende o usuário no rail;
- imagens possuem dimensões reservadas para evitar layout shift;
- CTA e favorito mantêm áreas de toque adequadas;
- skeleton preserva aproximadamente a geometria do estado carregado;
- lista vazia não mantém trilho ou setas sem função.

### 5.4 Estados

Cada rail deve definir:

- `loading` — skeleton local sem bloquear o restante da Home;
- `ready` — conteúdo real;
- `empty` — bloco omitido ou estado vazio útil, conforme importância;
- `error` — falha localizada sem derrubar a página completa;
- `retry` — somente quando a repetição da chamada for segura.

## 6. Critérios de aceite — Resultados

### 6.1 Busca e URL

- query, escopo, localização, filtros e ordenação possuem fonte de verdade definida;
- refresh reproduz o mesmo estado de busca quando os parâmetros forem persistíveis;
- navegação de retorno não perde filtros sem motivo;
- ausência de query produz estado orientativo, não uma tela quebrada;
- troca de escopo não mistura cards de contratos diferentes;
- submissões concorrentes não deixam resultados antigos vencerem a busca mais recente.

### 6.2 Filtros

- desktop e mobile representam o mesmo estado lógico;
- painel mobile possui foco contido, fechamento por `Escape` e retorno de foco;
- aplicar filtros atualiza resultado e resumo visível;
- limpar filtros restaura o estado inicial previsto;
- filtros indisponíveis são desabilitados com explicação, não removidos silenciosamente;
- nenhum filtro depende apenas de cor para indicar seleção;
- contagem de filtros ativos é consistente entre toolbar e painel.

### 6.3 Cards e densidade

- cards consomem a anatomia compartilhada de anúncio;
- `pages/search-results.css` pode controlar apenas grid, densidade contextual e encaixe;
- título, mídia, metadados, CTA e favorito mantêm ordem previsível;
- textos longos não quebram a altura mínima nem sobrepõem ações;
- preço sob orçamento, preço fixo e ausência de preço possuem apresentações distintas;
- identidade do profissional e estado de verificação não podem ser simulados pelo frontend;
- skeleton e card carregado ocupam geometrias compatíveis para limitar CLS.

### 6.4 Estados da coleção

- carregamento inicial;
- carregamento de próxima página;
- vazio informativo;
- erro recuperável;
- erro não recuperável;
- cursor inválido/expirado;
- resultado parcial por tipo;
- fim da coleção;
- favorito em atualização;
- sessão ausente ao favoritar.

Cada estado deve especificar mensagem, ação possível, foco e impacto no conteúdo existente.

## 7. Matriz mínima de viewports

| Classe | Viewport de referência | Objetivo |
|---|---:|---|
| telefone compacto | 360 × 800 | detectar overflow, corte e alvos pequenos |
| telefone amplo | 430 × 932 | validar rails e drawers |
| tablet retrato | 768 × 1024 | validar transição de shell e grids |
| tablet paisagem | 1024 × 768 | validar densidade e sidebar/header |
| desktop | 1440 × 900 | baseline principal |
| desktop amplo | 1920 × 1080 | limitar linhas excessivas e largura de leitura |

A matriz não substitui testes responsivos intermediários. Breakpoints devem ser validados próximo aos pontos reais definidos no CSS.

## 8. Matriz mínima de interação

Para cada superfície interativa:

- mouse;
- teclado;
- toque;
- foco visível;
- `Tab` e `Shift+Tab`;
- `Enter` e `Space` quando aplicáveis;
- `Escape` em overlays e menus;
- refresh direto;
- navegação interna;
- sessão anônima;
- sessão autenticada;
- conexão lenta;
- erro remoto controlado.

## 9. Backlog inicial

### P0 — especificação antes de implementação

1. mapear a máquina de estados da busca Home → Resultados;
2. definir contrato de filtros desktop/mobile;
3. definir estados parciais dos rails da Home;
4. criar matriz de cards e variantes permitidas;
5. criar checklist de hidratação direta versus navegação interna;
6. mapear ownership de cada CSS/JS envolvido antes de qualquer patch.

### P1 — preparação de QA

1. casos de teclado e foco;
2. casos de sessão anônima/autenticada;
3. casos de query vazia, sem resultados e falha remota;
4. casos de conteúdo longo e mídia ausente;
5. casos de cursor/paginação;
6. casos de favoritos em múltiplas superfícies.

### P2 — handoff de implementação

Somente após P0 e P1:

1. dividir mudanças por família: busca, filtros, cards, rails, estados ou shell;
2. criar uma branch de implementação por família;
3. manter PRs pequenos e empilhados quando houver dependência;
4. exigir validação visual e regressão estrutural antes de avançar;
5. não misturar redesign com migração estrutural no mesmo lote.

## 10. Formato obrigatório de futuros handoffs

Cada handoff de implementação deve registrar:

- problema observado;
- causa raiz;
- comportamento esperado;
- autoridade correta do arquivo/componente;
- arquivos permitidos;
- arquivos proibidos;
- dependências da frente lógica;
- critérios de aceite;
- riscos de regressão;
- testes automáticos;
- testes visuais;
- evidências produzidas;
- rollback.

## 11. Validação deste lote

Executado:

- inspeção de PRs abertos e cadeia lógica atual;
- confirmação do head base imutável;
- leitura dos contratos visuais normativos;
- inspeção estrutural de `index.html` e `resultados.html`;
- criação de branch isolada documental.

Não executado:

- testes automatizados;
- servidor local;
- Playwright;
- screenshots comparativas;
- validação visual em navegador;
- staging;
- produção.

Justificativa: este primeiro commit altera apenas documentação e não modifica runtime.

## 12. Próximo sublote recomendado

`UX-FOUNDATION-002 — máquina de estados da busca Home → Resultados`.

O próximo documento deverá definir:

- eventos;
- estados;
- transições;
- URL e parâmetros persistíveis;
- concorrência e cancelamento;
- comportamento anônimo/autenticado;
- dropdown desktop/mobile;
- empty/error/retry;
- critérios de acessibilidade;
- dependências de SEARCH-001.
