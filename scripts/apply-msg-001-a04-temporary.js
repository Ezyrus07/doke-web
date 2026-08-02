#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

function read(file) {
  return fs.readFileSync(file, 'utf8');
}
function write(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, content);
}
function replaceOnce(source, before, after, label) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`${label}: expected one match, found ${count}`);
  return source.replace(before, after);
}
function pushUnique(items, value) {
  if (!items.includes(value)) items.push(value);
}

const observedAt = '2026-08-02T18:31:00-03:00';
const baseHead = 'b486ffa96d85c968746e13f273969677c5f194dc';

const contract = {
  contractVersion: 'msg-a04-realtime-publication-subscription-v1',
  status: 'repository_only_realtime_contract_ready_disabled',
  domain: 'MSG-001',
  observedAt,
  repository: {
    name: 'Ezyrus07/doke-web',
    branch: 'msg/msg-001-baseline-audit',
    baseHead
  },
  publication: {
    name: 'supabase_realtime',
    tables: ['public.conversations', 'public.messages'],
    migrationApplied: false,
    stagingApplicationRequiresFreshExplicitAuthorization: true
  },
  authorization: {
    source: 'postgres-rls',
    conversations: 'auth.uid() equals client_id or professional_id',
    messages: 'participant exists through public.conversations',
    serviceRoleExposedToBrowser: false
  },
  subscriptions: {
    featureFlag: 'messagesRealtimeEnabled',
    defaultEnabled: false,
    conversations: {
      events: ['INSERT', 'UPDATE'],
      filters: ['client_id=eq.<auth.uid>', 'professional_id=eq.<auth.uid>']
    },
    messages: {
      events: ['INSERT', 'UPDATE'],
      filter: null,
      participantIsolation: 'RLS authorization per delivered row'
    },
    deleteEvents: {
      subscribed: false,
      reason: 'Supabase Postgres Changes DELETE events cannot be filtered and RLS is not applied to deleted rows.',
      reconciliation: 'authoritative reread after server-owned remove command'
    },
    payloadPolicy: 'payloads are signals only; UI state is rebuilt from a fresh remote-only repository read'
  },
  presenceAndTyping: {
    changedByA04: false,
    status: 'local-only legacy behavior remains isolated for a later realtime presence boundary'
  },
  orderedNextActions: [
    'MSG-A04B: apply the Realtime publication migration and run participant-isolation canaries only after fresh explicit staging authorization.',
    'MSG-A05: harden transaction-attachments ownership, signed URL, cleanup and retention boundaries.'
  ],
  effects: {
    stagingReads: 0,
    stagingMutations: 0,
    migrationsApplied: 0,
    realtimePublicationChanges: 0,
    subscriptionsActivatedByDefault: false,
    storagePolicyChanges: 0,
    deployments: 0,
    productionChanged: false,
    accountsChanged: 0,
    messagesChanged: 0,
    pullRequestsMerged: 0
  }
};

const migration = `-- Doke MSG-A04: participant-scoped Realtime publication contract.
-- Repository-only artifact. Do not apply without fresh explicit staging authorization.

begin;

alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- Rebuild read policies as the authorization source used by Postgres Changes.
drop policy if exists "conversation_participants_select" on public.conversations;
create policy "conversation_participants_select"
  on public.conversations
  for select
  to authenticated
  using (
    (select auth.uid()) = client_id
    or (select auth.uid()) = professional_id
  );

drop policy if exists "message_participants_select" on public.messages;
create policy "message_participants_select"
  on public.messages
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.conversations c
       where c.id = messages.conversation_id
         and (
           (select auth.uid()) = c.client_id
           or (select auth.uid()) = c.professional_id
         )
    )
  );

grant select on public.conversations to authenticated;
grant select on public.messages to authenticated;

-- Support participant filters and inexpensive RLS checks.
create index if not exists idx_conversations_client_updated_realtime
  on public.conversations (client_id, updated_at desc);

create index if not exists idx_conversations_professional_updated_realtime
  on public.conversations (professional_id, updated_at desc);

create index if not exists idx_messages_conversation_created_realtime
  on public.messages (conversation_id, created_at);

-- Publish only after the migration is explicitly applied.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'conversations'
  ) then
    alter publication supabase_realtime add table public.conversations;
  end if;

  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'messages'
  ) then
    alter publication supabase_realtime add table public.messages;
  end if;
end;
$$;

-- DELETE is deliberately not consumed by the browser subscription contract.
-- Supabase Postgres Changes cannot filter DELETE events and table RLS is not
-- applied to deleted rows. Removal is reconciled through a fresh authoritative
-- read after the server-owned command completes.

commit;
`;

