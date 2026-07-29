# ORD-001 — A05 Canary preflight

## Resultado

O preflight read-only do `ORD-A05` foi congelado antes de qualquer mutação.

O PR #25 já havia avançado além do handoff recebido: `ORD-A02`, `ORD-A03` e `ORD-A04` estavam concluídos e verdes no head observado. Por isso, esses sublotes não foram repetidos.

## Causa raiz do bloqueio

O repositório já possui harnesses históricos para um canário de escrita com personas de cliente, profissional, suporte e administrador. Entretanto, as quatro identidades dedicadas previstas pelo contrato não existem no projeto Supabase de staging.

Executar o canário agora exigiria criar ou modificar contas. Isso está fora do escopo deste preflight e violaria a regra operacional de não alterar contas, senhas, e-mails, telefones ou dados reais.

Status congelado:

```txt
blocked_missing_dedicated_staging_canary_accounts
```

## Estado confirmado do backend

A inspeção read-only confirmou:

- `orders`: 0 linhas;
- `budgets`: 0 linhas;
- `order_status_history`: 0 linhas;
- eventos de domínio: 0 linhas;
- tentativas de entrega: 0 linhas;
- RLS ativa em `orders`, `budgets` e `order_status_history`;
- `authenticated` possui somente `SELECT` direto nessas três tabelas;
- escrita autenticada permanece restrita às RPCs canônicas:
  - `public.create_order_command`;
  - `public.submit_order_quote_command`;
  - `public.transition_order_status`.

## Escopo deste preflight

Este subpasso apenas:

1. reconciliou o estado real do PR com o handoff desatualizado;
2. confirmou que A01–A04 permanecem verdes;
3. revalidou grants, policies, funções e contagens do staging;
4. verificou a disponibilidade das personas canário sem ler credenciais;
5. registrou o bloqueio de identidade;
6. adicionou um gate determinístico e read-only.

## O que não foi feito

- nenhuma conta foi criada ou alterada;
- nenhuma senha, e-mail, telefone ou perfil foi modificado;
- nenhum pedido, orçamento, histórico ou evento foi criado;
- nenhuma policy, grant, função ou migration foi alterada;
- nenhum provider de escrita foi ativado no frontend;
- produção não foi acessada nem modificada;
- OAuth, SMS e serviços pagos permaneceram desabilitados;
- o PR não foi marcado como pronto e não foi mesclado.

## Próximo passo autorizado

O próximo passo técnico é preparar as identidades canário dedicadas de staging em uma etapa separada e explicitamente autorizada.

Depois disso, o canário deverá:

1. usar sessões distintas de cliente e profissional;
2. criar um pedido pela RPC canônica;
3. validar leitura consistente nas duas sessões;
4. avançar o estado apenas pelas transições permitidas;
5. enviar orçamento pela RPC canônica;
6. negar acesso a usuário terceiro;
7. provar conflito otimista;
8. verificar histórico e outbox;
9. remover exclusivamente os fixtures marcados pelo canário;
10. confirmar novamente contagens e ausência de resíduos.

PAY-001, SCHED-001 e MSG-001 permanecem fora do escopo.

## Evidência

A evidência estruturada está em:

```txt
docs/validation/ORD-001-A05-CANARY-PREFLIGHT.json
```
