# DOKE — Plano Mestre de Conclusão da Plataforma

**Versão:** 1.0  
**Data-base:** 21 de julho de 2026  
**Base técnica oficial:** `doke-web-order-post-incident-slo-cumulative.zip`

---

## 1. Propósito deste documento

Este documento é a fonte única de verdade para terminar a lógica da Doke de forma profissional, segura e escalável. Ele não representa uma lista de melhorias visuais nem um cronograma superficial. Representa a sequência obrigatória de construção de uma plataforma de marketplace, comunidade, comunicação, pagamentos e operação capaz de receber usuários reais.

A Doke não será considerada concluída porque todas as páginas “abrem” ou porque um fluxo funciona em `localStorage`. A conclusão da lógica V1 exige que os fluxos críticos funcionem com identidade real, dados persistentes, autorização no servidor, consistência transacional, observabilidade, testes, rollback e operação humana possível.

A plataforma continuará evoluindo depois do lançamento. Portanto, “terminar” significa atingir três marcos verificáveis:

1. **Core transacional completo em staging:** os principais fluxos funcionam ponta a ponta com backend real.
2. **Beta fechado operável:** usuários reais podem usar a Doke em uma região controlada, com suporte, segurança e rollback.
3. **Lançamento público regional:** produto, operação, pagamentos, confiança e infraestrutura suportam crescimento real.

---

## 2. Princípios inegociáveis

### 2.1 Nenhuma etapa será pulada

Uma fase só pode ser marcada como concluída quando seu gate de saída tiver evidência técnica. “Parece funcionar” não é aceite.

### 2.2 Uma única base oficial

Toda nova etapa parte do ZIP cumulativo mais recente. Cada entrega deve gerar:

- ZIP cumulativo completo;
- ZIP apenas com os arquivos alterados;
- relatório técnico acumulativo;
- evidências de testes;
- checksums;
- próximo passo atualizado.

### 2.3 Causa raiz, não remendo

Continuam proibidos:

- arquivos `fix`, `hotfix`, `final`, `rescue`, `adjustment` ou equivalentes;
- CSS com `!important` novo sem justificativa excepcional;
- `style` inline;
- JavaScript usado para corrigir CSS;
- duplicação de componentes, repositories, services ou renderers;
- alteração global para resolver problema local;
- escrita direta no banco pelo navegador quando a regra exige servidor;
- `service_role` no frontend;
- mocks silenciosos em caminhos de produção.

### 2.4 Autoridade única por domínio

Cada entidade deve ter uma única autoridade para estado e escrita. Exemplo:

```text
Página → Controller → Service/Repository → API/Edge Function → RPC/Database
```

Não pode existir uma lógica de pedido em `pedidos.js`, outra em `mensagens.js` e outra no banco com regras divergentes.

### 2.5 Segurança antes de ativar usuários e dinheiro reais

Nenhuma funcionalidade com dados pessoais, pagamento, saque, moderação ou administração será promovida para produção sem:

- RLS ou fronteira server-side equivalente;
- teste negativo de permissão;
- idempotência;
- auditoria;
- rate limit;
- rollback;
- segredo fora do cliente.

### 2.6 O produto não será sobrecarregado antes de validar o núcleo

Recursos como IA ampla, expansão nacional, múltiplos processadores de pagamento, programa complexo de pontos, delivery de produtos, microserviços e infraestrutura multi-região ficam fora do Core V1. Eles entram somente depois de liquidez, retenção, confiança e economia unitária comprovadas.

---

## 3. Estado atual real da Doke

### 3.1 Fundação avançada

A Doke já possui uma base relevante:

- arquitetura visual e governança de frontend;
- shell, header, sidebar, componentes, cards e responsividade amplamente trabalhados;
- Supabase de staging e trilha de migrations;
- contratos de dados e auditorias extensas;
- catálogo, moderação de serviços e templates de orçamento parcialmente estruturados;
- máquina de estados canônica de pedidos;
- eventos transacionais de pedidos;
- worker/outbox;
- painel operacional;
- alertas, escalonamento e runbooks;
- pós-incidente e SLOs;
- ledger financeiro e estrutura de carteira/disputa parcialmente preparados;
- comunidade com lógica frontend/local avançada;
- testes, runbooks e gates de beta já iniciados.

### 3.2 Áreas parcialmente concluídas

Ainda precisam de fechamento e integração real:

