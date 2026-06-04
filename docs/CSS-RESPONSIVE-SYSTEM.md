# CSS and Responsive System

This project uses page manifests to keep HTML small and make layout ownership clear.

## Loading Rule

Each page should load only:

```html
<link rel="stylesheet" href="assets/css/core/index.css">
<link rel="stylesheet" href="assets/css/pages/app-shell.css">
<link rel="stylesheet" href="assets/css/pages/<page>.css">
```

Page-specific dependencies must be imported by the page CSS manifest, not added as extra
`<link>` tags in the HTML.

## Ownership Rule

- `assets/css/core/`: tokens, reset, base typography and layout primitives.
- `assets/css/components/`: reusable components such as sidebar, topbar, buttons, cards, modals and navigation.
- `assets/css/pages/`: page composition only. A page CSS file may arrange components, but should not redefine shared component anatomy.
- `assets/css/pages/home.css`: single manifest for the home page. If the home needs a CSS dependency, import it there.

## Responsive Rule

Use mobile-first CSS for new work:

```css
.block {
  padding: 16px;
}

@media (min-width: 761px) {
  .block {
    padding: 24px;
  }
}

@media (min-width: 1025px) {
  .block {
    padding: 32px;
  }
}
```

Avoid creating new `final`, `hotfix`, `lock` or `stability` CSS files for normal feature work. Fix the owning file instead.

## Current Cleanup Direction

The current codebase still has many legacy overrides and `!important` rules. The cleanup path is:

1. Keep each HTML page on three CSS links.
2. Move page dependencies into the page manifest.
3. Consolidate duplicated shell/search/card rules into their owning component files.
4. Remove emergency CSS only after visual comparison confirms parity.

## Mobile Header Rule

The mobile header, mobile search bar and mobile bottom navigation are owned by:

```txt
assets/js/components/mobile-app-shell.js
assets/css/components/shell/mobile-app-shell.css
```

Pages such as `index.html` and `resultados.html` should not create separate mobile
header systems. If the mobile header needs to change visually, change the Mobile
App Shell component once instead of editing page-specific header CSS.
