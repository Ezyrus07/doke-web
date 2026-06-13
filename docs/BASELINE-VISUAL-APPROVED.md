# Baseline visual aprovado

Este documento congela o estado visual aprovado para orientar refatorações futuras. Ele não autoriza redesign; ele define o que precisa ser preservado enquanto reduzimos dívida técnica.

## Regra principal

Toda mudança em CSS, shell, header, rail, scroll, roteador ou links de assets deve preservar o baseline abaixo, salvo quando Gabriel aprovar explicitamente uma mudança visual.


## Baseline congelado — Home desktop

Status: **congelado como referência visual**.

A partir da auditoria `reports/generated/desktop-visual-authority-audit.md`, `index.html` não deve receber novo polish visual solto. Alterações na home só são permitidas quando uma das condições abaixo for verdadeira:

- correção de bug ou regressão comprovada;
- migração de componente compartilhado com validação visual;
- ajuste aprovado explicitamente como mudança de baseline.

Os padrões visuais da home devem orientar outras páginas, mas não devem ser copiados para CSS local. Quando `resultados.html`, `detalhe-anuncio.html`, `perfil.html` ou páginas internas precisarem do mesmo visual, o padrão deve ser movido/consumido por `components` ou `patterns`, mantendo `pages/*` responsável apenas por composição, eixo, grid, gap e layout específico.

## Home / `index.html`

Status: **baseline aprovado após correção do mobile pós-hidratação**.

### Mobile

A home mobile deve manter estes comportamentos:

- o primeiro frame e o estado final depois de `doke-mobile-shell-mounted` devem convergir para o mesmo layout;
- `Destaques para você` deve exibir cards legíveis em rail horizontal, sem virar tiras verticais;
- `Mais anúncios` deve exibir cards legíveis em rail horizontal, sem virar tiras verticais;
- `Publicações em destaque` deve manter o respiro entre imagem e título;
- `Workers` deve continuar estável, com o contrato mobile aprovado;
- não pode haver overflow horizontal na página;
- a home não pode depender de um frame intermediário correto e depois quebrar após hidratação.

### Desktop/tablet

- `Workers` deve preservar o formato vertical aprovado;
- os cards de anúncio e publicação devem preservar hierarquia, espaçamento e CTA aprovados;
- header, conteúdo e rails devem continuar alinhados;
- qualquer ajuste em tablet/Safari não pode sobrescrever o contrato mobile de telefone.

## Páginas internas mínimas protegidas

As páginas abaixo devem ser tratadas como baseline visual sensível durante alterações globais:

- `perfil.html`
- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `comunidade.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `ajuda.html`

## Protocolo para regressão visual

Se uma regressão aparecer depois de refresh, rota interna ou hidratação:

1. identificar a regra vencedora real antes/depois da hidratação;
2. registrar `body.className`, `body[data-page]` e classes do `html`;
3. comparar computed styles dos elementos afetados;
4. corrigir a autoridade real, não criar camada nova por cima;
5. validar F5 e `DokeNavigate(...)`.

## Critério mínimo de aceite

Antes de entregar uma refatoração que toque áreas críticas, registrar:

- páginas testadas;
- viewports testados;
- se houve mudança visual intencional;
- se houve overflow horizontal;
- se a navegação interna ficou equivalente ao carregamento direto.

## Structural cleanup entry gate — Index CSS

Status: **audit-only; no visual change**.

The home baseline is visually frozen, but `npm run audit:index-css-structure` shows the active home cascade still has substantial structural debt behind the single CSS entry. This confirms the next cleanup must be incremental and family-scoped.

Rules for the next index-related structural passes:

- do not change `index.html` for aesthetic polish;
- do not delete home imports because they are large or duplicated;
- do not move page-owned visual rules without first identifying the destination authority;
- prefer one family per patch: search, actions, cards, rails, overlays or mobile shell;
- after each production change, validate desktop/tablet/mobile and compare direct load vs internal navigation where relevant.

Generated source: `reports/generated/index-css-structure-audit.md`.

## Shared card CTA baseline

O CTA visual aprovado dos cards da home deve ser consumido por outras páginas através das classes compartilhadas, não por CSS local novo. Para anúncios, o contrato mínimo é `doke-ad-card__cta doke-btn doke-btn--success`. Para cards de profissionais, o contrato mínimo é `professional-showcase-card__cta doke-btn doke-btn--primary`.

Guard associado: `npm run test:card-cta-contract`.

## Results card density boundary

Os cards de anúncio do `resultados.html` devem continuar consumindo a anatomia compartilhada de `assets/css/components/cards/ad-card.css`. A página pode ajustar densidade por tokens `--doke-ad-results-*`, mas não deve redesenhar mídia, corpo, footer ou CTA por seletores locais.

Guard associado: `npm run test:results-card-density-contract`.
