#!/usr/bin/env node
/* Doke service -> order integration contract.
   Validates the complete mock/local relation before browser rendering:
   professional service -> public discovery -> budget URL -> client order snapshot ->
   conversation -> service edit/deactivation/archive without mutating the order. */
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const projectRoot = path.resolve(__dirname, '..');
const storage = Object.create(null);
const listeners = Object.create(null);
let currentUser = {
  id: '11111111-1111-4111-8111-111111111111',
  name: 'Profissional Doke',
  role: 'professional',
  initials: 'PD',
  avatarInitials: 'PD'
};

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertRejects(operation, message) {
  let rejected = false;
  try { await operation; }
  catch (error) { rejected = true; }
  assert(rejected, message);
}

const context = {
  console,
  Date,
  Intl,
  Math,
  JSON,
  Promise,
  setTimeout,
  clearTimeout,
  setInterval: () => 0,
  clearInterval: () => {},
  Blob,
  Uint8Array,
  atob,
  URLSearchParams,
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
    readyState: 'loading',
    addEventListener: (type, callback) => {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(callback);
    },
    dispatchEvent: (event) => {
      (listeners[event.type] || []).forEach((callback) => callback(event));
    }
  },
  location: { search: '', href: 'http://localhost:4173/index.html' },
  Doke: {
    mockData: { load: () => Promise.resolve([]) }
  }
};
context.window = context;

const remoteServiceId = '44444444-4444-4444-8444-444444444444';
const remoteRows = new Map();

function createQuery(table) {
  let mode = 'select';
  let payload = null;
  let filters = [];
  const query = {
    select() { return this; },
    eq(column, value) { filters.push([column, String(value)]); return this; },
    delete() { mode = 'delete'; return this; },
    insert(rows) { mode = 'insert'; payload = rows; return this; },
    upsert(row) { mode = 'upsert'; payload = row; return this; },
    single() { return this.execute(true); },
    maybeSingle() { return this.execute(true, true); },
    execute(single = false, maybe = false) {
      if (table === 'services') {
        if (mode === 'upsert') {
          const row = { ...payload, id: remoteServiceId, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), service_media: [] };
          remoteRows.set(String(row.external_id), row);
          return Promise.resolve({ data: row, error: null });
        }
        const rows = Array.from(remoteRows.values());
        const filtered = filters.reduce((items, [column, value]) => items.filter((item) => String(item[column] || '') === value), rows);
        return Promise.resolve({ data: single ? (filtered[0] || null) : filtered, error: null });
      }
      if (table === 'service_media') return Promise.resolve({ data: mode === 'insert' ? (payload || []) : [], error: null });
      return Promise.resolve({ data: single || maybe ? null : [], error: null });
    },
    then(resolve, reject) { return this.execute(false).then(resolve, reject); }
  };
  return query;
}

const fakeSupabaseClient = {
  auth: {
    getSession: () => Promise.resolve({ data: { session: { user: currentUser } }, error: null })
  },
  storage: {
    from: () => ({
      upload: (objectPath) => Promise.resolve({ data: { path: objectPath }, error: null }),
      getPublicUrl: (objectPath) => ({ data: { publicUrl: `https://storage.example.test/${objectPath}` } })
    })
  },
  from: (table) => createQuery(table)
};

