# Modelo de dados inicial

## Entidades principais
- users
- user_profiles
- professional_profiles
- client_profiles
- services
- service_categories
- service_media
- service_locations
- orders
- order_status_history
- budgets
- conversations
- messages
- message_attachments
- reviews
- review_replies
- favorites
- communities
- community_members
- community_posts
- notifications
- schedules
- availability_slots
- transactions
- wallets
- payouts
- reports
- moderation_cases
- audit_logs
- admin_users

## Regras iniciais
- Toda ação sensível deve gerar audit log.
- Toda tabela com dados de usuário deve ter RLS/policy.
- Toda mídia deve ter dono, tipo, tamanho e status de moderação.
