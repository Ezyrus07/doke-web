# Runbooks de remediação operacional dos pedidos

## Objetivo

Este contrato define as únicas remediações automáticas que podem ser iniciadas pelo painel `admin-pedidos-operacao.html`. O painel não aceita SQL, nomes de função ou ações arbitrárias fornecidas pelo navegador.

## Autoridade

- Catálogo e regras: `private.order_operational_runbook_descriptor`.
- Prévia e impacto: `public.preview_order_operational_runbook_internal`.
- Execução e verificação: `public.execute_order_operational_runbook_internal`.
- Auditoria: `private.order_operational_runbook_executions`.
- Transporte autenticado: Edge Function `order-event-operations` com JWT obrigatório.

O navegador recebe apenas a projeção necessária e nunca recebe `service_role`, chave secreta, acesso às tabelas privadas ou capacidade de escolher uma função SQL.

## Prévia obrigatória

Toda execução exige uma prévia criada no servidor. A prévia:

1. registra o operador, papel, incidente e ciclo;
2. calcula o impacto atual;
3. gera um token aleatório e armazena somente seu resumo SHA-256;
4. gera uma frase de confirmação específica;
5. expira após dez minutos;
6. é invalidada depois de uma execução;
7. é revalidada antes de qualquer ação elevada;
8. calcula um resumo SHA-256 do impacto para detectar mudanças entre prévia e execução.

Abrir a prévia no painel não executa a remediação. A execução só ocorre depois do envio da frase exata, justificativa e, quando aplicável, seleção do evento.

Runbooks de risco elevado exigem conta `admin`, justificativa com ao menos dez caracteres e a frase `EXECUTAR <código>` digitada exatamente.

## Catálogo fechado

### `dead_letter_recovery`

- Sinal: `dead_letter`.
- Risco: elevado.
- Executor: administrador.
- Impacto: um evento selecionado por execução.
- Ação: usa o reprocessamento canônico, preserva auditoria e aciona o worker em melhor esforço.
- Verificação: o evento selecionado não pode continuar em `dead_letter`.

### `stale_claim_recovery`

- Sinal: `stale_claim`.
- Risco: elevado.
- Executor: administrador.
- Impacto: claims em `processing` há mais de cinco minutos.
- Ação: usa `private.recover_stale_order_event_claims(300)`.
- Verificação: o número de claims travados deve cair ou chegar a zero.

### `cron_health_recovery`

- Sinal: `cron_inactive`.
- Risco: baixo.
- Executor: suporte ou administrador.
- Ação: valida os três crons, solicita o worker quando houver trabalho e reavalia a saúde.
- Verificação: cron ativo e estado recente permitido.

### `retry_backlog_recovery`

- Sinal: `retry_backlog`.
- Risco: baixo.
- Executor: suporte ou administrador.
- Ação: solicita o worker sem modificar payload, limite ou quantidade de tentativas.
- Verificação: solicitação criada ou inexistência de eventos entregáveis.

### `success_rate_diagnostic`

- Sinal: `success_rate_degraded`.
- Risco: baixo.
- Executor: suporte ou administrador.
- Ação: registra diagnóstico, solicita o worker quando necessário e reavalia os sinais.
- Verificação: execução registrada; a recuperação permanece sob observação automática porque a taxa depende de nova amostra.

## Estados de auditoria

```text
previewed
executing
succeeded
verification_failed
failed
expired
```

A auditoria inclui impacto, operador, justificativa, evento selecionado, resultado, verificação, erro estável e horários.

## Regras de contenção

- Nenhuma resolução manual do incidente.
- Nenhuma exclusão de evento.
- Nenhuma alteração de payload.
- Nenhum aumento em lote de tentativas.
- Nenhuma execução sem incidente aberto no mesmo ciclo.
- Nenhuma execução elevada quando o impacto mudou desde a prévia.
- Nenhuma reutilização de token ou prévia.
- Nenhuma ação externa paga.

## Validação mínima

```bash
npm run test:order-operational-runbooks-contract
npm run test:order-event-operations-runtime
npm run test:order-incident-escalation-contract
npm run test:order-operational-alerts-contract
npm run test:order-event-operations-contract
```

No staging, validar também permissões das RPCs, expiração, frase incorreta, suporte bloqueado em ação elevada, prévia obsoleta, execução positiva, resumos SHA-256 e ausência de resíduos do canário.

## Migrations

- `074_order_operational_remediation_runbooks.sql`: catálogo, prévia, execução, verificação e auditoria.
- `075_order_operational_remediation_hash_hardening.sql`: substitui resumos legados por SHA-256 no token e na fotografia de impacto.
