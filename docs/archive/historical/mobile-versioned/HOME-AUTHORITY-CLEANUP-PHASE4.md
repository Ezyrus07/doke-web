# Home Authority Cleanup — Phase 4

## Goal

Remove active production filenames with remediation wording where the current change can be proven to be a naming/authority cleanup only. This phase does not change visual CSS declarations, selector order, or shell/router behavior.

## Scope

Renamed two active shared layers by responsibility:

| Previous file | New file | Reason |
|---|---|---|
| `assets/css/patterns/responsive-polish.css` | `assets/css/patterns/responsive-layout-guards.css` | The file is not decorative polish; it is a cross-page responsive guard layer for mobile/tablet containment. |
| `assets/css/components/layout/professional-responsive-polish-contract.css` | `assets/css/components/layout/professional-responsive-layout.css` | The file is not a temporary polish layer; it owns shared professional/marketplace responsive layout containment. |

The internal CSS custom properties in `responsive-layout-guards.css` were renamed from `--responsive-polish-*` to `--responsive-layout-*` so future agents do not continue treating the file as a polish/remediation layer. Values were preserved.

## Authority impact

- `responsive-layout-guards.css`: temporary cross-page responsive containment guard. It remains active and must later be split into page/component authority, but it no longer violates production naming rules.
- `professional-responsive-layout.css`: shared professional/marketplace layout guard. It remains active and must later be reduced or merged into true component/card/pattern files.

## Audit result

`npm run audit:agent-governance` now reports active legacy/remediation CSS reduced from 4 to 2. The remaining active remediation names are intentionally deferred:

- `assets/css/pages/mensagens/desktop-redesign.css`
- `assets/css/pages/pedidos/mobile-longterm-normalization.css`

They should be consolidated in their page-specific phases, not renamed blindly.

## Visual policy

No visual redesign was intended in this phase. This is a file-authority/naming cleanup with preserved CSS content and preserved HTML load positions.
