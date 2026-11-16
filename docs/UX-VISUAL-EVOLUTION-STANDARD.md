# Doke UX Visual Evolution Standard

Status: canonical repository-side guidance for the Visual Evolution phase.

## Purpose

This document constrains visual evolution work so that UI changes are evidence-backed, repeatable, and compatible with Doke's existing CSS authority model. It is not permission to change runtime, product semantics, backend, Supabase, migrations, staging, production, or merge state.

## Evidence sources

The operating principles below are derived from established UX research and design literature, especially:

- Nielsen Norman Group — Visual Hierarchy in UX; Common Region / Gestalt grouping.
- Baymard Institute — Product Page UX; product-page buy-section clarity; image-gallery thumbnail discoverability; ratings distribution summaries.
- Adam Wathan & Steve Schoger — Refactoring UI, especially the chapters `Hierarchy is Everything` and `Layout and Spacing`.

Reference URLs:

- https://www.nngroup.com/articles/visual-hierarchy-ux-definition/
- https://www.nngroup.com/articles/common-region/
- https://baymard.com/research/product-page
- https://baymard.com/learn/ecommerce-ux-audit
- https://baymard.com/blog/truncating-product-gallery-thumbnails
- https://baymard.com/blog/user-ratings-distribution-summary
- https://refactoringui.com/

## Mandatory decision order

Before adding a visual rule:

1. Identify the user's primary task on the surface.
2. Identify the intended attention order: primary, secondary, tertiary.
3. Confirm the current CSS owner from the authority map and cascade.
4. Prefer removal/consolidation of competing ownership over adding another override.
5. Choose values from existing Doke tokens/scales before inventing a page-local value.
6. Validate desktop, tablet, mobile, focus, reduced motion, overflow, and direct-load behavior.

## 1. Visual hierarchy

- Every major surface must have an explicit attention order.
- Use contrast, weight, spacing, and scale together; do not rely on font size alone.
- Keep the number of simultaneously dominant elements low. A page should normally have one dominant task and at most one supporting dominant content element.
- Secondary metadata must be visibly quieter than the primary title/action.
- Do not make every heading, statistic, badge, and action compete at the same visual weight.

## 2. Action hierarchy

For transactional or marketplace decision surfaces:

- One primary action per decision context uses the strongest filled treatment.
- Secondary actions must be lower-contrast (ghost, outline, or text) and must not visually compete with the primary action.
- Price, availability/response expectation, and the primary CTA must be readable as one decision cluster when they belong to the same transaction.
- CTA labels must describe the next step accurately; do not use vague labels that imply a different flow.

## 3. Grouping and common regions

- Use proximity and whitespace first.
- Use a background/container when the relationship between items would otherwise be ambiguous.
- Do not turn every nested fact into a card. Nested cards increase visual complexity and weaken hierarchy.
- Borders are not decorative defaults. Prefer spacing, subtle background contrast, and the canonical surface-shadow system when sufficient.
- A container must communicate a meaningful semantic or task grouping.

## 4. Spacing and sizing system

- Reuse existing Doke spacing, radius, typography, control-height, and shadow tokens whenever available.
- Avoid arbitrary one-off pixel nudges when an existing scale value can express the same intent.
- Related elements use tighter spacing; unrelated groups use clearly larger spacing.
- Do not stretch content merely to fill available width. Preserve readable line length and task-focused composition.
- Mobile layouts should reflow/stack rather than merely shrink desktop geometry.

## 5. Marketplace detail surfaces

The default information sequence for a service-detail page is:

1. Service identity / visual proof.
2. Core decision facts (price, response expectation, availability/guarantee where applicable).
3. Primary action.
4. Provider credibility and platform trust.
5. Scope/details.
6. Reviews and deeper evidence.
7. Related discovery content.

This ordering may change only when the user task on the page materially differs.

## 6. Gallery discoverability

- Users must have an obvious signal when additional media exists.
- If thumbnails are truncated, use an explicit truncation control such as `+N`, visible carousel controls, or another clear signpost.
- Do not hide the existence of additional media behind gesture-only interaction.
- Gallery controls must remain visually identifiable and meet existing Doke control/focus contracts.

## 7. Reviews and reputation

- Show the overall rating together with the number of reviews.
- When a distribution summary exists, it must be visually legible near the top of the reviews section and must not be visually buried beneath individual reviews.
- Verified/recommendation signals are supporting evidence, not substitutes for the quantitative summary.
- Review filters are secondary controls and must not compete with the review score or primary page CTA.

## 8. Responsive hierarchy

- Preserve the same task priority across breakpoints.
- Mobile may reduce density and stack groups, but must not demote price/CTA, critical trust information, or media discoverability.
- Touch controls must remain compatible with existing Doke target-size and focus-visible contracts.
- Avoid horizontal overflow and clipped decision content.

## 9. Elevation and surfaces

- Static information surfaces do not lift on hover.
- Clickable cards may use the canonical interactive surface elevation.
- Nested information blocks remain flat unless they are independently interactive.
- Overlays/modals use the canonical overlay shadow; page surfaces must not imitate modal elevation.

### 9.1 Neutral surface chrome

- Neutral application cards and panels must not use decorative full-width top rails, gradient strips, color caps, or equivalent edge ornament solely to carry brand color.
- Brand color should be expressed through Doke identity, the primary action, meaningful selection/state, purposeful illustration, or data visualization — not repeated frame decoration.
- A rail or line is allowed when it communicates real state such as progress, current location, selection, loading, or status. Semantic lines must remain redundant with text, shape, position, or another non-color cue when needed for comprehension.
- When the same decorative chrome appears across analogous pages, treat it as a design-system consistency issue. Normalize it through a shared authority instead of copying or varying the motif page by page.
- New Visual Evolution work must compare analogous surfaces already present in Doke before introducing new card chrome, so auth, forms, checkout, detail, settings, wallet, community and other product areas continue to feel like one product.

## 10. Accessibility and state safety

- Do not encode meaning using color alone.
- Preserve focus-visible treatment.
- Preserve reduced-motion behavior.
- Loading, empty, error, disabled, selected, and owner/visitor states must remain distinguishable.
- Visual evolution must not change semantics, data-state boundaries, routing, hydration, or business logic unless separately authorized.

## 11. Evidence requirement for future visual PRs

Every Visual Evolution PR should record:

- user task being optimized;
- hierarchy before/after;
- research/design principles used;
- CSS authority owner;
- exact changed paths;
- responsive/a11y checks performed;
- boundaries intentionally not touched;
- rollback path.

## 12. Doke-specific rule

`index.html` remains the marketplace visual ruler unless a later explicitly-authorized design-system checkpoint supersedes it. Page-specific CSS may compose page layout and page-owned hierarchy, but must not silently fork shared component anatomy.
