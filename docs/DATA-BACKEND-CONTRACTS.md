# Contratos de dados e backend

## Entidades principais

- User
- UserProfile
- ProfessionalProfile
- Service
- ServiceCategory
- ServiceMedia
- Order
- Budget
- Conversation
- Message
- Review
- Wallet
- Transaction
- Community
- Notification
- Report
- AuditLog

## Regras

1. Toda entidade privada deve ter RLS antes de ir para produção.
2. Toda ação sensível deve gerar `audit_logs`.
3. Nenhuma página HTML/JS deve acessar tabelas diretamente.
4. Toda lista pública precisa de paginação.
5. Toda busca precisa ter limite e rate limiting no backend.
6. Pagamentos, saques e reembolsos nunca devem depender só do cliente.
7. Mensagens e anexos precisam validar participante da conversa.
8. Reviews só devem existir para pedidos concluídos.

## Papéis

- `guest`: leitura pública limitada.
- `client`: cria pedidos, conversa em pedidos, avalia pedidos concluídos.
- `professional`: cria serviços, envia orçamentos, gerencia agenda e saques.
- `moderator`: revisa denúncias, verificações e conteúdo.
- `admin`: opera plataforma, finanças e configurações críticas.
