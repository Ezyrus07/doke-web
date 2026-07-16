# Semantic State Contract

Semantic feedback uses shared color tokens. Components still own geometry, spacing and layout.

## Tokens

- `--doke-state-info-*`: informational and pending states.
- `--doke-state-success-*`: completion, accepted and uploaded states.
- `--doke-state-warning-*`: attention states that are not failures.
- `--doke-state-danger-*`: errors, destructive actions and expired failures.

Muted and emphasis variants exist only to preserve contrast on different parent surfaces. They must not be used to create decorative card layers.

## Rules

1. A visible border is allowed when it communicates a semantic state.
2. Informational content inside an existing surface should prefer background and text color, not elevation.
3. Success, warning and danger colors must come from tokens, not local literals.
4. Focus rings remain interaction tokens and must not be replaced by semantic borders.
5. Upload-complete states may use a success border and ring because completion is stateful.
6. Component-specific geometry remains in the component/page owner.

## Audit

Run:

```bash
npm run audit:semantic-state-contract
```

The audit verifies the token family and blocks the literals migrated in this lot from returning to the selected active owners.
