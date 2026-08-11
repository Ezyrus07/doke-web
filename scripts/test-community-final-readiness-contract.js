const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'comunidade-interna.html', 'mensagens.html', 'notificacoes.html',
  'assets/js/pages/comunidade-interna.js', 'assets/js/pages/mensagens.js', 'assets/js/pages/notificacoes.js',
  'assets/js/features/community-runtime-stability.js', 'assets/js/features/chat-realtime-presence.js',
  'assets/js/features/in-app-notifications.js', 'docs/COMMUNITY-LOGIC-FINAL-READINESS.md'
];
const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) throw new Error('Arquivos obrigatórios ausentes: ' + missing.join(', '));

const report = fs.readFileSync(path.join(root, 'docs/COMMUNITY-LOGIC-FINAL-READINESS.md'), 'utf8');
for (const section of ['## Pronto no frontend local', '## Simulado localmente', '## Dependente de backend/Supabase', '## Bloqueadores encontrados nesta auditoria', '## Critério para considerar a lógica encerrada']) {
  if (!report.includes(section)) throw new Error(`Seção obrigatória ausente: ${section}`);
}

for (const file of ['comunidade-interna.html', 'mensagens.html', 'notificacoes.html']) {
  if (fs.readFileSync(path.join(root, file), 'utf8').includes('community-final-logic-stability.js')) throw new Error(`${file}: módulo aposentado ainda carregado`);
}

for (const file of ['assets/js/pages/mensagens.js', 'assets/js/pages/notificacoes.js']) {
  const source = fs.readFileSync(path.join(root, file), 'utf8');
  if (!source.includes('DokePageHydration?.create')) throw new Error(`${file}: hydration authority ausente`);
  if (!source.includes('doke:auth-session-change')) throw new Error(`${file}: auth/session refresh ausente`);
}

console.log('Community final readiness contract: OK (canonical owners, retired shim absent)');
