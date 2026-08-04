# UX-FOUNDATION-008 — Conteúdo, microcopy, estados vazios e linguagem operacional

## Status

- Frente: `UX-FOUNDATION`
- Sublote: `008`
- Natureza: especificação de Produto, UX Writing, acessibilidade e QA
- Branch: `ux/ux-foundation-001`
- Escopo desta entrega: documentação somente
- Runtime alterado: não
- Staging acessado: não
- Produção acessada: não
- Merge autorizado: não
- Head lógico principal inspecionado: `243f38c88dea90044dd0bf237a79a14db1f2bf97`
- Head PAY móvel observado durante a auditoria: `5f50eb5b88926bf96be7e5fed6db726c886129c8`
- Dependências: `UX-FOUNDATION-001` até `UX-FOUNDATION-007`

---

## 1. Objetivo

Definir uma linguagem canônica para toda a experiência Doke, cobrindo:

- nomes dos objetos de negócio;
- estados operacionais;
- ações e CTAs;
- títulos e descrições de páginas;
- mensagens de loading;
- estados vazios;
- erros;
- offline e indisponibilidade;
- sucessos;
- resultados desconhecidos;
- datas e horários;
- valores monetários;
- identidade e fallbacks;
- notificações e toasts;
- linguagem de inteligência artificial;
- alegações de segurança, proteção e autoridade;
- acessibilidade da microcopy;
- consistência entre Home, Resultados, Pedido, Mensagens, Pagamento, Carteira, Perfil e Configurações.

Este documento não altera HTML, CSS, JavaScript, serviços, banco, workflows, staging ou produção.

---

## 2. Superfícies auditadas

A auditoria documental considerou principalmente:

- `pedidos.html`;
- `assets/js/pages/pedidos/orders-data.js`;
- `assets/js/pages/pedidos/orders-render.js`;
- `assets/js/pages/pedidos/orders-intelligence.js`;
- `assets/js/pages/pedidos.js`;
- `assets/js/pages/orcamento.js`;
- `assets/js/pages/mensagens.js`;
- `assets/js/pages/pagamento-profissional.js`;
- `pagamento-profissional.html`;
- `assets/js/pages/search-results.js`;
- `assets/js/pages/configuracoes.js`;
- `assets/js/components/operational-event-toast.js`;
- `assets/js/ui/action-modal-system.js`;
- contratos de cards, navegação, overlays e formulários dos sublotes anteriores.

A especificação deve ser aplicada também a:

- autenticação;
- onboarding;
- notificações;
- carteira e saque;
- avaliações;
- denúncias e disputas;
- comunidades;
- suporte;
- verificação profissional;
- administração;
- aplicativo futuro.

---

## 3. Causa raiz

A Doke possui vocabulário útil e partes maduras de comunicação, mas a linguagem ainda é formada por decisões locais de cada página ou controller.

O mesmo conceito pode aparecer como:

```text
pedido
solicitação
solicitação de orçamento
orçamento
proposta
atendimento
serviço
```

O mesmo status pode aparecer como:

```text
Aguardando resposta
Aguardando você
Ação pendente
Aguardando profissional
Pedido enviado
Pendente
```

E conceitos diferentes podem receber linguagem semelhante:

```text
proposta aprovada
pagamento confirmado
pagamento em garantia
atendimento liberado
pedido em andamento
```

Isso cria quatro problemas estruturais.

### 3.1 Objeto, estado e ação são misturados

Exemplo:

```text
status: pending
label: Aguardando resposta
summary: Aguardando você
badge: Ação pendente
```

O label descreve uma espera, o summary aponta para uma pessoa e o badge descreve uma obrigação. Os três podem ser válidos em contextos diferentes, mas não são equivalentes.

### 3.2 Linguagem não respeita a perspectiva do usuário

`Aguardando você` é adequado somente quando a ação realmente pertence à pessoa autenticada.

A mesma frase é incorreta quando:

- o cliente aguarda o profissional;
- o profissional aguarda o cliente;
- o sistema aguarda confirmação remota;
- não existe ação possível para aquela pessoa.

### 3.3 Fallbacks podem fabricar realidade

Quando o contexto não é resolvido, aparecem fallbacks como:

```text
Profissional Doke
Studio Aquarela
R$ 280,00
DK
Sob orçamento
Região a confirmar
Pedido
```

Alguns são placeholders legítimos de demonstração. Porém, em uma superfície operacional, podem parecer dados confirmados.

### 3.4 A interface faz alegações acima da autoridade ativa

Foram encontrados textos como:

```text
IA: risco detectado
Pagamento protegido pela Doke
Pagamento confirmado
Comprovante disponível
Aprovação rápida
```

Essas frases exigem autoridade específica.

Elas não podem ser derivadas apenas de:

- fixture;
- heurística local;
- abertura de campos;
- estado visual;
- mock;
- ausência de erro no navegador.

---

## 4. Princípios canônicos de conteúdo

### 4.1 Verdade operacional antes de persuasão

A interface deve dizer apenas o que a autoridade atual consegue provar.

```text
autoridade confirmada
→ afirmação definitiva

autoridade local ou demonstrativa
→ linguagem limitada e explícita

autoridade indisponível
→ estado indisponível ou desconhecido
```

### 4.2 Uma frase deve cumprir uma função

Cada bloco deve ter função única:

- título: identificar o estado ou tarefa;
- descrição: explicar consequência ou contexto;
- CTA: indicar a próxima ação;
- suporte: esclarecer restrição ou política;
- diagnóstico: fornecer código técnico ocultável ou copiável.

### 4.3 Verbo e objeto explícitos

