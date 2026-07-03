'use strict';

const WALLET_SELECT = 'user_id,balance_cents,pending_cents,currency,updated_at';
const TRANSACTION_SELECT = 'id,wallet_user_id,order_id,type,amount_cents,currency,status,provider,provider_reference,created_at';
const RECEIVABLE_SELECT = 'id,professional_id,order_id,transaction_id,amount_cents,currency,status,release_at,blocked_reason,metadata,created_at,updated_at';
const WITHDRAWAL_SELECT = 'id,wallet_user_id,amount_cents,currency,status,bank_account_snapshot,requested_by,decided_by,decided_at,reason,receipt_id,idempotency_key,created_at,updated_at';
const DISPUTE_SELECT = 'id,order_id,transaction_id,client_id,professional_id,opened_by,reason,description,status,professional_response,resolution,resolved_by,resolved_at,receipt_id,metadata,created_at,updated_at';
const RECEIPT_SELECT = 'id,transaction_id,order_id,user_id,receipt_type,code,gross_amount_cents,fee_amount_cents,net_amount_cents,currency,status,metadata,created_at';
const BANK_ACCOUNT_SELECT = 'user_id,account_holder,document,bank_name,bank_code,branch,account_number,account_type,pix_key,status,metadata,created_at,updated_at';
const AUDIT_SELECT = 'id,actor_id,actor_role,action,entity_type,entity_id,idempotency_key,metadata,created_at';
const ORDER_SELECT = 'id,client_id,professional_id,status,title';

function isInternal(actor) {
  const role = String(actor && actor.role || '').toLowerCase();
  return role === 'support' || role === 'admin' || role === 'moderator';
}

function requireActor(actor) {
  if (!actor || !actor.id) throw unauthorized();
  return actor;
}

function requireSupabase(context) {
  if (!context || !context.supabase || typeof context.supabase.from !== 'function') {
    throw unavailable('Supabase user client is required for wallet runtime handlers.');
  }
  return context.supabase;
}

function chooseWalletSupabase(context, actor) {
  if (isInternal(actor)) {
    if (context && context.serviceSupabase && typeof context.serviceSupabase.from === 'function') return context.serviceSupabase;
    throw unavailable('Internal wallet operations require a configured server-side service-role client.');
  }
  return requireSupabase(context);
}

function resolveWalletUserId(context, actor) {
  const explicit = sanitizeNullableUuid(context && context.query && (context.query.userId || context.query.user_id || context.query.professionalId || context.query.professional_id)
    || context && context.body && (context.body.userId || context.body.user_id || context.body.ownerId || context.body.professionalId || context.body.professional_id));
  if (isInternal(actor) && explicit) return explicit;
  return actor && actor.id || '';
}

function centsToAmount(value) {
  const cents = Number(value || 0);
  return Number.isFinite(cents) ? Math.round(cents) / 100 : 0;
}

function normalizeWallet(row, extras) {
  const source = row || {};
  const transactions = extras && Array.isArray(extras.transactions) ? extras.transactions : [];
  const receivablesSchedule = extras && extras.receivablesSchedule || createEmptyReceivablesSchedule();
  const bankAccount = extras && extras.bankAccount || null;
  const dashboard = extras && extras.dashboard || null;
  const balanceCents = Number(source.balance_cents || 0);
  const pendingCents = Number(source.pending_cents || 0);
  return Object.freeze({
    userId: source.user_id || '',
    currency: source.currency || 'BRL',
    availableBalance: centsToAmount(balanceCents),
    pendingBalance: centsToAmount(pendingCents),
    balances: {
      availableCents: balanceCents,
      pendingCents,
      available: centsToAmount(balanceCents),
      pending: centsToAmount(pendingCents)
    },
    monthlyIncome: dashboard && dashboard.netIncome || 0,
    withdrawals: dashboard && dashboard.withdrawals || 0,
    fees: dashboard && dashboard.fees || 0,
    monthlyDashboard: dashboard,
    transactions,
    walletTransactions: transactions,
    receivablesSchedule,
    bankAccount,
    updatedAt: source.updated_at || ''
  });
}

function normalizeTransaction(row) {
  const source = row || {};
  return Object.freeze({
    id: source.id || '',
    userId: source.wallet_user_id || source.userId || '',
    walletUserId: source.wallet_user_id || source.walletUserId || '',
    orderId: source.order_id || source.orderId || '',
    type: source.type || 'adjustment',
    amountCents: Number(source.amount_cents || 0),
    amount: centsToAmount(source.amount_cents),
    currency: source.currency || 'BRL',
    status: source.status || 'pending',
    provider: source.provider || '',
    providerReference: source.provider_reference || source.providerReference || '',
    createdAt: source.created_at || source.createdAt || ''
  });
}

function normalizeReceivable(row) {
  const source = row || {};
  const metadata = normalizeJson(source.metadata);
  return Object.freeze({
    id: source.id || '',
    professionalId: source.professional_id || source.professionalId || '',
    orderId: source.order_id || source.orderId || '',
    transactionId: source.transaction_id || source.transactionId || '',
    amountCents: Number(source.amount_cents || 0),
    amount: centsToAmount(source.amount_cents),
    currency: source.currency || 'BRL',
    status: source.status || 'scheduled',
    releaseAt: source.release_at || source.releaseAt || '',
    blockedReason: source.blocked_reason || source.blockedReason || '',
    metadata,
    title: metadata.title || '',
    createdAt: source.created_at || source.createdAt || '',
    updatedAt: source.updated_at || source.updatedAt || ''
  });
}

