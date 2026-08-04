# UX-FOUNDATION-013 — Privacidade, consentimento, permissões e dados sensíveis

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `013`
- Natureza: especificação de Produto, UX, privacidade por design, segurança de interface e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- HTML alterado: não
- CSS alterado: não
- JavaScript alterado: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Head lógico principal inspecionado: `09c7f60c3d3acac79d70d1ed1f330b1eb703db4e`
- Head UX anterior: `fea029af88c06e3cd76d9d8b25ffd472b1f22db5`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-012`

---

## 1. Objetivo

Definir o contrato transversal de privacidade da Doke para que toda coleta, uso, apresentação, persistência, compartilhamento, revogação e remoção de dados pessoais seja:

- contextual;
- proporcional à finalidade;
- compreensível para a pessoa;
- isolada por conta;
- fail-closed;
- reversível quando aplicável;
- observável sem expor conteúdo sensível;
- compatível com dispositivos compartilhados;
- segura durante troca de conta;
- coerente entre navegador, backend e notificações;
- explícita sobre terceiros;
- separada de permissões do sistema operacional;
- livre de dark patterns;
- acessível por teclado e leitor de tela;
- testável por contratos automatizados e QA manual.

Este documento não declara conformidade legal.

Ele define requisitos de produto e engenharia que deverão ser revisados por responsáveis jurídicos, de segurança e de proteção de dados antes da operação real.

Este documento não implementa alterações no produto.

---

## 2. Escopo auditado

A auditoria documental considerou principalmente:

- `assets/js/core/session.js`;
- `assets/js/services/auth-service.js`;
- `assets/js/core/form-experience-core.js`;
- `assets/js/pages/home.js`;
- `assets/js/pages/search-data.js`;
- `assets/js/pages/service-form-experience.js`;
- `assets/js/pages/configuracoes.js`;
- `assets/js/pages/settings-experience.js`;
- `assets/js/features/browser-notification-bridge.js`;
- `assets/js/features/in-app-notifications.js`;
- `assets/js/repositories/attachments-repository.js`;
- `assets/css/components/cards/ad-card.css`;
- `configuracoes.html`;
- `index.html`;
- contratos anteriores de conteúdo, formulários, notificações, acessibilidade e performance.

A especificação também se aplica a:

- cadastro e login;
- sessão;
- onboarding;
- perfil público;
- perfil privado;
- busca;
- localização;
- endereços;
- anúncios;
- pedidos;
- propostas;
- mensagens;
- pagamentos;
- carteira;
- comunidades;
- publicações;
- Workers;
- avaliações;
- denúncias;
- suporte;
- anexos;
- câmera;
- microfone;
- notificações do navegador;
- armazenamento local;
- telemetria futura;
- aplicativo futuro.

---

## 3. Causa raiz

A Doke possui várias decisões positivas isoladas:

- tokens de autenticação não são copiados para o snapshot público de sessão;
- anexos transacionais remotos utilizam URLs assinadas com expiração;
- uploads transacionais possuem limite de quantidade, tamanho e MIME declarado;
- telefone não aparece publicamente por padrão;
- notificações do navegador exigem permissão nativa;
- drafts possuem TTL;
- dados de fixture de anexos permanecem em memória.

Entretanto, ainda não existe uma autoridade transversal que governe:

```text
qual dado pode ser coletado
+
para qual finalidade
+
em qual superfície
+
por quanto tempo
+
em qual storage
+
com qual isolamento de conta
+
quem pode visualizar
+
quando deve ser removido
+
como a pessoa revoga
```

O produto atual combina:

```text
localStorage global
+
session snapshot persistente
+
stores locais por feature
+
URLs com estado
+
terceiros carregados diretamente
+
permissões do navegador
+
backends por domínio
+
fixtures locais
```

sem um registro canônico de dados.

Os sintomas observados incluem:

- informações pessoais persistidas além da sessão;
- stores que não são isolados por conta;
- logout parcial;
- endereço residencial completo em storage global;
- histórico de busca compartilhado entre contas do mesmo navegador;
- notificações e preferências compartilhadas;
- prompts fora do contexto imediato;
- preview de sistema operacional com conteúdo potencialmente sensível;
- CEP enviado a terceiro durante a digitação;
- dados diagnósticos pré-selecionados;
- perfil público e descoberta pré-selecionados;
- imagens sem contrato de remoção de metadados;
- ação de exclusão sem autoridade operacional encontrada;
- ausência de inventário central de retenção e limpeza.

A causa raiz não é uma chave isolada de `localStorage`.

A causa raiz é a ausência de uma autoridade de privacidade e ciclo de vida.

---

## 4. Princípios obrigatórios

### 4.1 Minimização

Coletar somente o necessário para a ação atual.

```text
cidade necessária
→ não coletar endereço completo

preview genérico suficiente
→ não expor texto da mensagem