Preferir:

```text
Abrir conversa
Ver proposta
Enviar cobrança
Tentar novamente
Limpar filtros
Salvar alterações
```

Evitar:

```text
Continuar
Avançar
Ver agora
Confirmar
Ok
Pronto
```

quando o objeto ou a consequência não estiverem claros.

### 4.4 Não culpar o usuário

Evitar:

```text
Você fez algo errado
Dados inválidos
Falha do usuário
Tente direito
```

Preferir:

```text
Revise o número do cartão.
Informe uma data futura.
Não foi possível confirmar esta alteração.
```

### 4.5 Não prometer tempo sem fonte

Evitar:

```text
Aprovação rápida
Resposta em instantes
Só mais alguns segundos
Está quase lá
```

A menos que exista SLA ou progresso mensurável.

### 4.6 Não personificar automação determinística como IA

Uma regra local, score ou filtro não poderá usar o prefixo `IA`.

```text
heurística determinística
→ Sugestão operacional

modelo de IA realmente ativo e auditado
→ Sugestão gerada por IA
```

### 4.7 Linguagem curta, mas não incompleta

O texto deve ser reduzido sem remover:

- o que aconteceu;
- o que não aconteceu;
- o que o usuário pode fazer;
- a consequência da ação.

---

## 5. Glossário canônico de entidades

### 5.1 Anúncio

Definição:

> Oferta pública criada por um profissional para apresentar um serviço.

Usar em:

- criação;
- edição;
- moderação;
- catálogo;
- cards;
- perfil profissional.

Exemplos:

```text
Criar anúncio
Editar anúncio
Anúncio enviado para análise
Anúncio indisponível
```

Não usar `serviço` como sinônimo do registro quando o contexto é edição ou moderação.

### 5.2 Serviço

Definição:

> Trabalho ou atividade oferecida no anúncio e executada pelo profissional.

Usar em:

- descrição da oferta;
- escopo;
- execução;
- conclusão;
- avaliação.

Exemplos:

```text
Detalhes do serviço
Serviço em andamento
Serviço concluído
Avaliar serviço
```

### 5.3 Solicitação de orçamento

Definição:

> Pedido inicial enviado pelo cliente a partir de um anúncio.

Nome curto contextual:

```text
solicitação
```

Usar em:

- formulário de orçamento;
- confirmação de envio;
- primeira etapa do ciclo.

Exemplos:

```text
Enviar solicitação
Solicitação enviada
Aguardando resposta do profissional
```

### 5.4 Pedido

Definição:

> Registro operacional que acompanha a solicitação, negociação, proposta, pagamento e execução.

Usar como entidade agregadora depois que a solicitação foi registrada.

Exemplos:

```text
Ver pedido
Pedido aceito
Pedido em andamento
Pedido cancelado
```

### 5.5 Proposta

Definição:

> Condições comerciais enviadas pelo profissional para aprovação do cliente.

Pode conter:

- valor;
- forma de cobrança;
- escopo;
- prazo;
- condições.

A proposta não é pagamento e não é cobrança.

Exemplos:

```text
Enviar proposta
Proposta enviada
Aprovar proposta
Proposta recusada
```

### 5.6 Cobrança

Definição:

> Solicitação financeira emitida depois da proposta aprovada, quando o fluxo permitir pagamento.

A cobrança não prova pagamento.

Exemplos:

```text
Enviar cobrança
Cobrança enviada
Aguardando pagamento
Cobrança cancelada
```

### 5.7 Pagamento

Definição:

> Operação financeira confirmada pela autoridade de pagamentos.

Só usar `pago`, `confirmado`, `em garantia`, `liberado` ou `reembolsado` quando o domínio financeiro confirmar o estado.

### 5.8 Repasse

Definição:

> Transferência ou disponibilidade do valor ao profissional após as condições de liberação.

Não usar como sinônimo de pagamento do cliente.

### 5.9 Contestação

Definição:

> Processo aberto quando uma das partes questiona entrega, pagamento ou condições do pedido.

Evitar alternar entre:

```text
disputa
contestação
problema
reclamação
```

Na interface pública, usar `contestação` como termo principal.

### 5.10 Avaliação

Definição:

> Feedback registrado depois de um serviço elegível.

Não usar `avaliação pendente` se o usuário ainda não estiver autorizado ou se o pedido não estiver concluído canonicamente.

---

## 6. Separação entre status, resumo, badge e próxima ação

Cada pedido deve possuir quatro campos semânticos distintos.

```text
statusLabel
statusDescription
attentionBadge
nextAction
```

### 6.1 statusLabel

Responde:

> Em qual estado o pedido está?

Exemplos:

```text
Aguardando resposta
Pedido aceito
Proposta enviada
Em andamento
Concluído
Cancelado
```

### 6.2 statusDescription

Responde:

> O que esse estado significa agora?

Exemplo para cliente:

```text
O profissional ainda não respondeu à solicitação.
```

Exemplo para profissional:

```text
O cliente aguarda sua resposta.
```

### 6.3 attentionBadge

Responde:

> Existe ação ou atenção imediata para esta pessoa?

Valores permitidos:

```text
Ação necessária
Aguardando outra pessoa
Prazo próximo
Sem ação agora
```

O badge não deve repetir o status.

### 6.4 nextAction

Responde:

> Qual ação concreta está disponível?

Exemplos:

```text
Responder solicitação
Abrir conversa
Revisar proposta
Enviar cobrança
Avaliar serviço
```

---

## 7. Matriz canônica de status do pedido

### 7.1 pending

Cliente:

