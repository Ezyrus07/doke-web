# Delivery Report — SEC-001 Public Data, Community, Storage and Operator Authority

Entrega cumulativa de 22/07/2026.

- migrations locais 110–134 materializadas no staging, com reconciliação do registro idempotente duplicado de 130;
- 45/45 tabelas públicas com RLS e policy;
- zero `SECURITY DEFINER` público executável por `anon`;
- zero grant estrutural público para navegador ou `service_role`;
- zero grant do navegador sem policy correspondente;
- Edge Function `service-moderation-operations` ativa, versão 2, JWT obrigatório;
- `service-media` e `transaction-attachments` com quatro policies cada;
- bucket transacional privado e participante/uploader como autoridade;
- 116 asserções remotas aprovadas, todas com rollback;
- nenhum HTML/CSS alterado.

Consulte `DOKE-SECURITY-PUBLIC-DATA-AUTHORITY-DELIVERY.md` e os JSONs de evidência para detalhes, limitações e inventário.

---

# Delivery Report — SEC-001 Self-Service Edge Authority

Entrega cumulativa de 22/07/2026.

- quatorze RPCs self-service privilegiadas removidas da autoridade direta do navegador;
- Edge Function `self-service-operations` ativa, versão 1, JWT obrigatório;
- dispatcher interno exclusivo de `service_role` e actor derivado de `auth.getUser()`;
- migrations 135–136 aplicadas no staging;
- advisor de segurança reduzido a um único controle de Auth: leaked-password protection;
- 5/5 canários remotos e 22/22 grupos locais aprovados;
- nenhuma alteração intencional de HTML/CSS.

Consulte `DOKE-SECURITY-SELF-SERVICE-EDGE-AUTHORITY-DELIVERY.md`.

---

# Delivery Report — SEC-001 Hosted Runtime Validation

Entrega cumulativa de 22/07/2026.

- runtime real aprovado em 8/8 asserções com sessões Auth, JWT de usuário, Edge Function e Storage;
- signed URL privada consumida com HTTP 200 pelo outro participante da conversa;
- exclusão por terceiro não removeu o objeto e exclusão pelo uploader funcionou;
- bundles temporários restaurados aos SHA-256 originais;
- zero fixture residual em Auth, tabelas públicas, conversas ou Storage;
- leaked-password protection bloqueada pelo plano Free, disponível no Pro ou superior;
- nenhuma mudança funcional permanente nesta entrega.

Consulte `DOKE-SECURITY-RUNTIME-VALIDATION-DELIVERY.md`.


---

# Delivery Report — E2E Staging Finance Sandbox

Entrega cumulativa de 22/07/2026.

- autoridade financeira sandbox exclusiva do staging, travada por project ref e segredo do Vault;
- Edge Function `staging-finance-sandbox` ativa, versão 1, JWT obrigatório;
- migrations 137–144 aplicadas;
- navegador sem acesso direto às funções financeiras privilegiadas;
- ciclo SQL transacional aprovado em 15/15 asserções com rollback;
- ciclo hospedado Auth/JWT/Edge/ledger aprovado em 12/12 asserções;
- bloqueios de papel confirmados com HTTP 403;
- `order-event-worker` restaurado ao SHA-256 original;
- zero fixtures financeiras residuais;
- suíte local focada 16/16, autoridade 13/13 e sintaxe 1.025/1.025;
- passeio visual não executado porque o Chromium gerenciado bloqueia todas as URLs neste ambiente;
- sandbox não substitui PSP real de produção.

Consulte `DOKE-E2E-STAGING-FINANCE-SANDBOX-DELIVERY.md`.
