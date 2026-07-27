# PROF-001 / PROF-A03 — Reconciliação atômica do perfil profissional

## Status

`STAGING VALIDATED — FINAL EVIDENCE PENDING`

## Objetivo

Substituir a edição dividida entre o repositório profissional e o serviço de perfil-base por uma única operação server-side transacional.

## Causa-raiz

O editor de `perfil-profissional.html` executava duas mutações separadas:

1. atualizava o payload profissional;
2. atualizava o perfil-base;
3. tentava reverter o primeiro passo no navegador caso o segundo falhasse.

Esse desenho não garantia atomicidade e mantinha o browser como coordenador de consistência.

## Autoridade implementada

A operação `update_professional_profile_reconciled` é exposta apenas pela Edge Function JWT-verified `self-service-operations`.

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

`professional-profile-service.js` agora:

- executa uma única mutação;
- valida o sujeito devolvido pelo servidor;
- exige perfil profissional ativo;
- reconcilia novamente o cache do perfil-base;
- emite `doke:professional-profile-updated` com `source: server`.

O serviço deixou de chamar:

- `professionalProfiles.updateActiveProfile`;
- `profile.updateCurrentProfile`;
- rollback profissional no navegador.

## Validação do candidato de código

Head validado: `45b0daa1ffdb4c199c1b896b67b7c1d32c861767`

- Doke Quality Gates #785: sucesso;
- audit estrutural PROF-A03: sucesso;
- runtime PROF-A03: sucesso;
- matriz determinística: sucesso;
- governança, assets, partição E2E e `git diff --check`: sucesso;
- E2E bloqueante: sucesso;
- 105 guards visuais: sucesso;
- Doke Staging Edge HTTP Canary #558: sucesso antes do deployment;
- Doke Diagnostic E2E #578: sucesso.

## Validação no Supabase staging

Projeto: `doke-web-staging` (`zwkczgewzbsorbrjuzpb`).

- migration `professional_profile_reconciliation_authority` aplicada;
- versão de migration registrada: `20260727110417`;
- teste SQL `017_professional_profile_reconciliation_authority_validation.sql`: sucesso;
- transação de teste encerrada com `ROLLBACK`;
- função privilegiada presente;
- `service_role`: execução permitida;
- `anon`: execução negada;
- `authenticated`: execução negada;
- usuários sintéticos de autenticação após o teste: `0`;
- usuários sintéticos públicos após o teste: `0`;
- Edge Function `self-service-operations`: versão `6`, `ACTIVE`;
- `verify_jwt`: `true`;
- action `update_professional_profile_reconciled` presente no bundle implantado.

Uma tentativa de probe HTTP pelo ambiente local não foi registrada como validação porque o host Supabase não pôde ser resolvido nesse ambiente. Nenhum sucesso foi inferido desse teste não executado.

## Validação permanente

- audit estrutural PROF-A03;
- runtime Node da operação única;
- teste SQL transacional com rollback;
- Quality canônico;
- E2E bloqueante;
- 105 guards;
- Canary;
- Diagnostic.

## Pendências preservadas

- retirada do rascunho KYC em `localStorage/sessionStorage`;
- retirada das evidências KYC em IndexedDB;
- política legal e retenção;
- políticas legadas administradas pelo Supabase Storage.

## Segurança operacional

- staging alterado de forma controlada;
- nenhuma alteração em produção;
- função privilegiada sem grant direto para `anon` ou `authenticated`;
- execução concedida apenas a `service_role`;
- ator derivado do JWT pela Edge Function;
- nenhuma conta real modificada;
- nenhuma conta sintética persistente criada;
- nenhum SMS, OAuth ou recurso pago habilitado;
- PR #11 permanece aberto, draft e não mesclado.

## Próxima condição de fechamento

Os commits de evidência e o deployment de staging devem passar pela rodada final de Quality, E2E bloqueante, 105 guards, Canary e Diagnostic antes de o PROF-A03 receber status `DONE`.
