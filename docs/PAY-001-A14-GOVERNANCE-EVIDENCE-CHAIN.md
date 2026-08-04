# PAY-001-A14 — Signed Governance Evidence and Immutable Decision Chain

## Objetivo

O PAY-A14 adiciona proveniência verificável às decisões de lifecycle criadas pelo PAY-A13. O contrato ingere atestações externas de identidade de forma offline, associa cada aprovação ao aprovador e à função exata, assina um bundle sanitizado de evidências e cria receipts encadeados por executor.

Nenhum provedor de identidade é contatado. Nenhuma identidade real, nome, e-mail, documento, chave privada, secret ou endpoint é configurado.

## Contratos canônicos

- `pay-a14-governance-evidence-chain-v1`
- `pay-external-identity-trust-bundle-v1`
- `pay-external-identity-attestation-v1`
- `pay-governance-evidence-bundle-v1`
- `pay-governance-detached-signature-v1`
- `pay-lifecycle-decision-receipt-v1`
- `pay-lifecycle-decision-chain-v1`
- signing domain `doke-pay-governance-evidence-v1`

## Atestações externas de identidade

As atestações usam somente hashes de issuer e subject. São permitidos `aal2` e `aal3`; aprovações de `security` exigem obrigatoriamente `aal3`.

Cada aprovação PAY-A13 precisa possuir uma atestação verificada offline com:

- subject hash igual ao approver hash;
- role idêntica;
- credencial `active`;
- validade máxima de 24 horas;
- nonce e evidence hash;
- assinatura detached Ed25519 ou RSA-PSS-SHA256;
- trust root ativo e allowlisted;
- `production: false`;
- `containsDirectIdentifiers: false`.

O bundle exige ao menos dois identity issuers independentes (`two identity issuers`), impedindo que todo o quorum dependa de uma única raiz institucional.

## Bundle assinado de evidência

O bundle contém apenas:

- fingerprint da solicitação PAY-A13;
- fingerprint canônico da decisão;
- ação e executor hash;
- git head exato;
- approval fingerprints;
- approval evidence hashes;
- identity-attestation fingerprints;
- issuer hashes, roles e assurance levels;
- hash do receipt anterior quando aplicável.

O bundle rejeita direct identifiers, private-key material, produção, fingerprints divergentes e campos não allowlisted.

## Encadeamento imutável

Cada decisão gera um receipt com sequence, previous receipt hash, evidence bundle fingerprint e signature-envelope fingerprint.

Regras:

1. sequence 1 é genesis e não possui predecessor;
2. sequences seguintes precisam ser contíguas;
3. o predecessor precisa ser o head corrente daquele executor;
4. chains não podem cruzar executores;
5. forks, replay e alteração de receipt são rejeitados;
6. nenhum receipt concede staging, produção, provider operation ou movimentação financeira.

## Conformance

Foram executados 52 casos determinísticos:

- 6 positivos;
- 46 negativos.

A cobertura inclui Ed25519, RSA-PSS-SHA256, AAL3 para security, diversidade de issuers, replay de assinatura e identidade, drift de bundle, genesis, onboarding, rotação, offboarding, revogação emergencial, fork, sequence gap, cross-executor chain e receipt integrity.

Resultado: `52/52` casos aprovados.

## Blockers preservados

- `PAY-B01`
- `PAY-B03`
- `PAY-B04`

## Efeitos operacionais

- network requests: `0`
- database connections: `0`
- external identity-provider requests: `0`
- external governance-system requests: `0`
- staging reads/mutations: `0`
- direct identifiers stored: `0`
- private keys stored: `0`
- migrations/rollbacks: `0`
- payments/refunds/payouts: `0`
- production: intocada

## Próximo sublote

`PAY-A15` — external identity-issuer lifecycle, revocation/status snapshots, stale-credential invalidation e audit-retention handoff, permanecendo repository-only.
