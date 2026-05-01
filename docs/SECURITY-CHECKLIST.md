# Checklist de segurança

- RLS em todas as tabelas sensíveis
- Validação server-side
- Sanitização de texto enviado por usuário
- Rate limiting em login, busca, mensagens e criação de pedido
- Logs de auditoria para ações sensíveis
- Separação de papéis: client, professional, moderator, admin
- Proteção contra XSS
- Upload com limite de tamanho e tipo
- Moderação de mídia
- Webhooks assinados
- Backups automáticos
- Variáveis secretas fora do frontend