- autenticação, identidade e sessão em todos os fluxos;
- perfis e onboarding profissional;
- catálogo e publicação de serviços ponta a ponta;
- busca, filtros e elegibilidade de resultados;
- orçamento, aceite, proposta, agenda e conclusão;
- mensagens e notificações remotas entre dispositivos;
- pagamentos, webhooks, conciliação, saldo e saque reais;
- cancelamentos, reembolsos, disputas e chargebacks;
- avaliações e reputação;
- comunidade com backend, realtime, anexos e autorização real;
- moderação e suporte integrados;
- analytics de produto e economia do marketplace;
- apps móveis e lançamento nas lojas.

### 3.3 Bloqueadores de produção conhecidos

- tabelas públicas antigas ainda apresentam dívida de RLS;
- funções `SECURITY DEFINER` antigas possuem permissões amplas em alguns domínios;
- existem caminhos que ainda dependem de mock ou `localStorage`;
- não existe integração final com PSP e webhooks financeiros reais;
- realtime multiusuário ainda não está fechado em todos os domínios;
- a validação E2E real de todo o ciclo transacional ainda não está consolidada;
- documentação histórica e contratos paralelos precisam de reconciliação contínua;
- o beta real ainda não passou por go/no-go humano com usuários reais.

Conclusão honesta: a Doke tem uma fundação de engenharia muito acima de um protótipo comum, mas ainda está mais próxima de uma **plataforma tecnicamente preparada para fechamento do core** do que de uma operação pública pronta.

---

## 4. Regra universal de “pronto” para qualquer funcionalidade

Nenhuma funcionalidade é concluída sem passar pelos dez itens abaixo:

1. **Regra de negócio definida:** estados, atores, permissões e exceções.
2. **Modelo de dados definido:** tabelas, chaves, constraints, índices e retenção.
3. **Autoridade server-side:** escrita protegida e regra não duplicada no cliente.
4. **Idempotência e concorrência:** cliques repetidos, retries e duas abas não corrompem estado.
5. **Permissões testadas:** casos permitidos e proibidos por persona.
6. **Estados de interface:** loading, vazio, erro, offline, sucesso e retry.
7. **Auditoria e observabilidade:** evento, ator, horário, correlação e métricas.
8. **Testes:** contrato, runtime, integração e E2E real.
9. **Responsividade e acessibilidade:** viewports-alvo, teclado, foco e leitores de tela.
10. **Rollback e documentação:** como desativar, reverter e operar.

---

# PARTE I — FUNDAÇÃO DE PRODUÇÃO

## Fase 0 — Comando central, inventário e governança

### Objetivo

Eliminar perda de contexto e impedir que áreas paralelas sejam alteradas sem coordenação.

### Entregas obrigatórias

- transformar este plano em documento vivo dentro do projeto;
- criar uma matriz única de domínios, páginas, services, RPCs, tabelas e testes;
- classificar cada fluxo como `mock`, `local`, `staging real`, `beta` ou `produção`;
- identificar contratos paralelos e escolher a autoridade canônica;
- mapear código legado, candidatos a remoção e dependências;
- registrar ADRs para decisões irreversíveis;
- criar IDs estáveis para backlog e lotes;
- estabelecer changelog técnico e product changelog;
- definir owners de domínio, mesmo que inicialmente Gabriel acumule mais de um papel;
- configurar branch/release policy e origem autorizada para migrations.

### Estado atual — 2026-07-22

- matriz machine-readable criada em `config/domain-completion-matrix.json`;
- documento vivo gerado em `docs/DOMAIN-COMPLETION-MATRIX.md`;
- snapshot do staging registrado em `docs/validation/domain-completion-staging-snapshot.json`;
- auditoria de drift disponível em `npm run audit:domain-completion-matrix`;
- 23 domínios e 15 fluxos críticos classificados;
- próximo gate obrigatório: `SEC-001` — segurança, RLS, grants e autoridade dos dados.

### Gate de saída

Toda página ativa, endpoint, tabela e fluxo crítico aparece na matriz, com autoridade, estado atual, dependências e teste associado. O inventário inicial está materializado; a Fase 0 permanece como governança contínua e não como justificativa para adiar a Fase 1.

---

## Fase 1 — Segurança, permissões e autoridade dos dados

### Objetivo

Fechar a superfície exposta antes de ampliar escrita real e uso por pessoas externas.

### Entregas obrigatórias