métrica agregada suficiente
→ não registrar query, conteúdo ou ID pessoal
```

### 4.2 Finalidade explícita

Cada dado deve possuir uma finalidade pública e uma autoridade técnica.

```text
dado sem finalidade registrada
→ não coletar
```

### 4.3 Isolamento por conta

Todo storage persistente relacionado a uma pessoa deve incluir um namespace de conta.

```text
feature:<accountId>:<schemaVersion>
```

Uma chave global só pode armazenar:

- preferência realmente global do dispositivo;
- dados não pessoais;
- configuração pública do produto;
- metadados técnicos sem vínculo com conta.

### 4.4 Privacidade por padrão

Na ausência de decisão confirmada:

```text
visibilidade pública → desligada
compartilhamento adicional → desligado
preview sensível → genérico
telemetria opcional → desligada
permissão nativa → não solicitada
```

Exceções essenciais deverão ser explícitas no contrato da feature.

### 4.5 Consentimento não é sinônimo de qualquer processamento

A interface deverá separar:

- processamento necessário para executar uma solicitação;
- preferência do produto;
- consentimento opcional;
- permissão do navegador ou sistema operacional;
- confirmação de uma ação sensível;
- aceite contratual futuro.

Não será permitido usar um único checkbox para cobrir finalidades diferentes.

### 4.6 Revogação sem punição enganosa

Quando uma escolha for opcional, revogá-la não poderá bloquear funções não relacionadas.

### 4.7 Transparência em camadas

A pessoa deverá receber:

1. explicação curta no contexto;
2. detalhes antes da confirmação;
3. centro de privacidade para revisão;
4. histórico quando a decisão for sensível.

### 4.8 Fail-closed

Quando a autoridade de privacidade não puder determinar se uma operação é permitida:

```text
não coletar
não compartilhar
não publicar
não enviar ao terceiro
```

### 4.9 Sem dark patterns

É proibido:

- pré-marcar consentimento opcional;
- esconder recusa;
- usar culpa ou pressão;
- solicitar permissão no primeiro paint sem contexto;
- repetir prompt após recusa;
- tornar o botão de recusa visualmente inacessível;
- misturar ação necessária com marketing;
- afirmar que a recusa reduz segurança quando isso não for verdade;
- transformar silêncio em aceite.

### 4.10 Conteúdo sensível não entra em logs de UX

Erros, métricas e eventos de performance não deverão incluir:

- nome completo;
- e-mail;
- telefone;
- CEP;
- rua;
- número;
- complemento;
- texto de mensagem;
- texto de proposta;
- conteúdo de denúncia;
- nome de arquivo;
- URL assinada;
- token;
- query de busca;
- descrição livre;
- conteúdo financeiro individual.

---

## 5. Classificação canônica dos dados

Todo dado deverá receber uma classe antes da implementação.

### 5.1 `PUBLIC_CONTENT`

Conteúdo que a pessoa decidiu publicar.

Exemplos:

- título do anúncio;
- descrição pública;
- imagem pública sanitizada;
- nome profissional público;
- bio pública;
- avaliação publicada;
- publicação de comunidade pública.

Regras:

- publicação explícita;
- preview antes de publicar;
- indicação de audiência;
- remoção ou despublicação disponível;
- sem metadados ocultos desnecessários.

### 5.2 `ACCOUNT_PRIVATE`

Dados privados da conta.

Exemplos:

- e-mail;
- telefone;
- preferências;
- drafts;
- histórico privado;
- configurações de notificação;
- endereços salvos.

Regras:

- namespace por conta;
- acesso autenticado;
- remoção no logout conforme política;
- não compartilhar com outra conta do dispositivo.

### 5.3 `TRANSACTION_PRIVATE`

Dados necessários a uma relação entre participantes autorizados.

Exemplos:

- endereço do serviço;
- proposta;
- chat do pedido;
- anexo do pedido;
- telefone liberado após etapa autorizada;
- comprovante;
- contestação.

Regras:

- acesso por papel e entidade;
- audiência explícita;
- retenção vinculada ao ciclo transacional;
- URLs assinadas;
- não aparecer em preview de sistema operacional por padrão.

### 5.4 `SENSITIVE_CONTEXT`

Dados cujo vazamento pode causar risco material ou constrangimento.

Exemplos:

- endereço residencial completo;
- documento;
- contestação;
- dados de segurança;
- conteúdo de suporte;
- localização precisa;
- conteúdo que revele condição pessoal;
- anexos privados.

Regras:

- coleta tardia;
- acesso mínimo;
- redaction em previews;
- não persistir em storage global;
- confirmação adicional quando compartilhado.

### 5.5 `AUTH_SECRET`

Exemplos:

- access token;
- refresh token;
- senha;
- códigos de recuperação;
- private keys;
- signed upload token.

Regras:

- nunca em `localStorage` da aplicação;
- nunca em evento de UI;
- nunca em analytics;
- nunca em mensagem de erro pública;
- nunca em snapshot de sessão.

### 5.6 `EPHEMERAL_UI`

Dados transitórios que não precisam sobreviver à sessão.

Exemplos:

- estado aberto de modal;
- opção ativa do autocomplete;
- texto de busca ainda não submetido;
- preview temporário;
- posição de scroll;
- upload em preparação.

Regras:

- memória ou `sessionStorage` quando indispensável;
- expiração curta;
- limpeza em troca de rota ou conta;
- sem sincronização entre abas, salvo necessidade explícita.

### 5.7 `AGGREGATED_TELEMETRY`

Métricas sem conteúdo pessoal direto.

Exemplos:

- LCP;
- INP;
- CLS;
- duração de rota;
- código de erro normalizado;
- categoria de dispositivo;
- modo de conexão agregado.

Regras:

- sem URL completa;
- sem query string;
- sem ID de entidade;
- sem texto digitado;
- sampling documentado;
- retenção definida;
- finalidade visível.

---

## 6. Registro canônico de dados

Nova autoridade proposta:

```text
Doke.privacyExperience
```

Ela deverá operar sobre um registro declarativo.

Exemplo:

```js
{
  key: 'saved_service_location',
  classification: 'SENSITIVE_CONTEXT',
  purpose: 'Permitir reutilização de endereço em solicitações futuras',
  storage: 'local_encrypted_or_remote',
  scope: 'account',
  retention: 'until_user_removes_or_account_deletion',
  audience: ['account_owner'],
  thirdParties: [],
  optional: true,
  revocable: true,
  logoutPolicy: 'remove_on_shared_device_logout'
}
```

API prevista:

```text
registerDataDefinition()
getDataDefinition()
registerStorageKey()
readAccountScoped()
writeAccountScoped()
removeAccountScoped()
clearAccountData()
clearGuestData()
getPermissionState()
requestPermission()
revokeProductPermission()
getConsentState()
recordConsentDecision()
getRetentionSnapshot()
requestDataExport()
requestAccountDeletion()
getDeletionStatus()
redactForPreview()
redactForTelemetry()
```

A autoridade não substitui controles do backend.

Ela coordena a experiência e impede features de inventarem contratos locais.

---

## 7. Achado P0 — snapshot de sessão contém PII persistente

`assets/js/core/session.js` descreve o snapshot como identidade pública sanitizada e remove campos de token.

Isso é positivo.

Porém, o objeto persistido também pode conter:

- e-mail;
- telefone;
- bio;
- cidade;
- estado;
- localização;
- interesses;
- configurações;
- URLs de perfil;
- metadados de conta.

O snapshot é armazenado em:

```text
doke.auth.session.v1
```

em `localStorage`.

Problemas:

- permanece após fechar o navegador;
- é legível por qualquer JavaScript executado na origem;
- amplia o impacto de XSS;
- expõe dados em dispositivo compartilhado;
- mistura identidade de renderização com dados privados;
- o campo `remember` não altera a autoridade de storage observada.

Contrato futuro:

```text
AUTH_SECRET
→ provider authority

SESSION_RENDER_IDENTITY
→ memória ou sessionStorage mínimo

