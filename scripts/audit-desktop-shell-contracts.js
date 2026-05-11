#!/usr/bin/env node
/*
 * Compatibility entrypoint for package.json.
 * The canonical desktop shell audit is audit-desktop-base-stability.js.
 * This wrapper prevents npm audit scripts from pointing to a missing file
 * without introducing a second desktop-shell contract.
 */
require('./audit-desktop-base-stability.js');
