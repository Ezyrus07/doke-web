# COM-B03 — realtime escalável e política de cap de canais

Contrato: `com-b03-realtime-channel-scale-policy-v1`.

## Objetivo

COM-A04 definiu quais tópicos podem ser solicitados e exigiu membership canônica. COM-B03 adiciona a disciplina operacional necessária para escala, sem criar subscriptions reais e sem alterar a publicação Supabase Realtime.

O contrato permanece `repository_only`.

## Escopo de assinatura

Tópicos permitidos:

```text
channel_messages
channel_presence
channel_typing
community_posts
```

Tópicos de canal e de comunidade não podem ser misturados na mesma lease. O nome lógico do canal é derivado por SHA-256 e não expõe o UUID bruto da comunidade.

## Privacidade e autoridade

- ator autenticado precisa vir de sessão verificada pelo servidor;
- membership ativa é obrigatória;
- ban ativo bloqueia realtime;
- comunidades `private` e `invite_only` exigem concessão canônica de visibilidade;
- canais com roles específicas exigem interseção de roles;
- visibility, tópico ou evento desconhecido falham fechados;
- payloads com credenciais, documentos ou PII direta são rejeitados;
- nenhum browser claim é autoridade.

## Leases e caps

```text
minimum lease: 30 seconds
maximum lease: 900 seconds
membership revalidation: 60 seconds
maximum topics per lease: 4
maximum channels per session: 8
maximum channels per actor: 12
maximum channels per community: 6
```

Uma lease ativa com o mesmo fingerprint é reutilizada em vez de abrir uma segunda assinatura. Toda lease exige teardown explícito.

## Entrega e backpressure

Eventos precisam usar envelope `server_authoritative_event`, tipo compatível com o tópico, UUID estável, sequência monotônica, revisão canônica e clock válido.

```text
maximum payload: 16384 bytes
maximum event age: 30000 ms
maximum future skew: 5000 ms
queue high watermark: 64
queue hard limit: 96
maximum sequence gap: 100
```

- event IDs repetidos são descartados;
- sequências já aplicadas são descartadas;
- gaps excessivos exigem resync;
- presence e typing são coalescidos no high watermark;
- mensagens e posts exigem resync quando a fila ultrapassa o high watermark;
- hard limit sempre exige resync.

## Cursor e reconnect

Cursores presentes devem ser canônicos, ter no máximo cinco minutos e nunca estar à frente da revisão da comunidade.

Reconnect usa `exponential_full_jitter`:

```text
base: 500 ms
maximum: 30000 ms
maximum attempts: 8
```

O atraso é determinístico para o mesmo attempt e entropy basis, facilitando testes sem eliminar jitter entre leases diferentes.

## Limites operacionais preservados

```text
realtime publication configured: false
subscription created: false
channel created: false
route registered: false
runtime integrated: false
staging read: false
staging mutation: false
deployment: false
production change: false
pull request merge: false
```

O módulo não contém `createClient`, `.channel()`, `postgres_changes`, `.from()`, `fetch`, secrets ou comandos SQL de publicação.

## Próxima fronteira

`COM-B03B` poderá preparar a publicação e uma subscription autenticada em staging, mas exigirá autorização explícita separada. A existência desta documentação não concede essa autoridade.
