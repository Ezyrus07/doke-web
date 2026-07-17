# Contrato canônico de navegação e lifecycle — Doke Web

Status: **ativo — Etapa 9; superfícies pending de guard/contexto implementadas no lote 2**
Escopo: navegação, primeiro paint, guards, hidratação, skeletons, histórico, scroll e feedback operacional.
Exclusão: nenhuma mudança runtime em `comunidade-interna.html` ou no CSS da Comunidade.

## 1. Invariável principal

A aplicação nunca pode ficar sem uma superfície explícita. Em qualquer instante deve existir exatamente uma transição coerente entre:

1. boot de documento, apenas em entrada documental;
2. conteúdo estático pronto ou conteúdo anterior preservado;
3. superfície pending explícita quando a espera é de autenticação, papel ou contexto;
4. skeleton estrutural quando existem dados ainda desconhecidos;
5. conteúdo pronto, empty state ou erro recuperável.

`boot oculto + conteúdo estático/preservado ausente + pending oculto + skeleton oculto + conteúdo dinâmico oculto + erro oculto` é estado inválido.

## 2. Autoridades

| Responsabilidade | Autoridade canônica | Adapter/implementação |
|---|---|---|
| Estado global de navegação e lifecycle | `assets/js/core/navigation-lifecycle.js` | Decide uma vez o modo de entrada e expõe estado observável de documento, rota, página e guard. |
| Boot de documento | `Doke.navigationLifecycle.document` | `assets/js/core/document-preloader.js` é adapter visual; não decide readiness de dados ou guard. |
| Lifecycle/hidratação | `Doke.pageLifecycle` | `assets/js/core/page-hydration.js` renderiza pending/skeleton/ready/empty/error e publica estados na fachada. |
| Navegação | `Doke.navigation.go` / `window.DokeNavigate` | `stable-shell-router.js` é adapter prioritário; `app.js` é fallback legado; navegação de documento é último recurso. |
| Histórico e restore | `Doke.navigationLifecycle` | Uma única escuta de `popstate`; adapters recebem `skipHistory` e `restoreScroll`. |
| Registro de rotas | `assets/js/core/navigation-registry.js` | Responsável apenas por metadados e seleção de superfície. |
| Auth guard de conta | `assets/js/services/account-access-service.js` | Autoridade compartilhada para superfícies privadas de perfil, configurações, pedidos, mensagens e pagamento. |
| Guard profissional | `assets/js/services/professional-access-service.js` | Autoridade de papel/verificação para publicar serviços e superfícies profissionais. |
| Guard administrativo | `assets/js/services/admin-access-service.js` | Autoridade de autenticação e permissão administrativa. |
| Feedback operacional | `assets/js/components/operational-event-toast.js` e controles locais | Não reutiliza splash ou skeleton de página. |


## 2.1. Fachada implementada na Etapa 2

A fachada `assets/js/core/navigation-lifecycle.js` está carregada antes dos adapters nas superfícies de produção, exceto nas exclusões explícitas da Comunidade interna.

APIs públicas:

- `Doke.navigation.go(url, options)` e o alias compatível `window.DokeNavigate`;
- `Doke.navigation.warm(url)`;
- `Doke.navigation.guard(options)`;
- `Doke.navigation.transition` para estado de rota;
- `Doke.pageLifecycle` para estado de hidratação;
- `window.DokeNavigationLifecycle` para diagnóstico e integração controlada.

Precedência dos adapters:

1. `stable-shell` — prioridade 100;
2. `legacy-shell` — prioridade 20;
3. navegação de documento — fallback quando nenhum adapter pode tratar a URL.

A Etapa 2 não remove os routers existentes. Ela os transforma em adapters atrás de uma única entrada pública e impede que `app.js` e `stable-shell-router.js` instalem listeners concorrentes de `popstate` quando a fachada está presente.

A fachada também:

- mantém compatibilidade com `doke.internalRouteNavigation`;
- registra uma intenção estruturada em `doke.navigationIntent`;
- captura scroll antes da saída;
- restaura scroll em browser back/forward;
- publica datasets de diagnóstico em `html` e `body`;
- emite `doke:navigation-lifecycle-change` e eventos por domínio.

**Estado final da Etapa 9:** guards profissionais, administrativos e de conta publicam `begin/allow/redirect/fail` na fachada; rotas estáticas fazem commit direto; páginas de formulário protegidas ou dependentes de contexto usam pending explícito; skeleton permanece reservado a dados com geometria previsível. Adapters legados permanecem somente como compatibilidade para superfícies explicitamente excluídas.

## 3. Modos de entrada

### Hard load

Abrange F5, URL direta, nova aba e link externo. Sequências permitidas:

