# UX-FOUNDATION-009 — Notificações, badges, toasts e inbox operacional

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `009`
- Natureza: especificação de Produto, UX, UX Writing, acessibilidade, privacidade e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Head lógico principal inspecionado: `46713d9d10c4c1d4a781b8ad540589e7e3b3f61a`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-008`

---

## 1. Objetivo

Definir um contrato único para notificações e atenção operacional na Doke, cobrindo:

- eventos de domínio que originam notificações;
- central de notificações;
- badges globais e locais;
- contadores de não lidas;
- ações necessárias;
- prioridade e urgência;
- toasts;
- notificações do navegador;
- digest;
- modo não perturbe;
- agrupamento e deduplicação;
- leitura, dispensa, arquivamento e exclusão;
- ações rápidas;
- deep links;
- reconciliação entre abas e dispositivos;
- troca de conta;
- estados offline, stale e degradado;
- privacidade;
- acessibilidade;
- QA.

Este documento não altera HTML, CSS, JavaScript, serviços, banco, workflows, staging ou produção.

---

## 2. Superfícies auditadas

A auditoria documental considerou principalmente:

- `notificacoes.html`;
- `assets/js/pages/notificacoes.js`;
- `assets/js/services/notification-service.js`;
- `assets/js/repositories/notifications-repository.js`;
- `assets/js/features/in-app-notifications.js`;
- `assets/js/features/browser-notification-bridge.js`;
- `assets/js/components/operational-event-toast.js`;
- `assets/js/pages/mensagens.js`;
- contratos de Pedidos, Pagamentos e Mensagens;
- `UX-FOUNDATION-006` — navegação e overlays;
- `UX-FOUNDATION-007` — mutações e outcome desconhecido;
- `UX-FOUNDATION-008` — linguagem operacional.

O contrato deverá ser aplicado também a:

- sidebar;
- header;
- bottom navigation;
- Pedidos;
- Mensagens;
- Carteira;
- Pagamento;
- Comunidades;
- Perfil;
- Administração;
- futuro aplicativo móvel.

---

## 3. Causa raiz

A Doke possui componentes úteis para avisar o usuário, mas eles não compartilham uma única autoridade de experiência.

Atualmente coexistem, entre outras estruturas:

```text
Notification Service
Notifications Repository
In-App Notification Center
Operational Event Toast
Browser Notification Bridge
Página Notificações
Badges de shell
Digests independentes
```

Cada uma decide localmente partes de:

- persistência;
- deduplicação;
- prioridade;
- destinatário;
- leitura;
- dispensa;
- agrupamento;
- som;
- digest;
- navegação;
- badge.

Isso cria quatro problemas estruturais.

### 3.1 O mesmo evento pode existir em mais de uma central

Uma notificação pode ser persistida no repository e também no centro in-app.

As coleções podem usar IDs diferentes para o mesmo evento de negócio.

A página combina essas coleções, mas não possui uma identidade de evento canônica suficiente para garantir que haverá apenas um item público.

### 3.2 O mesmo contador possui mais de um escritor

O contador global pode ser atualizado por:

- centro in-app;
- repository;
- página Notificações;
- superfícies do shell.

O valor visível pode depender de qual processo escreveu por último.

### 3.3 Não lida é confundida com ação necessária

Uma notificação pode estar não lida sem exigir ação.

Um pedido pode exigir ação mesmo depois de sua notificação ter sido lida.

Somar ambos em um único número e descrevê-los como itens que “aguardam sua atenção” produz urgência artificial.

### 3.4 Preferências sociais podem atingir eventos operacionais

A classificação do centro in-app reconhece diretamente mensagens, menções, reações e eventos.

Outros tipos podem cair no grupo `social`, incluindo eventos de pedido, pagamento ou contestação.

Assim, desativar alertas sociais pode silenciar informação operacional relevante.

---

## 4. Princípios canônicos

### 4.1 Um evento de domínio, uma identidade pública

```text
evento de negócio
→ eventId canônico
→ no máximo uma notificação ativa por destinatário e finalidade
```

O mesmo evento poderá ser apresentado em vários canais, mas continuará sendo a mesma entidade lógica.

### 4.2 Canal não é autoridade

Toast, inbox, badge e notificação do navegador são canais de apresentação.

Eles não podem inventar:

- status;
- prioridade;
- destinatário;
- ação;
- conclusão financeira;
- leitura canônica.

### 4.3 Não lida não significa urgente

```text
readState
≠
attentionState
≠
priority
≠
actionState
```

### 4.4 Toast é efêmero; inbox é registro

Um toast pode desaparecer.

Mudanças operacionais relevantes devem continuar acessíveis na central ou na entidade de origem.

### 4.5 Preferência não pode ocultar obrigação crítica

O usuário poderá controlar canais e ruído.

Porém, restrições de entrega para eventos críticos deverão seguir políticas explícitas e não uma categoria genérica como `social`.

### 4.6 Ações rápidas obedecem à autoridade do domínio

Clicar em “Aceitar”, “Responder” ou “Confirmar” dentro de um toast não poderá concluir uma ação apenas por evento local.

A mutação deverá usar:

- autorização atual;
- idempotência;
- validação de estado;
- expiração;
- confirmação remota;
- reconciliação.

### 4.7 A privacidade começa no payload

Um canal não deverá receber conteúdo sensível para depois tentar escondê-lo.

O evento deverá declarar sua política de preview.

---

## 5. Autoridade proposta

A autoridade de experiência proposta é:

```text
Doke.notificationCenter
```

Ela não substitui o repository nem o serviço de domínio.

Ela coordena apresentação e reconciliação sobre a autoridade persistente.

### 5.1 Responsabilidades

```text
Doke.notificationCenter
├── ingest
├── normalize
├── reconcile
├── aggregate
├── list
├── markRead
├── dismiss
├── archive
├── executeAction
├── resolveDeepLink
├── getBadgeSnapshot
├── getDigestSnapshot
├── getPreferences
├── setPreferences
└── subscribe
```

### 5.2 Fronteiras

```text
Domínio
→ prova que o evento aconteceu