- inventário completo de tabelas no schema público;
- ativação e validação de RLS em todas as tabelas expostas que exigem proteção;
- políticas por persona: cliente, profissional, suporte, moderador, admin e sistema;
- revisão de todas as funções `SECURITY DEFINER`;
- revogação de `anon` e `authenticated` onde a chamada deve ser apenas server-side;
- remoção de `service_role` de qualquer bundle ou configuração pública;
- rotação e governança de chaves e segredos;
- rate limiting por endpoint e ação crítica;
- validação de CORS, CSP e headers de segurança;
- proteção contra abuso, enumeração, upload malicioso e payload excessivo;
- política de backup, restore e teste de recuperação;
- auditoria de dependências e secrets;
- trilha de auditoria para ações administrativas e financeiras.

### Estado atual — lote SEC-001/1 concluído em 2026-07-22

- `users` possui leitura apenas da própria conta para `authenticated`, sem acesso de `anon` e sem DML direto do navegador;
- `user_profiles` possui leitura pública explícita e escrita somente por RPC controlada;
- novas contas sempre nascem como `client`;
- `user_metadata` não participa mais da autorização e suas chaves de papel/status foram removidas;
- `app_metadata` é sincronizado no servidor a partir de `public.users`;
- RPCs de identidade e KYC deixaram de ser executáveis por `anon`;
- canários de cliente, administrador e falsificação de papel passaram;
- exposição `SECURITY DEFINER` caiu de 36 para 18 funções em `anon` e de 45 para 38 em `authenticated`.

### Gate de saída

- nenhum erro crítico novo nos advisors de segurança;
- testes negativos confirmam que um usuário não lê ou altera dados de outro;
- `anon` não executa RPCs internas;
- restore de staging testado;
- secrets scan zerado.

### Prioridade imediata

O próximo lote fecha `client_profiles`, perfis profissionais, verificações e `verification_events`, seguido pelas RPCs financeiras e administrativas restantes.

---

## Fase 2 — Jurídico, privacidade e regras comerciais

### Objetivo

Garantir que a arquitetura técnica implemente regras comerciais e legais reais, não suposições.

### Entregas obrigatórias

- definição jurídica do papel da Doke entre cliente e profissional;
- Termos de Uso, Política de Privacidade e Política de Comunidade;
- regras de cancelamento, reembolso, disputa e chargeback;
- definição de taxa, comissão, repasse e responsabilidade tributária;
- análise de retenção ou intermediação de valores com PSP e assessoria especializada;
- regras de KYC e verificação profissional;
- mapa de dados pessoais e bases de tratamento;
- consentimento, exportação, correção e exclusão de conta;
- política de retenção e anonimização;
- proteção de menores e categorias proibidas/restritas;
- regras de conteúdo, denúncias, sanções e recurso;
- definição de documentos fiscais e conciliação contábil.

### Gate de saída

As regras críticas de código possuem uma política comercial/jurídica aprovada. Nenhum pagamento real é ativado antes deste gate.

---

## Fase 3 — Identidade, autenticação, sessão e confiança

### Objetivo

Construir uma identidade consistente que acompanhe o usuário em todos os dispositivos e fluxos.

### Entregas obrigatórias

- cadastro e login reais;
- verificação de contato;
- recuperação de conta;
- sessão persistente e renovação segura;
- gestão de dispositivos/sessões;
- logout global quando necessário;
- materialização confiável de `users`, `user_profiles`, `client_profiles` e `professional_profiles`;
- roles e status de conta centralizados;
- onboarding de cliente;
- onboarding de profissional;
- verificação de identidade e documentos;
- revisão administrativa de KYC;
- estados `active`, `pending`, `restricted`, `suspended` e `deleted` com regras claras;
- bloqueio entre usuários;
- exclusão, exportação e anonimização;
- deep links de autenticação e retorno ao fluxo interrompido.

### Gate de saída

Um usuário novo consegue criar conta, completar perfil, tornar-se profissional, ser verificado e acessar apenas os recursos permitidos, em duas sessões/dispositivos diferentes.

---

# PARTE II — NÚCLEO DO MARKETPLACE

## Fase 4 — Oferta profissional e ciclo de vida do serviço

### Objetivo

Permitir que a oferta da Doke seja criada, revisada, publicada e mantida com qualidade.

### Entregas obrigatórias

- rascunho de serviço;
- categorias e subcategorias;
- área de atendimento;
- modalidades de preço;
- unidade, duração e disponibilidade;
- mídia e portfólio;
- perguntas e templates de orçamento;
- agenda e capacidade;
- validação automática;
- moderação humana;
- versionamento e histórico;
- publicação, pausa, arquivamento e exclusão;
- revisão de alterações relevantes;
- métricas por serviço;
- políticas contra duplicação, spam e conteúdo proibido.

### Gate de saída

