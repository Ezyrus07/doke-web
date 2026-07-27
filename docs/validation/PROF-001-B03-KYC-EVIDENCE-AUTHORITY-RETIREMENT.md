# PROF-001 / PROF-B03-KYC-EVIDENCE — Retirada da autoridade IndexedDB

## Status

`DONE`

## Objetivo

Remover a persistência IndexedDB como autoridade paralela de evidências binárias KYC no navegador, mantendo o Supabase Storage como única autoridade real e preservando fixtures não UUID somente em memória durante o runtime atual.

## Causa-raiz

`professional-verification-evidence-repository.js` abria o banco `doke-professional-verification-evidence-v1`, persistia blobs no object store `evidence` e recuperava esses arquivos em sessões futuras.

Esse comportamento era incompatível com a arquitetura já estabelecida no servidor:

- o navegador solicita intents estreitos por `professional-verification-operations/prepare_uploads`;
- o servidor gera caminhos `locked/...` e tokens de upload de uso único;
- o browser envia arquivos com `uploadToSignedUrl`;
- `submit_professional_identity_verification_internal` valida e consome o manifesto atomicamente;
- revisores recebem URLs assinadas ou downloads privados do bucket `professional-verification-media`.

A persistência IndexedDB não participava da autoridade Supabase real. Ela sobrevivia apenas como autoridade fixture/mock paralela.

## Arquitetura implementada

### Sujeitos Supabase ou UUID

- `save`, `getByVerificationId` e `remove` falham fechado;
- código: `DOKE_PROFESSIONAL_VERIFICATION_EVIDENCE_AUTHORITY_UNAVAILABLE`;
- nenhuma tentativa de IndexedDB é executada;
- nenhuma evidência real é copiada, recuperada ou mascarada localmente.

### Fixtures não UUID

- blobs e descritores ficam em `Map` durante o runtime atual;
- um novo runtime não recupera a evidência anterior;
- `remove` apaga somente a entrada volátil;
- a superfície pública do repositório é preservada para os harnesses fixture.

## Supabase

Nenhuma migration é necessária. Nenhum deploy de Edge Function é necessário.

A autoridade remota já existe em:

- bucket privado `professional-verification-media`;
- `professional-verification-operations/prepare_uploads`;
- `uploadToSignedUrl` com token de uso único;
- `submit_professional_identity_verification_internal`;
- hidratação de documentos por signed URL ou download privado.

Staging e produção permanecem inalterados neste sublote.

## Arquivos

- `assets/js/repositories/professional-verification-evidence-repository.js`
- `scripts/test-professional-verification-evidence-authority-retirement-runtime.js`
- `scripts/audit-professional-verification-evidence-authority-retirement.js`
- `scripts/audit-professional-authority-baseline.js`
- `.github/workflows/quality.yml`
- `config/domain-completion-matrix.json`
- `docs/DOMAIN-COMPLETION-MATRIX.md`
- `docs/validation/PROF-001-B03-KYC-EVIDENCE-AUTHORITY-RETIREMENT.json`
- `docs/validation/PROF-001-B03-KYC-EVIDENCE-AUTHORITY-RETIREMENT.md`
- `docs/DOKE-ENGINEERING-JOURNAL.md`

## Runtime permanente

O runtime dedicado comprovou:

1. sessões Supabase rejeitam todas as operações do repositório local;
2. IDs UUID não podem ser persistidos mesmo em provider fixture;
3. IndexedDB nunca é tocado;
4. fixtures não UUID podem salvar, ler e remover blobs durante o mesmo runtime;
5. um runtime novo não recupera a evidência anterior.

## Matriz de domínio

Após a conclusão do sublote:

- `PROF-B03` deixou de ser blocker ativo;
- a UI profissional está classificada como `remote`;
- a autoridade server-side está classificada como `canonical`;
- permanecem somente `PROF-B04` e `PROF-B05`;
- produção continua bloqueada.

Modo de validação: `canonical_MAIN_stack_validation_then_restore_stacked_base`.

O reconciliador controlado da matriz atualizou atomicamente `PROF-001`, regenerou a matriz Markdown pelo gerador canônico e removeu o próprio workflow no mesmo commit.

## Evidência de validação

**Candidate head validado:** `5098b8f689086143ecaae0a2d807e04d13357ca3`

- audit cumulativo PROF-A01: sucesso;
- audit e runtime PROF-A02: sucesso;
- audit e runtime PROF-A03: sucesso;
- audit e runtime PROF-A04: sucesso;
- audit e runtime PROF-B03: sucesso;
- matriz determinística: sucesso;
- Doke Quality Gates #855: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #628: sucesso;
- Doke Diagnostic E2E #648: sucesso.

## Segurança operacional

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada;
- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- nenhuma autoridade local aposentada foi reaberta;
- PR #11 permanece aberto, draft e não mesclado.

## Pendências preservadas

- `PROF-B04`: política legal KYC, retenção, rejeição, recurso e provedor;
- `PROF-B05`: retirada das políticas legadas owner-prefix pelo mecanismo gerenciado do Supabase Storage;
- produção permanece bloqueada.
