# UX-FOUNDATION-017 — Onboarding, ativação, primeiros resultados e progressão por papel

## Status

- Frente: `UX-FOUNDATION`;
- Sublote: `017`;
- Natureza: especificação de Produto, UX, conteúdo, ativação, continuidade, analytics e QA;
- Branch: `ux/ux-foundation-001`;
- Escopo desta entrega: documentação somente;
- Runtime alterado: não;
- HTML alterado: não;
- CSS alterado: não;
- JavaScript alterado: não;
- Migrations alteradas: não;
- Workflows alterados: não;
- Staging acessado: não;
- Produção acessada: não;
- Merge autorizado: não;
- Ready for review autorizado: não;
- Head lógico PAY observado: `aeb45d94afd3d803bd0cc3c245f7a9b412270a2e`;
- Head UX anterior: `0ff10d7e6dec8eb3ed988ab70fef72dc0cbc1060`;
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-016`.

---

## 1. Objetivo

Definir como a Doke deve conduzir pessoas desde a primeira intenção até o primeiro valor real no marketplace, sem confundir:

- cadastro com ativação;
- preenchimento de perfil com sucesso;
- clique com resultado;
- papel de conta com capacidade operacional;
- perfil profissional criado com profissional ativo;
- verificação enviada com verificação aprovada;
- anúncio criado com anúncio publicado;
- anúncio publicado com primeiro lead qualificado;
- solicitação iniciada com pedido confirmado;
- primeira visita com retenção;
- progresso visual com autoridade canônica.

O contrato cobre:

- preservação da intenção de entrada;
- cadastro client-first;
- confirmação de e-mail;
- onboarding obrigatório e opcional;
- configuração mínima da conta;
- primeira busca;
- primeiro resultado relevante;
- primeiro detalhe de serviço;
- primeira solicitação de orçamento;
- primeiro pedido confirmado;
- primeira resposta profissional;
- conversão de cliente para profissional;
- perfil profissional;
- verificação de identidade;
- primeiro anúncio;
- primeira solicitação qualificada;
- primeiro pedido aceito;
- primeiro serviço concluído;
- progressão por papel;
- retomada entre sessões e dispositivos;
- next best action;
- reengajamento;
- métricas de ativação;
- privacidade;
- acessibilidade;
- estados degradados;
- QA.

A implementação futura deve preservar duas decisões estruturais já corretas:

1. toda conta nasce como cliente;
2. `tornar-profissional.html` permanece uma jornada própria, não uma aba de Configurações.

---

## 2. Princípio central

```text
intenção da pessoa
→ capacidade mínima necessária
→ primeiro valor observável
→ próximo melhor passo
→ resultado autoritativo
→ progressão sustentável
```

Nunca:

```text
cadastro concluído
→ onboarding concluído
→ usuário ativado
```

Também nunca:

```text
perfil 100%
→ marketplace funcionando
```

Ativação é uma progressão de valor, não uma porcentagem arbitrária de campos preenchidos.

---

## 3. Invariantes obrigatórios

```text
registro ≠ ativação

login ≠ retomada da intenção

perfil preenchido ≠ primeiro valor

localização salva ≠ descoberta bem-sucedida

resultado exibido ≠ resultado relevante

CTA clicado ≠ jornada iniciada

jornada iniciada ≠ comando aceito

comando aceito ≠ resultado confirmado

perfil profissional criado ≠ identidade verificada

identidade verificada ≠ anúncio publicado

anúncio publicado ≠ lead qualificado

lead recebido ≠ resposta enviada

resposta enviada ≠ pedido aceito

pedido aceito ≠ serviço concluído

serviço concluído ≠ retenção

role da sessão ≠ capacidade canônica

progresso visual ≠ autoridade

skip ≠ conclusão silenciosa

optional ≠ obrigatório disfarçado

close ≠ abandono

reload ≠ nova jornada

retry ≠ nova intenção

