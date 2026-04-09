# UI Kit — contrato de referência

`ui-kit.html` é a fonte visual oficial dos padrões do Doke.

## Deve existir no UI Kit
- botões primário, secundário, ghost, soft, danger;
- ícone-only buttons;
- badges e chips;
- inputs e searchbox;
- card oficial de anúncio;
- hero oficial;
- estados mobile críticos (input 16px, overlay lock, ícones padronizados).

## Hero oficial de pagina interna
- reaproveitar a base `.hero`, `.hero__title`, `.hero__actions`, `.searchbox`, `.button` e `.chip`;
- usar no maximo 1 badge, 1 titulo e 1 linha curta de contexto;
- priorizar 1 busca dominante ou até 2 acoes principais;
- filtros e chips entram abaixo das acoes, nunca disputando o mesmo nivel do titulo;
- o hero deve abrir a tarefa da pagina, não repetir outro cabecalho logo abaixo.

## Fluxo recomendado
1. criar ou ajustar o componente no UI Kit;
2. estabilizar classe e variações;
3. só depois aplicar nas páginas reais.

## Quando criar um arquivo novo em `assets/css/components/`
Quando o componente for usado em 3 ou mais páginas e já estiver grande demais para continuar em `core/components.css`.
