# Auditoria e refatoração — contrato global de cards compartilhados

Data: 2026-05-31  
Escopo: `index.html`, `detalhe-anuncio.html`, `resultados.html`, `perfil.html`, `comunidade.html` e CSS relacionado a cards compartilhados.

## Diagnóstico

O problema principal não era apenas diferença visual. Havia concorrência arquitetural entre:

- `assets/css/components/cards/marketplace-card-contract.css`
- `assets/css/pages/detalhe-anuncio/detail-page-contract.css`
- contratos legados de cards em `components/cards/*`
- CSS de páginas como `home`, `perfil`, `resultados` e contratos mobile

O caso mais crítico era `detalhe-anuncio.html`.

Antes da limpeza, `detail-page-contract.css` continha múltiplos blocos reescrevendo as mesmas áreas:

- `.detail-related-workers__track`
- `.detail-related-publications__track`
- `.detail-related-grid--ads`

Esses blocos redefiniam repetidamente `grid`, `overflow`, gaps, quantidade visível e, em versões anteriores, também encostavam em anatomia visual de card. Isso gerava inconsistência entre o index e detalhe-anuncio, principalmente nos cards de anúncios semelhantes.

## Decisão arquitetural

O `index.html` continua sendo a referência visual. Porém a fonte técnica de verdade passa a ser:

`assets/css/components/cards/marketplace-card-contract.css`

Esse arquivo agora controla a anatomia interna dos cards compartilhados:

- anúncios/serviços: `.doke-ad-card`, `.service-card`
- publicações: `.publication-card`
- workers/vídeos: `.video-card[data-worker-trigger]`, `.doke-worker-card`, `.worker-card`
- avaliações/reviews: `.doke-review-card`, `.review-card`, `.rating-card`, `.testimonial-card`, `.avaliacao-card`

## Responsabilidade global consolidada

O contrato global controla:

- `border-radius`
- borda
- sombra
- mídia
- padding interno
- tipografia
- badge
- botão de favorito
- footer/CTA
- hover/focus
- comportamento interno mobile

## Responsabilidade por página

As páginas agora devem controlar somente:

- quantidade de cards visíveis
- número de colunas
- largura do rail
- overflow/scroll
- gaps externos
- margem entre seções

## Alterações principais

### `marketplace-card-contract.css`

Foi reescrito de forma mais enxuta.

Reduções relevantes:

- removidas camadas duplicadas de neutralização
- removida lógica de página do contrato global
- reduzida tipografia exagerada que causava estouro visual em cards menores
- normalizadas alturas de mídia dos cards de anúncio e publicação
- preservado bloco de autoridade com `!important` apenas em propriedades que CSS legado ainda pode sobrescrever

Uso de `!important`:

Foi mantido somente em um bloco final chamado `Component authority guard`, com escopo restrito a componentes. A finalidade é derrotar CSS legado já existente em páginas/contratos antigos sem criar overrides locais novos. Ele não controla layout de página.

### `detail-page-contract.css`

Foi limpo para separar layout de página de anatomia de card.

Antes:
- cerca de 40 ocorrências de `.detail-related-workers__track`
- cerca de 30 ocorrências de `.detail-related-publications__track`
- cerca de 17 ocorrências de `.detail-related-grid--ads`

Depois:
- 11 ocorrências de `.detail-related-workers__track`
- 10 ocorrências de `.detail-related-publications__track`
- 9 ocorrências de `.detail-related-grid--ads`

As ocorrências restantes são apenas distribuição/rail/background, não anatomia interna de card.

## Contrato final do detalhe-anuncio

### Desktop

- workers: 3 colunas, mostra até 3
- publicações: 2 colunas, mostra até 2
- anúncios semelhantes: 2 colunas, mostra até 2

### Tablet

- workers: 3 colunas, mostra até 3
- publicações: 2 colunas, mostra até 2
- anúncios semelhantes: 2 colunas, mostra até 2

### Mobile

- workers: rail horizontal
- publicações: rail horizontal
- anúncios semelhantes: 1 coluna
- cards preservam anatomia global

## Arquivos alterados

- `assets/css/components/cards/marketplace-card-contract.css`
- `assets/css/pages/detalhe-anuncio/detail-page-contract.css`
- `index.html`
- `detalhe-anuncio.html`
- `resultados.html`
- `perfil.html`
- `comunidade.html`
- `docs/reports/shared-card-contract-audit-20260531.md`

