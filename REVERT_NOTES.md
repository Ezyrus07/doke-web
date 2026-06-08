# Revert notes — critical-media patch

Este ZIP contém as versões originais do `dokee-web(225).zip` para os arquivos que eu considero melhor manter como estavam antes do patch amplo de critical-media.

Uso recomendado:
- Aplicar estes arquivos por cima da versão onde o patch critical-media foi aplicado.
- Preservar a árvore de pastas.
- Se existir o arquivo abaixo criado pelo patch amplo, delete manualmente:
  - scripts/test-critical-media-first-paint-contract.js

Motivo técnico:
- O patch de critical-media mexeu em HTMLs, CSS de cards e renderers JS de forma ampla.
- A ideia é defensável, mas deve ser revisada/reduzida pelo Codex antes de entrar no baseline principal.
- O baseline seguro recomendado continua sendo `dokee-web(225).zip`.