- rota estática/editorial: `document boot condicional → shell estável + conteúdo estático pronto`;
- rota protegida/de contexto: `document boot condicional → shell estável + pending explícito → conteúdo/error/redirect`;
- rota dependente de dados: `document boot condicional → shell estável + skeleton estrutural → conteúdo/empty/error`.

O boot não deve aguardar dados. Ele encerra quando o shell pode pintar. Conteúdo já presente e utilizável no HTML não pode ser ocultado para simular hidratação.

### Navegação interna

Abrange links internos, sidebar, bottom navigation e botões contextuais. Sequências:

- rota estática/editorial: `shell preservado → preparação de assets → commit direto do conteúdo pronto`;
- rota protegida/de contexto: `shell preservado → preparação de assets → commit direto do pending explícito → conteúdo/error/redirect`;
- rota dependente de dados sem cache: `shell preservado → rota em pending → skeleton estrutural local → conteúdo/empty/error`;
- rota dependente de dados com cache: `shell preservado → conteúdo anterior preservado → revalidação silenciosa → conteúdo atualizado`.

Proibido: splash global, documento branco, remoção do shell, reset de largura ou skeleton genérico para mascarar bootstrap de JavaScript.

### Guard

Abrange autenticação, papel, verificação e permissão. Sequência:

`guard-pending visível → decisão → conteúdo permitido OU replace para destino seguro`.

O guard nunca pode ocultar o conteúdo protegido sem fornecer uma superfície pending. Redirecionamentos obrigatórios usam semântica `replace`.

### Restore

Abrange back/forward. O router restaura rota e scroll quando houver shell válido. Não reproduz splash.

## 4. Política de histórico

| Caso | Método |
|---|---|
| Navegação voluntária normal | router canônico + `pushState` |
| Atualização da mesma rota/filtros | `replaceState` quando não deve criar nova entrada |
| Rota proibida, sessão expirada ou guard negado | `replace` |
| Saída externa ou download | navegação de documento explícita |
| Voltar | `history.back()` apenas quando existe fallback determinístico |

Atribuições diretas a `location.href` em controllers são dívida de migração e não devem crescer.

## 5. Política de scroll e foco

- Nova rota voluntária: topo da região principal, não necessariamente topo do documento.
- Back/forward: restaurar a posição registrada quando válida.
- Tab/painel interno: preservar posição por padrão.
- Modal: bloquear e restaurar scroll sem salto.
- Após troca de rota: foco no `h1` ou landmark principal quando apropriado.
- Guard redirect: não deixar foco preso na página de origem.

## 6. Política de skeleton

Skeleton representa conteúdo assíncrono ainda desconhecido cuja geometria final já é previsível. Ele não representa carregamento de script, leitura síncrona de preferência, binding de listeners ou simples entrada em outro HTML.

Quando necessário, o skeleton deve:

- aparecer no primeiro frame útil da região realmente dependente de dados;
- preservar largura, altura aproximada, colunas e densidade do componente final;
- ter `aria-hidden="true"`;
- manter somente o boundary correspondente com `aria-busy="true"` durante a hidratação;
- desaparecer somente quando conteúdo, empty ou erro estiver pronto;
- respeitar `prefers-reduced-motion`.

Rotas estáticas/editoriais iniciam em `ready`, sem contrato no registro de hidratação e sem hydration barrier. Rotas protegidas/de contexto podem permanecer como hydration barriers, mas usam `pending` textual explícito em vez de geometria falsa. Duração mínima não é sincronização. Qualquer anti-flash deve ser centralizado, curto e condicionado à percepção, nunca à lógica de negócio.

## 7. Feedback operacional

Ações como publicar, salvar, pagar e solicitar saque usam estado pending no controle acionado, mensagem de sucesso/erro e navegação posterior. Não acionam boot de documento e não substituem conteúdo por skeleton de página.

## 8. Contrato do fluxo obrigatório

`anunciar-servico.html → guard publish_service → verificacao-profissional.html` deve garantir:

1. conteúdo protegido nunca aparece antes da decisão;
2. enquanto o guard resolve, existe superfície pending visível;
3. decisão negada usa replace;
4. destino não mostra splash global em navegação proveniente do app;
5. pending explícito do destino aparece antes de qualquer conteúdo protegido ou dependente de contexto;
6. erro de repository produz estado recuperável, não página vazia.

## 8.1. Contrato das superfícies transacionais

`pedidos.html`, `mensagens.html` e `pagamento-profissional.html` obedecem a duas máquinas de estado independentes:

- **lifecycle da página:** `loading → ready | empty | error`;
- **operação local:** `idle → submitting → success | error`.

Regras obrigatórias:

