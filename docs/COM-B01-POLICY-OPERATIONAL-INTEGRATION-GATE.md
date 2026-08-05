# COM-B01 — Gate de aprovação de política e integração operacional

Contrato: `com-b01-policy-operational-integration-gate-v1`

## Objetivo

Este sublote transforma a conclusão repository-only do COM-A01–A05 em um gate operacional explícito. Ele não aprova política, não ativa runtime e não cria autoridade de escrita. A política continua `pending` até existir um pacote de evidência aprovado por revisores independentes.

## Causa do gate

Os contratos A01–A05 definem semântica, invariantes e fail-closed, mas ainda não existe autorização institucional nem infraestrutura server-owned. Avançar diretamente para migrations ou handlers criaria autoridade técnica antes da governança necessária.

## Aprovações obrigatórias

Uma revisão válida exige cinco papéis independentes:

- `trust_safety`;
- `legal`;
- `privacy`;
- `security`;
- `community_operations`.

O autor da política não pode aprovar o próprio pacote. Cada aprovação deve referenciar a mesma versão semântica, o mesmo SHA-256 e um horário UTC explícito. Corpo bruto da política, credenciais, tokens, URLs assinadas, binários e base64 são proibidos.

## Domínios cobertos

- descoberta e associação;
- papéis, permissões e disciplina;
- conteúdo, realtime e rate limits;
- denúncias, moderação e recursos;
- quarentena e scanner de mídia.

## Gates operacionais

A prontidão estrutural exige, simultaneamente:

1. handlers server-owned;
2. projeção canônica de associação;
3. projeção canônica de governança;
4. ledger append-only;
5. fila independente de recursos;
6. storage de quarentena;
7. scanner autenticado;
8. rate limits server-owned;
9. diretório de papéis operacionais;
10. runbook de incidentes.

Mesmo quando todos os gates estruturais estiverem verdadeiros, o resultado é apenas `ready_for_separate_activation_authorization`. Isso não concede `runtimeMutationAuthority`, `stagingAuthority` ou `productionAuthority`.

## Estado atual

```text
approvedPolicyPresent: false
runtimeIntegrated: false
migrationPrepared: false
migrationApplied: false
stagingValidated: false
runtimeMutationAuthority: false
stagingAuthority: false
productionAuthority: false
```

## Fail-closed

Qualquer ausência, divergência de hash, revisor duplicado, autoaprovação, domínio incompleto, timestamp não UTC ou gate operacional falso mantém o resultado `blocked_repository_only`.

## Efeitos proibidos

Não há conexão de banco, rede, migration, deploy, staging, produção, alteração de comunidade, associação, papel, conteúdo, moderação, recurso ou mídia. Nenhum dado real é lido ou alterado.

## Próxima fronteira

Depois da definição e validação deste gate, o próximo sublote técnico é o `COM-B02`: autoridade server-side Supabase-backed para caller autenticado, descoberta, privacidade, join policy, associação, papéis e permissões. Sua ativação continua dependente de autorização separada.
