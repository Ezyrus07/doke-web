# Stage 66 — Legacy Authority Containment / Final Gate Preparation

## Objetivo

Conter os últimos arquivos com nome/autoridade antiga que ainda entravam pela cascata ativa antes do fechamento estrutural e antes de qualquer Visual Recovery.

Arquivos auditados:

- `assets/css/components/cards/mobile-card-distribution-contract.css`
- `assets/css/components/shell/desktop-page-rail-authority.css`
- `assets/css/components/shell/shared-page-width-contract.css`

## Diagnóstico

Os três arquivos não tinham mais papel desejável como autoridade ativa:

- `mobile-card-distribution-contract.css` já era um arquivo aposentado e não deveria estar importado por `core/components.css`.
- `shared-page-width-contract.css` já era apenas shim para `layout/page-rail.css`, mas ainda entrava indiretamente pela cascata ativa.
- `desktop-page-rail-authority.css` ainda continha regras reais de rail/header/page width dentro de `components/shell`, camada errada para essa responsabilidade.

A responsabilidade correta é `layout`, não `components/shell` nem `components/cards`.

## Decisão aplicada

- As regras reais de rail foram movidas para `assets/css/layout/page-rail-authority.css`.
- `core/index.css` importa a nova autoridade de layout depois de `core/components.css` para preservar a ordem tardia que o contrato antigo tinha.
- `core/components.css` deixou de importar os três caminhos antigos.
- Os caminhos antigos foram mantidos fisicamente como shim/comentário de compatibilidade, sem autoridade ativa.
- O teste `scripts/test-desktop-zoomout-contract.js` foi atualizado para validar o novo dono canônico.

## Resultado

- Caminhos antigos ativos na cascata: `3 → 0`.
- Nova autoridade canônica ativa: `assets/css/layout/page-rail-authority.css`.
- `!important` ativo: `0`.
- Links CSS quebrados em HTML ativo: `0`.
- Imports CSS quebrados: `0`.
- Chaves CSS desbalanceadas: `0`.

## Estado pós-stage

Os arquivos antigos permanecem no repositório para não quebrar scripts, documentação histórica ou referências manuais, mas não são mais parte da cascata ativa.

Isso prepara o gate final estrutural e reduz o risco de o Visual Recovery ser feito em cima de uma autoridade antiga escondida.

## Próximo passo recomendado

Stage 67 deve ser o gate final estrutural e o plano de entrada para Visual Recovery 01.
