# UX-FOUNDATION-007 — Formulários, validação, erros e confirmação de ações

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `007`
- Natureza: especificação de Produto, UX, acessibilidade e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Head lógico inspecionado: `243f38c88dea90044dd0bf237a79a14db1f2bf97`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-006`

---

## 1. Objetivo

Definir um contrato único para todos os formulários e ações mutáveis da Doke, incluindo:

- estados de formulário;
- estado de cada campo;
- validação nativa, de domínio e remota;
- foco no primeiro erro;
- resumo de erros;
- prevenção de duplo envio;
- single-flight de mutações;
- idempotência de comandos remotos;
- rascunhos;
- perda de alterações;
- ações destrutivas;
- confirmações explícitas;
- feedback de loading, sucesso, erro e offline;
- retry;
- acessibilidade;
- distinção entre sucesso real, sucesso local, fila pendente e demonstração;
- QA de teclado, leitores de tela, mobile e concorrência.

Este documento não altera HTML, CSS, JavaScript, banco, workflows, staging ou produção.

---

## 2. Superfícies auditadas

A auditoria documental considerou principalmente:

- `assets/js/core/form-experience-core.js`;
- `assets/js/pages/anunciar-servico.js`;
- `assets/js/pages/service-form-experience.js`;
- `assets/js/pages/orcamento.js`;
- `assets/js/pages/pagamento-profissional.js`;
- `pagamento-profissional.html`;
- `assets/js/pages/configuracoes.js`;
- `assets/js/ui/action-modal-system.js`;
- `assets/js/ui/system-dialog.js`;
- `assets/js/components/issue-report-dialog.js`;
- contratos de hidratação e navegação definidos nos sublotes anteriores.

As páginas foram usadas como amostra representativa. O contrato deve ser aplicado também a:

- autenticação;
- onboarding;
- perfil;
- avaliações;
- carteira e saque;
- comunidades;
- mensagens;
- pedidos;
- suporte;
- verificação profissional;
- administração;
- denúncias;
- futuras superfícies do aplicativo.

---

## 3. Causa raiz

A Doke já possui boas soluções locais, mas ainda não possui um contrato transversal completo.

Hoje coexistem abordagens diferentes:

```text
Formulário de anúncio
→ validação por etapa
→ rascunho local
→ mutation guard
→ estado submitting/success/error

Orçamento
→ checkValidity/reportValidity
→ estado loading no dataset
→ botão bloqueado durante envio
→ dialog de erro

Pagamento
→ task single-flight
→ botão aria-busy
→ modal próprio
→ validações específicas por método

Configurações
→ botões por painel
→ atualização do estado em memória
→ persistência assíncrona
→ erros principalmente no console

