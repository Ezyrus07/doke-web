# UX-FOUNDATION-014 — Confiança, segurança, denúncias, bloqueio e moderação

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `014`
- Natureza: especificação de Produto, Trust & Safety, UX, moderação, segurança de interface e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- HTML alterado: não
- CSS alterado: não
- JavaScript alterado: não
- Migrations alteradas: não
- Workflows alterados: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Ready for review autorizado: não
- Head lógico principal inspecionado: `09c7f60c3d3acac79d70d1ed1f330b1eb703db4e`
- Head UX anterior: `e0a822a79051ff29098dde8e916a2a41007b0195`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-013`

---

## 1. Objetivo

Definir o contrato transversal de confiança e segurança da Doke para que qualquer pessoa consiga:

- denunciar uma conta, perfil, anúncio, mensagem, publicação, comunidade ou avaliação;
- bloquear outra conta com efeito previsível;
- silenciar conteúdo ou notificações sem confundir isso com bloqueio;
- compreender o que acontece após uma denúncia;
- preservar evidências sem divulgar conteúdo sensível desnecessariamente;
- receber proteção imediata quando houver risco;
- continuar acessando transações legítimas sem contato indevido;
- contestar sanções quando aplicável;
- distinguir moderação comunitária de moderação da plataforma;
- distinguir disputa comercial de denúncia de segurança;
- reconhecer tentativas de golpe, impersonação e desvio para fora da plataforma;
- agir com segurança em serviços presenciais;
- usar todos esses fluxos por teclado e leitor de tela;
- receber respostas honestas mesmo quando a autoridade operacional não estiver disponível.

O contrato também define como a operação futura deverá:

- receber e normalizar reports;
- triá-los por severidade e contexto;
- formar casos sem duplicar eventos;
- registrar decisões auditáveis;
- aplicar medidas proporcionais;
- proteger denunciantes e pessoas denunciadas;
- gerenciar conflitos de interesse;
- preservar a separação entre suporte, moderação, disputas e finanças;
- impedir que uma mensagem de sucesso local seja interpretada como ação real de moderação.

---

## 2. Princípio central

```text
uma denúncia
→ um recibo
→ um caso rastreável
→ uma decisão autorizada
→ uma consequência explícita
→ uma possibilidade de revisão quando aplicável
```

Nunca:

```text
clique local
→ toast de sucesso
→ nenhuma autoridade
→ nenhuma evidência
→ nenhum acompanhamento
```

A confiança da Doke não pode depender apenas de textos como:

- “usuário verificado”;
- “pagamento protegido”;
- “comunidade segura”;
- “profissional confiável”;
- “denúncia enviada”;
- “membro bloqueado”.

Cada afirmação precisa estar vinculada a uma autoridade, um estado e uma evidência compatível.

---

## 3. Escopo

### 3.1 Superfícies auditadas

- Home;
- Resultados;
- detalhe do anúncio;
- perfil público de profissional;
- perfil de cliente;
- Mensagens;
- Pedidos;
- proposta e cobrança;
- Pagamento;
- Avaliações;
- Workers;
- Publicações;
- descoberta de comunidades;
- comunidade interna;
- Notificações;
- Configurações;
- fila administrativa de anúncios;
- contratos de reports e blocks;
- matriz de maturidade dos domínios.

### 3.2 Entidades de segurança

- conta;
- perfil;
- anúncio de serviço;
- publicação;
- Worker;
- comentário;
- avaliação;
- mensagem;
- conversa;
- anexo;
- pedido;
- proposta;
- cobrança;
- pagamento;
- comunidade;
- canal;
- evento;
- membro;
- ação de moderador;
- decisão de plataforma.

### 3.3 Fora deste sublote

- definição jurídica final das políticas;
- contratação de equipe de moderação;
- configuração de SLA real;
- moderação automática por modelo de IA;
- deploy de endpoints;
- migrations;
- operação de emergência real;
- integração com autoridades externas;
- investigação criminal;
- análise manual de conteúdo real.

Este documento define os contratos necessários para que essas capacidades sejam implementadas de forma consistente.

---

## 4. Inventário do estado atual

### 4.1 Pontos positivos observados

A base já possui elementos úteis que devem ser preservados:

- tabela `reports` incluída na autoridade de segurança;
- RLS e grants de menor privilégio para reports;
- runbook de moderação com endpoints planejados;
- exigência de autenticação para denunciar e bloquear;
- exigência de idempotência nas mutações de reports;
- listagem e resolução de reports restritas a admin;
- regra explícita para não alterar carteira, pedidos ou mensagens diretamente ao moderar;
- moderação de anúncios por Edge Function JWT-protected;
- operações de aprovação, rejeição e solicitação de ajustes;
- trilha de auditoria de moderação de anúncios;
- funções de disciplina comunitária;
- mute, restrict, kick, ban e unban comunitários;
- motivo obrigatório no ban comunitário;
- auditoria local de ações administrativas;
- slow mode e bloqueio de links por canal;
- registro local de violações de antispam;
- owner membership canônico no backend de comunidades;
- negação de autoelevação a moderador ou owner;
- URLs privadas e lifecycle de anexos transacionais.

### 4.2 Limite de autoridade atual

A existência desses blocos não significa que a experiência pública esteja completa.

O estado observado ainda é fragmentado:

```text
reports backend/runbook
≠ superfície pública de denúncia

moderação de anúncio
≠ Trust & Safety da plataforma

ban comunitário local
≠ bloqueio de conta na Doke

silenciar notificação
≠ silenciar pessoa

cancelar pedido
≠ denunciar golpe

disputar pagamento
≠ denunciar assédio
```

### 4.3 Maturidade declarada

A matriz vigente registra:

```text
COM-001 → híbrido, maturidade 3/6
ADM-001 → híbrido, maturidade 4/6
LEGAL-001 → local, maturidade 1/6
```

E preserva blockers materiais:

```text
COM-B02
→ membership, roles, bans, invitations e posts ainda não são totalmente server-canonical

COM-B04
→ reports, sanções, apelações e moderação de mídia incompletos

