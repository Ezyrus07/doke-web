# Index cleanup — Ciclo 1

## Objetivo

Iniciar a limpeza controlada do `index.html` sem alterar a composição visual aprovada da home.

Este ciclo não redesenha cards, Workers, publicações, filtros, header, sidebar ou shell. Ele remove apenas redundância segura de imports e cria uma auditoria específica para manter o trabalho rastreável.

## Alterações aplicadas

### 1. Imports diretos duplicados removidos do `index.html`

Removidos do `<head>` porque já são carregados dentro de `assets/css/pages/home.css`, que é o manifest visual da home:

- `assets/css/components/layout/doke-layout-system.css`
- `assets/css/components/ui/doke-ui-system.css`
- `assets/css/components/domain/doke-domain-cards.css`

Esses arquivos continuam sendo carregados pela home via `home.css`; a mudança reduz duplicidade direta no HTML e centraliza a responsabilidade da página no manifest.

### 2. Auditoria específica do index

Criado:

- `scripts/audit-index-assets.js`

Comando:

```bash
npm run audit:index-assets
```

Saída:

- `docs/validation/index-assets-audit.json`

A auditoria mede CSS/JS carregados, imports quebrados e quantidade de `!important` nos CSS que chegam ao index.

### 3. Segurança global reaplicada

Corrigidas referências antigas nos HTMLs de autenticação:

- `auth/login.html`
- `auth/cadastro.html`
- `auth/esqueci-senha.html`

Substituições:

- `form-action-contract-stage10.css` → `form-action-contract.css`
- `responsive-runtime-stage11.css` → `responsive-runtime.css`
- `responsive-interaction-guard-stage11.js` → `responsive-interaction-guard.js`

### 4. Auditoria global mais robusta

`script/lib/css-assets.js` agora reconhece `<link rel="stylesheet">` independentemente da ordem dos atributos. Isso evita falso negativo em auditorias quando o HTML usa `href` antes de `rel`.

## Não foi feito

- Nenhum redesign no index.
- Nenhuma alteração em shell/sidebar/header/body.
- Nenhum arquivo `fix`, `hotfix`, `stage`, `final`, `novo` ou `redesign`.
- Nenhum `!important` novo.
- Nenhum `style=""` novo.

## Próximo corte recomendado

O próximo ciclo deve atacar componentes reutilizáveis que aparecem no marketplace, ainda com baixo risco:

1. mapear `service-card`/`doke-ad-card` entre `index`, `resultados`, `perfil` e `detalhe-anuncio`;
2. mapear `worker-card` e separar o que é card reutilizável do que é rail específico da home;
3. mapear `publication-card` e separar card de grid/rail;
4. só depois remover regras antigas em `home.css` ou `home/index-final-refinement.css`.
