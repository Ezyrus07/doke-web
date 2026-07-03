(function () {
  'use strict';

  var root = window;
  var Doke = root.Doke || (root.Doke = {});

  var FLOW_STEPS = Object.freeze([
    'auth_session',
    'identity_profile',
    'order_request',
    'order_acceptance',
    'conversation_thread',
    'quote_charge',
    'payment_confirmation',
    'wallet_hold',
    'dispute_review',
    'admin_resolution',
    'receipt',
    'withdrawal',
    'audit'
  ]);

  var ROLE_MATRIX = Object.freeze({
    guest: Object.freeze({
      allowed: Object.freeze(['read_public_services', 'read_public_profiles']),
      denied: Object.freeze(['create_order', 'send_message', 'read_wallet', 'resolve_dispute', 'resolve_withdrawal'])
    }),
    client: Object.freeze({
      allowed: Object.freeze(['create_order', 'read_own_order', 'send_own_conversation_message', 'open_dispute', 'read_own_notification']),
      denied: Object.freeze(['resolve_dispute', 'resolve_withdrawal', 'read_other_wallet', 'view_audit_events'])
    }),
    professional: Object.freeze({
      allowed: Object.freeze(['read_assigned_order', 'accept_assigned_order', 'quote_assigned_order', 'request_withdraw', 'respond_dispute']),
      denied: Object.freeze(['resolve_dispute', 'resolve_withdrawal', 'read_client_private_wallet', 'view_admin_queue'])
    }),
    support: Object.freeze({
      allowed: Object.freeze(['view_support_queue', 'resolve_dispute', 'resolve_withdrawal', 'view_audit_events']),
      denied: Object.freeze(['edit_user_bank_account_without_request'])
    }),
    admin: Object.freeze({
      allowed: Object.freeze(['*']),
      denied: Object.freeze([])
    })
  });

  var CRITICAL_SCENARIOS = Object.freeze([
    Object.freeze({
      id: 'happy_path_release',
      title: 'Pedido sem contestação com repasse e saque',
      roles: Object.freeze(['client', 'professional', 'support']),
      steps: Object.freeze(['auth_session', 'identity_profile', 'order_request', 'order_acceptance', 'conversation_thread', 'quote_charge', 'payment_confirmation', 'wallet_hold', 'admin_resolution', 'receipt', 'withdrawal', 'audit'])
    }),
    Object.freeze({
      id: 'dispute_release_professional',
      title: 'Contestação resolvida com repasse ao profissional',
      roles: Object.freeze(['client', 'professional', 'support']),
      steps: Object.freeze(['order_request', 'conversation_thread', 'payment_confirmation', 'dispute_review', 'admin_resolution', 'wallet_hold', 'receipt', 'audit'])
    }),
    Object.freeze({
      id: 'dispute_refund_client',
      title: 'Contestação resolvida com reembolso ao cliente',
      roles: Object.freeze(['client', 'professional', 'support']),
      steps: Object.freeze(['order_request', 'conversation_thread', 'payment_confirmation', 'dispute_review', 'admin_resolution', 'receipt', 'audit'])
    }),
    Object.freeze({
      id: 'withdrawal_approved',
      title: 'Saque aprovado pelo suporte',
      roles: Object.freeze(['professional', 'support']),
      steps: Object.freeze(['wallet_hold', 'withdrawal', 'receipt', 'audit'])
    }),
    Object.freeze({
      id: 'withdrawal_declined',
      title: 'Saque recusado com motivo e notificação',
      roles: Object.freeze(['professional', 'support']),
      steps: Object.freeze(['wallet_hold', 'withdrawal', 'receipt', 'audit'])
    }),
    Object.freeze({
      id: 'client_admin_denied',
      title: 'Cliente comum não executa ação administrativa',
      roles: Object.freeze(['client']),
      steps: Object.freeze(['admin_resolution', 'audit'])
    }),
    Object.freeze({
      id: 'professional_cross_scope_denied',
      title: 'Profissional não acessa pedido/carteira fora do próprio escopo',
      roles: Object.freeze(['professional']),
      steps: Object.freeze(['order_request', 'conversation_thread', 'wallet_hold', 'audit'])
    })
  ]);

  var READINESS_GATES = Object.freeze({
    provider: Object.freeze([
      'mock_default',
      'api_requires_base_url',
      'api_requires_network_flag',
      'pages_do_not_call_backend_directly'
    ]),
    security: Object.freeze([
      'resource_scope_checked',
      'admin_actions_checked',
      'denied_actions_audited',
      'critical_allowed_actions_audited'
    ]),
    flow: Object.freeze([
      'orders_provider_ready',
      'messages_provider_ready',
      'notifications_provider_ready',
      'wallet_provider_ready',
      'receipts_linked_to_financial_events'
    ]),
    release: Object.freeze([
      'manual_browser_matrix_completed',
      'local_storage_reset_path_documented',
      'backend_policy_matrix_ready_before_public_api',
      'no_visual_baseline_change'
    ])
  });

  function listScenarios() {
    return CRITICAL_SCENARIOS.slice();
  }

  function getScenario(id) {
    return CRITICAL_SCENARIOS.find(function (scenario) { return scenario.id === id; }) || null;
  }

  function getRolePolicy(role) {
    return ROLE_MATRIX[role] || ROLE_MATRIX.guest;
  }

  Doke.mvpControlledFlowContract = Object.freeze({
    version: '14.0.0',
    flowSteps: FLOW_STEPS,
    roleMatrix: ROLE_MATRIX,
    readinessGates: READINESS_GATES,
    criticalScenarios: CRITICAL_SCENARIOS,
    listScenarios: listScenarios,
    getScenario: getScenario,
    getRolePolicy: getRolePolicy
  });
})();