ADM-B03
→ usuários, pagamentos, disputas, comunidades, conteúdo e suporte sem workflow unificado
```

A implementação de UX não poderá declarar o sistema completo antes de esses blockers serem resolvidos materialmente.

---

## 5. Causa raiz

A causa raiz não é a ausência total de componentes.

É a ausência de uma autoridade transversal que responda:

```text
quem denunciou?
o que foi denunciado?
qual conteúdo foi preservado?
qual risco existe agora?
quem pode ver o caso?
qual medida imediata foi aplicada?
qual operação deve revisar?
qual decisão foi tomada?
qual consequência ocorreu?
a pessoa pode apelar?
como a interface será reconciliada?
```

Hoje, diferentes superfícies podem implementar apenas partes isoladas:

- a comunidade mantém bans locais;
- anúncios possuem fila administrativa própria;
- notificações possuem “silenciar origem”;
- pedidos possuem cancelamento e disputa;
- backend possui contrato de reports;
- perfis e mensagens não apresentam uma experiência pública consolidada de denúncia e bloqueio.

Sem contrato comum, o produto corre o risco de:

- duplicar denúncias;
- perder evidências;
- confundir bloqueio com mute;
- expor detalhes ao denunciado;
- criar retaliação;
- esconder erro como sucesso;
- excluir conteúdo antes de preservar snapshot;
- aplicar sanção fora do escopo;
- penalizar uma transação legítima sem autoridade financeira;
- usar regras locais adulteráveis como decisão de plataforma;
- não permitir apelação;
- apresentar badge de verificação como garantia absoluta.

---

## 6. Autoridade proposta

```text
Doke.trustSafetyExperience
```

### 6.1 Responsabilidades

```text
registerPolicyCatalog()
registerReportTarget()
openReportFlow()
createReportDraft()
submitReport()
reconcileReport()
getReportReceipt()
getReportStatus()
blockAccount()
unblockAccount()
muteAccount()
unmuteAccount()
muteScope()
unmuteScope()
resolveSafetyIntervention()
getRelationshipSafetyState()
getTransactionSafetyState()
getCommunityModerationState()
getCaseSnapshot()
requestAppeal()
getAppealStatus()
redactEvidence()
announceSafetyState()
```

### 6.2 Autoridades relacionadas

```text
Doke.privacyExperience
Doke.notificationCenter
Doke.contentCatalog
Doke.overlayManager
Doke.formMutationManager
Doke.actionConfirmation
Doke.accessibilityExperience
Doke.routeAnnouncer
Doke.unsavedChangesManager
Doke.performanceExperience
```

### 6.3 Regra de ownership

A camada de experiência:

- apresenta políticas;
- coleta intenção;
- valida campos;
- mantém draft efêmero;
- envia comando;
- reconcilia retorno;
- apresenta receipt;
- aplica estado visual confirmado.

Ela não pode:

- decidir culpa;
- fabricar status de investigação;
- suspender conta localmente;
- alterar pagamento;
- remover mensagem remota sem autoridade;
- declarar denúncia recebida sem receipt canônico;
- declarar pessoa segura ou perigosa.

---

## 7. Modelo canônico de report

```text
Report
├── reportId
├── idempotencyKey
├── reporterAccountId
├── targetType
├── targetId
├── targetOwnerAccountId
├── contextType
├── contextId
├── reasonCode
├── severityHint
├── description
├── evidenceRefs[]
├── snapshotRef
├── immediateSafetyChoice
├── relationshipAction
├── transactionId
├── communityId
├── channelId
├── sourceRoute
├── createdAt
├── status
├── receiptVersion
└── privacyClass
```

### 7.1 Campos públicos do receipt

```text
reportId
status
createdAt
targetType
reasonLabel
nextStepLabel
canAddEvidence
canWithdraw
canAppeal
```

### 7.2 Campos nunca expostos ao denunciado

- identidade do denunciante, salvo obrigação legal e decisão autorizada;
- texto privado do denunciante;
- sinais internos de risco;
- detalhes de triagem;
- IDs internos da operação;
- outras denúncias recebidas;
- evidência de terceiros;
- dados de segurança do dispositivo;
- endereço ou contato do denunciante;
- notas de moderador.

### 7.3 Status do report

```text
DRAFT
SUBMITTING
RECEIVED
TRIAGE_PENDING
UNDER_REVIEW
AWAITING_INFORMATION
ACTION_TAKEN
NO_ACTION
DUPLICATE
WITHDRAWN
CLOSED
UNKNOWN_OUTCOME
```

### 7.4 Status públicos versus internos

A interface pública não deve expor detalhes que permitam retaliação ou exploração do sistema.

Exemplo:

```text
interno
→ escalado para fraude financeira nível 2

público
→ Em análise pela equipe responsável
```

---

## 8. Tipos de alvo

```text
ACCOUNT
PROFILE
SERVICE_LISTING
WORKER
PUBLICATION
COMMENT
REVIEW
MESSAGE
CONVERSATION
ATTACHMENT
COMMUNITY
COMMUNITY_CHANNEL
COMMUNITY_MESSAGE
COMMUNITY_EVENT
ORDER_CONTEXT
PAYMENT_CONTEXT
```

### 8.1 Order e payment context

Uma denúncia ligada a pedido ou pagamento não substitui:

- cancelamento;
- disputa;
- reembolso;
- contestação;
- chargeback;
- suporte financeiro.

O report deve referenciar a transação, mas a consequência financeira continua sob sua autoridade própria.

```text
report de fraude
→ Trust & Safety case

pedido de reembolso
→ dispute/refund case
```

Os casos podem ser vinculados, mas não fundidos sem controle.

---

## 9. Taxonomia de motivos

### 9.1 Segurança da identidade

```text
IMPERSONATION
FAKE_PROFILE
STOLEN_IDENTITY
MISLEADING_VERIFICATION
ACCOUNT_TAKEOVER_SUSPECTED
```

### 9.2 Fraude e golpe

```text
SCAM
PAYMENT_OFF_PLATFORM
ADVANCE_FEE
FAKE_RECEIPT
PHISHING_LINK
MALICIOUS_ATTACHMENT
FALSE_SERVICE
PRICE_BAIT_AND_SWITCH
REFUND_ABUSE
CHARGEBACK_ABUSE
```

### 9.3 Assédio e segurança pessoal

```text
HARASSMENT
THREAT
STALKING
UNWANTED_CONTACT
SEXUAL_HARASSMENT
HATEFUL_CONDUCT
DOXXING
BLACKMAIL
```

### 9.4 Conteúdo

```text
SPAM
MISLEADING_CONTENT
ILLEGAL_CONTENT
VIOLENT_CONTENT
SEXUAL_CONTENT
MINOR_SAFETY
SELF_HARM_CONCERN
COPYRIGHT_OR_OWNERSHIP
PRIVACY_VIOLATION
```

### 9.5 Marketplace

```text
SERVICE_NOT_DELIVERED
DANGEROUS_SERVICE
PROHIBITED_SERVICE
UNQUALIFIED_PROFESSIONAL
MISLEADING_PRICE
FAKE_REVIEW
REVIEW_RETALIATION
OFF_PLATFORM_SOLICITATION
```

### 9.6 Comunidades

```text
COMMUNITY_RULE_VIOLATION
ABUSIVE_MODERATOR
UNFAIR_BAN
BAN_EVASION
RAID_OR_COORDINATED_SPAM
MALICIOUS_INVITE
CHANNEL_ABUSE
```

### 9.7 Outro

```text
OTHER
```

`OTHER` exige descrição curta e não pode ser o primeiro item da lista.

---

## 10. Severidade

### 10.1 Níveis

```text
S0 — informativo ou baixo impacto
S1 — violação comum sem risco imediato
S2 — risco relevante ou repetido
S3 — risco alto, fraude ativa ou ameaça crível
S4 — risco crítico ou perigo imediato
```

### 10.2 Exemplos de S3/S4

- ameaça direta e específica;
- tentativa de obter credenciais;
- fraude financeira em andamento;
- exposição de endereço residencial;
- perseguição após bloqueio;
- conteúdo envolvendo segurança de menores;
- malware ou link de phishing ativo;
- risco presencial imediato.

### 10.3 Linguagem pública

A classificação interna não será apresentada como diagnóstico definitivo.

Não usar:

```text
Este usuário é um golpista.
Esta pessoa representa alto risco.
A denúncia é verdadeira.
```

Usar:

```text
Detectamos sinais que precisam de revisão.
Esta conversa foi limitada enquanto verificamos o caso.
Evite enviar dinheiro ou dados pessoais fora da Doke.
```

---

## 11. Fluxo público de denúncia

### 11.1 Entrada

A ação `Denunciar` deve estar disponível em:

- menu do perfil;
- menu do anúncio;
- menu do Worker;
- menu da publicação;
- menu da avaliação;
- menu da mensagem;
- menu da conversa;
- menu da comunidade;
- menu da mensagem comunitária;
- detalhe do pedido, quando houver contexto de segurança.

### 11.2 Passos

```text
1. Selecionar motivo
2. Informar contexto opcional ou obrigatório
3. Revisar evidências preservadas
4. Escolher ação imediata
5. Confirmar envio
6. Receber protocolo
```

### 11.3 Ação imediata

Após escolher o motivo, a pessoa pode selecionar:

```text
Bloquear esta conta
Silenciar esta conta
Sair desta conversa
Ocultar este conteúdo
Continuar sem bloquear
```

A denúncia não deve bloquear automaticamente sem informar a consequência.

Exceção:

- quando uma política obrigatória exigir contenção temporária;
- quando houver risco técnico de malware;
- quando uma conta já estiver suspensa pela autoridade.

### 11.4 Confirmação

```text
Denunciar esta mensagem?

