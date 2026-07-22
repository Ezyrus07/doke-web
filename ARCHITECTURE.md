# Doke — Estrutura ideal de produto e engenharia

Este arquivo define a direção estrutural para o Doke evoluir de site estático para uma plataforma escalável.

## Regra principal
Nenhuma página deve redesenhar componentes globais. Páginas montam conteúdo; componentes globais controlam aparência, comportamento e acessibilidade.

## Camadas
1. `assets/` — código atual em produção estática.
2. `src/` — estrutura-alvo para migração gradual para aplicação modular.
3. `backend/` — estrutura-alvo de domínio/API/workers.
4. `supabase/` — banco, policies, migrations e seeds.
5. `tests/` — testes unitários, integração, e2e, visuais e acessibilidade.
6. `docs/` — decisões, contratos, governança e playbooks.

## Estratégia
- Primeiro estabilizar visual e componentes.
- Depois migrar lógica por feature.
- Depois trocar páginas estáticas por rotas/componentes.
- Depois escalar backend, busca, pagamentos, moderação e observabilidade.

## Operação interna de eventos de pedidos
- A UI administrativa consome somente a Edge Function `order-event-operations`.
- A Edge Function valida JWT, sessão e papel `support/admin`; o browser nunca acessa tabelas privadas.
- RPCs operacionais são executáveis apenas por `service_role` e revalidam o ator no banco.
- Reprocessamentos aceitam somente `failed/dead_letter`, exigem justificativa e geram trilha de auditoria.
- O worker e o painel permanecem desacoplados: remover a UI não interrompe o consumo automático do outbox.



## Alertas operacionais de pedidos
- O avaliador `private.evaluate_order_operational_alerts` é a autoridade de detecção e resolução de incidentes do worker.
- Os incidentes são deduplicados por `alert_key`, possuem ciclo de reabertura e janela de silêncio por tipo.
- Apenas projeções de notificação são gravadas em `public.notifications`; o estado operacional permanece no schema `private`.
- O cron `doke-order-operational-alerts` avalia a saúde a cada cinco minutos sem depender de uma página aberta.
- O painel recebe alertas somente pela Edge Function `order-event-operations`; o browser não acessa tabelas ou funções privadas.

## Workflow operacional de incidentes de pedidos
- O detector continua sendo a única autoridade para abrir, reabrir e resolver um incidente; operadores não encerram manualmente um sinal ativo.
- `private.order_operational_alerts` mantém o estado atual do ciclo, responsável, reconhecimento e SLA.
- `private.order_operational_incident_actions` é o ledger imutável de ações automáticas e humanas.
- Suporte pode assumir e anotar; somente administração pode atribuir a outro operador ativo.
- O cron `doke-order-incident-escalation` avalia SLAs a cada cinco minutos e notifica somente administradores.
- Reabertura inicia novo ciclo e limpa estado humano sem apagar o histórico anterior.
- A Edge Function `order-event-operations` é a única superfície HTTP; RPCs permanecem executáveis apenas por `service_role`.
- Estados transitórios recentes do `pg_cron` (`connecting`, `sending`, `running`) são saudáveis até o limite de três minutos.

## Pós-incidente e SLOs da operação de pedidos
- O ledger `private.order_operational_incident_actions` projeta ciclos em `private.order_operational_incident_cycles`; métricas não dependem da UI.
- Cada ciclo resolvido cria automaticamente um rascunho em `private.order_operational_post_incident_reviews`.
- A conclusão exige causa, impacto, detecção, prevenção, aprendizado e ao menos uma ação preventiva com responsável e prazo.
- Ações preventivas ficam em `private.order_operational_prevention_actions` e permanecem executáveis após a conclusão do postmortem.
- SLOs e snapshots periódicos ficam em `private.order_operational_slo_targets` e `private.order_operational_slo_reports`.
- O cron `doke-order-slo-daily-report` gera relatórios de 7 e 30 dias sem depender do navegador.
- A Edge Function `order-event-operations` continua sendo a única superfície HTTP; as RPCs são restritas a `service_role`.


## Error budgets e proteção de mudanças
- `private.calculate_order_operational_error_budget` mede disponibilidade, entrega, MTTA e MTTR em janelas de 1h, 6h, 24h e 30d.
- O estado operacional canônico é `healthy`, `warning`, `restricted` ou `frozen`; burn rate e incidentes críticos determinam a transição.
- Deploys, migrations, Edge Functions, configurações e feature flags são registrados em `private.order_operational_changes` com tipo e risco explícitos.
- A matriz risco × estado produz `allow`, `approval_required` ou `hard_block`; apenas a decisão intermediária aceita override administrativo temporário.
- Overrides possuem justificativa, validade máxima, vínculo ao estado concedido e consumo único na execução.
- `private.order_operational_change_decisions` é o ledger imutável das avaliações, aprovações, bloqueios, execuções e correlações.
- Incidentes abertos em até duas horas após uma mudança são correlacionados automaticamente, sem afirmar causalidade definitiva.
- O cron `doke-order-change-protection` recalcula budgets, expira overrides e libera automaticamente mudanças quando a confiabilidade se recupera.
- A RPC `consume_order_operational_change_gate_internal` é a fronteira server-side para pipelines; o browser continua restrito à Edge Function autenticada.