context.DOKE_SUPABASE_CONFIG = {
  enabled: true,
  servicesEnabled: true,
  ordersEnabled: false,
  messagesEnabled: false,
  notificationsEnabled: false,
  url: 'https://staging.example.test',
  anonKey: 'public-test-key'
};
context.supabase = { createClient: () => fakeSupabaseClient };
context.DokeSupabase = {
  getClient: () => fakeSupabaseClient,
  invokeSelfService: (operation, args = {}) => {
    assert(operation === 'submit_service_for_review', 'Somente o dispatcher de revisão pode publicar serviços neste contrato.');
    const snapshot = args.p_snapshot || {};
    const existing = remoteRows.get(String(args.p_external_id || ''));
    const publicStatus = existing ? (existing.status || 'published') : 'draft';
    const row = {
      id: remoteServiceId,
      external_id: String(args.p_external_id || snapshot.id || ''),
      professional_id: currentUser.id,
      title: snapshot.title,
      status: publicStatus,
      moderation_status: existing ? 'changes_pending_review' : 'pending_review',
      metadata: snapshot,
      service_media: (snapshot.images || []).map((url, index) => ({ url, sort_order: index }))
    };
    remoteRows.set(row.external_id, row);
    return Promise.resolve({
      serviceId: remoteServiceId,
      externalId: row.external_id,
      versionId: '55555555-5555-4555-8555-555555555555',
      versionNumber: existing ? 2 : 1,
      moderationStatus: existing ? 'changes_pending_review' : 'pending_review',
      publicStatus,
      submittedAt: new Date().toISOString(),
      changeClass: args.p_change_class || 'critical',
      visibilityAction: 'keep_public',
      riskFlags: [],
      classificationReasons: []
    });
  }
};

context.Doke.session = { getCurrentUser: () => currentUser };
context.Doke.services = {
  professionalAccess: {
    ACTIONS: Object.freeze({ PUBLISH_SERVICE: 'publish_service' }),
    assert: () => Promise.resolve({
      user: currentUser,
      professionalProfile: { id: 'profile_profissional_demo', status: 'active' },
      verification: { status: 'verified' }
    })
  }
};

const sandbox = vm.createContext(context);
function runAsset(relativePath) {
  const filename = path.join(projectRoot, relativePath);
  vm.runInContext(fs.readFileSync(filename, 'utf8'), sandbox, { filename: relativePath });
}

[
  'assets/js/repositories/services-repository.js',
  'assets/js/services/services-service.js',
  'assets/js/repositories/orders-repository.js',
  'assets/js/repositories/messages-repository.js',
  'assets/js/repositories/notifications-repository.js',
  'assets/js/services/notification-service.js',
  'assets/js/services/message-service.js',
  'assets/js/services/orders-service.js'
].forEach(runAsset);

function setUser(user) {
  currentUser = user;
}

function getConversationByOrder(orderId) {
  return context.Doke.repositories.messages.readLocal().find((conversation) => (
    String(conversation.orderId || conversation.order && conversation.order.id || '') === String(orderId)
  ));
}