## Validação estática feita

- CSS com chaves balanceadas.
- `marketplace-card-contract.css` reduzido de 1472 para 706 linhas.
- `detail-page-contract.css` reduzido de 1898 para 1408 linhas.
- `detalhe-anuncio` não redefine mais `aspect-ratio`, `height`, `min-height`, `max-height`, `padding`, `font-size`, `line-height`, `border-radius` ou `box-shadow` em `.doke-ad-card`, `.publication-card`, `.video-card` ou `.doke-worker-card`.
- `detalhe-anuncio` mantém somente:
  - quantidade visível
  - colunas
  - gap externo
  - rail/overflow mobile
  - fontes de background/imagem

## Observação de validação visual

A tentativa de validação visual automatizada com Chromium/Playwright falhou no ambiente por erro de inicialização do Chromium/Crashpad. Portanto, a validação final precisa ser feita localmente no navegador.

Checklist local obrigatório:

- `index.html` desktop/tablet/mobile
- `detalhe-anuncio.html` desktop/tablet/mobile
- `resultados.html` desktop/mobile
- `perfil.html` desktop/mobile

Critérios:

- o mesmo tipo de card deve parecer o mesmo componente
- diferença permitida apenas em largura externa, quantidade por linha, rail/grid e posição
- sem sobreposição
- sem texto estourando
- imagens preservadas
- mobile proporcional

## Ajuste posterior — altura dos cards de anúncio

Após validação visual do index, foi identificado que os cards de anúncio estavam altos demais por causa da combinação:

- `height: 100%` no card
- `flex: 1` no body
- `margin-top: auto` no footer

Essa combinação criava um espaço vazio exagerado entre localização e preço/CTA. A correção foi feita no contrato global:

- `.doke-ad-card` e `.service-card` agora usam `height: auto`
- `.doke-ad-card__body` e `.service-card__body` usam `flex: 0 0 auto`
- footer deixa de ficar preso ao fundo artificial do card
- guard global atualizado para vencer CSS legado sem criar override local por página

Essa alteração corrige `index`, `detalhe-anuncio`, `resultados` e `perfil` pelo mesmo contrato.

## Ajuste posterior — paridade mobile dos rails do detalhe-anuncio

Após comparação visual mobile entre `detalhe-anuncio.html` e `index.html`, foi identificado que o contrato global dos cards estava correto, mas a distribuição mobile do detalhe ainda divergia da home:

- workers no detalhe apareciam grandes demais
- publicações no detalhe apareciam largas demais
- anúncios semelhantes ainda podiam assumir comportamento visual de rail/recorte

Correção aplicada em `detail-page-contract.css`:

- workers mobile: `grid-auto-columns: clamp(132px, calc((100% - 14px) / 2), 158px)`
- publicações mobile: `grid-auto-columns: clamp(176px, calc((100% - 14px) / 2), 196px)`
- anúncios semelhantes mobile: permanece em uma coluna limpa, com card ocupando 100% do rail

Essa correção altera apenas distribuição/rail no detalhe. A anatomia dos cards continua controlada por `marketplace-card-contract.css`.

## Ajuste posterior — neutralização do legado mobile no detalhe-anuncio

Os prints de validação mostraram que o `detalhe-anuncio` mobile ainda não estava em paridade visual com o `index`, mesmo após o ajuste de rail. A causa era a concorrência entre as classes estruturais herdadas da home (`short-videos__track`, `publication-grid`, `service-grid--compact`, `doke-grid`) e o contrato local do detalhe.

Correção aplicada:

- workers mobile: rail do detalhe agora neutraliza explicitamente `short-videos__track` com seletor de alta especificidade
- publicações mobile: rail do detalhe agora neutraliza explicitamente `publication-grid`
- anúncios semelhantes mobile: grid do detalhe agora neutraliza explicitamente `service-grid--compact.doke-grid`, forçando 1 coluna limpa
- CTA mobile: altura/padding refinados e padding inferior extra na seção final para evitar leitura visual quebrada com a barra fixa

Essa intervenção ficou restrita ao `detail-page-contract.css` e continua sem alterar a anatomia interna dos cards compartilhados.

## Ajuste posterior — paridade mobile v5

Os prints após a v4 ainda mostraram três falhas no `detalhe-anuncio` mobile:

