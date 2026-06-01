# Sidebar width standardization — 2026-06-01

## Causa raiz

O menu lateral ainda tinha duas larguras canônicas concorrentes dentro da camada de shell/header/rail:

- 280px em fallbacks e tokens CSS globais.
- 272px no runtime (`shell-state-early.js` / `app.js`) e em vários contratos desktop/tablet já estabilizados.

Essa divergência permitia que `index.html` e páginas internas calculassem a largura do menu por fontes diferentes, especialmente antes/depois da hidratação JS ou em breakpoints em que regras de home e shell disputavam a cascata.

## Decisão técnica

A largura canônica do shell passa a ser 272px, porque ela já é o valor usado pelo runtime e pelos contratos internos recentes. Não foi criada variável nova e não foi adicionado `!important` novo.

## Arquivos ajustados

- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/components/shell/app-shell.css`
- `assets/css/components/shell/desktop-shell.css`
- `assets/css/components/shell/app-header.css`
- `assets/css/components/shell/app-header-canonical-contract.css`
- `assets/css/components/shell/desktop-page-rail-authority.css`
- `assets/css/components/shell/shared-page-width-contract.css`

## Validação esperada

Comparar `index.html`, `pedidos.html`, `perfil.html`, `mensagens.html` e `resultados.html` com sidebar aberta/visível. O limite direito do menu e a largura do item ativo devem bater entre páginas equivalentes.

Rodar:

```bash
npm run test:layout-contract
npm run test:router-scroll
```