const realtimeRepository = `/* Doke Messages Realtime Repository
   Responsibility: participant-scoped Postgres Changes subscription boundary.
   Payloads are invalidation signals only; canonical state is always re-read remotely. */
(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});
  var repositories = Doke.repositories || (Doke.repositories = {});
  var STATUS_ATTRIBUTE = 'data-doke-messages-realtime';
  var CHANNEL_PREFIX = 'doke-messages-user-';
  var REFRESH_DELAY_MS = 80;
  var channel = null;
  var subscribedUserId = '';
  var refreshTimer = null;
  var refreshInFlight = null;
  var lastStatus = 'idle';
  var lastError = '';

  function normalizeText(value) {
    return String(value || '').trim();
  }

  function clone(value) {
    if (value == null) return value;
    try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; }
  }

  function isUuid(value) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(normalizeText(value));
  }

  function getConfig() {
    return root.DOKE_SUPABASE_CONFIG || {};
  }

  function setStatus(status, error) {
    lastStatus = normalizeText(status || 'idle');
    lastError = normalizeText(error && error.message || error || '');
    try { document.documentElement.setAttribute(STATUS_ATTRIBUTE, lastStatus); } catch (ignored) {}
    try {
      document.dispatchEvent(new CustomEvent('doke:messages-realtime-status', {
        detail: { status: lastStatus, error: lastError }
      }));
    } catch (ignored) {}
  }

  function createUnavailableError(message) {
    var error = new Error(message || 'Realtime de mensagens indisponível.');
    error.code = 'DOKE_MESSAGES_REALTIME_UNAVAILABLE';
    return error;
  }

  function getClient() {
    return root.DokeSupabase && typeof root.DokeSupabase.getClient === 'function'
      ? root.DokeSupabase.getClient()
      : null;
  }

  function getSessionUser(client) {
    if (!client || !client.auth || typeof client.auth.getSession !== 'function') {
      return Promise.resolve(null);
    }
    return Promise.resolve(client.auth.getSession()).then(function (result) {
      return result && result.data && result.data.session && result.data.session.user || null;
    });
  }

  function dispatchSynced(items, trigger) {
    try {
      document.dispatchEvent(new CustomEvent('doke:messages-realtime-synced', {
        detail: {
          items: clone(items || []),
          source: 'postgres_changes',
          trigger: clone(trigger || {})
        }
      }));
    } catch (ignored) {}
  }

  function refreshCanonicalState(trigger) {
    var messages = repositories.messages;
    if (!messages || typeof messages.load !== 'function') {
      var missing = createUnavailableError('Repositório canônico de mensagens indisponível.');
      setStatus('degraded', missing);
      return Promise.reject(missing);
    }
    if (refreshInFlight) return refreshInFlight;

    if (typeof messages.clearCache === 'function') messages.clearCache();
    refreshInFlight = Promise.resolve(messages.load({ fresh: true, currentUser: false }))
      .then(function (items) {
        lastError = '';
        setStatus('subscribed');
        dispatchSynced(items, trigger);
        return items;
      })
      .catch(function (error) {
        setStatus('degraded', error);
        throw error;
      })
      .finally(function () {
        refreshInFlight = null;
      });

    return refreshInFlight;
  }

  function scheduleRefresh(trigger) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      refreshCanonicalState(trigger).catch(function () {
        // Status event already exposes the fail-closed degradation.
      });
    }, REFRESH_DELAY_MS);
  }

  function rowBelongsToConversationParticipant(row, userId) {
    if (!row || typeof row !== 'object') return false;
    return String(row.client_id || '') === String(userId)
      || String(row.professional_id || '') === String(userId);
  }

  function handleConversationChange(userId, payload) {
    var row = payload && (payload.new || payload.record);
    if (!rowBelongsToConversationParticipant(row, userId)) {
      setStatus('degraded', createUnavailableError('Payload de conversa fora do escopo do participante.'));
      return;
    }
    scheduleRefresh({
      table: 'conversations',
      eventType: normalizeText(payload && payload.eventType).toUpperCase(),
      recordId: normalizeText(row && row.id)
    });
  }

  function handleMessageChange(payload) {
    var row = payload && (payload.new || payload.record);
    if (!row || !isUuid(row.conversation_id)) {
      setStatus('degraded', createUnavailableError('Payload de mensagem sem conversa canônica.'));
      return;
    }
    scheduleRefresh({
      table: 'messages',
      eventType: normalizeText(payload && payload.eventType).toUpperCase(),
      recordId: normalizeText(row.id),
      conversationId: normalizeText(row.conversation_id)
    });
  }

  function stop() {
    clearTimeout(refreshTimer);
    refreshTimer = null;
    var client = getClient();
    if (channel && client && typeof client.removeChannel === 'function') {
      try { client.removeChannel(channel); } catch (ignored) {}
    }
    channel = null;
    subscribedUserId = '';
    refreshInFlight = null;
    setStatus('stopped');
  }

  function attachConversationSubscriptions(nextChannel, userId) {
    ['INSERT', 'UPDATE'].forEach(function (eventName) {
      nextChannel.on('postgres_changes', {
        event: eventName,
        schema: 'public',
        table: 'conversations',
        filter: 'client_id=eq.' + userId
      }, function (payload) { handleConversationChange(userId, payload); });

      nextChannel.on('postgres_changes', {
        event: eventName,
        schema: 'public',
        table: 'conversations',
        filter: 'professional_id=eq.' + userId
      }, function (payload) { handleConversationChange(userId, payload); });
    });
    return nextChannel;
  }

  function attachMessageSubscriptions(nextChannel) {
    ['INSERT', 'UPDATE'].forEach(function (eventName) {
      nextChannel.on('postgres_changes', {
        event: eventName,
        schema: 'public',
        table: 'messages'
      }, handleMessageChange);
    });
    return nextChannel;
  }

  function start() {
    var config = getConfig();
    if (config.messagesRealtimeEnabled !== true) {
      setStatus('disabled');
      return Promise.resolve(null);
    }

    var client = getClient();
    if (!client || typeof client.channel !== 'function') {
      var unavailable = createUnavailableError('Cliente Supabase Realtime indisponível.');
      setStatus('unavailable', unavailable);
      return Promise.reject(unavailable);
    }

    return getSessionUser(client).then(function (user) {
      if (!user || !isUuid(user.id)) {
        var invalidSession = createUnavailableError('Sessão UUID autenticada é obrigatória para Realtime de mensagens.');
        setStatus('unavailable', invalidSession);
        throw invalidSession;
      }
      if (channel && subscribedUserId === user.id) return channel;

      stop();
      setStatus('connecting');

      var nextChannel = client.channel(CHANNEL_PREFIX + user.id);
      attachConversationSubscriptions(nextChannel, user.id);
      attachMessageSubscriptions(nextChannel);

      channel = nextChannel.subscribe(function (status) {
        if (status === 'SUBSCRIBED') setStatus('subscribed');
        else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setStatus('degraded', createUnavailableError('Canal Realtime de mensagens em estado ' + status + '.'));
        }
      });
      subscribedUserId = user.id;
      return channel;
    });
  }

  function getStatus() {
    return Object.freeze({
      status: lastStatus,
      error: lastError,
      userId: subscribedUserId,
      enabled: getConfig().messagesRealtimeEnabled === true,
      channelActive: Boolean(channel),
      deleteSubscribed: false,
      payloadAuthority: 'signal-only',
      canonicalAuthority: 'remote-only-reread'
    });
  }

  repositories.messagesRealtime = Object.freeze({
    start: start,
    stop: stop,
    getStatus: getStatus,
    refresh: refreshCanonicalState
  });

  function maybeStart() {
    if (!document.body || document.body.dataset.page !== 'mensagens') return;
    start().catch(function () {
      // The visible state is exposed through the status attribute/event.
    });
  }

  document.addEventListener('doke:supabase-client-ready', maybeStart);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', maybeStart);
  else maybeStart();
}());
`;

