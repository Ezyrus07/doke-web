# CSS Deprecated / Em transição

Este arquivo lista CSS que não deve ser usado como fonte de verdade em páginas já migradas para o App Shell mobile.

## Regra

Não apagar tudo sem validar visualmente, mas também não carregar esses arquivos em páginas que já usam `mobile-app-shell`.

## Depreciados para chrome mobile

| Arquivo | Motivo | Substituto |
|---|---|---|
| `assets/css/components/navigation/mobile-chrome-lock.css` | Arquivo de contenção visual por página | `assets/css/components/shell/mobile-app-shell.css` |
| `assets/css/components/navigation/app-mobile-topbar.css` | Header mobile antigo separado | `mobile-app-shell.css` |
| `assets/css/components/navigation/app-mobile-search.css` | Search mobile antigo separado | `mobile-app-shell.css` |
| `assets/css/components/navigation/mobile-search-header-shared.css` | Contrato intermediário | `mobile-app-shell.css` |
| `assets/css/components/shell/mobile-page-rhythm-contract.css` | Tentava compensar ritmo por página | `mobile-app-shell.css` |
| `assets/css/components/navigation/mobile-bottom-nav-system.css` | Bottom nav mobile duplicado | `mobile-app-shell.css` |
| `assets/css/components/navigation/mobile-bottom-nav.css` | Bottom nav mobile duplicado | `mobile-app-shell.css` |
| `assets/css/components/navigation/bottom-nav.css` | Bottom nav antigo nas páginas migradas | `mobile-app-shell.css` |
| `assets/css/components/navigation/header-mobile.css` | Header mobile antigo | `mobile-app-shell.css` |
| `assets/css/components/navigation/app-mobile-header-contract.css` | Contrato antigo de header | `mobile-app-shell.css` |

## Páginas migradas

- `index.html`
- `resultados.html`
- `pedidos.html`
- `mensagens.html`
- `comunidade.html`
- `comunidade-interna.html`
- `perfil.html`
- `carteira.html`
- `notificacoes.html`
- `configuracoes.html`

## Próxima limpeza segura

Depois de validar no navegador:

1. confirmar que nenhuma página migrada carrega os arquivos acima;
2. buscar classes antigas no HTML;
3. remover blocos CSS mortos;
4. consolidar botões, cards e modais no mesmo padrão.

## Próximos candidatos a depreciação após validação visual

Depois da validação no navegador, auditar e reduzir regras locais que redesenham:

- botões de página com altura/radius/sombra próprios;
- inputs/selects/textareas fora do contrato `.doke-*`;
- cards com padrões visuais duplicados;
- modais/drawers/popovers com estrutura própria.

Essas regras não devem ser apagadas em massa antes da validação visual, porque algumas ainda podem carregar comportamento legado. O caminho correto é migrar componente por componente para o contrato `assets/css/components/ui/doke-ui-system.css`.

## Bridge temporária

`assets/css/components/ui/doke-legacy-bridge.css` foi removido do fluxo principal na Stage 16.

Ele deve ser removido no futuro quando os HTMLs deixarem de usar classes antigas para cards, botões, modais, filtros e forms.

## Stage 14 — Bridge reduzida

`assets/css/components/ui/doke-legacy-bridge.css` foi removido. Botões e cards devem ser resolvidos por `doke-ui-system.css` e classes `.doke-*`.

## Stage 15 — Bridge residual

`assets/css/components/ui/doke-legacy-bridge.css` não deve ser reintroduzido para governar:

- botões;
- cards;
- forms;
- filtros;
- modais;
- drawers;
- popovers;
- surfaces principais.

Escopo temporário permitido:

- avatares antigos;
- chips/badges residuais;
- menus/dropdowns antigos.

A auditoria `npm run audit:bridge` bloqueia regressões nesse escopo.

## Stage 16 — Removido do fluxo principal

- `assets/css/components/ui/doke-legacy-bridge.css`
  - Status: removido do pacote principal.
  - Motivo: os últimos resíduos de avatar, badge/chip e menu/dropdown foram absorvidos pelo `doke-ui-system.css`.
  - Regra: não reintroduzir bridge visual. Se um componente divergir, ajustar o contrato `.doke-*` ou migrar o HTML para classe canônica.
