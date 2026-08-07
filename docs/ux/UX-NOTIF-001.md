# UX-NOTIF-001 — Canonical notification center and unread badge authority

## Status

- Epic: `EPIC-11 — notificações, badges e reengajamento`;
- Tracking: issue `#89`;
- Base: `ux/ux-home-003-rail-scroll-sync`;
- Base SHA: `f0faf190aed84721c2ea69294370567cdfb1a382`;
- Branch: `ux/ux-notif-001-center-badge-authority`;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Staging/produção: não acessados.

## Causa raiz

A base possui mais de uma autoridade de apresentação para o mesmo domínio:

1. `assets/js/pages/notificacoes.js` calcula unread a partir dos cards no DOM e escreve os counters;
2. `assets/js/features/in-app-notifications.js` mantém outro center em storage e também escreve os counters;
3. `notifications-repository.js` possui persistência própria de domínio e deve continuar sendo repository, não badge writer;
4. a store in-app usa chaves globais privadas enquanto `Doke.accountStorage` já fornece isolamento por conta;
5. `notification-renderer.js` e `notificacoes.js` possuem anatomias diferentes de card, mas esse problema não pertence à primeira fronteira.

Consequência: DOM, center local e repository podem divergir e produzir badges diferentes.

## Decisão arquitetural

A autoridade transversal será:

```text
Doke.notificationCenter
```

Responsabilidades:

- snapshot de apresentação;
- generation/accountGeneration;
- replace/upsert determinístico;
- unread count;
- mark-read/dismiss após confirmação da mutation real;
- account fences para respostas assíncronas;
- subscriptions internas;
- evento público sanitizado;
- writer único dos elementos `[data-notifications-unread-count]` após a migração das superfícies.

Não é responsabilidade do center:

- consultar Supabase;
- substituir `notifications-repository`;
- executar mutation remota;
- fabricar notificações;
- definir anatomia visual do card;
- controlar browser push;
- analytics.

## Fase 1 — autoridade pura

Arquivos:

```text
assets/js/core/notification-center.js
scripts/test-ux-notif-001-notification-center.js
```

A Fase 1 é deliberadamente memory-first. Nenhuma chave global nova é criada.

Persistência de cache só poderá existir se houver necessidade comprovada e deverá usar `Doke.accountStorage`, nunca um novo namespace global privado.

### Contratos

- máximo de 250 entradas de apresentação por snapshot;
- `id` é obrigatório;
- `eventKey` é usado como chave de deduplicação quando disponível;
- dismissed não entra em `itemCount` nem `unreadCount`;
- `readAt` equivale a `read=true`;
- troca de conta limpa imediatamente o snapshot em memória;
- fence de uma accountGeneration antiga não pode fazer commit visual;
- eventos `doke:notification-center-changed` expõem apenas contagens, gerações, contrato e razão;
- IDs de notificação, account IDs, title/body e payload completo não são publicados no evento DOM.

## Fases seguintes do mesmo PR

Somente após a Fase 1 passar nos gates:

1. carregar `account-storage.js` e `notification-center.js` na ordem correta nas superfícies relevantes;
2. adaptar `in-app-notifications.js` para delegar center/unread ao `Doke.notificationCenter`;
3. remover de `notificacoes.js` a escrita independente do badge baseada no DOM;
4. manter repository/service como autoridade de dados/mutations;
5. validar account switch, reload, mark-read/dismiss, realtime e stable-shell.

## Fora de escopo preservado

- migrations/Supabase/backend/RPC;
- redesign da página;
- convergência de card renderer;
- preferences/DND/digest, salvo dependência mínima comprovada;
- browser notifications;
- Trust & Safety;
- analytics;
- staging/produção;
- merge.

## Definition of Done

- apenas um writer de unread count nas superfícies migradas;
- page DOM não é fonte de verdade do badge;
- center não cruza contas;
- nenhum novo storage privado global;
- eventos públicos privacy-safe;
- regressões notification API/auth/privacy/shell verdes;
- LCOV executável do código novo;
- Sonar Quality Gate aprovado sem new issues, accepted issues ou hotspots;
- PR aberto, draft e não mesclado.