Um profissional verificado cria um serviço, envia para revisão, recebe decisão, publica, altera uma versão e preserva o histórico sem quebrar pedidos existentes.

---

## Fase 5 — Descoberta, busca, ranking e detalhe do serviço

### Objetivo

Fazer o cliente encontrar uma oferta elegível e confiável.

### Entregas obrigatórias

- Home alimentada por dados reais;
- busca server-side;
- filtros por categoria, localização, disponibilidade, preço e reputação;
- paginação/cursor;
- detalhe do anúncio real;
- favoritos e histórico;
- elegibilidade por área e agenda;
- ordenação determinística inicial;
- tracking de impressões, cliques e conversão;
- empty/error/loading states reais;
- proteção contra resultados indisponíveis ou despublicados;
- SEO e URLs estáveis para páginas públicas;
- base de recomendação sem IA obrigatória no primeiro momento.

### Gate de saída

O mesmo conjunto de filtros retorna resultados coerentes no web e API, sem exibir serviço inelegível, suspenso ou fora de área.

---

## Fase 6 — Solicitação, orçamento, proposta, agenda e pedido

### Objetivo

Fechar o núcleo transacional do serviço contratado.

### Estado já construído

A máquina de estados, eventos transacionais, worker e operação de pedidos já estão avançados. Esta fase não recomeça do zero: ela conecta todos os pontos de entrada e saída à autoridade existente.

### Entregas obrigatórias

- formulário de orçamento baseado no serviço real;
- perguntas dinâmicas;
- endereço, data, janela e anexos;
- criação idempotente do pedido;
- aceite ou recusa profissional;
- proposta e contraproposta;
- preço, escopo e prazo versionados;
- agendamento e reagendamento;
- início do serviço;
- evidência de execução quando aplicável;
- conclusão por fluxo definido;
- cancelamento conforme estado e política;
- deep links entre pedido, conversa, pagamento e perfil;
- bloqueio de transições inválidas no servidor;
- concorrência otimista;
- timeline completa;
- eventos e notificações derivados da transição canônica.

### Gate de saída

E2E real:

```text
Cliente encontra serviço
→ solicita orçamento
→ profissional aceita
→ envia proposta
→ cliente aprova
→ agenda
→ inicia
→ conclui
```

Cada etapa deve funcionar em contas diferentes, dispositivos diferentes e sem atualização manual da página.

---

## Fase 7 — Mensagens, conversas e notificações

### Objetivo

Transformar mensagens em infraestrutura confiável do marketplace, e não em uma tela isolada.

### Entregas obrigatórias

- conversa vinculada ao pedido;
- regras para criação e desbloqueio da conversa;
- mensagens persistentes;
- realtime entre dispositivos;
- paginação e histórico;
- anexos e validação de mídia;
- respostas, edição e exclusão dentro da política;
- leitura, não lida e recibos;
- digitação e presença como recursos degradáveis;
- propostas, cobranças e eventos do pedido como cards estruturados;
- arquivamento, fixação, bloqueio e denúncia;
- notificações in-app derivadas de eventos;
- deduplicação e preferências;
- push e e-mail apenas para eventos elegíveis;
- retry e dead-letter para falhas de entrega;
- deep link para o contexto correto.

### Gate de saída

Duas contas em navegadores/dispositivos diferentes trocam mensagens em tempo real, recebem notificações sem refresh e não recebem duplicatas após retry.

---

## Fase 8 — Pagamentos, escrow, ledger, carteira e saques

### Objetivo

Movimentar dinheiro com consistência, conciliação e segurança.

### Estado já construído

Existe fundação de ledger, pagamentos, recebíveis, carteira e disputa. Ainda não existe fechamento com PSP e dinheiro real.

### Entregas obrigatórias

- escolha e contrato com PSP;
- criação server-side de cobrança/payment intent;
- tokenização no PSP, sem armazenar cartão na Doke;
- assinatura e validação de webhooks;
- idempotência por evento financeiro;
- estados de autorização, captura, falha, cancelamento e reembolso;
- comissão/take rate;
- modelo de retenção/repasse aprovado juridicamente;
- ledger financeiro autoritativo e reconciliável;
- recebível do profissional;
- saldo pendente, disponível, bloqueado e retirado;
- conciliação diária PSP × ledger;
- carteira e extrato reais;
- conta bancária/Pix validada;
- solicitação e decisão de saque;
- antifraude e limites;
- chargebacks;
- recibos e documentos;
- painel financeiro administrativo;
- modo sandbox e feature flag;
- rollback para desativar pagamentos sem perder pedidos.

### Gate de saída

Em sandbox do PSP:

