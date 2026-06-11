# VR00 — Structural Freeze + Visual Baseline Matrix

## Objetivo

Congelar a base estrutural pós-Stage 67 e preparar a recuperação visual do Doke Web sem recriar dívida técnica.

Este stage **não recupera visual ainda**. Ele registra a diferença entre o estado atual pós-saneamento e a referência visual anterior aprovada, define responsabilidades por camada e cria critérios objetivos para iniciar o primeiro patch visual real.

## Base congelada

A base estrutural congelada para Visual Recovery é o estado pós-Stage 67.

Regras de congelamento:

- não remover mais CSS dormente antes do primeiro ciclo visual;
- não criar novos manifestos sem necessidade comprovada;
- não reativar arquivos antigos de autoridade visual;
- não usar `!important`;
- não usar inline style;
- não criar arquivos com nomes de remendo;
- não restaurar visual copiando blocos inteiros de CSS antigo sem reclassificar autoridade;
- todo patch visual deve declarar se a mudança pertence a `layout`, `components`, `patterns` ou `pages`.

## Referências visuais anexadas

As duas referências foram salvas para rastreabilidade da próxima fase:

- Estado atual pós-saneamento: `docs/validation/visual-recovery/home-current-after-structural-cleanup.png`.
- Referência visual anterior aprovada: `docs/validation/visual-recovery/home-approved-reference-before-cleanup.png`.

## Diagnóstico visual da home

A comparação mostra que a home perdeu qualidade percebida em pontos específicos:

| Área | Estado atual pós-limpeza | Referência visual anterior | Responsabilidade correta |
|---|---|---|---|
| Hero/search | Busca e ações soltas, pouco agrupamento, aparência crua | Card branco premium com busca larga, CTA circular e CTAs principais fortes | `patterns` para composição; `components` para input/botões; `pages/home.css` para posicionamento da home |
| CTAs principais | Links simples, sem peso visual suficiente | Botões grandes azul/verde, alinhados e densos | `components/buttons.css` para anatomia; pattern/page para distribuição |
| Categorias | Rail com espaçamento e corte menos controlados | Cards compactos, centralizados, com seta e densidade consistente | `patterns/horizontal-rail.css` + componente de categoria |
| Section header | Hierarquia visual fraca e desalinhada | Título compacto com botão “Ver todos” bem encaixado | `components/sections` ou `patterns` de section header |
| Cards de destaque | Aparecem baixos/desconectados e sem densidade anterior | Cards com mídia forte, badges, favoritos e corte horizontal premium | `components/cards/*` |
| Header/sidebar/rail | Estruturalmente estável, mas precisa de ajuste visual futuro | Header e conteúdo mais coesos no rail | `layout/page-rail-authority.css` e layout global, não CSS de página |
| Densidade geral | Muito espaço vazio e pouca hierarquia | Produto mais compacto, premium e escaneável | Tokens/patterns/pages, com cuidado para não criar override global perigoso |

## Princípio de recuperação

A recuperação deve seguir esta ordem de autoridade:

1. `layout`: rail, header, sidebar, largura da página e shell.
2. `components`: anatomia de cards, botões, inputs, badges, avatares e ícones.
3. `patterns`: hero/search, rails, carrosséis, grids, section headers e feeds.
4. `pages`: composição específica da home e ordem/separação de seções.

A página pode compor, mas não pode alterar anatomia de componente compartilhado.

## Critérios de aceitação do VR01 — Home Hero/Search/CTA Restoration

O primeiro patch visual real deve restaurar somente o bloco hero/search/CTAs da home.

Critérios obrigatórios:

- hero volta a ter um container branco grande, com raio e sombra sutis;
- busca fica dentro do container, com largura e altura consistentes;
- botão circular de envio volta a ter peso visual premium;
- CTAs “Procurar serviços” e “Anunciar meu serviço” voltam como botões fortes azul/verde;
- alinhamento respeita o rail atual da página;
- nenhum `!important`;
- nenhum inline style;
- nenhum CSS antigo de autoridade reativado;
- nenhum ajuste de card, worker, publicação ou perfil no mesmo patch;
- nenhum CSS de página redefinindo anatomia global de botão/input.

## Não objetivos do VR01

O VR01 não deve tentar corrigir:

- cards de destaque;
- workers;
- publicações;
- perfil;
- mensagens;
- detalhe-anuncio;
- mobile/tablet inteiro;
- remoção de CSS dormente restante.

Esses pontos entram em etapas posteriores.

## Sequência Visual Recovery proposta

### VR01 — Home Hero/Search/CTA Restoration

Restaurar o bloco principal da home no desktop, com foco na composição do hero e CTAs principais.

Arquivos-alvo prováveis:

- `assets/css/pages/home.css` para composição específica;
- `assets/css/patterns/...` se for criado/ajustado pattern reutilizável de hero/search;
- `assets/css/components/buttons.css` ou componente equivalente somente se o botão compartilhado precisar de contrato real;
- `assets/css/components/search/*` somente se a anatomia do search for compartilhada.

### VR02 — Home Categories Rail Restoration

Restaurar categorias/rail horizontal:

- cards compactos;
- setas laterais;
- overflow sem corte agressivo;
- densidade semelhante à referência.

### VR03 — Home Highlights/Card Density Restoration

Restaurar “Destaques para você”:

- cards com mídia forte;
- badge/favorito;
- espaçamento e largura por rail;
- botão “Ver todos”.

### VR04 — Home Workers/Publications Rails

Restaurar carrosséis/rails de workers e publicações conforme baseline do index.

### VR05 — Home Responsive Recovery

Validar e ajustar home nos breakpoints:

- 390x844;
- 608x926;
- 810x1080;
- 1024x768;
- 1280x800.

### VR06 — Contract Propagation

Propagar contratos restaurados para:

- `resultados.html`;
- `detalhe-anuncio.html`;
- `perfil.html`;
- `mensagens.html`.

### VR07 — Internal Pages and Regression Locks

Finalizar páginas internas e criar/rodar locks para impedir retorno de dívida visual.

## Breakpoints oficiais

| Breakpoint | Uso |
|---|---|
| 390x844 | mobile principal |
| 608x926 | tablet estreito |
| 810x1080 | iPad horizontal/rail sensível |
| 1024x768 | tablet/desktop compacto |
| 1280x800 | desktop baseline |

## Gate obrigatório antes de cada patch visual

Antes de cada VR stage com alteração de produção:

- confirmar arquivos responsáveis;
- garantir que o patch não usa `!important`;
- garantir que não cria inline style;
- garantir que não reativa arquivos antigos de autoridade;
- rodar auditoria de links/imports CSS;
- documentar risco de regressão.

## Decisão

A fase estrutural está congelada para início de Visual Recovery.

O próximo stage recomendado é **VR01 — Home Hero/Search/CTA Restoration**.
