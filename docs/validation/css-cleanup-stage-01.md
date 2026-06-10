# CSS Cleanup Stage 01 — index/home cascade reduction

## Objetivo

Reduzir competição ativa de CSS no `index.html` sem redesenhar o layout e sem criar nova camada de patch.

## Alterações executadas

### `assets/css/pages/home.css`

Removidos do manifesto ativo da home imports que não deveriam ser autoridade final da home ou que já chegam por `core/index.css`:

- `../patterns/marketplace-responsive-stack.css`
- `./home/tablet-safari-layout.css`
- import duplicado de `../components/shell/shared-page-width-contract.css`
- import duplicado de `../components/shell/desktop-page-rail-authority.css`
- import duplicado de `../components/cards/marketplace-card-contract.css`
- import duplicado de `../components/cards/publication-card.css`

Motivo: a home estava reimportando contratos compartilhados e também carregando camadas amplas de stack/tablet com muitos `!important`, depois dos contratos base. Isso criava disputa tardia entre o estado inicial e o estado responsivo/hidratado.

### `assets/css/pages/notificacoes.css`

Removido import duplicado de:

- `./notificacoes/internal-page-header.css`

Motivo: o próprio HTML já carrega `assets/css/pages/internal-page-header.css`, e o arquivo dentro de `pages/notificacoes/` é uma cópia idêntica. Manter os dois ativos aumenta carga e confusão de autoridade.

## Resultado mensurável no índice ativo da home

Dependências CSS únicas do `index.html`:

- Antes: 158 arquivos CSS únicos alcançados por imports.
- Depois: 156 arquivos CSS únicos alcançados por imports.

Ocorrências de `!important` nas dependências CSS ativas do `index.html`:

- Antes: 12.968
- Depois: 11.723
- Redução: 1.245 ocorrências ativas removidas da cascata da home.

## Limites desta etapa

Esta etapa não removeu os arquivos físicos antigos. Eles foram removidos apenas da cascata ativa da home quando eram duplicados ou camadas de remendo de alto risco.

Ainda permanecem arquivos críticos ativos com muitos `!important`, especialmente:

- `assets/css/components/shell/doke-shell-contract.css`
- `assets/css/pages/home/tablet-responsive-layout.css`
- `assets/css/components/shell/app-header.css`
- `assets/css/pages/home/mobile-index-feed-contract.css`
- `assets/css/components/shell/app-header-canonical-contract.css`

Esses arquivos não foram removidos nesta etapa porque provavelmente ainda seguram partes importantes de shell/header/tablet e exigem consolidação separada.

## Próxima etapa recomendada

Consolidar `home/tablet-responsive-layout.css` por responsabilidade:

1. separar regras de rail/largura;
2. separar regras de cards/carrosséis;
3. mover anatomia de card para components;
4. remover `!important` por bloco, validando tablet/mobile a cada corte.
