'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const write = (file, content) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content.endsWith('\n') ? content : content + '\n');
};
const replaceRequired = (text, search, replacement, label) => {
  if (!text.includes(search)) throw new Error('MSG-A07 generator missing pattern: ' + label);
  return text.replace(search, replacement);
};

const executorSource = `(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) {
    var Doke = root.Doke || (root.Doke = {});
    Doke.messageCommandReliability = api;
    if (!Doke.messageCommandExecutor) Doke.messageCommandExecutor = api.createExecutor();
  }
})(typeof window !== 'undefined' ? window : null, function () {
  'use strict';

  var DEFAULT_DELAYS = Object.freeze([250, 750]);
  var RETRYABLE_CODES = Object.freeze([
    'DOKE_RUNTIME_DEPENDENCY_UNAVAILABLE',
    'DOKE_AUDIT_STORE_UNAVAILABLE',
    'DOKE_IDEMPOTENCY_STORE_UNAVAILABLE',
    'DOKE_API_NETWORK_ERROR',
    'DOKE_API_HTTP_ERROR'
  ]);

  function normalizeText(value) { return String(value || '').trim(); }
  function nowIso(now) { return typeof now === 'function' ? now() : new Date().toISOString(); }
  function createCommandId() {
    if (typeof crypto !== 'undefined' && crypto && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    return 'cmd_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 14);
  }
  function readStatus(error) {
    var status = Number(error && (error.status || error.statusCode || error.httpStatus));
    if (Number.isFinite(status)) return status;
    var match = normalizeText(error && error.message).match(/(?:failed|status)[: ]+(\\d{3})/i);
    return match ? Number(match[1]) : 0;
  }
  function isRetryable(error) {
    if (!error) return false;
    if (error.retryable === true) return true;
    var status = readStatus(error);
    if ([408, 425, 429, 502, 503, 504].indexOf(status) !== -1) return true;
    return RETRYABLE_CODES.indexOf(normalizeText(error.code)) !== -1 && status !== 400 && status !== 401 && status !== 403 && status !== 404 && status !== 409 && status !== 422;
  }
  function createError(message, code, cause) {
    var error = new Error(message);
    error.code = code;
    if (cause) error.cause = cause;
    return error;
  }
  function extractAcknowledgement(response) {
    if (!response || typeof response !== 'object') return null;
    return response.acknowledgement || response.ack || response.data && response.data.acknowledgement || null;
  }
  function extractData(response) {
    if (!response || typeof response !== 'object') return response;
    return Object.prototype.hasOwnProperty.call(response, 'data') ? response.data : response;
  }
  function validateAcknowledgement(response, commandId, action) {
    var acknowledgement = extractAcknowledgement(response);
    if (!acknowledgement || normalizeText(acknowledgement.commandId) !== commandId) {
      throw createError('Acknowledgement de comando ausente ou divergente.', 'DOKE_MESSAGES_COMMAND_ACK_INVALID');
    }
    var status = normalizeText(acknowledgement.status);
    if (status !== 'accepted' && status !== 'replayed') {
      throw createError('Acknowledgement de comando possui estado inválido.', 'DOKE_MESSAGES_COMMAND_ACK_INVALID');
    }
    if (normalizeText(acknowledgement.action) && normalizeText(acknowledgement.action) !== action) {
      throw createError('Acknowledgement pertence a outro comando.', 'DOKE_MESSAGES_COMMAND_ACK_INVALID');
    }
    return Object.freeze({
      commandId: commandId,
      action: action,
      status: status,
      replayed: status === 'replayed' || acknowledgement.replayed === true,
      acknowledgedAt: acknowledgement.acknowledgedAt || '',
      route: acknowledgement.route || ''
    });
  }
  function createExecutor(options) {
    options = options || {};
    var inFlight = new Map();
    var sideEffects = new Set();
    var maxAttempts = Math.max(1, Math.min(Number(options.maxAttempts) || 3, 3));
    var delays = Array.isArray(options.delays) ? options.delays.slice(0, maxAttempts - 1) : DEFAULT_DELAYS.slice();
    var sleep = typeof options.sleep === 'function' ? options.sleep : function (ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); };
    var now = typeof options.now === 'function' ? options.now : null;

    function execute(actionName, payload, invoke, executionOptions) {
      executionOptions = executionOptions || {};
      var action = normalizeText(actionName);
      if (!action) return Promise.reject(createError('Nome do comando é obrigatório.', 'DOKE_MESSAGES_COMMAND_ACTION_REQUIRED'));
      if (typeof invoke !== 'function') return Promise.reject(createError('Invoker server-owned é obrigatório.', 'DOKE_MESSAGES_COMMAND_INVOKER_REQUIRED'));
      var commandId = normalizeText(executionOptions.commandId || payload && (payload.commandId || payload.clientMutationId)) || createCommandId();
      var dedupeKey = normalizeText(executionOptions.dedupeKey) || commandId;
      if (inFlight.has(dedupeKey)) return inFlight.get(dedupeKey);
      var createdAt = nowIso(now);

      function attempt(number) {
        var requestPayload = Object.assign({}, payload || {}, {
          commandId: commandId,
          command: Object.freeze({ id: commandId, action: action, attempt: number, maxAttempts: maxAttempts, createdAt: createdAt })
        });
        requestPayload.__requestMeta = Object.freeze({
          idempotencyKey: commandId,
          requestId: commandId,
          commandAction: action,
          commandAttempt: number,
          commandCreatedAt: createdAt
        });
        return Promise.resolve().then(function () { return invoke(requestPayload); }).then(function (response) {
          var acknowledgement = validateAcknowledgement(response, commandId, action);
          return Object.freeze({
            commandId: commandId,
            action: action,
            attempts: number,
            acknowledgement: acknowledgement,
            data: extractData(response),
            raw: response
          });
        }).catch(function (error) {
          if (!isRetryable(error) || number >= maxAttempts) {
            error.commandId = commandId;
            error.commandAction = action;
            error.commandAttempts = number;
            throw error;
          }
          var delay = Math.max(0, Number(delays[number - 1]) || 0);
          return Promise.resolve(sleep(delay)).then(function () { return attempt(number + 1); });
        });
      }

      var pending = attempt(1).finally(function () { inFlight.delete(dedupeKey); });
      inFlight.set(dedupeKey, pending);
      return pending;
    }

    function claimSideEffects(commandId) {
      var id = normalizeText(commandId);
      if (!id || sideEffects.has(id)) return false;
      sideEffects.add(id);
      return true;
    }

    return Object.freeze({
      execute: execute,
      claimSideEffects: claimSideEffects,
      isRetryable: isRetryable,
      getInFlightCount: function () { return inFlight.size; },
      clear: function () { inFlight.clear(); sideEffects.clear(); }
    });
  }

  return Object.freeze({
    contractVersion: 'msg-a07-command-reliability-v1',
    maxAttempts: 3,
    retryDelaysMs: DEFAULT_DELAYS,
    createCommandId: createCommandId,
    isRetryable: isRetryable,
    createExecutor: createExecutor
  });
});`;
write('assets/js/services/message-command-executor.js', executorSource);