const auditScript = `#!/usr/bin/env node
'use strict';

const fs = require('fs');
const assert = require('assert');

const contract = JSON.parse(fs.readFileSync('config/msg-001-a04-realtime-publication-subscription-contract.json', 'utf8'));
const migration = fs.readFileSync('supabase/migrations/20260802183100_msg_a04_realtime_publication_contract.sql', 'utf8');
const realtime = fs.readFileSync('assets/js/repositories/messages-realtime-repository.js', 'utf8');
const config = fs.readFileSync('assets/js/core/supabase-config.js', 'utf8');
const html = fs.readFileSync('mensagens.html', 'utf8');
const matrix = JSON.parse(fs.readFileSync('config/domain-completion-matrix.json', 'utf8'));
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');

assert.strictEqual(contract.contractVersion, 'msg-a04-realtime-publication-subscription-v1');
assert.strictEqual(contract.publication.migrationApplied, false);
assert.strictEqual(contract.subscriptions.defaultEnabled, false);
assert.strictEqual(contract.subscriptions.deleteEvents.subscribed, false);
assert.strictEqual(contract.effects.stagingReads, 0);
assert.strictEqual(contract.effects.stagingMutations, 0);
assert.strictEqual(contract.effects.realtimePublicationChanges, 0);
assert.strictEqual(contract.effects.deployments, 0);

assert(migration.includes("alter publication supabase_realtime add table public.conversations"));
assert(migration.includes("alter publication supabase_realtime add table public.messages"));
assert(migration.includes('conversation_participants_select'));
assert(migration.includes('message_participants_select'));
assert(migration.includes('grant select on public.conversations to authenticated'));
assert(migration.includes('grant select on public.messages to authenticated'));
assert(!migration.toLowerCase().includes('replica identity full'));

assert(realtime.includes("['INSERT', 'UPDATE']"));
assert(!realtime.includes("event: 'DELETE'"));
assert(realtime.includes("filter: 'client_id=eq.' + userId"));
assert(realtime.includes("filter: 'professional_id=eq.' + userId"));
assert(realtime.includes("table: 'messages'"));
assert(realtime.includes("messages.load({ fresh: true, currentUser: false })"));
assert(realtime.includes("payloadAuthority: 'signal-only'"));
assert(!realtime.includes('localStorage'));
assert(!realtime.includes('.insert('));
assert(!realtime.includes('.update('));
assert(!realtime.includes('.delete('));

assert(config.includes('messagesRealtimeEnabled: false'));
assert(html.includes('assets/js/repositories/messages-realtime-repository.js'));

assert(msg, 'MSG-001 matrix domain missing');
[
  'assets/js/repositories/messages-realtime-repository.js',
  'supabase/migrations/20260802183100_msg_a04_realtime_publication_contract.sql',
  'config/msg-001-a04-realtime-publication-subscription-contract.json',
  'docs/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.md',
  'docs/validation/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.json',
  'scripts/audit-msg-001-a04-realtime-publication-subscription-contract.js',
  'scripts/test-msg-001-a04-realtime-publication-subscription-runtime.js',
  '.github/workflows/msg-001-a04-realtime-publication-subscription-contract.yml'
].forEach((requiredPath) => assert(msg.requiredPaths.includes(requiredPath), 'requiredPaths: ' + requiredPath));

assert(msg.tests.includes('audit:msg-001-a04-realtime-publication-subscription-contract'));
assert(msg.tests.includes('test:msg-001-a04-realtime-publication-subscription-runtime'));

console.log('MSG-A04 Realtime publication/subscription contract audit passed.');
`;