primeiro acesso ≠ primeira sessão do navegador
```

Além disso:

1. a intenção que levou a pessoa ao cadastro deve sobreviver ao login;
2. toda etapa deve explicar por que é necessária;
3. nenhuma etapa opcional pode bloquear valor essencial;
4. dados sensíveis devem ser pedidos apenas quando necessários;
5. localização exata não deve ser requisito para exploração pública;
6. o CEP não pode ser enviado a terceiro sem ação explícita;
7. o sistema deve oferecer entrada manual de cidade e UF;
8. o cadastro profissional deve continuar separado de Configurações;
9. a verificação profissional deve antecipar requisitos antes da coleta;
10. arquivos que não persistem não podem parecer persistidos;
11. toda operação crítica deve suportar `UNKNOWN_OUTCOME`;
12. progresso deve ser account-scoped e server-reconciled;
13. uma superfície deve apresentar no máximo uma ação primária de progressão;
14. a próxima ação deve respeitar bloqueios legais, financeiros e de segurança;
15. nenhum milestone pode ser confirmado apenas por evento client-side quando existir autoridade remota;
16. o onboarding não pode impedir navegação pública sem necessidade material;
17. a Home congelada não pode ser redesenhada como consequência deste contrato;
18. qualquer intervenção na Home deve ser contextual, progressiva e reversível;
19. onboarding não pode fabricar urgência, escassez ou medo;
20. ativação deve ser mensurada por coortes elegíveis, não por page views.

---

## 4. Escopo auditado

### 4.1 Cadastro e autenticação

- `auth/cadastro.html`;
- `assets/js/pages/auth.js`;
- `assets/js/services/auth-service.js`;
- `assets/js/services/auth-registration-authority.js`;
- contrato de username e onboarding;
- redirecionamento pós-autenticação;
- confirmação de e-mail.

### 4.2 Onboarding da conta

- `index.html`;
- `assets/js/pages/home.js`;
- `assets/js/services/onboarding-service.js`;
- estado remoto da identidade;
- cidade, UF, CEP, bio e interesses;
- modal de configuração rápida.

### 4.3 Perfil pessoal

- `meu-perfil.html`;
- `assets/js/pages/owner-profile-experience.js`;
- `assets/js/services/profile-service.js`;
- empty states de perfil;
- progressão profissional no perfil.

### 4.4 Conversão profissional

- `tornar-profissional.html`;
- `assets/js/pages/tornar-profissional.js`;
- `assets/js/pages/professional-onboarding-experience.js`;
- `assets/js/services/professional-profile-setup-service.js`;
- drafts;
- evidência opcional;
- confirmação e handoff.

### 4.5 Verificação profissional

- `verificacao-profissional.html`;
- `assets/js/pages/verificacao-profissional.js`;
- `assets/js/services/professional-identity-verification-service.js`;
- dados PF/PJ;
- documentos;
- selfie;
- comprovante de endereço;
- upload assinado;
- estados de análise e rejeição.

### 4.6 Progressão e navegação

- `assets/js/core/navigation-registry.js`;
- destino de perfil;
- estados de setup;
- estados de verificação;
- papel profissional ativo;
- rotas de anúncio, pedido, mensagens e carteira.

### 4.7 Primeiro valor no marketplace

- Home;
- busca;
- Resultados;
- detalhe de anúncio;
- formulário de orçamento;
- Pedidos;
- Mensagens;
- publicação de anúncio;
- moderação de anúncio;
- primeira solicitação;
- primeira resposta.

### 4.8 Fora deste sublote

- implementação visual;
- mudanças de schema remoto;
- aplicação de migrations;
- revisão jurídica de KYC;
- definição de SLA real de verificação;
- ativação de pagamentos;
- configuração de e-mail transacional;
- contratação de provedor de analytics;
- campanhas de marketing;
- push notification real;
- automação de CRM;
- experimentos em produção.

---

## 5. Inventário positivo existente

### 5.1 Cadastro client-first

O cadastro informa que toda conta começa como cliente.

A autoridade de registro força o papel inicial para `client`, mesmo quando outro papel é solicitado pelo caller.

Essa decisão deve ser preservada porque:

- reduz autoridade precoce;
- separa identidade básica de capacidade profissional;
- impede promoção por payload de navegador;
- permite que a mesma conta contrate e, posteriormente, ofereça serviços;
- mantém a promoção profissional dependente de perfil e verificação.

### 5.2 Username com autoridade remota

O cadastro possui:

- normalização de username;
- checagem de disponibilidade;
- prevenção de nomes reservados;
- validação server-side;
- feedback durante preenchimento.

A UX futura deve manter essa autoridade e corrigir apenas concorrência visual de respostas assíncronas.

### 5.3 Onboarding de conta reconciliado

O onboarding da conta utiliza ações server-side para:

- buscar o estado canônico;
- concluir onboarding;
- materializar cidade e estado;
- persistir bio e interesses;
- devolver perfil reconciliado;
- confirmar conclusão.

O navegador não reescreve manualmente o snapshot público da sessão.

Essa é uma fundação correta.

### 5.4 Perfil profissional em jornada separada

`tornar-profissional.html` é uma página dedicada.

Ela possui:

- objetivo próprio;
- stepper;
- campos de atuação;
- revisão;
- termos;
- save and exit;
- status de perfil;
- handoff para verificação.

Essa separação deve ser preservada.

### 5.5 Draft profissional remoto

O perfil profissional pode ser salvo como draft no servidor.

Isso permite:

- sair e retornar;
- continuar em outro dispositivo;
- não depender de `localStorage` como autoridade;
- manter papel de cliente até conclusão e verificação.

### 5.6 Verificação com autoridade remota

O fluxo de identidade possui:

- validação PF/PJ;
- idade mínima;
- validação de arquivos;
- upload intent;
- signed URL;
- storage remoto;
- submissão server-owned;
- revisão;
- rejeição com motivo;
- aprovação reconciliada com promoção para profissional;
- falha fechada quando o servidor não confirma o papel.

Essa fundação é crítica e deve permanecer.

### 5.7 Resolver de progressão profissional

O registry de navegação reconhece:

- onboarding incompleto;
- verificação pendente;
- verificação rejeitada;
- profissional suspenso;
- profissional ativo;
- perfil pessoal.

Ele já evita retornar indevidamente um perfil ativo ao onboarding quando a sessão está temporariamente desatualizada.

### 5.8 Preservação de rota `next`

O auth possui suporte a destino pós-autenticação com validação de mesma origem.

Essa capacidade deve ser ampliada para preservar intenção e entidade, em vez de ser usada apenas como URL de retorno genérica.

---

## 6. Causa raiz

A Doke possui três jornadas de onboarding funcionalmente separadas:

```text
cadastro
→ configuração da conta na Home
→ conversão profissional
```

Cada uma possui:

- estado próprio;
- tela própria;
- sucesso próprio;
- tratamento de erro próprio;
- persistência própria;
- redirecionamento próprio.

Mas não existe uma autoridade transversal que responda:

```text
por que esta pessoa entrou?
qual papel ela deseja exercer agora?
qual ação foi interrompida pelo login?
qual é o mínimo necessário para retomar essa ação?
qual foi o primeiro valor entregue?
qual milestone foi confirmado?
qual é o próximo melhor passo?
qual bloqueio impede progressão?
qual dado é opcional?
qual dado expirou?
qual etapa pode ser adiada?
qual jornada deve ser retomada em outro dispositivo?
qual ação não deve ser sugerida ainda?
```

A consequência é um conjunto de sucessos locais sem progressão coerente.

---

## 7. Achados P0

### ACT-P0-01 — intenção de aquisição pode ser perdida

Uma pessoa pode entrar na Doke por:

- anúncio específico;
- categoria;
- busca;
- convite para comunidade;
- CTA de orçamento;
- CTA de mensagem;
- CTA de favorito;
- CTA “Anunciar meu serviço”;
- link de pedido;
- notificação;
- deep link.

Após cadastro ou login, o fallback é a Home.

Uma URL `next` ajuda, mas não carrega semântica suficiente para:

- retomar comando;
- explicar retorno;
- preservar query;
- preservar entidade;
- preservar papel desejado;
- evitar ação duplicada;
- distinguir visualização de mutação.

Consequência:

```text
intenção de contratar
→ cadastro
→ Home genérica
→ pessoa precisa recomeçar
```

Ou:

```text
intenção de oferecer serviço
→ cadastro client-first
→ Home
→ jornada profissional não é retomada
```

### ACT-P0-02 — nenhum contrato captura intenção de papel

O cadastro corretamente cria todas as contas como cliente.

Porém, ele não preserva semanticamente se a pessoa pretende:

```text
contratar
oferecer serviços
explorar
entrar por convite
resolver um pedido existente
```

Client-first é uma regra de autoridade.

Não deve impedir a captura de intenção.

```text
desiredRole = offer
```

não significa:

```text
role = professional
```

Significa apenas que, após a configuração mínima, a próxima jornada apropriada é `tornar-profissional.html`.

### ACT-P0-03 — configuração da conta bloqueia a Home antes do primeiro valor

O onboarding de conta é um modal sobre a Home.

A pessoa precisa informar localização antes de usar plenamente a superfície.

Isso pode ocorrer antes de:

- entender o produto;
- ver resultados;
- confirmar se há oferta relevante;
- decidir contratar;
- experimentar busca;
- entender por que a localização é útil.

A localização pode ser necessária para relevância local.

Ela não deve ser requisitada de forma global antes de qualquer valor quando a pessoa apenas quer explorar.

### ACT-P0-04 — “Concluir sem extras” não permite adiar localização

A ação aparenta ser um skip amplo.

Na prática, ela ignora somente bio e interesses.

Cidade, UF e CEP continuam necessários.

O texto deve ser semanticamente preciso.

Alternativas:

```text
Continuar só com localização
```

ou, quando possível:

```text
Agora não
```

### ACT-P0-05 — falha de resolução fecha onboarding silenciosamente

Quando `resolveState()` falha na Home, a interface fecha o overlay e registra erro no console.

A pessoa não recebe:

- explicação;
- retry;
- status degradado;
- forma de continuar;
- indicação de que a configuração ainda está pendente.

Isso pode gerar uma conta em estado incompleto sem caminho visível de recuperação.

### ACT-P0-06 — CEP pode ser transferido automaticamente

Ao atingir oito dígitos, a Home consulta ViaCEP silenciosamente.

Esse comportamento viola o contrato de privacidade definido no UX-013.

A consulta deve ocorrer apenas após ação explícita:

```text
Buscar CEP
```

Também deve existir entrada manual de cidade e UF.

### ACT-P0-07 — três estados são insuficientes

O onboarding de conta usa:

```text
not_started
in_progress
completed
```

Não representa:

```text
REQUIRED
OPTIONAL
BLOCKED
DEGRADED
SUBMITTING
UNKNOWN_OUTCOME
RECONCILING
STALE
EXPIRED
CONFLICT
```

Em falhas ambíguas, a interface pode não saber se deve:

- reabrir modal;
- manter fechado;
- permitir ação;
- reenviar comando;
- reconciliar.

### ACT-P0-08 — conclusão do onboarding é confundida com ativação

Hoje, onboarding concluído significa essencialmente:

- cidade e estado confirmados;
- opcionais possivelmente preenchidos.

Isso não comprova que o cliente:

- encontrou oferta relevante;
- abriu um serviço;
- iniciou um orçamento;
- enviou uma solicitação;
- recebeu resposta.

A Doke precisa separar:

```text
ACCOUNT_SETUP_COMPLETED
DISCOVERY_ACTIVATED
MARKETPLACE_ACTIVATED
TRANSACTION_ACTIVATED
```

### ACT-P0-09 — não existe first-result contract para cliente

A primeira experiência de busca não possui uma progressão canônica que trate:

- zero resultados;
- resultados amplos demais;
- localização indisponível;
- categoria sem oferta;
- busca mal digitada;
- serviço remoto;
- serviço local;
- fallback editorial;
- expansão de raio;
- refinamento de intenção.

O cliente pode concluir onboarding e ainda não receber nenhum resultado útil.

### ACT-P0-10 — não existe checklist de ativação do cliente

O perfil pessoal apresenta fallbacks de conteúdo incompleto.

Não existe uma autoridade que mostre, de modo contextual:

```text
adicione localização para melhorar resultados
salve um serviço
envie sua primeira solicitação
acompanhe a resposta
```

Um checklist genérico permanente também não é desejável.

A Doke precisa de uma única next best action contextual.

### ACT-P0-11 — evidência profissional opcional não é realmente persistida

A jornada de perfil profissional permite selecionar:

- foto de trabalho;
- certificado;
- portfólio;
- PDF.

Porém, o serviço normaliza apenas:

- nome do arquivo;
- tamanho;
- MIME type.

O binário não é enviado nessa etapa.

A interface pode levar a pessoa a acreditar que a evidência foi salva.

Contrato obrigatório:

```text
se o arquivo não for persistido
→ não mostrar upload como concluído
```

Opções válidas:

1. remover a evidência desta etapa;
2. mover portfólio para perfil ou anúncio;
3. implementar upload remoto real;
4. informar explicitamente que o arquivo será solicitado novamente.

A opção preferida é remover esse upload do setup básico e tratar portfólio em uma jornada própria, não misturado com identidade.

### ACT-P0-12 — autosaves profissionais podem competir

O setup profissional agenda save após mudanças e transições.

Cada save chama a autoridade remota.

Não foi observado contrato de:

- revision;
- latest-wins;
- abort;
- queue;
- single-flight por draft;
- payload fingerprint;
- conflito.

Uma resposta antiga pode confirmar visualmente conteúdo anterior após uma resposta nova.

O UX-015 já definiu fences e drafts versionados; o onboarding deve adotá-los.

### ACT-P0-13 — arquivos de verificação parecem restaurados sem blob garantido

O draft de verificação pode reidratar metadados de arquivo:

- nome;
- tamanho;
- tipo.

Após reload, o blob pode não existir.

A pessoa pode chegar à revisão acreditando que os arquivos estão prontos e descobrir somente no envio que deve selecioná-los novamente.

A interface deve distinguir:

```text
arquivo disponível para envio
arquivo registrado, mas precisa ser selecionado novamente
arquivo enviado e confirmado
arquivo expirado
```

### ACT-P0-14 — requisitos profissionais aparecem tarde

A jornada inicial de perfil não apresenta, antes do investimento de tempo, um preflight completo com:

- idade mínima;
- PF ou PJ;
- nome legal;
- CPF ou CNPJ;
- endereço;
- documento;
- selfie;
- comprovante;
- uso dos dados;
- possibilidade de correção;
- separação entre perfil e KYC;
- estado de análise.

Isso pode provocar abandono tardio depois que a pessoa já escreveu bio, especialidades e região.

### ACT-P0-15 — não existe post-verification activation

Quando a identidade é verificada, o papel profissional é liberado.

Mas não existe uma autoridade transversal que conduza para:

```text
criar primeiro anúncio
completar disponibilidade
configurar resposta
publicar anúncio
acompanhar moderação
receber primeiro lead
responder primeiro lead
```

A pessoa pode terminar uma jornada longa e cair em um perfil sem ação clara.

### ACT-P0-16 — anúncio publicado pode virar dead end

Publicar anúncio não significa que a oferta está pronta para gerar valor.

Ainda podem faltar:

- preço ou modelo de orçamento claro;
- área de atendimento;
- disponibilidade;
- mídia útil;
- escopo;
- tempo de resposta;
- perfil completo;
- moderação aprovada;
- descoberta ativa.

O sistema não deve comemorar “pronto para receber clientes” sem evidência de publicação e elegibilidade.

### ACT-P0-17 — não existe first-lead contract

O primeiro pedido ou orçamento do profissional exige orientação especial:

- explicar prazo e expectativa;
- mostrar dados suficientes sem expor PII excessiva;
- oferecer resposta estruturada;
- explicar diferença entre mensagem, proposta e aceite;
- impedir resposta duplicada;
- mostrar próximo estado.

Sem isso, o primeiro lead pode ser desperdiçado.

### ACT-P0-18 — progressão é inferida por rotas

O registry sabe para onde encaminhar a pessoa conforme status.

Isso é útil, mas rota não é plano de ativação.

Ele não representa:

- milestone confirmado;
- bloqueio;
- evidência;
- dependência;
- prioridade;
- expiração;
- intenção original;
- próxima ação.

### ACT-P0-19 — não existe reengajamento governado

A Doke ainda não possui contrato para lembrar, sem spam:

- confirmar e-mail;
- concluir configuração mínima;
- continuar perfil profissional;
- reenviar documento rejeitado;
- publicar primeiro anúncio;
- responder primeiro pedido.

Sem governança, lembretes podem ser:

- repetitivos;
- irrelevantes;
- enviados depois da conclusão;
- sensíveis em preview;
- acionados por estado stale.

### ACT-P0-20 — ativação não possui definição mensurável

Sem um metric dictionary de ativação, equipes podem chamar de “ativado” qualquer pessoa que:

- criou conta;
- confirmou e-mail;
- preencheu cidade;
- visitou Home;
- clicou em serviço;
- abriu formulário.

O UX-016 exige definições com fonte, população, denominador e autoridade.

---

## 8. Autoridade proposta

```text
Doke.activationExperience
```

Essa autoridade não substitui:

- autenticação;
- perfil;
- onboarding service;
- professional profile setup;
- verificação;
- navegação;
- continuidade;
- analytics;
- notificações.

Ela coordena a progressão entre essas autoridades.

### 8.1 Responsabilidades

```text
captureIntent()
resumeIntent()
expireIntent()
getActivationSnapshot()
resolveRolePath()
resolveNextBestAction()
registerMilestone()
reconcileMilestones()
getBlockingRequirement()
getOptionalEnrichment()
markStepStarted()
markStepConfirmed()
markStepRejected()
markStepUnknown()
resumeJourney()
getProgressPresentation()
getReengagementEligibility()
```

### 8.2 Não responsabilidades

A autoridade não deve:

- criar sessão;
- promover papel;
- aprovar verificação;
- publicar anúncio;
- criar pedido;
- confirmar pagamento;
- modificar ledger;
- decidir sanção;
- armazenar documentos;
- declarar sucesso sem receipt.

### 8.3 Integrações

```text
Doke.activationExperience
├── Doke.continuityExperience
├── Doke.analyticsExperience
├── Doke.privacyExperience
├── Doke.notificationCenter
├── Doke.formExperience
├── Doke.formMutationManager
├── Doke.overlayManager
├── Doke.routeFocusManager
├── Doke.contentCatalog
├── Doke.trustSafetyExperience
├── Doke.services.onboarding
├── Doke.services.professionalProfileSetup
├── Doke.services.professionalIdentityVerification
├── DokeNavigationRegistry
└── autoridades de pedidos, mensagens e anúncios
```

---

## 9. Modelo canônico de intenção

```text
ActivationIntentEnvelope
├── intentId
├── journeyId
├── accountId
├── guestSessionId
├── desiredMode
├── source
├── sourceSurface
├── campaignRef
├── targetRoute
├── targetEntityType
├── targetEntityId
├── searchContext
├── categoryRef
├── locationGranularity
├── requestedAction
├── requiresAuthentication
├── requiresAccountSetup
├── requiresProfessionalRole
├── createdAt
├── expiresAt
├── resumeCount
├── lastResumeAt
├── privacyClass
├── consentSnapshotId
└── status
```

### 9.1 `desiredMode`

```text
HIRE
OFFER
EXPLORE
JOIN_COMMUNITY
MANAGE_EXISTING
RESPOND_TO_NOTIFICATION
```

Isso não altera o papel canônico da conta.

### 9.2 `requestedAction`

Exemplos:

```text
VIEW_SERVICE
SAVE_FAVORITE
START_QUOTE
SEND_MESSAGE
CREATE_LISTING
CONTINUE_PRO_SETUP
REVIEW_ORDER
JOIN_COMMUNITY
```

### 9.3 Estados da intenção

```text
CAPTURED
PAUSED_FOR_AUTH
PAUSED_FOR_SETUP
PAUSED_FOR_PERMISSION
READY_TO_RESUME
RESUMING
RESUMED
COMPLETED
CANCELLED
EXPIRED
CONFLICT
UNKNOWN_OUTCOME
```

### 9.4 Expiração

A intenção deve expirar quando:

- a entidade deixa de existir;
- o anúncio não está mais público;
- o pedido não pertence mais à pessoa;
- o convite expirou;
- a ação deixou de ser permitida;
- a janela temporal terminou;
- a pessoa iniciou uma intenção incompatível.

Expirar não significa apagar contexto imediatamente.

A UX deve explicar:

```text
Este anúncio não está mais disponível.
Veja serviços semelhantes.
```

---

## 10. Preservação da intenção no auth

### 10.1 Visitante inicia orçamento

```text
anúncio
→ Solicitar orçamento
→ capturar intenção
→ login/cadastro
→ configuração mínima necessária
→ retornar ao anúncio ou formulário
→ retomar mesma intenção
```

### 10.2 Visitante quer anunciar

```text
Home
→ Anunciar meu serviço
→ capturar OFFER
→ login/cadastro client-first
→ configuração mínima
→ tornar-profissional.html
```

### 10.3 Visitante favorita

```text
card
→ favorito
→ autenticação
→ retornar ao card
→ confirmar favorito uma vez
```

Não:

```text
favorito
→ login
→ Home
→ ação perdida
```

### 10.4 Segurança de retorno

- somente mesma origem;
- somente rotas allowlisted;
- target ID validado;
- nenhuma URL externa arbitrária;
- nenhum payload sensível em query string;
- nenhum comando financeiro automático após login;
- mutações sempre exigem nova confirmação quando apropriado.

---

## 11. Camadas de ativação

### 11.1 Registro

```text
REGISTERED
```

Autoridade:

- Auth provider;
- materialização server-side.

Não representa ativação.

### 11.2 Identidade de acesso

```text
EMAIL_CONFIRMED
AUTHENTICATED
```

Autoridade:

- provider de autenticação.

Não representa ativação de marketplace.

### 11.3 Configuração mínima

```text
ACCOUNT_SETUP_COMPLETED
```

Autoridade:

- onboarding server-side.

Deve conter somente dados realmente necessários à experiência escolhida.

### 11.4 Ativação de descoberta

```text
DISCOVERY_ACTIVATED
```

Cliente recebeu pelo menos um resultado elegível e útil para uma intenção explícita.

Isso exige:

- query, categoria ou navegação intencional;
- resultado não editorialmente fabricado como match;
- disponibilidade real;
- apresentação sem erro;
- evento de impressão qualificada.

### 11.5 Ativação de marketplace do cliente

```text
CLIENT_MARKETPLACE_ACTIVATED
```

Definição recomendada:

```text
primeira solicitação de orçamento ou pedido
confirmada pela autoridade
```

### 11.6 Ativação de resposta

```text
CLIENT_RESPONSE_ACTIVATED
```

Primeira resposta profissional canônica recebida.

### 11.7 Ativação profissional

```text
PROFESSIONAL_ROLE_ACTIVATED
```

Exige:

- perfil profissional ativo;
- verificação aprovada;
- papel reconciliado.

### 11.8 Ativação de oferta

```text
SUPPLY_ACTIVATED
```

Exige:

- anúncio publicado;
- moderação aprovada;
- anúncio elegível para descoberta.

### 11.9 Ativação de lead

```text
PROFESSIONAL_LEAD_ACTIVATED
```

Primeira solicitação qualificada recebida.

### 11.10 Ativação transacional

```text
ORDER_ACTIVATED
```

Pedido confirmado e aceito conforme autoridade de pedidos.

### 11.11 Valor concluído

```text
MARKETPLACE_VALUE_COMPLETED
```

Serviço concluído por autoridade canônica.

Não implica pagamento real enquanto PAY permanecer bloqueado.

### 11.12 Retenção

```text
RETURNING_VALUE
```

Nova ação de valor em janela posterior, como:

- nova busca intencional;
- recontratação;
- novo anúncio;
- resposta a novo lead;
- novo pedido concluído.

---

## 12. Estados canônicos de milestone

```text
NOT_STARTED
AVAILABLE
IN_PROGRESS
BLOCKED
SUBMITTING
UNKNOWN_OUTCOME
RECONCILING
CONFIRMED
REJECTED
SKIPPED
EXPIRED
STALE
CONFLICT
NOT_APPLICABLE
```

### 12.1 Milestone record

```text
ActivationMilestone
├── milestoneId
├── milestoneType
├── accountId
├── rolePath
├── journeyId
├── status
├── authority
├── authorityReceipt
├── entityType
├── entityId
├── startedAt
├── confirmedAt
├── rejectedAt
├── expiresAt
├── revision
├── source
├── blockers
├── optional
├── staleAt
└── presentationCode
```

### 12.2 Evidência

Todo milestone confirmado deve registrar:

- autoridade;
- receipt ou ID canônico;
- timestamp;
- revision;
- entidade relacionada.

Nunca confirmar com:

- DOM visível;
- click handler;
- `localStorage`;
- classe CSS;
- Promise local sem reconciliação.

---

## 13. Progressão do cliente

```text
ACCOUNT_REGISTERED
→ EMAIL_CONFIRMATION_PENDING
→ AUTHENTICATED
→ ACCOUNT_SETUP_AVAILABLE
→ DISCOVERY_READY
→ FIRST_RELEVANT_RESULT
→ FIRST_SERVICE_DETAIL
→ FIRST_QUOTE_STARTED
→ FIRST_REQUEST_CONFIRMED
→ FIRST_PROVIDER_RESPONSE
→ FIRST_ORDER_ACTIVE
→ FIRST_ORDER_COMPLETED
→ RETURNING_CLIENT
```

### 13.1 Cadastro

Objetivo:

- criar acesso seguro;
- preservar intenção;
- explicar client-first;
- não coletar dados desnecessários.

Campos mínimos:

- username;
- nome de exibição;
- e-mail;
- senha.

Não pedir no cadastro:

- CEP;
- endereço;
- CPF;
- interesses;
- bio;
- documentos;
- papel profissional.

### 13.2 Confirmação de e-mail

A superfície deve oferecer:

- e-mail mascarado;
- reenviar;
- alterar e-mail;
- estado de envio;
- limite de tentativas;
- link para entrar após confirmação;
- mensagem neutra sobre entrega;
- recovery quando o link expira.

Não afirmar:

```text
E-mail enviado
```

sem confirmação da autoridade de envio.

Enquanto MAIL-001 estiver bloqueado, a copy deve ser fail-closed.

### 13.3 Configuração mínima

A configuração deve ser proporcional à intenção.

#### Exploração

Pode prosseguir sem localização exata.

#### Busca local

Solicitar:

- cidade e UF;
- ou CEP por ação explícita.

#### Orçamento

Solicitar apenas os dados exigidos pelo fluxo.

#### Comunidade

Não exigir localização de serviço sem necessidade.

### 13.4 Primeiro resultado relevante

Um resultado relevante deve:

- corresponder à intenção;
- respeitar localização conhecida;
- declarar quando localização é aproximada;
- usar fallback claramente rotulado;
- não fabricar proximidade;
- não fabricar disponibilidade;
- não inventar avaliação;
- não esconder ausência de match.

### 13.5 Primeiro detalhe

A página deve responder rapidamente:

- o que é oferecido;
- por quem;
- onde;
- por qual preço ou modelo de orçamento;
- o que está incluído;
- como solicitar;
- quais sinais de confiança existem;
- quais sinais ainda não existem.

### 13.6 Primeira solicitação

O fluxo deve:

- preservar draft;
- explicar etapas;
- solicitar apenas dados relevantes;
- mostrar resumo;
- gerar receipt;
- reconciliar `UNKNOWN_OUTCOME`;
- retornar ao pedido confirmado.

### 13.7 Primeira resposta

Ao receber resposta:

- explicar proposta vs mensagem;
- mostrar próximo passo;
- não pressionar aceite;
- mostrar prazo quando autoritativo;
- preservar segurança e denúncia;
- evitar notificação com conteúdo sensível.

---

## 14. Progressão profissional

```text
CLIENT_ACCOUNT_ACTIVE
→ PRO_INTENT_DECLARED
→ PRO_PREFLIGHT_VIEWED
→ PRO_PROFILE_DRAFT
→ PRO_PROFILE_CREATED
→ VERIFICATION_NOT_STARTED
→ VERIFICATION_DRAFT
→ VERIFICATION_SUBMITTED
→ VERIFICATION_UNDER_REVIEW
→ VERIFICATION_REJECTED | PROFESSIONAL_ACTIVE
→ FIRST_LISTING_DRAFT
→ FIRST_LISTING_SUBMITTED
→ FIRST_LISTING_PUBLISHED
→ FIRST_QUALIFIED_REQUEST
→ FIRST_RESPONSE_CONFIRMED
→ FIRST_ORDER_ACCEPTED
→ FIRST_ORDER_COMPLETED
→ PAYOUT_ELIGIBILITY_BLOCKED_OR_AVAILABLE
→ RETURNING_PROFESSIONAL
```

### 14.1 Conversão client-first

A pessoa continua cliente durante:

- declaração de intenção;
- perfil draft;
- perfil criado;
- verificação draft;
- verificação em análise.

Isso deve ser explicado positivamente:

```text
Você continua usando a Doke como cliente enquanto prepara seu perfil profissional.
```

### 14.2 Preflight profissional

Antes de iniciar o formulário, apresentar:

- benefício da jornada;
- etapas;
- tempo estimado como intervalo, apenas se medido;
- possibilidade de salvar;
- requisitos de perfil;
- requisitos de identidade;
- idade mínima;
- PF/PJ;
- arquivos necessários;
- uso de dados;
- possibilidade de correção;
- recursos liberados após aprovação;
- recursos ainda bloqueados.

Sem SLA real, usar:

```text
Você poderá acompanhar o status pela Doke.
```

Não:

```text
Aprovação em até 24 horas.
```

### 14.3 Perfil profissional

Campos de setup devem focar oferta:

- categoria;
- serviços;
- apresentação;
- região ou modalidade;
- experiência declarada.

Não misturar:

- KYC;
- documentos legais;
- portfólio público;
- comprovantes de qualidade;
- dados bancários.

### 14.4 Evidência de experiência

A decisão recomendada é:

```text
remover upload do setup básico
→ oferecer portfólio após ativação
```

Se mantido:

- upload real;
- estado de progresso;
- receipt;
- preview;
- remoção;
- expiração;
- privacidade;
- destino de uso;
- distinção entre portfólio e KYC.

### 14.5 Verificação de identidade

O fluxo deve começar com checklist:

```text
Pessoa física
- documento com foto
- selfie atual
- comprovante de endereço
- CPF
- data de nascimento

