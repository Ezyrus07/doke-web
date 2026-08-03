'use strict';
const fs = require('node:fs');
const file = '.github/tmp/msg-a07-generator.js';
let source = fs.readFileSync(file, 'utf8');
const line = "if (!msg.blockers.some((item) => item.id === 'MSG-B05')) msg.blockers.push({ id: 'MSG-B05', severity: 'high', category: 'command_delivery', description: 'Command reliability is repository-ready but operational closure requires deployment and authenticated lost-response/replay canaries.', targetPhase: 'Fase 7' });\n";
if (!source.includes(line)) throw new Error('MSG-B05 generator line not found.');
source = source.replace(line, '');
fs.writeFileSync(file, source);
console.log('MSG-A07 blocker taxonomy patch applied.');
