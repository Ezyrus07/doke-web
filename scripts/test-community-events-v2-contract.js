const fs = require('fs');
const html = fs.readFileSync('comunidade-interna.html', 'utf8');
const js = fs.readFileSync('assets/js/pages/comunidade-interna.js', 'utf8');
const css = fs.readFileSync('assets/css/pages/comunidade-interna.css', 'utf8');
const required = [
  ['monthly calendar', html.includes('data-community-event-calendar') && js.includes('renderCommunityEventCalendar')],
  ['event editing', html.includes('data-community-event-edit-id') && js.includes('startEditingCommunityEvent')],
  ['participants', js.includes('community-event-card__participants')],
  ['recurrence', html.includes('data-community-event-recurrence') && js.includes('createRecurringEventRecords')],
  ['automatic reminders', js.includes('processCommunityEventReminders')],
  ['calendar styles', css.includes('.community-event-calendar__grid')]
];
const failed = required.filter(([, ok]) => !ok);
if (failed.length) { console.error(failed.map(([name]) => name).join(', ')); process.exit(1); }
console.log('Community events v2 contract: OK');