A Doke preservará uma cópia do conteúdo e do contexto necessário para análise.
A outra pessoa não verá seu texto de denúncia.

[Voltar] [Enviar denúncia]
```

### 11.5 Receipt

```text
Denúncia recebida

Protocolo: DK-TS-...
Motivo: Tentativa de golpe
Status: Aguardando triagem

Você bloqueou esta conta.
As mensagens anteriores continuam disponíveis como evidência.
```

### 11.6 Falha

```text
Não foi possível confirmar o envio

Sua descrição continua salva neste dispositivo.
Tente novamente ou copie o texto antes de sair.
```

### 11.7 Outcome desconhecido

```text
Estamos confirmando o envio

Não envie outra denúncia ainda.
O protocolo aparecerá assim que a operação for reconciliada.
```

---

## 12. Evidência

### 12.1 Snapshot canônico

Ao denunciar conteúdo mutável, a autoridade deve preservar:

- conteúdo textual relevante;
- autor e alvo;
- timestamps;
- IDs canônicos;
- contexto anterior e posterior limitado;
- anexos referenciados;
- hash ou versão;
- estado de edição;
- estado de exclusão;
- rota de origem.

### 12.2 Não confiar no DOM

O frontend não deve enviar apenas:

```text
innerText da mensagem
nome visível
screenshot informal
```

O comando precisa referenciar IDs canônicos para que o servidor forme o snapshot.

### 12.3 Evidência adicional

A pessoa pode adicionar:

- descrição;
- arquivo;
- screenshot;
- link interno;
- ID de pedido;
- ID de cobrança;
- horário aproximado.

### 12.4 Limites

- não solicitar documentos pessoais sem necessidade;
- não solicitar senha;
- não solicitar token;
- não incentivar envio de dados bancários completos;
- remover EXIF/GPS de imagens quando a localização não for necessária;
- alertar quando screenshot contém dados de terceiros;
- armazenar anexos em boundary privado.

### 12.5 Preservação antes da remoção

```text
report recebido
→ snapshot preservado
→ conteúdo pode ser ocultado
→ decisão posterior
```

Nunca:

```text
conteúdo removido localmente
→ evidência perdida
→ report vazio
```

---

## 13. Bloqueio, silenciamento, restrição e banimento

### 13.1 Definições

```text
MUTE_NOTIFICATION
→ silencia notificações de uma origem

MUTE_ACCOUNT
→ reduz conteúdo e alertas de uma conta

BLOCK_ACCOUNT
→ impede novas interações diretas entre duas contas

RESTRICT_ACCOUNT
→ limitação temporária aplicada pela plataforma

COMMUNITY_MUTE
→ impede ou limita envio dentro de uma comunidade

COMMUNITY_RESTRICT
→ reduz permissões dentro de uma comunidade

COMMUNITY_KICK
→ remove membership atual

COMMUNITY_BAN
→ impede reentrada dentro daquela comunidade

PLATFORM_SUSPENSION
→ sanção da plataforma inteira
```

### 13.2 Matriz de efeitos

| Ação | Mensagem direta | Perfil | Recomendações | Comunidade | Pedido ativo | Notificação |
| --- | --- | --- | --- | --- | --- | --- |
| Silenciar origem | mantém | mantém | mantém | mantém | mantém | suprime |
| Silenciar conta | mantém sob escolha | reduz | remove | não altera membership | mantém | reduz |
| Bloquear conta | impede novas | oculta/limita | remove | depende da política local | preserva acesso seguro | suprime |
| Ban comunitário | não altera | mantém | mantém | impede reentrada | não altera | comunidade suprimida |
| Suspensão da plataforma | autoridade decide | indisponível | remove | remove/limita | acesso operacional controlado | transacional somente |

### 13.3 Pedido ativo

Bloquear uma pessoa com pedido ativo exige explicação:

```text
Bloquear contato direto

