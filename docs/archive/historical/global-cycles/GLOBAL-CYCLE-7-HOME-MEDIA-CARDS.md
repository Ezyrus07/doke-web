# Ciclo Global 7 — Home media rails e cards reutilizáveis

## Objetivo

Separar responsabilidades entre o layout das seções de mídia do `index.html` e os componentes reutilizáveis de cards.

Este ciclo não altera o visual aprovado da home. Ele apenas reorganiza a propriedade do CSS para reduzir acoplamento entre página e componente.

## Alterações

### 1. `index.html`

Removidos imports diretos duplicados que já são carregados pelo manifesto `assets/css/pages/home.css`:

- `assets/css/components/layout/doke-layout-system.css`
- `assets/css/components/ui/doke-ui-system.css`
- `assets/css/components/domain/doke-domain-cards.css`

Resultado: o `index.html` volta a depender do manifesto da home, em vez de carregar contratos globais paralelamente no próprio HTML.

### 2. Novo pattern: `home-media-rails.css`

Criado:

- `assets/css/patterns/home-media-rails.css`

Responsabilidade:

- espaçamento das seções `Workers` e `Publicações em destaque`;
- geometria dos rails horizontais;
- posicionamento das setas;
- largura/scroll dos tracks;
- responsividade dos rails.

### 3. `worker-card.css`

Removidas regras de layout de seção/rail/track da home.

O arquivo passa a cuidar mais diretamente do card Worker em si, mantendo a paridade existente com `resultados.html` para não quebrar telas que ainda dependem desse contrato.

### 4. `publication-card.css`

Removidas regras de layout da seção `home-publications`, `content-rail` e `publication-grid`.

O arquivo passa a cuidar do card de publicação, enquanto o posicionamento dentro da home fica no pattern.

### 5. Segurança global reaplicada

Corrigidos imports quebrados em:

- `auth/login.html`
- `auth/cadastro.html`
- `auth/esqueci-senha.html`

Também foi corrigido o parser de CSS em `scripts/lib/css-assets.js` para detectar `<link rel="stylesheet">` independentemente da ordem dos atributos.

Criado wrapper de compatibilidade:

- `scripts/audit-desktop-shell-contracts.js`

## Validação

- `npm run audit:desktop-base` passou.
- `npm run audit:desktop-shell` passou.
- `npm run audit:responsive-boundaries` passou.
- 0 imports CSS/JS quebrados em HTMLs.
- 0 `style=""` novo.
- 0 arquivo visual `fix`, `hotfix`, `stage`, `final` criado.
- Nenhum `!important` novo foi adicionado.

## Próximo passo recomendado

Ciclo Global 8: iniciar um corte controlado em `home.css`, mapeando os blocos de overrides duplicados de publicações/workers/cards antes de remover qualquer regra visual.
