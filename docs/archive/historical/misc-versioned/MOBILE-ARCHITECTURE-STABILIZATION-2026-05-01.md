# Mobile architecture stabilization — 2026-05-01

## Decisão
Esta entrega abandona os patches incrementais de header/search e cria contratos separados por responsabilidade:

- `assets/css/patterns/mobile-app-shell.css`
- `assets/css/components/navigation/app-header.css`
- `assets/css/components/navigation/search-bar.css`
- `assets/css/patterns/horizontal-rail.css`

## Regras aplicadas

1. `index.html` continua sendo a referência visual para o topo mobile.
2. `resultado.html` não carrega mais `header-mobile.css`, porque ele criava um contrato paralelo e conflitante.
3. O cabeçalho mobile de resultados foi movido para dentro do mesmo workspace/padding da página.
4. As tabs `Serviços / Usuários / Workers / Casos` foram ocultadas no mobile para não funcionarem como um segundo header azul.
5. O input mobile é controlado por `search-bar.css`, com alinhamento vertical e foco sem borda nativa.
6. Trilhos/carrosséis rolam internamente e não podem aumentar a largura do documento.

## Arquivos alterados

- `index.html`
- `resultados.html`
- `assets/css/patterns/mobile-app-shell.css`
- `assets/css/components/navigation/app-header.css`
- `assets/css/components/navigation/search-bar.css`
- `assets/css/patterns/horizontal-rail.css`

## Critério de validação manual

Validar em 342px, 380px e 427px:

- Header não comprime `Olá Gabriel`.
- Placeholder do input fica centralizado verticalmente.
- Input não mostra borda/anel nativo ao focar.
- Não existe header azul no `resultado.html` mobile.
- Não existe sobra lateral no body; carrossel rola internamente.