Você ainda poderá acessar o pedido, registrar evidências e usar os canais de suporte.
O bloqueio não cancela o pedido nem altera o pagamento.
```

### 13.4 Desbloqueio

- não recria mensagens removidas;
- não restaura automaticamente membership;
- não reativa notificações sem explicar;
- não remove reports existentes;
- não apaga histórico de auditoria.

### 13.5 Evitar retaliação

A pessoa bloqueada não deve receber:

```text
Gabriel bloqueou você após denunciar a mensagem X.
```

Pode receber apenas o estado necessário:

```text
Você não pode iniciar uma nova conversa com esta conta.
```

---

## 14. Bloqueio de conta versus ban comunitário

O ban observado na comunidade é escopado ao registro local da comunidade.

Ele não pode ser apresentado como:

```text
Usuário banido da Doke
```

O texto correto é:

```text
Membro banido desta comunidade
```

O contrato do ban comunitário deve incluir:

```text
banId
communityId
subjectAccountId
reasonCode
moderatorNote
publicReason
startsAt
expiresAt
status
createdBy
reviewedBy
appealState
```

A duração não deve ser digitada em formato livre como:

```text
permanent
7d
30d
quantidade de horas
```

A UI deve oferecer opções estruturadas:

```text
1 hora
24 horas
7 dias
30 dias
Permanente
Personalizado
```

`Personalizado` usa data/hora validada e apresenta timezone.

---

## 15. Disciplina comunitária

### 15.1 Estados

```text
ACTIVE
MUTED
RESTRICTED
KICKED
BANNED
BAN_EXPIRED
APPEAL_PENDING
APPEAL_GRANTED
APPEAL_DENIED
```

### 15.2 Motivos

- spam;
- links maliciosos;
- assédio;
- discurso abusivo;
- violação de regras;
- impersonação;
- ban evasion;
- divulgação de dados pessoais;
- fraude;
- outro.

### 15.3 Ações de moderador

```text
Advertir
Remover mensagem
Silenciar
Restringir
Expulsar
Banir
Encaminhar à plataforma
```

### 15.4 Limite da autoridade comunitária

Moderadores comunitários não podem:

- suspender conta da plataforma;
- acessar e-mail privado sem necessidade;
- acessar outros pedidos;
- acessar pagamentos;
- alterar reputação global;
- remover report de plataforma;
- investigar mensagens privadas externas à comunidade;
- expor o denunciante.

### 15.5 Escalonamento

Um moderador pode criar um report de plataforma a partir de um caso comunitário.

```text
Encaminhar à Doke
```

Isso cria um caso separado, vinculado ao caso comunitário.

---

## 16. Problemas atuais na disciplina comunitária

### 16.1 Autoridade local

As chaves observadas incluem:

```text
doke.communities.local.v1
doke.community.messages.local.v1
doke.community.audit.local.v1
doke.community.antispam.local.v1
doke.community.lifecycle.local.v1
```

Como estão no navegador:

- podem ser alteradas manualmente;
- não oferecem integridade operacional;
- não são adequadas para sanção real;
- não devem produzir claims definitivos;
- não são isoladas por conta em todas as superfícies;
- não suportam apelação canônica.

### 16.2 Prompt livre de ban

O fluxo atual solicita motivo e duração com prompts de texto.

Riscos:

- erro de digitação;
- timezone ausente;
- formato inválido;
- duração ambígua;
- ausência de preview da consequência;
- ausência de policy reference;
- ausência de apelação;
- ausência de segundo controle em ban permanente.

### 16.3 Antispam

O antispam local reconhece:

- excesso de mensagens;
- slow mode;
- bloqueio de links por regex;
- bloqueio temporário.

Isso é útil como proteção de UX, mas não como decisão definitiva.

A regex de link:

- não detecta todos os domínios;
- pode gerar falso positivo;
- pode ser contornada;
- não detecta phishing visual;
- não inspeciona redirects;
- não classifica arquivo malicioso.

A interface deve dizer:

```text
Este canal não permite links.
```

Não:

```text
A Doke detectou um golpe.
```

---

## 17. Moderação de anúncios

### 17.1 Estado positivo

A fila observada possui autoridade remota para:

```text
list
detail
audit
approve
request_changes
reject
```

Isso deve ser preservado.

### 17.2 Limite de escopo

Essa fila modera versões de anúncios.

Ela não substitui:

- denúncia pública;
- investigação de fraude;
- sanção de conta;
- revisão de mensagem;
- apelação de ban;
- moderação de publicação;
- incidente de segurança.

### 17.3 Erro convertido em vazio

O controller atual pode executar:

```text
falha ao carregar fila
→ render([])
→ mostrar toast de erro
```

Isso produz simultaneamente:

```text
Nenhum anúncio aguardando análise
```

E:

```text
Não foi possível carregar
```

O contrato deve separar:

```text
LOADING
READY_WITH_ITEMS
READY_EMPTY
ERROR
STALE_WITH_ITEMS
```

### 17.4 Exposição de e-mail

A fila atual pode mostrar o e-mail do profissional diretamente no card.

Regra futura:

- lista usa nome e ID operacional;
- e-mail fica oculto por padrão;
- acesso exige necessidade e ação explícita;
- reveal é auditado;
- screenshots operacionais não devem conter e-mail desnecessário.

### 17.5 Decisão

A decisão deve incluir:

```text
decisionId
versionId
policyCode
reasonCode
internalNote
publicExplanation
evidenceRefs
actorId
reviewerId
createdAt
idempotencyKey
```

### 17.6 Apelação do anúncio

```text
REJECTED
→ profissional recebe motivo público
→ pode corrigir e reenviar
→ pode apelar quando a decisão não depender de correção objetiva
```

Reenvio e apelação não são sinônimos.

---

## 18. Report público versus revisão preventiva

```text
revisão preventiva
→ ocorre antes da publicação