Action modal genérico
→ intercepta submit
→ mostra mensagem de sucesso
→ não comprova mutação
```

O problema não é ausência total de validação.

O problema é a ausência de uma autoridade que garanta que todos os fluxos respondam da mesma forma a:

- campo inválido;
- erro remoto;
- duplo clique;
- perda de rede;
- mudança de rota;
- retry;
- confirmação destrutiva;
- persistência parcial;
- rascunho não salvo;
- resposta obsoleta;
- sucesso não confirmado.

---

## 4. Princípios obrigatórios

### 4.1 Sucesso deve ter autoridade

A interface só pode declarar sucesso quando a autoridade responsável confirmar o resultado.

Não permitido:

```text
usuário clicou
→ mostrar “salvo”
```

Permitido:

```text
usuário clicou
→ comando enviado
→ autoridade confirmou
→ estado local reconciliado
→ mostrar “salvo”
```

### 4.2 Validação deve ser previsível

O mesmo erro deve produzir:

- a mesma mensagem;
- o mesmo foco;
- o mesmo estado visual;
- a mesma associação acessível;
- o mesmo comportamento em desktop e mobile.

### 4.3 Uma intenção, uma mutação

Cada ação de envio deve ser single-flight por chave lógica.

```text
submitKey = domínio + entidade + ação + versão/fingerprint
```

Exemplos:

```text
service-submit:new
service-submit:service-123
quote-submit:service-123
payment-confirm:order-456:charge-789
order-complete:order-456
settings-save:payments
profile-save:user-123
```

### 4.4 A confirmação não pode ser pré-consentida

Checkboxes de confirmação, termos e ações irreversíveis devem iniciar desmarcados.

### 4.5 Erro técnico não pode ser mascarado como vazio, sucesso ou default

```text
falha de leitura ≠ valores padrão confirmados
falha de escrita ≠ estado salvo
falha de rede ≠ nenhum conteúdo
```

### 4.6 A página deve preservar o trabalho recuperável

Quando seguro, dados preenchidos devem permanecer após:

- validação inválida;
- erro remoto;
- timeout;
- offline;
- retry;
- retorno à etapa anterior.

### 4.7 Dados sensíveis não pertencem ao rascunho local

Nunca persistir em `localStorage` ou `sessionStorage`:

- senha;
- CVV;
- número completo de cartão;
- códigos de autenticação;
- documentos sensíveis sem aprovação;
- tokens;
- secrets;
- payload financeiro bruto.

---

## 5. Achados críticos

## 5.1 P0 — action modal genérico declara sucesso sem autoridade

O `action-modal-system.js` intercepta formulários com `data-doke-action-modal-form`, impede o envio padrão e mostra a mensagem configurada ou `Solicitação registrada.`.

Não existe nesse fluxo genérico:

- comando de domínio;
- repository;
- Promise da ação;
- confirmação remota;
- estado de erro;
- retry;
- rollback;
- diferenciação entre demo e produção.

Contrato:

```text
Action modal genérico não pode possuir semântica de sucesso.
```

Ele poderá:

- fornecer estrutura visual;
- delegar submit a uma função registrada;
- exibir estados retornados pela função;
- fechar somente quando a ação confirmar sucesso.

API proposta:

```text
Doke.actionForm.register(name, {
  validate,
  submit,
  successMessage,
  errorMessage,
  mutationKey,
  closeOnSuccess
})
```

Sem `submit` registrado:

```text
estado = unavailable
CTA = desabilitado
mensagem = “Esta ação ainda não está disponível.”
```

Nunca mostrar sucesso demonstrativo como sucesso operacional.

---

## 5.2 P0 — finalização de pedido começa confirmada

Em `pagamento-profissional.html`, o checkbox `data-finish-order-confirm` está marcado por padrão.

A finalização do pedido pode:

- mudar status canônico;
- liberar pagamento em garantia;
- alterar direitos de disputa;
- iniciar avaliação;
- encerrar o ciclo operacional.

Esse consentimento precisa ser deliberado.

Contrato:

```text
checkbox de conclusão
→ unchecked por padrão
→ usuário marca manualmente
→ CTA torna-se habilitado
→ confirmação final exibe consequência
```

O texto deve explicar a consequência real:

```text
“Ao confirmar, você declara que o serviço foi concluído e autoriza a liberação do pagamento conforme as regras do pedido.”
```

Quando disputa ou problema estiver disponível, a alternativa deve permanecer visível antes da confirmação.

---

## 5.3 P0 — cartão é considerado adicionado sem validação dos campos

No checkout atual, selecionar crédito ou débito exige apenas que o formulário visual de cartão tenha sido aberto.

Os campos observados:

- não possuem `name`;
- não possuem `required`;
- não são consultados em `validateSelectedMethod()`;
- não possuem validação de número;
- não possuem validação de validade;
- não possuem validação de CVV;
- não geram token de provedor;
- não possuem autoridade PSP real.

Contrato enquanto `PAY-B01` permanecer bloqueado:

```text
cartão de crédito e débito
→ indisponíveis para confirmação real
ou
→ claramente marcados como demonstração não operacional
```

Não permitido:

```text
abrir campos
→ considerar cartão cadastrado
→ confirmar pagamento
```

Contrato futuro com PSP:

```text
campos hospedados/tokenizados pelo provedor
→ validação do provedor
→ token efêmero
→ zero CVV persistido pela Doke
→ comando financeiro idempotente
→ confirmação server-authoritative
```

A interface da Doke não deverá validar ou armazenar diretamente dados completos de cartão além do necessário para apresentação mascarada autorizada pelo provedor.

---

## 5.4 P0 — estado de Configurações pode divergir após falha de persistência

O salvamento por painel coleta os campos e altera `settingsState` antes de aguardar a persistência.

Quando `saveSettings()` falha:

- o botão recebe estado de erro;
- o console recebe warning;
- o estado em memória já pode conter os valores novos;
- os campos permanecem com os valores novos;
- o reset do painel lê o estado em memória já alterado;
- o usuário pode interpretar que a preferência foi preservada.

Contrato:

```text
confirmedSettings
editingSettings
pendingSettings
```

Fluxo obrigatório:

```text
campo alterado
→ editingSettings
→ Salvar
→ snapshot pending
→ persistir

sucesso
→ confirmed = pending
→ editing = confirmed

