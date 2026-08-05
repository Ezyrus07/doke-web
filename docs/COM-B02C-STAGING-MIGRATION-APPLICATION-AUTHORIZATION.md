# COM-B02C — autorização de aplicação da migration em staging

Contrato: `com-b02c-staging-migration-application-authorization-v1`

## Objetivo

Este sublote cria somente o gate de autorização para uma futura aplicação, em staging, da migration preparada no COM-B02B. Ele não instala executor, não configura credenciais, não conecta ao Supabase e não aplica SQL.

## Migration congelada

```text
path: supabase/migrations/20260805121500_com_b02b_server_authority.sql
git blob SHA: fd74f6abc029023c4e0972b32b35daca975c3d57
target: staging
productionAllowed: false
```

Qualquer alteração de caminho ou blob invalida a autorização e exige nova revisão.

## Frase obrigatória

```text
I_EXPLICITLY_AUTHORIZE_COM_B02C_SERVER_AUTHORITY_MIGRATION_ON_DOKE_STAGING
```

A simples presença dessa frase na documentação ou no código não representa autorização recebida. A autorização somente existe quando o usuário a fornece explicitamente em uma mensagem posterior e o estado canônico é atualizado para consumi-la uma única vez.

## Uso único

- a autorização não é reutilizável;
- uma tentativa de execução consome a autorização;
- uma falha exige nova autorização explícita;
- produção permanece proibida;
- merge do PR permanece proibido sem autorização separada.

## Verificação exigida após futura aplicação

- histórico de migrations contém a versão esperada;
- schema `com_private` existe;
- tabelas `community_state`, `community_event` e `command_idempotency` existem;
- RLS está habilitada nas três tabelas;
- `anon` e `authenticated` não têm acesso às tabelas;
- `authenticated` não pode executar as RPCs autoritativas;
- `service_role` possui apenas os grants previstos;
- RPC transacional usa `security definer` e `search_path` fixo;
- evento e projeção são confirmados atomicamente;
- a aplicação não cria linhas de domínio.

## Estado atual

```text
authorization received: false
authorization consumed: false
executor installed: false
credentials configured: false
migration applied: false
staging read authority: false
staging mutation authority: false
production authority: false
```

## Fail-closed

Frase divergente, alvo diferente de staging, blob diferente, permissão de produção, autorização já consumida ou tentativa anterior mantêm o resultado `blocked_repository_only`.
