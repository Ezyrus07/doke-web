# Contrato canônico de navegação e lifecycle — Doke Web

Status: **ativo — Etapa 7 em andamento (lote 1 implementado)**  
Escopo: navegação, primeiro paint, guards, hidratação, skeletons, histórico, scroll e feedback operacional.  
Exclusão: nenhuma mudança runtime em `comunidade-interna.html` ou no CSS da Comunidade.

## 1. Invariável principal

A aplicação nunca pode ficar sem uma superfície explícita. Em qualquer instante deve existir exatamente uma transição coerente entre:

1. boot de documento;
2. skeleton estrutural;
3. conteúdo pronto;
4. erro recuperável.

`boot oculto + skeleton oculto + conteúdo oculto + erro oculto` é estado inválido.

## 2. Autoridades

| Responsabilidade | Autoridade canônica | Adapter/implementação |
|---|---|---|
| Estado global de navegação e lifecycle | `assets/js/core/navigation-lifecycle.js` | Decide uma vez o modo de entrada e expõe estado observável de documento, rota, página e guard. |
| Boot de documento | `Doke.navigationLifecycle.document` | `assets/js/core/document-preloader.js` é adapter visual; não decide readiness de dados ou guard. |
| Lifecycle/hidratação | `Doke.pageLifecycle` | `assets/js/core/page-hydration.js` continua renderizando skeleton/ready/error e publica estados na fachada. |
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

**Estado atual:** guards profissionais, administrativos e de conta já publicam `begin/allow/redirect/fail` na fachada. A migração continua incremental; rotas ainda não contempladas permanecem dívida explícita, sem criar uma segunda autoridade.

## 3. Modos de entrada

### Hard load

Abrange F5, URL direta, nova aba e link externo. Sequência permitida:

`document boot condicional → shell estável → skeleton estrutural → conteúdo/empty/error`.

O boot não deve aguardar dados. Ele encerra quando o shell pode pintar e entrega imediatamente para o lifecycle da página.

### Navegação interna

Abrange links internos, sidebar, bottom navigation e botões contextuais. Sequência:

`shell preservado → rota em pending → skeleton estrutural ou conteúdo anterior preservado → conteúdo/empty/error`.

Proibido: splash global, documento branco, remoção do shell ou reset de largura.

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

O skeleton representa geometria real e deve estar presente no HTML inicial quando necessário. Ele deve:

- aparecer no primeiro frame útil;
- preservar largura, altura aproximada, colunas e densidade;
- ter `aria-hidden="true"`;
- manter o boundary com `aria-busy="true"` durante hidratação;
- desaparecer somente quando conteúdo, empty ou erro estiver pronto;
- respeitar `prefers-reduced-motion`.

Duração mínima não é sincronização. Qualquer anti-flash deve ser centralizado, curto e condicionado à percepção, nunca à lógica de negócio.

## 7. Feedback operacional

Ações como publicar, salvar, pagar e solicitar saque usam estado pending no controle acionado, mensagem de sucesso/erro e navegação posterior. Não acionam boot de documento e não substituem conteúdo por skeleton de página.

## 8. Contrato do fluxo obrigatório

`anunciar-servico.html → guard publish_service → verificacao-profissional.html` deve garantir:

1. conteúdo protegido nunca aparece antes da decisão;
2. enquanto o guard resolve, existe superfície pending visível;
3. decisão negada usa replace;
4. destino não mostra splash global em navegação proveniente do app;
5. skeleton do destino aparece antes de qualquer conteúdo dependente de dados;
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

## 9. Sequência de implementação

1. Etapa 1 — auditoria e contrato canônico — **concluída**;
2. Etapa 2 — core de navigation/lifecycle — **concluída**;
3. Etapa 3 — `anunciar-servico` + `verificacao-profissional` — **concluída**;
4. Etapa 4 — admin — **concluída**;
5. Etapa 5 — perfis e configurações — **concluída**;
6. Etapa 6 — pedidos, mensagens e pagamento — **concluída**;
7. Etapa 7 — demais páginas — **em andamento (lote 1 concluído: carteira, notificações, orçamento e avaliação)**;
8. Etapa 8 — remoção de legado e auditoria final.

Nenhuma etapa deve migrar todas as páginas de uma vez.