ACCOUNT_PRIVATE
→ repository específico, sob demanda
```

Snapshot mínimo recomendado:

```js
{
  accountId,
  displayName,
  role,
  avatarUrl,
  accountStatus,
  sessionStatus,
  expiresAt
}
```

E-mail e telefone só deverão ser carregados nas superfícies que realmente precisam deles.

`remember=false` deverá impedir persistência longa do snapshot.

---

## 8. Achado P0 — logout é parcial

O logout atual encerra o provider e limpa:

```text
doke.auth.session.v1
doke.auth.users.v1
doke.auth.userProfiles.v1
```

Entretanto, outras stores permanecem.

Exemplos observados:

```text
doke.search.history
doke.defaultServiceLocation
doke.savedServiceLocations
doke.browser-notifications.v1
doke.in-app-notification.center.v1
doke.in-app-notification.preferences.v1
doke.in-app-notification.digest.v1
doke.in-app-notification.bus.v1
doke.in-app-notification.action.v1
doke.service-draft.v2:<accountId>
```

Consequências:

- conta seguinte pode ver buscas anteriores;
- conta seguinte pode receber preferências anteriores;
- endereços permanecem no dispositivo;
- notificações podem continuar visíveis;
- drafts permanecem recuperáveis;
- modo DND pode ser herdado;
- conteúdo de suporte pode permanecer em storage de feature;
- logout não equivale a limpeza de privacidade.

Novo contrato:

```text
logout normal
→ encerrar sessão
→ limpar memória
→ cancelar streams
→ limpar eventos pendentes
→ remover previews sensíveis
→ preservar apenas dados account-scoped autorizados para este dispositivo

logout em dispositivo compartilhado
→ remover todo ACCOUNT_PRIVATE local da conta
→ remover TRANSACTION_PRIVATE local
→ remover drafts
→ remover histórico
→ remover endereços
→ remover notificações
→ remover caches com identidade
```

A interface deverá oferecer:

```text
Sair
Sair e remover meus dados deste dispositivo
```

Em ambiente público ou compartilhado, a segunda opção deverá ser recomendada.

---

## 9. Achado P0 — endereço completo em storage global

A Home utiliza:

```text
doke.defaultServiceLocation
doke.savedServiceLocations
```

sem namespace por conta.

O objeto observado inclui:

- título;
- rua;
- número;
- bairro;
- cidade;
- UF;
- complemento.

Esse conteúdo é `SENSITIVE_CONTEXT`.

Não poderá permanecer em chave global.

Contrato:

```text
saved-locations:<accountId>:v1
```

Requisitos:

- acesso somente após autenticação;
- rótulo claro da audiência;
- opção de remover individualmente;
- opção de não salvar;
- limpeza no logout compartilhado;
- endereço exato oculto em cards e busca;
- cidade/bairro derivados separadamente;
- não incluir endereço em analytics;
- não incluir endereço em URL;
- não incluir endereço em browser notification;
- não reutilizar em outra conta.

### 9.1 Níveis de localização

```text
COUNTRY
STATE
CITY
NEIGHBORHOOD
APPROXIMATE_AREA
EXACT_ADDRESS
LIVE_LOCATION
```

A descoberta de serviços deve operar, por padrão, no nível mínimo necessário.

```text
Home e Resultados
→ cidade, bairro ou área aproximada

pedido aprovado
→ endereço exato para participantes autorizados
```

---

## 10. Achado P0 — CEP pode ser enviado a terceiro durante digitação

O onboarding da Home chama ViaCEP.

Foi observado um listener que, ao completar oito dígitos, pode iniciar consulta silenciosa.

Assim, o CEP pode sair da aplicação antes de um clique explícito em “Buscar CEP”.

Riscos:

- compartilhamento com terceiro sem contexto suficiente;
- envio por erro de digitação;
- coleta antecipada;
- ausência de indicação clara do fornecedor;
- duplicidade de consultas em outras superfícies.

Contrato futuro:

```text
usuário digitou CEP
→ nenhuma transferência automática

usuário ativou Buscar CEP
→ explicar finalidade
→ enviar ao provider autorizado
→ preencher apenas cidade/UF necessários
```

Alternativa aceitável:

- busca automática somente após uma preferência explícita previamente registrada;
- debounce;
- latest-wins;
- cache local não pessoal;
- disclosure visível do terceiro;
- sem log da URL completa.

O CEP não deverá aparecer em:

- telemetry URL;
- console de produção;
- error tracking bruto;
- browser notification;
- analytics;
- query string de navegação.

---

## 11. Achado P0 — notificações locais não são isoladas por conta

O centro in-app usa chaves globais:

```text
doke.in-app-notification.center.v1
doke.in-app-notification.preferences.v1
doke.in-app-notification.digest.v1
```

A central pode armazenar até 250 objetos completos.

Os objetos podem conter:

- título;
- corpo;
- destino;
- IDs;
- ação;
- status;
- undo payload;
- escopo;
- datas;
- conteúdo de mensagem curta.

A filtragem por destinatário não corrige o problema do storage compartilhado.

Eventos sem destinatário explícito ainda podem ser considerados aplicáveis.

Contrato:

```text
notifications:<accountId>:center:v2
notifications:<accountId>:preferences:v2
notifications:<accountId>:digest:v2
notifications:<accountId>:seen:v2
```

Regras:

- não persistir corpo sensível quando um resumo genérico for suficiente;
- limitar retenção;
- remover ações expiradas;
- remover `undoPayload` após expiração;
- nunca usar e-mail como namespace principal;
- nunca aceitar evento sem destinatário em domínio privado;
- limpar no logout compartilhado;
- não sincronizar conteúdo entre contas do mesmo navegador.

---

## 12. Achado P0 — preview do sistema operacional pode expor conteúdo

O bridge do navegador usa diretamente:

```text
payload.title
payload.body
payload.message
```

na notificação do sistema operacional.

Isso pode aparecer:

- na tela bloqueada;
- em compartilhamento de tela;
- em central de notificações;
- em dispositivo de terceiros;
- mesmo quando a Doke não está visível.

Contrato de sensibilidade:

```text
PUBLIC_PREVIEW
PRIVATE_GENERIC
PRIVATE_AUTHENTICATED
SENSITIVE_NO_OS_PREVIEW
```

Padrão para mensagens, pedidos, pagamentos e disputas:

```text
PRIVATE_GENERIC
```

Exemplos:

```text
Nova mensagem
Abra a Doke para visualizar.
```

```text
Atualização em um pedido
Abra a Doke para conferir.
```

Nunca por padrão:

```text
João: meu endereço é Rua X, 123
Pagamento de R$ 2.450 confirmado
Contestação aberta por fraude
```

A pessoa poderá optar por previews detalhados em uma configuração separada.

Essa opção deverá começar desligada.

---

## 13. Achado P1 — prompt de notificações é precoce

O prompt customizado é agendado aproximadamente 1,6 segundo após `DOMContentLoaded` quando a permissão nativa está em estado `default`.

Ele não depende necessariamente de uma ação que demonstre intenção de receber alertas.

Contrato:

```text
primeira visita
→ não solicitar permissão