```text
Status: Aguardando resposta
Descrição: O profissional ainda não respondeu à solicitação.
Badge: Aguardando profissional
CTA: Ver pedido
```

Profissional:

```text
Status: Nova solicitação
Descrição: O cliente aguarda sua resposta.
Badge: Ação necessária
CTA: Responder solicitação
```

### 7.2 accepted

Ambas as perspectivas:

```text
Status: Pedido aceito
```

Cliente:

```text
Descrição: O profissional aceitou conversar sobre o pedido.
CTA: Abrir conversa
```

Profissional:

```text
Descrição: A conversa foi liberada para definir a proposta.
CTA: Preparar proposta
```

### 7.3 quoted

Cliente:

```text
Status: Proposta recebida
Descrição: Revise valor, escopo e condições antes de decidir.
Badge: Ação necessária
CTA: Ver proposta
```

Profissional:

```text
Status: Proposta enviada
Descrição: A proposta aguarda a decisão do cliente.
Badge: Aguardando cliente
CTA: Acompanhar proposta
```

### 7.4 in_progress

Sem pagamento confirmado:

```text
Status: Atendimento aprovado
Descrição: A proposta foi aprovada. O pagamento ainda não foi confirmado.
```

Com pagamento confirmado e autoridade válida:

```text
Status: Serviço em andamento
Descrição: O pagamento foi confirmado e o atendimento pode continuar.
```

Não usar o mesmo texto para as duas condições.

### 7.5 completed

```text
Status: Concluído
Descrição: O serviço foi marcado como concluído.
```

Se o pagamento foi liberado:

```text
Pagamento: Repasse liberado
```

Se ainda houver processamento:

```text
Pagamento: Liberação em processamento
```

### 7.6 cancelled

Distinguir:

```text
Solicitação recusada
Proposta recusada
Pedido cancelado pelo cliente
Pedido cancelado pelo profissional
Pedido encerrado após contestação
```

`Cancelado`, `recusado`, `encerrado` e `arquivado` não são sinônimos.

---

## 8. Achado P0 — linguagem de IA sem autoridade de IA

O command center de Pedidos produz textos como:

```text
IA: pós-serviço
IA: risco detectado
IA: responder hoje
IA: acompanhar
```

Porém, o cálculo inspecionado é determinístico e baseado em regras locais, como:

- status;
- palavras presentes no texto;
- datas fixas ou relativas;
- presença de termos como `pendente`, `aguardando` e `sem resposta`.

Contrato:

```text
regra local
→ Sugestão

score operacional determinístico
→ Prioridade sugerida

modelo de IA ativo, identificado e autorizado
→ Sugestão gerada por IA
```

Até existir autoridade de IA real, remover o prefixo `IA:`.

Sugestões substitutas:

```text
Próxima ação sugerida
Prazo próximo
Acompanhamento recomendado
Pós-serviço
```

---

## 9. Achado P0 — risco operacional derivado de texto livre

A classificação atual pode marcar risco alto ao encontrar termos como:

```text
hoje
amanhã
22/04
prazo próximo
prevista até amanhã
```

E risco médio ao encontrar:

```text
há 2 dias
pendente
aguardando
sem resposta
```

Isso não é evidência suficiente para afirmar:

```text
Em risco
Risco detectado
Prazo crítico
```

Contrato:

```text
sem SLA ou deadline canônico
→ Prazo não confirmado

com prazo canônico próximo
→ Prazo próximo

com regra operacional de breach
→ Prazo vencido

com risco calculado e explicável
→ Risco operacional
```

A interface não poderá usar `alto`, `médio` ou `baixo` sem explicar a fonte e o critério.

---

## 10. Achado P0 — alegações financeiras acima da autoridade ativa

Foram encontrados textos de alto impacto como:

```text
Pagamento protegido pela Doke
Pagamento confirmado
Comprovante disponível
Pagamento em garantia
Aprovação rápida
```

Também existe conteúdo visual explicitamente mockado no mesmo fluxo.

Contrato fail-closed:

### 10.1 Sem PSP ou autoridade financeira ativa

Usar:

```text
Pagamento indisponível nesta versão
Método ainda não habilitado
Simulação de interface
```

Não usar:

```text
Confirmar pagamento
Já paguei
Pagamento protegido
Comprovante disponível
```

em superfície que possa ser confundida com operação real.

### 10.2 Com intent criado, mas sem confirmação

```text
Pagamento iniciado
Aguardando confirmação do provedor
```

### 10.3 Com confirmação canônica

```text
Pagamento confirmado
```

### 10.4 Com valor retido

Somente quando a autoridade confirmar o estado `held`:

```text
Pagamento em garantia
```

### 10.5 Com liberação ao profissional

Somente quando a autoridade confirmar `released`:

```text
Repasse liberado
```

### 10.6 Outcome desconhecido

```text
Não foi possível confirmar o resultado do pagamento.
Estamos verificando o estado antes de permitir uma nova tentativa.
```

Não apresentar como falha definitiva nem como sucesso.

---

## 11. Conteúdo demonstrativo e fixtures

Conteúdo de demonstração deverá carregar uma marca contextual persistente:

```text
Demonstração
Dados de exemplo
Pagamento simulado
Perfil de exemplo
```

Não basta esconder a indicação em texto secundário.

Dados como:

```text
Studio Aquarela
R$ 280,00
#DK-2048
DOKE-PIX-...
```

não podem aparecer em uma sessão real quando o contexto não foi resolvido.

Estado correto:

```text
contexto ausente
→ não renderizar resumo operacional
→ mostrar estado vazio ou erro contextual
```

---

## 12. Fallbacks de identidade

### 12.1 Nome

Permitido:

