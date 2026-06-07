# Doke — Stage 02 Component Contract Ownership Map

## Objetivo

Este stage define **quem é dono de cada componente compartilhado** no frontend do Doke.

A regra principal é:

```txt
Pages compõem componentes. Components definem anatomia.
```

Ou seja: `perfil.html`, `detalhe-anuncio.html`, `resultados.html` e `index.html` podem decidir **onde** um card aparece, quantos cards cabem por linha e qual é o gap. Mas não devem decidir **como o card é por dentro**.

---

## Fonte de verdade

O `index.html` continua sendo a referência visual inicial para cards e rails, mas a autoridade final deve migrar para arquivos canônicos em `components/` e `patterns/`.

### Componentes canônicos

| Componente | Dono recomendado | O que ele deve controlar |
|---|---|---|
| `publication-card` | `assets/css/components/cards/publication-card.css` | superfície, mídia, padding, título, meta, footer, stats, badges |
| `doke-ad-card` / `service-card` | `assets/css/components/cards/ad-card.css` | anatomia de anúncio/serviço, imagem, preço, rating, footer |
| `worker/video-card` | `assets/css/components/cards/worker-card.css` | ratio, overlay, thumb, preview, metadados |
| Toolbars | `assets/css/components/toolbars.css` | botões internos, altura, gap, estados |
| Tabs | `assets/css/components/tabs.css` | item, ativo, foco, altura, padding, scroll affordance |
| Avatar | `assets/css/components/avatar.css` | forma, object-fit, raio, tamanhos base |
| Botões | `assets/css/components/buttons.css` | cores, altura, padding, radius, hover/focus/disabled |

---

## O que CSS de página pode controlar

```txt
rail
grid
gap
quantidade por linha
margem externa
section spacing
overflow/carrossel
posição de composição local
```

Exemplo permitido:

```css
.profile-publications-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--doke-card-grid-gap);
}
```

---

## O que CSS de página não pode controlar

```txt
altura interna do card
aspect-ratio da mídia
padding interno
border/radius/shadow
tipografia interna
badge
footer
ícones internos
estado visual de botão compartilhado
```

Exemplo proibido:

```css
.profile-publications-grid .publication-card__media {
  aspect-ratio: 16 / 10;
}

.profile-publications-grid .publication-card {
  border-radius: 18px;
  box-shadow: ...;
}
```

---

## Contrato por componente

### 1. Publication card

**Dono:** `assets/css/components/cards/publication-card.css`

**Components controla:**

```txt
card border
card radius
card shadow
padding interno
media aspect-ratio
title/meta/footer typography
stats layout
badges
internal icon positions
```

**Pages podem controlar:**

```txt
grid wrapper
gap
external margin
column count
horizontal rail behavior
section spacing
```

---

### 2. Ad/service card

**Dono:** `assets/css/components/cards/ad-card.css`

**Components controla:**

```txt
surface
media ratio
internal spacing
price/title/meta typography
rating layout
badges
footer/actions anatomy
```

**Pages podem controlar:**

```txt
grid wrapper
rail width
gap
carousel overflow
number of cards per row
```

---

### 3. Worker/video card

**Dono:** `assets/css/components/cards/worker-card.css`

**Components controla:**

```txt
ratio
media frame
overlay
metadata typography
profile/thumb positioning
hover/preview base behavior
```

**Pages podem controlar:**

```txt
rail
grid
gap
overflow
number of visible cards
```

---

### 4. Toolbars

**Dono:** `assets/css/components/toolbars.css`

**Components controla:**

```txt
toolbar surface
button height
button padding
button radius
button typography
button gap
active/hover/focus states
```

**Pages podem controlar:**

```txt
external margin
wrapper width
whether toolbar is rendered
```

---

### 5. Tabs

**Dono:** `assets/css/components/tabs.css`

**Components controla:**

```txt
tab height
tab padding
active state
focus state
text style
scroll affordance base
```

**Pages podem controlar:**

```txt
wrapper external margin
available width
horizontal overflow when needed
```

---

## Ordem de aplicação recomendada

```txt
Stage 03A — publication-card
Stage 03B — ad/service-card
Stage 03C — worker/video-card
Stage 04A — buttons
Stage 04B — toolbars
Stage 04C — tabs
Stage 04D — avatars/metrics
Stage 05 — limpar pages
Stage 06 — responsivo oficial
Stage 07 — travas anti-regressão
```

---

## Critério de aceite do Stage 02

Este stage está pronto quando:

```txt
1. Existe mapa claro de dono por componente.
2. Existe regra clara do que pages podem e não podem fazer.
3. Existe base para auditoria automática.
4. Nenhum visual foi alterado ainda.
```