```text
Pedido aprovado
→ pagamento autorizado/capturado
→ webhook validado
→ ledger lançado uma única vez
→ recebível criado
→ saldo liberado conforme regra
→ saque solicitado
→ conciliação fecha sem diferença
```

Nenhum centavo real entra antes deste gate.

---

## Fase 9 — Cancelamentos, reembolsos, disputas e proteção

### Objetivo

Resolver falhas e conflitos sem improviso administrativo.

### Entregas obrigatórias

- matriz de cancelamento por estado e ator;
- cálculo de multa/reembolso;
- cancelamento automático e manual;
- abertura de disputa;
- evidências, anexos e timeline;
- resposta da outra parte;
- mediação e decisão administrativa;
- reembolso total/parcial;
- bloqueio de saldo;
- chargeback e contestação;
- prevenção de fraude e abuso;
- sanções e restrições de conta;
- recurso/apelação;
- SLA de suporte;
- auditoria completa;
- métricas de disputa e perda financeira.

### Gate de saída

Cenários E2E cobrem cancelamento antes do aceite, após aceite, após pagamento, disputa, reembolso parcial e chargeback simulado.

---

## Fase 10 — Conclusão, avaliações, reputação e recorrência

### Objetivo

Gerar confiança e manter a contratação dentro da Doke.

### Entregas obrigatórias

- confirmação de conclusão;
- janela de contestação;
- avaliação apenas após pedido elegível;
- avaliação bilateral quando aplicável;
- critérios e subnotas;
- moderação de avaliações;
- detecção de fraude e manipulação;
- resposta do profissional;
- reputação calculada com regras transparentes;
- impacto de cancelamentos e disputas;
- conquistas/certificados verificados;
- botão de contratar novamente;
- pedido recorrente vinculado ao histórico;
- favoritos e profissionais salvos;
- incentivos de retenção;
- programa de pontos somente após modelagem financeira da obrigação gerada.

### Gate de saída

Um cliente conclui, avalia, encontra o histórico e contrata novamente o profissional por um novo pedido rastreável dentro da Doke.

---

# PARTE III — COMUNIDADE, CONTEÚDO E CONFIANÇA

## Fase 11 — Comunidades e social graph com backend real

### Objetivo

Migrar a lógica local já construída para uma experiência multiusuário real.

### Entregas obrigatórias

- criação e edição de comunidade;
- pública, privada e por código;
- solicitação, convite, aceite e saída;
- owner, administradores, moderadores e cargos;
- permissões por canal/cargo;
- membros e contadores reais;
- mensagens e posts persistentes;
- realtime remoto;
- respostas, reações, threads, fixados e busca;
- uploads persistentes;
- eventos e agenda;
- notificações;
- presença e digitação como recursos não críticos;
- slow mode, antispam e rate limits;
- silenciamento, expulsão, banimento e recurso;
- auditoria de moderação;
- sincronização entre dispositivos;
- migração segura dos dados locais descartáveis.

### Gate de saída

Três contas diferentes conseguem criar, entrar, conversar, moderar, receber notificações e manter estado consistente em dispositivos distintos.

---

## Fase 12 — Workers, publicações, mídia e moderação de conteúdo

### Objetivo

Fechar o conteúdo social e promocional sem criar risco de abuso.

### Entregas obrigatórias

- upload e processamento de imagem/vídeo;
- limites, formatos e varredura;
- Workers/reels;
- antes e depois;
- publicações e comentários;
- reações e compartilhamento interno;
- direitos autorais e consentimento de imagem;
- denúncia;
- fila de moderação;
- classificação de conteúdo;
- remoção, restauração e recurso;
- rate limit e antispam;
- auditoria e retenção;
- métricas de conteúdo;
- CDN/storage e política de exclusão.

### Gate de saída

Conteúdo publicado passa por regras, pode ser denunciado, moderado e removido sem deixar referências quebradas ou mídia órfã.

---

# PARTE IV — OPERAÇÃO, CONFIABILIDADE E DADOS

## Fase 13 — Administração, suporte e backoffice

### Objetivo

Permitir que a empresa opere a plataforma sem editar o banco manualmente.

### Entregas obrigatórias

- autenticação forte de operadores;
- papéis separados de suporte, moderador, financeiro e admin;
- painel de usuários;
- painel de profissionais/KYC;
- moderação de serviços;
- operação de pedidos;
- operação de pagamentos e saques;
- disputas;
- comunidades e conteúdo;
- ações com motivo obrigatório;
- dupla aprovação para ações financeiras de alto risco;
- histórico imutável;
- casos/tickets de suporte;
- pesquisa por IDs e correlação;
- ferramentas de correção controlada;
- exportação de evidências;
- runbooks por incidente;
- dashboard executivo e operacional.

