# Codex Visual Validation Handoff — Doke Web

## Objetivo

Rodar validação visual real do Doke Web em navegador, usando o pacote atual como fonte de verdade após a consolidação dos passes 01–17.

Este documento existe porque os gates estáticos passam, mas a validação por browser não pôde ser concluída no ambiente do ChatGPT por bloqueio de Chromium/Playwright.

## Escopo obrigatório

Validar as páginas prioritárias declaradas em:

- `tests/visual/visual-regression.manifest.json`

Viewports obrigatórios:

- `1366×768`
- `820×1180`
- `390×844`

Páginas obrigatórias:

- `index.html`
- `perfil.html`
- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `comunidade.html`
- `comunidade-interna.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `ajuda.html`
- `carteira.html`
- `configuracoes.html`
- `anunciar-servico.html`
- `orcamento.html`
- `pagamento-profissional.html`

## Preparação local/Codex

```bash
npm install
npx playwright install chromium
npm run audit:visual-manifest-coverage
npm run audit:global-final
```

Para criar baseline visual inicial:

```bash
npm run visual:codex:update
```

Para validar contra baseline existente:

```bash
npm run visual:codex
```

Relatórios esperados:

- `reports/generated/playwright-html/`
- `reports/generated/playwright-results.json`
- screenshots/snapshots do Playwright em `tests/visual/` conforme a configuração do runner.

## Critérios de aprovação

A validação só deve ser considerada aprovada se:

1. Todas as páginas carregarem sem `console.error` relevante.
2. Nenhuma página tiver overflow horizontal em 1366×768, 820×1180 ou 390×844.
3. `body[data-page]` corresponder ao manifesto visual.
4. O shell desktop/mobile exigido pelo manifesto estiver presente.
5. Os screenshots não mostrarem regressão clara em:
   - header/topbar;
   - rail/alinhamento X;
   - cards;
   - botões;
   - modais/drawers;
   - formulários;
   - estados vazios/loading;
   - bottom nav/mobile shell.

## Regras de correção

Ao encontrar divergência visual:

1. Classifique como regressão real, variante legítima ou falso positivo.
2. Corrija a causa raiz, não a página isolada.
3. Não use `!important` como primeira solução.
4. Não use inline style.
5. Não resolva divergência CSS com JavaScript.
6. Não mexa em shell/header/rail global para corrigir card local sem prova.
7. Preserve o baseline do `index.html`.
8. Se a correção tocar CSS de alto risco, anexe screenshot antes/depois.

## Prompt recomendado para Codex

```text
Você está no projeto Doke Web. Use o pacote atual como fonte de verdade.

Objetivo: executar a validação visual real pós-pass17 com Playwright e corrigir apenas regressões comprovadas por screenshot.

Siga AGENTS.md, PROJECT-RULES.md, docs/DOKE_AGENT_CONSTITUTION.md, docs/CSS_AUTHORITY_MAP.md, docs/GLOBAL-LAYOUT-CONTRACT.md, docs/DESIGN-SYSTEM-GUIDE.md, docs/PAGE-ASSET-AUTHORITY-MATRIX.md e docs/BASELINE-VISUAL-APPROVED.md.

Execute:

npm install
npx playwright install chromium
npm run audit:visual-manifest-coverage
npm run audit:global-final
npm run visual:codex:update
npm run visual:codex

Valide as páginas e viewports do tests/visual/visual-regression.manifest.json.

Se houver falha visual, classifique a divergência antes de alterar. Corrija somente regressões comprovadas. Não use !important, inline style ou JS para resolver CSS. Preserve o baseline visual do index.html. Ao final, entregue causa raiz, arquivos alterados, screenshots/relatórios, riscos restantes e rollback.
```

## Observação

Se o primeiro `visual:codex` falhar apenas por ausência de snapshots, rode primeiro `visual:codex:update`, revise os screenshots gerados e só então use esses snapshots como baseline inicial.
