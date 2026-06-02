# Doke Web - Regras para Agentes

Este projeto acumulou divida tecnica principalmente em CSS de layout, shell,
header, rail, scroll e navegacao entre HTMLs. Antes de qualquer alteracao
estrutural, leia e siga estas regras.

## Principios

1. Corrija a causa raiz, nao apenas o sintoma visual.
2. Prefira consolidar regra existente a criar uma nova camada de CSS.
3. Mudancas pequenas e validadas sao melhores que refatoracoes grandes sem teste.
4. O comportamento via navegacao interna deve ser igual ao carregamento direto/F5.
5. Toda regra global precisa ter responsabilidade clara e nao deve carregar excecoes
   escondidas de uma unica pagina.

## Evite

- Criar arquivos com nomes de remendo, como:
  - `fix`
  - `hotfix`
  - `match`
  - `parity`
  - `final`
  - `rescue`
  - `adjustment`
  - `cleanup`
  - `polish`
  - `normalization`
- Usar `!important` como primeira solucao.
- Aumentar especificidade para vencer outra regra sem remover o conflito.
- Criar seletores do tipo `#id#id#id` ou cadeias muito longas de `html body ...`.
- Duplicar contrato de largura/header/sidebar em arquivos diferentes.
- Resolver no JavaScript um problema que pertence ao CSS.
- Substituir o `body` inteiro no roteador.
- Alterar muitos HTMLs sem validar visualmente.
- Deixar CSS legado ativo se a nova regra ja substitui sua responsabilidade.

## Autoridades de Layout

Antes de mexer em largura, header, sidebar, tablet ou scroll, descubra qual camada
deve mandar:

- Shell global: `.app-shell`, `.sidebar`, `.page`, `.page__content`
- Rail/conteudo: largura compartilhada das paginas internas
- Header: `app-header`, `home-side-meta`, `internal-page-topbar`
- Pagina: regras especificas de `perfil`, `pedidos`, `mensagens`, etc.
- Componente: cards, tabs, modais, listas e botoes

Nao crie uma variavel nova se uma dessas ja resolve:

- `--doke-shared-page-width`
- `--doke-desktop-page-available`
- `--doke-current-page-rail`
- `--doke-desktop-page-max`

Se uma pagina precisar de excecao, documente o motivo perto da regra e mantenha o
escopo restrito a `body[data-page="..."]`.

## Regras para CSS

1. Se for criar um arquivo CSS novo, explique por que nao da para usar um arquivo
   existente.
2. Se usar `!important`, justifique no diff ou reduza a especificidade concorrente.
3. Se remover CSS, prove antes que ele nao altera layout ou que a alteracao e
   desejada.
4. Nomes de arquivo devem descrever responsabilidade, nao o bug:
   - Bom: `shell-desktop.css`, `page-rails.css`, `profile-layout.css`
   - Ruim: `profile-width-match.css`, `final-parity.css`, `scroll-rescue.css`
5. CSS global nao deve conter hacks especificos de uma pagina sem escopo explicito.

## Regras para Navegacao entre HTMLs

O roteador interno deve preservar a experiencia sem reload completo.

Ao mexer em `assets/js/core/stable-shell-router.js` ou arquivos relacionados:

- Nao use reload completo como solucao para bug de inicializacao.
- Sincronize `html`, `body`, classes, `data-page` e controllers da nova pagina.
- Garanta que classes temporarias, como `is-stable-shell-routing`, sejam removidas.
- Garanta que scroll vertical funcione depois da troca de pagina.
- Nao substitua o `body` inteiro se puder trocar apenas o shell necessario.

## Checklist Obrigatorio

Rode validacao com Playwright sempre que mexer em:

- shell
- header
- rail/largura
- scroll
- roteador
- CSS global
- links CSS em varios HTMLs

Viewports minimos:

- Desktop: `1366x768`
- Tablet: `820x1180`
- Mobile: `390x844`

Paginas minimas:

- `index.html`
- `perfil.html`
- `pedidos.html`
- `mensagens.html`
- `notificacoes.html`
- `comunidade.html`
- `resultados.html`
- `detalhe-anuncio.html`
- `ajuda.html`

Checagens obrigatorias:

- `document.documentElement.scrollWidth <= document.documentElement.clientWidth`
- Header e conteudo alinhados em desktop nas paginas internas.
- `body[data-page]` correto apos navegacao.
- `window.DokeNavigate(...)` nao causa reload completo.
- O scroll vertical funciona apos navegar internamente.
- A pagina direta por URL e a pagina via roteador se comportam igual.

## Teste Manual Rapido

Use este roteiro quando nao houver script dedicado:

1. Abrir `index.html`.
2. Definir uma sentinela:
   ```js
   window.__reloadProbe = Math.random();
   window.__loadCount = 1;
   addEventListener('load', () => window.__loadCount++);
   ```
3. Navegar com:
   ```js
   DokeNavigate('/perfil.html');
   DokeNavigate('/pedidos.html');
   DokeNavigate('/mensagens.html');
   DokeNavigate('/resultados.html');
   ```
4. Confirmar:
   ```js
   window.__loadCount === 1
   document.body.dataset.page
   window.scrollTo(0, 500); window.scrollY > 0
   ```

## Ao Final

Sempre informe:

- causa raiz encontrada
- arquivos alterados
- paginas e viewports testados
- riscos restantes
- se algum teste nao foi executado

## Protocolo de Reforma para ChatGPT/Codex

Antes de pedir alteracoes estruturais para ChatGPT, Codex ou qualquer agente, use tambem:

- `docs/DOKE_AGENT_CONSTITUTION.md`
- `docs/AGENT-REFORM-PROTOCOL.md`
- `docs/ACTIVE-LEGACY-STRUCTURES-AUDIT.md`
- `docs/PAGE-ASSET-AUTHORITY-MATRIX.md`
- `docs/HOME-AUTHORITY-CLASSIFICATION.md`
- `docs/validation/active-legacy-structures-report.json`
- `docs/validation/page-asset-authority-matrix.json`

O agente deve rodar `npm run audit:agent-governance` antes de mexer em CSS global, shell, header, rail, scroll, roteador ou links CSS.

Se o agente nao conseguir provar causa raiz, autoridade correta e plano de validacao, ele nao deve alterar arquivos.
