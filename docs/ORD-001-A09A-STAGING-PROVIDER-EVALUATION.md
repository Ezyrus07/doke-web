# ORD-001-A09A — avaliação do provedor de staging

## Status

`recommendation_complete_selection_pending_explicit_decision`

Este sublote compara provedores externos compatíveis com o runtime Node preparado em ORD-A08. Ele não cria infraestrutura, não vincula billing, não configura secrets e não executa deploy.

O comando genérico `próximo` não representa seleção de provedor.

## Contexto técnico

O entrypoint atual é:

```bash
npm run serve:staging-api-runtime
```

O runtime:

- executa um servidor Node HTTP persistente;
- usa `PORT` quando fornecido;
- expõe `GET /health` com identidade de release;
- exige ambiente de staging;
- bloqueia produção;
- depende de variáveis server-side do Supabase;
- precisa de rollback determinístico antes de receber tráfego.

## Critérios e pesos

| Critério | Peso |
| --- | ---: |
| Compatibilidade com o runtime Node atual | 25% |
| Simplicidade operacional | 20% |
| Deploy e rollback determinísticos | 20% |
| Controle de custo para staging | 15% |
| Latência para usuários brasileiros | 10% |
| Logs e observabilidade | 10% |

## Resultado

| Posição | Provedor | Nota ponderada | Decisão recomendada |
| ---: | --- | ---: | --- |
| 1 | Railway | 4,45/5 | Recomendado para o staging inicial |
| 2 | Fly.io | 4,20/5 | Candidato preferencial para baixa latência futura |
| 3 | Render | 3,95/5 | Alternativa aceitável de preview |
| 4 | Vercel | 3,80/5 | Adiar para o backend de staging |

## 1. Railway

### Pontos fortes

- Executa diretamente serviços Node persistentes.
- Integra repositório Git e healthcheck de ativação.
- Possui API de deployments para consultar versão ativa, logs, iniciar deploy e executar rollback.
- O plano Hobby inicia em USD 5 por mês, e o valor da assinatura é convertido em uso de recursos.
- Exige menos arquivos e menos operação de infraestrutura que Fly.io.

### Limitações

- A lista oficial atual não inclui região no Brasil.
- Para o staging da Doke, a região recomendada seria Virginia, Estados Unidos.
- O healthcheck de deploy não substitui monitoramento contínuo.

### Leitura arquitetural

Para o primeiro staging externo, a simplicidade operacional tem prioridade sobre alguns milissegundos de latência. O ambiente será usado por desenvolvimento e canários controlados, não por usuários públicos em escala.

## 2. Fly.io

### Pontos fortes

- Possui região `gru` em São Paulo.
- Permite Machines pequenas com cobrança por uso.
- Suporta checks contínuos e estratégias rolling, canary e blue-green.
- Oferece controle explícito de região, runtime e ciclo de vida.

### Limitações

- Exige `fly.toml`, construção de imagem e maior domínio operacional.
- A equipe passa a controlar Machines, estratégias e capacidade regional.
- Organizações novas exigem cartão cadastrado.

### Leitura arquitetural

É o melhor candidato para uma futura API de produção sensível a latência no Brasil. Para o staging atual, acrescenta complexidade antes de ela ser necessária.

## 3. Render

### Pontos fortes

- Web services Node nativos com integração Git.
- Health checks, deploy sem interrupção e rollback.
- Opção gratuita adequada para experimentação.

### Limitações

- Não possui região na América do Sul na lista oficial atual.
- O serviço gratuito adormece após 15 minutos sem tráfego e pode demorar aproximadamente um minuto para despertar.
- Logs HTTP detalhados e métricas de latência são recursos de Pro ou superior.

### Leitura arquitetural

É simples, mas o cold start gratuito prejudica canários determinísticos. Em plano pago, perde parte da vantagem econômica diante do Railway.

## 4. Vercel

### Pontos fortes

- Fluxo Git, previews e rollback maduros.
- Região de São Paulo disponível em infraestrutura gerenciada do plano Pro.
- Suporte zero-config para servidores Node foi anunciado em junho de 2026.

### Limitações

- O suporte geral a servidores Node é recente.
- A região de São Paulo exige Pro.
- O runtime atual da Doke se encaixa de forma mais direta em uma plataforma de serviço persistente.

### Leitura arquitetural

A Vercel continua muito relevante para o frontend e poderá ser reavaliada quando a estratégia de publicação web for formalizada. Ela não é a recomendação atual para o backend de staging.

## Recomendação

**Railway para o staging externo inicial.**

A recomendação é limitada ao staging. Ela não define o provedor futuro de produção.

Justificativa:

1. menor carga operacional;
2. compatibilidade direta com o servidor Node existente;
3. healthcheck e `PORT` compatíveis com ORD-A08;
4. deploy e rollback acessíveis por API;
5. custo inicial previsível;
6. migração futura possível porque o contrato A08 é agnóstico de plataforma.

## Gate de seleção

A recomendação não é binding.

A seleção somente poderá avançar após a decisão explícita:

```txt
I_EXPLICITLY_SELECT_RAILWAY_FOR_DOKE_STAGING
```

Mesmo após essa frase, o próximo sublote será apenas o adapter e o `--check-env`. A criação de projeto, inclusão de billing, secrets e deploy continuará separada e fail-closed.

## Próximo sublote após seleção

`ORD-A09B — Railway provider adapter`:

1. criar configuração de serviço sem secrets;
2. exigir `DOKE_ENVIRONMENT=staging`;
3. usar `npm run serve:staging-api-runtime`;
4. vincular `GET /health` como healthcheck;
5. definir região e domínio de staging;
6. mapear release ID, revisão e rollback ID;
7. criar comandos de deploy, status e rollback;
8. executar somente dry-run e check-env;
9. manter deploy bloqueado até autorização separada.

## Fontes oficiais consultadas

- Railway: pricing, regions, healthchecks e deployment API.
- Fly.io: pricing, regions e deployment strategies.
- Render: web services, regions, free services e plan features.
- Vercel: Node servers, rollback e regional pricing de São Paulo.

Data da avaliação: 30 de julho de 2026.