usuário ativa notificações em Configurações
→ explicar benefício e conteúdo
→ solicitar permissão nativa
```

Também poderá ser solicitado após uma ação contextual clara, como:

- acompanhar um pedido;
- receber alerta de nova mensagem;
- acompanhar uma proposta.

Regras:

- uma pre-prompt do produto antes do prompt nativo;
- “Agora não” equivalente visualmente;
- não solicitar novamente após recusa;
- indicar como reativar nas configurações do navegador;
- preferência por conta separada da permissão global do navegador;
- não afirmar que a Doke pode revogar permissão nativa;
- distinguir `default`, `granted`, `denied`, `unsupported` e `product_disabled`.

---

## 14. Achado P1 — histórico de busca é global

O histórico usa:

```text
doke.search.history
```

Ele preserva até quatro buscas sem namespace por conta.

Buscas podem revelar:

- endereço;
- necessidade doméstica;
- problema urgente;
- nome de pessoa;
- serviço sensível;
- intenção financeira;
- contexto pessoal.

Contrato:

```text
search-history:<accountId>:v2
```

Para sessão anônima:

```text
search-history:guest:<guestSessionId>:v2
```

Política proposta:

- histórico desligável;
- botão “Limpar histórico” disponível;
- TTL de 30 dias como ponto inicial de produto;
- máximo configurável;
- não sincronizar sem autorização específica;
- não registrar queries classificadas como sensíveis;
- não registrar CEP, telefone, e-mail ou endereço completo;
- limpar no logout compartilhado;
- não usar queries em RUM.

---

## 15. Achado P1 — drafts persistem conteúdo livre

`form-experience-core` salva payloads em `localStorage` com TTL padrão de 24 horas.

O namespace usa o ID da conta ou `guest`.

Problemas:

- todas as sessões anônimas compartilham `guest`;
- conteúdo livre pode incluir endereço, telefone ou descrição privada;
- logout não limpa necessariamente o draft;
- autosave ignora falha silenciosamente;
- não existe registro central das chaves;
- não existe classificação campo a campo.

Contrato de draft:

```text
draft:<accountId|guestSessionId>:<formType>:<entityId>:<schemaVersion>
```

Cada campo deverá declarar:

```text
persistInDraft: true | false
classification
retention
redaction
```

Campos proibidos em draft local por padrão:

- senha;
- token;
- CVV;
- documento completo;
- chave privada;
- URL assinada;
- anexo transacional bruto;
- conteúdo de denúncia sensível sem proteção adequada.

A pessoa deverá conseguir:

- descartar rascunho;
- ver quando foi salvo;
- saber que ficará neste dispositivo;
- limpar todos os drafts da conta;
- optar por não restaurar em dispositivo compartilhado.

---

## 16. Achado P1 — configuração pública começa ativada

As configurações observadas iniciam com:

```text
privacy.publicProfile = true
privacy.searchable = true
privacy.showPhone = false
```

A interface também renderiza Perfil público e Aparecer na busca marcados.

Esse padrão pode ser adequado a um profissional que deliberadamente publica um perfil.

Ele não é automaticamente adequado a:

- cliente;
- conta recém-criada;
- conta sem onboarding completo;
- conta suspensa;
- perfil privado;
- usuário que ainda não entendeu a audiência.

Contrato por papel:

```text
cliente novo
→ perfil público desligado
→ busca desligada

profissional durante onboarding
→ mostrar preview da audiência
→ solicitar decisão explícita antes de publicar