const runtimeTest = `#!/usr/bin/env node
'use strict';

const fs = require('fs');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync('assets/js/repositories/messages-realtime-repository.js', 'utf8');
const userId = '00000000-0000-4000-8000-000000000041';
const conversationId = '00000000-0000-4000-8000-000000000042';

function createHarness(enabled, sessionId) {
  const registrations = [];
  const events = [];
  let removedChannel = null;
  let loadCalls = 0;
  let clearCalls = 0;
  let subscribeCallback = null;

  const channel = {
    on(kind, filter, handler) {
      registrations.push({ kind, filter, handler });
      return this;
    },
    subscribe(callback) {
      subscribeCallback = callback;
      callback('SUBSCRIBED');
      return this;
    }
  };

  const client = {
    auth: {
      getSession() {
        return Promise.resolve({ data: { session: sessionId ? { user: { id: sessionId } } : null } });
      }
    },
    channel(name) {
      channel.name = name;
      return channel;
    },
    removeChannel(target) {
      removedChannel = target;
    }
  };

  function CustomEvent(type, init) {
    this.type = type;
    this.detail = init && init.detail;
  }

  const document = {
    readyState: 'complete',
    body: { dataset: { page: 'mensagens' } },
    documentElement: { setAttribute() {} },
    addEventListener() {},
    dispatchEvent(event) { events.push(event); }
  };

  const sandbox = {
    window: null,
    document,
    CustomEvent,
    Promise,
    Object,
    Array,
    String,
    RegExp,
    Error,
    JSON,
    setTimeout,
    clearTimeout,
    DOKE_SUPABASE_CONFIG: {
      enabled: true,
      messagesEnabled: true,
      messagesRealtimeEnabled: enabled
    },
    DokeSupabase: {
      getClient() { return client; }
    },
    Doke: {
      repositories: {
        messages: {
          clearCache() { clearCalls += 1; },
          load(options) {
            loadCalls += 1;
            assert.strictEqual(options.fresh, true);
            assert.strictEqual(options.currentUser, false);
            return Promise.resolve([{ id: 'conv_remote' }]);
          }
        }
      }
    }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, { filename: 'messages-realtime-repository.js' });

  return {
    repository: sandbox.Doke.repositories.messagesRealtime,
    registrations,
    events,
    channel,
    getRemovedChannel: () => removedChannel,
    getLoadCalls: () => loadCalls,
    getClearCalls: () => clearCalls,
    getSubscribeCallback: () => subscribeCallback
  };
}

(async function () {
  const disabled = createHarness(false, userId);
  await disabled.repository.start();
  assert.strictEqual(disabled.registrations.length, 0);
  assert.strictEqual(disabled.repository.getStatus().status, 'disabled');

  const invalid = createHarness(true, 'fixture-user');
  await assert.rejects(
    () => invalid.repository.start(),
    (error) => error && error.code === 'DOKE_MESSAGES_REALTIME_UNAVAILABLE'
  );
  assert.strictEqual(invalid.registrations.length, 0);

  const active = createHarness(true, userId);
  await active.repository.start();
  assert.strictEqual(active.registrations.length, 6);
  assert(active.registrations.every((entry) => entry.kind === 'postgres_changes'));
  assert(active.registrations.every((entry) => entry.filter.event !== 'DELETE'));

  const conversationFilters = active.registrations
    .filter((entry) => entry.filter.table === 'conversations')
    .map((entry) => entry.filter.filter);
  assert(conversationFilters.includes('client_id=eq.' + userId));
  assert(conversationFilters.includes('professional_id=eq.' + userId));

  const messageInsert = active.registrations.find((entry) =>
    entry.filter.table === 'messages' && entry.filter.event === 'INSERT'
  );
  messageInsert.handler({
    eventType: 'INSERT',
    new: { id: '00000000-0000-4000-8000-000000000043', conversation_id: conversationId }
  });

  await new Promise((resolve) => setTimeout(resolve, 120));
  assert.strictEqual(active.getClearCalls(), 1);
  assert.strictEqual(active.getLoadCalls(), 1);
  assert(active.events.some((event) => event.type === 'doke:messages-realtime-synced'));
  assert.strictEqual(active.repository.getStatus().payloadAuthority, 'signal-only');
  assert.strictEqual(active.repository.getStatus().canonicalAuthority, 'remote-only-reread');
  assert.strictEqual(active.repository.getStatus().deleteSubscribed, false);

  active.repository.stop();
  assert.strictEqual(active.getRemovedChannel(), active.channel);

  console.log('MSG-A04 Realtime publication/subscription runtime test passed.');
}()).catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
`;