1. a autorização da conta é resolvida antes de consultar ou projetar dados privados;
2. eventos genéricos de shell/autenticação não equivalem a `guard.allow`;
3. skeletons permanecem `aria-hidden="true"` e o boundary mantém `aria-busy="true"` durante a hidratação;
4. o pending de enviar mensagem, aceitar pedido, pagar ou concluir serviço pertence ao botão/modal acionado e não altera `data-view-state` da página;
5. o checkout só revela conteúdo após encontrar pedido, conversa e cobrança financeira válidos;
6. ausência de contexto financeiro produz erro recuperável, nunca valores mockados visíveis;
7. delays artificiais não podem sincronizar confirmação de pagamento ou conclusão;
8. cada rota possui uma única autoridade de inicialização no stable shell.

## 8.2. Contrato das superfícies públicas e editoriais

`resultados.html`, `detalhe-anuncio.html`, `novidades.html` e `ajuda.html` não compartilham um loading genérico:

- **resultados:** `loading estrutural de dados → busca válida → ready | empty | error`;
- **detalhe do anúncio:** `loading estrutural de dados → entidade válida → ready | empty | error`;
- **novidades:** `HTML editorial pronto → progressive enhancement síncrono`;
- **ajuda:** `HTML editorial pronto → progressive enhancement síncrono`.

Regras obrigatórias:

1. resultados e detalhe não exibem conteúdo provisional antes de o controller publicar o payload;
2. novidades e ajuda iniciam em `data-view-state="ready"` e `aria-busy="false"`;
3. novidades e ajuda não possuem skeleton de página, contrato em `ROUTE_SKELETON_CONTRACTS` nem hydration barrier no stable shell;
4. o stable shell prepara CSS e scripts das rotas estáticas antes do commit, mas não cria um estado visual intermediário falso;
5. `page-hydration.js` permanece carregado antes do router também nas rotas estáticas, pois a página de origem precisa conseguir navegar para destinos dinâmicos;
6. cada página exporta o initializer idempotente esperado pelo `ROUTE_INIT`;
7. filtros, modais, busca e demais interações são progressive enhancement: o conteúdo editorial continua legível caso o initializer falhe;
8. ausência de dependência interativa produz degradação controlada; falha de dados em resultados/detalhe produz erro recuperável.

## 8.3. Contrato das superfícies protegidas e dependentes de contexto

`configuracoes.html`, `orcamento.html`, `avaliacao-profissional.html`, `tornar-profissional.html` e `verificacao-profissional.html` não simulam listas ou cards enquanto autenticação, papel ou contexto são resolvidos.

Sequência canônica:

`pending explícito → guard/contexto válido → ready | error | redirect`.

Regras obrigatórias:

1. o pending descreve a decisão em andamento sem imitar conteúdo ainda inexistente;
2. o conteúdo protegido permanece oculto até a autorização e o contexto serem válidos;
3. essas rotas continuam como hydration barriers para impedir commit incompleto no stable shell;
4. `skeletonMode: 'never'` é obrigatório enquanto não houver consulta de dados com geometria final previsível;
5. falha produz estado recuperável com retry; negação obrigatória usa replace;
6. nenhum timer artificial pode substituir sinais de DOM, auth, conta, pedido, profissional ou serviço.

## 9. Sequência de implementação

1. Etapa 1 — auditoria e contrato canônico — **concluída**;
2. Etapa 2 — core de navigation/lifecycle — **concluída**;
3. Etapa 3 — `anunciar-servico` + `verificacao-profissional` — **concluída**;
4. Etapa 4 — admin — **concluída**;
5. Etapa 5 — perfis e configurações — **concluída**;
6. Etapa 6 — pedidos, mensagens e pagamento — **concluída**;
7. Etapa 7 — demais páginas — **concluída (lotes 1 e 2)**;
8. Etapa 8 — remoção de legado e auditoria final — **concluída**;
9. Etapa 9 — separar skeleton de dados e pending de guard/contexto — **em execução; lote 2 concluído**.

Nenhuma etapa deve migrar todas as páginas de uma vez.


## Política temporal final — Etapa 9

`Doke.navigationLifecycle.timing` é a única autoridade de duração mínima para superfícies de navegação.

- boot de documento: orçamento visual compartilhado de 180 ms;
- rotas estáticas/editoriais ignoram qualquer limiar de skeleton e fazem commit direto após a preparação de assets;
- decisão direct/pending/skeleton: rotas de guard/contexto fazem commit direto do pending; rotas de dados usam limiar compartilhado de 150 ms;
- hidratação de página: duração solicitada pelo controller é calculada contra o mesmo ciclo, nunca somada ao boot;
- `page-hydration.js` não controla nem oculta o splash global;
- `document-preloader.js` é o único proprietário da superfície de boot do documento;
- navegação voluntária usa `Doke.navigation.go`; retorno usa `Doke.navigation.back` com fallback determinístico.

A regra é **máximo entre os orçamentos solicitados no mesmo ciclo**, nunca soma sequencial de delays.
