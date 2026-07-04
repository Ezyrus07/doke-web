# Private Beta Real Entry Repeat Runbook

## Objective

Repeat the private beta real-entry decision after workstation browser evidence, visual screenshot approval, Lighthouse/a11y and staging seed environment evidence are available.

## Commands

```bash
npm run audit:private-beta-real-entry-repeat
npm run execute:private-beta-real-entry-repeat:dry-run
npm run execute:private-beta-real-entry-repeat:check-env
npm run execute:private-beta-real-entry-repeat:report
```

Full execution requires:

```bash
DOKE_PRIVATE_BETA_REAL_ENTRY_REPEAT_FULL=1
DOKE_PRIVATE_BETA_REAL_ENTRY_CONFIRM=enter-private-beta
```

## Required accepted statuses

```txt
visual_screenshot_package_ready_for_private_beta_entry
lighthouse_a11y_workstation_ready_for_private_beta_entry
staging_real_env_application_completed
private_beta_real_entry_gate_go
```

## Current expected result without real evidence

```txt
private_beta_real_entry_repeat_no_go
```

This is the correct result until all real evidence and manual confirmation exist.