### Gate de saída

Todo incidente comum pode ser investigado e tratado pelo painel, com permissão mínima e auditoria, sem SQL manual.

---

## Fase 14 — Observabilidade, SLOs, error budgets e proteção de mudanças

### Objetivo

Tornar a Doke operável e impedir que deploys agravem sistemas degradados.

### Estado já construído

No domínio de pedidos já existem worker, alertas, escalonamento, runbooks, pós-incidente, SLOs, error budgets multi-janela e proteção de mudanças por risco. O gate registra deploys/migrations/configurações, correlaciona incidentes, exige aprovação administrativa temporária quando permitido e bloqueia mudanças incompatíveis com o estado de confiabilidade. A extensão desse contrato para os demais domínios permanece obrigatória antes do beta.

### Entregas obrigatórias

- correlação de logs entre frontend, API, Edge Functions, RPCs e webhooks;
- métricas por domínio;
- tracing dos fluxos críticos;
- SLOs para auth, busca, pedidos, mensagens, pagamentos e comunidade;
- error budgets;
- relação deploy/migration/incidente;
- bloqueio de mudança de alto risco quando orçamento estiver esgotado;
- aprovação administrativa para exceção;
- dead-letter e retry observável;
- alertas acionáveis, sem ruído;
- backup e restore drills;
- canary/feature flags;
- rollback automatizado onde seguro;
- postmortem e ações preventivas em todos os domínios críticos;
- capacity planning.

### Gate de saída

Uma falha simulada é detectada, correlacionada, mitigada, revertida e registrada; o sistema bloqueia uma mudança perigosa quando o error budget está esgotado.

**Situação:** aprovado para o domínio operacional de pedidos em 22/07/2026. Ainda precisa ser generalizado para autenticação, busca, mensagens, pagamentos e comunidade.

---

## Fase 15 — Analytics, economia do marketplace e experimentação

### Objetivo

Tomar decisões com dados e provar que a Doke funciona como negócio.

### Entregas obrigatórias

- taxonomia única de eventos;
- funil cadastro → busca → detalhe → orçamento → proposta → pagamento → conclusão → repetição;
- GMV;
- take rate;
- receita líquida;
- taxa de conversão;
- tempo para primeira proposta;
- fill rate;
- cancelamentos e disputas;
- retenção por coorte;
- frequência de recompra;
- liquidez por categoria e região;
- oferta ativa e demanda atendida;
- CAC, payback e LTV quando houver mídia paga;
- painéis por persona;
- qualidade e reconciliação dos dados;
- feature flags e experimentos;
- privacidade e consentimento na instrumentação.

### Gate de saída

Os números de pedidos, pagamentos e receita reconciliam entre banco, PSP e analytics. Nenhuma decisão crítica depende de evento duplicado ou não auditável.

---

# PARTE V — QUALIDADE, APPS E LANÇAMENTO

## Fase 16 — Fechamento de frontend, lifecycle, acessibilidade e performance

### Objetivo

Transformar a base visual avançada em experiência estável de produção.

### Entregas obrigatórias

- remover mocks e `localStorage` dos caminhos de produção;
- contrato global `init/destroy` para páginas e navegação;
- listeners sem duplicação;
- loading, empty, error e offline coerentes;
- skeleton apenas quando houver carregamento real;
- transição sem flash de conteúdo incorreto;
- responsividade nos viewports oficiais;
- testes de teclado, foco e leitor de tela;
- contraste e semântica;
- performance budgets;
- imagens e vídeo otimizados;
- prevenção de layout shift;
- Lighthouse e Playwright com evidência real;
- compatibilidade de navegadores;
- revisão de CSS morto e `!important` somente após baseline visual;
- SEO e metadados públicos;
- PWA apenas se tiver valor operacional claro.

### Gate de saída

Nenhum fluxo crítico possui erro visual bloqueante, overflow, ação inacessível, listener duplicado ou dependência silenciosa de mock.

---

## Fase 17 — API pública interna e aplicativos móveis

### Objetivo

Garantir que web e apps usem a mesma lógica de domínio.

### Entregas obrigatórias

