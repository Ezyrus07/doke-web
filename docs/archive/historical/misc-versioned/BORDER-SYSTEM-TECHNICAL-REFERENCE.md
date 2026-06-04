# Border System - Technical Reference & Maintenance Guide

## System Overview

The border system is built on a 4-layer CSS architecture designed to ensure consistency while maintaining flexibility and scalability.

```
Layer 4: border-consolidation.css (Defensive)
         ↓ Catches hardcoded RGBA values via wildcards
Layer 3: surface-normalize.css (Normalization)
         ↓ Applies tokens to 80+ component patterns
Layer 2: surfaces.css (Contract)
         ↓ Maps card border variables to token
Layer 1: tokens.css (Foundation)
         ↓ Single reference token defined here

REFERENCE: --doke-card-border: rgba(24, 75, 118, 0.1)
```

---

## Token System

### Primary Token

**Location:** `assets/css/core/tokens.css`

```css
:root {
  --doke-card-border: rgba(24, 75, 118, 0.1);
}
```

**Characteristics:**

- Alpha: 0.1 (10% opacity on blue-gray base)
- RGB: (24, 75, 118) — professional blue
- Result: Subtle but intentional
- Visual weight: Consistent across light & dark content

### Secondary Tokens (All Point to Primary)

```css
--surface-outline-color: var(--doke-card-border);
--surface-outline-color-strong: var(--doke-card-border);
--surface-outline-color-soft: var(--doke-card-border);
--color-border: var(--surface-outline-color);
--color-border-strong: var(--surface-outline-color-strong);
--color-primary-border: var(--doke-card-border);
--color-secondary-border: var(--doke-card-border);
--internal-surface-border: var(--doke-card-border);
--internal-surface-border-soft: var(--doke-card-border);
--internal-control-border: var(--doke-card-border);
--surface-shell-border: var(--doke-card-border);
```

**Why multiple tokens pointing to same value?**

- Semantic naming for different contexts
- If future refinement needed, can split without breaking CSS
- Makes intent clear in code (e.g., "this is a control border")
- Follows design system scalability patterns

---

## Layer 1: Token Foundation

**File:** `assets/css/core/tokens.css`

**Responsibility:**

1. Define `--doke-card-border` once
2. Create semantic aliases
3. Define related tokens (surface colors, shadows, radii)

**Do's:**

- ✅ Use this for all border-color needs
- ✅ Create new tokens here for global values
- ✅ Keep token names semantic

**Don'ts:**

- ❌ Hardcode RGBA values in other files
- ❌ Create page-level border tokens
- ❌ Use different alpha values for similar borders

---

## Layer 2: Surface Contract

**File:** `assets/css/core/surfaces.css`

**Responsibility:**

1. Define surface-specific border variables
2. Apply to 34+ common card/panel classes
3. Manage border radius for cards
4. Create media query variations

**Key Variables:**

```css
--surface-card-border-standard: var(--doke-card-border);
--surface-card-border-strong: var(--doke-card-border);
--surface-card-divider-standard: var(--doke-card-border);
--surface-card-radius-standard: 22px;
--surface-card-radius-strong: 28px;
```

**Covered Components:**

```css
.surface-card        .page-header-context
.quote-card          .orders-card
.auth-card           .wallet-panel
.notification-card   .detail-booking
...and 24 more       (see surfaces.css for full list)
```

**Rule Scope:**

```css
:where(
  .surface-card,
  .quote-card,
  /* ... 32+ more classes ... */
) {
  border: 1px solid var(--surface-card-border-standard) !important;
  border-radius: var(--surface-card-radius-standard) !important;
}
```

**Notes:**

- Uses `:where()` for 0 specificity
- Uses `!important` to ensure override of page CSS
- Handles mobile adaptation in media query

**Do's:**

