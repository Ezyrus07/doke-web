# PROF-001 / PROF-B03-KYC-EVIDENCE — Retirada da autoridade IndexedDB

## Status

`VALIDATION PENDING`

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

O runtime dedicado deve comprovar:

1. sessões Supabase rejeitam todas as operações do repositório local;
2. IDs UUID não podem ser persistidos mesmo em provider fixture;
3. IndexedDB nunca é tocado;
4. fixtures não UUID podem salvar, ler e remover blobs durante o mesmo runtime;
5. um runtime novo não recupera a evidência anterior.

## Matriz de domínio

Ao concluir o sublote:

- `PROF-B03` deixa de ser blocker ativo;
- a UI profissional pode ser classificada como `remote`;
- a autoridade server-side pode ser classificada como `canonical`;
- permanecem somente `PROF-B04` e `PROF-B05`;
- produção continua bloqueada.

Modo de validação: `canonical_MAIN_stack_validation_then_restore_stacked_base`.

Um reconciliador controlado e autocontido foi adicionado apenas para atualizar atomicamente `PROF-001`, regenerar a matriz Markdown pelo gerador canônico e remover o próprio workflow no mesmo commit. A validação não poderá avançar enquanto esse arquivo temporário permanecer na branch.

## Segurança operacional

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- staging não alterado;
- produção não alterada;
- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PR #11 permanece aberto, draft e não mesclado.
