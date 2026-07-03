(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var ROLES = Object.freeze({
    GUEST: 'guest',
    CLIENT: 'client',
    PROFESSIONAL: 'professional',
    MODERATOR: 'moderator',
    SUPPORT: 'support',
    ADMIN: 'admin'
  });

  var ORDER_STATUS = Object.freeze({
    PENDING: 'pending',
    REQUESTED: 'requested',
    ACCEPTED: 'accepted',
    CONVERSATION: 'conversation',
    QUOTED: 'quoted',
    CHARGED: 'charged',
    PAID: 'paid',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    DISPUTED: 'disputed',
    UNDER_REVIEW: 'under_review',
    RELEASED: 'released',
    REFUNDED: 'refunded',
    CANCELLED: 'cancelled'
  });

  var CONVERSATION_STATUS = Object.freeze({
    LOCKED: 'locked',
    OPEN: 'open',
    ARCHIVED: 'archived',
    SUPPORT_REVIEW: 'support_review'
  });

  var MESSAGE_TYPE = Object.freeze({
    TEXT: 'text',
    IMAGE: 'image',
    AUDIO: 'audio',
    SYSTEM: 'system',
    CHARGE: 'charge',
    PAYMENT: 'payment',
    DISPUTE: 'dispute',
    RECEIPT: 'receipt'
  });

  var NOTIFICATION_STATUS = Object.freeze({
    UNREAD: 'unread',
    READ: 'read',
    DISMISSED: 'dismissed'
  });

  var NOTIFICATION_TYPE = Object.freeze({
    SYSTEM: 'system',
    ORDER_CREATED: 'order_created',
    ORDER_STATUS_CHANGED: 'order_status_changed',
    MESSAGE_RECEIVED: 'message_received',
    PAYMENT: 'payment',
    DISPUTE: 'dispute',
    WITHDRAWAL: 'withdrawal',
    RECEIPT: 'receipt'
  });

  var PAYMENT_STATUS = Object.freeze({
    CREATED: 'created',
    AUTHORIZED: 'authorized',
    PAID: 'paid',
    HELD: 'held',
    RELEASED: 'released',
    REFUNDED: 'refunded',
    FAILED: 'failed',
    CANCELLED: 'cancelled'
  });

  var DISPUTE_STATUS = Object.freeze({
    OPEN: 'contestacao_aberta',
    UNDER_REVIEW: 'em_analise',
    RELEASED_TO_PROFESSIONAL: 'resolvida_profissional',
    CLIENT_WON: 'resolvida_cliente',
    REFUNDED: 'reembolsado'
  });

  var WALLET_STATUS = Object.freeze({
    PENDING: 'pending',
    HELD: 'held',
    AVAILABLE: 'available',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    DECLINED: 'declined',
    REFUNDED: 'refunded',
    BLOCKED: 'blocked'
  });

  var WITHDRAWAL_STATUS = Object.freeze({
    REQUESTED: 'requested',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    DECLINED: 'declined',
    CANCELLED: 'cancelled'
  });

  var WALLET_TRANSACTION_TYPE = Object.freeze({
    PAYMENT: 'payment',
    RECEIVABLE: 'receivable',
    RELEASE: 'release',
    REFUND: 'refund',
    WITHDRAW: 'withdraw',
    FEE: 'fee',
    ADJUSTMENT: 'adjustment'
  });

  var RECEIPT_TYPE = Object.freeze({
    PAYMENT: 'payment',
    RELEASE: 'release',
    REFUND: 'refund',
    WITHDRAWAL: 'withdrawal'
  });

  var NOTIFICATION_EVENTS = Object.freeze({
    NOTIFICATION_CREATED: 'notification_created',
    NOTIFICATION_READ: 'notification_read',
    NOTIFICATION_DISMISSED: 'notification_dismissed',
    NOTIFICATIONS_READ_ALL: 'notifications_read_all'
  });

  var MESSAGE_EVENTS = Object.freeze({
    CONVERSATION_CREATED: 'conversation_created',
    MESSAGE_SENT: 'message_sent',
    MESSAGE_READ: 'message_read',
    ORDER_CONTEXT_SYNCED: 'order_context_synced',
    SYSTEM_EVENT_CREATED: 'system_event_created'
  });

  var FINANCIAL_EVENTS = Object.freeze({
    ORDER_REQUESTED: 'order_requested',
    ORDER_ACCEPTED: 'order_accepted',
    CHARGE_CREATED: 'charge_created',
    PAYMENT_CONFIRMED: 'payment_confirmed',
    DISPUTE_OPENED: 'dispute_opened',
    DISPUTE_RESPONDED: 'dispute_responded',
    DISPUTE_RESOLVED_RELEASE: 'dispute_resolved_release',
    DISPUTE_RESOLVED_REFUND: 'dispute_resolved_refund',
    WITHDRAWAL_REQUESTED: 'withdrawal_requested',
    WITHDRAWAL_COMPLETED: 'withdrawal_completed',
    WITHDRAWAL_DECLINED: 'withdrawal_declined'
  });

  var ADMIN_ACTIONS = Object.freeze({
    RELEASE_DISPUTE: 'release_dispute',
    REFUND_DISPUTE: 'refund_dispute',
    APPROVE_WITHDRAWAL: 'approve_withdrawal',
    DECLINE_WITHDRAWAL: 'decline_withdrawal'
  });

  function hasValue(collection, value) {
    return Object.keys(collection).some(function (key) { return collection[key] === value; });
  }

  function normalizeRole(role) {
    var value = String(role || '').trim().toLowerCase();
    if (value === 'pro' || value === 'worker') return ROLES.PROFESSIONAL;
    if (value === 'user' || value === 'customer') return ROLES.CLIENT;
    if (hasValue(ROLES, value)) return value;
    return ROLES.GUEST;
  }

  function isInternalRole(role) {
    var normalized = normalizeRole(role);
    return normalized === ROLES.MODERATOR || normalized === ROLES.SUPPORT || normalized === ROLES.ADMIN;
  }

  function isSupportRole(role) {
    var normalized = normalizeRole(role);
    return normalized === ROLES.SUPPORT || normalized === ROLES.ADMIN;
  }

  Doke.backendDomainContract = Object.freeze({
    roles: ROLES,
    orderStatus: ORDER_STATUS,
    conversationStatus: CONVERSATION_STATUS,
    messageType: MESSAGE_TYPE,
    notificationStatus: NOTIFICATION_STATUS,
    notificationType: NOTIFICATION_TYPE,
    notificationEvents: NOTIFICATION_EVENTS,
    messageEvents: MESSAGE_EVENTS,
    paymentStatus: PAYMENT_STATUS,
    disputeStatus: DISPUTE_STATUS,
    walletStatus: WALLET_STATUS,
    withdrawalStatus: WITHDRAWAL_STATUS,
    walletTransactionType: WALLET_TRANSACTION_TYPE,
    receiptType: RECEIPT_TYPE,
    financialEvents: FINANCIAL_EVENTS,
    adminActions: ADMIN_ACTIONS,
    hasValue: hasValue,
    normalizeRole: normalizeRole,
    isInternalRole: isInternalRole,
    isSupportRole: isSupportRole
  });
})();
