# Professional responsive polish — before/after

## Escopo

Mudança visual liberada pelo usuário para elevar profissionalismo sem alterar copy, imagens ou fluxo.

## Mudanças aplicadas

| Problema medido | Esperado | Antes | Depois | Arquivo alterado | Breakpoints validados |
|---|---:|---:|---:|---|---|
| `body/html` com overflow horizontal por margem/default e rails vazando | `overflowX <= 1px` | 36 falhas no teste responsivo anterior | 0 falhas no `audit:professional-responsive-polish` | `assets/css/components/layout/professional-responsive-polish-contract.css` | 390, 608, 810, 1024, 1280 |
| Overlays `before-after/worker` com `[hidden]` participando da medição estática | 0 overlays ocultos visíveis | apareciam como cards gigantes no teste anterior e inflavam falhas de worker/perfil | 0 overlays ocultos visíveis | `assets/css/components/layout/professional-responsive-polish-contract.css` | 390, 608, 810, 1024, 1280 |
| Cards compartilhados sem acabamento uniforme de superfície | radius/sombra/overflow consistentes | variação por página/componente | contrato visual único aplicado | `assets/css/components/layout/professional-responsive-polish-contract.css` | 390, 608, 810, 1024, 1280 |
| Rails horizontais contribuindo para largura do documento | rail contém seu próprio overflow | `documentElement.scrollWidth = viewport + 8px` no teste anterior | `documentElement.scrollWidth <= viewport` em todas as páginas medidas | `assets/css/components/layout/professional-responsive-polish-contract.css` | 390, 608, 810, 1024, 1280 |
| Títulos/badges/actions com risco de corte visual | `min-width:0`, `ellipsis`, `max-width` | clipping em labels e badges no ciclo anterior | contenção aplicada em cards, badges e ações | `assets/css/components/layout/professional-responsive-polish-contract.css` | 390, 608, 810, 1024, 1280 |

## Resultado objetivo

| Métrica | Antes | Depois |
|---|---:|---:|
| Falhas totais do teste responsivo base anterior | 269 | 227 na última execução completa do teste antes do ajuste final de margem |
| Falhas de overflow horizontal no audit dedicado | 36 | 0 |
| Overlays ocultos renderizando layout | >0 em medições anteriores de worker/perfil | 0 |
| Páginas validadas no audit dedicado | 9 | 9 |
| Breakpoints validados | 5 | 5 |

## Observação de execução

Após o ajuste final de `margin: 0` no contrato visual, o audit dedicado `npm run audit:professional-responsive-polish` passou para os critérios objetivos de overflow e overlays. O teste completo `npm run test:responsive-contract` continua sendo mais rígido e ainda possui divergências de anatomia em `detalhe-anuncio.html`, principalmente porque compara todos os `.doke-ad-card` da página com a ordem exata dos cards do `index.html`. Isso exige uma segunda etapa de migração estrutural das seções de detalhe, não apenas polish.

## Pendências que ainda exigem decisão estrutural

- `detalhe-anuncio.html`: cards semelhantes e publicações relacionadas ainda têm contrato próprio forte em `detalhe-anuncio-rail-parity.css`.
- `mensagens.html`: mantém arquitetura de workspace/chat, diferente do marketplace/feed.
- `resultados.html`: ainda possui topbar própria em alguns pontos, não 100% marketplace header.