profissional publicado
→ estado derivado da autoridade remota
```

Nenhum default local poderá ser apresentado como preferência confirmada quando a leitura remota falhar.

---

## 17. Achado P1 — diagnóstico de suporte pré-selecionado

A configuração de suporte apresenta:

```text
Anexar diagnóstico local
```

marcada por padrão.

O texto menciona informações técnicas básicas, mas não mostra quais campos serão enviados.

Contrato:

- desligado por padrão;
- decisão por solicitação de suporte;
- preview do payload antes de enviar;
- lista exata dos campos;
- botão para copiar diagnóstico localmente;
- nunca incluir tokens;
- nunca incluir conteúdo de mensagens;
- nunca incluir endereço;
- nunca incluir histórico de busca;
- nunca incluir URL com query sensível;
- nunca incluir storage completo;
- nunca incluir IDs de terceiros não necessários;
- expirar após o envio;
- não reaproveitar consentimento indefinidamente.

Payload técnico permitido como ponto inicial:

```js
{
  appVersion,
  routeName,
  browserFamily,
  osFamily,
  viewportClass,
  connectionClass,
  normalizedErrorCode,
  correlationId
}
```

---

## 18. Achado P0 — exclusão de conta não possui autoridade encontrada

A tela de Privacidade exibe:

```text
Solicitar exclusão
```

A busca no repositório encontrou a copy no HTML, mas não encontrou um comando operacional correspondente na superfície auditada.

Isso cria risco de falsa affordance.

Uma ação de privacidade não poderá:

- parecer disponível sem backend;
- declarar solicitação registrada sem command receipt;
- apagar apenas a sessão local;
- ocultar a conta sem iniciar lifecycle real;
- usar modal genérico de sucesso.

Contrato de exclusão:

```text
AVAILABLE
CONFIRMING
REQUESTING
REQUESTED
COOLING_OFF
PROCESSING
COMPLETED
BLOCKED
FAILED
UNKNOWN_OUTCOME
```

A confirmação deverá explicar:

- o que será excluído;
- o que poderá precisar ser retido;
- o que será despublicado imediatamente;
- impacto em pedidos ativos;
- prazo informado pela autoridade responsável;
- como cancelar, quando aplicável;
- como acompanhar o status.

Sem backend ativo:

```text
Solicitação de exclusão ainda indisponível
```

Nunca:

```text
Solicitação registrada
```

sem recibo canônico.

---

## 19. Centro de privacidade

A Doke deverá oferecer uma superfície dedicada com:

### 19.1 Visibilidade

- perfil público;
- descoberta na busca;
- avaliações públicas;
- cidade pública;
- telefone transacional;
- presença online;
- publicações.

### 19.2 Permissões

- notificações do navegador;
- câmera;
- microfone;
- localização do dispositivo;
- clipboard;
- contatos futuros;
- fotos e arquivos no aplicativo futuro.

### 19.3 Dados neste dispositivo

- sessão persistida;
- endereços salvos;
- buscas recentes;
- drafts;
- notificações locais;
- caches de mídia;
- preferências;
- tamanho aproximado;
- última atualização.

### 19.4 Terceiros

- provider de autenticação;
- provider de storage;
- consulta de CEP;
- fontes;
- mídia remota;
- error tracking futuro;
- analytics futuro;
- PSP futuro.

### 19.5 Direitos e lifecycle

- corrigir dados;
- exportar dados;
- excluir endereço;
- limpar histórico;
- limpar dispositivo;
- solicitar exclusão de conta;
- acompanhar solicitação;
- contatar suporte de privacidade.

---

## 20. Contrato de permissões do navegador

### 20.1 Estados canônicos

```text
UNSUPPORTED
NOT_REQUESTED
PRODUCT_DISABLED
PROMPT_AVAILABLE
REQUESTING
GRANTED
DENIED
REVOKED_EXTERNALLY
TEMPORARILY_UNAVAILABLE
```

### 20.2 Regra de solicitação

Permissão só poderá ser solicitada após gesto explícito.

```text
click/tap intencional
→ pre-prompt contextual
→ requestPermission/getUserMedia/geolocation
```

Nunca:

```text
page load
→ prompt nativo
```

### 20.3 Microfone

A busca por áudio deverá:

- explicar que o áudio será usado para transcrição;
- indicar se haverá envio a terceiro;
- não gravar antes da permissão;
- mostrar indicador de captura;
- possuir ação de parar;
- descartar buffer após uso;
- não persistir áudio por padrão;
- permitir digitação equivalente;
- não bloquear busca comum quando negado.

### 20.4 Câmera

A captura de foto deverá:

- abrir somente por ação explícita;
- mostrar preview antes do upload;
- permitir remover;
- não manter stream após fechar modal;
- parar todos os tracks;
- remover metadados quando a imagem for publicada;
- permitir upload de arquivo como alternativa.

### 20.5 Geolocalização

Localização do dispositivo deverá ser opcional.

```text
Perto de mim
→ explicar uso
→ solicitar localização aproximada quando suficiente
```

Endereço exato não deverá ser inferido ou salvo sem confirmação.

### 20.6 Notificações

A permissão global do navegador e a preferência da conta são estados diferentes.

```text
browser granted + account enabled
→ pode notificar

browser granted + account disabled
→ não notificar