- worker herdando pseudo/placeholder visual antigo;
- publicações ainda com distribuição diferente da home;
- anúncios semelhantes legíveis, mas cobertos pela CTA fixa no final da página.

Correção aplicada:

- rail de workers reduzido para `clamp(112px, 38vw, 142px)`;
- pseudo-elementos de worker neutralizados somente no rail do detalhe;
- conteúdo/play interno de worker escondido somente no rail do detalhe;
- rail de publicações fixado com largura semelhante à densidade da home;
- anúncios semelhantes mantidos em 1 coluna;
- padding inferior da seção de semelhantes ampliado para compensar CTA fixa + bottom nav.

A anatomia dos cards segue no contrato global; essa alteração é distribuição/compatibilidade mobile específica da página.

## Ajuste posterior — remoção dos contratos legados de paridade no detalhe-anuncio

A validação mobile mostrou que `detalhe-anuncio.html` ainda carregava contratos globais antigos que tinham sido criados como patches de paridade visual e continham regras de alta especificidade com `!important` para cards relacionados.

Removidos do `detalhe-anuncio.html`:

- `responsive-priority-contract.css`
- `responsive-priority-cards.css`
- `focused-index-parity-contract.css`
- `index-compact-card-contract.css`
- `focused-index-final-parity-contract.css`

Motivo: esses arquivos redefiniam `height`, `width`, `flex`, `display`, `overflow`, `media height` e comportamento dos rails de `detail-related-*`, competindo contra o contrato atual. A página agora depende de `detail-page-contract.css` para distribuição e `marketplace-card-contract.css` para anatomia dos cards.

## Ajuste posterior — mobile index parity v7

O critério passou a ser igualdade visual com o index, não aproximação. A correção v7 espelha explicitamente o comportamento mobile aprovado do `index.html` dentro das seções relacionadas do `detalhe-anuncio.html`:

- rails passam a usar `content-rail` como área de scroll e track com `width: max-content`, igual à home;
- workers usam largura `clamp(150px, 42vw, 184px)`, `min-height: 248px`, `aspect-ratio: 9/16` e imagens locais de `assets/img/workers`, como no index;
- publicações usam track horizontal com largura controlada e sem herdar grid local;
- anúncios semelhantes usam o mesmo padrão horizontal de feed mobile da home (`clamp(286px, 82vw, 344px)`), em vez de uma coluna própria diferente;
- adicionada folga inferior para a CTA fixa não cobrir o final da seção.

Esta versão remove a tentativa de aproximar o detalhe por regras próprias e força a distribuição mobile a seguir a referência do index.

## Ajuste posterior — paridade do card de anúncio no mobile

A última divergência restante em relação ao `index` era a seção `Anúncios semelhantes` do `detalhe-anuncio` no mobile. O detalhe ainda renderizava os anúncios em rail horizontal, enquanto a home renderiza `Mais anúncios` como lista vertical de uma coluna.

Correção aplicada:

- `.detail-section--similar-ads .detail-related-grid--ads` passou a usar `display: grid` com `grid-template-columns: minmax(0, 1fr)`
- artigos `.doke-ad-card` passaram a usar `width: 100%`, `min-width: 0`, `max-width: 100%`
- `scroll-snap` e comportamento de rail horizontal foram neutralizados
- altura de mídia dos cards preservada em `148px`, igual ao comportamento mobile consolidado

Com isso, o card de anúncio no `detalhe-anuncio` mobile passa a seguir a mesma lógica estrutural do `index`.

## Ajuste posterior — remoção das classes herdadas na seção de anúncios semelhantes

Mesmo após os ajustes de CSS, a seção `Anúncios semelhantes` ainda podia herdar comportamento de rail horizontal por carregar classes originalmente pensadas para o feed da home (`service-grid`, `service-grid--compact`, `doke-grid`).

Correção aplicada:

- o contêiner de `Anúncios semelhantes` em `detalhe-anuncio.html` deixou de reutilizar essas classes herdadas
- a distribuição da seção passou a ser controlada exclusivamente por `detail-page-contract.css`
- no mobile, a seção usa grid de uma coluna com cards `width: 100%`
- no desktop/tablet, a seção usa duas colunas e mostra até dois cards

Isso elimina a última fonte estrutural de divergência do card de anúncio em relação ao comportamento esperado no detalhe.