const docs = `# MSG-001 A04 — Realtime Publication and Subscription Contract

## Resultado

O lote congela, em modo **repository-only e desativado por padrão**, o contrato de Realtime para conversas e mensagens.

Nenhuma migration foi aplicada. Nenhuma tabela foi adicionada à publicação do staging. Nenhum canal foi ativado para usuários reais.

## Autoridade

- \`public.conversations\`: somente cliente ou profissional participante pode ler.
- \`public.messages\`: somente participantes da conversa podem ler.
- A autorização dos eventos Postgres Changes deriva das políticas RLS de \`SELECT\`.
- O browser não recebe \`service_role\` e não executa DML por este módulo.

## Publicação preparada

A migration local prepara:

- \`public.conversations\` na publicação \`supabase_realtime\`;
- \`public.messages\` na publicação \`supabase_realtime\`;
- políticas participant-scoped;
- índices para filtros e verificações RLS.

A aplicação exige autorização explícita nova e canário autenticado de isolamento.

## Assinaturas

Para \`conversations\`, o canal registra \`INSERT\` e \`UPDATE\` com dois filtros:

- \`client_id=eq.<auth.uid>\`;
- \`professional_id=eq.<auth.uid>\`.

Para \`messages\`, registra \`INSERT\` e \`UPDATE\`. A entrega é limitada pelas políticas RLS que validam participação na conversa.

## Por que DELETE não é assinado

Supabase Postgres Changes não permite filtrar eventos \`DELETE\`, e RLS não é aplicada ao registro já removido. O contrato não consome \`DELETE\`.

Após um comando server-owned de remoção, a reconciliação deve ocorrer por nova leitura canônica.

## Payload não é autoridade

O payload Realtime serve apenas como sinal de invalidação. Ao receber um evento:

1. o cache do repositório é limpo;
2. uma leitura \`remote-only\` com \`fresh: true\` é executada;
3. a UI recebe o evento \`doke:messages-realtime-synced\` com o snapshot revalidado.

Isso evita confiar diretamente em payload parcial, duplicado ou fora de ordem.

## Feature flag

\`messagesRealtimeEnabled\` permanece \`false\`.

A flag só pode ser habilitada depois de:

1. aplicar a migration em staging com autorização explícita;
2. confirmar publicação das duas tabelas;
3. provar isolamento entre participante e não participante;
4. provar reconexão e recuperação após perda do canal.

## Fora do escopo

Presença e digitação ainda usam o mecanismo local legado e não são promovidas a autoridade cross-device neste lote.

## Segurança operacional

- staging reads: 0;
- staging mutations: 0;
- migrations aplicadas: 0;
- alterações reais na publicação: 0;
- subscriptions ativas por padrão: 0;
- deploys: 0;
- produção: intocada;
- mensagens reais alteradas: 0;
- merge: 0.
`;

