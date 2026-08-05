# COM-A05 — Moderação, recursos e segurança de mídia

Contrato: `com-a05-moderation-appeal-media-readiness-v1`

## Escopo

Este sublote conclui a sequência repository-only do COM-001. Ele define denúncias, triagem, ocultação, remoção, recomendações de sanção, restauração por recurso e o ciclo seguro de mídia. Nenhuma operação real é executada.

## Princípios

- A denúncia não altera visibilidade.
- A triagem não altera visibilidade.
- Evidências entram apenas por referências opacas.
- Conteúdo não sofre hard delete.
- Remoção exige dupla aprovação independente.
- Sanções reais continuam sob o contrato COM-A03.
- Recurso preserva a decisão anterior e cria uma nova revisão.
- Mídia começa em quarentena e só pode ser liberada após scanner autenticado e aprovação independente.
- Todos os eventos são append-only e encadeados por SHA-256.

## Alvos de denúncia

```text
community_post
channel_message
media_asset
community_member
```

Motivos canônicos incluem spam, assédio, abuso ou ódio, conteúdo sexual, violência, fraude, privacidade, personificação, conteúdo ilegal, automutilação e outros motivos policy-owned.

## Estados do caso

```text
open
triaged
under_review
resolved_dismissed
resolved_hidden
resolved_removed
appeal_open
appeal_review
appeal_resolved
closed
```

Uma denúncia abre um caso. Ela não oculta conteúdo, não remove usuário e não altera rate limits.

## Decisões de moderação

### Ocultação

Pode ocorrer durante revisão autorizada. O conteúdo continua preservado e pode ser restaurado.

### Remoção

Exige:

1. caso em revisão;
2. moderador independente do autor e do denunciante;
3. motivo e evidências opacas;
4. dupla aprovação por outro decisor;
5. ledger append-only.

O conteúdo permanece preservado para auditoria. `hard delete` é proibido.

### Sanções

O COM-A05 pode produzir uma recomendação de `ban`, `mute` ou `restriction`, mas não aplica a sanção. A execução precisa passar pelo COM-A03, que continua sendo a autoridade de disciplina.

## Recursos

O autor afetado pode abrir recurso em até 14 dias após a decisão.

Regras:

- somente o autor ou membro afetado pode recorrer;
- recurso não restaura automaticamente;
- o revisor precisa ser independente do moderador original, autor e denunciante;
- aprovação referencia o hash da decisão anterior;
- a decisão anterior permanece imutável;
- restauração gera novo evento e novo estado `restored`.

## Segurança de mídia

Tipos permitidos:

```text
image/jpeg
image/png
image/webp
video/mp4
video/webm
```

Limites:

- imagem: até 10 MiB;
- vídeo: até 100 MiB;
- vídeo: até 600 segundos;
- imagem: dimensões máximas de 12.000 × 12.000.

O contrato aceita apenas metadados sanitizados:

- UUID da mídia;
- tipo MIME permitido;
- tamanho;
- SHA-256 do conteúdo;
- referência opaca de storage;
- dimensões ou duração;
- revisão canônica.

Não aceita bytes, base64, corpo bruto, URL assinada, credencial, token ou documento de identidade.

Estados:

```text
declared
quarantined
scan_clean
scan_suspicious
scan_malicious
scan_unavailable
released
rejected
expired
```

Para liberar mídia:

1. conteúdo precisa estar em `scan_clean`;
2. attestation do scanner precisa corresponder ao mesmo SHA-256;
3. o revisor não pode ser o uploader;
4. outro aprovador independente precisa assinar a decisão;
5. nenhuma autoridade de storage é concedida pelo contrato.

## Ledger

Eventos incluem:

```text
eventId
communityId
reportId
targetType
targetId
mediaId
appealId
action
actorId
reasonCode
revision
occurredAt
previousEventHash
intentFingerprint
eventHash
```

A cadeia é append-only, usa SHA-256 e revisão monotônica. Correções não sobrescrevem eventos anteriores.

## Readiness

A ativação exige, separadamente:

- política aprovada;
- handler server-owned;
- projeções canônicas de associação e governança;
- ledger append-only;
- storage de quarentena;
- scanner autenticado;
- fila independente de recursos;
- rate limits server-owned;
- validação em staging.

Mesmo com todos esses itens estruturais, `runtimeMutationAuthority` e produção continuam falsas até autorização explícita.

## Autoridade preservada

```text
reportWriteAuthority: false
moderationWriteAuthority: false
disciplineWriteAuthority: false
appealWriteAuthority: false
mediaWriteAuthority: false
storageAuthority: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
```

## Efeitos proibidos

Não há conexão de banco, rede, upload, scanner real, denúncia real, ocultação, remoção, sanção, recurso, liberação de mídia, migration, deploy, staging ou produção.

## Próxima fronteira

A sequência COM-A01–A05 termina aqui. O avanço operacional depende de COM-B02, COM-B03, COM-B04, políticas, infraestrutura, migrations, staging e autorizações separadas.