erro
→ confirmed preservado
→ editing preservado para retry
→ interface declara “não salvo”
→ Reset restaura confirmed
```

Nunca usar o mesmo objeto como:

- valor confirmado;
- rascunho;
- payload em trânsito.

---

## 5.5 P1 — erros de Configurações ficam pouco visíveis

Falhas de preferências e painéis são registradas principalmente com `console.warn` ou estado no botão.

Contrato:

Cada painel deverá possuir:

```text
[data-form-error-summary]
role="alert" ou aria-live apropriado
mensagem persistente
retry explícito
```

O botão vermelho ou ícone isolado não é feedback suficiente.

---

## 5.6 P1 — leitura de Configurações pode cair silenciosamente nos defaults

Quando a leitura das configurações falha, o controller usa `DEFAULT_SETTINGS`.

Isso pode fazer valores padrão parecerem preferências confirmadas da conta.

Contrato:

```text
read error
→ preservar última cópia confirmada, se segura
ou
→ mostrar estado de erro
```

Defaults só podem ser apresentados como defaults quando:

- o backend confirmou ausência de configuração;
- é uma conta nova;
- a origem do valor está explícita.

---

## 5.7 P1 — autosave de rascunho pode falhar silenciosamente

`createDraftStore.schedule()` captura erros de escrita e os ignora.

Isso evita quebra de interface, mas deixa o usuário sem saber que o rascunho não foi confirmado.

Contrato:

```text
DRAFT_IDLE
DRAFT_SAVING
DRAFT_SAVED
DRAFT_ERROR
DRAFT_UNAVAILABLE
```

Feedback mínimo:

```text
Salvando…
Rascunho salvo neste dispositivo
Não foi possível salvar o rascunho
```

A falha de autosave não deve bloquear o preenchimento, mas precisa ser observável.

---

## 5.8 P1 — identidade `guest` pode compartilhar namespace de rascunho

O draft store usa `guest` quando não consegue resolver um usuário.

Em dispositivo compartilhado, fluxos anônimos podem reutilizar o mesmo namespace.

Contrato:

Rascunhos anônimos devem usar:

```text
guestSessionId efêmero
+ form kind
+ entity/context
+ schema version
```

Ao autenticar:

- não migrar rascunho automaticamente sem consentimento;
- perguntar se o usuário deseja restaurar;
- limpar dados incompatíveis ou sensíveis.

---

## 5.9 P1 — validação do orçamento depende de bubbles nativos

O orçamento usa `checkValidity`, `reportValidity` e `setCustomValidity` em diversos pontos.

Isso é útil como camada básica, mas pode gerar:

- mensagens diferentes entre navegadores;
- feedback não persistente;
- pouco contexto em formulários por etapa;
- erro sem resumo;
- dificuldade de QA textual;
- foco sem associação visual consistente.

Contrato:

A Constraint Validation API continua permitida, mas deve alimentar uma camada canônica de erros.

```text
native validation
→ FormError normalizado
→ mensagem Doke
→ aria-invalid
→ aria-describedby
→ error summary
→ foco no campo
```

---

## 5.10 P1 — erros de anexos podem aparecer apenas em toast

No orçamento, falhas de anexos podem ser exibidas por toast.

Toast não substitui erro associado ao campo.

Contrato:

```text
erro de arquivo
→ mensagem junto ao uploader
→ aria-invalid no input/trigger
→ item rejeitado identificado
→ tamanho/tipo permitido explicado
→ foco no uploader
```

Toast pode ser complementar.

---

## 5.11 P1 — saída de formulário não possui contrato único de alterações não salvas

O anúncio possui autosave e `beforeunload`, mas não existe uma política global para:

- navegação pelo stable shell;
- fechar modal;
- trocar de painel;
- abandonar formulário sem autosave;
- sair durante upload;
- sair durante mutação.

Contrato proposto:

```text
Doke.unsavedChangesManager
```

API mínima:

```text
register(formId, {
  isDirty,
  canAutoSave,
  autoSave,
  discard,
  getDescription
})

