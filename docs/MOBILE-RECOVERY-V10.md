# Mobile recovery v10

Objetivo: parar a sequência de remendos que alterou o `index.html` e causou compressão/overflow.

Decisões:
- `index.html` foi restaurado para a estrutura do ZIP base, mantendo apenas cache novo no CSS compartilhado.
- `mobile-search-header-shared.css` foi restaurado para a base original e recebeu apenas um bloco final `v10`, focado em overflow, foco do input e alinhamento do `resultados.html`.
- `resultados.html` mantém classes próprias (`results-*`). Não usa mais aliases `home-*`, para evitar herdar regras da home por acidente.
- As tabs `Serviços / Usuários / Workers / Casos` foram mantidas no DOM por compatibilidade com JS, mas ocultas no mobile para não virar um segundo header azul.