browser denied
→ explicar reativação fora da Doke
```

---

## 21. Uploads e mídia

### 21.1 Contrato público versus privado

Antes do upload, a superfície deverá declarar:

```text
Público
Visível para participantes do pedido
Visível somente para você
Visível para suporte autorizado
```

### 21.2 Metadados ocultos

Imagens lidas diretamente por `FileReader` podem preservar:

- EXIF;
- coordenadas GPS;
- modelo do dispositivo;
- data e hora;
- orientação;
- software de edição.

Contrato para mídia pública:

```text
decode
→ reorient
→ resize
→ re-encode
→ strip metadata
→ upload
```

Contrato para anexos privados:

- preservar somente metadados necessários;
- nome público sanitizado;
- MIME confirmado por conteúdo no servidor;
- malware scan;
- quarantine antes de disponibilizar;
- hash para integridade;
- lifecycle de retenção;
- delete tombstone;
- signed URL curta;
- access log autorizado.

### 21.3 URLs assinadas

A base existente de URL assinada com TTL é positiva.

Requisitos adicionais:

- não registrar URL assinada em analytics;
- não guardar em `localStorage`;
- não incluir em histórico de navegação;
- não compartilhar por notificação;
- renovar somente sob autorização;
- invalidar após remoção;
- usar `Referrer-Policy` adequada;
- não permitir indexação.

### 21.4 Fixtures

Data URLs de fixture deverão permanecer:

- limitadas;
- em memória;
- claramente demonstrativas;
- sem mistura com dados reais;
- removidas ao trocar de rota;
- nunca promovidas a autoridade remota.

---

## 22. Terceiros e cadeia de recursos

A auditoria observou recursos externos como:

- ViaCEP;
- Google Fonts;
- unpkg;
- jsDelivr;
- Supabase;
- imagens diretas de Unsplash e Pexels.

Cada request direto pode revelar ao fornecedor:

- endereço IP;
- user agent;
- horário;
- página de origem, conforme política de referrer;
- padrão de acesso.

Contrato:

- inventário de vendors;
- finalidade;
- owner interno;
- dados transmitidos;
- regiões aplicáveis;
- política de retenção conhecida;
- fallback;
- pin de versão;
- integridade ou hospedagem própria quando viável;
- `referrerpolicy` adequado;
- carregamento somente quando necessário;
- ausência de terceiros antes de `CORE_READY`, salvo exceção aprovada;
- proxy/CDN próprio para mídia pública quando apropriado;
- remoção de URLs remotas arbitrárias de conteúdo não confiável.

Mídia pública de terceiros não deverá ser confundida com conteúdo enviado por usuário real.

---

## 23. Modelo de consentimento

### 23.1 Registro

Uma decisão opcional deverá produzir:

```js
{
  accountId,
  purposeKey,
  decision,
  policyVersion,
  surface,
  decidedAt,
  expiresAt,
  source
}
```

Não persistir texto livre no receipt.

### 23.2 Granularidade

Separar:

- notificações de mensagens;
- notificações de pedidos;
- marketing futuro;
- preview detalhado;
- diagnóstico de suporte;
- busca por localização;
- sincronização de histórico;
- analytics opcional futuro.

### 23.3 Renovação

Nova decisão poderá ser exigida quando:

- finalidade mudar;
- audiência mudar;
- terceiro mudar;
- dado coletado mudar;
- retenção aumentar;
- política material mudar.

Mudança de copy sem mudança material não deve gerar prompt repetitivo.

### 23.4 Revogação

Revogação deverá:

- surtir efeito para operações futuras;
- cancelar subscriptions relacionadas;
- limpar dados locais opcionais quando apropriado;
- informar o que já foi processado;
- não fingir revogar permissão nativa que depende do navegador.

---

## 24. Storage registry

Todas as chaves locais deverão ser declaradas.

Exemplo:

```js
Doke.privacyExperience.registerStorageKey({
  keyPattern: 'notifications:<accountId>:center:v2',
  classification: 'ACCOUNT_PRIVATE',
  scope: 'account',
  ttl: 30 * DAY,
  logoutPolicy: 'remove_on_shared_device_logout',
  accountSwitchPolicy: 'hide_and_unload',
  containsFreeText: true
});
```

O registry deverá permitir:

```text
listByAccount()
listByClassification()
clearByAccount()
clearByFeature()
clearExpired()
measureApproximateSize()
```

Features não poderão escrever dados pessoais em `localStorage` diretamente fora dessa autoridade.

---

## 25. Matriz de retenção inicial

Os prazos abaixo são propostas de produto e exigem revisão jurídica e operacional.

| Dado | Storage | Retenção proposta | Limpeza |
|---|---|---:|---|
| snapshot mínimo de sessão | session/local conforme remember | até logout ou expiração | logout |
| histórico de busca | account-scoped | 30 dias | manual, TTL, logout compartilhado |
| draft comum | account-scoped | 24 horas | submit, manual, TTL |
| endereço salvo | account-scoped/remoto | até remoção | manual, exclusão da conta |
| notificações locais | account-scoped | 30 dias ou 250 itens, o menor | TTL, manual, logout compartilhado |
| digest pendente | account-scoped | 24 horas | flush, logout |
| permission preference | account-scoped | até revogação | manual |
| browser permission | browser authority | sistema operacional | navegador |
| signed URL | memória | 5 minutos | expiração |
| preview temporário | memória | rota/modal | close/route |
| suporte diagnóstico | request-scoped | até envio | submit/cancel |
| métricas RUM | agregada | definida por operação | pipeline |

Limite de itens não substitui TTL.

---

## 26. Troca de conta

A troca de conta deverá ser uma transação:

```text
ACCOUNT_SWITCH_BEGIN
→ suspender renderers privados
→ cancelar requests da conta anterior
→ remover listeners da conta anterior
→ limpar memória
→ descarregar stores da conta anterior
→ resolver nova sessão
→ carregar namespace novo
→ reconciliar badges
→ renderizar
→ ACCOUNT_SWITCH_READY
```

Durante a transição:

- não mostrar avatar anterior;
- não mostrar notificações anteriores;
- não mostrar endereços anteriores;
- não restaurar draft anterior;
- não manter chat anterior;
- não tocar som de evento anterior;
- não executar quick action anterior.

---

## 27. Shared device mode

A Doke deverá reconhecer o caso de dispositivo compartilhado sem tentar detectá-lo automaticamente.

A interface poderá oferecer:

```text
Este é um dispositivo compartilhado
```

Efeito:

- snapshot apenas na sessão;
- não salvar histórico;
- não salvar endereço local;
- não restaurar drafts após fechar;
- previews de notificação genéricos;
- limpeza ampliada no logout;
- lembrar de sair ao encerrar.

Essa opção não poderá ser usada para reduzir segurança da conta.

---

## 28. URLs, histórico e referrer

Dados sensíveis não deverão aparecer em:

- pathname;
- query string;
- hash;
- document title;
- referrer;
- nomes de arquivo públicos;
- analytics route name.

Permitido:

```text
/order/opaque-id
```

Não permitido:

```text
?email=user@example.com
?phone=...
?address=...
?q=termo-sensivel em telemetria
```

O stable shell deverá registrar somente nomes normalizados de rota.

---

## 29. Telemetria e RUM

`Doke.performanceExperience` deverá integrar redaction com `Doke.privacyExperience`.

Exemplo de evento permitido:

```js
{
  route: 'resultados',
  metric: 'LCP',
  value: 2140,
  viewportClass: 'COMPACT',
  connectionClass: '4g',
  release: '2026.08.04'
}
```

Não permitido:

```js
{
  url: location.href,
  query: searchInput.value,
  userId,
  email,
  address,
  message,
  signedUrl
}
```

### 29.1 Error reporting

Enviar:

- código normalizado;
- stack sanitizada;
- release;
- route key;
- correlation ID;
- feature flag state não pessoal.

Não enviar:

- request body;
- resposta completa;
- HTML do formulário;
- localStorage dump;
- session object;
- nomes de arquivo;
- conteúdo de chat.

---

## 30. Copy de privacidade

### 30.1 Permissão de notificação

```text
Receber alertas no navegador

A Doke poderá mostrar avisos genéricos sobre mensagens e pedidos
mesmo quando esta aba estiver fechada.

Ativar notificações
Agora não
```

### 30.2 CEP

```text
Buscar cidade pelo CEP

Ao continuar, o CEP será consultado no serviço de endereço usado pela Doke.
Usaremos o resultado para preencher cidade e estado.
```

### 30.3 Endereço

```text
Salvar neste dispositivo

Use esta opção apenas em um dispositivo pessoal.
```

### 30.4 Diagnóstico

```text
Incluir diagnóstico técnico

Serão enviados versão da Doke, navegador, sistema,
tamanho da tela e código do erro. Mensagens, endereço,
senhas e dados de pagamento não serão incluídos.
```

### 30.5 Preview público

```text
Quem poderá ver