function normalizeWithdrawal(row) {
  const source = row || {};
  return Object.freeze({
    id: source.id || '',
    userId: source.wallet_user_id || source.userId || '',
    walletUserId: source.wallet_user_id || source.walletUserId || '',
    amountCents: Number(source.amount_cents || 0),
    amount: centsToAmount(source.amount_cents),
    currency: source.currency || 'BRL',
    status: source.status || 'requested',
    bankAccount: normalizeJson(source.bank_account_snapshot),
    requestedBy: source.requested_by || source.requestedBy || '',
    decidedBy: source.decided_by || source.decidedBy || '',
    decidedAt: source.decided_at || source.decidedAt || '',
    reason: source.reason || '',
    receiptId: source.receipt_id || source.receiptId || '',
    idempotencyKey: source.idempotency_key || source.idempotencyKey || '',
    createdAt: source.created_at || source.createdAt || '',
    updatedAt: source.updated_at || source.updatedAt || ''
  });
}

function normalizeDispute(row) {
  const source = row || {};
  return Object.freeze({
    id: source.id || '',
    orderId: source.order_id || source.orderId || '',
    transactionId: source.transaction_id || source.transactionId || '',
    clientId: source.client_id || source.clientId || '',
    professionalId: source.professional_id || source.professionalId || '',
    openedBy: source.opened_by || source.openedBy || '',
    reason: source.reason || '',
    description: source.description || '',
    status: source.status || 'open',
    professionalResponse: source.professional_response || source.professionalResponse || '',
    resolution: source.resolution || '',
    resolvedBy: source.resolved_by || source.resolvedBy || '',
    resolvedAt: source.resolved_at || source.resolvedAt || '',
    receiptId: source.receipt_id || source.receiptId || '',
    metadata: normalizeJson(source.metadata),
    createdAt: source.created_at || source.createdAt || '',
    updatedAt: source.updated_at || source.updatedAt || ''
  });
}

function normalizeReceipt(row) {
  const source = row || {};
  return Object.freeze({
    id: source.id || '',
    transactionId: source.transaction_id || source.transactionId || '',
    orderId: source.order_id || source.orderId || '',
    userId: source.user_id || source.userId || '',
    receiptType: source.receipt_type || source.receiptType || 'payment',
    code: source.code || '',
    grossAmountCents: Number(source.gross_amount_cents || 0),
    feeAmountCents: Number(source.fee_amount_cents || 0),
    netAmountCents: Number(source.net_amount_cents || 0),
    grossAmount: centsToAmount(source.gross_amount_cents),
    feeAmount: centsToAmount(source.fee_amount_cents),
    netAmount: centsToAmount(source.net_amount_cents),
    currency: source.currency || 'BRL',
    status: source.status || 'issued',
    metadata: normalizeJson(source.metadata),
    createdAt: source.created_at || source.createdAt || ''
  });
}

function normalizeBankAccount(row) {
  if (!row) return null;
  const source = row || {};
  return Object.freeze({
    userId: source.user_id || source.userId || '',
    holderName: source.account_holder || source.holderName || '',
    accountHolder: source.account_holder || source.accountHolder || '',
    document: source.document || '',
    bankName: source.bank_name || source.bankName || '',
    bankCode: source.bank_code || source.bankCode || '',
    agency: source.branch || source.agency || '',
    branch: source.branch || '',
    accountNumber: source.account_number || source.accountNumber || '',
    accountType: source.account_type || source.accountType || 'checking',
    pixKey: source.pix_key || source.pixKey || '',
    status: source.status || 'pending',
    metadata: normalizeJson(source.metadata),
    updatedAt: source.updated_at || source.updatedAt || ''
  });
}

function normalizeAuditEvent(row) {
  const source = row || {};
  return Object.freeze({
    id: source.id || '',
    actorId: source.actor_id || source.actorId || '',
    actorRole: source.actor_role || source.actorRole || '',
    action: source.action || '',
    entityType: source.entity_type || source.entityType || '',
    entityId: source.entity_id || source.entityId || '',
    idempotencyKey: source.idempotency_key || source.idempotencyKey || '',
    metadata: normalizeJson(source.metadata),
    createdAt: source.created_at || source.createdAt || ''
  });
}

async function getWalletSummary(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const wallet = await readWalletRow(supabase, walletUserId, true);
  const transactions = await queryTransactions(supabase, walletUserId, context.query).catch(() => []);
  const receivablesSchedule = await getReceivablesSchedule(context, safeActor).then((payload) => payload.receivablesSchedule).catch(() => createEmptyReceivablesSchedule());
  const bankAccount = await getBankAccount(context, safeActor).then((payload) => payload.bankAccount).catch(() => null);
  const dashboard = buildDashboard(transactions, await queryWithdrawals(supabase, walletUserId, {}).catch(() => []));
  return { wallet: normalizeWallet(wallet, { transactions, receivablesSchedule, bankAccount, dashboard }) };
}

async function listWalletTransactions(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const transactions = await queryTransactions(supabase, walletUserId, context.query);
  return { transactions, walletTransactions: transactions, count: transactions.length };
}