const validation = {
  schemaVersion: 1,
  domain: 'MSG-001',
  lot: 'MSG-A04',
  status: 'passed_repository_only',
  observedAt,
  headBeforeLot: baseHead,
  assertions: [
    'migration draft publishes conversations and messages only when explicitly applied',
    'RLS select policies are participant-scoped',
    'conversation subscriptions use client and professional filters',
    'message subscriptions rely on participant RLS',
    'DELETE is not subscribed',
    'payloads trigger authoritative remote rereads',
    'feature flag is disabled by default',
    'no staging or production operation occurred'
  ],
  effects: contract.effects
};

write('supabase/migrations/20260802183100_msg_a04_realtime_publication_contract.sql', migration);
write('assets/js/repositories/messages-realtime-repository.js', realtimeRepository);
write('config/msg-001-a04-realtime-publication-subscription-contract.json', JSON.stringify(contract, null, 2) + '\n');
write('docs/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.md', docs);
write('docs/validation/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.json', JSON.stringify(validation, null, 2) + '\n');
write('scripts/audit-msg-001-a04-realtime-publication-subscription-contract.js', auditScript);
write('scripts/test-msg-001-a04-realtime-publication-subscription-runtime.js', runtimeTest);

let supabaseConfig = read('assets/js/core/supabase-config.js');
supabaseConfig = replaceOnce(
  supabaseConfig,
  '  messagesEnabled: true,\n',
  '  messagesEnabled: true,\n  messagesRealtimeEnabled: false,\n',
  'Supabase messages Realtime feature flag'
);
write('assets/js/core/supabase-config.js', supabaseConfig);

