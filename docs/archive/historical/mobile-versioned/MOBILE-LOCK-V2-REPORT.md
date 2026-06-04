# Mobile Chrome Lock v2

## Objetivo
Estabilizar o topo mobile do `index.html` e do `resultados.html` sem continuar alterando várias camadas ao mesmo tempo.

## Alterações
- Carrega `mobile-chrome-lock.css` como último CSS em `index.html` e `resultados.html`.
- Oculta as tabs `Serviços / Usuários / Workers / Casos` no mobile para elas não funcionarem como segundo header.
- Padroniza largura, padding, header, searchbar, input e estados de foco.
- Bloqueia overflow horizontal no body e nos containers principais.
- Mantém carrosséis/rails com scroll interno, sem expandir o documento.

## Critério de validação
Testar em 342px, 380px e 427px.
