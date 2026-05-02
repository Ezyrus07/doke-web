# Relatório curto — contrato de largura e header Doke

## Arquivos alterados

- `index.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `resultados.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `pedidos.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `comunidade.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `perfil.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `mensagens.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `notificacoes.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `carteira.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `configuracoes.html`: adicionado `doke-shell-contract.css` como último CSS do `<head>`.
- `assets/css/components/shell/doke-shell-contract.css`: novo contrato global de shell, largura e header.

## Decisões técnicas

- Largura desktop centralizada por `--doke-app-shell-max: 1180px`.

- Sidebar estabilizada em `--doke-app-sidebar-width: 280px`.

- Header e conteúdo usam exatamente o mesmo envelope: `width: min(100% - gutter*2, max)`.

- `overflow-x` foi bloqueado no shell para reduzir risco de duplo scroll horizontal.

- CSS de página não deve voltar a controlar largura global ou header.

## Critério de validação manual

- Abrir `index.html`, `resultados.html`, `pedidos.html` e `comunidade.html`.

- Conferir se o início e fim do header batem com o início e fim do conteúdo.

- Conferir se não há duas barras de rolagem em desktop.

- Conferir se os cards não invadem a área do sidebar.
