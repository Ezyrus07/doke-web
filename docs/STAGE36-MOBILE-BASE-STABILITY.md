# Stage 36 — Mobile Base Stability

## Objetivo

Estabilizar a base mobile sem alterar o design escolhido. Esta etapa protege o mobile contra regressões de fronteira desktop/mobile e garante que o Mobile App Shell continue sendo a única fonte de verdade para header, busca e bottom nav em viewports até `760px`.

## Escopo

Criado:

```txt
assets/css/components/shell/mobile-base-stability.css
scripts/audit-mobile-base-stability.js
docs/validation/stage36-mobile-base-stability-report.md
```

Atualizado:

```txt
package.json
index.html
resultados.html
pedidos.html
mensagens.html
comunidade.html
comunidade-interna.html
perfil.html
carteira.html
notificacoes.html
configuracoes.html
```

## Regras travadas

- Header mobile não deve ficar `fixed` ou `sticky`.
- Apenas o bottom nav mobile fica `fixed`.
- Estruturas desktop/sidebar/topbar/search desktop ficam ocultas no mobile.
- Conteúdo principal não deve gerar scroll horizontal.
- Cards, grids, listas, mídias e forms não podem forçar largura maior que a viewport.
- Overlays respeitam `100dvh` e safe-area.
- Containers antigos com `height`/`overflow` agressivos são neutralizados no mobile.

## Observação

Esta etapa é estrutural. Ela não decide aparência final de cards, botões, seções ou telas. O objetivo é deixar o mobile previsível para que ajustes visuais futuros sejam rápidos e seguros.
