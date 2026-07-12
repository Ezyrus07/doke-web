const fs = require('fs');
const js = fs.readFileSync('assets/js/pages/mensagens.js', 'utf8');
const css = fs.readFileSync('assets/css/pages/mensagens/advanced-messages.css', 'utf8');
const required = [
  'data-message-context-menu',
  'data-advanced-message-action="reply"',
  'data-advanced-message-action="thread"',
  'data-advanced-message-action="react"',
  'data-advanced-message-action="forward"',
  'data-advanced-message-action="history"',
  'data-messages-advanced-search',
  'threadReplies',
  'editHistory',
  'reactions'
];
const missing = required.filter((token) => !js.includes(token));
if (missing.length) throw new Error(`Missing advanced message tokens: ${missing.join(', ')}`);
if (!css.includes('.messages-message-menu') || !css.includes('.messages-thread-replies')) {
  throw new Error('Advanced message styles are incomplete.');
}
console.log('Messages advanced contract: OK');
