# Validação — Ciclo Global 3: Componentes-base

## Escopo

Este ciclo consolida uma base global de componentes reutilizáveis sem redesenhar páginas específicas e sem cristalizar telas ainda em evolução.

## Arquivos globais adicionados

```txt
assets/css/components/base/index.css
assets/css/components/base/buttons.css
assets/css/components/base/chips-badges.css
assets/css/components/base/forms.css
assets/css/components/base/rating.css
assets/css/components/base/sections.css
assets/css/components/base/modals.css
```

## Manifest atualizado

```txt
assets/css/core/components.css
```

O manifest global agora importa `assets/css/components/base/index.css` depois dos componentes legados de core, mantendo compatibilidade e permitindo migração incremental para classes canônicas.

## Correções de segurança mantidas

```txt
auth/login.html
auth/cadastro.html
auth/esqueci-senha.html
scripts/lib/css-assets.js
scripts/audit-desktop-shell-contracts.js
```

## Validações executadas

```txt
npm run audit:desktop-base
npm run audit:responsive-boundaries
npm run audit:desktop-shell
```

Resultado: todas passaram.

## Verificações adicionais

```txt
0 imports CSS/JS quebrados em HTMLs
0 scripts npm apontando para arquivos inexistentes
0 CSS novo com !important
0 style="" novo
0 arquivo visual hotfix/final/stage criado
```

## Observação

Os novos contratos usam `:where(...)` para manter especificidade baixa. Isso reduz risco de regressão, porque CSS de página existente ainda pode prevalecer enquanto o projeto migra gradualmente para componentes canônicos.
