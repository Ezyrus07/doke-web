# Home Mobile Cleanup

## Objetivo
Limpar a base mobile antiga da home antes de reconstruir o layout mobile final.

## O que foi feito
- removidos blocos mobile legados dos arquivos de base da home:
  - `assets/css/pages/home/chrome.css`
  - `assets/css/pages/home/layout.css`
  - `assets/css/pages/home/sections.css`
  - `assets/css/pages/home/footer.css`
  - `assets/css/pages/home/overlays.css`
- arquivadas cópias anteriores em `archive/legacy-home-mobile/`
- mantido um único ponto de entrada mobile: `assets/css/pages/home/mobile/index.css`
- dividido o mobile por responsabilidade:
  - `base.css`
  - `topbar.css`
  - `search.css`
  - `categories.css`
  - `featured.css`
- `assets/css/pages/home/mobile.css` virou bridge de compatibilidade

## Resultado arquitetural
A home deixa de ter comportamento mobile espalhado em múltiplos arquivos grandes.
Agora o mobile da home passa a ter ownership explícito e previsível.

## Hierarquia reconstruída
1. topo azul
2. busca sobreposta
3. categorias
4. anúncios em destaque
