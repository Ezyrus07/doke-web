# Desktop visual baseline — 2026-05-20

## Escopo
Baseline de screenshots desktop gerado com Playwright, sem alteração de código do site.

## Viewports

- 1920x1080
- 1366x768

## Observação de ambiente

A navegação direta com `page.goto()` foi bloqueada pelo Chromium da sandbox com política administrada `URLBlocklist`. Para cumprir a geração com Playwright sem alterar o projeto, as páginas foram renderizadas por `page.setContent()` e os assets locais foram servidos por interceptação de rotas `http://doke.local/*`.

Recursos externos foram estabilizados para baseline local: Google Fonts foi substituído por CSS vazio; Lucide e Supabase CDN foram substituídos por stubs mínimos para evitar dependência de rede. Isso evita que o baseline dependa da internet.

## Arquivos gerados

| Página | Viewport | Arquivo |
|---|---:|---|
| index.html | 1920x1080 | index-1920.png |
| index.html | 1366x768 | index-1366.png |
| pedidos.html | 1920x1080 | pedidos-1920.png |
| pedidos.html | 1366x768 | pedidos-1366.png |
| mensagens.html | 1920x1080 | mensagens-1920.png |
| mensagens.html | 1366x768 | mensagens-1366.png |
| comunidade.html | 1920x1080 | comunidade-1920.png |
| comunidade.html | 1366x768 | comunidade-1366.png |
| comunidade-interna.html | 1920x1080 | comunidade-interna-1920.png |
| comunidade-interna.html | 1366x768 | comunidade-interna-1366.png |
| notificacoes.html | 1920x1080 | notificacoes-1920.png |
| notificacoes.html | 1366x768 | notificacoes-1366.png |
| carteira.html | 1920x1080 | carteira-1920.png |
| carteira.html | 1366x768 | carteira-1366.png |
| perfil.html | 1920x1080 | perfil-1920.png |
| perfil.html | 1366x768 | perfil-1366.png |
| configuracoes.html | 1920x1080 | configuracoes-1920.png |
| configuracoes.html | 1366x768 | configuracoes-1366.png |
| detalhe-anuncio.html | 1920x1080 | detalhe-anuncio-1920.png |
| detalhe-anuncio.html | 1366x768 | detalhe-anuncio-1366.png |
| anunciar-servico.html | 1920x1080 | anunciar-servico-1920.png |
| anunciar-servico.html | 1366x768 | anunciar-servico-1366.png |

## Páginas que falharam

Nenhuma página falhou na geração do screenshot.

## Erros de console capturados

### anunciar-servico.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### anunciar-servico.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### carteira.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### carteira.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### comunidade-interna.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### comunidade-interna.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### comunidade.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### configuracoes.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### detalhe-anuncio.html @ 1366x768

- **error**: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector
- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### detalhe-anuncio.html @ 1920x1080

- **error**: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector
- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### index.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
- **pageerror**: Failed to construct 'URL': Invalid URL
- **error**: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector

### index.html @ 1920x1080

- **error**: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector
- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
- **pageerror**: Failed to construct 'URL': Invalid URL

### mensagens.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### mensagens.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### notificacoes.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### notificacoes.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### pedidos.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### pedidos.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.

### perfil.html @ 1366x768

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
- **error**: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector

### perfil.html @ 1920x1080

- **pageerror**: Failed to read the 'localStorage' property from 'Window': Access is denied for this document.
- **error**: Failed to load resource: net::ERR_BLOCKED_BY_CLIENT.Inspector


## Falhas de asset local

Nenhuma falha de asset local registrada.

## Notas para comparação futura

- Screenshots são viewport, não full-page.
- O baseline foi criado sem alterar HTML, CSS ou JS do site.
- Em ambiente local normal, o ideal é repetir com `page.goto()` via servidor HTTP para comparação mais fiel. Neste ambiente, isso foi bloqueado por política do Chromium.
