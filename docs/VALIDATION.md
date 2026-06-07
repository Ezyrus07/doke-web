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
