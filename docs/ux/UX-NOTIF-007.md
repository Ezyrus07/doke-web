# UX-NOTIF-007 — Canonical digest and DND delivery policy

## Status

- Epic: `EPIC-11 — notificações, badges e reengajamento`;
- Tracking: issue `#103`;
- Base: `ux/ux-notif-006-event-policy-matrix`;
- Base SHA certificado: `7ba99bfbd293f83d8e14bccf75b4bd0703a4199d`;
- Branch: `ux/ux-notif-007-digest-dnd-policy`;
- Handoff: `NOTIF-H07 — digest/DND`;
- Fase 1: candidato permanente em certificação final;
- Matrix canônica sincronizada no parent `20f928ad19d5128c0ad8245b5bc856203f2290c9`;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Backend/staging/produção: não acessados.

## Causa raiz

Antes do H07, `in-app-notifications.js` mantinha chaves globais de preferências e digest, calculava DND/mute/threshold, enfileirava digest e configurava o toast manager com callbacks fragmentados. Isso criava policy distribuída e não provava isolamento entre contas.

## Autoridade

A Fase 1 introduz:

```text
Doke.notificationDelivery
contract: notification-delivery-v1
```

Responsabilidades:

- preferências de entrega account-scoped;
- mute scopes e prioridade mínima;
- DND;
- decisão `ALLOW_TOAST | QUEUE_DIGEST | SUPPRESS`;
- fila de digest bounded/deduped;
- flush de digest;
- account fence/cross-tab do scope atual.

Não possui:

- render/lifecycle de toast (`Doke.notificationToast`);
- inbox/read/badges (`Doke.notificationCenter`);
- schema/category/priority/attention (`Doke.notificationEvent`);
- persistência/transport de notificações (service/repository);
- backend/browser notifications/quick actions.

## Persistência

H07 registra o domínio `notification_delivery` em `Doke.accountStorage` como `ACCOUNT_PRIVATE`, `UNTIL_LOGOUT`, `clearOnLogout=true`, `crossTab=metadata`.

As antigas chaves globais:

- `doke.in-app-notification.preferences.v1`;
- `doke.in-app-notification.digest.v1`;

são removidas e não são importadas para um usuário novo porque não carregam ownership confiável.

## Policy

A decisão é determinística:

1. read/dismissed/rejected → `SUPPRESS`;
2. grupo desabilitado → `SUPPRESS`;
3. scope silenciado → `SUPPRESS`;
4. abaixo de priority threshold → `SUPPRESS`;
5. DND ativo + `CRITICAL` ou `URGENT_ACTION_REQUIRED` → `ALLOW_TOAST`;
6. DND ativo + digest habilitado → `QUEUE_DIGEST`;
7. DND ativo + digest desabilitado → `SUPPRESS`;
8. demais eventos elegíveis → `ALLOW_TOAST`.

Urgência vem apenas de metadata canônica H06, nunca de copy.

## Digest

- identidade: `dedupeKey -> eventId -> eventKey -> id`;
- máximo: 100 entradas por scope;
- replay da mesma identidade atualiza a entrada, não duplica;
- itens armazenados são mínimos: identity/group/priority/createdAt;
- flush não ocorre durante DND;
- desabilitar digest limpa a fila;
- o digest sintético usa `skipDelivery` somente para evitar reentrada na própria fila.

## Compatibilidade

O adapter mantém a API pública legada `window.DokeInAppNotifications` para a UI atual, mas `getPreferences`, `setPreferences`, `muteScope`, `unmuteScope`, `isDndActive` e `flushDigest` delegam para H07.

`notification-toast.js` preserva o fallback antigo apenas quando nenhuma authority H07 foi configurada. No runtime canônico atual, o adapter configura `getDeliveryDecision` e `onQueueDigest`, portanto o toast manager não decide DND.

## Testes dedicados

- `scripts/test-ux-notif-007-delivery-policy.js`;
- `scripts/test-ux-notif-007-toast-delivery-integration.js`;
- `scripts/test-ux-notif-007-adapter-delegation.js`.

## Fora de escopo

- H08 browser notifications;
- H09 quick actions;
- backend/Supabase migrations/RPCs;
- staging/produção;
- redesign visual amplo;
- novas mutations de domínio.

## Definition of Done

A Fase 1 só pode ser considerada tecnicamente concluída quando, no mesmo SHA permanente:

1. árvore sem executores/patchers temporários;
2. sintaxe JS;
3. três testes H07;
4. regressões H01-H06;
5. notification repository/API e account/auth;
6. Domain Completion Matrix e agent governance;
7. LCOV executável das superfícies H07 alteradas;
8. Sonar Quality Gate com zero New/Accepted/Hotspots e cobertura suficiente;
9. `git diff --check`;
10. PR próprio OPEN / DRAFT / UNMERGED.
