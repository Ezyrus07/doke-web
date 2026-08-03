'use strict';
const fs = require('node:fs');
const file = '.github/tmp/msg-a07-generator.js';
let source = fs.readFileSync(file, 'utf8');
const marker = "let packageJson = JSON.parse(read('package.json'));";
if (!source.includes(marker)) throw new Error('MSG-A07 package marker not found.');
const patch = `let a03Runtime = read('scripts/test-msg-001-a03-server-command-boundary.js');
a03Runtime = replaceRequired(a03Runtime,
\`const source = fs.readFileSync('assets/js/services/message-service.js', 'utf8');\`,
\`const reliabilitySource = fs.readFileSync('assets/js/services/message-command-executor.js', 'utf8');
const source = fs.readFileSync('assets/js/services/message-service.js', 'utf8');\`, 'A03 reliability source');
a03Runtime = replaceRequired(a03Runtime,
\`      if (payload.action === 'sendMessage') return Promise.resolve({ message: Object.assign({ id: 'msg-new' }, payload) });
      if (payload.action === 'createForOrder' || payload.action === 'updateOrder') return Promise.resolve({ conversation });
      return Promise.resolve({ ok: true });\`,
\`      let data;
      if (payload.action === 'sendMessage') data = { message: Object.assign({ id: 'msg-new' }, payload) };
      else if (payload.action === 'createForOrder' || payload.action === 'updateOrder') data = { conversation };
      else data = { ok: true };
      return Promise.resolve({
        data,
        acknowledgement: {
          commandId: payload.commandId,
          action: payload.action,
          status: 'accepted'
        }
      });\`, 'A03 acknowledgement provider');
a03Runtime = replaceRequired(a03Runtime,
\`  vm.runInNewContext(source, { window: root, document, CustomEvent, Promise, Object, Array, String, Boolean, RegExp, JSON, Error, console: root.console }, { filename: 'message-service.js' });\`,
\`  const context = { window: root, document, CustomEvent, Promise, Object, Array, String, Boolean, RegExp, JSON, Error, Map, Set, Date, Math, setTimeout, clearTimeout, console: root.console };
  vm.runInNewContext(reliabilitySource, context, { filename: 'message-command-executor.js' });
  vm.runInNewContext(source, context, { filename: 'message-service.js' });\`, 'A03 canonical script order');
write('scripts/test-msg-001-a03-server-command-boundary.js', a03Runtime);

`;
source = source.replace(marker, patch + marker);
fs.writeFileSync(file, source);
console.log('MSG-A07 A03 harness patch applied.');
