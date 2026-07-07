#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const REPORT_PATH = 'reports/generated/backend-real-multidomain-post-rotation-evidence-report.json';

const report = {
  name: 'backend-real-multidomain-post-rotation-evidence',
  generatedAt: new Date().toISOString(),
  status: 'backend_real_multidomain_staging_execution_validated',
  evidenceSource: 'manual_post_rotation_validated_run',
  executionWasNotRepeated: true,
  networkRequestsPerformed: false,
  mutationsPerformed: false,
  frontendActivationActivated: false,
  observabilitySinkDrainConfigured: false,
  warnings: [
    'Observability sink/drain must still be configured separately before the Observability Gate can pass.'
  ],
  validatedRun: {
    summary: 'Backend Real Multidomain Staging passed in a clean post-rotation run; scoped cleanup later confirmed zero staging-* residues.',
    ids: {
      order: '92d25b2d-7733-455e-93e6-2d4e8d1232db',
      conversation: 'c9b2655d-629a-4837-af17-c9109cede8fd',
      message: 'b02dc368-de89-46ba-86e2-a2ad2c91c05d',
      notification: 'e0966416-d8f1-4756-a05b-1bd9d3154f14'
    },
    orderFinalStatus: 'completed',
    notificationReadAllExecuted: false,
    withdrawal: {
      endpoint: 'POST /withdrawals',
      executed: false,
      skipped: true,
      reason: 'insufficient_available_balance_for_optional_withdrawal'
    },
    endpointsExercised: [
      'POST /auth/login',
      'GET /auth/session',
      'GET /users/me',
      'GET /profiles/me',
      'GET /orders',
      'POST /orders',
      'POST /orders/:id/accept',
      'POST /orders/:id/charge',
      'POST /orders/:id/complete',
      'GET /conversations',
      'POST /orders/:id/conversation',
      'POST /conversations/:id/messages',
      'POST /conversations/:id/read',
      'GET /notifications',
      'POST /notifications',
      'POST /notifications/:id/read',
      'GET /wallet',
      'GET /wallet/transactions',
      'GET /receipts'
    ],
    endpointsNotExecuted: [
      'POST /notifications/read-all',
      'POST /withdrawals'
    ],
    cleanupAfterExecution: {
      command: 'npm.cmd run execute:backend-real-multidomain-cleanup:dry-run',
      transactionRolledBack: true,
      stagingResiduesZero: true,
      residues: {
        admin_audit_events: 0,
        api_idempotency_keys: 0,
        budgets: 0,
        conversations: 0,
        messages: 0,
        notifications: 0,
        order_status_history: 0,
        orders: 0,
        receipts: 0,
        transactions: 0,
        withdrawals: 0
      }
    }
  }
};

const output = path.join(process.cwd(), REPORT_PATH);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`[${report.name}] wrote ${REPORT_PATH}`);