Notification Service
→ cria e consulta notificações autorizadas

Repository
→ persiste e sincroniza entidades

Notification Center
→ reconcilia estado e decide apresentação

Toast / Inbox / Badge / Browser
→ renderizam snapshots do center
```

### 5.3 Proibições

Nenhuma superfície consumidora deverá:

- ler localStorage de notificações diretamente;
- calcular contador global independentemente;
- deduplicar apenas por título;
- classificar prioridade por substring pública;
- inferir pagamento a partir de status visual;
- marcar como lida em duas stores diferentes;
- fabricar deep link;
- registrar sucesso de ação rápida antes da autoridade.

---

## 6. Schema canônico de evento

Todo evento elegível a notificação deverá possuir uma identidade estável.

```text
NotificationEvent {
  eventId
  eventType
  eventVersion
  occurredAt
  sourceDomain
  sourceAuthority
  recipientAccountId
  recipientRole
  actorRef
  entityRefs
  correlationId
  dedupeKey
  aggregationKey
  priority
  attentionState
  actionRequired
  privacyLevel
  previewPolicy
  channelPolicy
  expiresAt
  payload
}
```

### 6.1 eventId

Identificador imutável do evento de domínio.

Não usar como eventId:

- timestamp isolado;
- título;
- URL;
- ID gerado separadamente por cada canal;
- índice de array.

### 6.2 eventType

Exemplos:

```text
order.created
order.accepted
proposal.received
proposal.approved
charge.created
payment.confirmed
payment.held
payment.released
message.received
completion.requested
dispute.opened
dispute.resolved
review.received
community.mention
community.member_banned
```

### 6.3 sourceAuthority

Valores conceituais:

```text
CANONICAL_REMOTE
CANONICAL_LOCAL
DEMO
DERIVED_INFORMATIONAL
```

Eventos financeiros definitivos exigirão `CANONICAL_REMOTE` ou outra autoridade explicitamente aprovada pelo domínio.

### 6.4 entityRefs

```text
{
  orderId
  conversationId
  messageId
  serviceId
  paymentId
  disputeId
  communityId
}
```

A ausência de uma referência necessária deverá bloquear o deep link específico.

### 6.5 privacyLevel

```text
PUBLIC_PREVIEW
PRIVATE_GENERIC
PRIVATE_AUTHENTICATED
SENSITIVE_NO_OS_PREVIEW
```

### 6.6 channelPolicy

```text
{
  inbox: required | optional | forbidden
  toast: allowed | silent | forbidden
  browser: allowed | generic_only | forbidden
  sound: allowed | forbidden
  digest: allowed | forbidden
}
```

---

## 7. Entidade canônica de notificação

A notificação apresentada ao usuário deverá separar estados independentes.

```text
NotificationItem {
  id
  eventId
  recipientAccountId
  titleKey
  bodyKey
  contentParams
  createdAt
  updatedAt
  deliveryState
  visibilityState
  readState
  attentionState
  actionState
  freshnessState
  priority
  privacyLevel
  group
  actions
  deepLink
  sourceAuthority
}
```

### 7.1 deliveryState

```text
PENDING
DELIVERED
FAILED
```

### 7.2 visibilityState

```text
ACTIVE
DISMISSED
ARCHIVED
```

`DELETED` somente existirá se houver uma operação real de exclusão aprovada.

### 7.3 readState

```text
UNREAD
READ
```

### 7.4 attentionState

```text
INFORMATIONAL
ACTION_REQUIRED
URGENT_ACTION_REQUIRED
RESOLVED
```

### 7.5 actionState

```text
NONE
AVAILABLE
PENDING
SUCCEEDED
FAILED
EXPIRED
UNKNOWN_OUTCOME
```

### 7.6 freshnessState

```text
FRESH
STALE
SUPERSEDED
```

---

## 8. Achado P0 — dois sistemas de toast

A página e outras superfícies podem carregar simultaneamente:

```text
operational-event-toast.js
in-app-notifications.js
```

Os dois sistemas possuem decisões próprias de:

- fila;
- deduplicação;
- armazenamento de itens vistos;
- digest;
- navegação;
- tempo de exibição;
- destinatário.

Consequências possíveis:

```text
um evento
→ dois toasts
```

```text
um sistema considera visto
→ outro ainda exibe
```

```text
um sistema agrupa
→ outro apresenta itens separados
```

Contrato:

```text
um único Toast Presenter
consumindo snapshots do Doke.notificationCenter
```

`operational-event-toast.js` e `in-app-notifications.js` não poderão continuar como autoridades paralelas.

Durante migração, um adapter deverá garantir que apenas um presenter esteja ativo por documento.

---

## 9. Achado P0 — duas centrais persistentes

Foram identificadas stores distintas, incluindo:

```text
doke.notifications.local.v1
doke.notifications
doke.in-app-notification.center.v1
```

A página Notificações combina itens da central in-app e do serviço/repository.

A deduplicação observada na composição da página depende principalmente de igualdade de `id`.

Assim, o mesmo evento com IDs diferentes pode aparecer duas vezes.

Contrato:

```text
repository snapshot
+
local pending snapshot
→ reconcile por eventId/dedupeKey
→ NotificationItem único
```

A store do centro in-app não deverá persistir cópias completas de notificações remotas como segunda autoridade.

Ela poderá manter apenas estado efêmero ou pendente, por exemplo:

```text
pending presentation
local optimistic state
last seen toast
cross-tab envelope
```

---

## 10. Deduplicação

### 10.1 Chave primária

```text
recipientAccountId + eventId + purpose
```

### 10.2 Fallback controlado

Quando um sistema legado ainda não fornecer `eventId`:

```text
recipient
+ eventType
+ primaryEntityId
+ domainSequence/fingerprint
```

Não usar apenas:

- título;
- corpo;
- targetUrl;
- timestamp arredondado.

### 10.3 Duplicata exata

Uma duplicata exata deverá:

- preservar a primeira identidade;
- atualizar metadata de entrega;
- não incrementar unread;
- não reproduzir som;
- não gerar novo toast.

### 10.4 Evento semelhante, mas distinto

Duas mensagens diferentes na mesma conversa são eventos distintos.

Duas atualizações de status diferentes do mesmo pedido são eventos distintos.

Agrupamento visual não poderá destruir essa identidade.

---

## 11. Agrupamento

O centro in-app atual pode agrupar itens não lidos pela mesma `groupKey` dentro de uma janela de 24 horas.

Ao agrupar, ele atualiza conteúdo e contador.

Esse comportamento pode apagar a linha do tempo e substituir uma ação anterior por outra.

### 11.1 Tipos agrupáveis

Exemplos permitidos:

```text
reaction.received
community.activity
message.received sem ação crítica
```

### 11.2 Tipos não agrupáveis por padrão

```text
payment.confirmed
payment.failed
payment.released
dispute.opened
dispute.resolved
completion.requested
proposal.received
request.decision_required
security.alert
```

### 11.3 Group model

```text
NotificationGroup {
  groupId
  aggregationKey
  childEventIds
  count
  firstOccurredAt
  lastOccurredAt
  latestPreview
  highestPriority
  attentionState
  actionState
}
```

### 11.4 Regra de ação

Um grupo não poderá oferecer ação rápida quando seus filhos exigirem decisões diferentes.

Nesse caso, o CTA será:

```text
Ver atualizações
```

---

## 12. Categorias canônicas

A classificação deverá ser explícita.

```text
MESSAGES
ORDERS
PROPOSALS
PAYMENTS
DISPUTES
ACCOUNT
SECURITY
COMMUNITIES
SOCIAL
PRODUCT
```

### 12.1 Proibição de fallback operacional para social

Eventos desconhecidos de domínio não poderão cair automaticamente em `SOCIAL`.

Fallback seguro:

```text
UNKNOWN_OPERATIONAL
```

Esse estado:

- permanece na inbox;
- não recebe som por padrão;
- não é silenciado por preferência social;
- gera telemetria sanitizada de contrato ausente;
- não recebe copy definitiva inventada.

### 12.2 Payment

`payment_held`, `payment_confirmed`, `payment_released` e eventos equivalentes pertencem a `PAYMENTS`.

Eles deverão ter filtro e política próprios.

### 12.3 Disputes

Contestação não deverá ser classificada apenas como pedido genérico quando houver necessidade de atenção específica.

---

## 13. Prioridade

### 13.1 Classes

```text
SILENT
NORMAL
HIGH
CRITICAL
```

### 13.2 Prioridade não é derivada apenas do tipo visual

Não usar regras como:

```text
menção → sempre alta
ban → sempre alta
outros → normal
```

sem considerar:

- destinatário;
- prazo;
- ação disponível;
- impacto;
- estado atual;
- política do domínio.

### 13.3 Exemplos

```text
reaction.received
→ SILENT
```

```text
message.received
→ NORMAL
```

```text
proposal.received com prazo
→ HIGH
```

```text
security.account_access_changed
→ CRITICAL
```

### 13.4 Financeiro

Pagamento confirmado não é necessariamente crítico.

Falha que exige correção imediata pode ser alta.

Suspeita de acesso ou risco de perda financeira poderá ser crítica somente sob regra aprovada.

---

## 14. Não lida versus ação necessária

### 14.1 unreadCount

Quantidade de notificações ativas não lidas.

### 14.2 actionRequiredCount

Quantidade de entidades distintas que exigem uma ação possível do usuário atual.

### 14.3 urgentActionCount

Quantidade de ações urgentes sob regra canônica.

### 14.4 unreadMessagesCount

Quantidade canônica de conversas ou mensagens não lidas, conforme decisão do domínio Mensagens.

### 14.5 Regra de independência

```text
notificação lida
+
ação ainda pendente
→ actionRequiredCount permanece
```

```text
notificação não lida
+
nenhuma ação
→ unreadCount aumenta
→ actionRequiredCount não aumenta
```

### 14.6 Snapshot de badge

```text
BadgeSnapshot {
  unreadTotal
  actionRequiredTotal
  urgentTotal
  unreadMessages
  byCategory
  freshness
  updatedAt
  sourceAuthority
}
```

---

## 15. Achado P0 — escritores concorrentes de badge

O contador global pode ser calculado a partir de:

- central in-app;
- repository;
- DOM da página;
- outras superfícies.

Todos podem escrever nos mesmos nós de contador.

Contrato:

```text
Doke.notificationCenter.getBadgeSnapshot()
→ único snapshot
→ shell renderiza
```

A página Notificações poderá exibir estatísticas locais, mas não reescrever a autoridade global usando apenas os cards presentes no DOM.

### 15.1 Estado stale

Quando o snapshot remoto estiver stale:

- manter o último valor confirmado;
- indicar atualização quando apropriado;
- não zerar silenciosamente;
- não substituir por contagem parcial local sem sinalização.

### 15.2 Limites visuais

```text
0  → oculto
1–99 → número
100+ → 99+
```

O nome acessível deverá conter o valor real quando conhecido.

---

## 16. Inbox operacional

### 16.1 Estados

```text
LOADING
READY
EMPTY_FIRST_USE
EMPTY_FILTERED
EMPTY_SEARCH
REFRESHING_WITH_CONTENT
STALE_WITH_CONTENT
OFFLINE_WITH_CONTENT
ERROR_BLOCKING
ERROR_PARTIAL
```

### 16.2 First use

```text
Nenhuma notificação ainda

