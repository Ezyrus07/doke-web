# Contrato global de layout

Este contrato protege shell, sidebar, header, rail, largura e scroll. Essas áreas são sensíveis porque afetam várias páginas ao mesmo tempo.

## Autoridades

### Shell global

Responsável por:

- `.app-shell`
- `.sidebar`
- `.page`
- `.page__content`
- estrutura desktop/tablet/mobile compartilhada
- comportamento de scroll global

Arquivos típicos:

```txt
assets/css/components/shell/
assets/css/pages/app-shell.css
assets/js/core/stable-shell-router.js
```

### Header/topbar

Responsável por:

- alinhamento entre header e conteúdo;
- altura e respiro do topo;
- ações globais;
- search/header quando compartilhados.

Não resolver problema de uma página alterando header global sem provar impacto em todas as páginas principais.

### Rail/conteúdo

Variáveis preferenciais:

```txt
--doke-shared-page-width
--doke-desktop-page-available
--doke-current-page-rail
--doke-desktop-page-max
```

Não criar nova variável de largura se uma dessas resolve.

## Proibições

- Não duplicar contrato de largura em CSS de página.
- Não corrigir scroll com JS quando a causa é CSS.
- Não alterar shell para resolver card local.
- Não substituir `body` inteiro no roteador.
- Não usar reload completo para esconder bug de navegação interna.

## Critério de aceite

Toda alteração nessa área exige teste em:

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

Viewports mínimos:

```txt
1366x768
820x1180
390x844
```