```text
Nome indisponível
Profissional não identificado
Cliente não identificado
```

Somente quando isso não expuser falha crítica de autorização.

Evitar:

```text
Profissional Doke
Cliente
Usuário Doke
```

quando puder parecer uma identidade real.

### 12.2 Avatar

Sem imagem real:

```text
iniciais derivadas de nome confirmado
ou
placeholder neutro Doke
```

Nunca selecionar avatar por categoria, profissão ou nome inferido.

### 12.3 Username

Sem username confirmado:

```text
não mostrar handle
```

Nunca gerar `@profissional`, slug do nome ou outro identificador inventado.

### 12.4 Verificação

Sem autoridade de verificação:

```text
sem selo
```

Nunca usar selo como fallback visual.

---

## 13. Estados vazios

`Empty` representa sucesso com zero itens. Não representa erro, loading ou permissão negada.

### 13.1 Tipos canônicos

```text
FIRST_USE
NO_MATCH
FILTERED_EMPTY
PERSONAL_EMPTY
ROLE_NOT_APPLICABLE
ARCHIVED_EMPTY
```

### 13.2 FIRST_USE

Exemplo em Pedidos:

```text
Título: Nenhum pedido ainda
Texto: Quando você enviar ou receber uma solicitação, ela aparecerá aqui.
CTA cliente: Encontrar serviços
CTA profissional: Ver meu perfil profissional
```

### 13.3 NO_MATCH

Exemplo em busca:

```text
Título: Nenhum resultado para “limpeza industrial”
Texto: Tente outro termo ou explore categorias relacionadas.
CTA primário: Limpar busca
CTA secundário: Ver categorias
```

### 13.4 FILTERED_EMPTY

```text
Título: Nenhum pedido com estes filtros
Texto: Seus pedidos continuam disponíveis fora desta seleção.
CTA: Limpar filtros
```

Não usar a mesma mensagem de first-use.

### 13.5 PERSONAL_EMPTY

Exemplo em Favoritos:

```text
Título: Nenhum favorito ainda
Texto: Salve anúncios para encontrá-los mais rápido depois.
CTA: Explorar anúncios
```

### 13.6 ROLE_NOT_APPLICABLE

Uma área exclusiva de profissional não deve dizer que está vazia para cliente.

Ela deve:

- ficar oculta;
- explicar requisito;
- ou oferecer conversão de perfil, quando apropriado.

### 13.7 Estado vazio não deve incluir métricas inventadas

Não mostrar:

```text
0 avaliações
0% concluído
R$ 0 recebido
```

quando a entidade ou fonte ainda não foi carregada.

---

## 14. Erros

### 14.1 Estrutura mínima

```text
Título
Descrição útil
Ação possível
Código de referência opcional
```

### 14.2 Erro recuperável

```text
Título: Não foi possível carregar os pedidos
Texto: Verifique sua conexão e tente novamente.
CTA: Tentar novamente
```

### 14.3 Erro de autorização

```text
Título: Você não pode acessar este pedido
Texto: Entre com a conta vinculada ao pedido ou volte para a lista.
CTA: Voltar para pedidos
```

### 14.4 Entidade inexistente

```text
Título: Pedido não encontrado
Texto: Ele pode ter sido removido ou o link pode estar incompleto.
CTA: Ver meus pedidos
```

### 14.5 Erro de validação

```text
Título: Revise os campos destacados
Texto: Corrija as informações antes de continuar.
```

### 14.6 Erro operacional remoto

Não expor ao usuário:

```text
Autoridade canônica indisponível
Comando canônico não carregado
Repository unavailable
RPC failed
RLS denied
```

Apresentar:

```text
Não foi possível concluir esta ação agora.
```

E registrar separadamente:

```text
errorCode
correlationId
source
retryable
```

### 14.7 Retry

Retry deverá preservar:

- dados preenchidos;
- filtros;
- scroll;
- contexto da entidade;
- idempotency key quando aplicável.

---

## 15. Offline, degradado e stale

### 15.1 OFFLINE

```text
Sem conexão
Algumas informações podem estar desatualizadas. Reconecte-se para continuar.
```

### 15.2 STALE_WITH_CONTENT

```text
Última atualização: 4 de agosto, 09:42
Atualizando…
```

Conteúdo existente permanece visível, mas não pode parecer fresco.

### 15.3 DEGRADED

```text
Algumas informações estão temporariamente indisponíveis.
```

Deve indicar quais capacidades ainda funcionam.

### 15.4 UNKNOWN_OUTCOME

Para mutações críticas:

```text
Resultado ainda não confirmado
Estamos verificando se a ação foi concluída antes de permitir outra tentativa.
```

---

## 16. Loading

### 16.1 Loading inicial

Preferir skeleton estrutural.

Texto acessível:

```text
Carregando pedidos
Carregando conversa
Carregando dados do pagamento
```

### 16.2 Loading de ação

Usar verbo no gerúndio e objeto:

```text
Enviando solicitação…
Salvando alterações…
Confirmando pagamento…
Finalizando pedido…
```

Evitar:

```text
Processando…
Aguarde…
Está quase lá…
```

### 16.3 Loading sem progresso mensurável

Não usar porcentagem falsa ou tempo estimado.

### 16.4 Loading bloqueante

Explicar o motivo quando o usuário não pode fechar:

```text
Estamos confirmando o pagamento. Esta janela permanecerá aberta até recebermos o resultado.
```

---

## 17. Sucesso

### 17.1 Estrutura

```text
Ação confirmada
Consequência
Próximo passo
```

### 17.2 Solicitação enviada

