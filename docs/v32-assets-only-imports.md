# DOKE v32 — assets only

Este ZIP não coloca arquivos soltos na raiz.

## Arquivos

```txt
assets/css/pages/home/workers-preview.css
assets/js/pages/home/workers-preview.js

assets/css/pages/results/results-grid-polish.css
assets/js/pages/results/results-layout-polish.js

assets/css/pages/perfil/profile-trim.css
assets/js/pages/perfil/profile-trim.js

assets/css/pages/selection/selection-cleanup.css
assets/js/pages/selection/selection-cleanup.js
```

## Imports para conectar

### index.html

No `<head>`:

```html
<link rel="stylesheet" href="assets/css/pages/home/workers-preview.css?v=20260427v32">
```

Antes do `</body>`:

```html
<script defer src="assets/js/pages/home/workers-preview.js?v=20260427v32"></script>
```

### resultado.html / resultados.html

No `<head>`:

```html
<link rel="stylesheet" href="assets/css/pages/results/results-grid-polish.css?v=20260427v32">
```

Antes do `</body>`:

```html
<script defer src="assets/js/pages/results/results-layout-polish.js?v=20260427v32"></script>
```

### meuperfil.html / perfil.html

No `<head>`:

```html
<link rel="stylesheet" href="assets/css/pages/perfil/profile-trim.css?v=20260427v32">
```

Antes do `</body>`:

```html
<script defer src="assets/js/pages/perfil/profile-trim.js?v=20260427v32"></script>
```

### pedidos.html e notificacoes.html

No `<head>`:

```html
<link rel="stylesheet" href="assets/css/pages/selection/selection-cleanup.css?v=20260427v32">
```

Antes do `</body>`:

```html
<script defer src="assets/js/pages/selection/selection-cleanup.js?v=20260427v32"></script>
```