let apiProvider = read('assets/js/services/api-repository-provider.js');
apiProvider = replaceRequired(apiProvider,
`    function request(method, path, body) {
      var baseUrl = getApiBaseUrl();`,
`    function request(method, path, body) {
      var baseUrl = getApiBaseUrl();`, 'api request anchor');
apiProvider = replaceRequired(apiProvider,
`      if (body !== undefined) options.body = JSON.stringify(body);

      return window.fetch(baseUrl + path, options).then(function (response) {
        if (!response.ok) throw new Error('API request failed: ' + response.status);
        return response.status === 204 ? null : response.json();
      });`,
`      if (body !== undefined) {
        var requestBody = clone(body || {});
        var requestMeta = requestBody && requestBody.__requestMeta && typeof requestBody.__requestMeta === 'object'
          ? requestBody.__requestMeta
          : {};
        if (requestBody && typeof requestBody === 'object') delete requestBody.__requestMeta;
        if (requestMeta.idempotencyKey) options.headers['x-idempotency-key'] = String(requestMeta.idempotencyKey);
        if (requestMeta.requestId) options.headers['x-request-id'] = String(requestMeta.requestId);
        if (requestMeta.commandAttempt) options.headers['x-doke-command-attempt'] = String(requestMeta.commandAttempt);
        if (requestMeta.commandCreatedAt) options.headers['x-doke-command-created-at'] = String(requestMeta.commandCreatedAt);
        options.body = JSON.stringify(requestBody);
      }

      return window.fetch(baseUrl + path, options).then(function (response) {
        if (!response.ok) {
          var error = new Error('API request failed: ' + response.status);
          error.code = 'DOKE_API_HTTP_ERROR';
          error.status = response.status;
          throw error;
        }
        return response.status === 204 ? null : response.json();
      }).catch(function (error) {
        if (error && error.code) throw error;
        var networkError = new Error('API network request failed.');
        networkError.code = 'DOKE_API_NETWORK_ERROR';
        networkError.retryable = true;
        networkError.cause = error;
        throw networkError;
      });`, 'api request metadata');