async function main() {
  const Doke = context.Doke;
  const servicePayload = {
    id: 'service_marketplace_stabilization',
    title: 'Montagem de móveis planejados',
    category: 'Montagem de móveis',
    specialty: 'Móveis planejados',
    shortDescription: 'Montagem cuidadosa com acabamento profissional.',
    description: 'Montagem e desmontagem de móveis planejados com organização, proteção e conferência final.',
    priceType: 'A partir de',
    priceValue: 180,
    priceLabel: 'R$ 180',
    billingUnit: 'Por serviço',
    location: 'Salvador, BA',
    serviceRegion: 'Salvador, BA',
    serviceMode: 'Atendimento presencial',
    availabilitySchedule: [
      { day: 'monday', label: 'Segunda', start: '08:00', end: '18:00' },
      { day: 'saturday', label: 'Sábado', start: '08:00', end: '13:00' }
    ],
    includedItems: 'Ferramentas, proteção do ambiente',
    excludedItems: 'Peças de reposição',
    tags: ['Atendimento rápido', 'Garantia do serviço'],
    image: 'data:image/png;base64,c2VydmljZQ==',
    images: ['data:image/png;base64,c2VydmljZQ==']
  };

  const submittedService = await Doke.services.services.create(servicePayload);
  assert(submittedService.status === 'draft', 'Serviço novo deve permanecer fora do catálogo enquanto aguarda análise.');
  assert(submittedService.moderationStatus === 'pending_review', 'Serviço novo deve registrar revisão pendente.');
  assert(submittedService.ownerId === currentUser.id && submittedService.professionalProfileId === 'profile_profissional_demo', 'Serviço deve preservar proprietário e perfil profissional.');

  const service = await Doke.repositories.services.save(Object.assign({}, submittedService, {
    status: 'active',
    moderationStatus: 'published',
    approvedVersionId: '66666666-6666-4666-8666-666666666666',
    pendingVersionId: ''
  }));
  assert(service.status === 'active', 'Após aprovação, o serviço deve entrar no catálogo como ativo.');

  const publicServices = await Doke.services.services.list({ fresh: true });
  assert(publicServices.some((item) => item.id === service.id), 'Serviço ativo deve aparecer na descoberta pública.');
  assert(Doke.services.services.getDetailUrl(service) === 'detalhe-anuncio.html?id=' + encodeURIComponent(service.id), 'URL de detalhe deve preservar serviceId.');
  const budgetUrl = Doke.services.services.getBudgetUrl(service);
  assert(budgetUrl.includes('serviceId=' + encodeURIComponent(service.id)), 'URL de orçamento deve preservar serviceId.');
  assert(budgetUrl.includes('professionalId=' + encodeURIComponent(service.professionalId)), 'URL de orçamento deve preservar professionalId.');

  setUser({ id: '22222222-2222-4222-8222-222222222222', name: 'Cliente Doke', role: 'client', initials: 'CD' });
  const order = await Doke.services.orders.create({
    serviceId: service.id,
    professionalId: service.professionalId,
    providerId: service.providerId,
    professionalProfileId: service.professionalProfileId,
    providerName: service.providerName,
    providerInitials: service.providerInitials,
    serviceTitle: service.title,
    title: service.title,
    serviceSnapshot: {
      id: service.id,
      title: service.title,
      category: service.category,
      shortDescription: service.shortDescription,
      providerId: service.providerId,
      professionalProfileId: service.professionalProfileId,
      providerName: service.providerName,
      providerInitials: service.providerInitials,
      priceMode: service.priceType,
      priceValue: service.priceValue,
      priceLabel: service.priceLabel,
      billingUnit: service.billingUnit,
      location: service.location,
      serviceMode: service.serviceMode,
      availabilitySchedule: service.availabilitySchedule,
      includedItems: service.includedItems,
      excludedItems: service.excludedItems,
      image: service.image,
      images: service.images
    },
    requestType: 'Orçamento para execução',
    scope: 'Quarto completo',
    location: 'Rua de teste, Salvador - BA',
    details: 'Montar guarda-roupa e instalar portas.',
    attachments: [{ name: 'medidas.png', type: 'image/png', size: 1200, url: service.image, previewable: true }]
  });

  assert(order.status === 'pending', 'Pedido deve nascer pending.');
  assert(order.serviceId === service.id, 'Pedido deve manter vínculo com o anúncio.');
  assert(order.serviceMode === service.serviceMode, 'Pedido deve recuperar modalidade pelo snapshot.');
  assert(order.serviceBillingUnit === service.billingUnit, 'Pedido deve recuperar unidade de cobrança pelo snapshot.');
  assert(order.serviceAvailabilitySchedule.length === 2, 'Pedido deve recuperar agenda pelo snapshot.');
  assert(order.serviceIncludedItems === service.includedItems, 'Pedido deve recuperar itens incluídos pelo snapshot.');
  assert(order.serviceExcludedItems === service.excludedItems, 'Pedido deve recuperar itens excluídos pelo snapshot.');
  assert(order.serviceImages.length === 1 && order.serviceImage === service.image, 'Pedido deve recuperar mídia pelo snapshot.');
  assert(order.attachments.length === 1, 'Pedido deve preservar anexos da solicitação.');

  let conversation = getConversationByOrder(order.id);
  assert(conversation && conversation.locked === true, 'Conversa deve nascer vinculada e bloqueada antes do aceite.');

  const reloadedOrder = await Doke.services.orders.getById(order.id);
  assert(reloadedOrder && reloadedOrder.serviceSnapshot && reloadedOrder.serviceSnapshot.title === service.title, 'Snapshot deve sobreviver à leitura do repository.');

  setUser({ id: '33333333-3333-4333-8333-333333333333', name: 'Outro profissional', role: 'professional', initials: 'OP' });
  await assertRejects(
    Doke.services.services.updateOwned(service.id, { title: 'Alteração indevida' }),
    'Profissional sem propriedade não pode editar o anúncio.'
  );

  setUser({ id: '11111111-1111-4111-8111-111111111111', name: 'Profissional Doke', role: 'professional', initials: 'PD' });
  await Doke.services.services.updateOwned(service.id, {
    title: 'Montagem de móveis atualizada',
    priceLabel: 'R$ 220',
    availabilitySchedule: [{ day: 'friday', label: 'Sexta', start: '09:00', end: '17:00' }]
  });
  const editedService = await Doke.services.services.getById(service.id);
  assert(editedService.title === 'Montagem de móveis atualizada', 'Edição deve atualizar o anúncio.');

  setUser({ id: '22222222-2222-4222-8222-222222222222', name: 'Cliente Doke', role: 'client', initials: 'CD' });
  const immutableOrder = await Doke.services.orders.getById(order.id);
  assert(immutableOrder.serviceTitle === service.title, 'Edição do anúncio não pode alterar o título histórico do pedido.');
  assert(immutableOrder.serviceSnapshot.priceLabel === 'R$ 180', 'Edição do anúncio não pode alterar o preço histórico do pedido.');
  assert(immutableOrder.serviceAvailabilitySchedule.length === 2, 'Edição do anúncio não pode alterar a agenda histórica do pedido.');

  setUser({ id: 'user_profissional_demo', name: 'Profissional Doke', role: 'professional', initials: 'PD' });
  const accepted = await Doke.services.orders.accept(order.id);
  assert(accepted.status === 'accepted', 'Profissional operacional vinculado deve aceitar o pedido local roteado.');
  conversation = getConversationByOrder(order.id);
  assert(conversation && conversation.locked === false && conversation.status === 'accepted', 'Aceite deve destravar a conversa vinculada.');

  setUser({ id: '11111111-1111-4111-8111-111111111111', name: 'Profissional Doke', role: 'professional', initials: 'PD' });
  await Doke.services.services.deactivateOwned(service.id);
  assert((await Doke.services.services.list({})).every((item) => item.id !== service.id), 'Serviço inativo não deve permanecer na descoberta pública.');
  const ownerInactive = await Doke.services.services.listByProfessional(currentUser.id, { status: ['inactive'] });
  assert(ownerInactive.some((item) => item.id === service.id), 'Proprietário deve continuar vendo o anúncio inativo.');

  await Doke.services.services.reactivateOwned(service.id);
  assert((await Doke.services.services.list({})).some((item) => item.id === service.id), 'Serviço reativado deve retornar à descoberta pública.');

  await Doke.services.services.archiveOwned(service.id);
  assert((await Doke.services.services.list({})).every((item) => item.id !== service.id), 'Serviço arquivado não deve aparecer publicamente.');
  await assertRejects(
    Doke.services.services.reactivateOwned(service.id),
    'Serviço arquivado não pode ser reativado pela transição atual.'
  );

  setUser({ id: '22222222-2222-4222-8222-222222222222', name: 'Cliente Doke', role: 'client', initials: 'CD' });
  const orderAfterArchive = await Doke.services.orders.getById(order.id);
  assert(orderAfterArchive && orderAfterArchive.status === 'accepted', 'Arquivamento do anúncio não pode apagar ou invalidar pedido existente.');

  console.log('Service -> order integration contract: PASS');
  console.log(JSON.stringify({
    serviceCreated: service.id,
    orderCreated: order.id,
    snapshotImmutable: true,
    conversationUnlockedAfterAcceptance: true,
    inactiveHiddenPublicly: true,
    archivedHiddenPublicly: true,
    unauthorizedEditBlocked: true
  }, null, 2));
}

main().catch((error) => {
  console.error(error && error.stack || error);
  process.exit(1);
});
