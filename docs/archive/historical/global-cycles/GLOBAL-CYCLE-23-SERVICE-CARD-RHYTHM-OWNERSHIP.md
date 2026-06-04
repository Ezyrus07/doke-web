# Ciclo Global 23 — Service-card rhythm ownership

## Objetivo

Continuar a redução controlada de `!important` no `service-card.css`, atacando apenas um grupo de baixo risco: ritmo vertical de metadados/footer no contrato compacto do card.

## Alteração

Arquivo alterado:

```txt
assets/css/components/cards/service-card.css
```

Foram removidos `!important` de:

```txt
margin: 0
min-height: 36px
padding-top: 0
align-items: center
```

Escopo afetado:

```txt
.service-card__rating
.service-card__meta-row
.service-card__tags
.service-card__footer
```

## Por que foi seguro

- Não mexe em grid principal, mídia, imagem, avatar, responsividade ou shell.
- O ajuste mantém as mesmas declarações; só remove a força da cascata.
- A regra continua no componente correto: `service-card.css`.
- Não toca nos HTMLs provisórios nem transforma visual provisório em contrato definitivo.

## Validação

Novo comando:

```bash
npm run audit:service-card-rhythm-ownership
```

Também deve continuar passando:

```bash
npm run audit:service-card-ownership
npm run audit:desktop-base
npm run audit:desktop-shell
```

## Resultado esperado

O `service-card.css` reduz de 38 para 34 ocorrências de `!important`, preservando o ritmo visual dos cards.