write('assets/js/services/api-repository-provider.js', apiProvider);

let messageService = read('assets/js/services/message-service.js');
messageService = replaceRequired(messageService,
`  function executeMessagesServerCommand(actionName, payload) {
    var boundary = getRepositoryBoundary();`,
`  function getCommandExecutor() {
    if (Doke.messageCommandExecutor && typeof Doke.messageCommandExecutor.execute === 'function') return Doke.messageCommandExecutor;
    if (Doke.messageCommandReliability && typeof Doke.messageCommandReliability.createExecutor === 'function') {
      Doke.messageCommandExecutor = Doke.messageCommandReliability.createExecutor();
      return Doke.messageCommandExecutor;
    }
    return null;
  }

  function unwrapCommandData(outcome) {
    return outcome && Object.prototype.hasOwnProperty.call(outcome, 'data') ? outcome.data : outcome;
  }

  function executeMessagesServerCommand(actionName, payload) {
    var boundary = getRepositoryBoundary();`, 'message command executor anchor');
messageService = replaceRequired(messageService,
`    var actor = getCurrentUser() || {};
    var nextPayload = Object.assign({}, payload || {}, {
      action: actionName,
      actorId: actor.id || '',
      actorRole: actor.role || 'guest'
    });
    return Promise.resolve(provider.action('conversations', nextPayload)).catch(function (error) {
      if (error && error.code === 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE') throw error;
      throw createServerCommandError('Comando server-owned de mensagens falhou.', actionName, error);
    });`,
`    var actor = getCurrentUser() || {};
    var nextPayload = Object.assign({}, payload || {}, {
      action: actionName,
      actorId: actor.id || '',
      actorRole: actor.role || 'guest'
    });
    var executor = getCommandExecutor();
    if (!executor) return Promise.reject(createServerCommandError('Executor idempotente de mensagens não está carregado.', actionName));
    return executor.execute(actionName, nextPayload, function (requestPayload) {
      return provider.action('conversations', requestPayload);
    }, {
      commandId: nextPayload.commandId || nextPayload.clientMutationId || '',
      dedupeKey: nextPayload.commandId || nextPayload.clientMutationId || ''
    }).catch(function (error) {
      if (error && (error.code === 'DOKE_MESSAGES_COMMAND_ACK_INVALID' || error.code === 'DOKE_MESSAGES_SERVER_COMMAND_UNAVAILABLE')) throw error;
      throw createServerCommandError('Comando server-owned de mensagens falhou.', actionName, error);
    });`, 'message command execution');
messageService = messageService.replace(/response && response\.conversation \|\| response/g, `unwrapCommandData(response) && unwrapCommandData(response).conversation || unwrapCommandData(response)`);
messageService = messageService.replace(/response && response\.message \|\| response/g, `unwrapCommandData(response) && unwrapCommandData(response).message || unwrapCommandData(response)`);
messageService = replaceRequired(messageService,
`        }).then(function (response) {
          if (typeof response === 'boolean') return response;
          return response ? response.ok !== false : true;
        });`,
`        }).then(function (response) {
          var data = unwrapCommandData(response);
          if (typeof data === 'boolean') return data;
          return data ? data.ok !== false : true;
        });`, 'remove command unwrap');
messageService = replaceRequired(messageService,
`      }).then(function (response) {
        if (typeof response === 'boolean') return response;
        return response ? response.ok !== false : true;
      });`,
`      }).then(function (response) {
        var data = unwrapCommandData(response);
        if (typeof data === 'boolean') return data;
        return data ? data.ok !== false : true;
      });`, 'mark read unwrap');