confirmLeave(context)
clear(formId)
```

A navegação deverá distinguir:

```text
pristine
saved draft
unsaved recoverable
unsaved non-recoverable
submitting
```

---

## 6. Padrões positivos já existentes

A especificação deve aproveitar, e não descartar, boas soluções atuais.

### 6.1 Mutation guard do form experience

`createMutationGuard()` mantém uma Promise ativa por chave e retorna a mesma Promise a chamadas concorrentes.

Esse é o padrão-base para ações locais assíncronas.

### 6.2 Anúncio preserva rascunho em falha

O fluxo de anúncio:

- salva antes do submit;
- entra em `submitting`;
- valida novamente o payload;
- aguarda confirmação de `submitForReview`;
- limpa o rascunho somente após confirmação;
- volta a salvar em caso de erro.

Esse é um padrão forte.

### 6.3 Orçamento bloqueia repetição de submit

O formulário usa `data-submit-state="loading"`, desabilita o botão e restaura o CTA em falha.

### 6.4 Pagamento e conclusão usam task single-flight

`paymentTask` e `completionTask` impedem comandos concorrentes no mesmo controller.

### 6.5 Pagamento valida retorno do domínio

O controller não aceita qualquer resposta como sucesso.

Ele verifica estados esperados:

```text
payment.status === held
order.status === completed
payment.status === released
```

Esse princípio deve ser estendido para todos os formulários.

### 6.6 Preferências simples realizam rollback

Toggles individuais de Configurações preservam `previousValue` e restauram o controle quando a persistência falha.

Essa lógica deve ser generalizada para painéis completos.

---

## 7. Estado canônico do formulário

```text
FormExperienceState
├── lifecycle
├── validation
├── submission
├── draft
├── dirty
├── errors
├── warnings
├── confirmation
└── authority
```

### 7.1 Lifecycle

Estados permitidos:

```text
UNINITIALIZED
HYDRATING
READY
BLOCKED
DISABLED
DESTROYED
```

### 7.2 Edição

```text
PRISTINE
DIRTY
DRAFT_SAVING
DRAFT_SAVED
DRAFT_ERROR
```

### 7.3 Validação

```text
NOT_VALIDATED
VALIDATING
VALID
INVALID
VALIDATION_ERROR
```

### 7.4 Envio

```text
IDLE
SUBMITTING
SUCCEEDED
FAILED
OFFLINE
CANCELLED
QUEUED
UNKNOWN_OUTCOME
```

### 7.5 Autoridade

```text
LOCAL_DEMO
LOCAL_PERSISTED
REMOTE_PENDING
REMOTE_CONFIRMED
REMOTE_REJECTED
UNAVAILABLE
```

### 7.6 Estado composto mínimo

```text
{
  formId,
  entityId,
  dirty,
  lifecycle,
  validation,
  submission,
  draft,
  authority,
  activeMutationKey,
  errors,
  warnings,
  lastConfirmedAt,
  lastDraftSavedAt
}
```

---

## 8. Estado canônico do campo

```text
FieldState
├── value
├── touched
├── dirty
├── required
├── disabled
├── readonly
├── validating
├── valid
├── errors
├── warnings
└── source
```

Estados visuais permitidos:

```text
DEFAULT
FOCUSED
FILLED
VALIDATING
VALID
INVALID
DISABLED
READONLY
```

Um campo não deve depender apenas de cor para comunicar erro.

Cada erro deverá ter:

```text
code
message
fieldName
source
severity
retryable
```

Fontes:

```text
native
client-domain
remote-domain
network
permission
conflict
```

---

## 9. Ordem de validação

A ordem obrigatória será:

```text
1. normalização segura
2. required e formato local
3. regras cruzadas da etapa
4. regras do domínio local
5. validação assíncrona, quando necessária
6. confirmação da autoridade no submit
```

Exemplos:

### Horário

```text
required
→ formato HH:mm
→ fim > início
→ não sobrepor intervalos
→ autoridade de agenda no submit
```

### Preço

```text
modo de preço
→ valor obrigatório quando aplicável
→ valor numérico positivo
→ unidade de cobrança
→ regras comerciais aprovadas
```

### CEP

```text
formato
→ resolução assíncrona latest-wins
→ usuário confirma endereço
→ endereço compõe payload
```

### Upload

```text
quantidade
→ tipo
→ tamanho
→ leitura local
→ upload
→ confirmação de ownership/path
```

---

## 10. Validação por etapa

Formulários em etapas deverão possuir:

```text
StepState
├── untouched
├── dirty
├── valid
├── invalid
├── complete
└── blocked
```

### Avançar

```text
clicar Continuar
→ validar etapa atual
→ se inválida, permanecer
→ mostrar resumo local
→ focar primeiro erro
→ se válida, marcar complete
→ avançar uma vez
```

### Navegar pela progressão

- voltar para etapa anterior: permitido;
- avançar para etapa validada: permitido;
- saltar para etapa futura: validar todas as dependências;
- etapa inválida não pode parecer concluída;
- revisão final deve revalidar o payload completo.

### Conteúdo oculto

Campos de etapas ocultas:

- não devem receber foco;
- não devem produzir erros prematuros;
- devem ser revalidados quando a etapa ficar ativa;
- devem ser excluídos quando desabilitados por regra de negócio.

---

## 11. Foco no primeiro erro

Fluxo obrigatório:

```text
submit inválido
→ revelar etapa/painel
→ renderizar error summary
→ focar primeiro campo inválido
→ rolar sem esconder pelo header
```

Prioridade:

```text
1. campo inválido focável
2. trigger canônico do componente customizado
3. grupo/fieldset
4. error summary
```

Não focar:

- input hidden;
- controle desabilitado;
- elemento em painel oculto;
- erro removido do DOM.

Em componentes customizados, `aria-invalid` e `aria-describedby` deverão ficar no trigger operável, não apenas no `<select>` oculto.

---

## 12. Error summary

Formulários extensos ou por etapas devem ter resumo persistente.

Estrutura:

```text
<section role="alert" tabindex="-1" data-form-error-summary>
  <h2>Revise 3 informações</h2>
  <a href="#field-title">Informe o título</a>
  <a href="#field-price">Informe o preço</a>
  <a href="#field-image">Adicione uma imagem</a>
</section>
```

Regras:

- links levam ao campo;
- contagem reflete erros atuais;
- erro corrigido é removido;
- mensagem não some automaticamente antes da correção;
- reader recebe anúncio uma vez por tentativa;
- mensagens não devem duplicar infinitamente.

Formulários pequenos podem usar erro por campo sem summary, desde que o primeiro erro seja focado e anunciado.

---

## 13. Validação assíncrona

Exemplos:

- username;
- CEP;
- disponibilidade;
- cupom;
- saldo;
- elegibilidade;
- estado atual do anúncio;
- contexto de cobrança.

Contrato:

```text
LATEST_WINS_PER_FIELD_FINGERPRINT
```

Cada validação deverá possuir:

```text
validationGeneration
fingerprint
AbortController ou descarte por generation
```

Resposta antiga não poderá:

- marcar campo como válido;
- remover erro novo;
- substituir endereço;
- habilitar submit;
- mudar saldo;
- afirmar disponibilidade.

Durante validação necessária:

```text
field.validating = true
submit bloqueado somente quando a regra for obrigatória
```

Não usar spinner infinito sem timeout e retry.

---

## 14. Single-flight de submissão

Autoridade proposta:

```text
Doke.formMutationManager
```

API:

```text
run({
  key,
  payloadFingerprint,
  task,
  idempotencyKey,
  allowRetry
})
```

Comportamento:

```text
mesma key + mesmo fingerprint
→ retornar Promise ativa

