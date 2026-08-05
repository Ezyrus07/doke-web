# ADM-A01 — Authority Baseline

## Escopo

`ADM-A01` congela a autoridade administrativa observada antes de criar um backoffice unificado. É exclusivamente repository-only: não acessa banco, staging, provider, credenciais, dados reais ou produção.

## Estado observado

O painel administrativo combina quatro superfícies principais:

1. `admin.html` agrega anúncios, verificações, contestações, pagamentos e auditoria;
2. `admin-verificacao.html` trata identidade profissional;
3. `admin-anuncio-revisao.html` trata moderação de serviços;
4. `admin-pedidos-operacao.html` trata operação de pedidos.

A autoridade é fragmentada. Moderação de serviços já chama `service-moderation-operations`, mas o painel principal também lê pedidos e notificações locais e agrega carteiras, disputas, verificações e auditorias por serviços separados.

## Achados congelados

- o guard de frontend possui fallback `isMockSupport`/`mockSupport`;
- `admin.js` ainda se identifica como painel mock e usa leituras locais para pedidos e notificações;
- não existe um caso canônico único entre usuários, identidade, anúncios, pedidos, pagamentos, disputas, comunidades e conteúdo;
- auditorias são distribuídas por domínio, sem correlation ledger único;
- `admin`, `support` e `moderator` não formam uma matriz única de escopo e permissão;
- acesso temporário, propósito e escopo por caso não são universais;
- ações de alto risco não compartilham uma política maker-checker transversal;
- notas, SLA, escalonamento, recurso, break-glass e minimização de dados ainda não são contratos universais.

## Princípios

- frontend nunca é autoridade final;
- mock-support é proibido como autorização;
- operadores não editam banco diretamente;
- toda ação exige ator, escopo, motivo, correlation ID, before/after e auditoria imutável;
- acesso é mínimo, temporário e vinculado ao caso;
- ações de alto risco exigem dupla aprovação independente;
- break-glass expira e exige revisão posterior;
- dados sensíveis são minimizados e mascarados.

## Autoridade

Somente `contractAuthority` e `inventoryAuthority` são verdadeiros. Toda autoridade de sessão, RBAC, fila, decisão, auditoria, mutação, staging e produção permanece falsa.

## Sequência

- ADM-A02 — identidade do operador, RBAC escopado e acesso temporário;
- ADM-A03 — caso unificado, filas, notas, SLA e correlation ledger;
- ADM-A04 — maker-checker, dupla aprovação e break-glass;
- ADM-A05 — recursos, observabilidade e readiness de ativação.
