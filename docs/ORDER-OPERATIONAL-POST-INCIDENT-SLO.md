# Operação de pedidos — pós-incidente e SLOs

## Objetivo

Transformar cada ciclo operacional resolvido em aprendizado estruturado, ação preventiva com responsável e prazo, e métricas históricas de confiabilidade.

## Autoridades

- `private.order_operational_incident_actions`: ledger imutável de abertura, reconhecimento, escalonamento e resolução.
- `private.order_operational_incident_cycles`: projeção temporal por incidente e ciclo.
- `private.order_operational_post_incident_reviews`: análise estruturada de causa, impacto, detecção, prevenção e aprendizados.
- `private.order_operational_prevention_actions`: plano preventivo com responsável, prazo e estado.
- `private.order_operational_slo_targets`: metas operacionais versionáveis.
- `private.order_operational_slo_reports`: snapshots diários de 7 e 30 dias.
- Edge Function `order-event-operations` v7: única superfície HTTP para o painel. A versão mescla o contrato detalhado `postIncident` com o módulo paralelo opcional `operationalSlos`, sem tornar uma dependência obrigatória do outro.

O navegador não lê nem grava tabelas privadas e não recebe `service_role`.

## Ciclo pós-incidente

1. O detector resolve o alerta automaticamente.
2. O ledger produz o evento `resolved_auto`.
3. A projeção fecha o ciclo, calcula MTTR e cria um rascunho pós-incidente.
4. Suporte ou administração documenta o rascunho.
5. Uma ação preventiva deve possuir responsável ativo e prazo.
6. Somente administração conclui ou reabre a análise.
7. Ações preventivas continuam executáveis depois da conclusão da análise.

## Requisitos para concluir

- categoria de causa diferente de `unknown`;
- impacto com pelo menos 20 caracteres;
- causa raiz com pelo menos 20 caracteres;
- avaliação de detecção com pelo menos 10 caracteres;
- prevenção com pelo menos 20 caracteres;
- aprendizado com pelo menos 10 caracteres;
- ao menos uma ação preventiva não cancelada e com prazo.

Fatores contribuintes devem ser um array de até 12 textos, cada um entre 3 e 300 caracteres.

## Métricas

- disponibilidade do worker;
- MTTA médio e p95;
- MTTR médio e p95;
- MTTA/MTTR por severidade;
- taxa de conclusão de análises pós-incidente;
- ações preventivas abertas e vencidas.

Snapshots históricos antigos em `connecting`, `sending` ou `running` sem `start_time` são tratados como transições de inicialização, não como indisponibilidade, desde que esse seja o único sinal crítico daquela avaliação.

## Metas iniciais de 30 dias

| Métrica | Meta |
|---|---:|
| Disponibilidade do worker | ≥ 99,9% |
| MTTA crítico | ≤ 10 min |
| MTTA de atenção | ≤ 30 min |
| MTTR crítico | ≤ 40 min |
| MTTR de atenção | ≤ 150 min |
| Análises pós-incidente concluídas | ≥ 90% |
| Ações preventivas vencidas | 0 |

Metas sem amostra suficiente retornam `no_data`; elas não são marcadas artificialmente como cumpridas.

## Relatórios

O cron `doke-order-slo-daily-report` executa diariamente às 03:15 UTC, equivalente a 00:15 em `America/Bahia`, e atualiza os snapshots de 7 e 30 dias.

## Permissões

As três RPCs são executáveis apenas por `service_role` e revalidam um ator ativo de `support/admin`:

- `get_order_operational_post_incident_internal`;
- `mutate_order_operational_post_incident_internal`;
- `mutate_order_operational_prevention_action_internal`.

Somente administradores podem concluir/reabrir análises, atribuir ações a terceiros ou cancelar ações preventivas. Suporte pode editar rascunhos e administrar ações de sua própria responsabilidade.

## Teste contratual

```bash
npm run test:order-post-incident-slo-contract
```


## Compatibilidade com módulo paralelo

Durante a publicação, o staging recebeu concorrentemente o módulo `order_operational_postmortems_slos`, que expõe `operationalSlos` e `postmortem_update`. A Edge Function v7 preserva esse contrato e, simultaneamente, mantém:

- `postIncident`;
- `post_incident_update`;
- `prevention_action_update`.

A leitura de `operationalSlos` é opcional: em uma instalação que não possua a RPC paralela, o dashboard continua funcional com o contrato pós-incidente principal.