mesma key + fingerprint diferente
→ rejeitar conflito local
ou
→ cancelar/substituir quando o domínio permitir
```

Para ações financeiras, pedidos, mensagens e publicação:

- idempotency key deve atravessar o comando server-owned;
- botão desabilitado não é a única proteção;
- refresh/retry não pode duplicar efeito;
- timeout deve resultar em `UNKNOWN_OUTCOME` quando o servidor pode ter processado.

---

## 15. Estado do botão de ação

Estados permitidos:

```text
IDLE
DISABLED
LOADING
SUCCESS
ERROR
```

Contrato visual:

### IDLE

- texto da ação;
- habilitado conforme validade e permissão.

### LOADING

- `disabled` quando apropriado;
- `aria-disabled` sincronizado;
- `aria-busy="true"`;
- texto descritivo, por exemplo `Enviando…`;
- largura estável;
- spinner não obrigatório quando o texto já comunica progresso.

### SUCCESS

- apenas após confirmação;
- feedback temporário em ações não navegacionais;
- feedback persistente em ações que alteram estado crítico.

### ERROR

- botão volta a ficar utilizável quando retry for seguro;
- erro permanece em superfície textual;
- label não deve ser o único local do erro.

---

## 16. Outcome desconhecido

Em operações remotas, timeout não significa necessariamente falha.

Contrato:

```text
request enviado
→ conexão caiu
→ resultado desconhecido
```

A interface não deve instruir retry cego em operações que podem duplicar efeito.

Estado:

```text
UNKNOWN_OUTCOME
```

Mensagem:

```text
“Não foi possível confirmar o resultado. Estamos verificando o estado do pedido antes de permitir uma nova tentativa.”
```

Ações:

- consultar estado canônico;
- usar idempotency key;
- liberar retry somente após reconciliação;
- nunca mostrar sucesso ou falha definitiva sem evidência.

Aplicável especialmente a:

- pagamento;
- refund;
- payout;
- finalização;
- criação de pedido;
- publicação;
- exclusão.

---

## 17. Confirmações

## 17.1 Classificação

```text
LOW_RISK
REVERSIBLE
DESTRUCTIVE
FINANCIAL
LEGAL_CONSENT
```

### LOW_RISK

Exemplo: alterar ordenação.

- sem dialog obrigatório.

### REVERSIBLE

Exemplo: pausar anúncio.

- confirmação inline opcional;
- undo quando possível.

### DESTRUCTIVE

Exemplo: excluir conteúdo.

- dialog explícito;
- objeto nomeado;
- consequência informada;
- CTA destrutivo específico.

### FINANCIAL

Exemplo: confirmar pagamento, refund ou liberação.

- resumo da entidade;
- valor;
- destinatário;
- consequência;
- consentimento desmarcado;
- comando idempotente.

### LEGAL_CONSENT

- texto e versão do termo;
- consentimento não pré-marcado;
- timestamp e versão quando a autoridade existir;
- link para o termo.

---

## 17.2 Texto de confirmação

Evitar:

```text
Tem certeza?
Confirmar
```

Preferir:

```text
Finalizar o pedido “Pintura residencial”?
Ao finalizar, o pagamento em garantia poderá ser liberado ao profissional.

Cancelar
Finalizar e liberar conforme as regras
```

O CTA deve descrever a ação.

---

## 17.3 Confirmação pré-marcada

Proibido em:

- conclusão do serviço;
- exclusão;
- aceite de termos;
- autorização financeira;
- compartilhamento de dados;
- inscrição em cobrança;
- publicação pública.

---

## 18. Rascunhos

## 18.1 Tipos

```text
LOCAL_EPHEMERAL
LOCAL_PERSISTED
REMOTE_DRAFT
```

A interface deve declarar qual tipo está usando.

Exemplos:

```text
Rascunho salvo neste dispositivo
Rascunho salvo na sua conta
```

Nunca usar apenas `Salvo` quando o dado não está confirmado remotamente.

## 18.2 Chave

```text
formKind
user/session identity
entityId/context
schemaVersion
```

## 18.3 TTL

O TTL deve ser explícito por domínio.

Ao expirar:

- remover com segurança;
- não restaurar silenciosamente;
- não misturar schemas.

## 18.4 Restore

Ao encontrar rascunho relevante:

```text
“Encontramos um rascunho salvo em 4 de agosto às 09:20.”

Restaurar
Descartar
```

Restauração automática só é permitida quando:

- o risco é baixo;
- o mesmo usuário/contexto está confirmado;
- o schema é compatível;
- não há dados sensíveis;
- a experiência não fica ambígua.

## 18.5 Persistência de arquivos

Inputs de arquivo não são restauráveis por segurança.

O formulário deverá explicar:

```text
“Os textos foram restaurados. Selecione novamente os arquivos.”
```

## 18.6 Limpeza

Limpar rascunho somente após:

- sucesso confirmado;
- descarte explícito;
- expiração;
- logout, quando necessário por privacidade.

Não limpar no início do submit.

---

## 19. Alterações não salvas

### Sem autosave

Ao tentar sair:

```text
Você tem alterações não salvas.

