# Stage 21 — Backend, dados e segurança preparados

Esta etapa prepara a base operacional para a lógica real do Doke sem acoplar as páginas diretamente ao banco.

## Adicionado

- Migrações Supabase iniciais para identidade, perfis, marketplace, pedidos, mensagens, carteira, comunidades e moderação.
- Draft de políticas RLS para impedir que dados privados fiquem abertos por padrão.
- Seed de categorias principais.
- Contrato de permissões por papel.
- Boundary de API no frontend para evitar page scripts acessando banco diretamente.
- Auditoria de contratos backend/data.

## Regra arquitetural

Páginas não devem conversar diretamente com Supabase/Firebase. Elas devem usar serviços de domínio.

```txt
Página -> service -> api-client/adapter -> Supabase/Firebase
```

## Próximo passo recomendado

Criar módulos de serviço por domínio:

- search-service
- service-service
- order-service
- message-service
- wallet-service
- community-service
- notification-service

Cada módulo deve primeiro funcionar com mocks e só depois receber adapter real.
