# PROF-001 / PROF-A04 — Retirada da autoridade local do rascunho KYC

## Status

`VALIDATION PENDING`

## Objetivo

Remover a autoridade persistente do navegador sobre registros e rascunhos de verificação profissional, preservando o Supabase como autoridade canônica para sujeitos reais e mantendo apenas compatibilidade fixture em memória.

## Causa-raiz

`professional-identity-verifications-repository.js` ainda mantinha duas autoridades paralelas:

- registros de verificação em `localStorage` pela chave `doke.professionalIdentityVerifications.v1`;
- rascunhos KYC em `sessionStorage` pela chave `doke.professionalIdentityVerificationDrafts.v1`.

Mesmo com o serviço ativo já lendo `public.professional_identity_verifications`, salvando rascunhos por `save_professional_verification_draft` e enviando verificações por `professional-verification-operations`, o repositório local ainda podia representar um estado diferente do servidor.

## Autoridade implementada

### Sessões Supabase

- leitura canônica em `public.professional_identity_verifications`;
- rascunho canônico em `self-service-operations/save_professional_verification_draft`;
- submissão canônica em `professional-verification-operations/submit`;
- sujeitos UUID ou sessões com provider Supabase falham fechado no repositório fixture;
- nenhum fallback persistente local é executado quando a autoridade remota está indisponível.

### Fixtures

- registros e rascunhos permanecem somente em `Map` durante o runtime atual;
- um novo runtime não recupera o estado fixture anterior;
- nenhuma chave profissional KYC é gravada em `localStorage` ou `sessionStorage`.

## Limite deliberado

A retirada da autoridade binária não pertence ao PROF-A04. `professional-verification-evidence-repository.js` ainda mantém evidências em IndexedDB e permanece explicitamente bloqueado como `PROF-B03-KYC-EVIDENCE`.

O PROF-A04 não remove, migra ou mascara essa dependência. A fronteira de evidência continua isolada para um sublote próprio.

## Arquivos

- `assets/js/repositories/professional-identity-verifications-repository.js`
- `scripts/audit-professional-verification-draft-authority-retirement.js`
- `scripts/test-professional-verification-draft-authority-retirement-runtime.js`
- `.github/workflows/quality.yml`
- `docs/validation/PROF-001-A04-KYC-DRAFT-AUTHORITY-RETIREMENT.json`
- `docs/validation/PROF-001-A04-KYC-DRAFT-AUTHORITY-RETIREMENT.md`
- `docs/DOKE-ENGINEERING-JOURNAL.md`

## Supabase

Nenhuma migration é necessária para este sublote. Nenhuma Edge Function precisa ser implantada porque as operações remotas canônicas já existiam antes da retirada da autoridade local.

Staging e produção devem permanecer inalterados durante o PROF-A04.

## Runtime permanente

O runtime dedicado comprova:

1. sujeitos Supabase não podem usar `list`, `getByUserId`, `saveDraft`, `submit` ou transições do repositório fixture;
2. o caminho Supabase não toca `localStorage`, `sessionStorage` ou a fronteira local de evidência;
3. rascunhos fixture funcionam durante o runtime atual;
4. registros fixture não sobrevivem à criação de um novo runtime;
5. a submissão fixture mantém explícita a fronteira separada de evidência binária.

## Validação atual

Modo: `canonical_MAIN_stack_validation_then_restore_stacked_base`.

Checkpoint de implementação do repositório:

`e3bf6544bc9def641fde42e65592fd8d3017184b`

Checkpoint do runtime permanente:

`d093d34496ce0677c2248c023a92ed5a03a99050`

Candidato `f867f0a496c0b8ee1308855e214df9e07ea326be`:

- audit cumulativo PROF-A01: sucesso;
- audit PROF-A02: sucesso;
- runtime PROF-A02: sucesso;
- audit PROF-A03: sucesso;
- runtime PROF-A03: sucesso;
- audit estrutural PROF-A04: sucesso;
- runtime PROF-A04: sucesso;
- contratos gerais até o gate da matriz: sucesso;
- matriz determinística: drift detectado;
- sincronização solicitada exclusivamente pelo workflow canônico.

Após a sincronização, ainda devem passar no mesmo head final:

- Doke Quality Gates;
- E2E bloqueante;
- 105 guards visuais;
- Canary;
- Diagnostic.

## Segurança operacional

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada;
- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PR #11 permanece aberto, draft e não mesclado.

## Próximo sublote controlado

`PROF-B03-KYC-EVIDENCE` poderá retirar a autoridade IndexedDB somente depois de o PROF-A04 estar validado no mesmo head e declarado `DONE`.
