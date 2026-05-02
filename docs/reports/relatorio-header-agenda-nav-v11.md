# Relatório v11 — Header, agenda e navegação

## Ajustes
- Reduzido o lift global do header: o v10 estava agressivo demais e deixava controles colados no topo.
- Mantida a remoção do botão separado de seta do perfil.
- Desativado prefetch/shell swap de HTML interno no app.js para remover skeleton/jank ao sair de pedidos.html.
- Agenda de pedidos reparada: margem superior restaurada, borda superior preservada, calendário sem sticky dentro de container com overflow hidden e altura alinhada com o painel de eventos.

## Arquivos principais
- assets/css/components/shell/doke-shell-contract.css
- assets/js/core/app.js
- pedidos.html e demais HTMLs principais com cache CSS v11
