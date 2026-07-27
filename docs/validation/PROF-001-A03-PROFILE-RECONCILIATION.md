# PROF-001 / PROF-A03 — Reconciliação atômica do perfil profissional

## Status

`IMPLEMENTATION IN PROGRESS`

## Objetivo

Substituir a edição dividida entre o repositório profissional e o serviço de perfil-base por uma única operação server-side transacional.

## Causa-raiz

O editor de `perfil-profissional.html` executava duas mutações separadas:

1. atualizava o payload profissional;
2. atualizava o perfil-base;
3. tentava reverter o primeiro passo no navegador caso o segundo falhasse.

Esse desenho não garantia atomicidade e mantinha o browser como coordenador de consistência.

## Autoridade proposta

A operação `update_professional_profile_reconciled` será exposta apenas pela Edge Function JWT-verified `self-service-operations`.

No banco:

- `public.execute_self_service_operation_internal` reconstrói o ator autenticado;
- `public.update_professional_profile_reconciled` valida conta, role e perfil verificado;
- `public.update_account_profile` atualiza a identidade pública;
- `public.professional_profiles` recebe apenas os campos profissionais permitidos;
- qualquer falha reverte toda a transação;
- a resposta contém os snapshots canônicos de perfil-base e perfil profissional.

## Campos profissionais editáveis

- categoria principal;
- categoria alternativa;
- especialidades;
- apresentação;
- região de atendimento;
- experiência.

Status, role, verificação, documento e métricas não são aceitos pelo payload.

## Frontend

`professional-profile-service.js` passa a:

- executar uma única mutação;
- validar o sujeito devolvido pelo servidor;
- exigir perfil profissional ativo;
- reconciliar novamente o cache do perfil-base;
- emitir `doke:professional-profile-updated` com `source: server`.

O serviço deixa de chamar:

- `professionalProfiles.updateActiveProfile`;
- `profile.updateCurrentProfile`;
- rollback profissional no navegador.

## Validação permanente

- audit estrutural PROF-A03;
- runtime Node da operação única;
- teste SQL transacional com rollback;
- Quality canônico;
- E2E bloqueante;
- 105 guards;
- Canary;
- Diagnostic.

## Supabase

A migration foi criada no repositório, mas ainda não foi aplicada. Nenhuma Edge Function foi implantada. Staging e produção permanecem inalterados nesta fase.

## Pendências preservadas

- retirada do rascunho KYC em `localStorage/sessionStorage`;
- retirada das evidências KYC em IndexedDB;
- política legal e retenção;
- políticas legadas administradas pelo Supabase Storage.

## Segurança

- função privilegiada sem grant direto para `anon` ou `authenticated`;
- execução concedida apenas a `service_role`;
- ator derivado do JWT pela Edge Function;
- nenhuma conta real modificada;
- PR #11 permanece aberto, draft e não mesclado.
