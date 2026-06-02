# Index category rail — desktop boundary correction

## Causa raiz
A correção anterior ampliou o contrato de carrossel das categorias até `2200px`. Isso fez a home tratar desktop/zoom largo como tablet, gerando uma linha cortada, com poucas categorias visíveis e aparência de trilho incompleto.

## Correção
- O contrato de carrossel foi limitado novamente a `700px–1366px`.
- Foi criado, no mesmo arquivo de autoridade da home, um contrato separado para `1367px+`.
- Em desktop, as categorias voltam a ser uma linha estável, distribuída no rail, sem setas e sem fade lateral.
- Em tablet/narrow, o comportamento de carrossel com preview permanece.

## Arquivos alterados
- `index.html`
- `assets/css/pages/home/tablet-safari-layout.css`

## Observação sobre `!important`
O bloco usa `!important` apenas porque os contratos legados de categorias neste mesmo arquivo já usam `!important`. A correção não cria uma nova autoridade; ela separa corretamente tablet e desktop dentro da autoridade existente da home.

## Validação executada
- `node -c assets/js/core/stable-shell-router.js`
- `node scripts/audit-desktop-shell-contracts.js`
- contagem de chaves CSS: 278 abertas / 278 fechadas

## Testes não executados
Playwright runtime/browser não foi executado neste ambiente.
