# COM-B02 — Contrato de autoridade server-side

Contrato: `com-b02-server-authority-contract-v1`

## Objetivo

Definir a fronteira Supabase-backed para descoberta, privacidade, associação, papéis e permissões sem conceder autoridade de runtime. Este sublote é repository-only e trabalha com uma porta de repositório injetável, sem conexão, credencial, migration ou deploy.

## Identidade autenticada

Toda decisão mutável exige caller autenticado por `server_verified_session`. O cliente não pode fornecer ou substituir `actorId`, autoridade de membership ou autoridade de role.

Chamadas anônimas, sessão não verificada e assurance level desconhecido falham fechadas.

## Envelope de comando

Cada comando exige:

- `clientRequestId` UUID;
- `idempotencyKey` SHA-256;
- `intentFingerprint` SHA-256;
- `expectedRevision` inteiro não negativo;
- payload sem campos de autoridade do cliente.

O contrato aceita as decisões `accept`, `replay`, `reject`, `conflict` e `unavailable`, mas não executa mutações.

## Descoberta e privacidade

- comunidade pública é enumerável;
- comunidade privada só é enumerável e legível por membro;
- comunidade invite-only não é enumerável;
- invite-only é legível apenas por membro ou convite ativo;
- toda decisão depende de projeção canônica server-owned.

## Associação

- ban ativo bloqueia entrada;
- `join_public` só vale para comunidade pública;
- comunidade privada exige request ou invite;
- conflito de revisão retorna `conflict`;
- último owner não pode sair sem transferência.

## Papéis e permissões

Papéis canônicos:

```text
owner
admin
moderator
member
```

Owner ou admin pode iniciar alteração de papel. Admin não pode atribuir owner ou admin. Autoelevação para owner é proibida. Toda transição exige revisão canônica correspondente.

## Porta Supabase-backed

A porta `supabase_server_repository_port` exige:

```text
loadCanonicalState
claimIdempotencyKey
appendEvent
commitProjection
```

A porta descreve a responsabilidade correta do adapter, mas permanece sem conexão. Nenhum `createClient`, URL, chave, secret ou service role existe neste contrato.

## Autoridade preservada

```text
communityWriteAuthority: false
membershipWriteAuthority: false
roleWriteAuthority: false
databaseAuthority: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
client authority: false
```

## Próxima fronteira

O próximo sublote é `COM-B02B`: adapter Supabase server-owned e readiness de migration imutável. A aplicação de migration e qualquer validação em staging continuam dependentes de autorização separada.
