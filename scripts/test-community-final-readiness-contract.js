const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const requiredFiles = [
  'comunidade-interna.html',
  'mensagens.html',
  'notificacoes.html',
  'assets/js/pages/comunidade-interna.js',
  'assets/js/pages/mensagens.js',
  'assets/js/pages/notificacoes.js',
  'assets/js/features/community-final-logic-stability.js',
  'assets/js/features/community-runtime-stability.js',
  'assets/js/features/chat-realtime-presence.js',
  'assets/js/features/in-app-notifications.js',
  'docs/COMMUNITY-LOGIC-FINAL-READINESS.md'
];

const missing = requiredFiles.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('Arquivos obrigatórios ausentes:\n- ' + missing.join('\n- '));
  process.exit(1);
}

const report = fs.readFileSync(path.join(root, 'docs/COMMUNITY-LOGIC-FINAL-READINESS.md'), 'utf8');
const requiredSections = [
  '## Pronto no frontend local',
  '## Simulado localmente',
  '## Dependente de backend/Supabase',
  '## Bloqueadores encontrados nesta auditoria',
  '## Critério para considerar a lógica encerrada'
];

const absentSections = requiredSections.filter((section) => !report.includes(section));
if (absentSections.length) {
  console.error('Seções obrigatórias ausentes no relatório:\n- ' + absentSections.join('\n- '));
  process.exit(1);
}

const htmlTargets = ['comunidade-interna.html', 'mensagens.html', 'notificacoes.html'];
for (const file of htmlTargets) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  if (!html.includes('community-final-logic-stability.js')) {
    console.error(`${file}: módulo final de estabilidade não carregado.`);
    process.exit(1);
  }
}

console.log('Community final readiness contract: OK');