- API versionada e documentada;
- contratos de request/response;
- autenticação móvel e armazenamento seguro;
- refresh de sessão;
- deep links;
- push notifications;
- upload de mídia;
- cache e modo offline controlado;
- matriz de paridade web/app;
- telemetria e crash reporting;
- feature flags por versão;
- compatibilidade mínima de versões;
- política de atualização obrigatória para falhas críticas;
- escolha do framework registrada em ADR;
- builds internos Android/iOS;
- testes em dispositivos reais;
- requisitos de Play Store e App Store;
- política de privacidade e exclusão de conta nas lojas.

### Gate de saída

O mesmo pedido criado no app aparece corretamente no web, mensagens, pagamento e painel operacional, sem lógica paralela.

---

## Fase 18 — Beta fechado real

### Objetivo

Validar produto e operação com uma coorte pequena antes de abrir amplamente.

### Entregas obrigatórias

- ambiente de produção separado de staging;
- dados e secrets próprios;
- release candidate imutável;
- go/no-go humano;
- plano de rollback;
- usuários selecionados;
- oferta mínima por categoria e região;
- suporte com horário e canal definidos;
- monitoramento diário;
- pagamentos em limites controlados;
- revisão manual de saques e disputas no início;
- onboarding acompanhado;
- coleta de feedback estruturado;
- métricas de ativação, liquidez, conversão, conclusão e repetição;
- incident review;
- correções por severidade;
- política de pausa do beta.

### Estratégia recomendada

Começar por uma região única, provavelmente Salvador, com categorias selecionadas e operação próxima. Abrir nacionalmente antes de validar liquidez local aumentaria custo, fraude, suporte e baixa qualidade de matching.

### Gate de saída

- fluxo transacional real concluído por usuários externos;
- pagamentos e repasses conciliados;
- suporte consegue resolver incidentes;
- não existem vulnerabilidades críticas abertas;
- métricas mínimas de liquidez e satisfação definidas pelo negócio foram atingidas;
- rollback foi ensaiado.

---

## Fase 19 — Lançamento público regional e escala

### Objetivo

Sair do beta de forma controlada e crescer sem perder confiança.

### Entregas obrigatórias

- plano de capacidade;
- expansão por categoria e região;
- aquisição equilibrada de profissionais e clientes;
- playbook de lançamento local;
- antifraude progressivo;
- suporte escalável;
- automação financeira;
- monitoramento de unit economics;
- marketing e conteúdo;
- referrals e retenção;
- SLA por domínio;
- contratação de equipe-chave;
- governança de produto e engenharia;
- incident response 24/7 quando o volume exigir;
- arquitetura de escala orientada por métricas, não por antecipação;
- avaliação de novos produtos somente após o core provar retenção.

### Gate de saída

A Doke cresce em uma região sem degradação relevante de conversão, qualidade, fraude, suporte, disponibilidade ou margem.

---

## 5. Ondas de execução

### Onda A — Tornar a plataforma segura e autoritativa

Fases 0 a 3.

**Resultado:** fonte única de verdade, segurança fechada, regras comerciais definidas e identidade real.

### Onda B — Fechar o marketplace transacional

Fases 4 a 10.

**Resultado:** profissional publica, cliente encontra, contrata, conversa, paga, conclui, avalia e contrata novamente.

### Onda C — Fechar comunidade, operação e confiabilidade

Fases 11 a 15.

**Resultado:** comunidade real, moderação, backoffice, SLOs, error budgets e métricas de negócio.

### Onda D — Qualidade, apps e lançamento

Fases 16 a 19.

**Resultado:** web estável, apps com paridade, beta fechado e lançamento regional.

---

## 6. Ordem exata recomendada a partir de agora

1. Incorporar este Plano Mestre e criar a matriz de estado dos domínios.
2. Executar a Fase 1: hardening de RLS, RPCs privilegiadas, secrets e superfície pública.
3. Fechar identidade e autorização real.
4. Consolidar o ciclo completo serviço → orçamento → pedido → conversa.
5. Integrar PSP em sandbox e fechar ledger/carteira/conciliação.
6. Fechar cancelamentos, reembolsos e disputas.
7. Fechar avaliações, reputação e contratação recorrente.
8. Migrar mensagens/notificações e comunidade para realtime remoto.
9. Consolidar backoffice e moderação.
10. Implementar error budgets e proteção de mudanças em todos os domínios críticos.
11. Fechar analytics e economia do marketplace.
12. Executar QA completo, performance, acessibilidade e remoção final de mocks.
13. Construir apps sobre a mesma API.
14. Rodar beta fechado regional.
15. Promover lançamento público somente após go/no-go.

---

## 7. O que não faremos antes do Core V1

Para não perder foco, ficam fora da sequência principal até o beta provar o núcleo:

