# Auditoria de Navegação Interna — Desktop Freeze

Data: 2026-05-20  
Escopo: HTMLs principais na raiz do projeto, links internos, sidebar, bottom-nav, rotas JS e páginas existentes.  
Regra aplicada: nenhuma alteração visual; apenas correções objetivas de navegação/roteamento.

## 1. HTMLs principais auditados

| HTML | Status |
|---|---|
| `ajuda.html` | Auditado |
| `anunciar-servico.html` | Auditado |
| `avaliacao-profissional.html` | Auditado |
| `avaliacao.html` | Auditado |
| `carteira.html` | Auditado |
| `comunidade-interna.html` | Auditado |
| `comunidade.html` | Auditado |
| `configuracoes.html` | Auditado |
| `detalhe-anuncio.html` | Auditado |
| `index.html` | Auditado |
| `mensagens.html` | Auditado |
| `notificacoes.html` | Auditado |
| `novidades.html` | Auditado |
| `pagamento-profissional.html` | Auditado |
| `pedidos.html` | Auditado |
| `perfil.html` | Auditado |
| `resultados.html` | Auditado |
| `tornar-profissional.html` | Auditado |

## 2. Resultado consolidado

| Checagem | Resultado |
|---|---:|
| HTMLs principais auditados | 18 |
| `href` internos extraídos dos HTMLs principais | 283 |
| Links internos `.html` quebrados nos HTMLs | 0 |
| `data-header-nav` quebrados | 0 |
| Imports navegacionais quebrados detectados no escopo | 0 |
| Rotas JS apontando para HTML inexistente antes da correção | 2 |
| Rotas JS inexistentes restantes após correção | 0 |

## 3. Links quebrados, corrigidos e restantes

| Tipo | Origem | Destino | Severidade | Ação | Status |
|---|---|---|---|---|---|
| Link HTML | HTMLs principais | `*.html` internos | Alta | Nenhum link quebrado encontrado | OK |
| Header nav | `data-header-nav` | `*.html` internos | Alta | Nenhum destino quebrado encontrado | OK |
| Rota JS inexistente | `assets/js/core/app.js` | `/mais.html` | Média | Removida de `INTERNAL_VIEW_PATHS`, `INTERNAL_VIEW_STYLE_HINTS` e active state de configurações | Corrigido |
| Rota JS inexistente | `assets/js/core/stable-shell-router.js` | `/mais.html` | Média | Removida de `SAFE_ROUTES` e do active state de configurações | Corrigido |
| Rota JS inexistente | `assets/js/core/app.js` | `/perfil-profissional.html` | Média | Removida dos hints de CSS/JS porque o HTML não existe na raiz | Corrigido |
| Registro incompleto de rota | `assets/js/core/app.js` | `/comunidade.html` | Média | Adicionado hint explícito para `assets/js/pages/comunidade.js` | Corrigido |
| Registro incompleto de rota | `assets/js/core/app.js` | `/comunidade-interna.html` | Média | Adicionado hint explícito para `assets/js/pages/comunidade-interna.js` | Corrigido |
| Prefetch incompleto | `assets/js/core/navigation-prefetch.js` | `comunidade-interna.html` | Baixa | Adicionado em `ROUTE_GROUPS.comunidade` e criado grupo `comunidade-interna` | Corrigido |
| Navegação JS direta | `assets/js/pages/comunidade.js` | `comunidade-interna.html` | Média | Troca de `window.location.href` direto para `window.DokeNavigate(...)` com fallback nativo | Corrigido |

## 4. Sidebar e bottom-nav

### Páginas principais esperadas

- `index.html`
- `pedidos.html`
- `mensagens.html`
- `comunidade.html`
- `perfil.html`

### Resultado

A bottom-nav mantém as cinco páginas principais nas telas que usam navegação inferior. A sidebar global em `assets/js/core/app.js` também contém as páginas principais e ainda inclui destinos de conta/apoio como `notificacoes.html`, `carteira.html` e `configuracoes.html`.

Alguns HTMLs mantêm `<aside class="sidebar"></aside>` vazio ou markup antigo no arquivo estático, mas o contrato runtime de `app.js` renderiza `SHARED_SIDEBAR_MARKUP` dentro de `.app-shell > .sidebar`. Por isso, não foi feita alteração visual nem duplicação de markup estático.

## 5. Registro de `comunidade-interna.html` nos roteadores

| Arquivo | Antes | Depois |
|---|---|---|
| `assets/js/core/app.js` / `INTERNAL_VIEW_PATHS` | Já existia | Mantido |
| `assets/js/core/app.js` / `INTERNAL_VIEW_STYLE_HINTS` | Existia parcialmente | Reforçado com estilos de sala/chat necessários |
| `assets/js/core/app.js` / `INTERNAL_VIEW_SCRIPT_HINTS` | Ausente | Corrigido com `assets/js/pages/comunidade-interna.js` |
| `assets/js/core/stable-shell-router.js` / `SAFE_ROUTES` | Já existia | Mantido |
| `assets/js/core/social-page-router.js` / `SAFE_ROUTES` | Já existia | Mantido |
| `assets/js/core/navigation-prefetch.js` | Ausente nos grupos prováveis | Corrigido |
| `assets/js/pages/comunidade.js` | Redirecionamento nativo direto | Usa `window.DokeNavigate` quando disponível |

## 6. Validação executada

| Validação | Comando / método | Resultado |
|---|---|---|
| Sintaxe JS | `node --check assets/js/core/app.js` | OK |
| Sintaxe JS | `node --check assets/js/core/stable-shell-router.js` | OK |
| Sintaxe JS | `node --check assets/js/core/navigation-prefetch.js` | OK |
| Sintaxe JS | `node --check assets/js/pages/comunidade.js` | OK |
| Auditoria estática de links | Extração de `href`, `src`, `form[action]` e `data-header-nav` dos HTMLs principais | OK, 0 quebrados |
| Auditoria de rotas JS | Verificação de rotas `.html` citadas em roteadores contra arquivos existentes | OK, 0 restantes |
| Playwright rápido | `comunidade.html`, `comunidade-interna.html`, `configuracoes.html` | Bloqueado pelo ambiente: `net::ERR_BLOCKED_BY_ADMINISTRATOR` ao abrir `127.0.0.1` |

## 7. Recomendações sem alteração aplicada

| Item | Recomendação | Motivo |
|---|---|---|
| `docs/ACTIVE-FILES.md` | Revisar menções a `mais.html` e `perfil-profissional.html` | Os arquivos não existem na raiz, mas ainda aparecem em documentação histórica/ativa |
| Sidebar estática em alguns HTMLs | Futuramente reduzir markup antigo e confiar no shell global de forma consistente | Evita divergência entre HTML estático e sidebar runtime |
| Páginas transacionais | Manter `pagamento-profissional.html` e `avaliacao.html` em navegação nativa até normalizar ciclo de vida | O próprio `app.js` já trata essas rotas como `nativeOnlyPaths` |

## 8. Critérios de aceite

- Nenhum `href` interno dos HTMLs principais aponta para arquivo inexistente.
- Nenhum `data-header-nav` aponta para arquivo inexistente.
- Rotas JS não mantêm HTML inexistente como rota segura/hint carregável.
- `comunidade-interna.html` está contemplado nos roteadores/hints relevantes.
- Entrada em comunidade usa o roteador interno quando disponível, preservando fallback nativo.
- Nenhum layout visual foi alterado.
