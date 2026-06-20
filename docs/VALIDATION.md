# Validação frontend Doke

## Validação mínima por patch

```bash
node --check <arquivos-js-alterados>
git diff --check
npm run audit:agent-governance
```

## Quando rodar validação visual

Obrigatória ao mexer em:

- shell;
- header;
- rail/largura;
- scroll;
- roteador;
- CSS global;
- links CSS em vários HTMLs.

Viewports mínimos:

```txt
Desktop: 1366x768
Tablet: 820x1180
Mobile: 390x844
```

Páginas mínimas:

```txt
index.html
perfil.html
pedidos.html
mensagens.html
notificacoes.html
comunidade.html
resultados.html
detalhe-anuncio.html
ajuda.html
```

## Checks obrigatórios

```js
document.documentElement.scrollWidth <= document.documentElement.clientWidth
```

Para navegação:

```js
window.__reloadProbe = Math.random();
window.__loadCount = 1;
addEventListener('load', () => window.__loadCount++);

DokeNavigate('/perfil.html');
DokeNavigate('/pedidos.html');
DokeNavigate('/mensagens.html');
DokeNavigate('/resultados.html');
DokeNavigate('/index.html');

window.__loadCount === 1;
document.body.dataset.page;
window.scrollTo(0, 500);
window.scrollY > 0;
```

## Se Playwright não rodar

Declarar explicitamente:

- motivo;
- comandos alternativos executados;
- páginas/viewports que precisam de validação manual.

## Reforma responsiva — gate obrigatório

O contrato automatizado `npm run test:responsive-contract` deve usar o mesmo conjunto mínimo solicitado para mudanças de shell, header, rail/largura, scroll, CSS global ou links CSS em vários HTMLs:

```txt
1366x768
1280x802
820x1180
608x926
390x844
```

Páginas de validação obrigatória:

```txt
index.html
pedidos.html
perfil.html
detalhe-anuncio.html
resultados.html
mensagens.html
notificacoes.html
comunidade.html
ajuda.html
```

A primeira etapa da reforma responsiva não deve alterar visual global antes de o gate de validação refletir esses viewports e páginas.

## Global structural reform validation gate — 2026-06-09

Before any whole-site cleanup, CSS consolidation, `!important` removal, header/rail rewrite, card-authority migration or script-loading change, run at minimum:

```bash
npm run audit:agent-governance
npm run audit:global-structural-debt
npm run test:card-loading-parity-contract
npm run test:first-paint-loading-contract
```

If Playwright/browser validation is unavailable, runtime visual files must not be broadly rewritten. Limit work to generated audits, documentation, or one isolated page/component with explicit rollback.

Required manual/visual matrix for runtime reform:

- Viewports: `390x844`, `820x1180`, `1366x768`.
- Pages: `index.html`, `perfil.html`, `pedidos.html`, `mensagens.html`, `notificacoes.html`, `comunidade.html`, `resultados.html`, `detalhe-anuncio.html`, `ajuda.html`.
- Checks: no horizontal overflow, header/content rail alignment, direct URL equals internal navigation, no first-paint/loaded geometry shift, no new `!important`.

## Validação de fechamento — configuracoes.html

Antes de considerar `configuracoes.html` fechado após qualquer alteração futura, validar manualmente ou por browser automation estes viewports:

```txt
430x932
608x926
812x1080
1080x812
1181x768
```

Critérios específicos:

- header mobile com título correto e ações no eixo global;
- lista alinhada ao rail do header;
- até `1180px`, a tela permanece em lista única;
- até `1180px`, clicar em `Perfil`, `Segurança`, `Pagamentos`, `Tornar-se profissional`, `Disponibilidade`, `Notificações` ou `Privacidade` abre uma tela interna, não um painel abaixo da lista;
- detalhe de seção possui botão de voltar e retorna para a lista;
- a partir de `1181px`, o workspace de duas colunas pode aparecer;
- bottom nav não cobre os botões ou campos do detalhe em mobile;
- nenhum novo `!important`, inline style ou gutter local de rail.

## Validação de fechamento — carteira.html

Antes de considerar `carteira.html` fechado após qualquer alteração futura, validar manualmente ou por browser automation estes viewports:

```txt
430x932
480x1040
608x926
812x1080
1080x812
1366x768
```

Critérios específicos:

- desktop exibe resumo operacional compacto, KPIs, movimentações e conta de recebimento sem hero gigante;
- mobile/tablet exibem a mesma estrutura canônica, sem blocos `wallet-mobile-*` legados;
- header mobile mostra `Carteira` e ações alinhadas à direita, sem slot vazio sobrando;
- drawer mobile/tablet contém o item `Carteira` e o estado ativo correto em `carteira.html`;
- `Sacar saldo` abre modal no padrão de cobrança, com superfície visível, botão fechar/cancelar e confirmação;
- `Estatísticas` troca para a view analítica interna com gráficos, não abre modal;
- `Voltar ao extrato` retorna para a visão principal;
- gráficos de estatísticas permanecem legíveis em desktop, tablet e mobile, sem área preta chapada, sem corte de rosca e sem fundo branco gigante externo;
- KPIs e movimentações usam ícones refinados, sem `fill` preto herdado;
- bottom nav não cobre movimentações, modais ou botões de ação em mobile;
- sem overflow horizontal;
- nenhum novo `!important`, inline style, gutter local de rail ou alteração indevida no shell/header/sidebar global.

Comandos mínimos após alteração em carteira:

```bash
node --check assets/js/pages/carteira.js
node --check assets/js/ui/mobile-drawer-standard.js
npm run audit:layout
node tools/audit-css-contract.js
npm run audit:agent-governance
```

Se browser automation não estiver disponível, validar visualmente no Live Server pelo menos em iPhone/Pixel, iPad mini vertical, iPad horizontal e desktop.