- transformar a Doke em concorrente ampla de delivery de produtos;
- múltiplos PSPs;
- programa complexo de pontos e cashback;
- IA em decisões críticas ou moderação autônoma;
- marketplace nacional imediato;
- microserviços sem necessidade comprovada;
- Kubernetes ou multi-região por antecipação;
- publicidade complexa;
- planos corporativos amplos;
- internacionalização;
- criptoativos;
- dezenas de categorias sem liquidez mínima.

Essas ideias não são descartadas. Elas ficam no roadmap pós-validação.

---

## 8. Processo obrigatório de cada próximo lote

Cada lote seguirá esta estrutura:

### Antes de alterar

- objetivo;
- causa raiz/gap;
- autoridade do domínio;
- arquivos permitidos e proibidos;
- riscos;
- plano de rollback;
- testes necessários.

### Durante

- mudanças pequenas e cumulativas;
- sem editar domínios fora do escopo;
- sem migrations concorrentes sem reconciliação;
- contratos atualizados junto com a implementação;
- evidência parcial quando um risco for encontrado.

### Depois

- diff exato;
- testes locais;
- teste no staging;
- canário com cleanup/rollback;
- permissões positivas e negativas;
- regressão de domínios protegidos;
- auditoria de secrets;
- ZIP completo e ZIP mínimo;
- relatório acumulativo;
- atualização deste plano e do status da fase.

---

## 9. Critérios para dizer que a lógica V1 está terminada

A lógica V1 da Doke estará concluída quando, sem mocks no caminho de produção:

1. um cliente cria e recupera sua conta;
2. um profissional cria conta, conclui KYC e publica serviço;
3. o cliente encontra o serviço correto;
4. solicita orçamento;
5. profissional aceita e envia proposta;
6. ambos conversam em realtime;
7. cliente paga por PSP real;
8. pedido é executado e concluído;
9. carteira e recebível refletem o ledger;
10. profissional solicita saque;
11. cancelamento, reembolso e disputa funcionam;
12. cliente avalia e contrata novamente;
13. notificações chegam sem refresh e sem duplicação;
14. comunidade funciona entre usuários/dispositivos reais;
15. suporte opera tudo por painel auditável;
16. incidentes são detectados, mitigados e documentados;
17. métricas financeiras e de produto reconciliam;
18. web e apps compartilham a mesma lógica;
19. segurança, acessibilidade e performance passam pelos gates;
20. um beta fechado real conclui o ciclo com rollback ensaiado.

---

## 10. Decisão técnica imediata

O lote prometido de **error budgets e proteção de mudanças** foi concluído para o domínio operacional de pedidos. A partir daqui, a sequência responsável volta ao fechamento estrutural da plataforma:

```text
1. Incorporar o Plano Mestre à governança e concluir a matriz real de domínios, fluxos, mocks e pendências
2. Fechar RLS, grants e RPCs privilegiadas sem quebrar os fluxos atuais
3. Consolidar identidade real, sessões e autorização por persona
4. Fechar o fluxo transacional completo do marketplace
5. Integrar pagamentos, conciliação, carteira e saques reais
6. Fechar mensagens, notificações e realtime entre dispositivos
7. Migrar comunidades e conteúdo para autoridade remota
8. Consolidar backoffice, qualidade, apps e beta fechado
9. Generalizar error budgets para todos os domínios críticos antes do beta
```

O subsistema operacional de pedidos fica preservado e protegido. Não continuaremos aprofundando apenas esse domínio enquanto segurança, identidade e os fluxos centrais ainda possuírem lacunas de produção.

---

## 11. Visão final

A ambição de tornar a Doke uma empresa de grande impacto exige mais do que muitas funcionalidades. Exige:

- resolver uma dor real melhor que alternativas existentes;
- criar liquidez local;
- gerar confiança entre desconhecidos;
- manter contratação e pagamento dentro da plataforma;
- proteger usuários e profissionais;
- operar incidentes e dinheiro com disciplina;
- medir retenção e economia unitária;
- crescer sem destruir qualidade.

A missão agora não é adicionar tudo rapidamente. É construir a sequência correta, fechar cada domínio com evidência e transformar a Doke em uma plataforma que mereça a confiança de milhões de pessoas.

Este Plano Mestre passa a orientar todos os próximos passos.

## Progresso SEC-001

- [x] Autoridade profissional/KYC: tabelas read-only por RLS, documentos privados e revisão via Edge Function autenticada.
- [x] Autoridade do cliente: `client_profiles` privado e server-owned, projeção pública agregada, grants mínimos e canários negativos por persona.
