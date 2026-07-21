# Doke Web — Refinamento dos controles do construtor de formulário

## Resultado

A etapa **Formulário de orçamento > Personalizar formulário** recebeu correções nos controles apontados na revisão visual e maior destaque para o assistente de sugestões com IA.

## Causa raiz

O seletor de tipo de resposta era um `<select>` nativo criado dinamicamente. Por não consumir o seletor visual já existente no projeto, sua aparência dependia do navegador e do sistema operacional, resultando em menu desproporcional, seta inconsistente e geometria diferente dos demais controles.

Os rótulos de tipo e o toggle obrigatório também não tinham geometria suficientemente protegida contra zoom e cascata. A área de IA ficava abaixo da lista e com peso semelhante aos disclosures auxiliares, reduzindo sua descoberta.

## Implementação

- seletor dinâmico passa a consumir `DokeUiSelect` por `data-ui-select`;
- o construtor atualiza os selects customizados após cada renderização;
- dropdown, opções e chevron recebem geometria estável no escopo do construtor;
- badges de tipo recebem altura, padding e line-height explícitos;
- toggle obrigatório recebe dimensões e deslocamento estáveis;
- texto do controle foi simplificado para “Obrigatória”;
- sugestões com IA foram movidas para antes da lista de perguntas;
- card de IA recebeu ícone, selo “Novo”, descrição e CTA mais visível;
- nenhuma lógica de aplicação automática foi adicionada;
- não houve alteração de shell, header ou CSS global.

## Arquivos alterados

- `anunciar-servico.html`
- `assets/css/pages/anunciar-servico-foundation.css`
- `assets/css/pages/anunciar-servico/visual-hierarchy.css`
- `assets/js/pages/service-quote-template-builder.js`

## Testes executados

Passaram:

- validação sintática dos JavaScripts alterados;
- `test:service-quote-template-builder-contract`;
- `test:service-quote-template-catalog-contract`;
- `test:professional-quote-template-library-contract`;
- `test:service-edit-home-focused-quote-fix-contract`;
- `audit:form-control-contract`;
- `audit:form-button-contract`;
- renderização isolada em 1100 px e 390 px;
- abertura do dropdown customizado;
- medição do seletor em 52 px de altura;
- medição do toggle em 42 × 24 px;
- ausência de overflow horizontal nos dois viewports isolados.

## Testes não concluídos

- `audit:agent-governance` continua interrompido por um problema preexistente em `index.html`: `account-onboarding__change` não consome o contrato canônico de botões.
- `test:quote-template-ai-supervision` não roda porque a base recebida não contém `supabase/functions/quote-template-ai/shared.ts`.
- O navegador do ambiente bloqueia navegação para HTTP local e `file://` com `ERR_BLOCKED_BY_ADMINISTRATOR`; por isso a validação visual foi executada com uma fixture isolada usando o HTML, CSS e JavaScript reais do componente, e não dentro do shell autenticado completo.

## Riscos restantes

- conferir o resultado dentro do shell autenticado no navegador real;
- validar o dropdown com zoom do navegador diferente de 100%;
- validar uma resposta real da IA com lista extensa de sugestões.
