# Auditoria e Reforma Estrutural CSS/HTML — 2026-04-26

## Diagnóstico objetivo

O site tinha uma fonte de verdade parcial para superfícies (`assets/css/components/ui-surface-system.css`), mas ela havia se degradado: o arquivo acumulava várias rodadas de correção no final, com tokens duplicados, tamanhos diferentes de botão de fechar, títulos e campos sendo sobrescritos várias vezes. Além disso, alguns HTMLs ainda carregavam `surface-contract-final.css`, que reimportava o mesmo contrato e fazia a cascata aplicar o sistema duas vezes.

Resultado prático: modais, cards, botões, filtros e popovers estavam sendo corrigidos por página em vez de obedecerem a um contrato único.

## CSS carregado pelos HTMLs principais

- `index.html`: core, app-shell, home, before-after/workers, mobile-card-contract, `ui-surface-system.css`.
- `resultados.html`: core, app-shell, search-results, before-after/workers, mobile-card-contract, `ui-surface-system.css`.
- `perfil.html`: core, app-shell, internal-shell, perfil, orcamento, perfil-budget-modal, before-after/workers, mobile-card-contract, `ui-surface-system.css`.
- `mensagens.html`: core, app-shell, internal-shell, pedidos, internal-action-surfaces, mensagens, chat-composer, media-lightbox, `ui-surface-system.css`.
- `comunidade.html`: core, app-shell, internal-shell, internal-page-header, pedidos, internal-action-surfaces, comunidade, `ui-surface-system.css`.
- `comunidade-interna.html`: core, app-shell, internal-shell, internal-page-header, pedidos, internal-action-surfaces, comunidade-interna, chat-composer, media-lightbox, `ui-surface-system.css`.
- `carteira.html`: core, app-shell, internal-shell, internal-action-surfaces, carteira, `ui-surface-system.css`.
- `pedidos.html`: core, app-shell, internal-shell, internal-page-header, internal-action-surfaces, pedidos, `ui-surface-system.css`.
- `notificacoes.html`: core, app-shell, internal-shell, internal-page-header, pedidos, internal-action-surfaces, notificacoes, `ui-surface-system.css`.
- `pagamento.html`: core, app-shell, internal-shell, pagamento, `ui-surface-system.css`.
- `configuracoes.html`: core, app-shell, internal-shell, `ui-surface-system.css`.
- `detalhe-anuncio.html`: core, app-shell, detalhe-anuncio, media-lightbox, mobile-card-contract, `ui-surface-system.css`.
- `finalizar-pedido.html`: core, app-shell, internal-shell, post-service, `ui-surface-system.css`.
- `adicionar-cartao.html`: core, app-shell, wallet-manage, `ui-surface-system.css`.
- `avaliacao.html`: core, app-shell, internal-shell, post-service, `ui-surface-system.css`.

## O que foi padronizado

- `assets/css/components/ui-surface-system.css` foi refeito como contrato canônico único para:
  - modais/dialogs;
  - overlays/backdrops;
  - drawers/sidepanels;
  - popovers/dropdowns;
  - botões e ações primárias/secundárias;
  - botão de fechar;
  - inputs/selects/textareas;
  - cards reutilizáveis de anúncio, mídia, comparação e perfil;
  - responsividade de superfícies e cards em mobile.
- A regra de superfícies agora é escopada por classes reais (`.wallet-modal__card`, `.community-action-modal__dialog`, `.service-card`, `.video-card`, etc.). Não há contrato visual baseado em `.card` genérico.
- Filtros inline foram protegidos para não receberem aparência de modal/card por engano.
- O botão de fechar agora tem tamanho, cor, borda, alinhamento e ícone consistentes via tokens globais.
- Inputs e selects dentro de modais/overlays seguem um único contrato de altura, raio, borda, foco e background.
- Cards de anúncio/mídia/perfil receberam dimensões base compartilhadas por token.

## O que foi removido ou neutralizado

- Removido dos HTMLs principais o carregamento de `assets/css/components/surface-contract-final.css`.
- `surface-contract-final.css` foi transformado em shim vazio/depreciado para não duplicar o contrato.
- `ui-surface-system.css` da raiz foi transformado em arquivo depreciado que apenas aponta para o local canônico.
- Neutralizada a cascata anterior de múltiplas correções finais conflitantes dentro do próprio contrato global.

## Arquivos ainda críticos

Estes arquivos ainda concentram muitos padrões locais e devem ser reduzidos em próximas rodadas para layout específico:

1. `assets/css/pages/perfil.css`
2. `assets/css/pages/home-refresh.css`
3. `assets/css/pages/home-sections.css`
4. `assets/css/pages/pedidos.css`
5. `assets/css/pages/comunidade.css`
6. `assets/css/pages/home/sections.css`
7. `assets/css/pages/home/layout.css`
8. `assets/css/pages/search-results.css`
9. `assets/css/pages/comunidade-interna.css`
10. `assets/css/pages/home/mobile/sections.css`
11. `assets/css/core/components.css`
12. `assets/css/components/ui.css`
13. `assets/css/pages/configuracoes.css`
14. `assets/css/core/primitives.css`

Esses arquivos ainda podem conter CSS visual legado de botão/card/modal/input. Eles agora perdem prioridade para o contrato global porque `ui-surface-system.css` é carregado por último.

## Padrões que devem ser usados daqui para frente

- Modal/dialog: usar classes específicas já cobertas pelo contrato (`__dialog`, `__surface`, `__card`) e nunca criar visual local no CSS da página.
- Botão: usar classes existentes com modificadores `--primary`, `--ghost` ou criar `.doke-button`/`.doke-button--primary`.
- Campo: usar input/select/textarea dentro da superfície ou classes `.doke-input`, `.doke-select`, `.doke-textarea`.
- Card de anúncio: usar `.service-card` e suas partes internas, não criar card alternativo local.
- Worker/mídia: usar `.video-card`.
- Antes/depois: usar `.comparison-card`.
- Perfil/profissional: usar `.profile-card` ou `.pro-card`.
- Fechar: usar `aria-label="Fechar..."` ou a classe `__close` do componente. Não definir tamanho local.
- CSS de página: apenas grid, espaçamento contextual e comportamento da página; visual de componente fica no contrato global.

## Validação

- Validação estática executada em `tools/audit-css-contract.js`.
- Resultado: contrato global carregado por último, sem referências HTML ao contrato duplicado, sem seletor `.card` genérico no contrato, e com blocos canônicos para superfícies, botões, cards e mobile.
- A validação Playwright não pôde ser executada neste ambiente porque o pacote `playwright` não está instalado no projeto/ambiente (`Cannot find module 'playwright'`). O script oficial continua em `tools/validate-surface-contract.js` para execução local quando a dependência estiver disponível.
