# PAY-001 A02 — Fronteira de autoridade financeira autenticada

## Causa raiz

O baseline A01 comprovou três caminhos concorrentes: API, sandbox financeiro de staging e simulação local. Embora as operações server-owned já falhassem fechado em alguns pontos, o serviço de pagamentos ainda podia executar hold/release local quando API e sandbox estavam indisponíveis, e o repositório financeiro convertia algumas falhas remotas em mutações locais.

Para uma sessão autenticada por UUID, isso criava uma ambiguidade perigosa: a interface podia apresentar um resultado financeiro local sem qualquer confirmação de servidor ou provedor.

## Fronteira canônica

- **Sessão UUID autenticada:** toda mutação financeira exige API, RPC/Edge server-owned ou sandbox sintético autorizado de staging. Sem rota remota, falha com `DOKE_FINANCIAL_SERVER_AUTHORITY_REQUIRED`.
- **Fixture não UUID:** pode continuar usando simulação local exclusivamente para testes isolados; nunca é evidência de dinheiro real.
- **Leituras/cache:** projeções locais continuam permitidas para resiliência visual, mas não materializam pagamento, recebível, disputa, saque ou liquidação.

## Operações protegidas

Pagamento, solicitação/conclusão do serviço, conta bancária, recebíveis, saques, disputas e gravação de pagamento deixam de cair para mutação local em sessões UUID.

## Ordem do provider

A execução passa a respeitar a mesma ordem declarada pelo status do domínio:

1. API canônica;
2. sandbox Supabase exclusivamente sintético de staging;
3. fixture local não UUID.

Quando a sessão é UUID e os dois primeiros caminhos estão indisponíveis, o provider projetado é `unavailable`, não `mock`.

## Não incluído

Este lote não seleciona PSP, não cria payment intent real, não registra webhook, não aplica migration, não implanta Edge Function e não movimenta dinheiro.
