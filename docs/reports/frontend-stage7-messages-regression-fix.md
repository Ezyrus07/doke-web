# Stage 7 — Correção de regressão em mensagens após redução de `!important`

## Objetivo
Corrigir a regressão visual em `mensagens.html` causada pela primeira passada de redução de `!important` no contrato de mensagens.

## Diagnóstico
A redução anterior removeu proteções de cascata que ainda eram necessárias para a lista lateral de mensagens. Como a página ainda herda contratos antigos de cards/listas, alguns estilos voltaram a vencer o contrato principal, gerando:

- contatos com texto quebrando em múltiplas linhas;
- imagens/avatares deformados;
- botões de filtro/busca voltando para a coluna azul;
- estrutura lateral com overflow visual;
- header/thread parcialmente desalinhado.

Também havia um comentário `v13` sem fechamento no final de `chat-workspace-contract.css`, fazendo as regras finais ficarem comentadas. O fechamento foi restaurado antes da nova camada `v15`.

## Correção aplicada
Adicionada a camada `v15` ao final de:

`assets/css/components/internal/chat-workspace-contract.css`

Responsabilidades da camada:

- esconder toolbar/search antigos da sidebar em desktop;
- restaurar grid da lista lateral;
- travar avatar como quadrado controlado, sem deformação;
- aplicar ellipsis em nome, horário e preview;
- esconder ruído nos contatos;
- restaurar badge/count;
- proteger header/thread/composer contra regressão de cascata;
- manter escopo exclusivo em `body.messages-page-shell`.

## Impacto
- Correção local no contrato da página de mensagens.
- Não altera shell global.
- Não cria CSS de remendo.
- Não altera HTML estrutural além de cache-busting.

## Arquivos alterados
- `mensagens.html`
- `assets/css/pages/mensagens.css`
- `assets/css/components/internal/chat-workspace-contract.css`
- `docs/reports/frontend-stage7-messages-regression-fix.md`

## Critérios de aceite
- A coluna azul não deve exibir filtros/search no topo.
- Cards laterais devem ficar compactos e legíveis.
- Avatares não podem virar elipses ou estourar altura.
- Texto não deve quebrar letra por letra nem invadir outras seções.
- Header/thread devem permanecer encaixados.