async function getWalletDashboard(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const transactions = await queryTransactions(supabase, walletUserId, context.query);
  const withdrawals = await queryWithdrawals(supabase, walletUserId, context.query).catch(() => []);
  return { dashboard: buildDashboard(transactions, withdrawals) };
}

async function getWalletMonthlyHistory(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const transactions = await queryTransactions(supabase, walletUserId, Object.assign({}, context.query, { limit: 500 }));
  return { history: buildMonthlyHistory(transactions), months: buildMonthlyHistory(transactions) };
}

async function getReceivablesSchedule(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const receivables = await queryReceivables(supabase, walletUserId, context.query);
  return { receivablesSchedule: buildReceivablesSchedule(receivables), receivables, count: receivables.length };
}

async function getBankAccount(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const response = await supabase
    .from('wallet_bank_accounts')
    .select(BANK_ACCOUNT_SELECT)
    .eq('user_id', walletUserId)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { bankAccount: normalizeBankAccount(response && response.data) };
}

async function saveBankAccount(context, actor) {
  const safeActor = requireActor(actor);
  if (safeActor.role !== 'professional') throw forbidden('Only professionals can save wallet bank accounts.');
  const supabase = requireSupabase(context);
  const body = context.body || {};
  const walletUserId = safeActor.id;
  const payload = {
    user_id: walletUserId,
    account_holder: sanitizeText(body.holderName || body.accountHolder || body.account_holder || '', 160),
    document: sanitizeText(body.document || body.taxId || '', 40),
    bank_name: sanitizeText(body.bankName || body.bank_name || '', 120),
    bank_code: sanitizeText(body.bankCode || body.bank_code || '', 20),
    branch: sanitizeText(body.agency || body.branch || '', 32),
    account_number: sanitizeText(body.accountNumber || body.account_number || '', 64),
    account_type: sanitizeText(body.accountType || body.account_type || 'checking', 40),
    pix_key: sanitizeText(body.pixKey || body.pix_key || '', 180),
    status: 'verified',
    metadata: normalizeJson(body.metadata)
  };
  if (!payload.account_holder) throw badRequest('Account holder is required.');
  if (!payload.bank_name && !payload.pix_key) throw badRequest('Bank name or Pix key is required.');
  const response = await supabase
    .from('wallet_bank_accounts')
    .upsert(payload, { onConflict: 'user_id' })
    .select(BANK_ACCOUNT_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { bankAccount: normalizeBankAccount(response && response.data), status: 'saved' };
}

async function listReceivables(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const receivables = await queryReceivables(supabase, walletUserId, context.query);
  return { receivables, items: receivables, count: receivables.length };
}

async function createReceivable(context, actor) {
  const safeActor = requireActor(actor);
  if (!isInternal(safeActor)) throw forbidden('Only support or admin can create backend receivables.');
  const supabase = chooseWalletSupabase(context, safeActor);
  const body = context.body || {};
  const professionalId = sanitizeNullableUuid(body.professionalId || body.professional_id || body.userId || body.user_id);
  const amountCents = normalizeAmountCentsFromBody(body);
  if (!professionalId) throw badRequest('Receivable professionalId is required.');
  if (amountCents <= 0) throw badRequest('Receivable amount must be greater than zero.');
  const payload = {
    professional_id: professionalId,
    order_id: sanitizeNullableUuid(body.orderId || body.order_id) || null,
    transaction_id: sanitizeNullableUuid(body.transactionId || body.transaction_id) || null,
    amount_cents: amountCents,
    currency: sanitizeCurrency(body.currency),
    status: normalizeReceivableStatus(body.status || 'scheduled'),
    release_at: body.releaseAt || body.release_at || null,
    blocked_reason: sanitizeText(body.blockedReason || body.blocked_reason || '', 300) || null,
    metadata: normalizeJson(body.metadata || body.data)
  };
  const response = await supabase
    .from('wallet_receivables')
    .insert(payload)
    .select(RECEIVABLE_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { receivable: normalizeReceivable(response && response.data), status: 'created' };
}

async function listWithdrawals(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const walletUserId = resolveWalletUserId(context, safeActor);
  assertWalletOwner(walletUserId, safeActor);
  const withdrawals = await queryWithdrawals(supabase, walletUserId, context.query);
  return { withdrawals, count: withdrawals.length };
}

async function requestWithdrawal(context, actor, idempotencyKey) {
  const safeActor = requireActor(actor);
  if (safeActor.role !== 'professional') throw forbidden('Only professionals can request withdrawals.');
  const supabase = requireSupabase(context);
  const body = context.body || {};
  const amountCents = normalizeAmountCentsFromBody(body);
  if (amountCents <= 0) throw badRequest('Withdrawal amount must be greater than zero.');
  const wallet = await readWalletRow(supabase, safeActor.id, true);
  if (Number(wallet.balance_cents || 0) < amountCents) throw badRequest('Insufficient available wallet balance.');
  const bankAccount = await getBankAccount(context, safeActor).then((payload) => payload.bankAccount).catch(() => null);
  const payload = {
    wallet_user_id: safeActor.id,
    amount_cents: amountCents,
    currency: sanitizeCurrency(body.currency),
    status: 'requested',
    bank_account_snapshot: bankAccount || normalizeJson(body.bankAccount || body.bank_account),
    requested_by: safeActor.id,
    idempotency_key: idempotencyKey || null
  };
  const response = await supabase
    .from('withdrawals')
    .insert(payload)
    .select(WITHDRAWAL_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { withdrawal: normalizeWithdrawal(response && response.data), status: 'requested' };
}

async function approveWithdrawal(context, actor, withdrawalId, idempotencyKey) {
  const safeActor = requireActor(actor);
  if (!isInternal(safeActor)) throw forbidden('Only support or admin can approve withdrawals.');
  const supabase = chooseWalletSupabase(context, safeActor);
  const withdrawal = await readWithdrawalRow(supabase, withdrawalId);
  const now = context.now || new Date().toISOString();
  const receipt = await createReceiptRow(supabase, {
    transaction_id: null,
    order_id: null,
    user_id: withdrawal.wallet_user_id,
    receipt_type: 'withdrawal',
    gross_amount_cents: withdrawal.amount_cents,
    fee_amount_cents: 0,
    net_amount_cents: withdrawal.amount_cents,
    currency: withdrawal.currency,
    metadata: { withdrawalId: withdrawal.id, approvedBy: safeActor.id }
  });
  const response = await supabase
    .from('withdrawals')
    .update({ status: 'completed', decided_by: safeActor.id, decided_at: now, receipt_id: receipt && receipt.id || null, idempotency_key: idempotencyKey || withdrawal.idempotency_key || null })
    .eq('id', withdrawal.id)
    .select(WITHDRAWAL_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  await adjustWalletBalance(supabase, withdrawal.wallet_user_id, -Number(withdrawal.amount_cents || 0), 0).catch(() => null);
  return { withdrawal: normalizeWithdrawal(response && response.data), receipt: normalizeReceipt(receipt), status: 'completed' };
}

async function declineWithdrawal(context, actor, withdrawalId, idempotencyKey) {
  const safeActor = requireActor(actor);
  if (!isInternal(safeActor)) throw forbidden('Only support or admin can decline withdrawals.');
  const supabase = chooseWalletSupabase(context, safeActor);
  const withdrawal = await readWithdrawalRow(supabase, withdrawalId);
  const now = context.now || new Date().toISOString();
  const reason = sanitizeText(context.body && (context.body.reason || context.body.note) || 'Saque recusado pelo suporte.', 800);
  const response = await supabase
    .from('withdrawals')
    .update({ status: 'declined', decided_by: safeActor.id, decided_at: now, reason, idempotency_key: idempotencyKey || withdrawal.idempotency_key || null })
    .eq('id', withdrawal.id)
    .select(WITHDRAWAL_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  return { withdrawal: normalizeWithdrawal(response && response.data), status: 'declined' };
}

async function listDisputes(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  let query = supabase.from('payment_disputes').select(DISPUTE_SELECT);
  if (!isInternal(safeActor)) {
    if (safeActor.role === 'client') query = query.eq('client_id', safeActor.id);
    if (safeActor.role === 'professional') query = query.eq('professional_id', safeActor.id);
  } else {
    const status = sanitizeText(context.query && context.query.status, 40);
    if (status) query = query.eq('status', normalizeDisputeStatus(status));
  }
  if (typeof query.order === 'function') query = query.order('updated_at', { ascending: false });
  const response = await query;
  if (response && response.error) throw response.error;
  const disputes = (Array.isArray(response && response.data) ? response.data : []).map(normalizeDispute);
  return { disputes, items: disputes, count: disputes.length };
}

async function openDispute(context, actor, idempotencyKey) {
  const safeActor = requireActor(actor);
  if (safeActor.role !== 'client') throw forbidden('Only clients can open payment disputes.');
  const supabase = requireSupabase(context);
  const body = context.body || {};
  const orderId = sanitizeNullableUuid(body.orderId || body.order_id);
  if (!orderId) throw badRequest('Dispute orderId is required.');
  const order = await readOrderRow(supabase, orderId);
  if (order.client_id !== safeActor.id) throw forbidden('Order is outside the current client scope.');
  if (!order.professional_id) throw badRequest('Order must have a professional before dispute.');
  const payload = {
    order_id: order.id,
    transaction_id: sanitizeNullableUuid(body.transactionId || body.transaction_id) || null,
    client_id: order.client_id,
    professional_id: order.professional_id,
    opened_by: safeActor.id,
    reason: sanitizeText(body.reason || 'contestacao', 120) || 'contestacao',
    description: sanitizeText(body.description || body.note || '', 1600) || null,
    status: 'open',
    metadata: Object.assign({}, normalizeJson(body.metadata), { idempotencyKey: idempotencyKey || '' })
  };
  const response = await supabase
    .from('payment_disputes')
    .insert(payload)
    .select(DISPUTE_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  const dispute = response && response.data;
  await recordDisputeEvent(supabase, dispute && dispute.id, safeActor.id, 'opened', 'Contestação aberta pelo cliente.', { idempotencyKey }).catch(() => null);
  await updateOrderStatus(supabase, order.id, 'disputed').catch(() => null);
  return { dispute: normalizeDispute(dispute), status: 'open' };
}

async function respondDispute(context, actor, disputeId, idempotencyKey) {
  const safeActor = requireActor(actor);
  if (safeActor.role !== 'professional') throw forbidden('Only professionals can respond to disputes.');
  const supabase = requireSupabase(context);
  const dispute = await readDisputeRow(supabase, disputeId);
  if (dispute.professional_id !== safeActor.id) throw forbidden('Dispute is outside the current professional scope.');
  const responseText = sanitizeText(context.body && (context.body.response || context.body.professionalResponse || context.body.note) || '', 2000);
  if (!responseText) throw badRequest('Professional dispute response is required.');
  const response = await supabase
    .from('payment_disputes')
    .update({ status: 'responded', professional_response: responseText, metadata: Object.assign({}, normalizeJson(dispute.metadata), { responseIdempotencyKey: idempotencyKey || '' }) })
    .eq('id', dispute.id)
    .select(DISPUTE_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  await recordDisputeEvent(supabase, dispute.id, safeActor.id, 'professional_responded', 'Profissional respondeu à contestação.', { idempotencyKey }).catch(() => null);
  return { dispute: normalizeDispute(response && response.data), status: 'responded' };
}

async function releaseDispute(context, actor, disputeId, idempotencyKey) {
  return resolveDispute(context, actor, disputeId, 'release_professional', idempotencyKey);
}

async function refundDispute(context, actor, disputeId, idempotencyKey) {
  return resolveDispute(context, actor, disputeId, 'refund_client', idempotencyKey);
}

async function resolveDispute(context, actor, disputeId, resolution, idempotencyKey) {
  const safeActor = requireActor(actor);
  if (!isInternal(safeActor)) throw forbidden('Only support or admin can resolve disputes.');
  const supabase = chooseWalletSupabase(context, safeActor);
  const dispute = await readDisputeRow(supabase, disputeId);
  const now = context.now || new Date().toISOString();
  const status = resolution === 'refund_client' ? 'refunded' : 'released';
  const receiptType = resolution === 'refund_client' ? 'refund' : 'payout';
  const receiptUserId = resolution === 'refund_client' ? dispute.client_id : dispute.professional_id;
  const transaction = dispute.transaction_id ? await readTransactionRow(supabase, dispute.transaction_id).catch(() => null) : null;
  const amountCents = Number(transaction && transaction.amount_cents || context.body && (context.body.amountCents || context.body.amount_cents) || 0);
  const receipt = await createReceiptRow(supabase, {
    transaction_id: dispute.transaction_id || null,
    order_id: dispute.order_id,
    user_id: receiptUserId,
    receipt_type: receiptType,
    gross_amount_cents: Math.abs(amountCents),
    fee_amount_cents: 0,
    net_amount_cents: Math.abs(amountCents),
    currency: transaction && transaction.currency || sanitizeCurrency(context.body && context.body.currency),
    metadata: { disputeId: dispute.id, resolution, resolvedBy: safeActor.id }
  });
  const response = await supabase
    .from('payment_disputes')
    .update({ status, resolution, resolved_by: safeActor.id, resolved_at: now, receipt_id: receipt && receipt.id || null, metadata: Object.assign({}, normalizeJson(dispute.metadata), { resolutionIdempotencyKey: idempotencyKey || '' }) })
    .eq('id', dispute.id)
    .select(DISPUTE_SELECT)
    .maybeSingle();
  if (response && response.error) throw response.error;
  await recordDisputeEvent(supabase, dispute.id, safeActor.id, status, resolution === 'refund_client' ? 'Cliente reembolsado pelo suporte.' : 'Repasse liberado ao profissional.', { idempotencyKey }).catch(() => null);
  await updateReceivablesForDispute(supabase, dispute, status).catch(() => null);
  return { dispute: normalizeDispute(response && response.data), receipt: normalizeReceipt(receipt), status };
}

async function listReceipts(context, actor) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  let query = supabase.from('receipts').select(RECEIPT_SELECT);
  if (!isInternal(safeActor)) query = query.eq('user_id', safeActor.id);
  const userId = sanitizeNullableUuid(context.query && (context.query.userId || context.query.user_id));
  if (isInternal(safeActor) && userId) query = query.eq('user_id', userId);
  if (typeof query.order === 'function') query = query.order('created_at', { ascending: false });
  const limit = readLimit(context.query && context.query.limit);
  if (limit && typeof query.limit === 'function') query = query.limit(limit);
  const response = await query;
  if (response && response.error) throw response.error;
  const receipts = (Array.isArray(response && response.data) ? response.data : []).map(normalizeReceipt);
  return { receipts, count: receipts.length };
}

async function getReceipt(context, actor, receiptId) {
  const safeActor = requireActor(actor);
  const supabase = chooseWalletSupabase(context, safeActor);
  const receipt = await readReceiptRow(supabase, receiptId);
  assertReceiptAccess(receipt, safeActor);
  return { receipt: normalizeReceipt(receipt) };
}

async function listAuditEvents(context, actor) {
  const safeActor = requireActor(actor);
  if (!isInternal(safeActor)) throw forbidden('Only support or admin can read financial audit events.');
  const supabase = chooseWalletSupabase(context, safeActor);
  let query = supabase.from('admin_audit_events').select(AUDIT_SELECT);
  const action = sanitizeText(context.query && context.query.action, 120);
  if (action) query = query.eq('action', action);
  if (typeof query.order === 'function') query = query.order('created_at', { ascending: false });
  const limit = readLimit(context.query && context.query.limit);
  if (limit && typeof query.limit === 'function') query = query.limit(limit);
  const response = await query;
  if (response && response.error) throw response.error;
  const auditEvents = (Array.isArray(response && response.data) ? response.data : []).map(normalizeAuditEvent);
  return { auditEvents, events: auditEvents, count: auditEvents.length };
}

async function recordAdminAuditEvent(context, auditEvent) {
  if (!context || !context.serviceSupabase || typeof context.serviceSupabase.from !== 'function') return null;
  const event = auditEvent || {};
  const payload = {
    actor_id: sanitizeNullableUuid(event.actorId) || null,
    actor_role: sanitizeText(event.actorRole || '', 40) || null,
    action: sanitizeText(event.action || 'unknown', 180),
    entity_type: sanitizeText(event.entityType || 'system', 80),
    entity_id: sanitizeNullableUuid(event.entityId) || null,
    idempotency_key: sanitizeText(event.idempotencyKey || '', 240) || null,
    metadata: normalizeJson(event.metadata)
  };
  const response = await context.serviceSupabase.from('admin_audit_events').insert(payload).select(AUDIT_SELECT).maybeSingle();
  if (response && response.error) throw response.error;
  return normalizeAuditEvent(response && response.data);
}

async function readWalletRow(supabase, userId, createMissing) {
  const id = sanitizeNullableUuid(userId);
  if (!id) throw badRequest('Wallet user id is required.');
  const response = await supabase.from('wallets').select(WALLET_SELECT).eq('user_id', id).maybeSingle();
  if (response && response.error) throw response.error;
  if (response && response.data) return response.data;
  if (!createMissing) throw notFound('Wallet not found.');
  const created = await supabase.from('wallets').upsert({ user_id: id, balance_cents: 0, pending_cents: 0, currency: 'BRL' }, { onConflict: 'user_id' }).select(WALLET_SELECT).maybeSingle();
  if (created && created.error) throw created.error;
  return created && created.data || { user_id: id, balance_cents: 0, pending_cents: 0, currency: 'BRL' };
}

async function queryTransactions(supabase, walletUserId, queryParams) {
  let query = supabase.from('transactions').select(TRANSACTION_SELECT).eq('wallet_user_id', walletUserId);
  const status = sanitizeText(queryParams && queryParams.status, 40);
  if (status) query = query.eq('status', status);
  const type = sanitizeText(queryParams && queryParams.type, 40);
  if (type) query = query.eq('type', type);
  if (typeof query.order === 'function') query = query.order('created_at', { ascending: false });
  const limit = readLimit(queryParams && queryParams.limit);
  if (limit && typeof query.limit === 'function') query = query.limit(limit);
  const response = await query;
  if (response && response.error) throw response.error;
  return (Array.isArray(response && response.data) ? response.data : []).map(normalizeTransaction);
}

async function queryReceivables(supabase, walletUserId, queryParams) {
  let query = supabase.from('wallet_receivables').select(RECEIVABLE_SELECT).eq('professional_id', walletUserId);
  const status = sanitizeText(queryParams && queryParams.status, 40);
  if (status) query = query.eq('status', normalizeReceivableStatus(status));
  if (typeof query.order === 'function') query = query.order('release_at', { ascending: true });
  const response = await query;
  if (response && response.error) throw response.error;
  return (Array.isArray(response && response.data) ? response.data : []).map(normalizeReceivable);
}

async function queryWithdrawals(supabase, walletUserId, queryParams) {
  let query = supabase.from('withdrawals').select(WITHDRAWAL_SELECT).eq('wallet_user_id', walletUserId);
  const status = sanitizeText(queryParams && queryParams.status, 40);
  if (status) query = query.eq('status', status);
  if (typeof query.order === 'function') query = query.order('created_at', { ascending: false });
  const response = await query;
  if (response && response.error) throw response.error;
  return (Array.isArray(response && response.data) ? response.data : []).map(normalizeWithdrawal);
}

async function readWithdrawalRow(supabase, withdrawalId) {
  const id = sanitizeNullableUuid(withdrawalId);
  if (!id) throw badRequest('Withdrawal id is required.');
  const response = await supabase.from('withdrawals').select(WITHDRAWAL_SELECT).eq('id', id).maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Withdrawal not found.');
  return response.data;
}

async function readDisputeRow(supabase, disputeId) {
  const id = sanitizeNullableUuid(disputeId);
  if (!id) throw badRequest('Dispute id is required.');
  const response = await supabase.from('payment_disputes').select(DISPUTE_SELECT).eq('id', id).maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Dispute not found.');
  return response.data;
}

async function readOrderRow(supabase, orderId) {
  const id = sanitizeNullableUuid(orderId);
  if (!id) throw badRequest('Order id is required.');
  const response = await supabase.from('orders').select(ORDER_SELECT).eq('id', id).maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Order not found.');
  return response.data;
}

async function readTransactionRow(supabase, transactionId) {
  const id = sanitizeNullableUuid(transactionId);
  if (!id) throw badRequest('Transaction id is required.');
  const response = await supabase.from('transactions').select(TRANSACTION_SELECT).eq('id', id).maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Transaction not found.');
  return response.data;
}

async function readReceiptRow(supabase, receiptId) {
  const id = sanitizeNullableUuid(receiptId);
  if (!id) throw badRequest('Receipt id is required.');
  const response = await supabase.from('receipts').select(RECEIPT_SELECT).eq('id', id).maybeSingle();
  if (response && response.error) throw response.error;
  if (!response || !response.data) throw notFound('Receipt not found.');
  return response.data;
}

async function createReceiptRow(supabase, payload) {
  const safePayload = Object.assign({}, payload || {}, {
    code: sanitizeText(payload && payload.code, 80) || createReceiptCode(payload && payload.receipt_type)
  });
  const response = await supabase.from('receipts').insert(safePayload).select(RECEIPT_SELECT).maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data;
}

async function adjustWalletBalance(supabase, userId, balanceDeltaCents, pendingDeltaCents) {
  const wallet = await readWalletRow(supabase, userId, true);
  const payload = {
    balance_cents: Math.max(0, Number(wallet.balance_cents || 0) + Number(balanceDeltaCents || 0)),
    pending_cents: Math.max(0, Number(wallet.pending_cents || 0) + Number(pendingDeltaCents || 0)),
    updated_at: new Date().toISOString()
  };
  const response = await supabase.from('wallets').update(payload).eq('user_id', userId).select(WALLET_SELECT).maybeSingle();
  if (response && response.error) throw response.error;
  return response && response.data;
}

async function recordDisputeEvent(supabase, disputeId, actorId, eventType, note, metadata) {
  if (!disputeId) return null;
  const response = await supabase.from('dispute_events').insert({
    dispute_id: disputeId,
    actor_id: actorId || null,
    event_type: eventType,
    note: note || null,
    metadata: normalizeJson(metadata)
  });
  if (response && response.error) throw response.error;
  return true;
}

async function updateOrderStatus(supabase, orderId, status) {
  if (!orderId) return null;
  const response = await supabase.from('orders').update({ status, updated_at: new Date().toISOString() }).eq('id', orderId);
  if (response && response.error) throw response.error;
  return true;
}

async function updateReceivablesForDispute(supabase, dispute, status) {
  if (!dispute || !dispute.order_id) return null;
  const nextStatus = status === 'refunded' ? 'refunded' : 'released';
  const response = await supabase.from('wallet_receivables').update({ status: nextStatus, updated_at: new Date().toISOString() }).eq('order_id', dispute.order_id);
  if (response && response.error) throw response.error;
  return true;
}

function assertWalletOwner(walletUserId, actor) {
  if (isInternal(actor)) return true;
  if (walletUserId && actor && walletUserId === actor.id) return true;
  throw forbidden('Wallet is outside the current actor scope.');
}

function assertReceiptAccess(receipt, actor) {
  if (isInternal(actor)) return true;
  if (receipt && receipt.user_id === actor.id) return true;
  throw forbidden('Receipt is outside the current actor scope.');
}

function buildDashboard(transactions, withdrawals) {
  const items = Array.isArray(transactions) ? transactions : [];
  const withdrawalItems = Array.isArray(withdrawals) ? withdrawals : [];
  const grossIncome = items.filter((item) => item.type === 'payment' && item.status === 'succeeded').reduce((sum, item) => sum + item.amount, 0);
  const fees = Math.abs(items.filter((item) => item.type === 'platform_fee').reduce((sum, item) => sum + item.amount, 0));
  const payouts = Math.abs(items.filter((item) => item.type === 'payout').reduce((sum, item) => sum + item.amount, 0));
  const netIncome = Math.max(0, grossIncome - fees);
  const completedWithdrawals = withdrawalItems.filter((item) => ['approved', 'completed', 'processing'].includes(item.status));
  return Object.freeze({
    period: 'current-month',
    periodLabel: 'Mês atual',
    grossIncome,
    netIncome,
    withdrawals: payouts || completedWithdrawals.reduce((sum, item) => sum + item.amount, 0),
    fees,
    paidOrders: items.filter((item) => item.type === 'payment').length,
    withdrawalsCount: completedWithdrawals.length,
    processingWithdrawals: withdrawalItems.filter((item) => item.status === 'requested' || item.status === 'processing').length,
    ticketAverage: items.length ? Math.round((grossIncome / Math.max(1, items.length)) * 100) / 100 : 0,
    largestMovement: items[0] || { amount: 0, title: 'Sem movimentações' },
    chartSeries: buildChartSeries(items)
  });
}

function buildMonthlyHistory(transactions) {
  const map = new Map();
  (transactions || []).forEach((item) => {
    const key = String(item.createdAt || '').slice(0, 7) || 'sem-data';
    const current = map.get(key) || { month: key, grossIncome: 0, netIncome: 0, withdrawals: 0, fees: 0, paidOrders: 0 };
    if (item.type === 'payment') {
      current.grossIncome += item.amount;
      current.netIncome += item.amount;
      current.paidOrders += 1;
    }
    if (item.type === 'platform_fee') {
      current.fees += Math.abs(item.amount);
      current.netIncome -= Math.abs(item.amount);
    }
    if (item.type === 'payout') current.withdrawals += Math.abs(item.amount);
    map.set(key, current);
  });
  return Array.from(map.values()).sort((a, b) => a.month.localeCompare(b.month));
}

function buildChartSeries(transactions) {
  const history = buildMonthlyHistory(transactions);
  const rows = history.length ? history : [{ month: '—', grossIncome: 0, netIncome: 0, withdrawals: 0, fees: 0, paidOrders: 0 }];
  return Object.freeze({
    labels: rows.map((row) => row.month),
    grossIncome: rows.map((row) => row.grossIncome),
    netIncome: rows.map((row) => row.netIncome),
    withdrawals: rows.map((row) => row.withdrawals),
    fees: rows.map((row) => row.fees),
    paidOrders: rows.map((row) => row.paidOrders)
  });
}

function createEmptyReceivablesSchedule() {
  return Object.freeze({ next: null, items: [], scheduledNet: 0, releasedNet: 0, totalNet: 0, pendingCount: 0, releasedCount: 0, count: 0 });
}

function buildReceivablesSchedule(receivables) {
  const items = Array.isArray(receivables) ? receivables : [];
  const next = items.find((item) => ['scheduled', 'pending', 'blocked'].includes(item.status)) || null;
  const scheduledNet = items.filter((item) => ['scheduled', 'pending', 'blocked'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  const releasedNet = items.filter((item) => ['available', 'released'].includes(item.status)).reduce((sum, item) => sum + item.amount, 0);
  return Object.freeze({
    next,
    items,
    scheduledNet,
    releasedNet,
    totalNet: scheduledNet + releasedNet,
    pendingCount: items.filter((item) => ['scheduled', 'pending', 'blocked'].includes(item.status)).length,
    releasedCount: items.filter((item) => ['available', 'released'].includes(item.status)).length,
    count: items.length
  });
}

function normalizeJson(value) {
  if (!value) return {};
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch {
      return {};
    }
  }
  if (typeof value === 'object' && !Array.isArray(value)) return Object.assign({}, value);
  return {};
}

function sanitizeText(value, maxLength) {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (!maxLength || text.length <= maxLength) return text;
  return text.slice(0, maxLength).trim();
}

function sanitizeNullableUuid(value) {
  const id = String(value || '').trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id) ? id : '';
}

function sanitizeCurrency(value) {
  const raw = String(value || 'BRL').trim().toUpperCase().replace(/[^A-Z]/g, '').slice(0, 3);
  return raw || 'BRL';
}

function normalizeAmountCentsFromBody(body) {
  const source = body || {};
  if (source.amountCents !== undefined && source.amountCents !== null && source.amountCents !== '') return normalizeCents(source.amountCents);
  if (source.amount_cents !== undefined && source.amount_cents !== null && source.amount_cents !== '') return normalizeCents(source.amount_cents);
  return normalizeCurrencyAmountToCents(source.amount !== undefined ? source.amount : source.netAmount);
}

function normalizeCents(value) {
  const parsed = Number(String(value || '').replace(/[^\d-]/g, ''));
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function normalizeCurrencyAmountToCents(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? Math.max(0, Math.round(value * 100)) : 0;
  const raw = String(value || '').trim();
  if (!raw) return 0;
  const decimal = raw.indexOf(',') >= 0
    ? raw.replace(/[^\d,.-]/g, '').replace(/\./g, '').replace(',', '.')
    : raw.replace(/[^\d.-]/g, '');
  const parsed = Number(decimal);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed * 100)) : 0;
}

function normalizeReceivableStatus(value) {
  const status = sanitizeText(value, 40).toLowerCase();
  return ['scheduled', 'pending', 'blocked', 'available', 'released', 'refunded', 'cancelled'].includes(status) ? status : 'scheduled';
}

function normalizeDisputeStatus(value) {
  const status = sanitizeText(value, 40).toLowerCase();
  return ['open', 'responded', 'under_review', 'released', 'refunded', 'cancelled'].includes(status) ? status : 'open';
}

function readLimit(value) {
  const parsed = Number.parseInt(String(value || ''), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 50;
  return Math.min(parsed, 200);
}

function createReceiptCode(type) {
  const safeType = sanitizeText(type || 'receipt', 20).toUpperCase() || 'RECEIPT';
  return `DOKE-${safeType}-${Date.now()}-${Math.random().toString(16).slice(2, 8).toUpperCase()}`;
}

function badRequest(message) {
  const error = new Error(message || 'Invalid wallet request.');
  error.code = 'DOKE_BAD_REQUEST';
  error.status = 400;
  return error;
}

function unauthorized() {
  const error = new Error('Authentication is required.');
  error.code = 'DOKE_UNAUTHORIZED';
  error.status = 401;
  return error;
}

function forbidden(message) {
  const error = new Error(message || 'Wallet access denied.');
  error.code = 'DOKE_FORBIDDEN';
  error.status = 403;
  return error;
}

function notFound(message) {
  const error = new Error(message || 'Wallet resource not found.');
  error.code = 'DOKE_NOT_FOUND';
  error.status = 404;
  return error;
}

function unavailable(message) {
  const error = new Error(message || 'Wallet runtime unavailable.');
  error.code = 'DOKE_RUNTIME_UNAVAILABLE';
  error.status = 503;
  return error;
}

module.exports = Object.freeze({
  normalizeWallet,
  normalizeTransaction,
  normalizeReceivable,
  normalizeWithdrawal,
  normalizeDispute,
  normalizeReceipt,
  normalizeBankAccount,
  normalizeAuditEvent,
  getWalletSummary,
  listWalletTransactions,
  getWalletDashboard,
  getWalletMonthlyHistory,
  getReceivablesSchedule,
  getBankAccount,
  saveBankAccount,
  listReceivables,
  createReceivable,
  listWithdrawals,
  requestWithdrawal,
  approveWithdrawal,
  declineWithdrawal,
  listDisputes,
  openDispute,
  respondDispute,
  releaseDispute,
  refundDispute,
  listReceipts,
  getReceipt,
  listAuditEvents,
  recordAdminAuditEvent
});