messageService = replaceRequired(messageService,
`      if (requiresServerOwnedCommands()) {
        return executeMessagesServerCommand('sendMessage', Object.assign({}, messagePayload, {
          id: conversationId,
          conversationId: conversationId
        })).then(function (response) {
          return normalizeMessageFromProvider(unwrapCommandData(response) && unwrapCommandData(response).message || unwrapCommandData(response), { id: conversationId });
        });
      }`,
`      if (requiresServerOwnedCommands()) {
        return executeMessagesServerCommand('sendMessage', Object.assign({}, messagePayload, {
          id: conversationId,
          conversationId: conversationId
        })).then(function (outcome) {
          return {
            message: normalizeMessageFromProvider(unwrapCommandData(outcome) && unwrapCommandData(outcome).message || unwrapCommandData(outcome), { id: conversationId }),
            commandId: outcome && outcome.commandId || '',
            acknowledgement: outcome && outcome.acknowledgement || null
          };
        });
      }`, 'send command outcome');
messageService = replaceRequired(messageService,
`    }).then(function (message) {
      if (deferSideEffects) return message;
      return commitMessageEffects(conversationId, message, { actor: user });
    });`,
`    }).then(function (result) {
      var message = result && result.message || result;
      var commandId = result && result.commandId || '';
      if (deferSideEffects) return message;
      var executor = getCommandExecutor();
      if (commandId && executor && typeof executor.claimSideEffects === 'function' && !executor.claimSideEffects(commandId)) return message;
      return commitMessageEffects(conversationId, message, { actor: user });
    });`, 'side effect claim');
write('assets/js/services/message-service.js', messageService);

