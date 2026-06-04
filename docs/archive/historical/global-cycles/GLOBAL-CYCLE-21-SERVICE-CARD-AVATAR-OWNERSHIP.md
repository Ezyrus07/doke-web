# Ciclo Global 21 — Avatar ownership no `service-card`

## Objetivo

Reduzir dependência de `!important` no bloco de avatar do `service-card` sem redesenhar cards e sem tocar em páginas provisórias.

## Alteração

Arquivo alterado:

```txt
assets/css/components/cards/service-card.css
```

O bloco compacto abaixo deixou de usar `!important`:

```txt
:is(.service-card, .service-card--feed, .service-card--result) .service-card__avatar
```

## Decisão técnica

O tamanho do avatar passou a ser controlado por uma variável local:

```css
--doke-service-card-avatar-size: 30px;
```

O seletor compacto mantém especificidade suficiente para vencer o contrato legado `.service-card__avatar` sem precisar forçar a cascata com `!important`.

## Por que isso é seguro

- A alteração fica dentro do componente `service-card`.
- Não mexe em `body`, shell, sidebar, header ou wrappers globais.
- Não altera páginas provisórias.
- Não cria contrato visual definitivo para telas ainda em evolução.
- Prepara o componente para futura renderização por dados sem depender de correções locais.

## Resultado esperado

O avatar dos cards de serviço continua circular e compacto nos contextos:

```txt
.service-card
.service-card--feed
.service-card--result
```

Mas o bloco deixa de depender de `!important`.

## Auditoria

Novo comando:

```bash
npm run audit:service-card-avatar-ownership
```

Ele valida que o bloco compacto do avatar:

- existe;
- não usa `!important`;
- usa `--doke-service-card-avatar-size`;
- mantém sizing, flex-basis, aspect-ratio e recorte circular.

## Critérios respeitados

- Sem `!important` novo.
- Sem `style=""` novo.
- Sem arquivo `fix`, `hotfix`, `stage`, `final`, `novo` ou `ajuste`.
- Sem alteração em shell/sidebar/header/body.
