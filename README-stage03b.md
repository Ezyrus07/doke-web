# Doke — Stage 03B Ad/Service Card Contract

This patch ships the canonical ad/service-card owner plus the page CSS files most affected by local ad/service-card anatomy overrides.

Goal:
- `assets/css/components/cards/ad-card.css` owns ad/service-card anatomy.
- Page CSS should keep only rail/grid/gap/overflow/composition responsibilities.

Included page files are intentionally broader than the final diff because the first cleanup pass removed local page rules before report generation was blocked by filesystem permissions.