- ✅ Add new card classes here if they appear in multiple contexts
- ✅ Use existing variables (don't create new RGBA)
- ✅ Keep border-radius with border rules

**Don'ts:**

- ❌ Create inline card styles in page CSS
- ❌ Define `border: 1px solid rgba()` directly
- ❌ Use different radius values without justification

---

## Layer 3: Surface Normalization

**File:** `assets/css/core/surface-normalize.css`

**Responsibility:**

1. Apply border token to 80+ component classes
2. Use CSS selectors to target common patterns
3. Exclude semantic states (active, selected, primary)

**Coverage Categories:**

### Cards & Panels (20+ classes)

```
.profile-tabs
.profile-achievement-card
.service-card
.detail-strip__item
... etc
```

### Interactive Controls (15+ classes)

```
.home-results-filter
.results-shell__toolbarn
.topbar-search
.profile-dropdown
```

### Small Components (10+ classes)

```
.filters-pill
.results-filter-chip
.mobile-header-shortcut
```

### Wildcard Patterns (20+ via [class*=""])

```
[class*="__card"]
[class*="__panel"]
[class*="__sheet"]
[class*="__rail"]
```

**Exception Handling:**

```css
:not(
  .is-active,
  .is-selected,
  [aria-selected="true"],
  [aria-pressed="true"],
  .button--primary,
  .button--secondary,
  .button--danger,
  /* ... semantic states preserved ... */
)
```

**Implementation Pattern:**

```css
:where(
  .surface,
  .profile-tabs,
  [class*="__card"],
  /* ... many classes ... */
):not(
  .is-active,
  /* ... semantic states ... */
) {
  border-color: var(--doke-card-border) !important;
}
```

**Do's:**

- ✅ Add new neutral component classes here
- ✅ Use `:where()` for clean specificity
- ✅ Keep `:not()` for semantic preservation

**Don'ts:**

- ❌ Hardcode RGBA in this file
- ❌ Remove existing selectors without cause
- ❌ Override semantic states here

---

## Layer 4: Border Consolidation

**File:** `assets/css/core/border-consolidation.css`

**Responsibility:**

1. Catch hardcoded RGBA values that escaped layers 2-3
2. Normalize borders via attribute selectors
3. Handle edge cases and custom components
4. Provide defensive coverage with !important

**4 Strategies:**

### Strategy 1: Wildcard Class Patterns

```css
[class*="home-"][class*="card"],
[class*="results-"][class*="panel"],
[class*="profile-"][class*="card"],
[class*="orders-"][class*="card"],
[class*="wallet-"][class*="card"],
[class*="detail-"][class*="card"],
```

**Catches:** Custom card classes not in surface-normalize.css

### Strategy 2: RGBA Attribute Selectors

```css
[style*="rgba(214, 224, 235"],
[style*="rgba(214, 225, 238"],
[style*="rgba(211, 223, 236"],
[style*="rgba(220, 229, 239"],
[style*="rgba(188, 205, 224"],
/* ... 12+ more RGBA patterns ... */
```

**Catches:** Hardcoded values in inline styles or external files

### Strategy 3: Inset Shadow Borders

```css
[style*="inset 0 0 0 1px rgba("] {
  box-shadow: inset 0 0 0 1px var(--doke-card-border) !important;
}
```

**Catches:** "Fake borders" created with box-shadow

### Strategy 4: Extra Specificity

```css
[class*="__card"]:not(.is-active):not(.is-selected):not([aria-selected="true"]),
[class*="__panel"]:not(.is-active):not(.is-selected):not([aria-selected="true"]),
```

**Catches:** Component variants with class suffixes

**Do's:**

- ✅ Add new RGBA patterns only if discovered in wild
- ✅ Keep wildcard patterns broad to catch variations
- ✅ Maintain exception list for semantic states

**Don'ts:**

- ❌ Use this layer for primary styling (it's defensive)
- ❌ Add overly specific selectors (defeats purpose)
- ❌ Remove existing RGBA patterns

---

## Common Maintenance Tasks

### Task: Add New Card Component

**Scenario:** You created a new `.quote-request-card` component

**Steps:**

1. **Use token in component CSS:**

   ```css
   .quote-request-card {
     border: 1px solid var(--doke-card-border);
     border-radius: 20px;
   }
   ```

2. **If used in multiple pages:** Add to `surfaces.css`

   ```css
   :where(
     .quote-card,
     .quote-request-card,
     /* ... */
   ) {
     border: 1px solid var(--surface-card-border-standard) !important;
   }
   ```

3. **If appears in many contexts:** Add to `surface-normalize.css`
   ```css
   :where(
     /* ... existing ... */
     .quote-request-card,
   ):not(...)
   ```

### Task: Change Global Border Color

**Scenario:** Design decides new neutral border should be lighter/darker

**Steps:**

1. **Update ONE line in tokens.css:**

   ```css
   --doke-card-border: rgba(30, 80, 130, 0.08); /* new value */
   ```

2. **Result:** 150+ components automatically update

3. **No other changes needed** — cascade handles everything

### Task: Add Exception for Semantic State

**Scenario:** `.quote-card` when `.is-highlight` should have gold border

**Steps:**

1. **Add to surface-normalize.css `:not()` clause:**

   ```css
   :not(
     /* ... existing ... */
     .quote-card.is-highlight,
   )
   ```

   OR create specific rule:

   ```css
   .quote-card.is-highlight {
     border-color: #c98d2c !important;
   }
   ```

### Task: Debug Random Border Color

**Scenario:** One card has wrong border color

**Steps:**

1. **Open DevTools > Inspect Element**

2. **Look at Computed > border-color**
   - Should show `rgba(24, 75, 118, 0.1)` or variable reference
   - If shows different RGBA, something's overriding

3. **Check Styles tab** — look for source of override
   - If from page CSS — check if class needs exception
   - If from inline — check if RGBA is in attribute selector list
   - If from component — verify using tokens

4. **Add to border-consolidation.css** if truly edge case:
   ```css
   .problematic-card {
     border-color: var(--doke-card-border) !important;
   }
   ```

### Task: Verify No Hardcoded Values Exist

**Script to check (in DevTools console):**

```javascript
// Find all inline border styles
const allElements = document.querySelectorAll('[style*="border"]');
const badBorders = Array.from(allElements).filter((el) => {
  const style = el.getAttribute("style");
  return (
    style.match(/rgba\(\d+,\s*\d+,\s*\d+/g) && !style.includes("24, 75, 118")
  );
});
console.log("Elements with non-standard borders:", badBorders);
```

**CSS check (grep across files):**

```bash
grep -r "rgba([0-9]" assets/css/pages/ | grep -v "24, 75, 118"
```

---

## Performance & Specificity

### CSS Specificity Management

**Layer levels:**

```
Layer 1 (tokens.css):           0,0,0  (Custom properties, no selectors)
Layer 2 (surfaces.css):         0,1,0  (:where() = 0 specificity)
Layer 3 (surface-normalize):    0,1,0  (:where() = 0 specificity)
Layer 4 (border-consolidation): 0,2,0  (Attribute selectors)
Page CSS:                       1,0,0  (if uses !important) or 0,1,1
```

**Why `:where()`?**

- Reduces specificity to 0
- Allows page CSS to override if needed (without using !important)
- Responsive to media queries without conflict

**Why `!important` in layers 2-4?**

- Ensures consistency override page CSS
- Page CSS often has unscoped selectors
- System integrity requires uniform borders
- Only used where necessary (not excessive)

### File Sizes

```
tokens.css:                    ~2.5 KB  (compressed)
surfaces.css:                  ~3.2 KB  (compressed)
surface-normalize.css:         ~4.8 KB  (compressed)
border-consolidation.css:      ~3.5 KB  (compressed)
─────────────────────────────────────
Total new CSS:                ~14  KB  (uncompressed)
Total savings:               ~50+ KB  (removed duplicates)
```

---

## Troubleshooting

### Problem: Border not applying to component

**Checklist:**

1. ✅ Is element actually a border? (not outline, box-shadow, etc.)
2. ✅ Does element have `border: 0` or `border: none;`? (override it)
3. ✅ Is element display:none? (CSS issue, not border)
4. ✅ Is border-color being set to transparent? (find override)
5. ✅ Is element using inline style? (check attribute selectors)

**Debug:**

```javascript
// In DevTools console on the element:
const el = document.querySelector(".your-element");
console.log(getComputedStyle(el).borderColor);
// Should show rgba(24, 75, 118, 0.1) or similar
```

### Problem: Semantic state color overridden

**Examples:**

- `.button--danger` should be red, but shows token blue
- `.is-active` should stand out, but matches neutral

**Fix:**

1. Add exception to surface-normalize.css `:not()` clause
2. OR create specific rule:
   ```css
   .is-active {
     border-color: [semantic-color] !important;
   }
   ```

### Problem: Mobile borders different from desktop

**Check:**

1. Device has different zoom/pixel ratio?
2. Media query changing border? (check `surfaces.css` mobile section)
3. Layout reflow changing shadow/offset? (not border color issue)

**Debug:**

```javascript
window.innerWidth; // Check viewport
getComputedStyle(el).borderColor; // Check actual color
```

---

## Future Enhancements

### Possible Improvements

1. **Dark mode support**

   ```css
   @media (prefers-color-scheme: dark) {
     --doke-card-border: rgba(100, 150, 200, 0.15);
   }
   ```

2. **Interactive state variations**

   ```css
   :hover:not(.is-active) {
     border-color: var(--doke-card-border-hover);
   }
   ```

3. **High contrast mode**

   ```css
   @media (prefers-contrast: more) {
     --doke-card-border: rgba(24, 75, 118, 0.25);
   }
   ```

4. **Component library integration**
   - Export tokens to design tools
   - Auto-generate component variables

---

## Related Documentation

- **Architecture:** [`docs/BORDER-STANDARDIZATION-COMPLETE.md`](./BORDER-STANDARDIZATION-COMPLETE.md)
- **Testing:** [`docs/BORDER-TESTING-GUIDE.md`](./BORDER-TESTING-GUIDE.md)
- **Surface Contract:** [`docs/SURFACE-CONTRACT.md`](./SURFACE-CONTRACT.md)
- **UI Kit:** [`docs/UI-KIT-GUIDE.md`](./UI-KIT-GUIDE.md)

---

**Last Updated:** April 22, 2026
**System Status:** Production Ready ✅
