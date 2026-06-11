# VR01 — Home Hero/Search/CTA Restoration

## Objetivo
Restaurar o bloco principal da home sem recriar contratos antigos, sem `!important` e sem mexer em cards, rails, sidebar ou headers globais.

## Causa raiz visual
Depois do saneamento estrutural, o hero da home perdeu o container visual que agrupava busca e CTAs. O resultado foi uma busca solta, CTAs fracos/sem presença e perda de hierarquia no topo da landing.

## Responsabilidade correta
- `assets/css/pages/home-search-chrome.css`: composição do hero, card, largura da busca e CTAs da home.
- `assets/css/components/search/search-bar.css`: anatomia compartilhada do search pill, preservada por variáveis escopadas no hero.
- `index.html`: rotas reais dos CTAs e cache-busting do manifesto da home.
- `assets/css/pages/home-foundation.css`, `assets/css/pages/home.css`, `assets/css/pages/home-runtime.css`: apenas atualização de versão de imports para evitar cache no Live Server/browser.

## O que foi restaurado
- Container branco premium para `home-search-hero__card`.
- Busca larga dentro do container da home.
- Botão circular de seta preservado pelo contrato de `doke-search-pill`.
- CTAs azul/verde como botões fortes, com grid de 2 colunas no desktop.
- Responsivo conservador para tablet/mobile sem criar camada de força bruta.
- CTAs agora apontam para rotas reais:
  - `resultados.html`;
  - `anunciar-servico.html`.

## O que não foi mexido
- Sidebar.
- Header global.
- Cards.
- Categorias.
- Workers.
- Publicações.
- Rails/carrosséis.
- CSS dormente restante.

## Validação estrutural
- HTMLs ativos analisados: 21
- CSS físico em `assets/css`: 391
- CSS alcançável pela cascata ativa: 272
- CSS dormente/não alcançável: 119
- Links CSS quebrados em HTML ativo: 0
- Imports CSS quebrados: 0
- CSS com chaves desbalanceadas: 0
- `!important` ativo: 0
- Topbar duplicada na home: 0
- Header atual da home: 1

## Risco
Risco moderado-baixo. O stage mexe em uma área visual crítica da home, mas está escopado ao dono correto (`home-search-chrome.css`) e não altera componentes compartilhados nem layout global.

## Próximo alvo recomendado
VR02 — Home Categories/Rail Restoration. Restaurar densidade, alinhamento e corte controlado do rail de categorias antes de mexer nos cards de destaque.