Pedidos, mensagens e atualizações importantes aparecerão aqui.
```

### 16.3 Filtered empty

```text
Nenhuma notificação com estes filtros

Suas outras notificações continuam disponíveis.

Limpar filtros
```

### 16.4 Search empty

```text
Nenhuma notificação para “pintura”

Tente outro termo ou limpe a busca.
```

### 16.5 Error

Erro de carregamento não poderá aparecer como vazio.

### 16.6 Ordenação

Padrão:

```text
attentionState
→ priority
→ occurredAt
```

A ordem cronológica continuará disponível.

A inbox não deverá promover itens lidos indefinidamente apenas por prioridade histórica.

---

## 17. Filtros

Filtros canônicos mínimos:

```text
Todas
Não lidas
Ação necessária
Mensagens
Pedidos
Pagamentos
Contestações
Conta e segurança
Comunidades
```

### 17.1 Filtro por tempo

```text
Tudo
Última hora
Últimas 24 horas
Últimos 7 dias
```

A idade deverá ser calculada a partir de timestamp canônico, não de token textual persistido.

### 17.2 Combinação

Filtros de categoria, estado, tempo e busca serão combinados por uma query explícita.

### 17.3 URL

Filtros relevantes poderão ser persistidos na URL:

```text
notificacoes.html?category=payments&state=action-required&period=7d
```

O conteúdo da busca não será persistido sem decisão de privacidade.

---

## 18. Leitura

### 18.1 O que significa ler

`READ` significa que o usuário abriu ou reconheceu o item na central.

Não significa:

- ação concluída;
- problema resolvido;
- mensagem respondida;
- pagamento confirmado;
- contestação encerrada.

### 18.2 Abrir notificação

Fluxo preferido:

```text
usuário ativa item
→ registrar intenção de leitura
→ resolver deep link
→ navegar
→ reconciliar readState
```

### 18.3 Falha ao marcar como lida

A navegação não deverá depender indefinidamente de uma mutação de baixa criticidade.

Porém, a interface deverá manter um estado pendente e reconciliar depois.

Não executar duas escritas desconectadas em stores diferentes.

### 18.4 Mark all read

A ação deverá:

- operar sobre escopo explícito;
- informar quantidade;
- usar mutation guard;
- suportar rollback ou reconciliação;
- não marcar itens fora da conta atual;
- não alterar actionState.

---

## 19. Dispensar, arquivar e excluir

### 19.1 Dismiss

Oculta o item da inbox padrão.

O registro pode continuar disponível para auditoria ou histórico, conforme política.

### 19.2 Archive

Move o item para uma área histórica.

### 19.3 Delete

Remove o registro somente quando o produto e a política de retenção permitirem.

### 19.4 Achado de linguagem

A UI atual pode usar `Dispensar` e `Apagar` para o mesmo comando de dismiss.

Isso é proibido.

Contrato:

```text
mesma operação
→ mesmo nome
```

Até existir exclusão real, usar:

```text
Dispensar notificação
```

Não usar:

```text
Apagar
Excluir permanentemente
```

---

## 20. Toast

### 20.1 Elegibilidade

Um item será elegível para toast quando:

- pertence à conta atual;
- não foi apresentado nesta sessão/canal;
- não está silenciado por política permitida;
- não foi superseded;
- possui preview permitido;
- sua prioridade atende à preferência;
- não existe outra apresentação equivalente ativa.

### 20.2 Toast não obrigatório

Itens informativos podem entrar apenas na inbox.

### 20.3 Toast obrigatório

Eventos críticos aprovados podem exigir apresentação, mas ainda respeitarão acessibilidade e privacidade.

### 20.4 Duração

```text
SILENT/NORMAL → dismiss automático permitido
HIGH → duração maior
CRITICAL → persistente até ação ou fechamento explícito, quando apropriado
```

Não usar duração curta para ações que exigem leitura.

### 20.5 Fechar toast

Fechar o toast:

- não marca automaticamente como lida;
- não dispensa da inbox;
- não resolve ação.

### 20.6 Clique no corpo

Só navegará quando houver destino válido.

Não transformar todo toast em botão quando existirem ações internas conflitantes.

---

## 21. Som

Som deverá respeitar:

- preferência por conta;
- prioridade;
- visibilidade da aba;
- modo não perturbe;
- contexto de acessibilidade;
- políticas do sistema operacional.

### 21.1 Proibições

- reproduzir som para cada item de um grupo;
- som em carregamento inicial de itens antigos;
- som duplicado por dois presenters;
- som para evento demonstrativo;
- som sem interação prévia quando o navegador bloquear.

---

## 22. Modo não perturbe

### 22.1 Escopo

DND controla canais efêmeros:

- toast;
- som;
- browser notification.

Não remove itens da inbox.

### 22.2 Eventos críticos

A política deverá declarar se um evento crítico:

- ignora DND;
- aparece silenciosamente;
- entra apenas na inbox;
- é acumulado para digest.

Não usar comportamento implícito.

### 22.3 Conta

DND será persistido por conta.

Uma conta não poderá herdar o DND de outra em dispositivo compartilhado.

### 22.4 Expiração

Ao terminar:

- atualizar preferência;
- reconciliar fila;
- emitir no máximo um digest;
- não reproduzir todos os toasts antigos individualmente.

---

## 23. Digest

Atualmente existem pipelines de digest independentes.

Um considera itens do centro in-app.

Outro contabiliza pedidos abertos e notificações locais.

Isso pode gerar dois resumos e contagens semanticamente incompatíveis.

### 23.1 Autoridade única

```text
Doke.notificationCenter.getDigestSnapshot()
```

### 23.2 Estrutura

```text
DigestSnapshot {
  accountId
  periodStart
  periodEnd
  unreadInformational
  actionRequired
  urgentActions
  unreadMessages
  groupedItems
  generatedAt
}
```

### 23.3 Copy

Evitar:

```text
12 alertas acumulados
```

quando os itens não são alertas.

Preferir:

```text
3 mensagens não lidas
2 pedidos aguardam sua ação
5 atualizações informativas
```

### 23.4 Abertura

Abrir digest não marca automaticamente todos os itens como lidos.

---

## 24. Achado P0 — digest transforma pedidos abertos em atenção pendente

O digest operacional atual pode contar todos os pedidos abertos e dizer que aguardam atenção.

Um pedido aberto pode estar:

- aguardando o profissional;
- aguardando o cliente;
- em andamento sem ação;
- agendado;
- aguardando confirmação remota.

Contrato:

```text
pedido aberto
≠
ação necessária
```

O digest usará `attentionState` calculado pelo domínio para o papel atual.

---

## 25. Ações rápidas

### 25.1 Tipos possíveis

```text
Abrir entidade
Responder mensagem
Aceitar ou recusar solicitação
Confirmar presença
Silenciar origem
Desfazer ação elegível
```

### 25.2 Requisitos

Toda ação mutável deverá possuir:

```text
actionId
commandType
entityId
expectedState
expiresAt
idempotencyKey
permissionRequirement
confirmationPolicy
```

### 25.3 Estados

```text
AVAILABLE
PENDING
SUCCEEDED
FAILED
EXPIRED
UNKNOWN_OUTCOME
```

### 25.4 Leitura e ação

Executar uma ação não usará `readState` como indicador de sucesso.

A notificação pode ser lida e a ação falhar.

### 25.5 Expiração

Ao expirar:

```text
Esta ação não está mais disponível.
Abra o pedido para conferir o estado atual.
```

### 25.6 UNKNOWN_OUTCOME

Para ações críticas:

```text
Resultado ainda não confirmado
```

A interface deverá reconciliar antes de liberar nova tentativa.

---

## 26. Inline reply

Responder dentro de toast aumenta risco de:

- enviar para conversa errada;
- perder contexto;
- duplicar mensagem;
- expor texto em tela compartilhada;
- fechar antes da confirmação.

Contrato:

- mostrar destinatário e conversa;
- limitar conteúdo;
- usar comando server-owned;
- preservar texto em falha;
- não fechar antes da confirmação ou estado pendente explícito;
- suportar idempotência;
- não registrar como enviada apenas por evento local.

---

## 27. Deep links

### 27.1 Autoridade

```text
Doke.notificationCenter.resolveDeepLink(item)
```

### 27.2 Formatos canônicos

```text
pedidos.html?order=<id>
mensagens.html?conversation=<id>&order=<id>
carteira.html?transaction=<id>
notificacoes.html?notification=<id>
```

Não alternar entre `order` e `orderId` sem adapter explícito.

### 27.3 Validação

Antes de navegar:

- validar origem same-origin;
- validar rota allowlisted;
- validar entidade e permissão quando possível;
- remover parâmetros não reconhecidos;
- evitar dados sensíveis na URL.

### 27.4 Entidade inexistente

```text
Atualização indisponível

