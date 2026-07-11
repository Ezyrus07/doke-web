const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const storage = Object.create(null);
const listeners = Object.create(null);
let currentUser = null;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const context = {
  console,
  Date,
  Math,
  JSON,
  Promise,
  setTimeout,
  clearTimeout,
  encodeURIComponent,
  fetch: () => Promise.resolve({ ok: true, json: () => Promise.resolve([]) }),
  localStorage: {
    getItem: (key) => Object.prototype.hasOwnProperty.call(storage, key) ? storage[key] : null,
    setItem: (key, value) => { storage[key] = String(value); },
    removeItem: (key) => { delete storage[key]; }
  },
  CustomEvent: function CustomEvent(type, options) {
    this.type = type;
    this.detail = options && options.detail;
  },
  document: {
    addEventListener: (type, callback) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(callback);
    },
    dispatchEvent: (event) => {
      (listeners[event.type] || []).forEach((callback) => callback(event));
    }
  },
  Doke: {
    mockData: { load: () => Promise.resolve([]) },
    session: { getCurrentUser: () => currentUser }
  }
};
context.window = context;

const sandbox = vm.createContext(context);
[
  'assets/js/repositories/notifications-repository.js',
  'assets/js/services/notification-service.js',
  'assets/js/features/community/community-domain.js'
].forEach((relativePath) => {
  vm.runInContext(fs.readFileSync(path.join(root, relativePath), 'utf8'), sandbox, { filename: relativePath });
});

const owner = {
  id: 'owner-auth-id',
  accountId: 'owner-account',
  email: 'owner@doke.local',
  name: 'Conta A'
};
const requester = {
  id: 'requester-auth-id',
  accountId: 'requester-account',
  email: 'requester@doke.local',
  name: 'Conta B',
  profiles: [
    { id: 'cliente-b', accountId: 'requester-account', email: 'requester@doke.local' },
    { id: 'profissional-b', accountId: 'requester-account', email: 'requester@doke.local' }
  ]
};

async function createNotification(payload) {
  const notification = await sandbox.Doke.services.notifications.create(payload);
  assert(notification && notification.id, `Notification was not created for ${payload.type}`);
  return notification;
}