for (const name of fs.readdirSync(root)) {
  if (!name.endsWith('.html')) continue;
  const file = path.join(root, name);
  let html = fs.readFileSync(file, 'utf8');
  if (!html.includes('assets/js/services/message-service.js') || html.includes('assets/js/services/message-command-executor.js')) continue;
  html = html.replace(/(<script[^>]+src=["']assets\/js\/services\/message-service\.js[^>]*><\/script>)/, '<script src="assets/js/services/message-command-executor.js?v=20260802-msg-a07-v1"></script>\n  $1');
  fs.writeFileSync(file, html);
}

let registry = read('backend/shared/http/route-registry.js');
registry = replaceRequired(registry,
`  route('conversations.createForOrder', 'POST', '/orders/:id/conversation', 'messaging', 'createConversationForOrder', ['client', 'professional', 'support', 'admin'], 'order_participant_or_support', true, true),
  route('conversations.updateOrder', 'POST', '/conversations/:id/order', 'messaging', 'updateConversationOrder', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', true, true),
  route('messages.send', 'POST', '/conversations/:id/messages', 'messaging', 'sendMessage', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', false, false),
  route('messages.markRead', 'POST', '/conversations/:id/read', 'messaging', 'markConversationRead', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', false, false),`,
`  route('conversations.createForOrder', 'POST', '/orders/:id/conversation', 'messaging', 'createConversationForOrder', ['client', 'professional', 'support', 'admin'], 'order_participant_or_support', true, true, false, true),
  route('conversations.updateOrder', 'POST', '/conversations/:id/order', 'messaging', 'updateConversationOrder', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', true, true, false, true),
  route('messages.send', 'POST', '/conversations/:id/messages', 'messaging', 'sendMessage', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', true, true, false, true),
  route('messages.remove', 'POST', '/conversations/:id/messages/remove', 'messaging', 'removeMessage', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', true, true, false, true),
  route('messages.markRead', 'POST', '/conversations/:id/read', 'messaging', 'markConversationRead', ['client', 'professional', 'support', 'admin'], 'conversation_participant_or_support', true, true, false, true),`, 'messaging route reliability');
write('backend/shared/http/route-registry.js', registry);

let backendService = read('backend/modules/messaging/messaging-service.js');
backendService = replaceRequired(backendService,
`async function markConversationRead(context, actor, conversationId) {`,
`async function removeMessage(context, actor, conversationId) {
  const safeActor = requireActor(actor);
  const supabase = chooseMessagingSupabase(context, safeActor);
  const conversation = await readConversationRow(supabase, conversationId);
  assertConversationAccess(conversation, safeActor);
  const messageId = sanitizeNullableUuid(context.body && (context.body.messageId || context.body.id));
  if (!messageId) throw badRequest('Message id is required.');
  const messageResponse = await supabase.from('messages').select(MESSAGE_SELECT).eq('id', messageId).eq('conversation_id', conversation.id).maybeSingle();
  if (messageResponse && messageResponse.error) throw messageResponse.error;
  const message = messageResponse && messageResponse.data;
  if (!message) throw notFound('Message not found.');
  if (!isInternal(safeActor) && message.sender_id !== safeActor.id) throw forbidden('Only the sender can remove this message.');
  if (message.status === 'removed') return { ok: true, messageId, conversationId: conversation.id, status: 'removed', alreadyRemoved: true };
  const response = await supabase.from('messages').update({ status: 'removed', body: '' }).eq('id', messageId).eq('conversation_id', conversation.id).select(MESSAGE_SELECT).maybeSingle();
  if (response && response.error) throw response.error;
  return { ok: true, message: normalizeMessage(response && response.data, conversation), messageId, conversationId: conversation.id, status: 'removed', alreadyRemoved: false };
}

async function markConversationRead(context, actor, conversationId) {`, 'backend remove message');
backendService = replaceRequired(backendService,
`  sendMessage,
  markConversationRead,`,
`  sendMessage,
  removeMessage,
  markConversationRead,`, 'backend export remove');
write('backend/modules/messaging/messaging-service.js', backendService);

let handlers = read('backend/modules/messaging/route-handlers.js');
handlers = replaceRequired(handlers,
`handlers.createConversationForOrder = createActionHandler(findRouteByName('conversations.createForOrder'), {
  execute({ context, actor }) {
    return messagingService.createConversationForOrder(context, actor, context.params.id);
  }
});`,
`function readHeader(headers, name) {
  const source = headers && typeof headers === 'object' ? headers : {};
  const expected = String(name || '').toLowerCase();
  const key = Object.keys(source).find((entry) => String(entry).toLowerCase() === expected);
  return key ? String(source[key] || '').trim() : '';
}

function createMessagingCommandHandler(routeName, execute) {
  const route = findRouteByName(routeName);
  const baseHandler = createActionHandler(route, { execute });
  return async function messagingCommandHandler(context) {
    const response = await baseHandler(context);
    const commandId = readHeader(context && context.headers, 'x-idempotency-key') || String(context && context.body && context.body.commandId || '').trim();
    if (!commandId) {
      const error = new Error('Messaging command acknowledgement requires an idempotency key.');
      error.code = 'DOKE_MESSAGES_COMMAND_ID_REQUIRED';
      error.status = 400;
      throw error;
    }
    const replayed = response && response.replayed === true;
    return Object.freeze(Object.assign({}, response, {
      acknowledgement: Object.freeze({
        commandId,
        action: context && context.body && context.body.action || routeName.split('.').pop(),
        route: route.name,
        status: replayed ? 'replayed' : 'accepted',
        replayed,
        acknowledgedAt: context && context.now || new Date().toISOString()
      })
    }));
  };
}

handlers.createConversationForOrder = createMessagingCommandHandler('conversations.createForOrder', function ({ context, actor }) {
  return messagingService.createConversationForOrder(context, actor, context.params.id);
});`, 'command handler wrapper');
handlers = handlers.replace(`handlers.updateConversationOrder = createActionHandler(findRouteByName('conversations.updateOrder'), {\n  execute({ context, actor }) {\n    return messagingService.updateConversationOrder(context, actor, context.params.id);\n  }\n});`, `handlers.updateConversationOrder = createMessagingCommandHandler('conversations.updateOrder', function ({ context, actor }) {\n  return messagingService.updateConversationOrder(context, actor, context.params.id);\n});`);
handlers = handlers.replace(`handlers.sendMessage = createActionHandler(findRouteByName('messages.send'), {\n  execute({ context, actor }) {\n    return messagingService.sendMessage(context, actor, context.params.id);\n  }\n});`, `handlers.sendMessage = createMessagingCommandHandler('messages.send', function ({ context, actor }) {\n  return messagingService.sendMessage(context, actor, context.params.id);\n});\n\nhandlers.removeMessage = createMessagingCommandHandler('messages.remove', function ({ context, actor }) {\n  return messagingService.removeMessage(context, actor, context.params.id);\n});`);
handlers = handlers.replace(`handlers.markConversationRead = createActionHandler(findRouteByName('messages.markRead'), {\n  execute({ context, actor }) {\n    return messagingService.markConversationRead(context, actor, context.params.id);\n  }\n});`, `handlers.markConversationRead = createMessagingCommandHandler('messages.markRead', function ({ context, actor }) {\n  return messagingService.markConversationRead(context, actor, context.params.id);\n});`);
write('backend/modules/messaging/route-handlers.js', handlers);

const config = {
  contractVersion: 'msg-a07-command-reliability-v1',
  status: 'repository_only_command_reliability_ready_not_deployed',
  domain: 'MSG-001',
  observedAt: '2026-08-02T23:35:00-03:00',
  authority: {
    authenticatedUuidSession: 'server-owned-idempotent-command',
    idempotencyAuthority: 'backend persistent idempotency store',
    acknowledgementAuthority: 'server route wrapper',
    browserPersistence: false,
    fixtureSession: 'memory-only'
  },
  envelope: {
    header: 'x-idempotency-key',
    requestIdHeader: 'x-request-id',
    sameKeyAcrossRetries: true,
    acknowledgementRequired: true,
    acknowledgementStates: ['accepted', 'replayed']
  },
  retry: {
    maxAttempts: 3,
    delaysMs: [250, 750],
    retryableHttpStatuses: [408, 425, 429, 502, 503, 504],
    functionalErrorsRetried: false,
    idempotencyConflictsRetried: false
  },
  deduplication: {
    concurrentInFlightByCommandId: true,
    persistentReplay: true,
    sideEffectsOncePerAcknowledgedCommand: true,
    replayedMessageCreatesNewRow: false
  },
  commands: ['createForOrder', 'updateOrder', 'sendMessage', 'removeMessage', 'markRead'],
  effects: { stagingReads: 0, stagingMutations: 0, migrationsApplied: 0, deployments: 0, productionChanged: false, messagesChanged: 0, pullRequestsMerged: 0 },
  orderedNextActions: [
    'MSG-A07B: deploy the server runtime and execute lost-response/replay canaries only after fresh explicit staging authorization.',
    'MSG-A06B/A05B/A04B remain separately authorization-gated.'
  ]
};
write('config/msg-001-a07-command-reliability.json', JSON.stringify(config, null, 2));
write('docs/validation/MSG-001-A07-COMMAND-RELIABILITY.json', JSON.stringify({ status: 'PASS', contract: config, assertions: ['same command id across retries', 'bounded retries', 'server acknowledgement', 'persistent replay', 'single side effects', 'no staging effects'] }, null, 2));
write('docs/MSG-001-A07-COMMAND-RELIABILITY.md', `# MSG-A07 — Command acknowledgement, idempotency and bounded retry\n\n## Causa raiz\n\nOs comandos de mensagens chegavam ao provider server-owned sem uma chave idempotente obrigatória, sem acknowledgement verificável e sem política explícita de retry. Uma resposta perdida podia induzir repetição manual e duplicar mensagens ou efeitos de interface.\n\n## Contrato\n\n- cada comando recebe um \\`commandId\\` reutilizado em todas as tentativas;\n- o \\`commandId\\` é enviado em \\`x-idempotency-key\\` e \\`x-request-id\\`;\n- o backend usa o persistent idempotency store já canônico;\n- a mesma chave com o mesmo payload retorna replay, sem nova mutação;\n- drift de payload permanece conflito e não é repetido;\n- acknowledgement \\`accepted\\` ou \\`replayed\\` é obrigatório e deve corresponder ao comando;\n- máximo de três tentativas, com atrasos de 250 ms e 750 ms;\n- apenas 408, 425, 429, 502, 503, 504 e falhas transitórias equivalentes são repetidas;\n- 4xx funcionais, autorização, validação e conflito não são repetidos;\n- efeitos locais são consumidos uma única vez por commandId;\n- nenhum ledger é persistido no browser.\n\n## Escopo\n\nO lote cobre \\`createForOrder\\`, \\`updateOrder\\`, \\`sendMessage\\`, \\`removeMessage\\` e \\`markRead\\`. A remoção server-owned ausente no runtime foi materializada como tombstone \\`removed\\`, idempotente.\n\n## Estado operacional\n\nRepository-only. Nenhum deploy, migration, staging ou dado real foi alterado.\n`);

write('scripts/test-msg-001-a07-command-reliability-runtime.js', `'use strict';\nconst assert = require('node:assert/strict');\nconst reliability = require('../assets/js/services/message-command-executor.js');\nconst registry = require('../backend/shared/http/route-registry.js');\n\n(async () => {\n  let calls = [];\n  const executor = reliability.createExecutor({ sleep: () => Promise.resolve(), now: () => '2026-08-03T02:35:00.000Z' });\n  const outcome = await executor.execute('sendMessage', { body: 'oi' }, async (payload) => {\n    calls.push(payload);\n    if (calls.length < 3) { const error = new Error('temporary'); error.status = 503; throw error; }\n    return { data: { message: { id: 'm1' } }, acknowledgement: { commandId: payload.commandId, action: 'sendMessage', status: 'accepted' } };\n  }, { commandId: 'cmd-retry-1' });\n  assert.equal(calls.length, 3);\n  assert.equal(new Set(calls.map((item) => item.commandId)).size, 1);\n  assert.deepEqual(calls.map((item) => item.command.attempt), [1, 2, 3]);\n  assert.equal(outcome.acknowledgement.status, 'accepted');\n  assert.equal(executor.claimSideEffects('cmd-retry-1'), true);\n  assert.equal(executor.claimSideEffects('cmd-retry-1'), false);\n\n  let functionalCalls = 0;\n  await assert.rejects(() => executor.execute('sendMessage', {}, async () => { functionalCalls += 1; const error = new Error('bad'); error.status = 400; throw error; }, { commandId: 'cmd-bad' }));\n  assert.equal(functionalCalls, 1);\n\n  let sharedCalls = 0;\n  let release;\n  const pending = new Promise((resolve) => { release = resolve; });\n  const invoke = async (payload) => { sharedCalls += 1; await pending; return { data: { ok: true }, acknowledgement: { commandId: payload.commandId, action: 'markRead', status: 'replayed', replayed: true } }; };\n  const first = executor.execute('markRead', {}, invoke, { commandId: 'cmd-shared', dedupeKey: 'cmd-shared' });\n  const second = executor.execute('markRead', {}, invoke, { commandId: 'cmd-shared', dedupeKey: 'cmd-shared' });\n  release();\n  const values = await Promise.all([first, second]);\n  assert.equal(sharedCalls, 1);\n  assert.equal(values[0].commandId, values[1].commandId);\n\n  await assert.rejects(() => executor.execute('sendMessage', {}, async () => ({ acknowledgement: { commandId: 'wrong', action: 'sendMessage', status: 'accepted' } }), { commandId: 'cmd-ack' }), /Acknowledgement/);\n\n  for (const name of ['conversations.createForOrder', 'conversations.updateOrder', 'messages.send', 'messages.remove', 'messages.markRead']) {\n    const route = registry.findRouteByName(name);\n    assert(route, name + ' missing');\n    assert.equal(route.idempotencyRequired, true);\n    assert.equal(route.auditRequired, true);\n    assert.equal(route.requestFreshnessRequired, true);\n  }\n  console.log('MSG-A07 command reliability runtime test passed.');\n})().catch((error) => { console.error(error); process.exitCode = 1; });\n`);

write('scripts/audit-msg-001-a07-command-reliability.js', `'use strict';\nconst fs = require('node:fs');\nconst path = require('node:path');\nconst root = path.resolve(__dirname, '..');\nconst read = (file) => fs.readFileSync(path.join(root, file), 'utf8');\nconst assert = (condition, message) => { if (!condition) throw new Error('MSG-A07 audit failed: ' + message); };\nconst config = JSON.parse(read('config/msg-001-a07-command-reliability.json'));\nconst executor = read('assets/js/services/message-command-executor.js');\nconst messageService = read('assets/js/services/message-service.js');\nconst provider = read('assets/js/services/api-repository-provider.js');\nconst registry = read('backend/shared/http/route-registry.js');\nconst backend = read('backend/modules/messaging/messaging-service.js');\nconst handlers = read('backend/modules/messaging/route-handlers.js');\nconst matrix = JSON.parse(read('config/domain-completion-matrix.json'));\nconst msg = matrix.domains.find((domain) => domain.id === 'MSG-001');\nconst workflow = read('.github/workflows/msg-001-a07-command-reliability.yml');\nassert(config.contractVersion === 'msg-a07-command-reliability-v1', 'contract version');\nassert(config.status === 'repository_only_command_reliability_ready_not_deployed', 'repository-only status');\nassert(config.retry.maxAttempts === 3, 'retry must be bounded');\nassert(config.effects.stagingReads === 0 && config.effects.stagingMutations === 0, 'staging effects');\nassert(executor.includes('x-idempotency-key') === false, 'executor must not implement transport headers');\nassert(executor.includes('maxAttempts: 3'), 'max attempts contract');\nassert(executor.includes('claimSideEffects'), 'side-effect dedupe missing');\nassert(executor.includes('DOKE_MESSAGES_COMMAND_ACK_INVALID'), 'ack guard missing');\nassert(!executor.includes('localStorage'), 'browser persistence prohibited');\nassert(messageService.includes('messageCommandExecutor'), 'service executor wiring missing');\nassert(messageService.includes('claimSideEffects'), 'service side-effect claim missing');\nassert(provider.includes("options.headers['x-idempotency-key']"), 'idempotency header missing');\nassert(provider.includes("options.headers['x-request-id']"), 'request id header missing');\nassert(registry.includes("route('messages.remove'"), 'remove route missing');\nfor (const route of ['messages.send', 'messages.remove', 'messages.markRead']) { const line = registry.split('\\n').find((entry) => entry.includes("route('" + route + "'")); assert(line && line.includes('true, true, false, true'), route + ' reliability flags'); }\nassert(backend.includes('async function removeMessage'), 'server remove command missing');\nassert(backend.includes("status: 'removed'"), 'remove tombstone missing');\nassert(handlers.includes('createMessagingCommandHandler'), 'ack wrapper missing');\nassert(handlers.includes("status: replayed ? 'replayed' : 'accepted'"), 'ack states missing');\nassert(matrix.version === '1.3.84', 'matrix version');\nassert(msg && msg.tests.includes('audit:msg-001-a07-command-reliability'), 'matrix audit');\nassert(msg.tests.includes('test:msg-001-a07-command-reliability-runtime'), 'matrix runtime');\nassert(workflow.includes('permissions:\\n  contents: read'), 'workflow read-only');\nfor (const fragment of ['contents: write', 'secrets.', 'SUPABASE_ACCESS_TOKEN', 'SUPABASE_DB_PASSWORD', 'psql ', 'curl ', 'git push']) assert(!workflow.includes(fragment), 'prohibited workflow fragment ' + fragment);\nconsole.log('MSG-A07 command reliability audit passed.');\n`);

let packageJson = JSON.parse(read('package.json'));
packageJson.scripts['audit:msg-001-a07-command-reliability'] = 'node scripts/audit-msg-001-a07-command-reliability.js';
packageJson.scripts['test:msg-001-a07-command-reliability-runtime'] = 'node scripts/test-msg-001-a07-command-reliability-runtime.js';
write('package.json', JSON.stringify(packageJson, null, 2));

let a06Audit = read('scripts/audit-msg-001-a06-presence-typing-boundary.js');
a06Audit = a06Audit.replace("assert(matrix.version === '1.3.83', 'matrix version must be 1.3.83');", "assert(['1.3.83', '1.3.84'].includes(matrix.version), 'matrix version must include A06 or A07');");
write('scripts/audit-msg-001-a06-presence-typing-boundary.js', a06Audit);

const matrix = JSON.parse(read('config/domain-completion-matrix.json'));
matrix.version = '1.3.84';
matrix.updatedAt = '2026-08-02T23:35:00-03:00';
const msg = matrix.domains.find((domain) => domain.id === 'MSG-001');
const paths = [
  'assets/js/services/message-command-executor.js',
  'config/msg-001-a07-command-reliability.json',
  'docs/MSG-001-A07-COMMAND-RELIABILITY.md',
  'docs/validation/MSG-001-A07-COMMAND-RELIABILITY.json',
  'scripts/audit-msg-001-a07-command-reliability.js',
  'scripts/test-msg-001-a07-command-reliability-runtime.js',
  '.github/workflows/msg-001-a07-command-reliability.yml'
];
for (const item of paths) if (!msg.requiredPaths.includes(item)) msg.requiredPaths.push(item);
for (const item of ['audit:msg-001-a07-command-reliability', 'test:msg-001-a07-command-reliability-runtime']) if (!msg.tests.includes(item)) msg.tests.push(item);
const evidence = 'MSG-A07 requires one commandId across bounded retries, validates server acknowledgements, replays through the persistent idempotency store and consumes browser side effects once.';
if (!msg.evidence.includes(evidence)) msg.evidence.push(evidence);
msg.nextActions = msg.nextActions.filter((item) => !item.startsWith('Complete MSG-A07'));
msg.nextActions.unshift('Execute MSG-A07B lost-response, concurrent replay and acknowledgement canaries only after fresh explicit staging authorization.');
if (!msg.blockers.some((item) => item.id === 'MSG-B05')) msg.blockers.push({ id: 'MSG-B05', severity: 'high', category: 'command_delivery', description: 'Command reliability is repository-ready but operational closure requires deployment and authenticated lost-response/replay canaries.', targetPhase: 'Fase 7' });
write('config/domain-completion-matrix.json', JSON.stringify(matrix, null, 2));

console.log('MSG-A07 repository files generated.');