let messagesHtml = read('mensagens.html');
messagesHtml = replaceOnce(
  messagesHtml,
  '<script src="assets/js/core/supabase-config.js?v=20260719-singleton-client-v1" defer></script>\n',
  '<script src="assets/js/core/supabase-config.js?v=20260719-singleton-client-v1" defer></script>\n<script src="assets/js/repositories/messages-realtime-repository.js?v=20260802-msg-a04-v1" defer></script>\n',
  'messages Realtime repository script'
);
write('mensagens.html', messagesHtml);

const pkg = JSON.parse(read('package.json'));
pkg.scripts['audit:msg-001-a04-realtime-publication-subscription-contract'] =
  'node scripts/audit-msg-001-a04-realtime-publication-subscription-contract.js';
pkg.scripts['test:msg-001-a04-realtime-publication-subscription-runtime'] =
  'node scripts/test-msg-001-a04-realtime-publication-subscription-runtime.js';
write('package.json', JSON.stringify(pkg, null, 2) + '\n');

const matrixPath = 'config/domain-completion-matrix.json';
const matrix = JSON.parse(read(matrixPath));
matrix.version = '1.3.81';
matrix.updatedAt = observedAt;
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
if (!msg) throw new Error('MSG-001 matrix domain missing');

[
  'assets/js/repositories/messages-realtime-repository.js',
  'supabase/migrations/20260802183100_msg_a04_realtime_publication_contract.sql',
  'config/msg-001-a04-realtime-publication-subscription-contract.json',
  'docs/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.md',
  'docs/validation/MSG-001-A04-REALTIME-PUBLICATION-SUBSCRIPTION-CONTRACT.json',
  'scripts/audit-msg-001-a04-realtime-publication-subscription-contract.js',
  'scripts/test-msg-001-a04-realtime-publication-subscription-runtime.js',
  '.github/workflows/msg-001-a04-realtime-publication-subscription-contract.yml'
].forEach((value) => pushUnique(msg.requiredPaths, value));

pushUnique(
  msg.evidence,
  'MSG-A04 repository-only participant-scoped Realtime publication/subscription contract: conversations and messages are prepared for RLS-authorized INSERT/UPDATE invalidation signals, feature-flagged off until explicit staging application and canaries.'
);
pushUnique(msg.tests, 'audit:msg-001-a04-realtime-publication-subscription-contract');
pushUnique(msg.tests, 'test:msg-001-a04-realtime-publication-subscription-runtime');
msg.nextActions = contract.orderedNextActions.slice();

write(matrixPath, JSON.stringify(matrix, null, 2) + '\n');

console.log('MSG-A04 compact generator completed.');