async function main() {
  const domain = sandbox.Doke.communityDomain;
  currentUser = owner;
  const ownerProfile = domain.identity.resolveCurrentUser();
  const created = domain.operations.create({
    id: 'community-request-contract',
    title: 'Comunidade Request Contract',
    visibility: 'private',
    ownerId: ownerProfile.id,
    ownerIdentityKeys: ownerProfile.identityKeys,
    members: [Object.assign({}, ownerProfile, { role: 'owner' })]
  }, {
    type: 'COMMUNITY_CREATED',
    actorId: ownerProfile.id,
    operationId: 'community-request-contract-create'
  });
  assert(created.ok, 'Community creation failed');

  currentUser = requester;
  const requesterProfile = domain.identity.resolveCurrentUser();
  const requestId = 'request-contract-b';
  const requested = domain.operations.transact(created.record.id, {
    type: 'JOIN_REQUEST_CREATED',
    actorId: requesterProfile.id,
    targetId: created.record.id,
    operationId: 'community-request-contract-request'
  }, (record) => {
    const requests = Array.isArray(record.joinRequests) ? record.joinRequests.slice() : [];
    requests.push({
      id: requestId,
      userId: requesterProfile.id,
      accountKey: requesterProfile.accountKey,
      userName: requesterProfile.name,
      userEmail: requesterProfile.email,
      identityKeys: requesterProfile.identityKeys,
      relation: 'morador',
      message: 'Quero participar.',
      status: 'pending',
      requestedAt: '2026-07-10T00:00:00.000Z'
    });
    return { record: Object.assign({}, record, { joinRequests: requests }) };
  });
  assert(requested.ok, 'Join request transaction failed');
  assert(requested.record.joinRequests[0].status === 'pending', 'Request must persist as pending');

  await createNotification({
    type: 'community-request-received',
    category: 'social',
    userId: ownerProfile.id,
    recipientAccountKey: ownerProfile.accountKey,
    actorId: requesterProfile.id,
    actorName: requesterProfile.name,
    eventKey: ['community-request-received', created.record.id, requestId, ownerProfile.accountKey].join(':'),
    title: 'Nova solicitação de entrada',
    body: `${requesterProfile.name} quer participar de ${created.record.title}.`,
    targetUrl: `comunidade-interna.html?community=${created.record.id}&settings=requests`,
    actionLabel: 'Analisar solicitação'
  });

  currentUser = owner;
  const ownerNotifications = sandbox.Doke.repositories.notifications.listLocal({ dismissed: false });
  assert(ownerNotifications.some((item) => item.type === 'community-request-received'), 'Owner must see request notification through recipientAccountKey');

  const accepted = domain.operations.transact(created.record.id, {
    type: 'JOIN_REQUEST_ACCEPTED',
    actorId: ownerProfile.id,
    targetId: requestId,
    operationId: 'community-request-contract-accept'
  }, (record) => {
    const requests = record.joinRequests.map((request) => (
      request.id === requestId ? Object.assign({}, request, { status: 'accepted', resolvedAt: '2026-07-10T00:01:00.000Z', resolvedBy: ownerProfile.id }) : request
    ));
    const acceptedRequest = requests.find((request) => request.id === requestId);
    const members = record.members.concat([{
      id: acceptedRequest.userId,
      accountKey: acceptedRequest.accountKey,
      name: acceptedRequest.userName,
      email: acceptedRequest.userEmail,
      identityKeys: acceptedRequest.identityKeys,
      role: 'member',
      source: 'join-request',
      joinedAt: '2026-07-10T00:01:00.000Z',
      addedBy: ownerProfile.id
    }]);
    return { record: Object.assign({}, record, { joinRequests: requests, members }) };
  });
  assert(accepted.ok, 'Accept transaction failed');
  assert(accepted.record.joinRequests[0].status === 'accepted', 'Request must persist as accepted');
  assert(domain.identity.resolveCommunityRelation({ community: accepted.record, currentUser: requesterProfile }).relation === 'member', 'Requester must become member after approval');

  await createNotification({
    type: 'community-request-approved',
    category: 'social',
    userId: requesterProfile.id,
    recipientAccountKey: requesterProfile.accountKey,
    actorId: ownerProfile.id,
    actorName: ownerProfile.name,
    eventKey: ['community-request-approved', created.record.id, requestId, requesterProfile.accountKey].join(':'),
    title: 'Solicitação aprovada',
    body: `Você agora participa de ${created.record.title}.`,
    targetUrl: `comunidade-interna.html?community=${created.record.id}`,
    actionLabel: 'Abrir comunidade'
  });

  currentUser = requester;
  const requesterNotifications = sandbox.Doke.repositories.notifications.listLocal({ dismissed: false });
  assert(requesterNotifications.some((item) => item.type === 'community-request-approved'), 'Requester must see approval notification through recipientAccountKey');

  currentUser = owner;
  const rejectedRequestId = 'request-contract-c';
  const rejected = domain.operations.transact(created.record.id, {
    type: 'JOIN_REQUEST_REJECTED',
    actorId: ownerProfile.id,
    targetId: rejectedRequestId,
    operationId: 'community-request-contract-reject'
  }, (record) => {
    const requests = record.joinRequests.concat([{
      id: rejectedRequestId,
      userId: 'visitor-auth-id',
      accountKey: 'visitor@doke.local',
      userName: 'Conta C',
      userEmail: 'visitor@doke.local',
      identityKeys: ['visitor@doke.local'],
      status: 'rejected',
      requestedAt: '2026-07-10T00:02:00.000Z',
      resolvedAt: '2026-07-10T00:03:00.000Z',
      resolvedBy: ownerProfile.id
    }]);
    return { record: Object.assign({}, record, { joinRequests: requests }) };
  });
  assert(rejected.ok, 'Reject transaction failed');
  assert(!rejected.record.members.some((member) => member.accountKey === 'visitor@doke.local'), 'Rejected request must not create a member');

  await createNotification({
    type: 'community-request-rejected',
    category: 'social',
    userId: 'visitor-auth-id',
    recipientAccountKey: 'visitor@doke.local',
    actorId: ownerProfile.id,
    actorName: ownerProfile.name,
    eventKey: ['community-request-rejected', created.record.id, rejectedRequestId, 'visitor@doke.local'].join(':'),
    title: 'Solicitação recusada',
    body: `Sua solicitação para ${created.record.title} foi recusada.`,
    targetUrl: 'comunidade.html',
    actionLabel: 'Ver comunidades'
  });

  await createNotification({
    type: 'community-request-rejected',
    category: 'social',
    userId: 'visitor-auth-id',
    recipientAccountKey: 'visitor@doke.local',
    eventKey: ['community-request-rejected', created.record.id, rejectedRequestId, 'visitor@doke.local'].join(':'),
    title: 'Solicitação recusada'
  });
  const rejectedNotifications = sandbox.Doke.repositories.notifications.readLocal().filter((item) => item.type === 'community-request-rejected');
  assert(rejectedNotifications.length === 1, 'Community request notification must dedupe by eventKey');

  console.log('Community request notification contract: OK');
}

main().catch((error) => {
  console.error(error.stack || error.message || error);
  process.exit(1);
});
