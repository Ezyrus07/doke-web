# Prompt para Codex — Doke Web Visual Validation Pass

Você está no projeto Doke Web, pacote pós-pass18. Use o código atual como fonte de verdade.

Objetivo: executar validação visual real com Playwright nos 45 cenários do manifesto e corrigir somente regressões comprovadas por screenshot.

Leia e siga:

- AGENTS.md
- PROJECT-RULES.md
- ARCHITECTURE.md
- docs/DOKE_AGENT_CONSTITUTION.md
- docs/CSS_AUTHORITY_MAP.md
- docs/GLOBAL-LAYOUT-CONTRACT.md
- docs/DESIGN-SYSTEM-GUIDE.md
- docs/PAGE-ASSET-AUTHORITY-MATRIX.md
- docs/BASELINE-VISUAL-APPROVED.md
- docs/CODEX-VISUAL-VALIDATION-HANDOFF.md
- docs/CODEX-VISUAL-EXECUTION-GUIDE.md

Execute:

```bash
npm install
npm run audit:visual-manifest-coverage
npm run audit:global-final
npx playwright install chromium
npm run visual:codex:update
npm run visual:codex
```

Se o download do Chromium falhar e houver Chrome/Chromium local, use:

```bash
DOKE_PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run visual:codex:update
DOKE_PLAYWRIGHT_EXECUTABLE_PATH=/usr/bin/chromium npm run visual:codex
```

No Windows PowerShell:

```powershell
$env:DOKE_PLAYWRIGHT_EXECUTABLE_PATH="C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
npm run visual:codex:update
npm run visual:codex
Remove-Item Env:\DOKE_PLAYWRIGHT_EXECUTABLE_PATH
```

Regras:

- Não faça padronização cega.
- Não use `!important`, inline style ou JS para resolver divergência CSS.
- Preserve o baseline visual do `index.html`.
- Não mexa em shell/header/rail global para corrigir componente local sem prova.
- Corrija primeiro overflow horizontal, console.error, request 4xx/5xx e `body[data-page]` errado.
- Depois corrija diferenças de header/topbar, cards, botões, formulários, modais, estados vazios/loading e bottom nav.
- Se a diferença for legítima, documente e não altere.

Entrega final obrigatória:

- causa raiz;
- páginas/viewports testados;
- problemas corrigidos;
- divergências legítimas;
- arquivos alterados;
- screenshots/relatórios gerados;
- validações executadas;
- riscos restantes;
- rollback recomendado.
