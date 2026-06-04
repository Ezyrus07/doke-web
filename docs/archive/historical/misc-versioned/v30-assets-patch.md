# DOKE v30 — patch organizado em `assets/`

Este pacote substitui o hotfix anterior que eu tinha colocado na raiz do `frontend`.

## Estrutura correta

```txt
assets/css/pages/home/workers-preview.css
assets/js/pages/home/workers-preview.js

assets/css/pages/results/results-grid-polish.css
assets/js/pages/results/results-layout-polish.js

assets/css/pages/perfil/profile-trim.css
assets/js/pages/perfil/profile-trim.js
```

## O que corrige

### Home / Workers
- adiciona vídeo de exemplo se o card estiver só com fundo/gradiente;
- ativa preview no hover/focus/touch;
- no mobile, força grid 2x2 estilo Shorts.

### Resultado
- corrige cards de anúncio colados/sobrepostos;
- aplica espaçamento real no grid;
- reduz largura da área lateral de filtros quando existir;
- marca automaticamente a seção Antes x Depois;
- Antes x Depois fica 2 por fileira no desktop.

### Perfil
- reduz a sobra vertical exagerada;
- seções ocultas param de ocupar altura.

## Imports necessários

Adicione os imports nos HTMLs correspondentes.

### `index.html`

No `<head>`:

```html
<link rel="stylesheet" href="assets/css/pages/home/workers-preview.css">
```

Antes do `</body>`:

```html
<script defer src="assets/js/pages/home/workers-preview.js"></script>
```

### `resultado.html` ou `resultados.html`

No `<head>`:

```html
<link rel="stylesheet" href="assets/css/pages/results/results-grid-polish.css">
```

Antes do `</body>`:

```html
<script defer src="assets/js/pages/results/results-layout-polish.js"></script>
```

### `perfil.html` ou `meuperfil.html`

No `<head>`:

```html
<link rel="stylesheet" href="assets/css/pages/perfil/profile-trim.css">
```

Antes do `</body>`:

```html
<script defer src="assets/js/pages/perfil/profile-trim.js"></script>
```

## Observação

Este patch já está separado por responsabilidade. Depois de validar visualmente, o ideal é fundir cada arquivo no bundle/arquivo de página correspondente, caso o projeto já tenha um `index.css`/`index.js` por página.