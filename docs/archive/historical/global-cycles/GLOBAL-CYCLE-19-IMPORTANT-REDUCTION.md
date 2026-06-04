# Ciclo Global 19 — Redução controlada de `!important` em tags do service-card

## Objetivo

Continuar a remoção incremental de `!important` em `assets/css/components/cards/service-card.css` sem redesenhar cards e sem tocar em páginas provisórias.

## Alteração

Foram removidas 7 ocorrências de `!important` dos blocos compactos de tags do `service-card`:

- `.service-card__tags { gap }`
- `.service-card__tags > span { min-height, padding, border-radius, font-size, line-height }`
- `.service-card__tags > span:nth-child(n + 3) { display }`

Essas regras ficam no fim do componente, usam seletor mais específico que o bloco base e não precisam de `!important` para manter precedência.

## Resultado

- `service-card.css`: 54 → 47 ocorrências de `!important`
- Ciclos 18 + 19: 10 ocorrências removidas no total

## Restrições respeitadas

- Sem `!important` novo
- Sem `style=""` novo
- Sem arquivo `fix`, `hotfix`, `stage`, `final` ou `novo`
- Sem alteração em shell/sidebar/header/body
- Sem alteração visual intencional

## Validação

Comando principal:

```bash
npm run audit:important-reduction
```

O script valida que os blocos já limpos não voltem a usar `!important` e grava o relatório em:

```txt
docs/validation/global-cycle-19-important-reduction-report.json
```