Qualquer pessoa na Doke poderá visualizar este anúncio,
incluindo imagem, título, descrição, cidade e perfil profissional.
```

---

## 31. Acessibilidade

Toda decisão de privacidade deverá:

- ter label e descrição associados;
- não depender apenas de cor;
- informar estado atual;
- ser operável por teclado;
- possuir foco visível;
- não mover foco inesperadamente;
- anunciar sucesso ou erro uma vez;
- explicar consequência antes da confirmação;
- oferecer cancelamento;
- respeitar zoom e texto ampliado;
- funcionar sem hover;
- evitar linguagem jurídica obscura.

Toggles deverão anunciar:

```text
Perfil público, ativado
Perfil público, desativado
```

Não apenas:

```text
switch, on
```

---

## 32. Offline e falhas

### 32.1 Consentimento não confirmado

```text
escrita remota falhou
→ manter decisão como PENDING_SYNC
→ não ativar compartilhamento opcional
```

### 32.2 Revogação não confirmada

Para função opcional sensível:

```text
revogação local
→ parar processamento local imediatamente
→ marcar REVOKE_PENDING_SYNC
→ retry seguro
```

### 32.3 Exclusão com resultado desconhecido

```text
UNKNOWN_OUTCOME
→ bloquear nova solicitação duplicada
→ consultar status canônico
→ não afirmar sucesso ou falha
```

### 32.4 Storage indisponível

A aplicação deverá funcionar sem `localStorage`.

Nesse caso:

- não salvar draft;
- não salvar histórico;
- não salvar endereço;
- explicar somente quando material;
- nunca reduzir autenticação;
- nunca criar fallback global inseguro.

---

## 33. Segurança de interface

### 33.1 Clipboard

Copiar dados sensíveis deverá ser ação explícita.

A interface deverá:

- indicar o que foi copiado;
- evitar copiar campo inteiro quando mascarado;
- não ler clipboard sem intenção;
- limpar feedback visual;
- não copiar tokens.

### 33.2 Screen sharing

Superfícies sensíveis poderão oferecer modo de ocultação para:

- valores;
- telefone;
- endereço;
- comprovantes;
- documentos.

### 33.3 Autocomplete

Campos deverão usar autocomplete adequado:

- `email`;
- `tel`;
- `postal-code`;
- `street-address`;
- `new-password`;
- `current-password`.

Campos secretos não deverão receber autocomplete genérico incorreto.

### 33.4 Cache do navegador

Páginas sensíveis futuras deverão possuir política de cache coerente no servidor.

A UX não pode corrigir cache HTTP apenas limpando DOM.

---

## 34. Contrato de exclusão local

Nova API conceitual:

```text
Doke.privacyExperience.clearDeviceData({
  accountId,
  mode: 'account-only' | 'all-doke-data',
  preserve: ['theme']
})
```

Resultado:

```js
{
  removedKeys,
  removedCaches,
  cancelledRequests,
  clearedMemory,
  failedKeys,
  completedAt
}
```

A operação deverá:

- ser idempotente;
- continuar quando uma chave falhar;
- informar falhas;
- não apagar dados de outra origem;
- não apagar preferências globais sem confirmação;
- remover object URLs;
- cancelar media tracks;
- fechar canais BroadcastChannel;
- remover service worker caches account-scoped, se existirem.

---

## 35. Contrato de exportação de dados

Quando implementado:

```text
REQUESTED
PREPARING
READY
EXPIRED
DOWNLOADED
FAILED
```

Requisitos:

- autenticação recente;
- arquivo protegido;
- link com expiração;
- conteúdo legível;
- inventário de categorias;
- sem secrets;
- sem dados de outras pessoas além do necessário;
- aviso sobre armazenamento seguro do arquivo;
- download não iniciado automaticamente.

---

## 36. QA adversarial

### 36.1 Duas contas no mesmo navegador

1. entrar com conta A;
2. pesquisar;
3. salvar endereço;
4. receber notificação;
5. iniciar draft;
6. sair;
7. entrar com conta B.

Esperado:

- conta B não vê busca de A;
- conta B não vê endereço de A;
- conta B não vê draft de A;
- conta B não vê notificação de A;
- badge de A não aparece;
- quick actions de A não funcionam.

### 36.2 Logout compartilhado

- escolher “Sair e remover meus dados deste dispositivo”;
- confirmar ausência das stores account-scoped;
- confirmar sessão encerrada;
- confirmar caches privados removidos;
- confirmar tema global preservado, se escolhido.

### 36.3 CEP

- digitar sete dígitos;
- digitar oito dígitos;
- aguardar sem clicar;
- confirmar que nenhum request externo ocorre;
- clicar em Buscar CEP;
- confirmar um request;
- alterar CEP durante request;
- confirmar latest-wins;
- confirmar que logs não contêm CEP.

### 36.4 Notificações

- negar permissão;
- confirmar que prompt não reaparece;
- permitir no navegador e desativar na conta;
- confirmar ausência de notificação;
- habilitar preview genérico;
- receber mensagem sensível;
- confirmar corpo oculto;
- trocar de conta;
- confirmar isolamento.

### 36.5 Upload de imagem

- selecionar imagem com EXIF GPS;
- publicar;
- baixar mídia processada;
- confirmar remoção de GPS e device metadata;
- confirmar orientação correta;
- confirmar limite;
- confirmar remoção após exclusão.

### 36.6 Diagnóstico

- abrir suporte;
- confirmar checkbox desligado;
- habilitar;
- visualizar payload;
- confirmar ausência de tokens, mensagens, CEP e endereço;
- cancelar;
- confirmar descarte.

### 36.7 Exclusão

- autoridade ausente;
- confirmar CTA indisponível e copy honesta;
- autoridade disponível;
- solicitar;
- simular timeout;
- confirmar `UNKNOWN_OUTCOME`;
- recarregar;
- reconciliar status;
- confirmar ausência de duplicidade.

---

## 37. Gates automatizados propostos

### 37.1 `audit-account-scoped-storage.js`

Falhar quando:

- chave pessoal não tiver namespace por conta;
- feature escrever `localStorage` diretamente fora da allowlist;
- chave não estiver no registry;
- store com free text não possuir TTL.

### 37.2 `audit-logout-data-cleanup.js`

Verificar:

- sessão;
- notificações;
- drafts;
- histórico;
- endereços;
- ações pendentes;
- caches privados.

### 37.3 `audit-browser-permission-entrypoints.js`

Falhar quando:

- `requestPermission()` ocorrer sem gesto;
- `getUserMedia()` ocorrer no boot;
- `geolocation` ocorrer no load;
- prompt for repetido após deny.

### 37.4 `audit-sensitive-url-contract.js`

Bloquear:

- e-mail em URL;
- telefone em URL;
- CEP em URL;
- endereço em URL;
- signed URL em telemetry.

### 37.5 `test-notification-preview-redaction.js`

Validar:

- mensagem;
- pedido;
- pagamento;
- disputa;
- suporte.

### 37.6 `test-media-metadata-sanitization.js`

Validar:

- EXIF removido;
- GPS removido;
- orientação preservada;
- MIME real;
- malware scan status.

### 37.7 `audit-third-party-resource-registry.js`

Toda origem externa deverá possuir:

- owner;
- purpose;
- fallback;
- privacy classification;
- version pin;
- loading policy.

### 37.8 `test-account-switch-privacy.js`

Executar cenário A → logout → B.

---

## 38. Handoffs de implementação

### `PRIV-H01 — data registry e classificação`

Entregáveis:

- `Doke.privacyExperience`;
- schema de dados;
- storage registry;
- inventário inicial;
- redaction helpers.

### `PRIV-H02 — session snapshot mínimo`

Entregáveis:

- remover PII desnecessária do snapshot;
- honrar `remember`;
- separar identity render data;
- migração segura de chaves antigas.

### `PRIV-H03 — account-scoped storage`

Entregáveis:

- search history;
- endereços;
- notificações;
- drafts;
- preferências;
- guestSessionId.

### `PRIV-H04 — logout e account switch transaction`

Entregáveis:

- cleanup registry;
- shared device logout;
- cancelamento de requests;
- limpeza de memória e canais;
- testes A/B.

### `PRIV-H05 — location e CEP privacy`

Entregáveis:

- remover lookup automático;
- disclosure do provider;
- granularidade de localização;
- endereço exato transacional;
- redaction de logs.

### `PRIV-H06 — notification permission e preview privacy`

Entregáveis:

- prompt contextual;
- preferência por conta;
- preview classes;
- lock-screen generic copy;
- lifecycle de deny/revoke.

### `PRIV-H07 — media sanitization pipeline`

Entregáveis:

- re-encode;
- EXIF strip;
- MIME sniff;
- malware scan;
- audience label;
- lifecycle de remoção.

### `PRIV-H08 — support diagnostics consent`

Entregáveis:

- desligado por padrão;
- preview do payload;
- redaction;
- request-scoped decision;
- descarte no cancelamento.

### `PRIV-H09 — privacy settings by role`

Entregáveis:

- defaults cliente/profissional;
- publicação explícita;
- estado remoto confirmado;
- não usar defaults em falha.

### `PRIV-H10 — data rights center`

Entregáveis:

- export;
- correção;
- limpeza local;
- exclusão;
- status de lifecycle;
- receipts canônicos.

### `PRIV-H11 — third-party resource governance`

Entregáveis:

- registry;
- pin de versão;
- self-hosting/proxy quando apropriado;
- referrer policy;
- gate de critical path.

### `PRIV-H12 — QA, CI e evidence package`

Entregáveis:

- audits estáticos;
- testes multi-account;
- testes de permissões;
- testes de metadata;
- evidência manual;
- checklist jurídico/segurança.

---

## 39. Ordem recomendada

```text
PRIV-H01 data registry
→ PRIV-H02 session mínimo
→ PRIV-H03 storage por conta
→ PRIV-H04 logout/account switch
→ PRIV-H05 localização
→ PRIV-H06 notificações
→ PRIV-H07 uploads
→ PRIV-H08 diagnóstico
→ PRIV-H09 defaults por papel
→ PRIV-H10 direitos
→ PRIV-H11 terceiros
→ PRIV-H12 gates
```

Motivo:

- registry vem antes da migração;
- sessão e storage são os maiores riscos de vazamento entre contas;
- logout depende do registry;
- permissões e uploads dependem da classificação;
- direitos dependem do inventário;
- CI deve congelar o contrato final.

---

## 40. Critérios de aceite globais

A implementação futura só poderá ser considerada concluída quando:

- nenhuma store pessoal global permanecer sem justificativa;
- logout compartilhado remover dados locais da conta;
- conta B não visualizar dados da conta A;
- snapshot de sessão não persistir telefone, bio, localização e settings sem necessidade;
- `remember=false` não produzir persistência longa;
- CEP não sair durante digitação sem decisão explícita;
- endereço exato não aparecer em descoberta;
- browser prompt ocorrer apenas em contexto;
- previews sensíveis forem genéricos por padrão;
- notificações forem account-scoped;
- histórico de busca for account-scoped e apagável;
- drafts anônimos usarem guestSessionId;
- diagnóstico começar desligado e mostrar payload;
- imagens públicas tiverem metadados removidos;
- anexos privados tiverem lifecycle e scan;
- terceiros estiverem registrados;
- exclusão não declarar sucesso sem receipt;
- data export possuir autenticação recente e expiração;
- telemetry não carregar conteúdo pessoal;
- ações funcionarem por teclado e leitor de tela;
- testes multi-account passarem;
- staging e revisão legal/segurança forem executados em etapa autorizada.

---

## 41. Não objetivos deste sublote

Este documento não:

- implementa cookie banner;
- escolhe base legal;
- substitui política de privacidade;
- substitui termos de uso;
- define prazo jurídico definitivo;
- ativa analytics;
- ativa marketing;
- ativa câmera;
- ativa microfone;
- ativa geolocalização;
- ativa PSP;
- aplica migrations;
- acessa dados reais;
- executa exclusão;
- modifica produção.

---

## 42. Resultado esperado no produto

Após implementação, a Doke deverá apresentar o seguinte comportamento:

```text
uma conta
→ um namespace local

