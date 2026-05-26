#!/usr/bin/env node
/*
 * Doke cleanup candidates audit
 * Read-only audit: does not delete or move files.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const root = process.cwd();
const reportDir = path.join(root, 'docs', 'validation');
const reportMd = path.join(reportDir, 'cleanup-candidates-report.md');
const reportJson = path.join(reportDir, 'cleanup-candidates-report.json');
const reportCsv = path.join(reportDir, 'cleanup-candidates-report.csv');
const allowlistPath = path.join(root, 'scripts', 'cleanup-candidates-allowlist.json');

const IGNORE_DIRS = new Set(['.git', 'node_modules', '.next', 'dist', 'build', '.cache']);
const TEXT_EXTS = new Set(['.html', '.css', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.ts', '.tsx', '.jsx', '.txt']);
const REF_SCAN_EXTS = new Set(['.html', '.css', '.js', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.ts', '.tsx', '.jsx']);
const CANDIDATE_EXTS = new Set(['.md', '.json', '.csv', '.png', '.jpg', '.jpeg', '.webp', '.zip', '.log', '.tmp', '.bak', '.old', '.map', '']);
const AUDIT_NAME_RE = /(audit|report|baseline|snapshot|validation|coverage|result|inventory|conflict|deviation|before|after|measure|cleanup|candidate)/i;
const TEMP_NAME_RE = /(^|[\/])(tmp|temp|sed[a-z0-9]+|.*~|.*\.bak|.*\.old|.*\.tmp|desktop\.ini|thumbs\.db)$/i;
const GENERATED_RE = /(audit|report|baseline|snapshot|before-after|before|after|deviation|measurement|measure|inventory|coverage|playwright|visual-baseline)/i;
const SPECIAL_ATTENTION = new Set([
  'component_audit_data.json',
  'sedD9I9BO'
]);
const SPECIAL_PREFIXES = [
  'docs/validation/',
  'docs/reports/',
  'docs/visual-baseline/',
  'archive/css-legacy/'
];

function rel(p) { return path.relative(root, p).split(path.sep).join('/'); }
function posixJoin(...parts) { return parts.join('/').replace(/\/+/g, '/'); }
function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
function readJsonSafe(p, fallback) { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return fallback; } }
function bytesHuman(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB','MB','GB'];
  let n = bytes / 1024;
  for (let i = 0; i < units.length; i++) {
    if (n < 1024 || i === units.length - 1) return `${n.toFixed(n >= 10 ? 1 : 2)} ${units[i]}`;
    n /= 1024;
  }
}
function csvEscape(v) {
  const s = String(v ?? '');
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function hashFile(file) {
  const h = crypto.createHash('sha1');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}
function gitSet(cmd) {
  try {
    const output = execSync(cmd, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    return new Set(output.split(/\r?\n/).filter(Boolean).map(s => s.split(path.sep).join('/')));
  } catch {
    return new Set();
  }
}
function globToRe(pattern) {
  const esc = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '::DOUBLE_STAR::').replace(/\*/g, '[^/]*').replace(/::DOUBLE_STAR::/g, '.*');
  return new RegExp(`^${esc}$`);
}
function isAllowlisted(relPath, allowlist) {
  if (allowlist.files && allowlist.files[relPath]) return allowlist.files[relPath];
  for (const item of allowlist.patterns || []) {
    const re = globToRe(item.pattern);
    if (re.test(relPath)) return item.reason;
  }
  return null;
}
function isCandidatePath(r, stat) {
  const ext = path.extname(r).toLowerCase();
  if (SPECIAL_ATTENTION.has(r)) return true;
  if (SPECIAL_PREFIXES.some(prefix => r.startsWith(prefix))) return true;
  if (r === 'component_audit_data.json' || r === 'sedD9I9BO') return true;
  if (r.startsWith('reports/')) return true;
  if (r.startsWith('archive/')) return true;
  if (TEMP_NAME_RE.test(r)) return true;
  if (AUDIT_NAME_RE.test(path.basename(r))) return true;
  if (stat.size >= 1024 * 1024 && !r.startsWith('assets/')) return true;
  if (CANDIDATE_EXTS.has(ext) && (r.startsWith('docs/') || r.startsWith('reports/'))) return true;
  return false;
}
function recommendationFor({ r, stat, referenced, usedByScript, versioned, allowReason, duplicateGroupSize, regenerable }) {
  if (allowReason) return ['manter', 'baixo', `Allowlist: ${allowReason}`];
  if (r === 'sedD9I9BO') return ['remover', 'baixo', 'Arquivo temporário gerado por sed; só aparece em documentação/auditoria histórica, não como dependência runtime.'];
  if (r === 'component_audit_data.json') return ['remover', 'baixo', 'JSON grande e stale de auditoria na raiz; scripts existentes já o tratam como artefato a eliminar, não como fonte ativa.'];
  if (r.startsWith('archive/')) {
    return referenced || usedByScript
      ? ['revisar manualmente', 'médio', 'Está em archive, mas ainda aparece referenciado por código/script.']
      : ['manter', 'baixo', 'Já está arquivado; não afeta funcionamento, mas pode entrar em política de retenção futura.'];
  }
  if (r.startsWith('docs/visual-baseline/')) {
    return usedByScript ? ['manter', 'médio', 'Snapshot/baseline visual pode ser usado por testes; revisar antes de mover.'] : ['mover para archive', 'baixo', 'Baseline/snapshot visual antigo não referenciado por scripts detectados.'];
  }
  if (r.startsWith('docs/reports/') || r.startsWith('docs/validation/')) {
    if (usedByScript) return ['manter', 'médio', 'Relatório dentro de docs é consumido por script/teste.'];
    return regenerable ? ['remover', 'baixo', 'Relatório de auditoria parece regenerável e não é usado por scripts.'] : ['mover para archive', 'baixo', 'Documento de validação antigo sem uso detectado.'];
  }
  if (r.startsWith('reports/')) {
    if (usedByScript) return ['manter', 'médio', 'Artefato em reports ainda é usado por script/teste.'];
    return regenerable ? ['remover', 'baixo', 'Artefato gerado por auditoria em reports e não usado por teste.'] : ['mover para archive', 'baixo', 'Relatório não ativo; mover para docs/archive ou reports/archive.'];
  }
  if (duplicateGroupSize > 1 && !referenced && !usedByScript) return ['revisar manualmente', 'médio', 'Arquivo duplicado por hash; confirmar qual cópia é fonte canônica.'];
  if (TEMP_NAME_RE.test(r)) return ['remover', 'baixo', 'Nome indica temporário e não há uso detectado.'];
  if (stat.size >= 1024 * 1024 && !referenced && !usedByScript) return ['mover para archive', 'médio', 'Arquivo grande fora de assets sem referência detectada.'];
  if (!versioned && !referenced && !usedByScript && regenerable) return ['remover', 'baixo', 'Arquivo não versionado e regenerável.'];
  if (!referenced && !usedByScript && (r.startsWith('docs/') || r.endsWith('.md'))) return ['revisar manualmente', 'médio', 'Documento sem referência direta; pode ser histórico ou governança.'];
  return ['manter', 'baixo', 'Sem indício forte de remoção segura.'];
}

