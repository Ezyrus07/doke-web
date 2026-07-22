# Doke — entrega SEC-001: autoridade profissional e KYC

Data: 22/07/2026  
Base anterior: `doke-web-security-identity-authority-cumulative.zip`  
Projeto Supabase: `zwkczgewzbsorbrjuzpb`

## Resultado

O segundo lote controlado de segurança foi concluído para perfil profissional, verificação de identidade, eventos de KYC, documentos privados e revisão administrativa. A escrita direta do navegador nas tabelas sensíveis foi removida; o candidato e o revisor agora usam autoridades distintas e autenticadas.

## Contrato final de autoridade

- `professional_profiles`: leitura apenas do proprietário ou de `admin/moderator`; nenhuma escrita direta do navegador.
- `professional_identity_verifications`: leitura apenas do proprietário ou revisor; submissão e decisão somente por operações controladas.
- `verification_events`: RLS ativo, leitura owner/reviewer e escrita apenas por funções autorizadas.
- papel `professional`: promovido em `public.users`; privilégios não são gravados em `raw_user_meta_data`.
- fila e decisões administrativas: Edge Function autenticada + RPCs internas exclusivas do `service_role`.
- documentos: bucket privado, caminhos imutáveis gerados no servidor, tokens de upload temporários e manifesto consumido uma única vez.

## Fluxo do candidato

```text
Conta client ativa
→ configuração profissional
→ intent de upload de 30 minutos
→ caminhos locked/<user>/<intent>/...
→ tokens assinados por arquivo
→ upload direto ao bucket privado
→ submissão final pelo endpoint autenticado
→ validação de path, MIME e tamanho
→ intent consumido uma única vez
→ estado submitted
```

O navegador não escolhe os caminhos aceitos como evidência. A submissão final falha se qualquer objeto estiver ausente, possuir MIME/tamanho divergente ou não pertencer ao intent exato.

## Fluxo do revisor

```text
admin/moderator ativo
→ lista privada
→ detalhe auditado
→ claim da revisão
→ approve/reject
→ evento + auditoria + notificação
→ promoção canônica do papel, se aprovado
```

Um moderador não pode decidir uma revisão já assumida por outro revisor; o administrador mantém autoridade de contingência.

## Proteção de dados

- CPF/CNPJ não é persistido em texto puro.
- novas submissões usam HMAC-SHA-256 com segredo privado do banco;
- apenas os quatro últimos dígitos permanecem disponíveis para conferência;
- payloads de rascunho excluem documento fiscal e referências de arquivos;
- bucket `professional-verification-media` permanece privado, limitado a 10 MiB e MIME JPEG/PNG/PDF;
- selfie aceita somente JPEG/PNG.

## Evidência remota

- RLS ativo nas três tabelas.
- `anon`: nenhuma leitura das tabelas de KYC.
- `authenticated`: nenhuma escrita direta nas três tabelas.
- profissional proprietário: 1 perfil, 1 verificação e 11 eventos visíveis; 0 perfis alheios.
- cliente não proprietário: 0 perfis, 0 verificações e 0 eventos.
- administrador: fila completa visível.
- RPC antiga de submissão direta: removida.
- RPCs de upload, submissão e revisão: somente `service_role`.
- dados reais preservados: 1 perfil, 1 verificação, 11 eventos e 4 objetos.
- vazamentos de autoridade em `user_metadata`: 0.

## Edge Function

- slug: `professional-verification-operations`
- versão: `1`
- status: `ACTIVE`
- JWT obrigatório: `true`
- hash: `9320b94deb38a4b5edf4126223608d1f9249030f6bc8fed2bbec2c86d19c79db`

A função separa explicitamente ações de candidato (`prepare_uploads`, `submit`) e revisor (`list`, `detail`, `start`, `decide`) com papel canônico lido em `public.users`.

## Migrations remotas

- `20260722131419 professional_kyc_table_authority`
- `20260722132724 professional_kyc_signed_upload_authority`
- `20260722133106 professional_kyc_self_service_authority`
- `20260722133247 professional_kyc_reviewer_authority`
- `20260722133312 professional_kyc_final_permissions`

## Validação local

Aprovados:

- contrato estático de autoridade KYC;
- runtime da Edge Function;
- verificação profissional existente;
- fila administrativa existente;
- autoridade RLS e papéis;
- sessão e autenticação real;
- identidade/perfil;
- permissões de segurança;
- username/onboarding;
- proteção contra loop de perfil;
- matriz de conclusão;
- sintaxe dos módulos alterados.

A governança global percorreu todos os gates até o débito anterior do Home:

```html
<button class="account-onboarding__change">Alterar CEP</button>
```

## Limitações registradas

### 1. Policies legadas do Storage

`storage.objects` pertence à role gerenciada `supabase_storage_admin`; a role disponível ao MCP não pode remover as policies antigas. A arquitetura nova não depende delas: somente objetos em caminhos `locked/...` emitidos pelo servidor e associados a um intent válido podem ser submetidos.

As policies legadas ainda podem permitir que um usuário autenticado envie arquivos não utilizados sob o prefixo UUID antigo. Esses arquivos **não conseguem concluir o KYC**, mas a remoção manual das policies antigas pelo painel/role proprietária continua registrada como `PROF-B05`.

### 2. Canário destrutivo completo

A ferramenta bloqueou o canário que criaria temporariamente perfil, intent e submissão, mesmo com `ROLLBACK`. A restrição não foi contornada. As provas remotas foram não destrutivas: grants, RLS por persona, projeção administrativa, preservação dos dados e configuração da Edge Function.

## Advisors

As três tabelas deste lote deixaram de aparecer como RLS ausente. Os novos índices aparecem como ainda não utilizados, comportamento esperado com baixo volume.

Continuam como dívida de outros lotes:

- 12 tabelas públicas sem RLS;
- RPCs financeiras e de moderação antigas com grants amplos;
- listagem ampla do bucket público `service-media`;
- proteção contra senhas vazadas desativada.

## Matriz do Plano Mestre

- maturidade média: **2,43/6**;
- bloqueadores críticos: **28**;
- KYC remoto e segregação de revisor agora possuem autoridade real;
- jurídico, retenção de documentos e remoção das policies legadas continuam bloqueadores explícitos.

## Escopo preservado

- nenhum HTML alterado;
- nenhum CSS alterado;
- 184 caminhos de Comunidade byte a byte idênticos;
- nenhum pagamento, saldo ou carteira alterado;
- nenhuma Edge Function anterior modificada;
- nenhum cron modificado;
- nenhum segredo incluído no repositório.

## Integridade da entrega

- arquivos adicionados: **12**;
- arquivos modificados: **12**;
- arquivos removidos: **0**;
- ZIP mínimo: **24 arquivos**;
- ZIP cumulativo: **19.628 arquivos**;
- `package-lock.json`: inalterado;
- contagem de `!important` em produção: inalterada;
- integridade interna dos ZIPs: aprovada.

## Próximo lote

Fechar `client_profiles` e a separação entre dados privados do cliente e sua projeção pública, incluindo RLS, grants, mutações controladas e testes negativos por persona. Depois, prosseguir para `audit_logs` e RPCs privilegiadas antigas em lotes independentes.
