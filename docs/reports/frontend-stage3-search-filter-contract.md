# Frontend Stage 3 — Search/Filter Contract

## Objetivo
Estabilizar busca, botão de filtros, dropdown de autocomplete e chips de escopo sem refazer página por página.

## Alterações
- Criado `assets/css/components/search/search-filter-contract.css` como owner compartilhado de busca/filtro.
- `home.css` e `search-results.css` importam o novo contrato no final da cascata.
- `index.html` e `resultados.html` tiveram cache-busting atualizado.
- `resultados.html` teve `aria-expanded` inicial do botão de filtros corrigido para `false`.

## Contratos protegidos
- `results-searchbar__form`
- `results-searchbar__field`
- `results-searchbar__mobile-filter`
- `results-searchbar__dropdown`
- `search-scope`
- `home-search-hero__form`
- `home-search-hero__dropdown`
- `results-filters` como bottom sheet mobile acionado por `body.results-filters-open`

## Critérios de aceite
- O input de resultados no mobile deve manter ícone, texto e botão de filtros encaixados.
- O botão de filtros não deve sobrepor o input nem virar botão solto sem alinhamento.
- Os chips Anúncios/Workers/Antes x Depois/Usuários devem rolar horizontalmente sem quebrar layout.
- O painel de filtros mobile deve abrir como sheet, sem empurrar o conteúdo principal.
- Nenhum shell global foi alterado.

## Observação técnica
Este stage não resolve todos os `!important` antigos. Ele cria um contrato mais novo e mais específico para estabilizar a experiência antes de remover overrides legados com segurança.
