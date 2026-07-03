# Data Backend Contracts

Este contrato conecta o modelo frontend atual com a estrutura-alvo de backend, Supabase, policies e contratos compartilhados.

## Escopo

- Fonte de verdade funcional atual: mock/localStorage.
- Fonte de verdade futura: backend/API/Supabase.
- Fronteira permitida: services/repositories/providers.
- Páginas, renderers e CSS não podem acessar tabelas ou SDKs diretamente.

## Arquivos de fundação existentes

- `supabase/migrations/001_identity_profiles.sql`: identidade, perfis e auditoria base.
- `supabase/migrations/002_marketplace_core.sql`: serviços, pedidos, orçamentos e avaliações.
- `supabase/migrations/003_communication_finance_community.sql`: conversas, mensagens, carteira, notificações e comunidade.
- `supabase/policies/001_rls_foundation.sql`: base de RLS e policies.
- `supabase/seed/001_seed_reference_data.sql`: dados iniciais de referência.
- `backend/shared/contracts/permissions.json`: papéis e permissões compartilhadas.
- `assets/js/core/api-client.js`: contrato de cliente API.
- `assets/js/services/supabase-contract.js`: nomes de tabelas e status iniciais.

## Entidades de backend

- `users`.
- `user_profiles`.
- `professional_profiles`.
- `services`.
- `service_categories`.
- `service_media`.
- `orders`.
- `budgets`.
- `conversations`.
- `messages`.
- `payments`.
- `wallet_transactions`.
- `receivables`.
- `withdrawals`.
- `disputes`.
- `notifications`.
- `receipts`.
- `audit_logs` / `audit_events`.

## Papéis oficiais

- `guest`: leitura pública limitada.
- `client`: cria pedidos, paga, conversa e avalia pedidos concluídos.
- `professional`: aceita pedidos, envia cobranças, responde contestações e solicita saques.
- `moderator`: modera conteúdo e denúncias.
- `support`: opera filas financeiras e contestações mock/real.
- `admin`: opera plataforma, finanças e configuração crítica.

## Regras obrigatórias

1. Toda tabela privada deve ter RLS antes de produção.
2. Toda ação sensível deve registrar auditoria.
3. Pagamento, reembolso e saque devem ser confirmados no backend.
4. IDs financeiros definitivos devem ser gerados no backend.
5. Mensagens e anexos devem validar participação na conversa.
6. Reviews só podem existir para pedidos concluídos.
7. Listas públicas precisam de paginação e limite.
8. Busca precisa de limite e rate limiting.
9. Notificações devem usar chave idempotente.
10. Repositórios devem normalizar payloads antes de controllers.

## Documentos complementares

- `docs/DATA-MODEL.md`: entidades e status.
- `docs/FINANCIAL-FLOW-CONTRACT.md`: eventos financeiros e efeitos colaterais.
- `docs/API-ADAPTER-CONTRACT.md`: provider mock/API e endpoints.
- `docs/BACKEND-INTEGRATION-PLAN.md`: plano de migração.
