'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'detalhe-anuncio.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'assets/js/pages/detalhe-anuncio.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets/css/pages/detalhe-anuncio.css'), 'utf8');
const failures = [];
const expect = (condition, message) => { if (!condition) failures.push(message); };

const ownerBlock = html.match(/<div class="ad-action-card__owner-dashboard"[\s\S]*?<\/div>\s*<\/section>/)?.[0] || '';
expect(/data-detail-owner-dashboard hidden/.test(html), 'Owner dashboard must exist and stay hidden before ownership is resolved.');
expect((html.match(/data-detail-visitor-only/g) || []).length >= 5, 'Visitor price, metadata and trust content must have explicit visitor-only boundaries.');
expect(/data-detail-owner-status-label/.test(ownerBlock), 'Owner dashboard must expose listing status.');
expect(/data-detail-owner-sync/.test(ownerBlock), 'Owner dashboard must expose synchronization state.');
expect(/data-detail-owner-price/.test(ownerBlock), 'Owner dashboard must expose configured price.');
expect(/data-detail-owner-views/.test(ownerBlock), 'Owner dashboard must expose views.');
expect(/data-detail-owner-contacts/.test(ownerBlock), 'Owner dashboard must expose contacts.');
expect(/data-detail-owner-reviews/.test(ownerBlock), 'Owner dashboard must expose reviews.');
expect(/data-detail-owner-updated/.test(ownerBlock), 'Owner dashboard must expose the last update.');
expect(/data-detail-owner-status-toggle/.test(ownerBlock), 'Owner dashboard must expose a reversible status action.');
expect(!/Solicitar orçamento|Conversar/.test(ownerBlock), 'Owner dashboard must not contain customer conversion actions.');
expect(/visitorOnly\.forEach\(\(node\) => \{ node\.hidden = owner; \}\)/.test(js), 'Ownership resolver must hide every visitor-only block.');
expect(/ownerDashboard\.hidden = !owner/.test(js), 'Ownership resolver must reveal the owner dashboard only for the owner.');
expect(/api\?\.reactivateOwned/.test(js) && /api\?\.deactivateOwned/.test(js), 'Status toggle must use the canonical owned-service transitions.');
expect(/doke:service-updated/.test(js), 'Status changes must invalidate shared service surfaces.');
expect(/\.ad-action-card__owner-dashboard/.test(css), 'Owner dashboard must have page-owned layout rules.');
expect(/\.ad-action-card__owner-metrics/.test(css), 'Owner metrics must have a responsive grid contract.');
expect(/\[data-detail-visitor-only\]\[hidden\]/.test(css), 'Visitor-only hidden state must be protected by CSS.');

const listeners = {};
const documentStub = {
  readyState: 'loading',
  addEventListener(name, handler) { listeners[name] = handler; },
  querySelector() { return null; },
  title: ''
};
const windowStub = {
  Doke: { session: { getCurrentUser: () => null } },
  DokeAuth: {},
  addEventListener() {},
  dispatchEvent() {}
};
windowStub.window = windowStub;
windowStub.document = documentStub;
const context = vm.createContext({
  window: windowStub,
  document: documentStub,
  console,
  URLSearchParams,
  CustomEvent: function CustomEvent() {}
});
vm.runInContext(js, context);
const api = windowStub.DokeDetailAdOwnership;
expect(api?.getOwnerStatusPresentation('active')?.label === 'Publicado', 'Active listing must be presented as Publicado.');
expect(api?.getOwnerStatusPresentation('active')?.nextStatus === 'inactive', 'Published listing must allow deactivation.');
expect(api?.getOwnerStatusPresentation('inactive')?.label === 'Inativo', 'Inactive listing must be presented as Inativo.');
expect(api?.getOwnerStatusPresentation('inactive')?.nextStatus === 'active', 'Inactive listing must allow reactivation.');
expect(api?.getOwnerStatusPresentation('archived')?.nextStatus === '', 'Archived listing must not expose an invalid direct transition.');
expect(api?.getOwnerSyncPresentation({ syncStatus: 'pending' })?.label === 'Salvo neste dispositivo', 'Pending remote sync must preserve the local-save state without showing a destructive failure.');
expect(api?.getOwnerSyncPresentation({ syncStatus: 'synced' })?.label === 'Sincronizado', 'Synced listing must expose its remote state.');
expect(api?.getOwnerSyncPresentation({ syncError: 'network' })?.label === 'Salvo neste dispositivo', 'A recoverable remote error must not be presented as data loss.');
expect(api?.getOwnerSyncPresentation({})?.label === 'Salvo neste dispositivo', 'Local-only listing must not claim remote synchronization.');

if (failures.length) {
  console.error('[detail-ad-owner-dashboard-contract] FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}

console.log('[detail-ad-owner-dashboard-contract] OK');
