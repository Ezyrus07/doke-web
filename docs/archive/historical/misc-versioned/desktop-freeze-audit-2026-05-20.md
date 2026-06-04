# Auditoria técnica de fechamento desktop — 2026-05-20
## Escopo
- HTMLs principais auditados: arquivos `.html` na raiz do projeto.
- Modo de atuação: sem redesign, sem alteração visual por gosto e sem correção subjetiva.
- Correção permitida: apenas bug objetivo de contrato estrutural/import/rota/runtime.
## HTMLs principais auditados
- `ajuda.html` — CSS: 21; JS: 31; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `anunciar-servico.html` — CSS: 21; JS: 30; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `avaliacao-profissional.html` — CSS: 21; JS: 29; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `avaliacao.html` — CSS: 28; JS: 18; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `carteira.html` — CSS: 38; JS: 34; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `comunidade-interna.html` — CSS: 38; JS: 16; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `comunidade.html` — CSS: 40; JS: 36; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `configuracoes.html` — CSS: 35; JS: 36; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `detalhe-anuncio.html` — CSS: 22; JS: 14; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `index.html` — CSS: 10; JS: 54; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `mensagens.html` — CSS: 44; JS: 36; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `notificacoes.html` — CSS: 39; JS: 35; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `novidades.html` — CSS: 21; JS: 31; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `pagamento-profissional.html` — CSS: 21; JS: 29; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `pedidos.html` — CSS: 46; JS: 48; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `perfil.html` — CSS: 49; JS: 41; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `resultados.html` — CSS: 6; JS: 46; shell: app-shell=True, sidebar=True, page=True, page__content=True
- `tornar-profissional.html` — CSS: 21; JS: 30; shell: app-shell=True, sidebar=True, page=True, page__content=True

## Resultado por categoria
| Categoria | Resultado | Severidade | Recomendação |
|---|---:|---|---|
| Imports CSS/JS declarados nos HTMLs | Nenhum arquivo local inexistente encontrado | OK | Manter validação antes de iniciar mobile |
| Links internos para `.html` inexistente | Nenhum link quebrado encontrado | OK | Manter auditoria de rotas no pipeline |
| Assets referenciados por CSS encadeado a partir dos HTMLs | Nenhum asset local inexistente encontrado | OK | Manter crawl recursivo de `@import` e `url()` |
| Sintaxe dos arquivos JS em `assets/js` | Sem erro em `node --check` | OK | Não cobre dependências de DOM em runtime; usar browser local também |
| Estrutura base `app-shell/sidebar/page/page__content` | `configuracoes.html` não tinha `.page__content` antes da correção | Alta | Corrigido adicionando classe no `<main>` sem redesign |
| Playwright desktop 1920x1080 e 1366x768 | Execução tentada, mas o Chromium da sandbox bloqueou qualquer navegação com `net::ERR_BLOCKED_BY_ADMINISTRATOR` | Bloqueio de ambiente | Reexecutar localmente com navegador Playwright instalado para coletar console/404 real |

## Achados detalhados
### 1. Contrato estrutural quebrado em `configuracoes.html`
- **Severidade:** Alta.
- **Tipo:** contrato estrutural objetivo.
- **Antes:** `.app-shell`, `.sidebar` e `.page` existiam, mas o conteúdo principal não possuía `.page__content`.
- **Impacto:** a página ficava fora do contrato base usado pelas demais telas principais; isso aumenta risco de inconsistência de shell, largura, scroll e integração futura com regras globais.
- **Correção aplicada:** `<main class="settings-main">` passou para `<main class="page__content settings-main">`.
- **Escopo da correção:** somente classe estrutural no HTML; nenhum CSS novo, nenhum JS novo, nenhum redesign.

### 2. Imports locais de CSS/JS
- **Severidade:** OK.
- Todos os imports locais diretos declarados nos HTMLs existem no projeto.
- Também foi validado o encadeamento dos CSS carregados pelos HTMLs, incluindo `@import` e `url()`, sem asset local ausente.

### 3. Links internos
- **Severidade:** OK.
- Nenhum link interno apontando para arquivo `.html` inexistente foi encontrado nos HTMLs da raiz.

### 4. Runtime/console com Playwright
- **Severidade:** Bloqueio de ambiente, não necessariamente bug do projeto.
- `npx playwright install chromium` não conseguiu baixar o Chromium por falha de resolução DNS da sandbox.
- Foi tentado fallback com `/usr/bin/chromium`, mas qualquer navegação via Playwright para `http://127.0.0.1`, `file://` e até `data:` retornou `net::ERR_BLOCKED_BY_ADMINISTRATOR`.
- Portanto, não é tecnicamente honesto afirmar que console, exceções JS e 404 de runtime foram validados por browser nesta sandbox. A validação objetiva possível aqui foi estática + sintaxe JS + auditorias existentes do projeto.

## Matriz de páginas
| Página | CSS locais/externos | JS locais/externos | Estrutura após correção |
|---|---:|---:|---|
| `ajuda.html` | 21 | 31 | OK |
| `anunciar-servico.html` | 21 | 30 | OK |
| `avaliacao-profissional.html` | 21 | 29 | OK |
| `avaliacao.html` | 28 | 18 | OK |
| `carteira.html` | 38 | 34 | OK |
| `comunidade-interna.html` | 38 | 16 | OK |
| `comunidade.html` | 40 | 36 | OK |
| `configuracoes.html` | 35 | 36 | OK |
| `detalhe-anuncio.html` | 22 | 14 | OK |
| `index.html` | 10 | 54 | OK |
| `mensagens.html` | 44 | 36 | OK |
| `notificacoes.html` | 39 | 35 | OK |
| `novidades.html` | 21 | 31 | OK |
| `pagamento-profissional.html` | 21 | 29 | OK |
| `pedidos.html` | 46 | 48 | OK |
| `perfil.html` | 49 | 41 | OK |
| `resultados.html` | 6 | 46 | OK |
| `tornar-profissional.html` | 21 | 30 | OK |

## Testes executados
- Inspeção estática de todos os HTMLs da raiz: CSS, JS, links `.html` e contrato estrutural.
- Crawl recursivo dos CSS ligados pelos HTMLs: `@import` e `url()`.
- `node --check` em todos os arquivos de `assets/js`.
- `npm run audit:desktop-shell`.
- `npm run audit:desktop-base`.
- `npm run audit:essential-asset-imports`.
- Tentativa de Playwright em 1920x1080 e 1366x768: bloqueada pelo ambiente com `net::ERR_BLOCKED_BY_ADMINISTRATOR`.

## Arquivos alterados
- `configuracoes.html` — adicionado `page__content` ao `<main>` principal.
- `docs/desktop-freeze-audit-2026-05-20.md` — relatório desta auditoria.

## Recomendação de fechamento antes do mobile
O desktop pode seguir para congelamento estrutural com uma ressalva: a validação final de runtime precisa ser repetida fora desta sandbox, em ambiente local com Playwright operacional, para capturar console, exceções e 404 reais no navegador. Não recomendo iniciar mudanças mobile profundas antes dessa checagem local de runtime, porque qualquer erro global de shell/JS pode contaminar o diagnóstico mobile.
