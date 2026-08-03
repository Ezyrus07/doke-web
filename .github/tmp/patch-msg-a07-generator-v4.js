'use strict';
const fs = require('node:fs');
const file = '.github/tmp/msg-a07-generator.js';
let source = fs.readFileSync(file, 'utf8');
const marker = "let packageJson = JSON.parse(read('package.json'));";
if (!source.includes(marker)) throw new Error('MSG-A07 package marker not found.');
const patch = `let stagingMessagingAudit = read('scripts/audit-staging-messaging-runtime.js');
stagingMessagingAudit = replaceRequired(stagingMessagingAudit,
\`[
  'handlers.listConversations = createActionHandler',
  'handlers.getConversation = createActionHandler',
  'handlers.createConversationForOrder = createActionHandler',
  'handlers.updateConversationOrder = createActionHandler',
  'handlers.sendMessage = createActionHandler',
  'handlers.markConversationRead = createActionHandler'
].forEach((snippet) => {
  if (!messagingHandlers.includes(snippet)) failures.push(\\\`messaging route handlers missing \\${snippet}\\\`);
});\`,
\`[
  'handlers.listConversations = createActionHandler',
  'handlers.getConversation = createActionHandler',
  'handlers.createConversationForOrder = createMessagingCommandHandler',
  'handlers.updateConversationOrder = createMessagingCommandHandler',
  'handlers.sendMessage = createMessagingCommandHandler',
  'handlers.removeMessage = createMessagingCommandHandler',
  'handlers.markConversationRead = createMessagingCommandHandler'
].forEach((snippet) => {
  if (!messagingHandlers.includes(snippet)) failures.push(\\\`messaging route handlers missing \\${snippet}\\\`);
});
if (!messagingHandlers.includes('function createMessagingCommandHandler')) failures.push('messaging command handler factory missing');
if (!messagingHandlers.includes('createActionHandler(route')) failures.push('messaging command handler must delegate to createActionHandler');\`, 'staging handler authority');
stagingMessagingAudit = replaceRequired(stagingMessagingAudit,
\`    'messages.send',
    'messages.markRead'\`,
\`    'messages.send',
    'messages.remove',
    'messages.markRead'\`, 'staging expected remove route');
stagingMessagingAudit = replaceRequired(stagingMessagingAudit,
\`  'sendMessage',
  'markConversationRead',\`,
\`  'sendMessage',
  'removeMessage',
  'markConversationRead',\`, 'staging remove service');
write('scripts/audit-staging-messaging-runtime.js', stagingMessagingAudit);

`;
source = source.replace(marker, patch + marker);
fs.writeFileSync(file, source);
console.log('MSG-A07 staging messaging audit patch applied.');
