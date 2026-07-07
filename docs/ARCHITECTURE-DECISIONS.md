# Decisões de arquitetura — Doke

Este registro documenta decisões estáveis do frontend. Use este arquivo para evitar reabrir escolhas já feitas por correções locais.

## ADR-001 — HTML não deve carregar cadeias CSS paralelas

Status: ativo.

Decisão: páginas migradas devem carregar entradas canônicas e deixar dependências internas nos manifestos corretos.

Para `index.html` e `resultados.html`, a entrada canônica é:

1. `assets/css/core/index.css`
2. `assets/css/pages/app-shell.css`
3. manifesto da página (`home.css` ou `search-results.css`)

Motivo: reduzir fan-out de CSS no HTML e impedir que uma página crie uma ordem de cascata própria.

## ADR-002 — Shell mobile pertence a um contrato único

Status: ativo.

Decisão: bottom navigation, header mobile e ações rápidas de mobile pertencem ao par:

- `assets/css/components/shell/mobile-app-shell.css`
- `assets/js/components/mobile-app-shell.js`

Motivo: impedir que páginas internas carreguem chrome mobile antigo e gerem diferença visual entre pedidos, mensagens, perfil, carteira, notificações e configurações.

## ADR-003 — Página monta composição; componente controla anatomia

Status: ativo.

Decisão: CSS de página pode controlar grid, trilho, espaçamento contextual e ordem. CSS de página não deve redesenhar borda, raio, sombra, padding interno, tipografia e CTA de componentes compartilhados.

Motivo: manter consistência visual e permitir migração futura para renderização dinâmica sem duplicação.