Continuar editando
Descartar alterações
```

### Com autosave confirmado

A navegação pode prosseguir sem dialog quando:

- o rascunho foi confirmado;
- nenhum upload/mutação está ativo;
- o usuário consegue restaurar.

### Autosave com erro

A navegação exige alerta:

```text
Não foi possível salvar seu rascunho neste dispositivo.
```

### Submitting

Durante mutação:

- não iniciar uma segunda mutação;
- impedir saída acidental quando o resultado pode ficar desconhecido;
- oferecer cancelamento apenas quando a operação for cancelável.

---

## 20. Feedback de sucesso

Tipos:

```text
INLINE
TOAST
BANNER
MODAL
NAVIGATION_DESTINATION
```

### Inline

Adequado para preferência simples.

### Toast

Adequado para ação pequena e reversível.

Não adequado como único feedback de:

- pagamento;
- criação de pedido;
- upload com erro;
- publicação;
- exclusão.

### Modal

Adequado para conclusão de fluxo importante, desde que:

- tenha foco;
- tenha autoridade;
- não bloqueie Promises após rota;
- integre com `Doke.overlayManager`.

### Destino

Após criação de pedido, navegar para a entidade criada pode ser o feedback mais útil.

---

## 21. Feedback de erro

Tipos normalizados:

```text
VALIDATION
PERMISSION
CONFLICT
NOT_FOUND
UNAVAILABLE
OFFLINE
TIMEOUT
RATE_LIMIT
UNKNOWN_OUTCOME
SERVER_REJECTED
```

Mensagens devem responder:

```text
O que aconteceu?
O que foi preservado?
O que o usuário pode fazer?
```

Exemplo:

```text
“Não foi possível enviar o anúncio. Seu rascunho continua salvo neste dispositivo. Revise sua conexão e tente novamente.”
```

Evitar:

```text
Erro inesperado
Falha 500
Algo deu errado
```

Detalhes técnicos ficam em logs sanitizados, não na mensagem principal.

---

## 22. Retry

Retry permitido quando:

- ação é idempotente;
- payload permanece válido;
- permissão continua válida;
- outcome anterior é conhecido;
- entidade não mudou de versão.

Antes do retry:

```text
revalidar autoridade
revalidar contexto
revalidar fingerprint
```

Exemplos:

### Anúncio

- confirmar se o draft/versão ainda é editável.

### Orçamento

- confirmar se o serviço continua ativo.

### Pagamento

- reconciliar cobrança antes de permitir outra confirmação.

### Configurações

- comparar versão/updatedAt quando houver concorrência multi-dispositivo.

---

## 23. Offline

Estados:

```text
OFFLINE_EDITABLE
OFFLINE_BLOCKED
OFFLINE_QUEUED
```

### OFFLINE_EDITABLE

- permitir preenchimento;
- salvar rascunho local;
- bloquear comando remoto;
- explicar o estado.

### OFFLINE_BLOCKED

Aplicável a pagamentos e ações que exigem autoridade atual.

### OFFLINE_QUEUED

Só permitido quando existir fila server/client formal, segura e idempotente.

Não criar fila implícita usando localStorage para ações financeiras.

---

## 24. Acessibilidade

### Campos

- label programático obrigatório;
- helper via `aria-describedby`;
- erro via `aria-describedby`;
- `aria-invalid="true"` enquanto inválido;
- required textual e programático;
- grupos com `fieldset` e `legend`.

### Erros

- não depender só de cor;
- mensagem persistente;
- foco previsível;
- resumo navegável;
- `role="alert"` usado com moderação.

### Loading

- `aria-busy` sincronizado;
- texto de progresso;
- evitar anúncios repetitivos a cada frame;
- CTA não deve desaparecer sem substituto.

### Sucesso

- anunciar confirmação;
- mover foco para heading ou ação principal da superfície de sucesso;
- não retornar foco ao botão antigo quando ele foi removido.

### Modais

Seguir `UX-FOUNDATION-006`:

- focus trap;
- `inert` no fundo;
- stack;
- Escape no topo;
- retorno resiliente;
- fechamento transacional em rota.

---

## 25. Segurança e privacidade

### Dados de cartão

- não armazenar CVV;
- não armazenar PAN completo;
- usar campos/tokenização do PSP;
- mascarar apresentação;
- logs sem payload sensível.

### Documentos

- validar tipo e tamanho;
- upload para path owner-scoped;
- não manter base64 em localStorage;
- não incluir documento bruto em telemetria.

### Mensagens de erro

Não expor:

- política interna;
- IDs sensíveis;
- stack trace;
- assinatura;
- secrets;
- detalhes de RLS;
- informação de outra conta.

### Drafts

- usuário/contexto isolado;
- logout limpa drafts sensíveis conforme política;
- não sincronizar automaticamente sem consentimento;
- não telemetrizar conteúdo bruto.

---

## 26. Contrato específico — Anunciar serviço

Pontos preservados:

- validação por etapa;
- upload validado;
- draft;
- single-flight;
- payload revalidado;
- sucesso após confirmação.

Handoffs necessários:

1. adicionar estado visível do autosave;
2. associar erros a campos com IDs estáveis;
3. criar error summary por etapa;
4. integrar alterações não salvas ao stable shell;
5. cancelar timers de draft no destroy;
6. distinguir rascunho local de versão remota;
7. perguntar antes de descartar draft;
8. preservar foco ao retornar de erro de submit;
9. bloquear edição enquanto o submit está ativo, sem esconder dados;
10. tratar `UNKNOWN_OUTCOME` quando aplicável.

---

## 27. Contrato específico — Orçamento

Pontos preservados:

- validação por etapa;
- contexto do serviço;
- endereço separado;
- anexos;
- botão bloqueado em loading;
- revalidação do anúncio antes da criação;
- sucesso com link para pedido.

Handoffs necessários:

1. normalizar erros nativos;
2. criar error summary;
3. associar erro de anexo ao uploader;
4. focar primeiro erro;
5. guardar rascunho não sensível;
6. preservar respostas após erro remoto;
7. single-flight via manager compartilhado;
8. outcome desconhecido e reconciliação;
9. endereço modal integrado ao overlay manager;
10. evitar defaults de localização que pareçam confirmação do usuário.

---

## 28. Contrato específico — Pagamento

Enquanto PAY não possui PSP real:

- Pix ilustrativo não pode parecer cobrança bancária real;
- cartão não pode parecer cadastrado ou validado;
- comprovante mockado deve permanecer explicitamente demonstrativo;
- comandos devem continuar sob gates de autoridade existentes.

Antes de ativar pagamento real:

1. PSP contratado;
2. adapter específico;
3. campos tokenizados;
4. idempotência server-side;
5. webhook;
6. reconciliação;
7. política comercial/fiscal;
8. dispute/refund/chargeback;
9. staging operacional;
10. UX revisada contra os contratos PAY.

A finalização do pedido deverá:

- iniciar desmarcada;
- explicar liberação do pagamento;
- manter alternativa de problema;
- bloquear duplo clique;
- reconciliar outcome desconhecido;
- exigir estado canônico compatível.

---

## 29. Contrato específico — Configurações

Novo modelo:

```text
confirmedSettings
editingSettings
pendingSettings
```

Cada painel deverá possuir:

```text
dirty indicator
Salvar
Descartar alterações
error summary
retry
last saved state
```

Toggles de aplicação imediata deverão:

- entrar em pending;
- bloquear clique repetido;
- persistir;
- confirmar;
- rollback em erro;
- anunciar o resultado.

Painéis não poderão marcar `dirty=false` antes da confirmação.

O reset sempre restaura `confirmedSettings`.

---

## 30. Contrato específico — Perfil e mídia

### Campos textuais

- executar `checkValidity`/regras de domínio antes de submit;
- nome, username e localização precisam de contratos próprios;
- erro deve aparecer junto ao campo;
- botão deve ser single-flight.

### Avatar/capa

Fluxo:

```text
selecionar
→ validar tipo/tamanho/dimensões
→ preview local
→ upload/persistência
→ confirmação
```

Em erro:

- restaurar mídia confirmada;
- manter mensagem;
- permitir nova tentativa;
- nunca mostrar preview como mídia salva antes da confirmação.

---

## 31. Contrato específico — Dialogs de ação

Dialogs Promise-based devem retornar resultado estruturado:

```text
{
  status: "confirmed" | "cancelled" | "dismissed" | "failed",
  reason,
  value
}
```

Em route-change:

```text
status = dismissed
reason = route-change
```

O dialog visual não executa domínio por conta própria.

Camadas:

```text
Dialog presentation
Action controller
Domain command
```

---

## 32. QA — matriz de validação

Para cada campo obrigatório:

- vazio;
- whitespace;
- valor mínimo;
- valor máximo;
- caracteres especiais;
- acentos;
- colagem;
- autofill;
- mobile keyboard;
- leitor de tela;
- erro corrigido;
- retorno à etapa.

Para campos numéricos:

- zero;
- negativo;
- decimal;
- separador brasileiro;
- valor enorme;
- letras coladas;
- notação científica;
- arredondamento.

Para data/horário:

- passado;
- hoje;
- timezone;
- horário final igual ao inicial;
- horário final anterior;
- DST quando aplicável;
- intervalo indisponível.

Para arquivos:

- tipo permitido;
- tipo falso/extensão divergente;
- tamanho limite;
- acima do limite;
- zero bytes;
- arquivo corrompido;
- múltiplos arquivos;
- cancelamento do picker;
- falha de leitura;
- falha de upload;
- retry.

---

## 33. QA — matriz de submissão

- clique único;
- clique duplo;
- Enter;
- Enter repetido;
- touch repetido;
- submit pelo teclado;
- submit por código;
- navegação durante submit;
- back durante submit;
- refresh durante submit;
- offline antes;
- offline durante;
- timeout;
- resposta 4xx;
- resposta 5xx;
- resposta inválida;
- sucesso sem ID;
- resposta obsoleta;
- retry com mesmo payload;
- retry com payload alterado;
- duas abas;
- versão da entidade mudou;
- permissão revogada.

Assert obrigatório:

```text
uma intenção lógica não produz dois efeitos
```

---

## 34. QA — confirmações

- checkbox inicia desmarcado;
- CTA bloqueado até consentimento;
- consentimento não persiste entre entidades;
- fechar e reabrir reseta conforme contrato;
- Escape cancela;
- backdrop cancela quando permitido;
- route-change resolve Promise;
- foco inicial correto;
- foco retorna;
- texto nomeia entidade;
- consequência visível;
- CTA destrutivo é específico;
- leitor de tela anuncia título e descrição.

---

## 35. QA — rascunhos

- autosave confirmado;
- storage indisponível;
- quota excedida;
- schema antigo;
- TTL expirado;
- usuário diferente;
- guest session diferente;
- logout;
- restore;
- discard;
- arquivo não restaurado;
- erro remoto após restore;
- submit limpa somente após sucesso;
- crash/reload;
- duas abas;
- conflito entre draft local e remoto.

---

## 36. Observabilidade

Eventos permitidos, sem conteúdo bruto:

```text
form_viewed
form_started
step_completed
validation_failed
submit_started
submit_succeeded
submit_failed
submit_unknown
retry_started
draft_saved
draft_failed
form_abandoned
```

Campos permitidos:

- form kind;
- step index;
- error code;
- field category, não valor;
- duração;
- authority;
- online/offline;
- retry count limitado.

Não registrar:

- texto digitado;
- endereço bruto;
- cartão;
- documento;
- anexo;
- mensagem de suporte;
- query sensível;
- payload de pagamento.

---

## 37. Autoridades propostas

```text
Doke.formExperience
Doke.formMutationManager
Doke.formValidation
Doke.formErrorSummary
Doke.unsavedChangesManager
Doke.actionConfirmation
```

Integração com autoridades anteriores:

```text
Doke.overlayManager
Doke.navigationLifecycle
Doke.routeFocusManager
Doke.routeAnnouncer
Doke.pageLifecycle
```

---

## 38. API conceitual

```text
const experience = Doke.formExperience.create({
  id,
  root,
  entity,
  draft,
  validate,
  submit,
  mutationKey,
  confirmation,
  onSuccess,
  onError
})
```

Métodos:

```text
getState()
validateField()
validateStep()
validateAll()
submit()
retry()
saveDraft()
restoreDraft()
discardDraft()
reset()
destroy()
```

O contrato não obriga uma implementação monolítica. Ele obriga comportamento observável consistente.

---

## 39. Ordem de implementação recomendada

### FORM-H01 — núcleo de estado e erros

- estados canônicos;
- FieldError;
- error summary;
- foco no primeiro erro.

### FORM-H02 — mutation manager

- single-flight;
- fingerprint;
- outcome desconhecido;
- adapter para `createMutationGuard`.

### FORM-H03 — drafts e alterações não salvas

- feedback de autosave;
- storage error;
- guest session;
- stable shell guard.

### FORM-H04 — Configurações

- confirmed/editing/pending;
- rollback;
- erro visível.

### FORM-H05 — action modals

- remover sucesso falso;
- registro de handlers;
- resultados estruturados.

### FORM-H06 — orçamento

- erros normalizados;
- anexos;
- draft;
- unknown outcome.

### FORM-H07 — anúncio

- error summary;
- autosave observável;
- unsaved changes.

### FORM-H08 — pagamento e conclusão

Somente após alinhamento com PAY:

- confirmação desmarcada;
- métodos indisponíveis quando não operacionais;
- integração PSP;
- reconciliação.

### FORM-H09 — regressão global

- Playwright;
- teclado;
- leitor de tela;
- mobile;
- concorrência;
- visual diff.

---

## 40. Critérios de aceite globais

Uma implementação só será aceita quando:

- nenhum submit relevante duplicar mutação;
- nenhum sucesso for exibido sem autoridade;
- todo erro de campo possuir associação acessível;
- primeiro erro receber foco;
- confirmação crítica iniciar desmarcada;
- ação financeira mostrar entidade, valor e consequência;
- formulário preservar dados após erro seguro;
- rascunho informar se é local ou remoto;
- falha de autosave for visível;
- Configurações diferenciar confirmado de editado;
- action modal sem handler não declarar sucesso;
- cartão não operacional não parecer validado;
- offline possuir estado específico;
- timeout crítico não gerar retry cego;
- route-change resolver dialogs e limpar mutações locais com segurança;
- desktop e mobile apresentarem o mesmo contrato;
- testes cobrirem duplo clique e Enter repetido;
- staging e produção continuarem separados pelos gates existentes.

---

## 41. Fora de escopo deste sublote

Não incluído:

- implementação do form manager;
- alteração de campos;
- ativação de pagamentos;
- contratação de PSP;
- persistência remota de drafts;
- mudança de regras comerciais;
- migrations;
- deploys;
- staging;
- produção;
- merge;
- autorização para ações remotas.

---

## 42. Impacto esperado no produto

Após os handoffs:

- formulários terão comportamento previsível;
- o usuário não perderá dados por erros recuperáveis;
- erros serão mais fáceis de corrigir;
- ações críticas exigirão consentimento deliberado;
- pagamentos não parecerão válidos sem PSP;
- configurações não parecerão salvas após falha;
- modais demonstrativos não afirmarão sucesso real;
- submits repetidos não criarão efeitos duplicados;
- rascunhos terão estado confiável;
- leitores de tela receberão mensagens úteis;
- desktop e mobile compartilharão o mesmo lifecycle;
- suporte e QA terão códigos e estados reproduzíveis;
- a futura aplicação poderá reutilizar os mesmos contratos.

---

## 43. Próximo sublote

`UX-FOUNDATION-008 — conteúdo, microcopy, estados vazios e linguagem operacional`.

O próximo contrato deverá definir:

- tom da Doke;
- títulos e descrições;
- labels de CTA;
- mensagens de erro;
- mensagens de sucesso;
- estados vazios;
- linguagem de autoridade;
- distinção entre demo, local, staging e operação real;
- datas, valores e pluralização;
- terminologia única para anúncio, serviço, orçamento, pedido, proposta, cobrança e pagamento.

---

## 44. Regra de governança

Este documento permanece especificação.

Nenhum handoff autoriza automaticamente:

- edição de runtime;
- alteração de pagamento;
- acesso a staging;
- uso de dados reais;
- deploy;
- migration;
- produção;
- merge ou auto-merge.

A branch deverá ser normalizada sobre um head lógico final e limpo antes de qualquer implementação.