```text
Título: Solicitação enviada
Texto: O profissional recebeu seu pedido de orçamento.
Próximo passo: Você será avisado quando houver resposta.
CTA: Ver pedido
```

### 17.3 Anúncio enviado para análise

```text
Título: Anúncio enviado para análise
Texto: Ele não ficará público até a aprovação.
CTA: Ver meus anúncios
```

### 17.4 Proposta aprovada

```text
Título: Proposta aprovada
Texto: O atendimento foi autorizado. O pagamento ainda não foi confirmado.
CTA: Voltar para conversa
```

### 17.5 Pagamento confirmado

Somente com autoridade financeira:

```text
Título: Pagamento confirmado
Texto: O valor foi registrado no pedido com o status informado pelo provedor.
CTA: Ver pedido
```

### 17.6 Pedido concluído

```text
Título: Pedido concluído
Texto: O serviço foi marcado como concluído.
CTA primário: Avaliar serviço
CTA secundário: Voltar para conversa
```

---

## 18. CTAs

### 18.1 Padrão

```text
Ver + objeto
Abrir + objeto
Enviar + objeto
Salvar + objeto
Excluir + objeto
Cancelar + objeto
Tentar novamente
```

### 18.2 Confirmações críticas

O botão deve repetir a consequência:

```text
Confirmar pagamento de R$ 280,00
Finalizar pedido e liberar pagamento
Excluir anúncio
Cancelar pedido
```

Evitar `Confirmar` isolado.

### 18.3 Ação indisponível

Não exibir CTA funcional falso.

Opções permitidas:

- esconder quando irrelevante;
- desabilitar com motivo;
- substituir por CTA de resolução;
- marcar claramente como demonstração.

### 18.4 Links e botões

- navegação: link;
- mutação: botão;
- abertura de overlay: botão;
- download real: link ou botão com resultado verificável.

---

## 19. Datas e horários

### 19.1 Timezone

Usar timezone da conta ou configuração do produto.

No Brasil, a apresentação deverá considerar explicitamente o fuso aplicável.

### 19.2 Data curta

```text
04/08/2026
```

### 19.3 Data textual

```text
4 de agosto de 2026
```

### 19.4 Data com hora

```text
4 de agosto de 2026, 09:42
```

### 19.5 Relativo

Permitido em contexto recente:

```text
Agora
Há 8 min
Ontem
```

Deve possuir data absoluta acessível por:

- `title`;
- texto secundário;
- `<time datetime>`.

### 19.6 Hoje e amanhã

Não persistir rótulos relativos sem atualização.

Um card aberto durante a virada do dia deverá recalcular o texto.

### 19.7 Aliases internos

Campos como:

```text
creatédAt
daté
```

podem existir por compatibilidade interna, mas nunca devem aparecer em copy, logs públicos ou documentação de produto.

---

## 20. Valores monetários

### 20.1 Formato

```text
R$ 280,00
R$ 1.250,00
```

### 20.2 Modos de preço

```text
fixed       → R$ 280,00
starting_at → A partir de R$ 280,00
budget      → Sob orçamento
free        → Grátis
unknown     → Preço não informado
```

### 20.3 Zero

`0` não significa automaticamente:

- grátis;
- sob orçamento;
- desconto total;
- ausência de valor.

### 20.4 Faixa

```text
R$ 280,00 a R$ 420,00
```

Não mostrar média calculada como valor acordado.

### 20.5 Pagamento, saldo e repasse

Sempre indicar o conceito:

```text
Total do pedido
Valor pago
Saldo disponível
Valor em garantia
Repasse disponível
Taxa da Doke
Reembolso
```

Nunca apresentar apenas um número sem rótulo.

---

## 21. Linguagem de busca

### 21.1 Resultado encontrado

```text
24 anúncios para “limpeza”
```

### 21.2 Resultado vazio

```text
Nenhum anúncio para “limpeza industrial”
```

### 21.3 Fallback editorial

Quando a busca principal não encontra resultados e outra coleção é exibida:

```text
Nenhum anúncio corresponde exatamente à busca.
Veja outras opções que podem ajudar.
```

Título da coleção:

```text
Outros anúncios
```

Não alterar silenciosamente o significado da consulta.

### 21.4 Modos locais

Usuários, Workers e Publicações atualmente possuem autoridade diferente da busca canônica de serviços.

A copy deve declarar a cobertura:

```text
Perfis disponíveis nesta experiência
Workers em destaque
Publicações de exemplo
```

quando não existir catálogo remoto equivalente.

Evitar:

```text
Todos os usuários
Resultados globais
Melhores profissionais
```

sem fonte capaz de sustentar a afirmação.

---

## 22. Linguagem de notificações e toasts

### 22.1 Toast é complementar

Um toast não pode ser o único registro de:

- erro crítico;
- sucesso financeiro;
- mudança de pedido;
- contestação;
- exclusão.

### 22.2 Título

Deve informar o evento:

```text
Nova solicitação recebida
Proposta aprovada
Cobrança enviada
Pagamento confirmado
Pedido cancelado
```

### 22.3 Corpo

Deve informar a consequência sem repetir o título.

### 22.4 CTA

Específico:

```text
Responder solicitação
Ver proposta
Abrir cobrança
Ver pagamento
```

Evitar `Ver agora` quando a entidade puder ser nomeada.

### 22.5 Digest

Mensagens como `Você tem atualizações pendentes` deverão distinguir:

- pedidos que exigem ação;
- pedidos apenas aguardando terceiros;
- mensagens não lidas;
- notificações informativas.

Somar todos como `aguardam sua atenção` cria urgência artificial.

---

## 23. Linguagem de disputa e contestação