function main() {
  ensureDir(reportDir);
  const allowlist = readJsonSafe(allowlistPath, { files: {}, patterns: [] });
  const versioned = gitSet('git ls-files');
  const untracked = gitSet('git ls-files --others --exclude-standard');
  const files = walk(root);
  const rels = files.map(rel);

  const refFiles = files.filter(f => REF_SCAN_EXTS.has(path.extname(f).toLowerCase()) && fs.statSync(f).size <= 1024 * 1024);
  const refContent = [];
  for (const f of refFiles) {
    let text = '';
    try { text = fs.readFileSync(f, 'utf8'); } catch {}
    refContent.push({ rel: rel(f), text });
  }

  const hashes = new Map();
  for (const f of files) {
    const r = rel(f);
    const stat = fs.statSync(f);
    if (stat.size === 0 || stat.size > 25 * 1024 * 1024) continue;
    try {
      const h = hashFile(f);
      if (!hashes.has(h)) hashes.set(h, []);
      hashes.get(h).push(r);
    } catch {}
  }
  const duplicateByRel = new Map();
  for (const group of hashes.values()) {
    if (group.length > 1) group.forEach(r => duplicateByRel.set(r, group));
  }

  function referencesFor(r) {
    const base = path.basename(r);
    const refs = [];
    for (const item of refContent) {
      if (item.rel === r) continue;
      if (item.text.includes(r) || item.text.includes(`./${r}`) || item.text.includes(base)) refs.push(item.rel);
      if (refs.length >= 12) break;
    }
    return refs;
  }
  function scriptRefsFor(r, refs) {
    return refs.filter(x => (x.startsWith('scripts/') || x.startsWith('tests/') || x === 'package.json' || x.startsWith('.github/')) && x !== 'scripts/audit-cleanup-candidates.js');
  }

  const candidates = [];
  for (const f of files) {
    const r = rel(f);
    const stat = fs.statSync(f);
    if (!isCandidatePath(r, stat)) continue;
    const allowReason = isAllowlisted(r, allowlist);
    const refs = referencesFor(r);
    const scriptRefs = scriptRefsFor(r, refs);
    const regenerable = GENERATED_RE.test(r) || GENERATED_RE.test(path.basename(r));
    const duplicateGroup = duplicateByRel.get(r) || [];
    const [recommendation, risk, justification] = recommendationFor({
      r,
      stat,
      referenced: refs.length > 0,
      usedByScript: scriptRefs.length > 0,
      versioned: versioned.has(r),
      allowReason,
      duplicateGroupSize: duplicateGroup.length,
      regenerable
    });
    candidates.push({
      path: r,
      sizeBytes: stat.size,
      size: bytesHuman(stat.size),
      modified: stat.mtime.toISOString().slice(0, 19).replace('T', ' '),
      versioned: versioned.has(r),
      untracked: untracked.has(r),
      referencedByHtmlCssJs: refs.some(x => /\.(html|css|js|mjs|cjs|ts|tsx|jsx)$/i.test(x) && !x.startsWith('scripts/') && !x.startsWith('tests/') && !x.startsWith('docs/') && x !== 'package.json'),
      references: refs,
      usedByScriptOrTest: scriptRefs.length > 0,
      scriptReferences: scriptRefs,
      seemsRegenerable: regenerable,
      duplicateGroup,
      recommendation,
      risk,
      justification
    });
  }
  candidates.sort((a, b) => {
    const recOrder = { 'remover': 0, 'mover para archive': 1, 'revisar manualmente': 2, 'manter': 3 };
    return (recOrder[a.recommendation] ?? 9) - (recOrder[b.recommendation] ?? 9) || b.sizeBytes - a.sizeBytes || a.path.localeCompare(b.path);
  });

  const totalBytes = candidates.reduce((s, c) => s + c.sizeBytes, 0);
  const removableBytes = candidates.filter(c => c.recommendation === 'remover').reduce((s, c) => s + c.sizeBytes, 0);
  const archivableBytes = candidates.filter(c => c.recommendation === 'mover para archive').reduce((s, c) => s + c.sizeBytes, 0);
  const reviewBytes = candidates.filter(c => c.recommendation === 'revisar manualmente').reduce((s, c) => s + c.sizeBytes, 0);

  const byRecommendation = candidates.reduce((acc, c) => { acc[c.recommendation] = (acc[c.recommendation] || 0) + 1; return acc; }, {});
  const byRisk = candidates.reduce((acc, c) => { acc[c.risk] = (acc[c.risk] || 0) + 1; return acc; }, {});
  const duplicateGroups = [...hashes.values()].filter(g => g.length > 1).sort((a,b) => b.length - a.length).slice(0, 20);

  const csvHeaders = ['caminho do arquivo','tamanho','última modificação','está versionado no git?','não versionado?','é referenciado por HTML/CSS/JS?','é usado por algum script/teste?','parece regenerável?','recomendação','risco','justificativa','referências detectadas','duplicados por hash'];
  const csvRows = [csvHeaders.join(',')].concat(candidates.map(c => [
    c.path, c.size, c.modified, c.versioned ? 'sim' : 'não', c.untracked ? 'sim' : 'não', c.referencedByHtmlCssJs ? 'sim' : 'não', c.usedByScriptOrTest ? 'sim' : 'não', c.seemsRegenerable ? 'sim' : 'não', c.recommendation, c.risk, c.justification, c.references.join(' | '), c.duplicateGroup.filter(x => x !== c.path).join(' | ')
  ].map(csvEscape).join(',')));
  fs.writeFileSync(reportCsv, csvRows.join('\n'));

  const top = candidates.slice(0, 80);
  const md = [];
  md.push('# Auditoria de limpeza do repositório Doke');
  md.push('');
  md.push('Auditoria somente leitura. Nenhum arquivo foi removido ou movido.');
  md.push('');
  md.push(`Gerado em: ${new Date().toISOString()}`);
  md.push('');
  md.push('## Resumo executivo');
  md.push('');
  md.push('| Métrica | Valor |');
  md.push('|---|---:|');
  md.push(`| Arquivos candidatos analisados | ${candidates.length} |`);
  md.push(`| Tamanho total dos candidatos | ${bytesHuman(totalBytes)} |`);
  md.push(`| Remoção potencial baixa fricção | ${bytesHuman(removableBytes)} |`);
  md.push(`| Movimentação potencial para archive | ${bytesHuman(archivableBytes)} |`);
  md.push(`| Revisão manual potencial | ${bytesHuman(reviewBytes)} |`);
  md.push(`| Grupos de duplicados por hash | ${[...hashes.values()].filter(g => g.length > 1).length} |`);
  md.push('');
  md.push('## Distribuição por recomendação');
  md.push('');
  md.push('| Recomendação | Arquivos |');
  md.push('|---|---:|');
  for (const key of ['remover','mover para archive','revisar manualmente','manter']) md.push(`| ${key} | ${byRecommendation[key] || 0} |`);
  md.push('');
  md.push('## Distribuição por risco');
  md.push('');
  md.push('| Risco | Arquivos |');
  md.push('|---|---:|');
  for (const key of ['baixo','médio','alto']) md.push(`| ${key} | ${byRisk[key] || 0} |`);
  md.push('');
  md.push('## Candidatos prioritários');
  md.push('');
  md.push('A tabela abaixo mostra os 80 candidatos mais relevantes. A lista completa está em `docs/validation/cleanup-candidates-report.csv` e `docs/validation/cleanup-candidates-report.json`.');
  md.push('');
  md.push('| Caminho | Tamanho | Modificado | Git | Ref. HTML/CSS/JS | Script/teste | Regenerável | Recomendação | Risco | Justificativa |');
  md.push('|---|---:|---|---|---|---|---|---|---|---|');
  for (const c of top) {
    md.push(`| ${c.path} | ${c.size} | ${c.modified} | ${c.versioned ? 'sim' : 'não'} | ${c.referencedByHtmlCssJs ? 'sim' : 'não'} | ${c.usedByScriptOrTest ? 'sim' : 'não'} | ${c.seemsRegenerable ? 'sim' : 'não'} | ${c.recommendation} | ${c.risk} | ${c.justification.replace(/\|/g, '/')} |`);
  }
  md.push('');
  md.push('## Atenção especial solicitada');
  md.push('');
  for (const target of ['component_audit_data.json','sedD9I9BO']) {
    const c = candidates.find(x => x.path === target);
    if (c) md.push(`- \`${target}\`: ${c.recommendation} / risco ${c.risk}. ${c.justification} Tamanho: ${c.size}. Versionado: ${c.versioned ? 'sim' : 'não'}.`);
    else md.push(`- \`${target}\`: não encontrado ou não classificado como candidato.`);
  }
  for (const prefix of SPECIAL_PREFIXES) {
    const group = candidates.filter(c => c.path.startsWith(prefix));
    const bytes = group.reduce((s,c)=>s+c.sizeBytes,0);
    md.push(`- \`${prefix}*\`: ${group.length} candidatos, ${bytesHuman(bytes)}.`);
  }
  md.push('');
  md.push('## Duplicados por hash');
  md.push('');
  if (!duplicateGroups.length) md.push('Nenhum grupo de duplicados por hash foi detectado fora dos diretórios ignorados.');
  else {
    md.push('| Grupo | Arquivos |');
    md.push('|---:|---|');
    duplicateGroups.forEach((g, i) => md.push(`| ${i+1} | ${g.map(x => `\`${x}\``).join('<br>')} |`));
  }
  md.push('');
  md.push('## Política de limpeza proposta');
  md.push('');
  md.push('### O que fica na raiz');
  md.push('');
  md.push('- `package.json`, arquivos de configuração, HTMLs de entrada, diretórios `assets/`, `auth/`, `backend/`, `src/`, `scripts/`, `tests/`, `supabase/`, `.github/` e documentação ativa mínima.');
  md.push('- Nenhum relatório gerado, snapshot ou JSON de auditoria deve ficar solto na raiz.');
  md.push('');
  md.push('### O que vai para `docs/archive`');
  md.push('');
  md.push('- Documentos históricos de validação que não são contratos ativos.');
  md.push('- Relatórios antigos de ciclos já encerrados, quando ainda forem úteis para rastreabilidade.');
  md.push('- Baselines visuais antigos que não são consumidos por teste automatizado.');
  md.push('');
  md.push('### O que pode ser removido após aprovação');
  md.push('');
  md.push('- Arquivos temporários sem extensão/nome estranho, como `sedD9I9BO`.');
  md.push('- JSON/CSV/MD regeneráveis por script e não referenciados por testes.');
  md.push('- Relatórios em `reports/` e `docs/validation/` que são saída de auditorias e não fonte canônica.');
  md.push('');
  md.push('### O que deve ser mantido por testes');
  md.push('');
  md.push('- Snapshots e baselines usados por `tests/`, `scripts/` ou `package.json`.');
  md.push('- `reports/responsive-index-baseline.json` enquanto os contratos responsivos dependem dele.');
  md.push('- Arquivos em allowlist documentada.');
  md.push('');
  md.push('### MB potencialmente liberados');
  md.push('');
  md.push(`- Remoção direta recomendada: **${bytesHuman(removableBytes)}**.`);
  md.push(`- Movimentação para archive: **${bytesHuman(archivableBytes)}**.`);
  md.push(`- Revisão manual antes de qualquer ação: **${bytesHuman(reviewBytes)}**.`);
  md.push('');
  md.push('## Observações de segurança');
  md.push('');
  md.push('- Esta auditoria não apaga arquivos.');
  md.push('- A detecção de referência é textual; arquivos usados dinamicamente podem não ser capturados.');
  md.push('- Qualquer arquivo com risco médio deve passar por revisão manual antes de remoção.');
  md.push('- Para limpar de verdade, crie um PR separado com commits pequenos: `archive`, depois `remove`, depois `test`.');
  fs.writeFileSync(reportMd, md.join('\n'));

  fs.writeFileSync(reportJson, JSON.stringify({
    generatedAt: new Date().toISOString(),
    summary: {
      candidates: candidates.length,
      totalBytes,
      removableBytes,
      archivableBytes,
      reviewBytes,
      byRecommendation,
      byRisk,
      duplicateGroups: [...hashes.values()].filter(g => g.length > 1).length
    },
    candidates,
    duplicateGroups
  }, null, 2));

  console.log(`Cleanup candidates audit complete.`);
  console.log(`Candidates: ${candidates.length}`);
  console.log(`Removable: ${bytesHuman(removableBytes)}`);
  console.log(`Archivable: ${bytesHuman(archivableBytes)}`);
  console.log(`Report: ${rel(reportMd)}`);
}

main();