Pessoa jurídica
- CNPJ
- responsável legal
- documento do responsável
- documento da empresa
- comprovante de endereço
```

A lista final deve ser definida pela autoridade jurídica e KYC.

### 14.6 Continuidade de arquivos

Estados de arquivo:

```text
NOT_SELECTED
LOCAL_AVAILABLE
LOCAL_METADATA_ONLY
UPLOADING
UPLOADED
CONFIRMED
EXPIRED
REJECTED
NEEDS_RESELECTION
```

Se o blob não existe:

```text
Este arquivo precisa ser selecionado novamente antes do envio.
```

Mostrar antes da etapa final.

### 14.7 Aprovação

A interface só pode apresentar profissional ativo quando:

- verificação = `verified`;
- perfil = `active`;
- role reconciliado = `professional`;
- autoridade remota confirmou.

### 14.8 Primeiro anúncio

Após ativação:

- CTA primário: `Criar primeiro anúncio`;
- prefill com categoria, especialidades e região;
- não copiar bio inteira como descrição;
- mostrar escopo necessário;
- permitir draft;
- explicar moderação;
- indicar o que ficará público.

### 14.9 Publicação

Estados:

```text
DRAFT
SUBMITTING
PENDING_REVIEW
CHANGES_REQUIRED
REJECTED
PUBLISHED
PAUSED
SUSPENDED
UNKNOWN_OUTCOME
```

A ativação de oferta só ocorre em `PUBLISHED` e elegível para descoberta.

### 14.10 Primeiro lead

O primeiro lead deve apresentar:

- origem;
- serviço relacionado;
- contexto suficiente;
- status;
- prazo, se existir;
- resposta estruturada;
- segurança;
- opção de recusa;
- motivo de incompatibilidade opcional;
- próximo passo.

### 14.11 Primeiro pedido

Ao aceitar:

- explicar compromisso;
- confirmar disponibilidade;
- mostrar agenda;
- evitar aceite duplicado;
- gerar receipt;
- encaminhar para conversa.

### 14.12 Pagamento e payout

Enquanto PAY estiver bloqueado:

```text
FIRST_PAYOUT_ELIGIBLE
```

não pode ser tratado como recurso ativo.

A progressão deve mostrar:

- indisponível;
- simulado;
- planejado;
- bloqueado por autoridade.

Nunca prometer repasse real.

---

## 15. Next Best Action

### 15.1 Regra central

Cada superfície pode apresentar no máximo uma ação principal de progressão.

### 15.2 Ordem de prioridade

```text
1. segurança crítica
2. autoridade ou bloqueio obrigatório
3. recovery de operação pendente
4. intenção interrompida
5. ativação de valor
6. progressão por papel
7. enriquecimento opcional
8. educação
9. promoção
```

### 15.3 Exemplos do cliente

#### E-mail pendente

```text
Confirmar e-mail
```

#### Intenção de orçamento pausada

```text
Continuar solicitação
```

#### Sem localização e busca local

```text
Informar cidade
```

#### Solicitação confirmada

```text
Acompanhar pedido
```

#### Resposta recebida

```text
Ver resposta
```

### 15.4 Exemplos do profissional

#### Perfil draft

```text
Continuar perfil profissional
```

#### Perfil criado

```text
Iniciar verificação
```

#### Documento rejeitado

```text
Corrigir e reenviar
```

#### Profissional ativo sem anúncio

```text
Criar primeiro anúncio
```

#### Anúncio em revisão

```text
Acompanhar análise
```

#### Primeiro lead

```text
Responder solicitação
```

### 15.5 Ações proibidas

Não sugerir:

- publicar antes de verificação;
- pagamento antes de autoridade;
- saque antes de saldo real;
- anúncio duplicado para aumentar exposição;
- ativar notificações antes de valor;
- completar campos irrelevantes apenas para chegar a 100%;
- compartilhar contatos fora da plataforma;
- responder pedido incompatível para melhorar métrica.

---

## 16. Progressão visual

### 16.1 Não usar porcentagem artificial

Evitar:

```text
Seu perfil está 80% completo
```

quando os campos possuem pesos arbitrários.

Preferir:

```text
Próximo passo: confirmar sua identidade
```

### 16.2 Checklist somente quando útil

Checklist pode existir em jornadas delimitadas:

- verificação;
- criação de anúncio;
- primeira configuração profissional.

Não deve ocupar permanentemente a Home.

### 16.3 Status derivados da autoridade

Cada item deve exibir:

- estado;
- próxima ação;
- bloqueio;
- data;
- origem;
- possibilidade de retry.

### 16.4 Conclusão

Ao confirmar milestone:

- feedback curto;
- explicar o que foi liberado;
- apresentar próxima ação;
- não usar confete ou celebração excessiva em KYC, pagamento ou denúncia;
- respeitar reduced motion.

---

## 17. Onboarding progressivo da conta

### 17.1 Princípio

```text
pedir dado
→ somente quando melhora a ação atual
```

### 17.2 Exploração pública

Permitir:

- abrir Home;
- navegar categorias;
- ver resultados gerais;
- abrir anúncios públicos;
- entender o produto.

Sem exigir:

- CEP;
- login;
- perfil;
- notificação.

### 17.3 Busca local

Quando localização é necessária:

```text
Para mostrar profissionais na sua região, informe cidade e estado.
```

Opções:

- cidade + UF manual;
- buscar CEP;
- usar localização do dispositivo, com consentimento;
- continuar com resultados gerais.

### 17.4 Intenção transacional

Ao solicitar orçamento, o sistema pode exigir dados adicionais.

Deve explicar:

- o que será compartilhado;
- com quem;
- em qual momento;
- qual dado pode ser alterado depois.

### 17.5 Bio e interesses

São enriquecimento opcional.

Não devem bloquear:

- busca;
- favorito;
- orçamento;
- mensagem;
- pedido.

### 17.6 Modal da Home

Enquanto existir:

- usar `Doke.overlayManager`;
- focus trap;
- fundo `inert`;
- retorno de foco;
- Escape conforme política;
- copy precisa;
- retry visível;
- entrada manual;
- nenhuma consulta automática externa;
- nenhuma abertura repetitiva após erro.

A implementação não deve alterar a composição visual congelada da Home.

---

## 18. Contrato de primeiro resultado

### 18.1 Definição

```text
FIRST_RELEVANT_RESULT
```

é confirmado quando:

- existe intenção explícita;
- a busca foi resolvida;
- pelo menos um item elegível foi renderizado;
- o item possui match justificável;
- a impressão qualificada foi registrada;
- não é skeleton;
- não é fixture apresentada como real;
- não é conteúdo editorial não rotulado.

### 18.2 Sem resultado

A resposta deve distinguir:

```text
sem match para a query
sem oferta na localização
filtros incompatíveis
catálogo indisponível
dados stale
erro de autenticação
```

### 18.3 Recovery

Oferecer uma ação principal entre:

- corrigir termo;
- remover filtro;
- ampliar região;
- ver categoria relacionada;
- tentar novamente.

### 18.4 Não fabricar

Não apresentar “Outros anúncios” como se fossem resultados da busca.

Rotular:

```text
Outros serviços que podem interessar
```

---

## 19. Contrato de primeira solicitação

### 19.1 Estados

```text
NOT_STARTED
DRAFT
VALIDATING
SUBMITTING
UNKNOWN_OUTCOME
CONFIRMED
REJECTED
CANCELLED
EXPIRED
```

### 19.2 Receipt

Após confirmação:

```text
Solicitação enviada
Protocolo: ...
Profissional: ...
Próximo passo: aguardar resposta
```

### 19.3 Retomada

Após login, reload ou troca de dispositivo:

- carregar draft;
- verificar entidade;
- preservar intent ID;
- evitar duplicação;
- reconciliar antes de retry.

### 19.4 Ativação

Somente `CONFIRMED` conta como ativação do marketplace.

---

## 20. Contrato de primeiro anúncio

### 20.1 Prefill permitido

- categoria profissional;
- região;
- especialidades;
- nome público;
- mídia de portfólio já autorizada.

### 20.2 Prefill proibido

- CPF/CNPJ;
- endereço residencial;
- documentos KYC;
- selfie;
- respostas privadas;
- dados bancários;
- bio completa sem revisão.

### 20.3 Readiness

Antes de publicar:

- título;
- categoria;
- descrição;
- preço ou orçamento;
- escopo;
- localização/modalidade;
- mídia, quando necessária;
- disponibilidade;
- preview público;
- termos.

### 20.4 Pós-publicação

Mostrar:

- status real;
- moderação;
- elegibilidade;
- preview;
- próxima melhoria opcional;
- nenhum contador fabricado.

---

## 21. Reengajamento

### 21.1 Elegibilidade

Um lembrete só pode ocorrer quando:

- estado canônico continua pendente;
- a pessoa não concluiu por outra superfície;
- o prazo mínimo passou;
- canal autorizado;
- frequência permitida;
- preview seguro;
- ação ainda disponível.

### 21.2 Exemplos

- confirmação de e-mail;
- draft profissional;
- documento rejeitado;
- anúncio com ajustes;
- pedido aguardando resposta.

### 21.3 Frequência

A frequência deve ser definida por política.

Nunca:

- a cada login;
- a cada page view;
- em todas as superfícies;
- depois da conclusão;
- durante incidente;
- para estado stale.

### 21.4 Dismiss

A pessoa pode:

- adiar;
- dispensar sugestão opcional;
- manter requisito obrigatório oculto apenas temporariamente;
- acessar central de progresso.

Dismiss não altera autoridade.

---

## 22. Privacidade

### 22.1 Minimização

Cadastro:

- nome;
- username;
- e-mail;
- senha no provider.

Account setup:

- cidade e UF quando necessários.

Perfil profissional:

- dados públicos de oferta.

KYC:

- dados legais estritamente necessários.

### 22.2 Separação

```text
perfil público
≠ identidade legal
≠ endereço transacional
≠ documento KYC
≠ dados bancários
```

### 22.3 Analytics

Eventos de ativação não podem incluir:

- CPF;
- CNPJ;
- endereço;
- CEP bruto;
- nome legal;
- conteúdo de documento;
- selfie;
- bio livre;
- especialidades livres sem classificação;
- motivo de rejeição livre.

Usar códigos e IDs opacos.

### 22.4 Arquivos

- explicar finalidade;
- mostrar retenção quando definida;
- permitir remoção antes do envio;
- signed URLs curtas;
- sem preview externo;
- sem analytics de conteúdo;
- limpeza no logout compartilhado.

---

## 23. Continuidade

### 23.1 Drafts

Todos os drafts devem adotar:

- revision;
- account generation;
- origin tab;
- schema fingerprint;
- updatedAt;
- conflict state;
- authoritative receipt.

### 23.2 Cross-tab

Se outra aba avançar:

```text
Seu cadastro foi atualizado em outra aba.
Recarregar progresso
```

### 23.3 Cross-device

Milestones server-side devem aparecer no outro dispositivo.

Dados locais não podem confirmar progressão.

### 23.4 Reload

Após reload:

- revalidar sessão;
- reconciliar milestone;
- restaurar step;
- verificar arquivos;
- explicar itens que precisam ser selecionados novamente;
- não reenviar comando automaticamente.

### 23.5 Unknown outcome

Exemplo:

```text
Estamos confirmando se seu perfil foi criado.
Não envie novamente enquanto verificamos.
```

---

## 24. Acessibilidade

### 24.1 Stepper

- lista ordenada ou padrão apropriado;
- etapa atual programática;
- etapas futuras indisponíveis;
- labels completos;
- teclado;
- heading por etapa;
- foco no heading após mudança.

### 24.2 Erros

- error summary;
- foco no primeiro erro;
- `aria-invalid`;
- `aria-describedby`;
- não depender de cor;
- preservar preenchimento.

### 24.3 Upload

- controle nativo acessível;
- label claro;
- estado do arquivo;
- remover/trocar;
- progresso;
- erro;
- teclado;
- sem card `tabindex` redundante.

### 24.4 Modal

- stack;
- trap;
- `inert`;
- Escape;
- foco inicial;
- retorno ao trigger;
- anúncio de sucesso uma vez.

### 24.5 Progresso

Não anunciar cada autosave.

Anunciar:

- etapa alterada;
- erro;
- save falhou;
- submit confirmado;
- status remoto alterado.

---

## 25. Conteúdo

### 25.1 Cadastro

Preferir:

```text
Crie sua conta pessoal
```

Apoio:

```text
Você poderá contratar serviços e, quando quiser, criar um perfil profissional.
```

### 25.2 Localização

```text
Onde você procura serviços?
```

Apoio:

```text
Use cidade e estado. O endereço completo só será solicitado quando necessário.
```

### 25.3 Conversão profissional

```text
Comece seu perfil profissional
```

Apoio:

```text
Salve seu progresso e continue quando quiser.
```

### 25.4 KYC

```text
Confirme sua identidade
```

Apoio:

```text
Usamos estes dados para verificar o responsável pelo perfil profissional.
```

### 25.5 Rejeição

```text
Precisamos de ajustes
```

Não:

```text
Você falhou na verificação
```

### 25.6 Ativação

```text
Seu perfil profissional está ativo
```

somente após autoridade.

Próximo passo:

```text
Crie seu primeiro anúncio
```

---

## 26. Analytics de ativação

### 26.1 Eventos

```text
activation.intent.captured.v1
activation.intent.paused.v1
activation.intent.resumed.v1
activation.intent.expired.v1
account.registration.confirmed.v1
account.email_confirmation.pending.v1
account.email.confirmed.v1
account.setup.started.v1
account.setup.confirmed.v1
discovery.first_relevant_result.confirmed.v1
service.first_detail.viewed.v1
quote.first_started.v1
quote.first_request.confirmed.v1
provider.first_response.confirmed.v1
professional.intent.declared.v1
professional.profile_draft.started.v1
professional.profile.confirmed.v1
professional.verification.started.v1
professional.verification.submitted.v1
professional.verification.verified.v1
professional.verification.rejected.v1
listing.first_draft.started.v1
listing.first_published.v1
professional.first_qualified_request.received.v1
professional.first_response.confirmed.v1
order.first_accepted.v1
order.first_completed.v1
activation.next_best_action.presented.v1
activation.next_best_action.completed.v1
```

### 26.2 Autoridade

| Evento | Autoridade |
|---|---|
| registro confirmado | Auth/server |
| e-mail confirmado | Auth provider |
| setup confirmado | onboarding RPC |
| solicitação confirmada | orders authority |
| resposta confirmada | messages/orders authority |
| perfil profissional | profile setup RPC |
| verificação enviada | verification authority |
| profissional ativo | role/profile reconciliation |
| anúncio publicado | catalog/moderation authority |
| pedido concluído | orders authority |

### 26.3 Métricas

#### Registration completion

```text
registros confirmados
÷
registros iniciados elegíveis
```

#### Setup completion

```text
setups confirmados
÷
contas autenticadas com setup requerido
```

#### Client marketplace activation

```text
primeiras solicitações confirmadas
÷
clientes elegíveis da coorte
```

#### Professional role activation

```text
profissionais verificados e reconciliados
÷
intenções profissionais elegíveis
```

#### Supply activation

```text
primeiros anúncios publicados
÷
profissionais ativos elegíveis
```

#### Lead activation

```text
profissionais com primeiro lead qualificado
÷
profissionais com anúncio publicado elegível
```

### 26.4 Guardrails

- erro de cadastro;
- tempo até primeiro valor;
- abandono por etapa;
- retry;
- unknown outcome;
- rejeição KYC;
- upload falho;
- denúncia;
- bloqueio;
- acessibilidade;
- performance;
- opt-out;
- support contact.

### 26.5 Não métricas

Não usar como ativação:

- page view;
- modal aberto;
- botão clicado;
- campo preenchido;
- step alcançado;
- arquivo selecionado;
- perfil visualizado;
- notificação entregue.

---

## 27. Estados degradados

### 27.1 Auth indisponível

- preservar intenção local mínima;
- não coletar senha fora do provider;
- explicar indisponibilidade;
- permitir voltar à exploração pública.

### 27.2 Onboarding indisponível

- não esconder falha;
- mostrar retry;
- permitir exploração quando seguro;
- bloquear apenas ações que dependem do dado.

### 27.3 Perfil profissional indisponível

- preservar draft confirmado;
- não declarar perda;
- não criar perfil duplicado;
- reconciliar antes de retry.

### 27.4 Upload indisponível

- manter dados textuais;
- não fingir upload;
- explicar quais arquivos precisam ser selecionados novamente.

### 27.5 Verificação em manutenção

- mostrar status;
- impedir novos submits;
- preservar draft;
- não alterar papel;
- não prometer prazo.

### 27.6 Catálogo indisponível

- não concluir supply activation;
- manter anúncio draft/submitted;
- mostrar estado degradado;
- reconciliar depois.

---

## 28. Anti-patterns proibidos

### 28.1 Tour forçado

Não criar tour genérico sobre toda a interface antes de valor.

### 28.2 Tooltip storm

Não abrir múltiplos balões simultâneos.

### 28.3 Profile completion vanity

Não usar 100% como objetivo universal.

### 28.4 Confetti em jornadas sensíveis

Não usar em:

- KYC;
- pagamento;
- disputa;
- denúncia;
- rejeição.

### 28.5 Permissões precoces

Não pedir:

- notificação;
- localização precisa;
- câmera;
- microfone;

antes do contexto de uso.

### 28.6 Dark patterns

Proibido:

- esconder skip opcional;
- usar culpa;
- declarar perda de oportunidade fictícia;
- ativar consentimento por padrão;
- misturar termos com marketing;
- dificultar saída;
- impedir exploração para coletar perfil.

### 28.7 Sucesso sintético

Proibido:

- contadores demo como reais;
- “perfil visto” sem autoridade;
- “clientes esperando” sem evidência;
- “alta demanda” por heurística;
- “resposta garantida”;
- “pagamento protegido” sem autoridade.

---

## 29. Matriz de telas e ação principal

| Estado | Superfície | Ação primária |
|---|---|---|
| visitante explorando | Home | Buscar serviços |
| visitante com intenção transacional | Auth | Entrar ou criar conta |
| e-mail pendente | confirmação | Confirmar e-mail |
| setup requerido para busca local | prompt contextual | Informar cidade |
| cliente sem intenção | Home | Explorar serviços |
| cliente com orçamento pausado | detalhe/form | Continuar solicitação |
| solicitação confirmada | Pedidos | Acompanhar pedido |
| resposta recebida | Mensagens/Pedidos | Ver resposta |
| intenção profissional | jornada dedicada | Começar perfil profissional |
| perfil draft | jornada dedicada | Continuar perfil |
| perfil criado | status | Iniciar verificação |
| KYC draft | verificação | Continuar verificação |
| KYC rejeitado | status | Corrigir e reenviar |
| profissional ativo sem anúncio | perfil | Criar primeiro anúncio |
| anúncio em revisão | perfil/anúncios | Acompanhar análise |
| anúncio publicado sem lead | painel | Melhorar disponibilidade ou aguardar |
| lead recebido | Pedidos | Responder solicitação |
| pedido aceito | conversa | Alinhar detalhes |

---

## 30. Regras por superfície

### 30.1 Home

- preservar baseline visual;
- onboarding contextual;
- não ocupar rail principal permanentemente;
- ação de busca continua protagonista;
- profissional CTA captura intenção;
- localização aproximada antes de exata;
- sem popup repetitivo.

### 30.2 Resultados

- usar contexto da intenção;
- explicar ausência;
- oferecer refinamento;
- preservar filtros;
- não resetar após login;
- marcar primeiro resultado relevante apenas quando ready.

### 30.3 Detalhe

- preservar target entity após auth;
- retomar orçamento;
- não autoexecutar mutação;
- mostrar requisito mínimo;
- manter foco e scroll contextuais.

### 30.4 Meu perfil

- não virar dashboard universal de onboarding;
- mostrar uma next best action quando aplicável;
- manter edição pessoal separada;
- esconder progressão profissional concluída;
- não mostrar card profissional para quem não demonstrou intenção, salvo CTA discreto.

### 30.5 Tornar-se profissional

- jornada própria;
- preflight;
- draft remoto;
- progressão clara;
- sem KYC misturado;
- sem upload falso;
- save status visível;
- conflito tratado;
- handoff explícito.

### 30.6 Verificação

- requirements first;
- dados sensíveis separados;
- file state correto;
- draft seguro;
- submit único;
- status e correção;
- sem SLA inventado.

### 30.7 Perfil profissional

- status real;
- primeiro anúncio;
- disponibilidade;
- anúncio em análise;
- primeira solicitação;
- nenhuma métrica falsa.

### 30.8 Pedidos

- first-order education contextual;
- status e ação separados;
- receipt;
- comunicação;
- segurança;
- next action canônica.

### 30.9 Mensagens

- primeira conversa orientada;
- contexto do serviço/pedido;
- envio confirmado;
- offline/unknown;
- proteção contra contato externo e golpe.

---

## 31. Contratos de backend necessários

### 31.1 Activation snapshot

```text
GET /activation/me
```

ou RPC equivalente.

Resposta:

```text
account milestones
role path
blocking requirements
pending intents
next best action candidates
server time
revision
```

### 31.2 Intent receipt

```text
POST /activation/intents
```

Requisitos:

- idempotência;
- allowlist de ações;
- TTL;
- account/guest binding;
- sem PII livre;
- entity validation.

### 31.3 Milestone projection

Milestones derivados de eventos canônicos.

Não permitir escrita arbitrária pelo cliente.

### 31.4 Next best action

Pode ser calculada no cliente a partir de snapshot assinado/versionado, mas os blockers e milestones devem vir da autoridade.

### 31.5 Reconciliation

```text
POST /activation/reconcile
```

Somente se necessário.

Preferir projeção automática a comandos de “marcar concluído”.

---

## 32. Contrato de save status

### 32.1 Estados

```text
IDLE
DIRTY
SCHEDULED
SAVING
SAVED
STALE
CONFLICT
ERROR
UNKNOWN_OUTCOME
```

### 32.2 Apresentação

```text
Salvando…
Salvo agora
Alterado em outra aba
Não foi possível confirmar o salvamento
```

### 32.3 Não anunciar excessivamente

Leitores de tela não devem receber “salvo” a cada tecla.

Anunciar somente:

- falha;
- conflito;
- save and exit confirmado;
- perda de conectividade relevante.

---

## 33. QA funcional

### 33.1 Cadastro

- username disponível;
- username ocupado;
- resposta fora de ordem;
- e-mail inválido;
- senha fraca;
- provider indisponível;
- confirmação pendente;
- retorno por `next`;
- URL externa rejeitada;
- role forçado a client.

### 33.2 Account onboarding

- visitante não vê modal;
- autenticado completo não vê modal;
- incompleto vê contexto correto;
- cidade manual;
- CEP explícito;
- ViaCEP timeout;
- retry;
- skip opcional;
- auth muda durante request;
- duas abas;
- server state concluído em outro dispositivo;
- unknown outcome.

### 33.3 Intent resume

- orçamento;
- favorito;
- mensagem;
- anúncio;
- comunidade;
- entidade removida;
- intenção expirada;
- conta diferente;
- retry sem duplicação.

### 33.4 Perfil profissional

- draft vazio;
- save and exit;
- reload;
- concorrência de saves;
- conflito cross-tab;
- validação por etapa;
- “Outros” categoria;
- upload removido ou real;
- complete unknown;
- status ativo redirecionado.

### 33.5 Verificação

- PF;
- PJ;
- menor de idade;
- arquivo inválido;
- arquivo grande;
- reload com metadata only;
- reselect;
- signed URL expirada;
- upload parcial;
- response lost;
- submit idempotente;
- rejected/resubmit;
- approved role reconciliation.

### 33.6 Primeiro anúncio

- prefill;
- draft;
- moderação;
- alterações solicitadas;
- published;
- no fake metrics;
- role lost/suspended.

### 33.7 Primeiro lead

- recebido;
- expirado;
- incompatível;
- resposta duplicada;
- offline;
- unknown;
- bloqueio/denúncia;
- CTA e status coerentes.

---

## 34. QA de acessibilidade

- keyboard-only;
- VoiceOver Safari/iOS;
- TalkBack Chrome/Android;
- NVDA Chrome/Firefox;
- zoom 200%;
- zoom 400%;
- text resize 200%;
- forced colors;
- reduced motion;
- error summary;
- stepper;
- upload;
- modal;
- foco após rota;
- foco após etapa;
- live region sem ruído;
- status não dependente de cor.

---

## 35. QA de privacidade

- CEP não enviado durante digitação;
- cidade manual funciona;
- endereço exato ausente do onboarding básico;
- KYC fora de analytics;
- file names sanitizados;
- logout remove progress local privado;
- troca de conta não mistura milestones;
- notification preview genérico;
- sem PII em URL;
- sem conteúdo livre em telemetry;
- signed URL curta;
- nenhum documento em localStorage.

---

## 36. QA de analytics

- schema registrado;
- environment correto;
- fixture excluída;
- bot/internal excluído;
- consent snapshot;
- dedupe;
- event ID;
- authority source;
- milestone só após confirmação;
- click separado de outcome;
- timestamp do servidor;
- late event tratado;
- coorte elegível;
- denominador estável;
- no PII;
- no financial claim antes de PAY.

---

## 37. Quality gates

### 37.1 Gate de intenção

Falhar se:

- login apaga target;
- rota externa é aceita;
- comando é autoexecutado após auth;
- intent cru contém PII.

### 37.2 Gate de onboarding

Falhar se:

- CEP consulta automaticamente;
- modal fecha silenciosamente em erro;
- optional bloqueia jornada;
- status local confirma conclusão.

### 37.3 Gate profissional

Falhar se:

- role pode ser promovido no browser;
- upload metadata aparece como persistido;
- verificação aprovada sem role reconciliado;
- anúncio pode publicar antes de capacidade.

### 37.4 Gate de ativação

Falhar se:

- clique conta como milestone confirmado;
- page view conta como ativação;
- mock entra em KPI;
- zero representa coleta ausente;
- next action viola bloqueio.

### 37.5 Gate de continuidade

Falhar se:

- reload cria nova intenção;
- retry cria nova idempotency key;
- save antigo vence save novo;
- conta A aparece na conta B;
- arquivo metadata-only passa por ready.

---

## 38. Plano de implementação

### Fase 1 — modelo e registry

1. criar catálogo de milestones;
2. criar `ActivationIntentEnvelope`;
3. criar snapshot de ativação;
4. integrar account generation;
5. integrar analytics registry.

### Fase 2 — auth e intenção

1. capturar intenção em CTAs protegidos;
2. persistir retorno seguro;
3. retomar após login;
4. preservar query/entity;
5. tratar expiração.

### Fase 3 — onboarding progressivo

1. remover consulta automática de CEP;
2. adicionar cidade/UF manual;
3. tornar localização contextual;
4. adicionar recovery visível;
5. integrar overlay manager;
6. separar extras opcionais.

### Fase 4 — cliente first value

1. first-result contract;
2. empty recovery;
3. first detail;
4. quote resume;
5. request receipt;
6. provider response next action.

### Fase 5 — profissional preflight

1. adicionar requirements preview;
2. corrigir evidência falsa;
3. versionar autosave;
4. mostrar save status;
5. consolidar status e handoff.

### Fase 6 — verificação

1. requirements checklist;
2. file state model;
3. reselect antecipado;
4. unknown outcome;
5. status e correção;
6. role reconciliation.

### Fase 7 — supply activation

1. first listing CTA;
2. prefill seguro;
3. readiness;
4. moderação;
5. publication confirmation;
6. first lead experience.

### Fase 8 — reengajamento

1. eligibility;
2. frequency caps;
3. account-scoped state;
4. privacy-safe preview;
5. dismiss/snooze;
6. suppression after completion.

### Fase 9 — QA e observabilidade

1. E2E;
2. a11y;
3. analytics quality;
4. RUM;
5. cross-tab;
6. cross-device;
7. degraded modes.

---

## 39. Handoffs

### ACT-H01 — autoridade de ativação

Criar:

- milestone registry;
- snapshot;
- projection;
- next best action;
- blockers.

### ACT-H02 — preservação de intenção

Criar:

- capture;
- auth pause;
- safe return;
- resume;
- expiry;
- conflict.

### ACT-H03 — cadastro e confirmação

Corrigir:

- feedback;
- username latest-wins;
- confirmação;
- resend;
- alteração de e-mail;
- retorno à intenção.

### ACT-H04 — onboarding progressivo do cliente

Corrigir:

- modal bloqueante;
- localização manual;
- CEP explícito;
- optional extras;
- recovery;
- overlay semantics.

### ACT-H05 — primeiro resultado

Implementar:

- relevance milestone;
- empty taxonomy;
- broaden/refine;
- fallback rotulado;
- first result analytics.

### ACT-H06 — primeira solicitação

Integrar:

- intent;
- draft;
- auth resume;
- receipt;
- unknown outcome;
- provider response.

### ACT-H07 — conversão profissional dedicada

Preservar página própria e adicionar:

- preflight;
- save status;
- conflict handling;
- progress;
- next step.

### ACT-H08 — verificação e arquivos

Implementar:

- checklist;
- file state;
- reselect;
- upload progress;
- retry;
- privacy;
- reconciliation.

### ACT-H09 — primeiro anúncio

Implementar:

- CTA pós-verificação;
- prefill;
- readiness;
- status de moderação;
- publicação confirmada.

### ACT-H10 — primeiro lead e pedido

Implementar:

- lead education;
- response flow;
- decline;
- next status;
- receipt;
- safety.

### ACT-H11 — reengajamento

Implementar:

- eligibility;
- suppression;
- snooze;
- channel policy;
- preview;
- freshness.

### ACT-H12 — analytics e QA

Implementar:

- event schemas;
- authority mapping;
- funnels;
- guardrails;
- automated tests;
- dashboards com limitações.

---

## 40. Definition of Done do UX-017

O contrato estará implementado quando:

- intenção sobrevive ao auth;
- registro continua client-first;
- onboarding não bloqueia exploração sem necessidade;
- CEP só é consultado explicitamente;
- cidade/UF manual funciona;
- falha de onboarding possui recovery;
- account setup não é chamado de ativação;
- first relevant result é mensurável;
- primeira solicitação usa authority receipt;
- `tornar-profissional.html` permanece dedicado;
- requisitos profissionais são antecipados;
- upload falso foi removido ou implementado;
- autosaves são versionados;
- arquivos metadata-only são distinguíveis;
- verificação aprovada exige role reconciliado;
- profissional ativo recebe próximo passo para primeiro anúncio;
- anúncio publicado exige autoridade;
- primeiro lead possui orientação;
- uma única next best action aparece por superfície;
- milestones são account-scoped;
- cross-tab e reload funcionam;
- analytics não confundem clique e resultado;
- KYC não entra em analytics;
- E2E, a11y, privacidade e quality gates passam.

---

## 41. Impacto esperado no site

Quando implementado, o contrato fará com que:

- pessoas retornem à ação que motivou o cadastro;
- o cadastro continue seguro e client-first;
- a Home não bloqueie exploração prematuramente;
- localização seja pedida no momento correto;
- o primeiro resultado útil apareça mais cedo;
- clientes entendam o próximo passo após solicitar orçamento;
- a jornada profissional permaneça dedicada e clara;
- requisitos de verificação não surpreendam no final;
- drafts sobrevivam a reload e troca de dispositivo;
- arquivos não pareçam salvos quando não estão;
- profissionais ativos sejam guiados ao primeiro anúncio;
- anúncios publicados sejam guiados ao primeiro lead;
- cada pessoa veja uma ação principal coerente;
- métricas de ativação representem valor real;
- notificações de progressão sejam menos repetitivas;
- o produto reduza abandono sem dark patterns.

---

## 42. Impacto desta entrega documental

Nesta entrega:

- nenhuma tela mudou;
- nenhum modal mudou;
- nenhum formulário mudou;
- nenhum cadastro mudou;
- nenhum onboarding mudou;
- nenhum upload mudou;
- nenhum papel mudou;
- nenhum evento foi coletado;
- nenhuma migration foi aplicada;
- nenhum ambiente remoto foi acessado.

O efeito é exclusivamente contratual.

---

## 43. Próximo sublote recomendado

```text
UX-FOUNDATION-018
— rollout, priorização, dependências, gates de implementação e Definition of Done global
```

Esse sublote deverá transformar `UX-FOUNDATION-001` a `017` em:

- mapa de dependências;
- sequência de implementação;
- P0/P1/P2 consolidado;
- owners;
- critérios de entrada;
- critérios de saída;
- gates de merge;
- plano de rollout;
- rollback;
- validação por rota;
- matriz desktop/mobile;
- Definition of Done global.

---

## 44. Regra final

```text
onboarding bom
≠ ensinar toda a Doke

onboarding bom
=
levar a pessoa ao primeiro valor correto
com o mínimo de fricção necessária
sem ultrapassar autoridade, privacidade ou segurança
```
