# Unused asset candidates

Phase 21 removed the current conservative unused CSS candidate set.

## Result

- Removed CSS assets: `43`
- Removed bytes: `225471`

Detailed manifest:

```txt
docs/PHASE21-UNUSED-CSS-REMOVAL-MANIFEST.json
```

## Rule

Unused asset deletion requires all of these checks:

1. no direct HTML reference;
2. no active `@import`;
3. no runtime loader reference;
4. no known dynamic path reference;
5. audit re-run after removal.

Do not delete active CSS/JS just because the filename looks old. Remove only with reference proof.
