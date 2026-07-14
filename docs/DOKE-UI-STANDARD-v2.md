# Doke UI Standard v2

## Status
Fonte normativa para design, frontend e agentes de IA. Esta versão adiciona o contrato oficial de dropdowns e classifica padrões como canônico, legado controlado ou proibido.

## Direção visual
A Doke é um marketplace humano, confiável e leve. A interface usa grandes superfícies claras, hierarquia por tipografia e espaçamento, azul para confiança, verde para avanço e o mínimo necessário de bordas.

### Princípios obrigatórios
1. Espaço antes de borda.
2. Uma grande superfície por tarefa.
3. Card apenas para unidade real de conteúdo.
4. Uma ação primária por contexto.
5. Divisor antes de container adicional.
6. Fundo secundário antes de borda forte.
7. Título principal do workspace em azul; título interno em cor escura.
8. Verde reservado para sucesso, avanço, oferta ou exploração.

## Tokens visuais
- Azul primário: `#2a5f90`.
- Verde secundário: `#298f7f`.
- Fundo de página: azul-claro muito suave.
- Superfície principal: branca.
- Borda global: `rgba(24, 75, 118, 0.10–0.14)`.
- Raio de controle: `12px`.
- Raio de card: `16–18px`.
- Raio de workspace/modal grande: `22–24px`.
- Sombras: leves, amplas e de baixa opacidade.

## Hierarquia tipográfica
- Título de página/workspace: azul, forte.
- Título principal do painel: azul, forte.
- Título interno de seção: escuro, forte.
- Eyebrow: azul, caixa alta, pequeno.
- Descrição e metadados: cinza.
- Não usar azul em todos os títulos.

## Botões oficiais
- `doke-btn doke-btn--primary`: ação principal única.
- `doke-btn doke-btn--success`: avanço, conclusão, oferta ou exploração.
- `doke-btn doke-btn--secondary`: alternativa relevante.
- `doke-btn doke-btn--ghost`: voltar, cancelar ou ação discreta.
- `doke-btn doke-btn--danger`: ação destrutiva.
- `doke-icon-btn`: ação apenas com ícone.
- `doke-close-button`: fechamento de modal, drawer ou painel.

Páginas podem posicionar botões, mas não redefinir altura, raio, sombra, borda, peso ou estado.

## Formulários
- Usar `doke-field`, `doke-label`, `doke-input`, `doke-textarea`, `doke-checkbox`, `doke-radio` e `doke-switch`.
- Campo não é card.
- Agrupar campos por título e espaçamento.
- Usar uma coluna quando a leitura sequencial for mais importante que a densidade.
- Usar duas colunas apenas para campos curtos e relacionados.

## Dropdowns oficiais
Existem três componentes distintos. Não usar a palavra “dropdown” como autorização para misturar suas anatomias.

### 1. Select de formulário — canônico
Usar para estado, cidade, categoria e escolha única.
- Altura: `52px`.
- Raio: `12px`.
- Fundo branco.
- Borda sutil.
- Foco azul de baixa opacidade.
- Lista com raio `14px` e sombra leve.
- Item selecionado com fundo azul-claro e check discreto.

### 2. Dropdown de filtro — canônico
Usar em toolbars para período, status, tipo e ordenação.
- Altura: `44px`.
- Mais compacto que o formulário.
- Pode conter ícone inicial.
- Menu mínimo de `220px` quando necessário.
- Não usar pill arredondada sem motivo; raio padrão continua `12px`.

### 3. Menu de ações — canônico
Usar em card, linha, mensagem ou item contextual.
- Acionador de ícone com `44px`.
- Menu alinhado ao acionador.
- Divisor apenas antes de grupo destrutivo.
- Ação destrutiva em vermelho discreto.

### Classificação
- **Canônico:** dropdown custom Doke em `assets/css/components/dropdowns.css` + `assets/js/components/dropdowns.js`.
- **Legado controlado:** `select` nativo em fallback, mobile ou fluxo simples de baixa criticidade.
- **Proibido:** lista azul bruta do navegador como referência oficial de desktop, opções sem raio visual, sombra pesada ou dropdown redesenhado em CSS de página.

## Cards e superfícies
Card representa serviço, profissional, pedido, comunidade, mensagem, transação ou outra unidade real de conteúdo.

Não usar card apenas para:
- conter um switch;
- envolver uma linha de configuração;
- separar um par de campos;
- adicionar uma nova borda dentro de uma superfície já existente.

## Configurações
Padrão recomendado:

```text
Título da seção
Descrição

Grupo
Linha com título + descrição + controle
Linha com título + descrição + controle

Divisor

Grupo seguinte
```

O workspace pode ter menu lateral e painel principal. A anatomia interna deve ser simples, sem card por opção.

## Modais
- Uma superfície única.
- Título e descrição curtos.
- Conteúdo direto.
- No máximo duas ações principais no footer.
- Close canônico.
- Sem card aninhado para cada informação.

## Estados vazios
Todo empty state deve responder:
1. O que aconteceu?
2. O que aparecerá aqui?
3. Qual é o próximo passo?

## Modelos de composição
- Uma tarefa: onboarding, checkout, formulários longos.
- Principal + apoio: carteira, detalhe de anúncio, operação.
- Workspace: configurações e administração de comunidade.
- Lista + detalhe: mensagens, pedidos e moderação.

## Anti-padrões proibidos
- Card dentro de card sem necessidade funcional.
- Borda em todas as linhas.
- Pill decorativa.
- Gradiente e sombra forte em todo botão primário.
- Título azul em toda seção.
- CSS de página redesenhando componente compartilhado.
- Select nativo aberto como padrão visual de desktop.
- Inline style.
- `!important` como solução comum.
- Duplicação de CSS/JS.
- Componente novo quando existe contrato compatível.

## Baselines atuais
- Marketplace/cards: `index.html`.
- Dashboard resumido: `pedidos.html`.
- Área financeira e painel de duas colunas: `carteira.html`.
- Workspace: estrutura de `configuracoes.html`, não seus componentes internos antigos.
- Lista de pessoas: membros de `comunidade-interna.html`.
- Dropdowns: seção “Dropdowns Doke Clean” em `doke-ui-standard.html`.

## Checklist obrigatório para agentes
1. Identificar a autoridade correta antes de editar.
2. Diagnosticar causa raiz.
3. Verificar se a mudança reduz fragmentação.
4. Usar componente existente.
5. Garantir uma ação primária por contexto.
6. Preservar hierarquia tipográfica.
7. Não usar select nativo como solução visual principal em desktop.
8. Validar desktop, tablet, mobile, teclado e `Escape`.
9. Validar F5 e navegação interna quando aplicável.
10. Relatar arquivos impactados, riscos e testes.

## Referência visual interativa
Abrir `doke-ui-standard.html` pelo Live Server.
