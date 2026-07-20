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

expect(/data-detail-visitor-actions/.test(html), 'Customer conversion actions must have an explicit visitor boundary.');
expect(/data-detail-owner-actions hidden/.test(html), 'Owner management actions must be present and hidden by default.');
expect(/data-detail-owner-edit/.test(html), 'Owner must receive an Editar anúncio action.');
expect(/data-detail-owner-manage/.test(html), 'Owner must receive a Gerenciar anúncios action.');
expect(/data-detail-owner-note/.test(html), 'Owner mode must explain that this is their own listing.');
expect(/root\.dataset\.viewerRelation = owner \? 'owner' : 'visitor'/.test(js), 'Viewer relation must be represented as page state.');
expect(/visitorActions\.hidden = owner \|\| !active/.test(js), 'Visitor actions must stay hidden for the owner and inactive listings.');
expect(/anunciar-servico\.html\?mode=edit&edit=/.test(js), 'Edit action must preserve the canonical service edit route.');
expect(/doke:auth-session-change/.test(js), 'Ownership must be reconciled when the auth session becomes available.');
expect(/ad-action-card__actions--owner\[hidden\]/.test(css), 'Owner action hidden state must be protected by the page CSS contract.');

const listeners = {};
const documentStub = {
  readyState: 'loading',
  addEventListener(name, handler) { listeners[name] = handler; },
  querySelector() { return null; },
  title: ''
};
const currentUser = {
  id: '640ce25e-7fad-475f-bd84-844a0419ed50',
  providerProfileId: 'profile-owner',
  profile: { id: 'profile-owner', userId: '640ce25e-7fad-475f-bd84-844a0419ed50' },
  profiles: []
};
const windowStub = {
  Doke: { session: { getCurrentUser: () => currentUser } },
  DokeAuth: {},
  addEventListener() {}
};
windowStub.window = windowStub;
windowStub.document = documentStub;
const context = vm.createContext({ window: windowStub, document: documentStub, console, URLSearchParams, CustomEvent: function () {} });
vm.runInContext(js, context);
const api = windowStub.DokeDetailAdOwnership;
expect(api && typeof api.isCurrentUserOwner === 'function', 'Ownership resolver must be exposed for shared verification.');
expect(api?.isCurrentUserOwner({ professionalId: currentUser.id }) === true, 'Remote service professional_id must match the authenticated owner.');
expect(api?.isCurrentUserOwner({ professionalProfileId: 'profile-owner' }) === true, 'Professional profile id must match owner profile identities.');
expect(api?.isCurrentUserOwner({ professionalId: 'another-user' }) === false, 'A visitor must not be classified as owner.');

if (failures.length) {
  console.error('[detail-ad-owner-actions-contract] FAIL');
  failures.forEach((failure) => console.error('- ' + failure));
  process.exit(1);
}
console.log('[detail-ad-owner-actions-contract] OK');
