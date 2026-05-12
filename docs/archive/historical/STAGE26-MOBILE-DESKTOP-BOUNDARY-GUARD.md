# Stage 26 — Mobile/Desktop Boundary Guard

## Objetivo

Conter regressões em que elementos desktop reaparecem no mobile depois da criação do Desktop Shell Recovery.

## Problema detectado

No mobile, a página inicial voltou a exibir elementos que não pertencem ao fluxo mobile:

- busca desktop dentro do conteúdo;
- botão `Buscar` separado;
- elementos visuais/avatares fora do App Shell;
- hero desktop competindo com o Mobile App Shell.

## Decisão técnica

No viewport mobile, o chrome superior e a busca são responsabilidade exclusiva de:

- `assets/js/components/mobile-app-shell.js`
- `assets/css/components/shell/mobile-app-shell.css`

Portanto, estruturas desktop como `home-search-hero`, `doke-desktop-search-panel`, `topbar` e `home-side-meta` não devem aparecer quando `body.doke-mobile-shell-mounted` estiver ativo.

## Escopo

Foi adicionada uma guarda no final de `mobile-app-shell.css` para esconder estruturas desktop no mobile sem alterar o desktop.

## Regra de manutenção

Se um elemento precisa existir só no desktop, use uma classe/estrutura desktop clara. Se precisa existir no mobile, ele deve vir do Mobile App Shell ou de componentes mobile explícitos.
