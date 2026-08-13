const fs = require('fs');

const sourcePath = 'scripts/diag-ux-css-debt-027-candidate-r2.js';
const runtimePath = '/tmp/diag-ux-css-debt-027-candidate-r2-runtime.js';
let source = fs.readFileSync(sourcePath, 'utf8');
const exactHeadGuard = "assert(cp.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()===TARGET_SHA,'parent SHA drift');";
const ancestryGuard = "assert(cp.execFileSync('git',['merge-base','HEAD',TARGET_SHA],{encoding:'utf8'}).trim()===TARGET_SHA,'parent ancestry drift');";
const ambientPlaywright = "const { chromium } = require('playwright');";
const checkoutPlaywright = "const { chromium } = require(process.cwd() + '/node_modules/playwright');";
const oldWalker = `        const seen=new Set();
        function walk(sheet) {
          if(!sheet || seen.has(sheet)) return; seen.add(sheet);
          let rules; try { rules=sheet.cssRules; } catch { return; }
          const href=sheet.href || '';
          for(const rule of rules || []) {
            if(rule.styleSheet) { walk(rule.styleSheet); continue; }
            if(rule.cssRules) { try { for(const nested of rule.cssRules) inspect(nested, href); } catch {} continue; }
            inspect(rule, href);
          }
        }
        function inspect(rule, href) {
          if(rule.cssRules) { for(const nested of rule.cssRules) inspect(nested, href); return; }
          if(!rule.selectorText) return;
          const owner=rule.parentStyleSheet?.href || href || '';
          if(owner.includes('/assets/css/pages/pagamento-profissional.css') && rule.selectorText==='.payment-finish-check') {
            pageRules++;
            for(const p of props) { const v=rule.style.getPropertyValue(p).trim(); if(v) pageVals[p].push({value:v,priority:rule.style.getPropertyPriority(p)}); }
          }
          if(owner.includes('/assets/css/components/overlays/modal-visual-contract.css') && rule.selectorText.includes('.doke-modal-check')) sharedRules++;
        }
        for(const sheet of document.styleSheets) walk(sheet);`;
const certifiedWalker = `        const walk=sheet=>{let rules;try{rules=sheet.cssRules}catch{return}for(const rule of rules||[]){if(rule.type===CSSRule.IMPORT_RULE&&rule.styleSheet){walk(rule.styleSheet);continue}if(rule.type!==CSSRule.STYLE_RULE)continue;const href=rule.parentStyleSheet?.href||sheet.href||'';if(href.includes('/assets/css/pages/pagamento-profissional.css')&&rule.selectorText==='.payment-finish-check'){pageRules++;for(const p of props){const v=rule.style.getPropertyValue(p).trim();if(v)pageVals[p].push({value:v,priority:rule.style.getPropertyPriority(p)})}}if(href.includes('/assets/css/components/overlays/modal-visual-contract.css')&&rule.selectorText?.includes('.doke-modal-check'))sharedRules++}};
        for(const sheet of document.styleSheets)walk(sheet);`;
if (!source.includes(exactHeadGuard)) throw new Error('R2 harness guard drift');
if (!source.includes(ambientPlaywright)) throw new Error('R2 playwright resolution drift');
if (!source.includes(oldWalker)) throw new Error('R2 CSSOM walker drift');
source = source
  .replace(exactHeadGuard, ancestryGuard)
  .replace(ambientPlaywright, checkoutPlaywright)
  .replace(oldWalker, certifiedWalker);
fs.writeFileSync(runtimePath, source, 'utf8');
require(runtimePath);
