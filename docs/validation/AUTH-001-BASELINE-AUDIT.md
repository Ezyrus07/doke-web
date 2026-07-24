# AUTH-001 — Baseline de autenticação, sessão e identidade

## Estado

- **Branch:** `auth/auth-001-baseline-audit`
- **Base:** `MAIN@1412a4c3aac60c5392ebbca466f1ecd1a8aa1428`
- **Status:** `IN PROGRESS — AUTH-A01 concluído; AUTH-A02 implementado e em validação`
- **Ambiente alterado:** nenhum projeto Supabase; nenhum deploy; nenhuma configuração Auth.

## Objetivo

Promover a autenticação da Doke de uma arquitetura híbrida/canary para uma autoridade real, previsível e segura, sem ligar simultaneamente pedidos, mensagens, pagamentos ou outros domínios operacionais.

## Autoridades observadas

### Autoridade ativa no navegador

- `assets/js/services/auth-service.js` é o serviço público consumido pelas páginas.
- `assets/js/core/session.js` normaliza, persiste e publica a sessão para o restante da aplicação.
- `assets/js/core/runtime-config.js` mantém `authProvider=mock` e `enableNetworkRequests=false` como padrão.
- `assets/js/core/auth-route-map.js` classifica rotas públicas, privadas e exclusivas de autenticação.
- `assets/js/core/route-guard.js` avalia as rotas, mas usa `observe` por padrão.

### Implementação legada/dormente

`assets/js/core/auth-service.js` mantém uma segunda implementação completa de autenticação local/Supabase, incluindo usuários e recuperação em `localStorage`. Nenhum HTML ativo encontrado nesta auditoria carrega esse arquivo; ele não pode voltar a competir com o serviço canônico.

### Backend/API controlado

- O registro de rotas declara login, cadastro, sessão, logout, recuperação, redefinição e identidade atual.
- `backend/modules/auth/route-handlers.js` implementa login, sessão, logout e leitura/atualização de identidade.
- Cadastro, recuperação e redefinição permanecem associados ao handler genérico `notImplementedHandler`.

## Constatações

### AUTH-B01 — Autoridade fragmentada

**Severidade:** alta.

Existem três caminhos conceituais:

1. Supabase direto nas páginas de login/cadastro por meio do serviço canônico;
2. provider HTTP `/auth/*` controlado por runtime flags;
3. implementação legada completa em `assets/js/core/auth-service.js`.

O produto precisa escolher uma única autoridade de sessão no navegador e uma única fronteira para operações de autenticação.

### AUTH-B02 — Tokens duplicados no armazenamento da aplicação

**Severidade:** crítica para beta público.

`assets/js/core/session.js` persiste o DTO completo em `localStorage`; `assets/js/services/auth-service.js` copia `access_token` e `refresh_token` do Supabase para esse DTO. Isso duplica segredos já gerenciados pelo SDK e aumenta a superfície de exposição e de dessincronização.

A sessão Doke deve guardar apenas o snapshot público necessário para renderização. A sessão criptográfica deve permanecer sob a autoridade do Supabase SDK ou de cookie `httpOnly` no provider API.

### AUTH-B03 — Bootstrap e refresh não possuem uma autoridade única

**Severidade:** alta.

Login e cadastro diretos gravam uma cópia local da sessão, porém o serviço canônico não estabelece um listener Supabase global para reconciliar `SIGNED_IN`, `TOKEN_REFRESHED`, `SIGNED_OUT`, expiração e revogação em todas as páginas. O provider API possui outro caminho de refresh.

O estado visual pode permanecer autenticado depois de a sessão real expirar, ser revogada ou mudar em outra aba.

### AUTH-B04 — Rotas privadas não são impostas

**Severidade:** alta.

O mapa classifica páginas privadas, mas o guard usa `observe` como modo padrão. Assim, a ausência de sessão apenas atualiza atributos do DOM; não garante redirecionamento para login, tentativa de refresh, estado 403 ou bloqueio de conta suspensa.

### AUTH-B05 — Recuperação real está desalinhada do login/cadastro

**Severidade:** crítica funcional.

Quando a configuração Supabase está habilitada:

- login e cadastro usam Supabase diretamente;
- recuperação usa o provider API apenas quando `authProvider=api`, `apiBaseUrl` existe e a rede está habilitada;
- fora desse canary, a recuperação cai no repositório local/mock.

Como as identidades demo foram removidas, o usuário real pode criar e acessar uma conta, mas não possuir um caminho real coerente para recuperar a senha.

### AUTH-B06 — Cadastro, recuperação e reset da API não estão implementados

**Severidade:** alta.

As rotas `/auth/register`, `/auth/recovery` e `/auth/reset-password` existem no contrato, porém seus handlers reais não foram materializados no backend controlado. O provider API não pode ser promovido como solução completa enquanto essas rotas permanecerem genéricas.

### AUTH-B07 — Telefone anunciado sem identidade operacional comprovada

**Severidade:** média/alta.

A interface anuncia login e recuperação por telefone. O login Supabase canônico rejeita identificadores que não sejam e-mail; SMS depende de provider externo e não está comprovado. O produto deve começar com e-mail real ou configurar e validar o provider telefônico antes de oferecer essa opção.

### AUTH-B08 — Username não possui autoridade transacional real

**Severidade:** alta.

A disponibilidade do username é consultada no repositório local. O valor é enviado como metadata do cadastro, sem prova nesta superfície de consulta real, constraint única e materialização transacional do perfil. Isso permite falso positivo e condição de corrida.

### AUTH-B09 — OAuth visual sem fluxo operacional comprovado

**Severidade:** média.

Login exibe Google, Facebook e Apple, mas o controlador de autenticação auditado não conecta esses botões a `signInWithOAuth`. Controles sem ação devem permanecer desabilitados/rotulados como indisponíveis ou ser implementados e testados por provider.