logout compartilhado
→ nenhum resíduo privado

CEP digitado
→ nenhum terceiro antes da ação

notificação sensível
→ preview genérico

imagem pública
→ sem EXIF/GPS

diagnóstico
→ payload visível e opt-in

exclusão
→ lifecycle real e rastreável

telemetria
→ métrica sem conteúdo pessoal
```

A privacidade deixará de depender da disciplina de cada feature.

Ela passará a ser uma autoridade transversal do produto.

---

## 43. Validação realizada neste sublote

Foi realizada inspeção documental de:

- snapshot de sessão;
- logout;
- storage keys;
- histórico de busca;
- endereços salvos;
- consulta de CEP;
- drafts;
- notificações in-app;
- notificações do navegador;
- preferências de privacidade;
- diagnóstico de suporte;
- exclusão de conta;
- uploads públicos;
- anexos privados;
- mídia e terceiros.

Não foram executados:

- navegador local;
- DevTools Network;
- Playwright;
- Lighthouse;
- teste de EXIF real;
- malware scan;
- Supabase;
- staging;
- produção;
- mutações de conta;
- exclusão real;
- exportação real.

---

## 44. Próximo sublote recomendado

```text
UX-FOUNDATION-014 — confiança, segurança, denúncias, bloqueio e moderação
```

Esse sublote deverá cobrir:

- denúncia de usuário;
- denúncia de anúncio;
- denúncia de mensagem;
- denúncia de publicação;
- bloqueio;
- silenciamento;
- evidência;
- apelação;
- status de moderação;
- segurança em encontro presencial;
- golpes;
- assédio;
- conteúdo proibido;
- limites de exposição;
- proteção de menores;
- copy de risco;
- handoff para operações.

---

## 45. Regra de branch

O PR deve permanecer:

- aberto;
- draft;
- não mesclado;
- sem auto-merge;
- exclusivamente documental nesta etapa.

Antes de qualquer implementação ou merge, a branch UX deverá ser normalizada sobre um head lógico final e limpo.
