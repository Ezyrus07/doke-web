# Ciclo Global 22 — Service-card overflow ownership

## Objetivo

Reduzir mais um `!important` do `service-card.css` sem mexer em layout sensível, mídia, grid, shell, sidebar, header ou HTMLs provisórios.

## Alteração

O bloco compacto global de `service-card` mantinha:

```css
:is(.service-card, .service-card--feed, .service-card--result) {
  overflow: hidden !important;
}
```

Foi alterado para:

```css
:is(.service-card, .service-card--feed, .service-card--result) {
  overflow: hidden;
}
```

## Por que é seguro

- `.service-card` já possui `overflow: hidden` no contrato base.
- O ajuste preserva o comportamento visual esperado de recorte do card.
- Não altera sizing, grid, media, footer, avatar ou responsividade.
- Não toca em páginas provisórias nem no shell global.

## Validação

Novo comando:

```bash
npm run audit:service-card-overflow-ownership
```

Ele garante que o contrato compacto não volte a usar `overflow: hidden !important` e que `overflow: hidden` continue existindo no contrato base e no contrato compacto.

## Critérios de aceite

- Nenhum `!important` novo.
- Nenhum `style=""` novo.
- Nenhum arquivo `fix/hotfix/stage/final`.
- Nenhuma alteração em shell/sidebar/header/body.
- O card continua recortando mídia/conteúdo corretamente.
