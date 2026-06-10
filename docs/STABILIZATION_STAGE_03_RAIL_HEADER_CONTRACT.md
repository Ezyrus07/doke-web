# Stage 03 — Rail/Header contract

## Objetivo

Preparar a consolidação profissional de rail, largura e header nas páginas críticas do Doke Web sem repetir o ciclo de remendos visuais.

Esta etapa existe porque problemas recentes tiveram o mesmo padrão estrutural:

- header e conteúdo começando em eixos diferentes;
- busca fora do rail do conteúdo;
- header mobile alternando entre contratos diferentes durante a transição;
- estruturas antigas aparecendo durante loading/ready;
- CSS de página tentando corrigir responsabilidade de shell/header;
- conflitos entre URL direta e navegação interna.

## Regra de arquitetura

Rail/header não devem ser corrigidos por margem manual, `!important`, seletor mais forte ou regra local isolada.

Antes de qualquer alteração runtime, a autoridade precisa estar clara:

| Área | Autoridade correta |
| --- | --- |
| Shell, sidebar, mobile shell | `components/shell` |
| Header/topbar compartilhado | `components/shell` ou pattern canônico de header |
| Rail/largura global | `core`/contrato compartilhado |
| Layout específico da página | `pages` |
| Anatomia interna de cards | `components/cards` |

## O que CSS de página pode fazer

CSS de página pode controlar:

- espaçamento entre blocos próprios da página;
- grid/lista local;
- composição interna da página;
- estados locais bem escopados em `body[data-page="..."]` quando justificado.

CSS de página não deve controlar:

- `.app-shell`;
- `.sidebar`;
- `.app-header` global;
- anatomia de cards compartilhados;
- tokens globais de largura sem justificativa;
- diferença de layout entre URL direta e navegação interna.

## Ordem de execução do Stage 03

1. Rodar `npm run audit:stage03-rail-header-contract`.
2. Escolher uma página alvo com sintoma real e alto risco estrutural.
3. Corrigir apenas rail/header nessa página.
4. Validar URL direta e navegação interna.
5. Só depois repetir em outra página.

## Candidatas iniciais

1. `resultados.html` — histórico recente de busca desalinhada e rail inconsistente.
2. `pedidos.html` — histórico recente de header mobile alternando contratos.
3. `detalhe-anuncio.html` — histórico recente de rail mobile fora da largura do header.
4. `perfil.html` — alto risco por contratos antigos e variações de cards/header.

## Critério de aceite

- Header e conteúdo começam no mesmo eixo visual.
- Busca, filtros e conteúdo usam o mesmo rail quando pertencem ao mesmo fluxo.
- Mobile não apresenta estrutura antiga durante transição.
- URL direta e navegação interna renderizam o mesmo contrato.
- Nenhum `!important` novo.
- Nenhum arquivo de remendo.
- Nenhum ajuste de card no mesmo patch de rail/header.
