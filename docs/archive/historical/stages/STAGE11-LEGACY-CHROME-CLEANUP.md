# Stage 11 — Limpeza final do chrome mobile legado

## Objetivo

Concluir a migração estrutural iniciada pelo Mobile App Shell, removendo dos HTMLs migrados os blocos duplicados de header/search mobile que ainda existiam apenas como legado visual.

## O que foi removido

- Bloco `app-mobile-topbar` duplicado do `index.html`.
- Bloco `app-mobile-search` duplicado do `index.html`.
- Bloco `app-mobile-topbar` duplicado do `resultados.html`.
- Bloco `results-searchbar`/`app-mobile-search` duplicado do `resultados.html`.

## Regra após esta etapa

O chrome mobile oficial é somente:

- `assets/js/components/mobile-app-shell.js`
- `assets/css/components/shell/mobile-app-shell.css`

Páginas não devem declarar manualmente header mobile, search mobile ou bottom nav mobile.

## Validação

Comando:

```bash
npm run audit:frontend
```

Resultado esperado:

```txt
Críticos: 0
Avisos: 0
```

## Observação

Esta etapa remove duplicação visual, não implementa a lógica completa do produto. A busca global do App Shell continua redirecionando para `resultados.html?q=...` e o filtro global aciona os gatilhos existentes quando disponíveis.