### AUTH-B10 — Estados de segurança incompletos

**Severidade:** alta.

Ainda faltam contratos de runtime para:

- sessão expirada e refresh falho;
- conta suspensa/desabilitada;
- role sem autorização;
- reautenticação antes de ações sensíveis;
- mudança de senha e recuperação sem enumeração de conta;
- confirmação de e-mail, reenvio e retorno por deep link;
- revogação entre abas/dispositivos.

## Decisões de arquitetura

1. `assets/js/services/auth-service.js` permanecerá como API pública das páginas.
2. `assets/js/core/session.js` permanecerá como snapshot de identidade/renderização, não como cofre de tokens.
3. O Supabase SDK será a autoridade criptográfica no modo direto; o provider API só poderá usar cookie `httpOnly` ou contrato explícito sem duplicar refresh token no estado visual.
4. `assets/js/core/auth-service.js` será formalmente aposentado após um gate provar que não possui consumidores ativos.
5. E-mail será o primeiro canal real obrigatório. Telefone e OAuth serão sublotes separados, ativados somente com providers configurados e canários verdes.
6. Nenhum domínio operacional será migrado junto com AUTH-001.
7. `PAID-001` continuará bloqueado até o upgrade do Supabase, sem impedir o restante da implementação gratuita.

## Sequência obrigatória

### AUTH-A01 — Freeze da autoridade e testes de baseline

**Estado:** implementado, aguardando o CI final do PR.

O gate foi incorporado a `scripts/audit-auth-session-contracts.js`, que já participa do Quality Gates. Ele agora:

- inventaria todos os HTMLs ativos na raiz e em `auth/`;
- falha se qualquer página carregar `assets/js/core/auth-service.js`;
- exige `assets/js/core/session.js` antes de `assets/js/services/auth-service.js` em todo consumidor canônico;
- exige nas páginas de autenticação a ordem Supabase config → sessão → repositório de usuários → serviço canônico → controlador da página;
- verifica a superfície pública canônica exposta em `window.DokeAuth`;
- fixa a identidade do arquivo legado analisado para impedir que ele mude silenciosamente de função.

Nenhum redirect, login, cadastro, recovery, token ou sessão foi alterado neste sublote.

### AUTH-A02 — Sessão canônica Supabase

- remover `access_token` e `refresh_token` do DTO persistido pela Doke;
- reconciliar `getSession()` e `onAuthStateChange()` em uma única ponte;
- tratar refresh, expiração, logout e sincronização entre abas;
- manter apenas identidade pública/sanitizada para renderização.

### AUTH-A03 — Guardas e estados de acesso

- promover rotas privadas de `observe` para `enforce` de forma controlada;
- preservar `next` seguro e same-origin;
- implementar estados 401, 403, suspenso e sessão expirada;
- impedir flash de conteúdo privado antes da decisão de sessão.

### AUTH-A04 — Cadastro e username reais

- escolher Supabase direto ou API canônica para cadastro, sem caminhos concorrentes;
- materializar usuário/perfil de forma idempotente;
- validar username no banco com constraint única e operação transacional;
- implementar confirmação/reenvio de e-mail e onboarding inicial.

### AUTH-A05 — Recuperação e mudança de senha

- implementar recuperação por e-mail real;
- adotar callback/deep link oficial do Supabase ou endpoints API completos;
- remover códigos locais e respostas que enumerem contas;
- exigir reautenticação em mudanças sensíveis quando aplicável;
- manter telefone oculto/desabilitado até o provider SMS ser validado.

### AUTH-A06 — Providers opcionais

- Google, Apple e Facebook somente após configuração, callback allowlist e canários;
- telefone somente após provider SMS, custo, antifraude e taxa de entrega avaliados.

### AUTH-A07 — Staging e promoção

- provisionar personas de staging sem versionar credenciais;
- validar cadastro, confirmação, login, refresh, logout, recuperação, reset, revogação e guards;
- repetir Security Advisor;
- anexar evidências no diário e no PR;
- promover somente depois de CI e canários verdes.

## Gates de saída do AUTH-001

AUTH-001 só poderá ser marcado como concluído quando:

1. uma única implementação ativa controlar autenticação no frontend;
2. nenhum refresh token for persistido no snapshot da aplicação;
3. sessão expirada/revogada não mantiver UI autenticada;
4. rotas privadas forem efetivamente protegidas;
5. cadastro e username forem materializados com autoridade real;
6. recuperação e reset por e-mail funcionarem ponta a ponta;
7. respostas de recuperação não permitirem enumeração de conta;
8. conta suspensa e role sem permissão produzirem estados seguros;
9. logout limpar a sessão real e todas as superfícies visuais;
10. staging canaries e Quality Gates passarem;
11. pendências de telefone/OAuth estiverem implementadas ou claramente desativadas;
12. `PAID-001` continuar explicitamente visível até ser resolvido.

## AUTH-A02 — implementação

- O Session Store agora persiste somente um snapshot público e saneia automaticamente registros legados com segredos.
- `supabase` passou a ser provider reconhecido pelo contrato de domínio.
- O serviço canônico registra uma única assinatura `onAuthStateChange()` e reconcilia o bootstrap por `getSession()`.
- `DokeAuth.getAccessToken()` consulta o provider ativo; nenhum consumidor precisa ler `session.token`.
- O provider API mantém access token somente em memória durante o canary.
- Um teste determinístico valida migração, refresh, logout e ausência de segredos no runtime e no armazenamento.

## Próximo sublote

Executar `AUTH-A03`: promover os guards privados de forma controlada e implementar estados seguros de sessão ausente, expirada, revogada, suspensa e sem permissão.