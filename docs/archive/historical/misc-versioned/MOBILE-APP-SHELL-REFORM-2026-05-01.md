# Reforma estrutural mobile — App Shell global

## Decisão técnica

O header, a busca mobile e o bottom nav deixaram de ser tratados como blocos copiados por página. A partir desta etapa, eles passam a ser montados por uma única fonte de verdade:

- `assets/js/components/mobile-app-shell.js`
- `assets/css/components/shell/mobile-app-shell.css`

## Páginas migradas

- `index.html`
- `resultados.html`
- `pedidos.html`
- `mensagens.html`
- `comunidade.html`
- `comunidade-interna.html`
- `perfil.html`
- `carteira.html`
- `notificacoes.html`
- `configuracoes.html`

## Contrato aplicado

### Header mobile

- posição fixa e idêntica em todas as páginas;
- mesma largura máxima;
- mesmo padding lateral;
- mesma origem vertical com `safe-area`;
- mesmo avatar, localização e sino.

### Busca mobile

- visível no `index.html` e `resultados.html`;
- mesma altura, grid, placeholder, ícones e botão de filtros;
- envio centralizado para `resultados.html?q=...`;
- botão de filtros redireciona para o gatilho legado disponível na página.

### Bottom nav

- injetado por componente único;
- estado ativo decidido por página;
- navs antigas ficam neutralizadas no mobile para evitar duplicidade visual.

## Limpeza realizada

Nas páginas migradas, foram removidos os links diretos para os contratos emergenciais/legados que estavam causando sobreposição e diferenças de origem:

- `mobile-chrome-lock.css`
- `app-mobile-topbar.css`
- `app-mobile-search.css`
- `mobile-search-header-shared.css`
- `mobile-page-rhythm-contract.css`

Esses arquivos permanecem no projeto temporariamente porque outras páginas ou fluxos ainda podem depender deles. O próximo passo seguro é auditar uso real e arquivar os que não tiverem dependência.

## Regra daqui para frente

Nenhum HTML novo deve copiar manualmente header, search ou bottom nav mobile. A página deve carregar o App Shell e cuidar apenas do conteúdo específico.