report público
→ ocorre depois que uma pessoa encontra um problema
```

O mesmo anúncio pode ter:

- versão aprovada;
- report posterior por golpe;
- investigação de conta;
- suspensão temporária;
- disputa de pedido associada.

O case manager precisa manter esses vínculos sem sobrescrever o histórico.

---

## 19. Mensagens e conversas

### 19.1 Ações obrigatórias

Em uma mensagem:

```text
Copiar
Responder
Denunciar mensagem
```

Em uma conversa:

```text
Silenciar conversa
Bloquear conta
Denunciar conversa
Sair da conversa, quando aplicável
```

### 19.2 Preservação do contexto

Ao denunciar uma mensagem, o snapshot deve incluir uma janela limitada:

```text
mensagem denunciada
+ mensagens anteriores relevantes
+ mensagens posteriores relevantes
```

A quantidade deve ser policy-driven e não exposta ao denunciante como texto copiável desnecessário.

### 19.3 Mensagens editadas

O caso deve registrar:

- versão original, quando disponível;
- versão atual;
- data da edição;
- autor;
- exclusão posterior.

### 19.4 Mensagens apagadas

O denunciante pode receber:

```text
Mensagem removida da conversa
A cópia necessária para análise foi preservada.
```

Somente se a autoridade confirmar a preservação.

### 19.5 Quick reply e bloqueio

Após bloquear:

- quick reply deixa de aparecer;
- composer fica desabilitado;
- notificação não oferece responder;
- deep link abre o estado de segurança;
- mensagens antigas podem continuar acessíveis como evidência.

---

## 20. Perfis e identidade

### 20.1 Ações

```text
Denunciar perfil
Bloquear conta
Silenciar conta
Copiar link do perfil
```

### 20.2 Impersonação

O fluxo deve perguntar:

```text
A pessoa está fingindo ser:
- você
- alguém que você conhece
- uma empresa
- um profissional conhecido
- outra pessoa
```

### 20.3 Verificação

Badge de verificação significa apenas o que a política comprovou.

Exemplo:

```text
Identidade verificada
```

Não significa automaticamente:

- serviço garantido;
- ausência de denúncias;
- qualificação técnica;
- seguro ativo;
- preço justo;
- comportamento futuro seguro.

O tooltip deve explicar o escopo.

### 20.4 Contato

Depois do bloqueio:

- telefone deixa de ser revelado ao bloqueado, salvo obrigação transacional;
- CTA de mensagem é removido;
- recomendações são suprimidas;
- menções sociais são limitadas;
- report status permanece privado.

---

## 21. Publicações, Workers e comentários

### 21.1 Ações por conteúdo

```text
Denunciar conteúdo
Não tenho interesse
Silenciar autor
Bloquear autor
```

`Não tenho interesse` não cria report.

### 21.2 Antes/depois

Conteúdo de antes/depois pode envolver:

- propriedade de cliente;
- rosto;
- endereço;
- placa;
- criança;
- documento;
- localização.

O motivo `PRIVACY_VIOLATION` deve estar disponível.

### 21.3 Worker em vídeo

- report disponível sem precisar iniciar autoplay;
- thumbnail pode ser denunciada;
- transcript/caption pode ser referenciado;
- timestamp opcional do trecho;
- mídia deve ser pausada ao abrir o modal.

### 21.4 Comentários

Ação do autor:

```text
Excluir meu comentário
Editar meu comentário
```

Ação de terceiros:

```text
Denunciar comentário
Bloquear autor
```

---

## 22. Avaliações e reputação

### 22.1 Motivos específicos

```text
FAKE_REVIEW
REVIEW_RETALIATION
CONFLICT_OF_INTEREST
PERSONAL_DATA_IN_REVIEW
HARASSMENT_IN_REVIEW
REVIEW_NOT_ABOUT_TRANSACTION
```

### 22.2 Moderação não altera nota silenciosamente

Estados:

```text
PUBLISHED
UNDER_REVIEW
HIDDEN_PENDING_REVIEW
REMOVED
RESTORED
```

### 22.3 Explicação

Quando uma avaliação é removida:

```text
Esta avaliação não está disponível porque violou as regras de conteúdo.
```

Não expor o texto removido ao público.

### 22.4 Reputação

A reputação agregada deve ser recalculada pela autoridade do domínio, nunca manualmente pelo frontend após ocultar um card.

---

## 23. Pedidos, fraude e segurança presencial

### 23.1 CTA de segurança

No pedido ativo:

```text
Preciso de ajuda
```

Abre opções distintas:

```text
Problema com o serviço
Problema com pagamento
Quero cancelar
Quero denunciar comportamento
Sinto que estou em risco
```

### 23.2 Risco imediato

A interface deve orientar a pessoa a priorizar segurança física e serviços locais apropriados, sem afirmar que a Doke oferece resposta emergencial em tempo real.

Texto de contrato:

```text
A Doke não é um serviço de emergência.
Em risco imediato, procure um local seguro e contate o serviço de emergência da sua região.
```

A informação local específica só pode ser apresentada por uma autoridade geográfica confiável.

### 23.3 Encontro presencial

Checklist opcional antes do serviço:

- confirmar nome e foto;
- manter comunicação na Doke;
- não compartilhar códigos de acesso desnecessários;
- não antecipar pagamento fora do fluxo;
- informar outra pessoa quando fizer sentido;
- guardar objetos sensíveis;
- confirmar escopo e preço no pedido.

### 23.4 Profissional

Para o profissional:

- endereço aparece apenas no momento necessário;
- possibilidade de reportar ambiente inseguro;
- possibilidade de encerrar visita;
- evidência de tentativa de pagamento fora da plataforma;
- contato com suporte sem perder o pedido.

### 23.5 Consequência do bloqueio

O bloqueio não pode:

- liberar escrow;
- cancelar agenda;
- confirmar conclusão;
- gerar reembolso;
- criar chargeback;
- apagar evidência.

---

## 24. Antigolpe

### 24.1 Sinais de contexto

A interface pode detectar padrões determinísticos como:

- pedido de pagamento externo;
- pedido de código de verificação;
- link encurtado;
- solicitação de senha;
- comprovante sem pagamento canônico;
- urgência artificial;
- mudança repentina de contato.

### 24.2 Linguagem honesta

Não usar:

```text
IA detectou golpe
Usuário fraudulento
Mensagem maliciosa confirmada
```

Usar:

```text
Esta mensagem contém um pedido comum em tentativas de golpe.
Não compartilhe códigos ou senhas.
Confira o pagamento dentro da Doke.
```

### 24.3 Intervenção

```text
WARNING
SOFT_BLOCK
HARD_BLOCK
REVIEW_REQUIRED
```

`HARD_BLOCK` exige política e autoridade; uma regex local não basta.

### 24.4 Pagamento fora da plataforma

Quando houver texto como PIX externo, transferência ou link de pagamento:

```text
Pagar fora da Doke pode remover proteções associadas ao pedido.
Confira se a cobrança aparece na página oficial do pedido.
```

A copy não pode afirmar proteção financeira que ainda não esteja operacional.

### 24.5 Links

- mostrar domínio real;
- não mascarar URL;
- alertar para domínio diferente;
- não abrir automaticamente;
- usar `noopener` e `noreferrer` quando aplicável;
- não enviar URL privada para serviço terceiro sem contrato;
- permitir denunciar phishing.

---

## 25. Attachments e malware

### 25.1 Estados

```text
SELECTED
SCANNING
SAFE_TO_OPEN
REVIEW_REQUIRED
BLOCKED
SCAN_UNAVAILABLE
```

### 25.2 Claims

Sem scanner real:

```text
Arquivo ainda não verificado
```

Nunca:

```text
Arquivo seguro
```

### 25.3 Preview

- PDFs isolados;
- imagens sem scripts;
- vídeos com controles;
- nomes sanitizados;
- extensão e MIME apresentados;
- arquivo bloqueado não abre;
- download exige ação explícita.

### 25.4 Report

A pessoa pode denunciar o anexo sem baixá-lo.

---

## 26. Sanções da plataforma

### 26.1 Tipos

```text
CONTENT_REMOVAL
FEATURE_RESTRICTION
MESSAGING_RESTRICTION
COMMUNITY_RESTRICTION
LISTING_RESTRICTION
PAYMENT_REVIEW_HOLD
ACCOUNT_WARNING
TEMPORARY_SUSPENSION
PERMANENT_SUSPENSION
```

### 26.2 Separação financeira

`PAYMENT_REVIEW_HOLD` só pode ser aplicado pela autoridade financeira autorizada e vinculado a um caso.

Moderador de conteúdo não executa hold financeiro diretamente.

### 26.3 Proporcionalidade

A decisão considera:

- severidade;
- contexto;
- reincidência;
- alcance;
- dano;
- intenção observável;
- reversibilidade;
- risco de continuidade;
- evidência disponível.

### 26.4 Sanção temporária

Deve apresentar:

```text
motivo público
início
fim
efeito
como apelar
```

### 26.5 Sanção permanente

Exige:

- policy code;
- evidência suficiente;
- reviewer autorizado;
- separação de função quando exigida;
- audit log;
- apelação ou justificativa de inapelabilidade.

---

## 27. Apelação

### 27.1 Estados

```text
NOT_AVAILABLE
AVAILABLE
DRAFT
SUBMITTING
RECEIVED
UNDER_REVIEW
GRANTED
PARTIALLY_GRANTED
DENIED
CLOSED
UNKNOWN_OUTCOME
```

### 27.2 Elegibilidade

Apelação pode existir para:

- remoção de conteúdo;
- rejeição de anúncio;
- ban comunitário;
- restrição de mensagens;
- suspensão de conta;
- avaliação removida;
- decisão de fraude.

### 27.3 Sem repetição infinita

A política define:

- quantidade de apelações;
- janela de tempo;
- nova evidência;
- decisão final;
- escalonamento.

### 27.4 Reviewer diferente

Quando possível:

```text
moderador inicial
≠ revisor da apelação
```

### 27.5 Copy

```text
Apelação recebida