O item pode ter sido removido ou você pode não ter mais acesso.
```

Fallback:

- abrir a lista correspondente;
- preservar a notificação;
- não marcar ação como concluída.

### 27.5 Stable shell

A navegação deverá usar o lifecycle definido em `UX-FOUNDATION-006`.

---

## 28. Notificações do navegador

### 28.1 Consentimento

Permissão do navegador e preferência Doke são estados distintos.

```text
browserPermission
dokeChannelEnabled
categoryPreferences
privacyPreferences
```

### 28.2 Preview

O bridge atual pode usar diretamente título e corpo completos.

Isso é inadequado para:

- conteúdo de mensagem;
- valores financeiros;
- contestação;
- dados pessoais;
- moderação;
- segurança.

### 28.3 Políticas

```text
PUBLIC_PREVIEW
→ título e resumo permitidos

PRIVATE_GENERIC
→ “Você recebeu uma nova mensagem”

PRIVATE_AUTHENTICATED
→ detalhes apenas dentro do app

SENSITIVE_NO_OS_PREVIEW
→ nenhuma notificação do navegador
```

### 28.4 Clique

Clicar em notificação do navegador deverá:

- focar ou abrir a aplicação;
- validar conta atual;
- resolver deep link;
- reconciliar leitura;
- não expor entidade de outra conta.

### 28.5 Tag

`tag` poderá agrupar notificações do sistema operacional somente quando o evento for agregável.

Não substituir eventos financeiros distintos pela mesma tag genérica.

---

## 29. Privacidade por conta

As stores de notificações, preferências, digest e DND deverão ser namespaced.

```text
notifications:<accountId>:center:v1
notifications:<accountId>:preferences:v1
notifications:<accountId>:digest:v1
notifications:<accountId>:seen:v1
```

### 29.1 Conta anônima

Não armazenar notificações operacionais de conta em namespace global `guest`.

### 29.2 Troca de conta

Ao trocar:

- encerrar subscriptions da conta anterior;
- limpar presenters;
- remover badges antigos;
- carregar novo snapshot;
- não exibir toast pendente da conta anterior;
- preservar stores separadas quando permitido.

### 29.3 Eventos sem destinatário

Evento operacional sem `recipientAccountId` será rejeitado.

Broadcast público deverá usar um contrato separado de novidades de produto.

---

## 30. Realtime e polling

### 30.1 Realtime

Eventos repetidos por reconexão deverão ser deduplicados por `eventId`.

### 30.2 Polling

Polling não deverá gerar toasts para todo item encontrado.

Somente itens novos em relação ao cursor/snapshot confirmado serão elegíveis.

### 30.3 Corrida

Realtime e polling podem retornar o mesmo item.

```text
realtime event
+
poll result
→ um NotificationItem
```

### 30.4 Stale responses

Snapshot antigo não poderá reabrir notificação já lida ou dispensada por uma resposta mais recente.

Usar:

- version/updatedAt;
- monotonic state;
- mutation receipts;
- latest-wins por snapshot.

---

## 31. Offline

### 31.1 Inbox com conteúdo

```text
Sem conexão

