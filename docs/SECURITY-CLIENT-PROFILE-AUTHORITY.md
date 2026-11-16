# Autoridade de dados do cliente

## Escopo

Este lote fecha `public.client_profiles` como autoridade privada de métricas operacionais do cliente. A tabela não é um cadastro pessoal e não recebe e-mail, telefone, documento, KYC, risco, flags administrativas ou histórico privado. Informações editáveis e públicas continuam pertencendo a `public.user_profiles`.

## Superfícies canônicas

### 1. Métricas privadas

`public.client_profiles` contém somente:

- `user_id`;
- `orders_count`;
- `average_rating`;
- `reviews_count`;
- timestamps operacionais.

`authenticated` recebe apenas `SELECT`, limitado por RLS ao próprio `user_id`. Não há `INSERT`, `UPDATE` ou `DELETE` pelo navegador. O papel profissional ou administrativo não amplia o alcance para linhas de terceiros.

### 2. Projeção pública mínima

`public.client_profile_public_summaries` expõe somente agregados compatíveis com reputação pública:

- pedidos concluídos;
- média de avaliação;
- quantidade de avaliações;
- data da última materialização.

A projeção é removida quando a conta é suspensa, excluída, deixa de ser elegível ou perde sua linha privada. Ela não contém contato, documentos, KYC, risco ou estado administrativo.

### 3. Mutações controladas

As métricas são recalculadas por funções `private` acionadas por mudanças em pedidos e avaliações. A única RPC pública de reconciliação, `refresh_client_profile_metrics_internal(uuid)`, é executável exclusivamente por `service_role`. Funções `SECURITY DEFINER` usam `search_path = pg_catalog`, referências qualificadas e não são executáveis por `PUBLIC`, `anon`, `authenticated` ou diretamente por `service_role` quando são helpers internos.

### 4. Papel público do perfil

`public.public_profile_role_projection` é uma projeção pública mínima e server-owned da autoridade `public.users.role`. Ela contém somente `user_id`, `role` e `updated_at`, mantendo linhas apenas para contas `active` com papel `client` ou `professional`.

- `anon` e `authenticated` recebem somente `SELECT`;
- nenhuma escrita de navegador é permitida;
- a sincronização ocorre por trigger privado a partir de `public.users`;
- suspensão, exclusão ou mudança para papel não público remove a projeção;
- `user_profiles` continua sendo a autoridade dos campos públicos editáveis e nunca é usado para inferir `role`.

No frontend, `profile-service.getById()` combina `user_profiles` com essa projeção quando o provider Supabase está ativo. A ausência de qualquer uma das autoridades produz perfil indisponível, e falhas remotas não degradam silenciosamente para um perfil local potencialmente obsoleto. Identificadores públicos que não sejam UUID falham fechado antes de qualquer filtro remoto, preservando o estado vazio canônico para rotas sem sujeito válido.

## Decisões de arquitetura

- O nome `client_profiles` foi preservado para evitar rename destrutivo, mas sua responsabilidade foi documentada como métricas privadas server-owned.
- O backend de identidade lê apenas a linha do usuário autenticado e normaliza `reviews_count` junto às métricas já existentes.
- Perfis públicos não consultam `client_profiles`; usam `user_profiles` e a projeção agregada quando reputação pública for necessária.
- Operadores não recebem leitura transversal pelo Data API. Qualquer futura operação de suporte deve passar por backend/Edge Function com contexto de ator canônico e trilha de auditoria própria.

## Testes

- Contrato estático: `npm run test:client-profile-authority-contract`.
- Runtime JS: `npm run test:client-profile-authority-runtime`.
- Staging/SQL transacional: `supabase/tests/008_client_profile_authority_validation.sql` e `supabase/tests/015_public_profile_role_projection_validation.sql`.

O teste SQL usa apenas contas existentes, executa mutações dentro de uma transação e termina com `ROLLBACK`.
