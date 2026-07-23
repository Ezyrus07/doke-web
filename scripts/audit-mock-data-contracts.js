const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'assets/data');

const contracts = [
  { file: 'mock-users.json', type: 'array', required: ['id', 'type', 'name'], allowEmpty: true },
  { file: 'mock-services.json', type: 'array', required: ['id', 'professionalId', 'title', 'category', 'priceMode'], allowEmpty: true },
  { file: 'mock-orders.json', type: 'array', required: ['id', 'clientId', 'professionalId', 'status', 'createdAt'] },
  { file: 'mock-messages.json', type: 'array', required: ['conversationId', 'participants', 'messages'] },
  { file: 'mock-communities.json', type: 'array', required: ['id', 'name', 'membersCount', 'visibility'] },
  { file: 'mock-notifications.json', type: 'array', required: ['id', 'type', 'title', 'createdAt', 'read'] },
  { file: 'mock-wallet.json', type: 'object', required: ['userId', 'currency', 'availableBalance', 'transactions'] },
];

const issues = [];

for (const contract of contracts) {
  const full = path.join(DATA, contract.file);
  if (!fs.existsSync(full)) {
    issues.push(`${contract.file}: não encontrado`);
    continue;
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(full, 'utf8'));
  } catch (error) {
    issues.push(`${contract.file}: JSON inválido (${error.message})`);
    continue;
  }

  if (contract.type === 'array') {
    if (!Array.isArray(parsed)) {
      issues.push(`${contract.file}: deveria ser array`);
      continue;
    }
    if (parsed.length === 0 && !contract.allowEmpty) issues.push(`${contract.file}: array vazio`);
    parsed.forEach((item, index) => {
      for (const key of contract.required) {
        if (!(key in item)) issues.push(`${contract.file}[${index}]: campo obrigatório ausente '${key}'`);
      }
    });
  } else {
    if (Array.isArray(parsed) || typeof parsed !== 'object' || parsed === null) {
      issues.push(`${contract.file}: deveria ser object`);
      continue;
    }
    for (const key of contract.required) {
      if (!(key in parsed)) issues.push(`${contract.file}: campo obrigatório ausente '${key}'`);
    }
  }
}

if (issues.length) {
  console.error('Mock data audit failed:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exit(1);
}

console.log(`Mock data audit passed. Files checked: ${contracts.length}`);
