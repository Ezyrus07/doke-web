# PROF-001 / PROF-A01 — Baseline de autoridade profissional

## Status

`BASELINE FROZEN`

## Objetivo

Congelar o estado exato das autoridades de perfil profissional, onboarding e KYC antes de retirar persistências locais ainda carregadas por páginas ativas.

Este lote não altera runtime, Supabase, dados ou políticas. Ele cria uma fronteira verificável para que os próximos sublotes removam `PROF-B03` sem regressão de fixtures, navegação ou estados visuais.

## Causa-raiz

A camada server-side já possui autoridades reais para:

- criação e salvamento do perfil profissional por `self-service-operations`;
- envio de KYC por Edge Function e upload com signed intent;
- leitura do status em `professional_profiles` e `professional_identity_verifications`;
- fila, detalhe, claim e decisão de revisão por `professional-verification-operations`;
- promoção de role profissional exclusivamente no servidor.

Apesar disso, três repositórios locais continuam presentes e carregados em páginas ativas:

1. `professional-profiles-repository.js`
   - persiste em `localStorage`;
   - expõe `saveDraft`, `completeSetup`, `updateActiveProfile`, `setVerificationStatus` e `transition`.
2. `professional-identity-verifications-repository.js`
   - persiste registros em `localStorage`;
   - persiste drafts em `sessionStorage`;
   - expõe `saveDraft`, `submit` e `transition`.
3. `professional-verification-evidence-repository.js`
   - persiste payloads e blobs em IndexedDB;
   - expõe `save` e `remove`.

A existência desses caminhos mantém `PROF-001` corretamente classificado como `hybrid` / `partial`, mesmo com os fluxos Supabase já operacionais.

## Autoridade remota confirmada

### Perfil profissional

`professional-profile-setup-service.js`:

- lê `professional_profiles` pelo cliente Supabase;
- salva draft por `save_professional_profile_setup`;
- conclui setup pela mesma autoridade com `p_complete: true`;
- não grava em `localStorage`, `sessionStorage` ou IndexedDB.

### Verificação profissional

`professional-identity-verification-service.js`:

- exige sessão com provider `supabase` para a autoridade remota;
- salva draft por `save_professional_verification_draft`;
- prepara uploads com signed intent;
- envia KYC por `professional-verification-operations`;
- usa operações remotas de listagem, detalhe, início e decisão;
- aceita promoção somente após confirmação server-side de `status: verified` e `role: professional`.

## Superfícies locais congeladas

### `professional-profiles-repository.js`

Carregado por:

- `admin-verificacao.html`;
- `admin.html`;
- `anunciar-servico.html`;
- `meu-perfil.html`;
- `perfil-profissional.html`;
- `perfil.html`;
- `tornar-profissional.html`;
- `verificacao-profissional.html`.

### `professional-identity-verifications-repository.js`

Carregado por:

- `admin-verificacao.html`;
- `admin.html`;
- `anunciar-servico.html`;
- `meu-perfil.html`;
- `perfil-profissional.html`;
- `verificacao-profissional.html`.

### `professional-verification-evidence-repository.js`

Carregado por:

- `admin-verificacao.html`;
- `admin.html`;
- `verificacao-profissional.html`.

## Blockers

### PROF-B03 — executável

Perfil, draft de KYC e evidência binária ainda possuem autoridade de mutação no navegador.

Este é o próximo blocker técnico a ser reduzido.

### PROF-B04 — externo/legal

As regras finais de KYC, retenção documental, rejeição, recurso e eventual fornecedor jurídico ainda não foram aprovadas.

O código não deve inventar essa política.

### PROF-B05 — managed Storage

As políticas legadas de escrita por prefixo de owner permanecem sob a autoridade gerenciada do Supabase Storage. O fluxo novo de signed intent não depende delas, mas a remoção física exige a autoridade adequada.

## Gate permanente

`scripts/audit-professional-authority-baseline.js` falha quando:

1. uma nova página passa a carregar um dos três repositórios locais sem reconciliação;
2. uma chave de storage profissional aparece em outro arquivo ativo;
3. a autoridade remota de perfil ou KYC perde seus marcadores server-side;
4. a matriz deixar de declarar o estado híbrido/partial antes da retirada real;
5. `PROF-B03`, `PROF-B04` ou `PROF-B05` forem removidos sem evidência correspondente;
6. a evidência machine-readable deixar de refletir o baseline congelado.

## Supabase

- nenhuma migration aplicada;
- nenhuma Edge Function implantada;
- nenhum bucket ou policy alterado;
- nenhum dado de staging ou produção modificado;
- nenhuma conta real ou sintética persistente criada.

## Próximo sublote

`PROF-A02` deve retirar ou isolar `professional-profiles-repository.js` das páginas Supabase ativas, preservando apenas fixtures explicitamente testadas e impedindo fallback local para sujeitos UUID.

A evidência binária/IndexedDB será tratada em lote posterior para não misturar perfil profissional e KYC documental no mesmo corte.
