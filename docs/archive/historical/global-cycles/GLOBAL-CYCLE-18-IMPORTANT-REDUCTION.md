# Ciclo Global 18 — Primeira redução controlada de `!important`

## Objetivo

Iniciar a redução de `!important` sem apagar regras em massa, sem redesenhar páginas e sem tocar em telas provisórias.

## Escopo

Arquivo trabalhado:

```txt
assets/css/components/cards/service-card.css
```

## Alteração feita

Removidos `!important` apenas de três propriedades do bloco base `.service-card__body`:

```txt
display
grid-template-columns
grid-template-areas
```

Essas propriedades pertencem ao contrato base do componente e não devem depender de força artificial para definir a estrutura inicial do card.

## O que não foi feito

```txt
Não removemos !important de blocos responsivos compactos.
Não alteramos layout de página.
Não mexemos em páginas provisórias.
Não criamos arquivo fix/hotfix/stage/final.
Não alteramos visual intencionalmente.
```

## Resultado

```txt
service-card.css: 57 -> 54 ocorrências de !important
```

A redução foi pequena de propósito. O projeto ainda tem muitos `!important`, mas a limpeza deve continuar por contrato e por bloco validado, não por remoção cega.

## Auditoria

Novo comando:

```bash
npm run audit:important-reduction
```

Ele valida que o bloco base `.service-card__body` não voltou a usar `!important` nas propriedades removidas e registra a contagem atual.

## Próximo passo recomendado

Continuar a redução em blocos estáveis relacionados a `service-card.css`, ou partir para o ciclo de imports/overrides de marketplace antes de reduzir mais regras fortes.
