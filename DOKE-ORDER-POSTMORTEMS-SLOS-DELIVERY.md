# Doke — Pós-incidente e SLOs operacionais

## Objetivo
Materializar automaticamente a linha do tempo de incidentes resolvidos, calcular MTTA/MTTR sem entrada manual e permitir análise humana de causa raiz, impacto e prevenção.

## Autoridade
- `private.order_operational_postmortems`: registro privado por incidente e ciclo.
- Trigger `trg_materialize_order_operational_postmortem`: cria o registro ao resolver o incidente.
- `get_order_operational_slos_internal`: projeção privada de SLOs.
- `mutate_order_operational_postmortem_internal`: edição controlada; conclusão restrita a admin.
- Edge Function `order-event-operations` v6: única superfície HTTP autenticada.

## SLOs
- Reconhecimento crítico: 10 min.
- Reconhecimento warning: 30 min.
- Recuperação crítica: 60 min.
- Recuperação warning: 4 h.
- Janela padrão: 30 dias, configurável entre 7 e 90 dias.

## Métricas
- MTTA médio.
- MTTR médio.
- P95 de MTTR.
- Cumprimento do SLO de reconhecimento.
- Cumprimento do SLO de recuperação.
- Pós-incidentes em rascunho/concluídos.
- Recorrências por tipo de alerta.

## Segurança
`anon` e `authenticated` não executam as RPCs. Apenas `service_role`; o papel real é validado novamente pela Edge Function e pela função `assert_order_event_operator`.

## Validação
Contratos locais de pós-incidente, painel, runtime, alertas e runbooks passaram. A projeção remota confirmou tabela, trigger, zero resíduos e permissões corretas. O canário remoto com escrita foi bloqueado pela proteção da ferramenta antes de inserir dados. A renderização Chromium não foi executada porque o binário não está instalado.

## Reversão
Desativar a superfície removendo `operationalSlos` e `postmortem_update` da Edge Function/painel. Para reversão de banco, remover trigger, RPCs e tabela somente após exportar análises existentes.
