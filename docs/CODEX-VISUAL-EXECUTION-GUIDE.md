# Codex Visual Execution Guide — Doke Web

## Objetivo

Executar validação visual real do pacote atual do Doke Web e corrigir somente divergências comprovadas por screenshot.

Este guia complementa `docs/CODEX-VISUAL-VALIDATION-HANDOFF.md` com comandos práticos para Codex/Windows/ambiente local.

## Sequência obrigatória

```bash
npm install
npm run audit:visual-manifest-coverage
npm run audit:global-final
```

Depois instale o Chromium do Playwright, se a rede permitir:

```bash
npx playwright install chromium
```

Rode a criação inicial de snapshots:

```bash
npm run visual:codex:update
```

Depois rode a validação:

```bash
npm run visual:codex
```

## Alternativa quando o browser do Playwright não baixa

Se `npx playwright install chromium` falhar, mas existir Chrome/Chromium local, rode informando o executável:

### Linux/macOS

```bash
DOKE_PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run visual:codex:update
DOKE_PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run visual:codex
```

### Windows PowerShell

```powershell
$env:DOKE_PLAYWRIGHT_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
npm run visual:codex:update
npm run visual:codex
Remove-Item Env:\DOKE_PLAYWRIGHT_EXECUTABLE_PATH
```

## Critério de correção

Para cada falha visual:

1. Abra o screenshot esperado/recebido/diff.
2. Classifique como regressão real, variante legítima ou falso positivo.
3. Corrija a autoridade correta: component, pattern, page ou token.
4. Não use `!important` como primeira solução.
5. Não use inline style.
6. Não resolva CSS com JS.
7. Preserve `index.html` como baseline visual aprovado.
8. Rode novamente somente as páginas afetadas e depois a suíte inteira.

## Entrega esperada do Codex

- Lista de páginas/viewports com falha.
- Screenshots ou caminhos dos relatórios Playwright.
- Causa raiz por família.
- Arquivos alterados.
- Testes executados.
- Riscos restantes.
- Rollback por família.