### 23.1 Abertura

```text
Contestação aberta
A Doke analisará as informações enviadas pelas partes.
```

Somente usar essa frase quando existir processo real de análise.

### 23.2 Em análise

```text
Contestação em análise
Mantenha documentos e mensagens no pedido enquanto a análise estiver aberta.
```

### 23.3 Resolução favorável ao cliente

```text
Contestação encerrada
O reembolso foi confirmado.
```

Somente após confirmação financeira.

### 23.4 Resolução favorável ao profissional

```text
Contestação encerrada
O repasse foi liberado ao profissional.
```

Somente após confirmação financeira.

### 23.5 Sem autoridade operacional

Se o fluxo for apenas demonstrativo:

```text
Relato registrado localmente para demonstração.
Nenhuma análise real foi iniciada.
```

---

## 24. Linguagem de segurança e confiança

Alegações como:

```text
seguro
protegido
garantido
verificado
criptografado
monitorado
```

exigem evidência e escopo.

### 24.1 Permitido

```text
A conversa permanece vinculada ao pedido.
O status foi confirmado pelo serviço de pagamentos.
Nunca envie senha ou código do cartão pelo chat.
```

### 24.2 Proibido sem comprovação

```text
100% seguro
Pagamento garantido
Profissional confiável
Proteção total
```

### 24.3 Garantia Doke

`Garantia` deverá possuir:

- elegibilidade;
- prazo;
- cobertura;
- exclusões;
- autoridade de decisão;
- processo de contestação.

Sem isso, não usar badge ou promessa de garantia.

---

## 25. Acessibilidade da microcopy

### 25.1 Texto visível e nome acessível

O `aria-label` não deve contradizer o texto visível.

### 25.2 Estado não pode depender de cor

Usar texto como:

```text
Erro
Concluído
Aguardando
```

além de cor e ícone.

### 25.3 Live regions

- loading inicial: anúncio moderado;
- erro: `role="alert"` quando exige atenção;
- sucesso: `role="status"`;
- digitação e filtros: evitar anúncios excessivos.

### 25.4 Conteúdo dinâmico

Ao mudar status:

```text
Pedido atualizado: proposta recebida.
```

Não anunciar toda a página novamente.

### 25.5 Abreviações

Evitar abreviações não explicadas.

`CTA`, `PSP`, `RLS`, `RPC` e códigos internos não pertencem à interface pública.

---

## 26. Comprimento e truncamento

### 26.1 Títulos

- preferencial: até 60 caracteres;
- limite de design: definido por componente;
- nunca truncar status crítico sem alternativa acessível.

### 26.2 Descrições

- cards: até duas ou três linhas;
- estados vazios: uma frase principal e uma de orientação;
- dialogs: consequência antes de detalhes.

### 26.3 CTAs

- verbo + objeto;
- evitar mais de 32 caracteres quando houver alternativa clara;
- nunca reduzir ação crítica a ícone sem nome acessível.

### 26.4 Conteúdo do usuário

Texto do usuário deve ser escapado e truncado visualmente, preservando acesso ao conteúdo completo na superfície adequada.

---

## 27. Tom de voz

A Doke deverá soar:

- direta;
- confiável;
- clara;
- útil;
- sem teatralidade;
- sem urgência artificial;
- sem excesso de entusiasmo em operações financeiras;
- sem infantilização.

### 27.1 Operação normal

```text
Sua solicitação foi enviada.
```

### 27.2 Erro

```text
Não foi possível enviar a solicitação.
```

### 27.3 Ação crítica

```text
Ao finalizar o pedido, você confirma a conclusão do serviço e autoriza a próxima etapa do pagamento.
```

### 27.4 Evitar

```text
Oba!
Tudo certo por aqui!
Uhul!
Mágica concluída!
```

em pagamentos, disputas, exclusões ou encerramentos.

---

## 28. Conteúdo por superfície

### 28.1 Home

- títulos editoriais estáveis;
- nenhuma métrica fabricada;
- rails vazios com ação contextual;
- erro localizado sem derrubar a página inteira;
- favoritos distinguem vazio, erro e sessão anônima.

### 28.2 Resultados

- preservar a consulta exata;
- informar cobertura e quantidade;
- distinguir zero correspondência de erro;
- não chamar pool local de catálogo completo;
- filtros ativos devem aparecer em linguagem humana.

### 28.3 Detalhe do anúncio

- preço igual ao card;
- profissional e localização confirmados;
- indisponibilidade explicada;
- CTA reflete capacidade real do anúncio;
- orçamento desabilitado quando o anúncio não aceita solicitações.

### 28.4 Pedidos

- status específico por papel;
- ações separadas de estados;
- nenhuma classificação de IA sem IA;
- risco somente com regra canônica;
- empty state diferente de filtered empty.

### 28.5 Mensagens

- proposta, cobrança e pagamento visualmente e textualmente distintos;
- aprovação de proposta não significa pagamento;
- cobrança não significa pagamento;
- texto financeiro deriva do estado canônico;
- contestação usa terminologia única.

### 28.6 Pagamento

- métodos indisponíveis não parecem ativos;
- total, desconto e saldo rotulados;
- confirmação financeira somente após autoridade;
- outcome desconhecido exige reconciliação;
- conteúdo mockado não aparece em sessão operacional.

### 28.7 Carteira

- saldo disponível, pendente, bloqueado e em processamento separados;
- entrada, saída, estorno, reembolso e repasse nomeados corretamente;
- datas absolutas disponíveis;
- comprovante somente quando existe artefato real.

### 28.8 Configurações

