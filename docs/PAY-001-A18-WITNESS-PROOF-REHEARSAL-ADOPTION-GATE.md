# PAY-001 / PAY-A18 — Witness Proof Rehearsal Adoption Gate

## Estado

PAY-A18 permanece **repository-only**, fail-closed e sem autoridade remota. Ele não configura nem contata PSP, identity provider, transparency log, witness, cache, endpoint, banco de dados, staging ou produção.

## Causa raiz

PAY-A17 passou a definir checkpoints append-only, recuperação forward-only, evidência hashes-only de cache poisoning e um handoff de adoção operacional bloqueado. Ainda restavam quatro lacunas antes de qualquer avaliação futura de provider:

1. os witnesses eram representados apenas por hashes, sem um perfil interoperável que obrigasse operadores, famílias operacionais e chaves públicas distintas;
2. não existia conformance explícita para provar inclusão de um checkpoint em uma raiz Merkle-style;
3. não existia conformance explícita para provar consistência monotônica entre duas árvores de checkpoint;
4. o handoff aceitava um fingerprint de rehearsal, mas não exigia um plano e uma attestation verificáveis, sintéticos e sem execução remota.

PAY-A18 fecha essas lacunas somente em contratos offline.

## Contratos canônicos

```text
pay-a18-witness-proof-rehearsal-adoption-gate-v1
pay-identity-transparency-witness-profile-v1
pay-identity-transparency-witness-quorum-v1
pay-identity-checkpoint-inclusion-proof-v1
pay-identity-checkpoint-consistency-proof-v1
pay-identity-recovery-rehearsal-plan-v1
pay-identity-recovery-rehearsal-attestation-v1
pay-identity-pre-provider-adoption-gate-v1
pay-identity-pre-provider-adoption-decision-v1
```

## Interoperabilidade de witnesses

Cada witness profile é hashes-only e vincula:

- witness, operator e operator-family por SHA-256;
- fingerprint da chave pública, sem armazenar chave privada;
- protocolo `doke_merkle_sha256_v1` versão 1;
- versões de inclusion proof, consistency proof e rehearsal attestation suportadas;
- validade máxima de 24 horas;
- declaração obrigatória de operação independente.

O quorum exige no mínimo dois witnesses e rejeita:

- operator duplicado;
- operator-family duplicada;
- public-key fingerprint duplicado;
- protocolo incompatível;
- witness expirado;
- seleção divergente do conjunto fornecido;
- qualquer autoridade de produção ou publicação remota.

## Inclusion proof

O inclusion proof vincula um checkpoint PAY-A17 íntegro, seu `rootHash`, `treeSize`, `leafIndex`, `leafHash`, caminho ordenado e witness quorum.

A raiz é reconstruída offline com domínio separado para folhas e nós. O contrato rejeita checkpoint, raiz, tree size, caminho, quorum ou idade de prova divergentes.

## Consistency proof

O consistency proof vincula checkpoints PAY-A17 antigo e novo, raízes, tree sizes, transcript hash, caminho canônico e witness quorum.

Ele rejeita:

- rollback ou ausência de crescimento de tree size;
- crossover de issuer ou issuer-family;
- rollback de distribution epoch ou lifecycle sequence;
- transcript inconsistente;
- caminho duplicado ou fora de ordem;
- prova expirada.

O modo permitido é:

```text
offline_transcript_conformance
```

## Recovery rehearsal

O rehearsal plan exige:

- recovery result PAY-A17 previamente validado offline;
- checkpoint de origem e checkpoint alvo íntegros;
- cenários canônicos e únicos;
- conjunto esperado de invalidação;
- fingerprints de runbook, monitoring contract e rollback procedure;
- duração máxima de 1.800 segundos;
- `syntheticOnly: true`;
- zero autoridade de execução remota.

A rehearsal attestation exige todos os cenários em `passed_offline`, evidência hashes-only, conjunto observado idêntico ao planejado e duração dentro do limite. Nenhuma invalidação real é executada.

## Gate pré-provider

O gate final vincula:

- handoff e decisão PAY-A17 bloqueados;
- witness quorum interoperável;
- inclusion proof;
- consistency proof;
- rehearsal attestation;
- owner e reviewers separados;
- quorum mínimo de duas aprovações;
- runbook, monitoring e rollback;
- blockers `PAY-B01`, `PAY-B03` e `PAY-B04`.

O único estado permitido é:

```text
blocked_repository_only
```

`eligibleForProviderEvaluation`, `readyForOperationalAdoption`, `providerContactAuthorized` e `realOperationalAdoptionAuthorized` permanecem `false`.

## Conformance

```text
54 casos totais
12 positivos
42 negativos
54/54 aprovados
```

A cobertura inclui interoperabilidade de witnesses, duplicidade de operador/família/chave, validade temporal, inclusion root, consistency transcript, rollback, issuer crossover, proof age, rehearsal sintético, paridade de cenários e invalidação, role separation, blocker drift e tentativa de aprovação operacional.

## Segurança operacional

```text
network requests: 0
database connections: 0
subprocesses: 0
environment reads: 0
staging reads: 0
staging mutations: 0
real witnesses contacted: 0
real proofs requested: 0
real recovery rehearsals executed: 0
real providers contacted: 0
payments/refunds/payouts: 0
migrations/deploys: 0
production changes: 0
merge: 0
```

## Impacto no site

PAY-A18 não altera visualmente o site e não ativa pagamentos reais. Ele reduz o risco de uma futura integração aceitar witnesses correlacionados, provas inconsistentes ou uma rehearsal meramente documental antes de avaliar um provider.

## Próximo passo

Após certificar o corpus PAY-A18 no head técnico, integrar os assets à matriz canônica sem elevar a maturidade PAY acima de `2/6`, mover o PR somente após equivalência de árvore e manter `PAY-B01`, `PAY-B03` e `PAY-B04` bloqueados.
