# CSS Cleanup v19 — Configurações

## Escopo

Refatoração estrutural de `assets/css/pages/configuracoes.css`.

## Alterações

- `configuracoes.css` deixou de ser um monólito de aproximadamente 51 KB e virou um manifesto de imports.
- O CSS da página foi dividido em módulos por responsabilidade em `assets/css/pages/configuracoes/`.
- `configuracoes.html` recebeu nova chave de cache para carregar a versão modularizada.

## Nova divisão

- `base-shell-topbar.css`: base da página e topbar desktop.
- `navigation-layout.css`: cabeçalho, navegação mobile, grid e sidebar.
- `content-cards-forms.css`: conteúdo, cards, formulários, toggles, avatar, pagamentos e faturas.
- `buttons.css`: botões locais da página.
- `responsive-base.css`: primeira camada responsiva.
- `shell-sync.css`: sincronização visual com shell/topbar do site.
- `professional-harmonization.css`: harmonização visual posterior.
- `final-responsive-pass.css`: ajustes responsivos finais.
- `mobile-header-drawer.css`: header mobile, drawer e estabilidade mobile.
- `mobile-menu-flow.css`: fluxo menu-first mobile e refinamentos finais.

## Observação técnica

Nenhuma regra visual foi removida nesta etapa. A ordem da cascata foi preservada para reduzir risco de regressão.
