# Visual Screenshot Package Runbook

## Objective

Validate that real screenshot evidence exists for every visual manifest entry and that the screenshot set has been manually reviewed before private beta entry.

## Commands

```bash
npm run audit:visual-screenshot-package
npm run execute:visual-screenshot-package:dry-run
npm run execute:visual-screenshot-package:check-env
npm run execute:visual-screenshot-package:report
```

## Evidence source

Default screenshot directory:

```txt
test-results/visual-evidence
```

Override with:

```bash
DOKE_VISUAL_EVIDENCE_DIR=path/to/screenshots
```

## Required manual approval

```bash
DOKE_VISUAL_REVIEW_APPROVED=1
DOKE_VISUAL_REVIEWER=Gabriel
```

## GO status

The ready status is:

```txt
visual_screenshot_package_ready_for_private_beta_entry
```

If screenshots or `.layout.json` files are missing, the package must remain blocked.
