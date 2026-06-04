# Home JS ownership

## Entry point
- `assets/js/pages/home.js` = bootstrap/orquestração da home

## Owners por domínio
- `assets/js/pages/home/drawer.js` = drawer/menu lateral mobile
- `assets/js/pages/home/filters.js` = painel de filtros e navegação por seções
- `assets/js/pages/home/search.js` = busca da home, dropdown, histórico e redirecionamento

## Regra
- não recolocar lógica de busca pesada dentro de `home.js`
- novas interações do campo de busca entram primeiro em `home/search.js`
- `home.js` só deve coordenar inicialização da página e fluxos realmente transversais
