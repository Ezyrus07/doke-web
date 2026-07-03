(function () {
  'use strict';

  var Doke = window.Doke || (window.Doke = {});

  var ROLES = Object.freeze({
    GUEST: 'guest',
    CLIENT: 'client',
    PROFESSIONAL: 'professional',
    SUPPORT: 'support',
    ADMIN: 'admin'
  });

  var ORDER_STATUS = Object.freeze({
    REQUESTED: 'requested',
    ACCEPTED: 'accepted',
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

  function isSupportRole(role) {
    return role === ROLES.SUPPORT || role === ROLES.ADMIN;
  }

  Doke.backendDomainContract = Object.freeze({
    roles: ROLES,
    orderStatus: ORDER_STATUS,
    paymentStatus: PAYMENT_STATUS,
    disputeStatus: DISPUTE_STATUS,
    walletStatus: WALLET_STATUS,
    withdrawalStatus: WITHDRAWAL_STATUS,
    financialEvents: FINANCIAL_EVENTS,
    adminActions: ADMIN_ACTIONS,
    hasValue: hasValue,
    isSupportRole: isSupportRole
  });
})();
