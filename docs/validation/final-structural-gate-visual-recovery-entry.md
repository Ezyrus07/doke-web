# Stage 67 — Final Structural Gate + Visual Recovery Entry Plan

## Objetivo

Fechar a fase de saneamento estrutural e preparar a entrada formal na fase **Visual Recovery 01+**, sem tentar recuperar visual ainda.

Este stage existe porque a base visual atual ficou criticamente degradada após a grande limpeza, mas o projeto agora tem uma cascata mais previsível para restaurar o visual de forma profissional.

## Diagnóstico do estado atual

A comparação visual enviada pelo usuário confirma regressão de apresentação na home:

- o estado atual está mais cru, com hero/search/CTAs menos integrados;
- os botões de ação perderam densidade visual;
- categorias/rails parecem menos encaixados no card/área principal;
- estruturas antigas voltaram a aparecer visualmente;
- a versão anterior tinha melhor densidade, hierarquia, CTA, agrupamento e consistência de rail.

Essa regressão é aceitável nesta fase apenas porque o objetivo era saneamento de cascata, não polimento. A partir daqui, a recuperação precisa ser feita por contrato visual limpo.

## Gate estrutural final

| Métrica | Resultado |
|---|---:|
| HTMLs ativos analisados | 21 |
| CSS físico em `assets/css` | 391 |
| CSS alcançável pela cascata ativa | 275 |
| CSS dormente/não alcançável | 116 |
| Entry points CSS diretos únicos | 22 |
| Manifestos foundation encontrados | 24 |
| Links CSS quebrados em HTML ativo | 0 |
| Imports CSS quebrados | 0 |
| CSS com chaves desbalanceadas | 0 |
| `!important` ativo | 0 |
| Arquivos com `!important` dormente | 30 |
| Ocorrências dormentes de `!important` | 12320 |
| Autoridades antigas ativas | 0 |

## Páginas ainda com mais de 1 CSS local direto

Mantidas assim por segurança de ordem de carregamento:

- `comunidade.html`: 3 CSS locais diretos.
- `resultados.html`: 2 CSS locais diretos.

Não consolidar agressivamente agora. Essas páginas devem ser tratadas visualmente apenas quando houver baseline e comparação por breakpoint.

## Resultado de arquitetura

A fase estrutural alcançou o objetivo principal:

- `!important` ativo zerado;
- links CSS quebrados zerados;
- imports CSS quebrados zerados;
- chaves CSS desbalanceadas zeradas;
- imports diretos por HTML bastante reduzidos;
- manifestos por domínio/página criados;
- autoridade antiga de rail/header/page width contida;
- CSS dormente classificado e parcialmente removido com gates conservadores.

Ainda existe CSS dormente com `!important`, mas fora da cascata ativa. Ele não deve bloquear Visual Recovery, desde que não seja reativado.

## Visual Recovery — regra de entrada

A recuperação visual deve restaurar o resultado aprovado anterior sem recriar dívida técnica.

Regras obrigatórias:

- não usar `!important`;
- não criar arquivos `fix`, `hotfix`, `rescue`, `stage`, `final`, `polish`, `adjustment`, `cleanup`, `v2`, `new` ou `temp`;
- não criar CSS de página para alterar anatomia de card compartilhado;
- não mexer em shell/sidebar/header para corrigir componente local;
- não duplicar CSS de cards, botões, inputs, header, sidebar, rails, modais ou carrosséis;
- não usar inline style;
- cada recuperação visual precisa declarar autoridade correta: `layout`, `components`, `patterns` ou `pages`.

## Plano Visual Recovery 01+

### VR00 — Baseline capture e matriz de aceitação

Antes de mexer no CSS visual:

- capturar screenshots do estado atual pós-Stage 67;
- registrar as referências visuais anteriores aprovadas;
- definir breakpoints oficiais: `390x844`, `608x926`, `810x1080`, `1024x768`, `1280x800`;
- documentar diferenças aceitas/não aceitas por página.

### VR01 — Home/index como referência canônica

Restaurar a home primeiro:

- hero/search card;
- CTAs grandes e densos;
- header/sidebar/page rail;
- categorias/carrossel;
- seção “Destaques para você”;
- densidade visual do baseline anterior.

Arquivos-alvo prováveis:

- `assets/css/pages/home-foundation.css` somente como manifesto;
- CSS real em `components`, `patterns` e `pages/home.css` conforme responsabilidade;
- `layout/page-rail-authority.css` apenas para rail/header/page width.

### VR02 — Contratos de cards compartilhados

Restaurar anatomia comum em:

- service/ad cards;
- worker cards;
- publication cards;
- review cards;
- badges, favorite buttons, avatars e media wrappers.

CSS de página não pode redefinir largura, aspect-ratio, padding interno, badges ou anatomia de card.

### VR03 — Rails, carrosséis e section headers

Restaurar composição reutilizável em `patterns`:

- rails horizontais;
- arrows;
- scroll snap quando fizer sentido;
- grids responsivos;
- section headers;
- densidade de gap por breakpoint.

### VR04 — Header/sidebar/page rail desktop e tablet

Validar com cuidado:

- largura do header alinhada ao conteúdo;
- sidebar expandida/recolhida;
- tablet 608/810;
- zoom-out desktop;
- ausência de scroll horizontal.

### VR05 — Páginas críticas

Depois da home estabilizada:

1. `perfil.html`;
2. `mensagens.html`;
3. `detalhe-anuncio.html`;
4. `resultados.html`;
5. `pedidos.html` e `notificacoes.html`.

### VR06 — Páginas internas restantes

Ajustar páginas menos críticas por reaproveitamento dos contratos já restaurados:

- `carteira.html`;
- `configuracoes.html`;
- `avaliacao.html`;
- fluxos simples/auth.

### VR07 — Locks de regressão

Criar/rodar gates para impedir retorno da dívida:

- `!important` ativo = 0;
- links/imports quebrados = 0;
- card anatomy boundary;
- section header contract;
- rail/header/page width contract;
- responsive screenshots por breakpoint.

## Decisão de fechamento

A fase estrutural pode ser considerada encerrada tecnicamente após este stage.

A próxima fase deve ser **Visual Recovery 01**, começando pela home/index. Não iniciar pelas páginas internas, porque o index é o baseline canônico de cards, rails, carrosséis e densidade visual.
