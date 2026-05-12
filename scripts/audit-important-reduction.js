const fs = require('fs');
const path = require('path');

const root = process.cwd();
const rel = 'assets/css/components/cards/service-card.css';
const file = path.join(root, rel);
const css = fs.readFileSync(file, 'utf8');
const importantCount = (css.match(/!important/g) || []).length;
const failures = [];

const bodyBlock = css.match(/\.service-card__body\s*\{[\s\S]*?\n\}/);
if (!bodyBlock) {
  failures.push('Missing .service-card__body base block.');
} else {
  const bodyCss = bodyBlock[0];
  for (const prop of ['display', 'grid-template-columns', 'grid-template-areas']) {
    const re = new RegExp(`${prop}:[^;{}]+!important`, 'm');
    if (re.test(bodyCss)) {
      failures.push(`Base .service-card__body still uses !important for ${prop}.`);
    }
  }
}

const compactTagsBlock = css.match(/:is\(\.service-card, \.service-card--feed, \.service-card--result\) \.service-card__tags\s*\{[\s\S]*?\n\}/);
if (!compactTagsBlock) {
  failures.push('Missing compact .service-card__tags block.');
} else if (/!important/.test(compactTagsBlock[0])) {
  failures.push('Compact .service-card__tags block should not use !important.');
}

const compactTagPillBlock = css.match(/:is\(\.service-card, \.service-card--feed, \.service-card--result\) \.service-card__tags > span\s*\{[\s\S]*?\n\}/);
if (!compactTagPillBlock) {
  failures.push('Missing compact .service-card__tags > span block.');
} else {
  const blockCss = compactTagPillBlock[0];
  for (const prop of ['min-height', 'padding', 'border-radius', 'font-size', 'line-height']) {
    const re = new RegExp(`${prop}:[^;{}]+!important`, 'm');
    if (re.test(blockCss)) {
      failures.push(`Compact .service-card__tags > span still uses !important for ${prop}.`);
    }
  }
}

const compactHiddenTagBlock = css.match(/:is\(\.service-card, \.service-card--feed, \.service-card--result\) \.service-card__tags > span:nth-child\(n \+ 3\)\s*\{[\s\S]*?\n\}/);
if (!compactHiddenTagBlock) {
  failures.push('Missing compact hidden tag block.');
} else if (/display:[^;{}]+!important/.test(compactHiddenTagBlock[0])) {
  failures.push('Compact hidden tag block should not use !important for display.');
}

if (importantCount > 47) {
  failures.push(`Expected ${rel} to have at most 47 !important occurrences after this controlled reduction; found ${importantCount}.`);
}

const report = {
  cycle: 'global-cycle-19-important-reduction-tags',
  file: rel,
  remainingImportantCount: importantCount,
  removedImportantCountThisCycle: 7,
  totalRemovedImportantCountAcrossCycles18And19: 10,
  checkedAt: new Date().toISOString(),
  failures,
};

const outDir = path.join(root, 'docs', 'validation');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'global-cycle-19-important-reduction-report.json'), JSON.stringify(report, null, 2));

if (failures.length) {
  console.error('Important reduction audit failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}
console.log('Important reduction audit passed.');
console.log(`Remaining !important in ${rel}: ${importantCount}`);