Sua conta continua com a restrição atual enquanto a revisão acontece.
Você receberá uma atualização na central de segurança.
```

Não prometer prazo sem SLA operacional.

---

## 28. Case management administrativo

### 28.1 Modelo

```text
TrustSafetyCase
├── caseId
├── caseType
├── linkedReportIds[]
├── linkedEntityRefs[]
├── linkedTransactionRefs[]
├── severity
├── priority
├── status
├── assignedTeam
├── assignedOperator
├── conflictState
├── evidenceSet
├── interventions[]
├── decisions[]
├── appealRefs[]
├── auditTrail[]
├── createdAt
├── updatedAt
└── retentionPolicy
```

### 28.2 Status

```text
NEW
TRIAGE
ASSIGNED
INVESTIGATING
AWAITING_REPORTER
AWAITING_SUBJECT
AWAITING_DOMAIN_OWNER
ACTION_PENDING
DECIDED
APPEALED
CLOSED
REOPENED
```

### 28.3 Filas

```text
Fraude
Segurança pessoal
Conteúdo
Identidade
Comunidades
Marketplace
Avaliações
Legal/privacidade
```

### 28.4 Unificação

O backoffice precisa vincular, sem fundir indevidamente:

- report;
- suporte;
- disputa;
- KYC;
- moderação de anúncio;
- sanção comunitária;
- incidente financeiro;
- apelação.

### 28.5 Conflito de interesse

Estado:

```text
NONE
POTENTIAL
RECUSED
REASSIGNED
```

Operador não deve revisar:

- próprio conteúdo;
- caso de pessoa relacionada;
- comunidade administrada por ele;
- decisão anterior quando a política exige reviewer independente.

### 28.6 Dual control

Obrigatório quando a decisão combinar alto risco com:

- suspensão permanente;
- exposição de KYC;
- hold financeiro;
- alteração de identidade;
- acesso excepcional a conteúdo privado;
- reversão de decisão crítica.

---

## 29. Privacidade do case

### 29.1 Least privilege

Operadores veem apenas:

- campos necessários;
- conteúdo vinculado;
- contexto mínimo;
- dados pessoais explicitamente revelados.

### 29.2 Reveal progressivo

```text
nome público
→ padrão

e-mail
→ ação explícita e auditada

telefone
→ necessidade transacional ou safety case

endereço
→ acesso excepcional e auditado

KYC
→ reviewer autorizado específico
```

### 29.3 Redaction

Antes de apresentar evidência:

- ocultar tokens;
- ocultar número completo de documento;
- ocultar dados bancários;
- ocultar endereço quando não necessário;
- ocultar identidade de terceiros;
- remover metadados não relevantes.

### 29.4 Retenção

Cada caso declara:

```text
retentionClass
retentionReason
retentionUntil
legalHold
```

A UI não define prazos jurídicos por conta própria.

---

## 30. Conteúdo do denunciante e da pessoa denunciada

### 30.1 Neutralidade

Textos devem evitar pressupor culpa:

```text
Pessoa denunciada
```

Não:

```text
Infrator
Golpista
Agressor
```

Antes da decisão.

### 30.2 Proteção contra retaliação

- ocultar identidade do denunciante;
- não revelar horário exato quando isso identificar a pessoa;
- não mostrar texto integral da denúncia;
- bloquear contato posterior quando solicitado;
- registrar tentativa de retaliação como novo report vinculado.

### 30.3 Má-fé e abuso de reports

Reports em massa ou abusivos podem ser tratados como outro caso, mas:

- a existência de reports anteriores não invalida automaticamente o atual;
- não aplicar sanção automática somente por volume;
- não expor ao denunciado quem denunciou;
- preservar acesso ao mecanismo de segurança.

---

## 31. Notificações de segurança

### 31.1 Categorias

```text
SAFETY_CASE
REPORT_UPDATE
SANCTION
APPEAL
SECURITY_WARNING
COMMUNITY_MODERATION
```

### 31.2 Preview

Padrão privado:

```text
Atualização de segurança
Abra a Doke para ver os detalhes.
```

### 31.3 Notificar denunciante

Eventos possíveis:

- report recebido;
- informação adicional solicitada;
- caso encerrado;
- ação tomada de forma genérica;
- apelação disponível.

### 31.4 Notificar pessoa denunciada

Somente após decisão ou quando necessário para resposta.

Não incluir:

- identidade do denunciante;
- volume de reports;
- detalhes internos;
- evidência de terceiros.

### 31.5 Badge

```text
unreadSafety
attentionRequiredSafety
```

Não misturar com unread social.

---

## 32. Centro de segurança da conta

Rota proposta:

```text
configuracoes.html?tab=seguranca-e-confianca
```

Seções:

```text
Contas bloqueadas
Contas silenciadas
Denúncias enviadas
Sanções e avisos
Apelações
Preferências de segurança
```

### 32.1 Contas bloqueadas

Cada item mostra:

- identidade pública mínima;
- data do bloqueio;
- contexto opcional;
- desbloquear.

Não mostrar descrição da denúncia na lista.

### 32.2 Reports enviados

- protocolo;
- alvo genérico;
- motivo;
- status;
- data;
- adicionar informação quando permitido.

### 32.3 Segurança em dispositivo compartilhado

Todos esses dados são account-scoped e removidos pelo logout compartilhado conforme `UX-FOUNDATION-013`.

---

## 33. Offline e degradação

### 33.1 Report offline

Reports de baixa severidade podem manter draft local criptograficamente não garantido, com copy honesta.

Reports críticos:

- tentam enviar imediatamente;
- preservam draft local account-scoped;
- oferecem copiar descrição;
- não mostram receipt falso.

### 33.2 Bloqueio offline

A interface pode aplicar contenção local imediata:

```text
LOCAL_PENDING_SYNC
```

E esconder conteúdo localmente.

Mas deve dizer:

```text
Bloqueio aplicado neste dispositivo.
Estamos confirmando a sincronização com sua conta.
```

### 33.3 Reconciliar

Quando voltar a conexão:

```text
pending block
→ comando canônico
→ snapshot confirmado
→ atualizar todas as superfícies
```

### 33.4 Conflito

Se a pessoa foi desbloqueada em outro dispositivo:

- autoridade remota vence;
- UI explica mudança;
- cache local é invalidado.

---

## 34. Acessibilidade

### 34.1 Modal de report

- `role="dialog"`;
- `aria-modal="true"`;
- título e descrição associados;
- foco inicial no heading ou primeiro motivo;
- focus trap;
- Escape preserva draft;
- retorno de foco ao trigger;
- summary de erros;
- live region única.

### 34.2 Radio group de motivos

- `<fieldset>`;
- `<legend>`;
- radios nativos;
- descrição por motivo;
- teclado padrão.

### 34.3 Consequências

Checkboxes e toggles precisam explicar:

```text
Bloquear esta conta
Impede novas mensagens e remove recomendações.
```

### 34.4 Sanções

Não depender somente de cor:

```text
Restrição temporária
Até 11 de agosto de 2026, 14:00
```

### 34.5 Conteúdo sensível

Preview pode iniciar oculto com botão:

```text
Mostrar evidência sensível
```

Ação não é ativada automaticamente por foco.

---

## 35. Conteúdo e microcopy

### 35.1 Report

Preferir:

```text
Denunciar
Enviar denúncia
Adicionar informação
Ver protocolo
```

Evitar:

```text
Acusar
Punir
Banir da Doke
Resolver agora
```

### 35.2 Bloqueio

```text
Bloquear conta
Desbloquear conta
```

Não:

```text
Remover pessoa
Excluir usuário
```

### 35.3 Mute

```text
Silenciar notificações
Silenciar conta
Silenciar conversa
```

Sempre indicar o escopo.

### 35.4 Case status

```text
Denúncia recebida
Aguardando triagem
Em análise
Precisamos de mais informações
Análise concluída
```

### 35.5 Sem promessa de SLA

Não usar:

```text
Responderemos em 24 horas
```

até existir capacidade operacional certificada.

---

## 36. Métricas

### 36.1 Métricas de produto

- report start rate;
- report completion rate;
- abandono por etapa;
- block after report rate;
- unblock rate;
- duplicate submission rate;
- unknown outcome rate;
- time to receipt;
- accessibility failure rate.

### 36.2 Métricas operacionais

- backlog por severidade;
- tempo de triagem;
- tempo de decisão;
- casos reabertos;
- apelações concedidas;
- sanções revertidas;
- evidência ausente;
- conflito de interesse;
- reports vinculados a disputa;
- reincidência.

### 36.3 Privacidade

Telemetria não inclui:

- texto da denúncia;
- conteúdo da mensagem;
- endereço;
- e-mail;
- telefone;
- evidência;
- nome real;
- token;
- URL assinada.

### 36.4 Métrica não é decisão

Uma taxa alta de reports não prova culpa.

```text
volume de reports
→ sinal de triagem
≠ sanção automática
```

---

## 37. Observabilidade e auditoria

### 37.1 Eventos

```text
report_draft_started
report_submitted
report_receipt_confirmed
report_submission_unknown
block_requested
block_confirmed
block_failed
case_created
case_assigned
case_decision_recorded
sanction_applied
sanction_reverted
appeal_submitted
appeal_decided
```

### 37.2 Campos seguros

```text
eventId
caseIdHash
reportIdHash
targetType
reasonCode
severity
status
actorRole
occurredAt
correlationId
```

### 37.3 Audit trail

Ações administrativas são append-only.

Correção cria novo evento:

```text
DECISION_REVERSED
```

Não sobrescreve o evento original.

### 37.4 Falhas

- receipt criado sem report;
- report sem snapshot;
- sanction sem decision;
- decision sem actor;
- appeal sem decisão original;
- report duplicado com idempotency conflitante;
- conteúdo removido antes de snapshot;
- block confirmado apenas localmente.

---

## 38. Threat model de UX

### 38.1 Ataques contemplados

- denunciante malicioso;
- spam de reports;
- evasão de ban;
- criação de contas novas;
- manipulação de localStorage;
- edição de mensagem após report;
- exclusão de conteúdo;
- link malicioso;
- anexo malicioso;
- impersonação;
- engenharia social;
- retaliação;
- moderador abusivo;
- conflito de interesse;
- operador comprometido;
- deep link forjado;
- replay de comando;
- double submit;
- timeout com ação concluída;
- screenshot com PII.

### 38.2 Princípios

```text
client state
→ hint de UX

