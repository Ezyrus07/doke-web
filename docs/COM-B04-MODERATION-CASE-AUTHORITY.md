# COM-B04 — autoridade canônica de casos de moderação

## Escopo

`COM-B04` cria a composição repository-only que faltava entre os contratos de moderação do `COM-A05`, o ledger disciplinar do `COM-A03` e a futura persistência operacional.

Contrato:

```text
com-b04-moderation-case-authority-v1
```

Este sublote não registra rota, não conecta o composition root principal, não cria tabela, não aplica migration, não acessa staging e não executa denúncia, sanção, recurso ou ação de mídia real.

## Causa raiz

O `COM-A05` já valida comandos individuais de denúncia, decisão, recurso e mídia. Entretanto, ainda não existia um agregado canônico único que mantivesse, na mesma revisão:

- intake da denúncia;
- alvo e snapshot canônico;
- conjunto de evidências;
- recomendação de decisão;
- aprovação independente;
- rascunho de remediação;
- sanção e expiração;
- recurso independente;
- atestado de scanner;
- ledger append-only;
- idempotência e compare-and-swap.

Sem essa composição, componentes futuros poderiam persistir cada etapa separadamente e perder separação de funções, vínculo de política ou consistência transacional.

## Modelo de caso

Tipos:

```text
content_report
member_report
media_review
```

Estados:

```text
open
triage
evidence_collection
decision_pending_approval
decision_approved
remediation_pending
appeal_open
appeal_review
appeal_pending_approval
resolved
closed
conflicted
```

Todo snapshot precisa ser `canonical_server`, completo e revisionado. Comandos usam `expectedRevision`; divergência produz conflito.

## Evidência

Apenas metadados sanitizados são aceitos:

- UUID da evidência;
- tipo allowlisted;
- referência `opaque:` sem URL, query ou identificador público;
- digest SHA-256;
- horário UTC explícito;
- classe de retenção;
- indicação de que payload bruto não está incluído.

Senha, token, cookie, documentos de identidade, dados financeiros, e-mail, telefone, CPF, CNPJ, binário e payload bruto são proibidos recursivamente.

## Decisão e dual control

Outcomes:

```text
dismiss
hide_content
remove_content
warn_member
mute_member
restrict_member
ban_member
quarantine_media
reject_media
restore_content
release_media
```

Uma recomendação é vinculada a:

- revisão do caso;
- fingerprint da política aprovada;
- hash do conjunto de evidências;
- hash do snapshot do alvo;
- parâmetros da sanção.

O recomendador não pode aprovar a própria recomendação. Reporter, alvo e autor não podem decidir o caso. Outcome adverso exige evidência. Nenhuma contagem de denúncias ou classificação automática produz decisão final.

## Sanções

```text
warning
mute
restriction
ban
```

Limites:

```text
mute: até 30 dias
restriction: até 90 dias
ban temporário: até 365 dias
ban permanente: somente com aprovação explícita dedicada
```

Expiração é um evento explícito. O contrato somente produz drafts; não aplica ou remove sanção no runtime.

## Recursos

O recurso:

- só pode ser aberto pelo sujeito afetado;
- tem janela de 14 dias;
- preserva a decisão original de forma imutável;
- exclui recomendador e aprovador originais;
- exige recomendador e aprovador distintos no recurso;
- pode manter, reverter ou modificar o resultado;
- produz apenas um draft de remediação.

## Mídia

O scanner precisa ser autenticado e o digest precisa coincidir com o asset canônico.

```text
scan clean
→ não libera automaticamente

scan suspicious/malicious
→ não rejeita automaticamente
```

Liberação exige scan limpo e aprovação humana independente. O scanner não pode aprovar a disposição. Binário bruto nunca entra no contrato.

## Transação futura

O plano de persistência exige:

```text
isolation: serializable
atomic: true
rollbackOnFailure: true
expected revision compare-and-swap
```

Porta requerida:

```text
loadCanonicalCase
claimIdempotencyKey
appendModerationEvent
insertDecisionRecord
compareAndSwapCaseProjection
appendSanctionEvent
appendAppealEvent
appendMediaReviewEvent
```

`commitAuthority` permanece `false`.

## Autoridade preservada

```text
reportWriteAuthority: false
moderationWriteAuthority: false
sanctionWriteAuthority: false
appealWriteAuthority: false
mediaWriteAuthority: false
repositoryWriteAuthority: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
pullRequestMergeAuthority: false
```

## Próxima fronteira

`COM-B04B — immutable moderation persistence and migration readiness`.

Esse próximo sublote poderá definir adapter e migration imutável, mas qualquer aplicação em staging exigirá autorização explícita separada.