- `Salvo` somente após persistência confirmada;
- erro preserva rascunho e informa que a alteração não foi aplicada;
- defaults não parecem configurações da conta;
- reset distingue desfazer edição de restaurar padrão.

### 28.9 Perfil

- identidade não fabricada;
- selo somente com autoridade;
- ausência de avaliação não aparece como nota zero;
- conteúdo incompleto orienta o dono sem expor placeholders ao público.

---

## 29. Catálogo canônico de mensagens

A futura implementação deverá centralizar conteúdo estrutural em um catálogo versionado.

Autoridade proposta:

```text
Doke.contentCatalog
```

API conceitual:

```text
get(key, params, context)
formatDate(value, options)
formatMoney(value, options)
formatCount(value, singular, plural)
formatStatus(domain, status, audience)
formatError(error, context)
```

Exemplos de chaves:

```text
orders.status.pending.client.label
orders.status.pending.professional.label
orders.empty.firstUse.title
orders.empty.filtered.title
search.empty.noMatch.title
payment.status.unknownOutcome.title
forms.error.validation.title
common.action.retry
common.action.clearFilters
```

O catálogo deverá suportar:

- português do Brasil;
- interpolação segura;
- pluralização;
- contexto de papel;
- versão;
- testes contra chaves ausentes;
- fallback fail-closed.

Não deverá concentrar conteúdo criado pelo usuário.

---

## 30. Erros técnicos e conteúdo público

A camada de domínio poderá produzir:

```text
code: PAYMENT_AUTHORITY_UNAVAILABLE
retryable: true
correlationId: abc123
```

A interface deverá mapear para:

```text
Não foi possível carregar os dados do pagamento.
Tente novamente.
Código de referência: abc123
```

Não usar diretamente `error.message` quando ela puder conter:

- nomes de tabelas;
- endpoints;
- stack traces;
- nomes de contratos;
- IDs internos;
- SQL;
- dados pessoais;
- detalhes de segurança.

---

## 31. Privacidade

### 31.1 Notificações

Não incluir em toast visível na tela bloqueada ou compartilhada:

- endereço completo;
- telefone;
- documento;
- descrição sensível;
- valor financeiro detalhado sem necessidade;
- conteúdo integral da mensagem.

### 31.2 Erros

Não pedir ao usuário que copie dados sensíveis para suporte.

### 31.3 Histórico de busca

Consultas são conteúdo potencialmente sensível.

A copy deve informar quando:

- histórico é local;
- histórico é sincronizado;
- histórico pode ser apagado.

### 31.4 Analytics

Texto digitado pelo usuário não deverá ser enviado como evento bruto sem contrato específico.

---

## 32. P0 — blockers de conteúdo

### CONTENT-P0-01

Remover ou renomear `IA:` em insights produzidos por regras determinísticas.

### CONTENT-P0-02

Bloquear `Em risco`, `Risco detectado` e níveis de risco quando não existir deadline ou regra canônica.

### CONTENT-P0-03

Remover alegações financeiras definitivas das superfícies mockadas ou sem PSP ativo.

### CONTENT-P0-04

Impedir que dados de exemplo apareçam como contexto operacional real.

### CONTENT-P0-05

Distinguir proposta aprovada, cobrança enviada e pagamento confirmado.

### CONTENT-P0-06

Distinguir status do pedido de ação exigida do usuário.

### CONTENT-P0-07

Não declarar sucesso em action modals sem confirmação da autoridade.

### CONTENT-P0-08

Garantir que conclusão do pedido explique a consequência financeira e não use confirmação pré-marcada.

---

## 33. P1 — correções de consistência

### CONTENT-P1-01

Substituir `Respondido` por estado canônico específico ou remover alias público.

### CONTENT-P1-02

Separar `Cancelado`, `Recusado`, `Encerrado` e `Arquivado`.

### CONTENT-P1-03

Substituir `Ver agora` por CTA específico em toasts e digests.

### CONTENT-P1-04

Criar empty states distintos para first-use, filtro e erro.

### CONTENT-P1-05

Padronizar datas, moeda e pluralização.

### CONTENT-P1-06

Mapear erros técnicos para mensagens públicas seguras.

### CONTENT-P1-07

Eliminar fallbacks de identidade que parecem pessoas reais.

### CONTENT-P1-08

Remover promessas temporais sem SLA.

---

## 34. P2 — refinamentos

### CONTENT-P2-01

Criar catálogo central de conteúdo.

### CONTENT-P2-02

Adicionar testes de snapshot semântico por papel e estado.

### CONTENT-P2-03

Adicionar lint para termos proibidos ou ambíguos.

### CONTENT-P2-04

Adicionar revisão de UX Writing ao checklist de PR.

### CONTENT-P2-05

Preparar estrutura de localização futura sem traduzir strings ad hoc.

---

## 35. Handoffs de implementação

### CONTENT-H01 — status vocabulary

Escopo:

- pedidos;
- mensagens;
- notificações;
- carteira.

Saída:

- enum canônico;
- labels por papel;
- descrições;
- badges;
- CTAs.

### CONTENT-H02 — financial authority copy gate

Escopo:

- pagamento;
- cobrança;
- garantia;
- repasse;
- reembolso;
- comprovante.

Regra:

```text
copy definitiva somente após estado canônico
```

### CONTENT-H03 — AI and risk language

Escopo:

- command center;
- sugestões;
- prioridade;
- risco.

Saída:

- remover claims indevidos;
- documentar fonte;
- explicar critério;
- definir estados sem SLA.

### CONTENT-H04 — empty states

Escopo:

- Home;
- Resultados;
- Favoritos;
- Pedidos;
- Mensagens;
- Notificações;
- Carteira;
- Perfil.

