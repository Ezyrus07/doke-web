# Doke — autoridade de identidade e perfis

## Escopo

Este documento registra o primeiro lote do `SEC-001`. O objetivo é separar dados públicos de perfil, dados privados da conta e autorização de papéis.

## Autoridades

| Superfície | Autoridade | Acesso do navegador |
|---|---|---|
| `auth.users` | Supabase Auth | somente via Auth API |
| `public.users` | papel, status e estado da conta | usuário lê apenas a própria linha |
| `public.user_profiles` | perfil público | leitura pública; escrita somente por RPC controlada |
| `auth.users.raw_app_meta_data` | projeção do papel/status autoritativo | leitura pelo token; escrita apenas no servidor |
| `auth.users.raw_user_meta_data` | preferências e apresentação editáveis | nunca usada para autorização |

## Regras implementadas

1. Cadastro comum sempre materializa `role = client`.
2. `user_metadata.role` é removido e ignorado por frontend e backend.
3. Mudanças legítimas de `public.users.role/status` sincronizam `app_metadata` por trigger.
4. `public.users` não aceita DML direto de `anon` ou `authenticated`.
5. `public.user_profiles` não aceita DML direto; edição ocorre por `update_account_profile`.
6. `materialize_auth_account` e o trigger de criação vivem no schema `private`.
7. RPCs de onboarding/perfil exigem `auth.uid()`, conta ativa e validação de payload.
8. RPCs de KYC não são executáveis por `anon`.

## Matriz resumida

| Operação | anon | authenticated | service role |
|---|---:|---:|---:|
| Ler `public.users` | nenhum registro | própria linha | todas |
| Escrever `public.users` diretamente | bloqueado | bloqueado | permitido |
| Ler `public.user_profiles` | permitido | permitido | permitido |
| Escrever `public.user_profiles` diretamente | bloqueado | bloqueado | permitido |
| Executar onboarding/perfil | bloqueado | própria conta | permitido |
| Materializar conta diretamente | bloqueado | bloqueado | função privada |

## Limites deste lote

Este lote não conclui o `SEC-001`. Permanecem tabelas públicas sem RLS, RPCs financeiras/administrativas amplas, políticas de Storage e a configuração de proteção contra senhas vazadas. Cada grupo será tratado em lote próprio com teste negativo e canário.
