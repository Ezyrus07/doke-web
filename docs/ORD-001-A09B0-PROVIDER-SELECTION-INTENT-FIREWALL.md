# ORD-A09B0 — Provider Selection Intent Firewall

## Objetivo

Impedir que comandos genéricos ou interpretações aproximadas selecionem um provedor externo para o staging da Doke.

O firewall opera em modo fail-closed. Ele não cria conta, projeto, cobrança, infraestrutura, secrets, manifest, deploy ou mudança em produção.

## Estado atual

Railway continua apenas recomendado. O provedor não está selecionado nem vinculado.

A frase obrigatória permanece:

`I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING`

O comando `próximo`, `proximo`, `pode prosseguir`, `continue` ou qualquer paráfrase não autoriza seleção.

## Correspondência literal

A validação é:

- exata;
- sensível a maiúsculas e minúsculas;
- restrita ao ambiente `staging`;
- restrita ao provider `railway`;
- sem tradução automática;
- sem tolerância a pontuação extra;
- sem equivalência semântica;
- sem persistência automática.

Portanto, estas entradas falham:

- `I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING.`;
- `i_explicitly_select_railway_for_doke_staging`;
- `Eu seleciono Railway para staging`;
- `próximo`;
- qualquer tentativa em `production`.

## Efeito permitido da frase exata

A frase exata pode autorizar somente uma avaliação local e efêmera para preparar o adapter específico sem secrets.

Mesmo nesse caso:

- a seleção canônica não é persistida;
- o adapter continua não vinculado;
- conta e billing continuam não autorizados;
- secrets continuam não autorizados;
- infraestrutura continua não autorizada;
- status remoto continua não autorizado;
- deploy e rollback continuam não autorizados;
- o canário visual continua não autorizado;
- produção continua bloqueada.

## Comportamento técnico

`evaluateSelectionIntent()` devolve uma decisão imutável.

Quando a entrada não corresponde exatamente, o resultado é `selection_intent_rejected_fail_closed`.

Quando a frase exata é validada em staging, o resultado é `exact_selection_intent_validated_adapter_preparation_only`, mas os blockers seguintes permanecem:

- `provider_specific_adapter_required`;
- `separate_account_and_billing_decision_required`;
- `separate_deployment_authorization_required`.

`assertAdapterPreparationAuthorized()` falha com:

- código `DOKE_PROVIDER_SELECTION_INTENT_REJECTED`;
- HTTP 428.

## Evidência operacional

Neste sublote:

- zero requisições de rede;
- zero chamadas Railway;
- zero contas ou projetos externos;
- zero secrets;
- zero manifests de provedor;
- zero mutações de staging;
- zero deploys;
- produção intocada.

## Próximo gate

O próximo passo operacional continua bloqueado até a frase exata ser enviada pelo usuário.

Depois dela, o escopo permitido será apenas `ORD-A09B — Railway provider adapter` sem secrets, com dry-run e check-env local. Billing, infraestrutura e deploy continuarão sujeitos a autorizações separadas.