### CONTENT-H05 — error mapping

Escopo:

- catálogo de códigos;
- copy pública;
- retry;
- correlation ID;
- privacidade.

### CONTENT-H06 — date and money formatting

Criar utilitários canônicos e remover formatações locais divergentes.

### CONTENT-H07 — identity fallbacks

Remover nomes, handles, avatares e selos fabricados.

### CONTENT-H08 — content catalog

Criar `Doke.contentCatalog` somente depois de aprovar vocabulário e matriz.

### CONTENT-H09 — QA and lint

Adicionar testes para:

- termos proibidos;
- placeholders públicos;
- claims financeiros;
- claims de IA;
- pluralização;
- papéis;
- estados vazios;
- erros técnicos vazando.

---

## 36. Matriz mínima de QA

### 36.1 Papéis

- anônimo;
- cliente;
- profissional;
- operador autorizado.

### 36.2 Estados de pedido

- pending;
- accepted;
- quoted;
- in_progress sem pagamento;
- in_progress com pagamento;
- completed;
- cancelled;
- contestação.

### 36.3 Estados de dados

- loading;
- ready;
- empty;
- filtered empty;
- stale;
- offline;
- error;
- unknown outcome.

### 36.4 Autoridades

- local demonstrativa;
- remota indisponível;
- remota parcial;
- remota confirmada.

### 36.5 Viewports

- mobile estreito;
- mobile largo;
- tablet;
- desktop;
- zoom de 200%;
- texto ampliado.

### 36.6 Acessibilidade

- teclado;
- leitor de tela;
- live regions;
- contraste;
- nomes acessíveis;
- conteúdo sem dependência de cor.

---

## 37. Casos obrigatórios de teste

### COPY-001

Cliente visualiza pedido pending.

Esperado:

```text
Aguardando resposta
Aguardando profissional
Ver pedido
```

Não esperado:

```text
Aguardando você
Ação necessária
```

### COPY-002

Profissional visualiza o mesmo pedido.

Esperado:

```text
Nova solicitação
Ação necessária
Responder solicitação
```

### COPY-003

Proposta aprovada, pagamento pendente.

Esperado:

```text
Proposta aprovada
Pagamento pendente
```

Não esperado:

```text
Pagamento confirmado
Em garantia
```

### COPY-004

PSP indisponível.

Esperado:

```text
Método de pagamento indisponível
```

Não esperado:

```text
Pagamento protegido pela Doke
```

### COPY-005

Regra determinística recomenda ação.

Esperado:

```text
Próxima ação sugerida
```

Não esperado:

```text
IA: responder hoje
```

### COPY-006

Busca retorna zero resultados.

Esperado:

- query preservada;
- zero correspondência explícito;
- limpar busca;
- sugestões alternativas identificadas.

### COPY-007

Busca falha remotamente.

Esperado:

```text
Não foi possível carregar os resultados
Tentar novamente
```

Não esperado:

```text
Nenhum resultado
```

### COPY-008

Configuração falha ao salvar.

Esperado:

```text
As alterações não foram salvas.
```

O rascunho permanece.

### COPY-009

Pagamento entra em outcome desconhecido.

Esperado:

- nenhum retry cego;
- nenhum sucesso;
- reconciliação;
- estado desconhecido explicado.

### COPY-010

Pedido é concluído.

Esperado:

- consequência financeira explicada;
- checkbox inicialmente desmarcado;
- CTA explícito;
- sucesso somente após domínio confirmar.

---

## 38. Critérios de saída

Este contrato estará implementado quando:

- existir glossário aprovado;
- status forem específicos por papel;
- proposta, cobrança e pagamento forem distintos;
- claims de IA dependerem de IA real;
- claims financeiros dependerem da autoridade financeira;
- placeholders demonstrativos não aparecerem como dados reais;
- empty, error e offline forem estados distintos;
- CTAs usarem verbo e objeto;
- datas e moeda tiverem formatadores canônicos;
- erros técnicos forem mapeados com segurança;
- conteúdo crítico tiver cobertura automatizada;
- nenhum `P0` deste documento permanecer aberto.

---

## 39. Fora de escopo deste sublote

Não foram executados:

- reescrita de strings no runtime;
- alteração de HTML;
- alteração de CSS;
- criação do catálogo em JavaScript;
- ativação de IA;
- ativação de pagamentos;
- mudança de regras comerciais;
- alteração de estados do backend;
- staging;
- produção;
- merge.

---

## 40. Validação documental executada

Foram inspecionados:

- labels, summaries e badges de Pedidos;
- ações sugeridas e heurísticas de risco;
- diferenças de perspectiva cliente/profissional;
- linguagem de proposta, cobrança e pagamento em Mensagens;
- estados e alegações do checkout;
- empty/loading/error de Pedidos;
- linguagem de modos locais em Resultados;
- fallbacks de identidade e contexto;
- toasts e digest operacional;
- fluxo de sucesso e erro de formulários;
- deriva da branch PAY.

Resultado:

- contrato documental criado;
- runtime alterado: zero;
- staging e produção: intocados;
- merge e auto-merge: não autorizados.

---

## 41. Próximo sublote recomendado

`UX-FOUNDATION-009 — notificações, badges, toasts e inbox operacional`.

Esse lote deverá definir:

- prioridade de eventos;
- unread versus ação necessária;
- deduplicação;
- agrupamento;
- digest;
- badge por superfície;
- toast versus inbox;
- deep link;
- privacidade;
- leitura e dismiss;
- reconciliação entre pedidos, mensagens, pagamentos e notificações.
