# Hardening CSS/JS — fases 9 a 14

Base usada: `dokee-web(153).zip`.

## Escopo executado

- Redução progressiva de `!important` na camada global/shell.
- Desarme do antigo `ipad-safari-scroll-rescue.css`.
- Remoção lógica de arquivos antigos já substituídos.
- Redução de CSS morto carregado em páginas que não são home.
- Consolidação de responsabilidade entre shell scroll e layout tablet da home.
- Relatório final de arquitetura CSS/JS desta rodada.

## Causa raiz encontrada

O arquivo `assets/css/components/shell/ipad-safari-scroll-rescue.css` misturava duas responsabilidades incompatíveis:

1. Contrato global de scroll/renderização do shell no iPad Safari.
2. Layout visual específico da home/index em tablet/iPad.

Como esse CSS era carregado em 18 HTMLs, páginas internas recebiam mais de 2.000 linhas de regras da home, ainda que a maioria estivesse escopada por `body.home-index-shell`. Isso mantinha CSS legado ativo fora do domínio correto e inflava a quantidade de `!important` na camada global.

Também existiam arquivos antigos já substituídos em fases anteriores, sem referência ativa em HTML:

- `assets/css/pages/perfil-header-rail-parity.css`
- `assets/css/pages/perfil/mobile-owner-media-polish.css`
- `assets/assets/css/components/shell/doke-shell-contract.css`

## Arquitetura aplicada

### Shell global

Novo arquivo:

```txt
assets/css/components/shell/ipad-safari-scroll.css
```

Responsabilidade exclusiva:

- neutralizar estados de scroll/renderização do WebKit em tablet portrait;
- atuar em `html`, `body`, `.app-shell`, `.page`, `.page__content` e elementos globais de shell;
- não controlar cards, home, publicações, categorias ou botões.

### Página home/index

Novo arquivo:

```txt
assets/css/pages/home/tablet-safari-layout.css
```

Responsabilidade exclusiva:

- layout tablet/iPad da home;
- regras escopadas a `body.home-index-shell`;
- carrosséis, cards, trilhos, seções e ritmo visual da home em tablet.

### Imports

Todos os 18 HTMLs que carregavam `ipad-safari-scroll-rescue.css` agora carregam:

```txt
assets/css/components/shell/ipad-safari-scroll.css
```

Somente `index.html` carrega adicionalmente:

```txt
assets/css/pages/home/tablet-safari-layout.css
```

Com isso, páginas internas deixam de carregar CSS visual da home.

## Redução de `!important`

Antes:

```txt
assets/css/components/shell/ipad-safari-scroll-rescue.css: 1329 !important
```

Depois:

```txt
assets/css/components/shell/ipad-safari-scroll.css: 65 !important
assets/css/pages/home/tablet-safari-layout.css: 1259 !important
```

Redução direta na autoridade global/shell:

```txt
1329 -> 65
```

Também foram removidos `!important` de custom properties internas da home tablet, onde não havia necessidade estrutural de forçar cascata:

```txt
--doke-ipad-home-rail
--home-ipad-section-gap
--home-ipad-header-content-gap
```

Os `!important` restantes na camada shell foram mantidos como exceção justificada: são neutralizações de estado de WebKit/Safari e classes temporárias de shell/rota. Não foram usados como primeira solução visual.

## Arquivos antigos a remover

Estes arquivos não devem permanecer no projeto final:

```txt
assets/css/components/shell/ipad-safari-scroll-rescue.css
assets/css/pages/perfil-header-rail-parity.css
assets/css/pages/perfil/mobile-owner-media-polish.css
assets/assets/css/components/shell/doke-shell-contract.css
```

Se aplicar este pacote por extração incremental, remova manualmente esses caminhos porque ZIP de arquivos alterados não apaga arquivos antigos automaticamente.

## Validação executada

### Validação estática

- `assets/css/components/shell/ipad-safari-scroll.css`: 9 `{` / 9 `}`.
- `assets/css/pages/home/tablet-safari-layout.css`: 245 `{` / 245 `}`.
- Nenhum HTML continua referenciando `ipad-safari-scroll-rescue.css`.
- Nenhum HTML continua referenciando `perfil-header-rail-parity.css`.
- Nenhum HTML continua referenciando `mobile-owner-media-polish.css`.
- `node -c assets/js/core/stable-shell-router.js` passou.
- `node scripts/audit-desktop-shell-contracts.js` passou.

Resultado do audit:

```txt
Desktop base stability audit passed.
Pages checked: 10
```

### Playwright

Os testes foram listados com sucesso:

```txt
49 tests in 2 files
```

Arquivos:

```txt
tests/e2e/global-layout-contract.spec.js
tests/e2e/stable-shell-scroll-contract.spec.js
```

A execução runtime não foi concluída neste ambiente porque o Chromium do Playwright não está instalado:

```txt
Executable doesn't exist at /home/oai/.cache/ms-playwright/chromium_headless_shell-1223/...
```

Comando necessário na sua máquina:

```bash
npx playwright install
npm run test:layout-contract
npm run test:router-scroll
```

## Páginas impactadas por import

Imports atualizados em:

```txt
ajuda.html
anunciar-servico.html
avaliacao-profissional.html
avaliacao.html
carteira.html
comunidade-interna.html
comunidade.html
configuracoes.html
detalhe-anuncio.html
index.html
mensagens.html
notificacoes.html
novidades.html
pagamento-profissional.html
pedidos.html
perfil.html
resultados.html
tornar-profissional.html
```

## Riscos restantes

1. `assets/css/pages/home/tablet-safari-layout.css` ainda contém muitos `!important`. Eles foram movidos para a página correta, mas ainda precisam ser reduzidos em uma rodada específica da home, com screenshot/Playwright.
2. Existem outros arquivos com nomes históricos de remendo fora deste pacote. Não foram renomeados agora para evitar diff amplo.
3. A validação visual real depende da sua máquina com browser Playwright instalado.
4. O próximo ciclo deve focar em erros responsivos pontuais, não em nova refatoração global.

## Próxima recomendação

Antes de avançar para correções responsivas:

1. Aplicar este pacote.
2. Remover os arquivos antigos listados.
3. Rodar `npm run test:layout-contract` e `npm run test:router-scroll`.
4. Validar manualmente desktop `1366x768`, tablet `820x1180` e mobile `390x844` nas páginas mínimas.
