const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'comunidade-interna.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/pages/comunidade-interna.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/pages/comunidade-interna.css'), 'utf8');

const checks = [
  ['events panel', html.includes('data-community-panel="events"')],
  ['events toolbar action', html.includes('data-community-panel-open="events"')],
  ['event form', html.includes('data-community-event-form')],
  ['event creation transaction', js.includes('COMMUNITY_EVENT_CREATED')],
  ['rsvp transaction', js.includes('COMMUNITY_EVENT_RSVP_CHANGED')],
  ['event cancellation transaction', js.includes('COMMUNITY_EVENT_CANCELLED')],
  ['role visibility', js.includes('allowedRoleIds')],
  ['event notifications', js.includes("type: 'community_event'")],
  ['author truncation', css.includes('text-overflow: ellipsis') && css.includes('max-width: 26ch')]
];

const failed = checks.filter(([, ok]) => !ok);
if (failed.length) {
  console.error('Community events contract failed:', failed.map(([name]) => name).join(', '));
  process.exit(1);
}
console.log('Community events contract: OK');
