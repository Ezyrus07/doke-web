# UX-NOTIF-005 — Canonical inbox reconciliation and offline read/dismiss recovery

## Objetivo

Implementar `NOTIF-H05` da `UX-FOUNDATION-009` sem criar uma segunda store de notification center e sem mover persistência para a camada de apresentação.

## Fase 1

- `eventId` é a identidade primária de reconciliation; `dedupeKey`, `eventKey` e `id` são fallbacks legados explícitos.
- `Doke.notificationCenter.reconcile()` é a única regra de merge entre snapshot persistente e presentation state.
- read/dismiss podem entrar em `PENDING_SYNC` de forma otimista.
- snapshot remoto stale não desfaz mutation ainda pendente.
- confirmação remota equivalente encerra o pending state.
- o adapter in-app chama o notification service depois do commit otimista; sucesso ou falha retornam ao center via `resolveMutation()`.
- o repository persiste `pendingStatePatch` para read/dismiss quando a mutation remota falha e a reaplica em `syncPending()`.
- merge/save local do repository também usa `eventId` como identidade primária, mantendo uma identidade pública estável para o mesmo evento lógico.
- hydration/realtime que chega enquanto existe `pendingStatePatch` só encerra o pending state quando o estado remoto satisfaz a mutation pendente; snapshot remoto incompatível preserva o estado otimista e o retry.
- `syncStatus` de criação e `stateSyncStatus` de read/dismiss permanecem independentes para impedir que uma mutation de estado seja tratada como criação pendente.
- eventos `doke:notifications-synced` carregam account id, freshness, source authority e semântica de snapshot completo.
- sync tardio de outra conta é ignorado pelo adapter e fences antigas são rejeitadas pelo center.
- hydration/reconciliation não produz replay de toast.

## Regras de conflito

- `PENDING_SYNC` local vence um snapshot remoto incompatível até confirmação, retry ou conflito explícito.
- estado remoto que satisfaz integralmente `pendingStatePatch` confirma a mutation e limpa `pendingStatePatch/stateSyncError`.
- um snapshot remoto não pode apagar silenciosamente uma mutation segura ainda não confirmada.
- `eventId` converge local, polling e realtime antes dos fallbacks legados.
- dismiss otimista mantém o item fora do snapshot público ativo enquanto estiver pendente; snapshot stale não o ressuscita.
- ações operacionais críticas continuam fora do optimistic-success offline deste lote.

## Freshness

- lista local canônica: `FRESH / CANONICAL_LOCAL`;
- lista remota reconciliada: `FRESH / DERIVED_PRESENTATION`;
- mutation local aguardando remoto: `STALE / DERIVED_PRESENTATION`;
- fallback/falha remota: `DEGRADED / DERIVED_PRESENTATION`.

`sourceAuthority` do snapshot não transforma transporte em autoridade do evento de domínio.

## Cobertura runtime da Fase 1

O gate permanente executa harnesses determinísticos adicionais para os caminhos introduzidos por H05, sem excluir código produtivo da medição:

- mutation remota de leitura com confirmação;
- dispensa remota com falha, `PENDING_SYNC` e retry posterior;
- retry de criação pendente preservado;
- snapshot remoto e atualização realtime;
- fallback remoto degradado;
- settlement do adapter in-app em sucesso, pending, falha e service unavailable;
- rejeição de sync de outra conta;
- snapshot completo da conta atual preservando mutations locais ainda pendentes e removendo estado já sincronizado ausente do snapshot.

Esses harnesses existem para provar os caminhos reais de reconciliation; não alteram as fronteiras de authority nem substituem certificação multi-browser/staging.

## Fora de escopo

- H06+;
- novas migrations/RPCs;
- staging/produção;
- redesign visual;
- ações operacionais críticas offline;
- merge ou ready-for-review.
