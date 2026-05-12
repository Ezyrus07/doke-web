#!/usr/bin/env node
/**
 * Compatibility wrapper for the desktop shell audit.
 *
 * package.json exposes `audit:desktop-shell`, while the canonical shell/base
 * contract lives in `audit-desktop-base-stability.js`. Keeping this wrapper
 * avoids broken npm scripts without introducing a second visual contract.
 */
require('./audit-desktop-base-stability');