Mostrando as últimas notificações disponíveis neste dispositivo.
```

### 31.2 Leitura offline

Marcar como lida poderá ser otimista localmente com estado:

```text
READ_PENDING_SYNC
```

### 31.3 Dismiss offline

Dispensa deverá permanecer pendente e ser reconciliada.

### 31.4 Ação operacional offline

Ações como aceitar pedido, responder contestação ou confirmar pagamento não serão executadas como sucesso local.

### 31.5 Reconexão

Ao reconectar:

- enviar mutações pendentes seguras;
- reconciliar versão;
- resolver conflitos;
- atualizar badge;
- não reproduzir toasts antigos em massa.

---

## 32. Preferências

### 32.1 Escopos

```text
canal
categoria
prioridade mínima
som
DND
origens silenciadas
preview do navegador
```

### 32.2 Autoridade de salvamento

`Preferências salvas` só poderá aparecer após a store definida confirmar a escrita.

Se as preferências forem apenas locais:

```text
Preferências salvas neste dispositivo.
```

### 32.3 Defaults

Defaults não poderão parecer preferências confirmadas da conta quando houve falha de carregamento.

### 32.4 Eventos não silenciáveis

A lista de eventos não silenciáveis deverá ser pequena, explícita e aprovada.

Exemplos potenciais:

- segurança da conta;
- mudança material de acesso;
- decisão de contestação;
- evento legalmente obrigatório.

---

## 33. Seleção em massa

A página oferece modo de seleção.

O contrato deverá limitar ações ao que pode ser aplicado em lote com segurança.

### 33.1 Permitidas

```text
Marcar como lidas
Dispensar
Arquivar
```

### 33.2 Não permitidas

```text
Abrir várias entidades
Executar várias decisões
Responder várias conversas
Confirmar várias ações críticas
```

### 33.3 Abrir selecionadas

Um botão que abre apenas o primeiro item selecionado não deverá ser apresentado como operação coletiva.

Usar:

```text
Abrir item selecionado
```

somente quando exatamente um item estiver selecionado.

### 33.4 Resultado parcial

Operação em lote deverá reportar:

```text
8 marcadas como lidas
2 não puderam ser atualizadas
```

---

## 34. Busca na inbox

A busca deverá considerar conteúdo seguro e indexável:

- título;
- categoria;
- nome público permitido;
- identificador público do pedido;
- serviço.

Não indexar no navegador sem necessidade:

- endereço completo;
- documento;
- conteúdo integral sensível;
- metadados financeiros privados.

A busca local não deverá enviar texto bruto para analytics.

---

## 35. Acessibilidade

### 35.1 Lista

A inbox padrão será uma lista semântica.

`listbox` somente será usado quando o componente implementar integralmente o padrão de seleção correspondente.

### 35.2 Cards

Cada card deverá possuir:

- heading;
- categoria;
- timestamp absoluto acessível;
- estado não lido em texto acessível;
- CTA com verbo e objeto;
- ações secundárias identificadas.

### 35.3 Toast

- host com live region apropriada;
- evitar anunciar carregamento inicial histórico;
- `polite` para normal;
- `assertive` apenas para crítico aprovado;
- foco não é movido automaticamente;
- controles acessíveis por teclado;
- pausa de dismiss ao hover/foco.

### 35.4 Badge

Nome acessível:

```text
5 notificações não lidas
```

Não anunciar cada mudança de contador em live region global.

### 35.5 DND e preferências

O painel deverá:

- receber foco;
- possuir heading;
- fechar por Escape;
- devolver foco;
- seguir `UX-FOUNDATION-006`.

### 35.6 Tempo relativo

Todo tempo relativo deverá ter valor absoluto em `<time datetime>` ou descrição equivalente.

---

## 36. Segurança

### 36.1 Destinatário

O cliente não deverá confiar apenas em filtro visual por userId.

A autoridade remota deverá garantir escopo do destinatário.

### 36.2 Deep link

Nenhum payload remoto poderá navegar para URL externa arbitrária.

### 36.3 HTML

Título, corpo, actor e labels serão escapados.

Ações não aceitarão HTML remoto.

### 36.4 Quick actions

Comandos deverão ser allowlisted por tipo.

Payload de notificação não poderá definir livremente uma função ou endpoint.

### 36.5 Logs

Não registrar:

- texto integral da mensagem;
- dados financeiros completos;
- endereços;
- tokens;
- URL sensível;
- conteúdo de contestação.

---

## 37. Observabilidade

Métricas permitidas, agregadas e sanitizadas:

```text
notification_ingested
notification_deduped
notification_presented_toast
notification_opened
notification_mark_read
notification_dismissed
deep_link_failed
action_expired
action_unknown_outcome
badge_reconciled
```

Não registrar conteúdo bruto do usuário.

Métricas não podem alterar prioridade ou ranking sem contrato próprio.

---

## 38. Blockers P0

### NOTIF-P0-01

Eliminar autoridades paralelas de toast por documento.

### NOTIF-P0-02

Eliminar central in-app completa como segunda autoridade persistente.

### NOTIF-P0-03

Criar identidade de evento canônica para deduplicação entre repository, realtime, polling e cross-tab.

### NOTIF-P0-04

Impedir que eventos de Pedido, Pagamento ou Contestação sejam classificados como `social`.

### NOTIF-P0-05

Criar snapshot único para badge global.

### NOTIF-P0-06

Separar unread, action required, urgent e unread messages.

### NOTIF-P0-07

Namespacing de stores e preferências por conta.

### NOTIF-P0-08

Aplicar redaction/política de preview antes de notificações do navegador.

### NOTIF-P0-09

Eliminar dupla escrita não reconciliada de read/dismiss.

### NOTIF-P0-10

Bloquear ação rápida sem autoridade, expiração e idempotência.

### NOTIF-P0-11

Impedir claims financeiros ou de contestação produzidos por snapshot não canônico.

### NOTIF-P0-12

Unificar digest e remover contagem de todo pedido aberto como ação pendente.

---

## 39. Correções P1

### NOTIF-P1-01

Adicionar filtros de Pagamentos, Contestações e Conta/Segurança.

### NOTIF-P1-02

Distinguir empty first-use, filtered empty e search empty.

### NOTIF-P1-03

Padronizar `order` versus `orderId` nos deep links.

### NOTIF-P1-04

Distinguir Dispensar, Arquivar e Excluir.

### NOTIF-P1-05

Remover “Abrir selecionadas” quando apenas um item é aberto.

### NOTIF-P1-06

Recalcular tempos relativos sem depender de tokens congelados.

### NOTIF-P1-07

Persistir preferências com copy que declare dispositivo versus conta.

### NOTIF-P1-08

Criar tratamento explícito para falha parcial de bulk actions.

### NOTIF-P1-09

Adicionar estado stale/degraded à inbox e ao badge.

### NOTIF-P1-10

Integrar navegação ao stable shell e retorno seguro.

---

## 40. Refinamentos P2

### NOTIF-P2-01

Criar agrupamento expandível por conversa ou entidade.

### NOTIF-P2-02

Adicionar preferência de preview privado.

### NOTIF-P2-03

Criar digest configurável por período.

### NOTIF-P2-04

Preparar push móvel futuro sem duplicar contratos.

### NOTIF-P2-05

Adicionar histórico arquivado com retenção definida.

### NOTIF-P2-06

Adicionar controles de frequência para categorias de baixo impacto.

---

## 41. Handoffs de implementação

### NOTIF-H01 — canonical event schema

Escopo:

- schema;
- eventId;
- categorias;
- prioridade;
- atenção;
- privacidade;
- política de canais.

Saída:

- contrato versionado;
- adapters de eventos existentes;
- validação fail-closed.

### NOTIF-H02 — notification center authority

Criar `Doke.notificationCenter` sobre service/repository, sem segunda store completa.

### NOTIF-H03 — toast consolidation

- escolher presenter único;
- desativar autoridade concorrente;
- migrar fila e dedupe;
- integrar acessibilidade.

### NOTIF-H04 — badge snapshot

- unread;
- action required;
- urgent;
- messages;
- stale state;
- shell integration.

### NOTIF-H05 — inbox reconciliation

- merge por eventId;
- realtime/polling;
- optimistic read/dismiss;
- account switch;
- offline.

### NOTIF-H06 — category and priority matrix

- orders;
- proposals;
- payments;
- disputes;
- security;
- communities;
- social.

### NOTIF-H07 — digest and DND

- pipeline único;
- conta;
- semantic buckets;
- critical policy;
- expiration.

### NOTIF-H08 — browser privacy

- preview policy;
- redaction;
- permission;
- click reconciliation;
- account check.

### NOTIF-H09 — quick actions

- command allowlist;
- idempotency;
- expiry;
- pending;
- unknown outcome;
- rollback.

### NOTIF-H10 — QA and migration

- testes;
- adapters legados;
- observabilidade;
- remoção de stores e listeners redundantes.

---

## 42. Matriz mínima de QA

### 42.1 Contas

- anônimo;
- cliente A;
- profissional A;
- cliente B no mesmo navegador;
- troca rápida de conta;
- logout com toast ativo.

### 42.2 Canais

- inbox;
- toast;
- badge;
- browser notification;
- digest;
- som.

### 42.3 Categorias

- mensagem;
- pedido;
- proposta;
- pagamento;
- contestação;
- segurança;
- comunidade;
- social;
- produto.

### 42.4 Estados

- unread/read;
- action required/resolved;
- active/dismissed/archived;
- pending/succeeded/failed/expired/unknown action;
- fresh/stale/superseded.

### 42.5 Dados

- evento único;
- duplicata exata;
- mesmo evento por realtime e polling;
- IDs diferentes com mesmo eventId;
- eventos agrupáveis;
- eventos não agrupáveis;
- payload incompleto;
- deep link inválido.

### 42.6 Rede

- online;
- offline no load;
- offline durante mark read;
- reconnect;
- resposta stale;
- timeout remoto;
- subscription reconectada.

### 42.7 Viewports

- mobile estreito;
- mobile largo;
- tablet;
- desktop;
- zoom 200%;
- texto ampliado.

### 42.8 Acessibilidade

- teclado;
- leitor de tela;
- live regions;
- foco em preferências;
- toast com ações;
- seleção em massa;
- reduced motion;
- som desativado.

---

## 43. Casos obrigatórios

### NOTIF-QA-001 — duplicata cross-source

Dado:

- repository retorna evento E1;
- realtime retorna E1 com outro ID local.

Esperado:

- um item;
- um incremento de unread;
- no máximo um toast;
- eventId preservado.

### NOTIF-QA-002 — não lida sem ação

Dado:

- atualização informativa não lida.

Esperado:

```text
unreadTotal +1
actionRequiredTotal +0
```

### NOTIF-QA-003 — lida com ação pendente

Dado:

- proposta recebida foi aberta, mas não decidida.

Esperado:

```text
readState = READ
attentionState = ACTION_REQUIRED
```

### NOTIF-QA-004 — social desativado

Dado:

- preferência social desativada;
- pagamento entra em estado confirmado canônico.

Esperado:

- evento permanece em Payments;
- não é descartado por preferência social;
- canal segue política financeira.

### NOTIF-QA-005 — troca de conta

Dado:

- conta A possui três não lidas;
- usuário entra na conta B.

Esperado:

- badge de A removido;
- nenhum toast de A;
- preferências de B carregadas;
- stores separadas.

### NOTIF-QA-006 — browser privacy

Dado:

- mensagem marcada `PRIVATE_GENERIC`;
- app em background.

Esperado:

```text
Nova mensagem
Abra a Doke para visualizar.
```

Não esperado:

- corpo integral;
- valor;
- endereço;
- nome sensível.

### NOTIF-QA-007 — read failure

Dado:

- usuário abre notificação;
- persistência de leitura falha.

Esperado:

- navegação segura;
- estado pending sync;
- reconciliação posterior;
- nenhum segundo writer divergente.

### NOTIF-QA-008 — ação expirada

Dado:

- CTA rápido expirou.

Esperado:

- comando não enviado;
- estado `EXPIRED`;
- CTA para abrir entidade;
- notificação não declarada resolvida.

### NOTIF-QA-009 — unknown outcome

Dado:

- comando foi enviado;
- resposta se perdeu.

Esperado:

- `UNKNOWN_OUTCOME`;
- retry bloqueado;
- reconciliação;
- nenhum sucesso visual.

### NOTIF-QA-010 — agrupamento seguro

Dado:

- cinco reações agrupáveis.

Esperado:

- grupo com cinco childEventIds;
- primeira e última data;
- expansão possível;
- unread policy consistente.

### NOTIF-QA-011 — agrupamento proibido

Dado:

- pagamento confirmado;
- pagamento liberado.

Esperado:

- dois eventos distintos;
- nenhum overwrite do primeiro;
- timeline preservada.

### NOTIF-QA-012 — DND

Dado:

- DND ativo;
- quatro mensagens normais;
- um evento crítico autorizado.

Esperado:

- mensagens acumuladas no digest;
- política crítica aplicada explicitamente;
- nenhum burst de cinco toasts ao terminar.

### NOTIF-QA-013 — filtered empty

Dado:

- inbox possui itens;
- filtro Payments retorna zero.

Esperado:

```text
Nenhuma notificação de pagamento
Limpar filtros
```

Não esperado:

```text
Nenhuma notificação ainda
```

### NOTIF-QA-014 — dismiss versus delete

Esperado:

- botão chama Dispensar;
- item sai da inbox padrão;
- não há promessa de exclusão permanente.

### NOTIF-QA-015 — deep link sem acesso

Esperado:

- rota bloqueia conteúdo;
- fallback seguro;
- item não executa ação;
- nenhuma informação sensível é revelada.

---

## 44. Critérios de saída

Este contrato estará implementado quando:

- existir um schema canônico de evento;
- um único notification center reconciliar todas as fontes;
- um único presenter de toast estiver ativo por documento;
- repository e center não mantiverem cópias concorrentes completas;
- dedupe usar eventId;
- categorias operacionais forem explícitas;
- badge global tiver snapshot único;
- unread e action required forem separados;
- stores e preferências forem isoladas por conta;
- browser notifications respeitarem preview policy;
- digest e DND possuírem uma autoridade;
- quick actions usarem idempotência e estado canônico;
- deep links forem validados;
- estados empty/error/offline/stale forem distintos;
- todos os P0 deste documento estiverem fechados;
- QA cross-tab, cross-account e acessibilidade estiver aprovado.

---

## 45. Fora de escopo

Não foram executados:

- alteração de notificações no runtime;
- remoção de scripts;
- migração de localStorage;
- alteração de schema remoto;
- mudança de RLS;
- ativação de push móvel;
- solicitação de permissão do navegador;
- alteração de pagamentos;
- staging;
- produção;
- merge.

---

## 46. Validação documental executada

Foram inspecionados:

- service e repository de notificações;
- central in-app;
- toast operacional;
- bridge de notificação do navegador;
- página Notificações;
- contadores;
- filtros;
- seleção;
- leitura e dispensa;
- digest;
- DND;
- ações rápidas;
- eventos de Pedidos, Mensagens, Pagamentos e Contestações;
- scripts carregados pela página;
- deriva da branch PAY.

Resultado:

- contrato documental criado;
- runtime alterado: zero;
- staging e produção: intocados;
- merge e auto-merge: não autorizados.

---

## 47. Próximo sublote recomendado

`UX-FOUNDATION-010 — responsividade transversal, zoom, densidade e touch targets`.

Esse lote deverá definir:

- breakpoints por comportamento;
- zoom de 200% e 400%;
- texto ampliado;
- reflow;
- touch targets;
- safe areas;
- teclado virtual;
- densidade desktop/mobile;
- orientação;
- overflow;
- tabelas e listas;
- overlays em telas pequenas;
- critérios de QA visual pós-hidratação.