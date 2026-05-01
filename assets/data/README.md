# Mock data contracts

Dados temporários para desenvolver telas e estados antes de conectar Supabase/Firebase.

Regras:

- Não usar dados reais de usuários.
- Manter IDs estáveis para testes.
- Campos devem se aproximar do modelo futuro, mas sem acoplar a UI ao backend final.
- Quando o backend real entrar, criar adapters em `assets/js/services/` ou `src/lib/api/`.
