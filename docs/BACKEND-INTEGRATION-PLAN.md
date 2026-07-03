# Backend Integration Plan

Este plano define a migração segura do Doke Web de mock/localStorage para backend real sem reescrever a experiência atual.

## Objetivo

Substituir gradualmente o armazenamento local por API/Supabase mantendo o contrato atual de pages → controllers → services/repositories → renderers.

## Princípios

1. Backend real entra por provider/repository, não por HTML.
2. Renderer nunca chama API.
3. CSS não muda por causa de backend.
4. A UI pode esconder ações, mas autorização real deve existir no backend.
5. Cada operação financeira sensível deve ser idempotente.
6. Toda ação admin deve gerar auditoria.
7. LocalStorage continua funcionando enquanto o provider real não for habilitado.

## Fases

### 11A — Contratos e adapter

- Fechar modelo de dados.
- Fechar status oficiais.
- Fechar eventos financeiros.
- Criar provider API inativo por padrão.
- Documentar endpoints e DTOs.
- Não conectar rede real.

### 11B — Provider API controlado por flag

- Permitir selecionar provider `mock` ou `api` em runtime.
- Manter fallback para mock quando API não estiver habilitada.
- Adicionar normalização por entidade.
- Criar smoke tests de list/get/mutate sem dependência visual.

### 11C — Autenticação real planejada

- Separar sessão mock de sessão real.
- Mapear roles e permissões.
- Definir refresh/session guard.
- Garantir que rotas restritas falhem de forma segura.

### 12 — Integração inicial

- Conectar leitura pública limitada: categorias, serviços, perfis e anúncios.
- Depois conectar pedidos/conversas.
- Por último conectar carteira/pagamentos/saques.

### 13 — Hardening

- RLS/policies.
- Rate limiting.
- logs de auditoria.
- validação server-side.
- observabilidade.
- testes de regressão por fluxo.

## Entidades de backend prioritárias

1. `users`.
2. `professional_profiles`.
3. `services`.
4. `orders`.
5. `conversations`.
6. `messages`.
7. `payments`.
8. `wallet_transactions`.
9. `receivables`.
10. `withdrawals`.
11. `disputes`.
12. `notifications`.
13. `receipts`.
14. `audit_events`.

## Endpoints-alvo

### Auth

- `POST /auth/login`.
- `POST /auth/logout`.
- `GET /auth/session`.
- `POST /auth/register`.

### Users/profiles

- `GET /users/me`.
- `PATCH /users/me`.
- `GET /professionals/:id`.
- `PATCH /professionals/:id`.

### Marketplace

- `GET /services`.
- `GET /services/:id`.
- `POST /services`.
- `PATCH /services/:id`.

### Orders

- `GET /orders`.
- `POST /orders`.
- `GET /orders/:id`.
- `POST /orders/:id/accept`.
- `POST /orders/:id/charge`.
- `POST /orders/:id/complete`.

### Conversations

- `GET /conversations`.
- `GET /conversations/:id/messages`.
- `POST /conversations/:id/messages`.

### Payments/wallet

- `POST /payments`.
- `GET /wallet`.
- `GET /wallet/transactions`.
- `GET /wallet/receivables`.
- `POST /withdrawals`.
- `POST /withdrawals/:id/approve`.
- `POST /withdrawals/:id/decline`.

### Disputes/admin

- `GET /admin/disputes`.
- `POST /disputes`.
- `POST /disputes/:id/respond`.
- `POST /admin/disputes/:id/release`.
- `POST /admin/disputes/:id/refund`.
- `GET /admin/audit-events`.

### Receipts/notifications

- `GET /receipts/:id`.
- `GET /notifications`.
- `POST /notifications/:id/read`.

## Regras de segurança

- Cliente só acessa pedidos/conversas dos quais participa.
- Profissional só acessa pedidos vinculados ao próprio perfil.
- Suporte/admin pode ver filas operacionais, mas toda ação gera `AuditEvent`.
- Pagamento, reembolso e saque não podem confiar em cálculo no frontend.
- IDs de transações e recibos devem ser gerados no backend.
- Anexos de mensagens precisam validar participante e tipo de arquivo.

## Estratégia de coexistência mock/API

- O provider ativo começa como `mock`.
- O provider `api` pode ser registrado, mas não deve ser ativado sem flag.
- Services expõem a mesma assinatura para mock e API.
- Repositories normalizam payloads antes de controllers.
- Falhas de API devem retornar erro normalizado para estado `error`, não quebrar a página.

## Critério de pronto para iniciar backend real

- Contratos de dados documentados.
- Eventos financeiros idempotentes.
- Permissões mapeadas.
- Provider API criado, mas inativo.
- Nenhuma página dependendo diretamente de `fetch`, Supabase ou tabelas.
- Fluxos mock principais validados localmente.