server state
→ autoridade

audit log
→ evidência de decisão

local hide
→ contenção temporária
```

---

## 39. Dark patterns proibidos

- esconder `Denunciar` atrás de muitas telas;
- colocar `Agora não` com baixo contraste;
- exigir bloqueio para enviar report;
- exigir texto longo para ameaça imediata;
- ativar marketing ao abrir segurança;
- pedir acesso a contatos;
- ameaçar perda de conta por denunciar;
- sugerir que report garante remoção;
- usar badge de verificação como garantia absoluta;
- usar “IA” para regra determinística;
- forçar upload de evidência;
- impedir saída do modal sem enviar;
- revelar a identidade do denunciante;
- apagar report ao desbloquear;
- esconder apelação elegível;
- misturar suporte comercial com denúncia para reduzir volume.

---

## 40. Acceptance criteria — denúncia

- toda entidade reportável possui ID canônico;
- ação `Denunciar` possui nome acessível;
- motivo usa taxonomia canônica;
- descrição possui limite e contador;
- evidência é opcional salvo política explícita;
- envio é single-flight;
- comando possui idempotency key;
- timeout produz `UNKNOWN_OUTCOME`;
- receipt contém protocolo confirmado;
- reporter pode bloquear separadamente;
- report não altera pagamento;
- report não cancela pedido;
- report não revela reporter;
- erro preserva draft;
- direct load do receipt funciona;
- Back não reenvia mutação;
- report status é account-scoped;
- leitor de tela recebe um anúncio de sucesso.

---

## 41. Acceptance criteria — bloqueio

- `BLOCK_ACCOUNT` possui efeito documentado;
- confirmação explica pedido ativo;
- bloqueio é single-flight;
- bloqueio remoto é reconciliado;
- estado pendente é distinto de confirmado;
- mensagens novas são impedidas;
- quick actions são removidas;
- notificações são suprimidas;
- recomendações removem a conta;
- conta bloqueada não recebe identidade do blocker;
- desbloqueio é possível;
- desbloqueio não remove reports;
- logout remove cache privado;
- cross-tab recebe atualização;
- cross-device converge pela autoridade remota.

---

## 42. Acceptance criteria — comunidade

- mute, restrict, kick e ban são distintos;
- duração é estruturada;
- timezone é exibido;
- motivo obrigatório usa taxonomia;
- nota interna e explicação pública são separadas;
- ban permanente exige confirmação forte;
- owner não pode ser banido por regra local inválida;
- moderator não pode ultrapassar permissões;
- audit trail é append-only;
- pessoa banida recebe escopo e duração;
- apelação elegível aparece;
- ban comunitário não é chamado de suspensão Doke;
- conteúdo denunciado preserva snapshot;
- antispam local não declara fraude;
- backend canônico vence localStorage.

---

## 43. Acceptance criteria — operação

- reports formam casos;
- duplicatas são vinculadas;
- severidade não é apenas volume;
- operador possui least privilege;
- e-mail não aparece na lista por padrão;
- acesso a PII é auditado;
- high-risk possui dual control quando exigido;
- conflict state é suportado;
- sanção possui policy code;
- decisão possui public explanation;
- reversão não apaga histórico;
- appeal possui reviewer adequado;
- erro de fila não aparece como vazio;
- stale data permanece identificada;
- case deep link exige autorização;
- logs não contêm evidência bruta.

---

## 44. QA adversarial

### 44.1 Report

- clique duplo em enviar;
- timeout após criação real;
- troca de rota durante submit;
- logout durante draft;
- troca de conta;
- alvo excluído antes do submit;
- mensagem editada;
- mensagem apagada;
- upload falha;
- screenshot grande;
- descrição com dados pessoais;
- report duplicado;
- report sem conexão;
- Back/Forward;
- F5 no receipt;
- leitor de tela;
- zoom 400%;
- teclado virtual.

### 44.2 Block

- bloquear a si mesmo;
- bloquear conta já bloqueada;
- desbloquear em outra aba;
- pedido ativo;
- pagamento pendente;
- comunidade compartilhada;
- notificação pendente;
- quick reply aberto;
- offline;
- account switch;
- cache stale.

### 44.3 Community

- moderador tenta banir owner;
- membro tenta autoelevar papel;
- ban expirado;
- ban permanente;
- duração inválida;
- moderator removido durante ação;
- duas decisões simultâneas;
- unban e reban concorrentes;
- rejoin com identidade alternativa;
- audit store adulterado;
- link com domínio incomum;
- spam distribuído em vários canais.

### 44.4 Admin

- fila indisponível;
- stale queue;
- decisão duplicada;
- version já decidida;
- role revogada;
- operator conflict;
- evidence unavailable;
- appeal aberta durante decisão;
- reveal de PII;
- screenshot de painel;
- decisão sem public reason.

---

## 45. Handoffs de implementação

### TS-H01 — autoridade de Trust & Safety

Criar:

```text
Doke.trustSafetyExperience
```

E definir schemas, statuses e integração com autoridades existentes.

### TS-H02 — report center público

Implementar report em:

- perfil;
- anúncio;
- mensagem;
- conversa;
- Worker;
- publicação;
- avaliação;
- comunidade;
- mensagem comunitária.

### TS-H03 — account blocking

Implementar bloqueio server-canonical, cross-surface e account-scoped.

### TS-H04 — community discipline server-canonical

Migrar mute, restrict, kick, ban, unban e appeal do localStorage para autoridade remota.

### TS-H05 — evidence snapshot

Criar snapshot imutável e redaction policy para conteúdo mutável.

### TS-H06 — trust case manager

Unificar report, caso, decisão, sanção e apelação sem fundir disputas financeiras.

### TS-H07 — service moderation UX hardening

Corrigir:

- erro versus vazio;
- exposição de e-mail;
- reason codes;
- public explanation;
- apelação;
- stale state.

### TS-H08 — anti-scam interventions

Adicionar warnings contextuais, proteção de links e copy fail-closed sem claims falsos de IA.

### TS-H09 — safety center

Criar área de:

- bloqueados;
- silenciados;
- reports;
- sanções;
- apelações.

### TS-H10 — sanctions and appeals

Implementar catálogo de sanções, elegibilidade de apelação e reviewer separation.

### TS-H11 — privacy and observability

Integrar redaction, retention, account-scoped storage, audit logs e telemetria segura.

### TS-H12 — automated QA

Adicionar:

- contract tests;
- accessibility tests;
- state machine tests;
- report/block concurrency tests;
- moderation permission tests;
- visual regression;
- adversarial fixtures.

---

## 46. Ordem recomendada

```text
1. Report schema e authority
2. Evidence snapshot
3. Account blocking
4. Public report entry points
5. Receipt e safety center
6. Community moderation remota
7. Admin case manager
8. Service moderation hardening
9. Sanctions e appeals
10. Anti-scam interventions
11. Privacy e observability
12. QA completa
```

Razão:

- sem schema, cada superfície cria payload diferente;
- sem snapshot, reports perdem evidência;
- sem block, não há proteção imediata;
- sem receipt, não há confiança;
- sem case manager, decisões ficam fragmentadas;
- sem apelação, sanções ficam incompletas;
- sem QA, fluxos críticos podem produzir falsos sucessos.

---

## 47. Riscos de implementação

### 47.1 Implementar UI antes da autoridade

Risco:

```text
report modal bonito
→ toast local
→ nenhum caso real
```

Mitigação:

- capability gate;
- fail-closed;
- texto de indisponibilidade;
- nenhum sucesso sem receipt.

### 47.2 Reusar mute como block

Risco:

- mensagens ainda chegam;
- conteúdo ainda aparece;
- pessoa acredita estar protegida.

Mitigação:

- estados e APIs separados;
- testes cross-surface.

### 47.3 Reusar disputa como report

Risco:

- descrição de assédio vai para operação financeira;
- refund é alterado por moderador de conteúdo;
- evidência é exposta.

Mitigação:

- casos vinculados;
- owners separados.

### 47.4 Automatizar sanção por palavras

Risco:

- falso positivo;
- viés;
- abuso coordenado;
- claim falso de IA.

Mitigação:

- warning determinístico;
- revisão humana/policy authority para sanção.

### 47.5 Expor PII a operadores

Risco:

- screenshots;
- abuso interno;
- vazamento;
- acesso sem necessidade.

Mitigação:

- progressive reveal;
- audit;
- least privilege;
- redaction.

---

## 48. Decisões congeladas

1. `Denunciar` e `Bloquear` são ações separadas.
2. `Silenciar` nunca é sinônimo de `Bloquear`.
3. Ban comunitário não é suspensão de plataforma.
4. Report não altera pagamento, pedido ou mensagem diretamente.
5. Disputa financeira não substitui report de segurança.
6. Toda denúncia confirmada possui receipt canônico.
7. Todo timeout crítico produz `UNKNOWN_OUTCOME` até reconciliação.
8. Conteúdo mutável exige snapshot antes de remoção.
9. Identidade do denunciante permanece privada por padrão.
10. E-mail de usuário não aparece em fila administrativa sem necessidade.
11. Sanção permanente exige decisão auditável.
12. Apelação elegível precisa estar visível.
13. Regra determinística não será apresentada como IA.
14. localStorage não é autoridade de ban ou sanction.
15. Métrica de reports não prova culpa.
16. Badge de verificação não significa garantia total.
17. Bloqueio não cancela pedido nem movimenta dinheiro.
18. Operação de emergência não será prometida sem capacidade real.
19. Moderador comunitário não possui autoridade global.
20. Todo caso de alto risco preserva separação de funções.

---

## 49. Critério de conclusão do sublote

Este sublote é considerado concluído quando:

- o inventário de confiança está documentado;
- reports, blocks, mute, restrict, ban e sanction estão semanticamente separados;
- o schema de report está definido;
- a taxonomia de motivos está definida;
- o fluxo público está definido;
- receipt e unknown outcome estão definidos;
- evidence snapshot está definido;
- comunidade e plataforma possuem limites claros;
- moderação de anúncios possui hardening especificado;
- anti-scam e segurança presencial estão definidos;
- apelações estão definidas;
- case management está definido;
- privacidade operacional está integrada;
- acessibilidade está coberta;
- QA adversarial está listada;
- handoffs estão priorizados;
- nenhum runtime foi alterado.

---

## 50. Impacto futuro no produto

Após implementação, a Doke passará a oferecer:

- denúncia disponível onde o problema acontece;
- recibo verificável;
- bloqueio real e previsível;
- separação clara entre mute e block;
- proteção sem cancelar transações indevidamente;
- evidência preservada;
- moderação comunitária com autoridade remota;
- bans estruturados e apeláveis;
- fila administrativa sem falso vazio;
- menor exposição de PII;
- warnings contra golpe sem claim falso de IA;
- proteção de links e anexos;
- central de segurança da conta;
- sanções proporcionais;
- apelações rastreáveis;
- operação unificada por casos;
- audit trail append-only;
- UX acessível e fail-closed.

---

## 51. Próximo sublote recomendado

```text
UX-FOUNDATION-015 — jornadas críticas, continuidade, recovery e estados degradados
```

Escopo sugerido:

- jornada ponta a ponta por papel;
- dependências entre rotas;
- perda e recuperação de conexão;
- stale state;
- cross-tab e cross-device;
- retry seguro;
- retomada de drafts;
- reconciliação após timeout;
- continuidade de pedido e conversa;
- page crash e reload;
- manutenção programada;
- incident banners;
- readiness e launch acceptance.

---

## 52. Encerramento

O contrato deste documento não afirma que a Doke já possui moderação operacional completa.

O estado correto permanece:

```text
fundações técnicas existentes
+ autoridade parcial
+ UX pública incompleta
+ blockers explícitos
```

A implementação futura só poderá comunicar segurança, bloqueio, denúncia recebida, sanção ou proteção quando a autoridade correspondente confirmar o estado.
